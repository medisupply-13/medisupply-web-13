import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FileValidationService, ValidationResult, ProductTemplate } from './file-validation.service';
import { ProductValidationService } from './product-validation.service';
import { ProductsService } from './products.service';
import { environment } from '../../environments/environment';

describe('FileValidationService', () => {
  let service: FileValidationService;
  let httpMock: HttpTestingController;
  let productValidationService: jasmine.SpyObj<ProductValidationService>;
  let productsService: jasmine.SpyObj<ProductsService>;
  const baseUrl = environment.baseUrl;

  beforeEach(() => {
    const productValidationSpy = jasmine.createSpyObj('ProductValidationService', [
      'validateSkuDuplicatesInFile',
      'validateNameDuplicatesInFile'
    ]);
    const productsServiceSpy = jasmine.createSpyObj('ProductsService', [
      'getAvailableProducts'
    ]);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        FileValidationService,
        { provide: ProductValidationService, useValue: productValidationSpy },
        { provide: ProductsService, useValue: productsServiceSpy }
      ]
    });
    service = TestBed.inject(FileValidationService);
    httpMock = TestBed.inject(HttpTestingController);
    productValidationService = TestBed.inject(ProductValidationService) as jasmine.SpyObj<ProductValidationService>;
    productsService = TestBed.inject(ProductsService) as jasmine.SpyObj<ProductsService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('validateCSVFile', () => {
    it('should validate CSV file successfully', async () => {
      const csvContent = 'sku,name,value,category_name,quantity,warehouse_id\nTEST-001,Product 1,1000,Category 1,10,1\nTEST-002,Product 2,2000,Category 2,20,2';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const result = await service.validateCSVFile(file);

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.data).toBeDefined();
      expect(result.data?.length).toBe(2);
      expect(result.data?.[0].sku).toBe('TEST-001');
    });

    it('should return error when file has less than 2 lines', async () => {
      const csvContent = 'sku,name,value,category_name,quantity,warehouse_id';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const result = await service.validateCSVFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El archivo debe contener al menos una fila de datos');
    });

    it('should handle missing required fields', async () => {
      const csvContent = 'sku,name\nTEST-001,Product 1';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const result = await service.validateCSVFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect duplicate SKUs', async () => {
      const csvContent = 'sku,name,value,category_name,quantity,warehouse_id\nTEST-001,Product 1,1000,Category 1,10,1\nTEST-001,Product 2,2000,Category 2,20,2';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const result = await service.validateCSVFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('SKUs duplicados'))).toBe(true);
    });

    it('should detect duplicate product names', async () => {
      const csvContent = 'sku,name,value,category_name,quantity,warehouse_id\nTEST-001,Product Name,1000,Category 1,10,1\nTEST-002,Product Name,2000,Category 2,20,2';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const result = await service.validateCSVFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('productos duplicados'))).toBe(true);
    });

    it('should handle file read error', async () => {
      const invalidFile = new File([], 'test.csv');

      const result = await service.validateCSVFile(invalidFile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Error al leer el archivo CSV');
    });

    it('should handle CSV with quoted fields', async () => {
      const csvContent = 'sku,name,value,category_name,quantity,warehouse_id\n"TEST-001","Product with, comma",1000,"Category 1",10,1';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const result = await service.validateCSVFile(file);

      expect(result.isValid).toBe(true);
      expect(result.data?.[0].name).toBe('Product with, comma');
    });

    it('should validate field types correctly', async () => {
      const csvContent = 'sku,name,value,category_name,quantity,warehouse_id\nTEST-001,Product 1,invalid,category,10,1';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const result = await service.validateCSVFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('debe ser un número válido'))).toBe(true);
    });

    it('should handle empty rows', async () => {
      const csvContent = 'sku,name,value,category_name,quantity,warehouse_id\nTEST-001,Product 1,1000,Category 1,10,1\n\n  \nTEST-002,Product 2,2000,Category 2,20,2';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const result = await service.validateCSVFile(file);

      expect(result.isValid).toBe(true);
      expect(result.data?.length).toBe(2);
    });
  });

  describe('validateXLSXFile', () => {
    it('should return not implemented error', async () => {
      const file = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const result = await service.validateXLSXFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('La validación de archivos XLSX aún no está implementada');
    });
  });

  describe('validateHeaders', () => {
    it('should accept headers with field variations', () => {
      const headers = ['CODIGO', 'NOMBRE', 'PRECIO', 'CATEGORIA', 'STOCK_MINIMO', 'BODEGA_ID'];
      // @ts-ignore - accessing private method for testing
      const result = service.validateHeaders(headers);

      expect(result.isValid).toBe(true);
    });

    it('should find missing required fields', () => {
      const headers = ['sku', 'name']; // Faltan campos
      // @ts-ignore
      const result = service.validateHeaders(headers);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Campos obligatorios faltantes'))).toBe(true);
    });

    it('should detect duplicate headers', () => {
      const headers = ['sku', 'name', 'value', 'category_name', 'quantity', 'quantity', 'warehouse_id'];
      // @ts-ignore
      const result = service.validateHeaders(headers);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Headers duplicados'))).toBe(true);
    });

    it('should normalize headers with special characters', () => {
      const headers = ['SKU', 'Nombre del Producto', 'Precio (S/)', 'Categoría', 'Stock Mínimo', 'Bodega ID'];
      // @ts-ignore
      const result = service.validateHeaders(headers);

      expect(result.isValid).toBe(true);
    });
  });

  describe('validateRow', () => {
    it('should validate correct row', () => {
      const rowData = ['TEST-001', 'Product 1', '1000', 'Category 1', '10', '1'];
      // @ts-ignore
      const result = service.validateRow(rowData, 2);

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject empty row', () => {
      const rowData = ['', '', '', '', '', ''];
      // @ts-ignore
      const result = service.validateRow(rowData, 2);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Fila vacía'))).toBe(true);
    });

    it('should reject missing required fields', () => {
      const rowData = ['TEST-001', ''];
      // @ts-ignore
      const result = service.validateRow(rowData, 2);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid number type', () => {
      const rowData = ['TEST-001', 'Product 1', 'not-a-number', 'Category 1', '10', '1'];
      // @ts-ignore
      const result = service.validateRow(rowData, 2);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('debe ser un número válido'))).toBe(true);
    });

    it('should reject negative numbers', () => {
      const rowData = ['TEST-001', 'Product 1', '-1000', 'Category 1', '10', '1'];
      // @ts-ignore
      const result = service.validateRow(rowData, 2);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('debe ser un número válido mayor o igual a 0'))).toBe(true);
    });
  });

  describe('mapRowToProduct', () => {
    it('should map row to product correctly', () => {
      const headers = ['sku', 'name', 'value', 'category_name', 'quantity', 'warehouse_id'];
      const rowData = ['TEST-001', 'Product 1', '1000', 'Category 1', '10', '1'];
      // @ts-ignore
      const result = service.mapRowToProduct(rowData, headers);

      expect(result.sku).toBe('TEST-001');
      expect(result.name).toBe('Product 1');
      expect(result.value).toBe(1000);
      expect(result.category_name).toBe('Category 1');
      expect(result.quantity).toBe(10);
      expect(result.warehouse_id).toBe(1);
    });

    it('should handle headers with variations', () => {
      const headers = ['CODIGO', 'NOMBRE', 'PRECIO', 'CATEGORIA', 'STOCK', 'BODEGA'];
      const rowData = ['TEST-001', 'Product 1', '1000', 'Category 1', '10', '1'];
      // @ts-ignore
      const result = service.mapRowToProduct(rowData, headers);

      expect(result.sku).toBeTruthy();
      expect(result.name).toBeTruthy();
    });
  });

  describe('parseCSVLine', () => {
    it('should parse simple CSV line', () => {
      const line = 'field1,field2,field3';
      // @ts-ignore
      const result = service.parseCSVLine(line);

      expect(result).toEqual(['field1', 'field2', 'field3']);
    });

    it('should handle quoted fields with commas', () => {
      const line = '"field1,with,commas",field2,"field3"';
      // @ts-ignore
      const result = service.parseCSVLine(line);

      expect(result).toEqual(['field1,with,commas', 'field2', 'field3']);
    });

    it('should trim spaces', () => {
      const line = '  field1  ,  field2  ,  field3  ';
      // @ts-ignore
      const result = service.parseCSVLine(line);

      expect(result).toEqual(['field1', 'field2', 'field3']);
    });
  });

  describe('findDuplicates', () => {
    it('should find duplicate SKUs', () => {
      const data: ProductTemplate[] = [
        { sku: 'TEST-001', name: 'Product 1', value: 1000, category_name: 'Cat 1', quantity: 10, warehouse_id: 1 },
        { sku: 'TEST-002', name: 'Product 2', value: 2000, category_name: 'Cat 2', quantity: 20, warehouse_id: 2 },
        { sku: 'TEST-001', name: 'Product 3', value: 3000, category_name: 'Cat 3', quantity: 30, warehouse_id: 3 }
      ];
      // @ts-ignore
      const result = service.findDuplicates(data);

      expect(result.sku.length).toBe(1);
      expect(result.sku).toContain('TEST-001');
    });

    it('should find duplicate names', () => {
      const data: ProductTemplate[] = [
        { sku: 'TEST-001', name: 'Product Name', value: 1000, category_name: 'Cat 1', quantity: 10, warehouse_id: 1 },
        { sku: 'TEST-002', name: 'Product Name', value: 2000, category_name: 'Cat 2', quantity: 20, warehouse_id: 2 }
      ];
      // @ts-ignore
      const result = service.findDuplicates(data);

      expect(result.name.length).toBe(1);
      expect(result.name).toContain('Product Name');
    });

    it('should handle case-insensitive duplicates', () => {
      const data: ProductTemplate[] = [
        { sku: 'TEST-001', name: 'Product Name', value: 1000, category_name: 'Cat 1', quantity: 10, warehouse_id: 1 },
        { sku: 'TEST-002', name: 'PRODUCT NAME', value: 2000, category_name: 'Cat 2', quantity: 20, warehouse_id: 2 }
      ];
      // @ts-ignore
      const result = service.findDuplicates(data);

      expect(result.name.length).toBe(1);
    });

    it('should return empty arrays when no duplicates', () => {
      const data: ProductTemplate[] = [
        { sku: 'TEST-001', name: 'Product 1', value: 1000, category_name: 'Cat 1', quantity: 10, warehouse_id: 1 },
        { sku: 'TEST-002', name: 'Product 2', value: 2000, category_name: 'Cat 2', quantity: 20, warehouse_id: 2 }
      ];
      // @ts-ignore
      const result = service.findDuplicates(data);

      expect(result.sku.length).toBe(0);
      expect(result.name.length).toBe(0);
    });
  });

  describe('findDuplicateHeaders', () => {
    it('should find duplicate headers', () => {
      const headers = ['sku', 'name', 'value', 'sku', 'quantity'];
      // @ts-ignore
      const result = service.findDuplicateHeaders(headers);

      expect(result.length).toBe(1);
      expect(result).toContain('sku');
    });

    it('should return empty array when no duplicates', () => {
      const headers = ['sku', 'name', 'value', 'category_name', 'quantity', 'warehouse_id'];
      // @ts-ignore
      const result = service.findDuplicateHeaders(headers);

      expect(result.length).toBe(0);
    });
  });

  describe('validateAgainstExistingProducts', () => {
    it('should validate against backend successfully', async () => {
      const data: ProductTemplate[] = [
        { sku: 'TEST-001', name: 'Product 1', value: 1000, category_name: 'Cat 1', quantity: 10, warehouse_id: 1 }
      ];
      const csvContent = 'sku,name,value,category_name,quantity,warehouse_id\nTEST-001,Product 1,1000,Cat 1,10,1';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      const mockResponse = {
        errors: [],
        warnings: []
      };

      const resultPromise = service.validateAgainstExistingProducts(data, file);
      
      const req = httpMock.expectOne(`${baseUrl}products/upload3/validate`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toContain('"sku":"TEST-001"');
      req.flush(mockResponse);

      const result = await resultPromise;
      expect(result.isValid).toBe(true);
    });

    it('should handle backend response with errors', async () => {
      const data: ProductTemplate[] = [
        { sku: 'TEST-001', name: 'Product 1', value: 1000, category_name: 'Cat 1', quantity: 10, warehouse_id: 1 }
      ];
      const csvContent = 'sku,name,value,category_name,quantity,warehouse_id\nTEST-001,Product 1,1000,Cat 1,10,1';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      const mockResponse = {
        errors: ['SKU already exists'],
        warnings: []
      };

      const resultPromise = service.validateAgainstExistingProducts(data, file);
      
      const req = httpMock.expectOne(`${baseUrl}products/upload3/validate`);
      req.flush(mockResponse);

      const result = await resultPromise;
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('SKU already exists');
    });

    it('should handle backend response with warnings', async () => {
      const data: ProductTemplate[] = [
        { sku: 'TEST-001', name: 'Product 1', value: 1000, category_name: 'Cat 1', quantity: 10, warehouse_id: 1 }
      ];
      const csvContent = 'sku,name,value,category_name,quantity,warehouse_id\nTEST-001,Product 1,1000,Cat 1,10,1';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      const mockResponse = {
        errors: [],
        warnings: ['Low stock warning']
      };

      const resultPromise = service.validateAgainstExistingProducts(data, file);
      
      const req = httpMock.expectOne(`${baseUrl}products/upload3/validate`);
      req.flush(mockResponse);

      const result = await resultPromise;
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Low stock warning');
    });

    it('should handle HTTP 500 error with JSON response', async () => {
      const data: ProductTemplate[] = [
        { sku: 'TEST-001', name: 'Product 1', value: 1000, category_name: 'Cat 1', quantity: 10, warehouse_id: 1 }
      ];
      const csvContent = 'sku,name,value,category_name,quantity,warehouse_id\nTEST-001,Product 1,1000,Cat 1,10,1';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const resultPromise = service.validateAgainstExistingProducts(data, file);
      
      const req = httpMock.expectOne(`${baseUrl}products/upload3/validate`);
      req.error(new ErrorEvent('Server error'), { status: 500 });

      const result = await resultPromise;
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle HTTP 400 error', async () => {
      const data: ProductTemplate[] = [
        { sku: 'TEST-001', name: 'Product 1', value: 1000, category_name: 'Cat 1', quantity: 10, warehouse_id: 1 }
      ];
      const csvContent = 'sku,name,value,category_name,quantity,warehouse_id\nTEST-001,Product 1,1000,Cat 1,10,1';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const resultPromise = service.validateAgainstExistingProducts(data, file);
      
      const req = httpMock.expectOne(`${baseUrl}products/upload3/validate`);
      req.error(new ErrorEvent('Bad request'), { status: 400 });

      const result = await resultPromise;
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return error when file is not provided', async () => {
      const data: ProductTemplate[] = [];

      const result = await service.validateAgainstExistingProducts(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('No se pudo obtener el archivo original');
    });

    it('should fallback to local validation on network error', async () => {
      const data: ProductTemplate[] = [
        { sku: 'TEST-001', name: 'Product 1', value: 1000, category_name: 'Cat 1', quantity: 10, warehouse_id: 1 }
      ];
      productValidationService.validateSkuDuplicatesInFile.and.returnValue([]);
      productValidationService.validateNameDuplicatesInFile.and.returnValue([]);

      const csvContent = 'sku,name,value,category_name,quantity,warehouse_id\nTEST-001,Product 1,1000,Cat 1,10,1';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const resultPromise = service.validateAgainstExistingProducts(data, file);
      
      const req = httpMock.expectOne(`${baseUrl}products/upload3/validate`);
      req.error(new ErrorEvent('Network error'), { status: 0 });

      const result = await resultPromise;
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('solo localmente'))).toBe(true);
    });
  });

  describe('validateLocallyOnly', () => {
    it('should validate locally without backend', async () => {
      const data: ProductTemplate[] = [
        { sku: 'TEST-001', name: 'Product 1', value: 1000, category_name: 'Cat 1', quantity: 10, warehouse_id: 1 }
      ];
      productValidationService.validateSkuDuplicatesInFile.and.returnValue([]);
      productValidationService.validateNameDuplicatesInFile.and.returnValue([]);

      const result = await service.validateLocallyOnly(data);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('solo localmente'))).toBe(true);
    });

    it('should detect SKU duplicates locally', async () => {
      const data: ProductTemplate[] = [
        { sku: 'TEST-001', name: 'Product 1', value: 1000, category_name: 'Cat 1', quantity: 10, warehouse_id: 1 }
      ];
      productValidationService.validateSkuDuplicatesInFile.and.returnValue([
        { sku: 'TEST-001', rowNumbers: [1, 3] }
      ]);
      productValidationService.validateNameDuplicatesInFile.and.returnValue([]);

      const result = await service.validateLocallyOnly(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes("TEST-001"))).toBe(true);
    });

    it('should detect name duplicates locally', async () => {
      const data: ProductTemplate[] = [
        { sku: 'TEST-001', name: 'Product Name', value: 1000, category_name: 'Cat 1', quantity: 10, warehouse_id: 1 }
      ];
      productValidationService.validateSkuDuplicatesInFile.and.returnValue([]);
      productValidationService.validateNameDuplicatesInFile.and.returnValue([
        { nombre: 'Product Name', rowNumbers: [1, 2] }
      ]);

      const result = await service.validateLocallyOnly(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes("Product Name"))).toBe(true);
    });
  });

  describe('generateTemplateCSV', () => {
    it('should generate template CSV with correct headers', () => {
      const template = service.generateTemplateCSV();

      expect(template).toContain('sku,name,value,category_name,quantity,warehouse_id');
      expect(template.split('\n').length).toBeGreaterThan(1);
    });

    it('should include sample data', () => {
      const template = service.generateTemplateCSV();

      expect(template).toContain('SYNC-001');
      expect(template).toContain('SYNC-002');
      expect(template).toContain('SYNC-003');
    });
  });

  describe('generateTemplateCSVWithRealData', () => {
    it('should generate template with real products from backend', async () => {
      const mockResponse = {
        products: [
          { sku: 'REAL-001', name: 'Real Product 1', value: 1000, category_name: 'Cat 1', total_quantity: 10 },
          { sku: 'REAL-002', name: 'Real Product 2', value: 2000, category_name: 'Cat 2', total_quantity: 20 },
          { sku: 'REAL-003', name: 'Real Product 3', value: 3000, category_name: 'Cat 3', total_quantity: 30 }
        ]
      };

      productsService.getAvailableProducts.and.returnValue({
        subscribe: (observer: any) => {
          observer.next(mockResponse);
        }
      } as any);

      const result = await service.generateTemplateCSVWithRealData();

      expect(result).toContain('sku,name,value,category_name,quantity,warehouse_id');
      expect(result).toContain('REAL-001');
      expect(result).toContain('REAL-002');
      expect(result).toContain('REAL-003');
    });

    it('should use fallback when no products available', async () => {
      const mockResponse = { products: [] };

      productsService.getAvailableProducts.and.returnValue({
        subscribe: (observer: any) => {
          observer.next(mockResponse);
        }
      } as any);

      const result = await service.generateTemplateCSVWithRealData();

      expect(result).toContain('sku,name,value,category_name,quantity,warehouse_id');
      expect(result).toContain('FALLBACK');
    });

    it('should use fallback on backend error', async () => {
      productsService.getAvailableProducts.and.returnValue({
        subscribe: (observer: any, error: any) => {
          error(new Error('Backend error'));
        }
      } as any);

      const result = await service.generateTemplateCSVWithRealData();

      expect(result).toContain('ERROR-001');
      expect(result).toContain('ERROR-002');
    });
  });

  describe('insertValidatedProducts', () => {
    it('should insert validated products successfully', async () => {
      const products = [
        { sku: 'TEST-001', name: 'Product 1', value: 1000, category_name: 'Cat 1', quantity: 10, warehouse_id: 1 }
      ];
      const mockResponse = { message: 'Products inserted successfully' };

      const resultPromise = service.insertValidatedProducts(products);
      
      const req = httpMock.expectOne(`${baseUrl}products/upload3/insert`);
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Content-Type')).toBe('application/json');
      req.flush(mockResponse);

      const result = await resultPromise;
      expect(result.message).toBe('Products inserted successfully');
    });

    it('should handle HTTP 201 Created response', async () => {
      const products = [
        { sku: 'TEST-002', name: 'Product 2', value: 2000, category_name: 'Cat 2', quantity: 20, warehouse_id: 2 }
      ];

      const resultPromise = service.insertValidatedProducts(products);
      
      const req = httpMock.expectOne(`${baseUrl}products/upload3/insert`);
      req.flush({ message: 'Created' }, { status: 201, statusText: 'Created' });

      const result = await resultPromise;
      expect(result.message).toBe('Created');
    });

    it('should handle insertion errors', async () => {
      const products = [
        { sku: 'TEST-001', name: 'Product 1', value: 1000, category_name: 'Cat 1', quantity: 10, warehouse_id: 1 }
      ];

      const resultPromise = service.insertValidatedProducts(products);
      
      const req = httpMock.expectOne(`${baseUrl}products/upload3/insert`);
      req.error(new ErrorEvent('Server error'), { status: 500 });

      const result = await resultPromise;
      expect(result.status).toBe(500);
    });

    it('should handle non-JSON response', async () => {
      const products = [
        { sku: 'TEST-003', name: 'Product 3', value: 3000, category_name: 'Cat 3', quantity: 30, warehouse_id: 3 }
      ];

      const resultPromise = service.insertValidatedProducts(products);
      
      const req = httpMock.expectOne(`${baseUrl}products/upload3/insert`);
      req.flush('Raw text response', { status: 200, statusText: 'OK' });

      const result = await resultPromise;
      expect(result.status).toBe(200);
    });
  });

  describe('validateWithoutBackend', () => {
    it('should validate without backend connection', async () => {
      const data: ProductTemplate[] = [
        { sku: 'TEST-001', name: 'Product 1', value: 1000, category_name: 'Cat 1', quantity: 10, warehouse_id: 1 }
      ];
      productValidationService.validateSkuDuplicatesInFile.and.returnValue([]);
      productValidationService.validateNameDuplicatesInFile.and.returnValue([]);

      const result = await service.validateWithoutBackend(data);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('solo localmente'))).toBe(true);
    });
  });
});

