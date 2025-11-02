import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProductValidationService, ExistingProduct, SkuValidationResult } from './product-validation.service';

describe('ProductValidationService', () => {
  let service: ProductValidationService;
  let httpMock: HttpTestingController;
  const apiUrl = '/api/products';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProductValidationService]
    });
    service = TestBed.inject(ProductValidationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('validateSkuExists', () => {
    it('should return valid result when SKU does not exist', (done) => {
      const mockResponse: SkuValidationResult = {
        isValid: true
      };

      service.validateSkuExists('NEW-SKU').subscribe({
        next: (result) => {
          expect(result.isValid).toBe(true);
          done();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/validate-sku/NEW-SKU`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should return invalid result when SKU exists', (done) => {
      const mockExistingProduct: ExistingProduct = {
        product_id: 1,
        sku: 'EXISTING-SKU',
        name: 'Producto Existente',
        value: 1000,
        category_id: 1,
        unit_id: 1,
        status: 'activo'
      };

      const mockResponse: SkuValidationResult = {
        isValid: false,
        existingProduct: mockExistingProduct,
        errorMessage: "SKU 'EXISTING-SKU' ya existe en el sistema"
      };

      service.validateSkuExists('EXISTING-SKU').subscribe({
        next: (result) => {
          expect(result.isValid).toBe(false);
          expect(result.existingProduct).toBeTruthy();
          expect(result.existingProduct?.sku).toBe('EXISTING-SKU');
          done();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/validate-sku/EXISTING-SKU`);
      req.flush(mockResponse);
    });

    it('should handle error', (done) => {
      service.validateSkuExists('ERROR-SKU').subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/validate-sku/ERROR-SKU`);
      req.error(new ErrorEvent('Network error'), { status: 500 });
    });
  });

  describe('validateMultipleSkus', () => {
    it('should validate multiple SKUs successfully', (done) => {
      const skus = ['SKU1', 'SKU2', 'SKU3'];
      const mockResponse: SkuValidationResult[] = [
        { isValid: true },
        { isValid: false, errorMessage: 'SKU2 ya existe' },
        { isValid: true }
      ];

      service.validateMultipleSkus(skus).subscribe({
        next: (results) => {
          expect(results.length).toBe(3);
          expect(results[0].isValid).toBe(true);
          expect(results[1].isValid).toBe(false);
          expect(results[2].isValid).toBe(true);
          done();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/validate-skus`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ skus });
      req.flush(mockResponse);
    });

    it('should handle empty SKU list', (done) => {
      const skus: string[] = [];
      const mockResponse: SkuValidationResult[] = [];

      service.validateMultipleSkus(skus).subscribe({
        next: (results) => {
          expect(results.length).toBe(0);
          done();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/validate-skus`);
      req.flush(mockResponse);
    });

    it('should handle error', (done) => {
      service.validateMultipleSkus(['SKU1']).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/validate-skus`);
      req.error(new ErrorEvent('Network error'), { status: 500 });
    });
  });

  describe('getAllProducts', () => {
    it('should return all products', (done) => {
      const mockProducts: ExistingProduct[] = [
        {
          product_id: 1,
          sku: 'SKU1',
          name: 'Producto 1',
          value: 1000,
          category_id: 1,
          unit_id: 1,
          status: 'activo'
        },
        {
          product_id: 2,
          sku: 'SKU2',
          name: 'Producto 2',
          value: 2000,
          category_id: 2,
          unit_id: 1,
          status: 'activo'
        }
      ];

      service.getAllProducts().subscribe({
        next: (products) => {
          expect(products.length).toBe(2);
          expect(products[0].sku).toBe('SKU1');
          done();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/all`);
      expect(req.request.method).toBe('GET');
      req.flush(mockProducts);
    });

    it('should handle error', (done) => {
      service.getAllProducts().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/all`);
      req.error(new ErrorEvent('Network error'), { status: 500 });
    });
  });

  describe('validateSkusLocally', () => {
    it('should return invalid for existing SKU', () => {
      const skus = ['EXISTING-SKU', 'NEW-SKU'];
      const existingProducts: ExistingProduct[] = [
        {
          product_id: 1,
          sku: 'EXISTING-SKU',
          name: 'Producto Existente',
          value: 1000,
          category_id: 1,
          unit_id: 1,
          status: 'activo'
        }
      ];

      const results = service.validateSkusLocally(skus, existingProducts);

      expect(results.length).toBe(2);
      expect(results[0].isValid).toBe(false);
      expect(results[0].existingProduct?.sku).toBe('EXISTING-SKU');
      expect(results[1].isValid).toBe(true);
    });

    it('should return valid for non-existing SKUs', () => {
      const skus = ['NEW-SKU1', 'NEW-SKU2'];
      const existingProducts: ExistingProduct[] = [];

      const results = service.validateSkusLocally(skus, existingProducts);

      expect(results.length).toBe(2);
      expect(results[0].isValid).toBe(true);
      expect(results[1].isValid).toBe(true);
    });

    it('should handle case insensitive SKU comparison', () => {
      const skus = ['existing-sku'];
      const existingProducts: ExistingProduct[] = [
        {
          product_id: 1,
          sku: 'EXISTING-SKU',
          name: 'Producto',
          value: 1000,
          category_id: 1,
          unit_id: 1,
          status: 'activo'
        }
      ];

      const results = service.validateSkusLocally(skus, existingProducts);

      expect(results[0].isValid).toBe(false);
    });

    it('should handle SKUs with whitespace', () => {
      const skus = ['  existing-sku  '];
      const existingProducts: ExistingProduct[] = [
        {
          product_id: 1,
          sku: 'EXISTING-SKU',
          name: 'Producto',
          value: 1000,
          category_id: 1,
          unit_id: 1,
          status: 'activo'
        }
      ];

      const results = service.validateSkusLocally(skus, existingProducts);

      expect(results[0].isValid).toBe(false);
    });
  });

  describe('validateSkuDuplicatesInFile', () => {
    it('should find duplicate SKUs in file', () => {
      const products = [
        { sku: 'SKU1', name: 'Producto 1' },
        { sku: 'SKU2', name: 'Producto 2' },
        { sku: 'SKU1', name: 'Producto 3' },
        { sku: 'SKU3', name: 'Producto 4' }
      ];

      const duplicates = service.validateSkuDuplicatesInFile(products);

      expect(duplicates.length).toBe(1);
      expect(duplicates[0].sku).toBe('sku1');
      expect(duplicates[0].rowNumbers).toEqual([1, 3]);
    });

    it('should return empty array when no duplicates', () => {
      const products = [
        { sku: 'SKU1', name: 'Producto 1' },
        { sku: 'SKU2', name: 'Producto 2' },
        { sku: 'SKU3', name: 'Producto 3' }
      ];

      const duplicates = service.validateSkuDuplicatesInFile(products);

      expect(duplicates.length).toBe(0);
    });

    it('should handle products without SKU', () => {
      const products = [
        { sku: 'SKU1', name: 'Producto 1' },
        { name: 'Producto Sin SKU' },
        { sku: '', name: 'Producto SKU Vacio' }
      ];

      const duplicates = service.validateSkuDuplicatesInFile(products);

      expect(duplicates.length).toBe(0);
    });
  });

  describe('validateNameDuplicatesInFile', () => {
    it('should find duplicate names in file', () => {
      const products = [
        { sku: 'SKU1', nombre: 'Producto A' },
        { sku: 'SKU2', nombre: 'Producto B' },
        { sku: 'SKU3', nombre: 'Producto A' },
        { sku: 'SKU4', nombre: 'Producto C' }
      ];

      const duplicates = service.validateNameDuplicatesInFile(products);

      expect(duplicates.length).toBe(1);
      expect(duplicates[0].nombre).toBe('producto a');
      expect(duplicates[0].rowNumbers).toEqual([1, 3]);
    });

    it('should return empty array when no duplicates', () => {
      const products = [
        { sku: 'SKU1', nombre: 'Producto A' },
        { sku: 'SKU2', nombre: 'Producto B' },
        { sku: 'SKU3', nombre: 'Producto C' }
      ];

      const duplicates = service.validateNameDuplicatesInFile(products);

      expect(duplicates.length).toBe(0);
    });

    it('should handle products without nombre', () => {
      const products = [
        { sku: 'SKU1', nombre: 'Producto A' },
        { sku: 'SKU2' },
        { sku: 'SKU3', nombre: '' }
      ];

      const duplicates = service.validateNameDuplicatesInFile(products);

      expect(duplicates.length).toBe(0);
    });
  });
});

