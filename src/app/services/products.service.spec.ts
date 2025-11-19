import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProductsService, Product, ProductsResponse } from './products.service';
import { environment } from '../../environments/environment';

describe('ProductsService', () => {
  let service: ProductsService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.baseUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProductsService]
    });
    service = TestBed.inject(ProductsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAvailableProducts', () => {
    it('should return products when backend returns array', (done) => {
      const mockProducts: any[] = [
        {
          product_id: 1,
          sku: 'MED-001',
          name: 'Producto 1',
          value: 1000,
          category_name: 'Medicamentos',
          total_quantity: 50
        },
        {
          product_id: 2,
          sku: 'MED-002',
          name: 'Producto 2',
          value: 2000,
          category_name: 'Equipos',
          total_quantity: 30
        }
      ];

      service.getAvailableProducts(1).subscribe({
        next: (response: ProductsResponse) => {
          expect(response.success).toBe(true);
          expect(response.products.length).toBe(2);
          expect(response.products[0].sku).toBe('MED-001');
          expect(response.total).toBe(2);
          done();
        },
        error: (error) => {
          fail('Should not have failed: ' + JSON.stringify(error));
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/available`);
      expect(req.request.method).toBe('GET');
      req.flush(mockProducts);
    });

    it('should transform object with products array', (done) => {
      const mockResponse = {
        products: [
          {
            product_id: 1,
            sku: 'MED-001',
            name: 'Producto 1',
            value: 1000,
            category_name: 'Medicamentos',
            quantity: 50
          }
        ],
        success: true
      };

      service.getAvailableProducts(1).subscribe({
        next: (response: ProductsResponse) => {
          expect(response.success).toBe(true);
          expect(response.products.length).toBe(1);
          expect(response.products[0].total_quantity).toBe(50);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/available`);
      req.flush(mockResponse);
    });

    it('should handle empty array response', (done) => {
      service.getAvailableProducts(1).subscribe({
        next: (response: ProductsResponse) => {
          expect(response.success).toBe(true);
          expect(response.products.length).toBe(0);
          expect(response.total).toBe(0);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/available`);
      req.flush([]);
    });

    it('should handle error response', (done) => {
      service.getAvailableProducts(1).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/available`);
      req.error(new ErrorEvent('Network error'));
    });

    it('should handle unsupported response format', (done) => {
      service.getAvailableProducts(1).subscribe({
        next: (response: ProductsResponse) => {
          expect(response.success).toBe(false);
          expect(response.products.length).toBe(0);
          expect(response.message).toBe('Formato de respuesta no soportado');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/available`);
      req.flush({ invalid: 'format' });
    });

    it('should use max_quantity when total_quantity is missing', (done) => {
      const mockProducts: any[] = [
        {
          product_id: 1,
          sku: 'MED-001',
          name: 'Producto 1',
          value: 1000,
          category_name: 'Medicamentos',
          max_quantity: 50
        }
      ];

      service.getAvailableProducts(1).subscribe({
        next: (response: ProductsResponse) => {
          expect(response.success).toBe(true);
          expect(response.products[0].total_quantity).toBe(50);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/available`);
      req.flush(mockProducts);
    });

    it('should use quantity when total_quantity and max_quantity are missing', (done) => {
      const mockProducts: any[] = [
        {
          product_id: 1,
          sku: 'MED-001',
          name: 'Producto 1',
          value: 1000,
          category_name: 'Medicamentos',
          quantity: 25
        }
      ];

      service.getAvailableProducts(1).subscribe({
        next: (response: ProductsResponse) => {
          expect(response.success).toBe(true);
          expect(response.products[0].total_quantity).toBe(25);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/available`);
      req.flush(mockProducts);
    });

    it('should use total_stock when other quantity fields are missing', (done) => {
      const mockProducts: any[] = [
        {
          product_id: 1,
          sku: 'MED-001',
          name: 'Producto 1',
          value: 1000,
          category_name: 'Medicamentos',
          total_stock: 100
        }
      ];

      service.getAvailableProducts(1).subscribe({
        next: (response: ProductsResponse) => {
          expect(response.success).toBe(true);
          expect(response.products[0].total_quantity).toBe(100);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/available`);
      req.flush(mockProducts);
    });

    it('should use stock when all other quantity fields are missing', (done) => {
      const mockProducts: any[] = [
        {
          product_id: 1,
          sku: 'MED-001',
          name: 'Producto 1',
          value: 1000,
          category_name: 'Medicamentos',
          stock: 75
        }
      ];

      service.getAvailableProducts(1).subscribe({
        next: (response: ProductsResponse) => {
          expect(response.success).toBe(true);
          expect(response.products[0].total_quantity).toBe(75);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/available`);
      req.flush(mockProducts);
    });

    it('should use 0 when no quantity fields are present', (done) => {
      const mockProducts: any[] = [
        {
          product_id: 1,
          sku: 'MED-001',
          name: 'Producto 1',
          value: 1000,
          category_name: 'Medicamentos'
        }
      ];

      service.getAvailableProducts(1).subscribe({
        next: (response: ProductsResponse) => {
          expect(response.success).toBe(true);
          expect(response.products[0].total_quantity).toBe(0);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/available`);
      req.flush(mockProducts);
    });

    it('should handle products with image_url', (done) => {
      const mockProducts: any[] = [
        {
          product_id: 1,
          sku: 'MED-001',
          name: 'Producto 1',
          value: 1000,
          category_name: 'Medicamentos',
          total_quantity: 50,
          image_url: 'https://example.com/image.jpg'
        }
      ];

      service.getAvailableProducts(1).subscribe({
        next: (response: ProductsResponse) => {
          expect(response.success).toBe(true);
          expect(response.products[0].image_url).toBe('https://example.com/image.jpg');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/available`);
      req.flush(mockProducts);
    });

    it('should handle products without image_url', (done) => {
      const mockProducts: any[] = [
        {
          product_id: 1,
          sku: 'MED-001',
          name: 'Producto 1',
          value: 1000,
          category_name: 'Medicamentos',
          total_quantity: 50
        }
      ];

      service.getAvailableProducts(1).subscribe({
        next: (response: ProductsResponse) => {
          expect(response.success).toBe(true);
          expect(response.products[0].image_url).toBeNull();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/available`);
      req.flush(mockProducts);
    });
  });

  describe('getProductsByWarehouse', () => {
    it('should return products grouped by SKU', (done) => {
      const mockResponse = {
        products: [
          {
            product_id: 1,
            sku: 'MED-001',
            name: 'Producto 1',
            value: 1000,
            category_name: 'Medicamentos',
            quantity: 20
          },
          {
            product_id: 1,
            sku: 'MED-001',
            name: 'Producto 1',
            value: 1000,
            category_name: 'Medicamentos',
            quantity: 30
          }
        ],
        success: true
      };

      service.getProductsByWarehouse(1).subscribe({
        next: (response: ProductsResponse) => {
          expect(response.success).toBe(true);
          expect(response.products.length).toBe(1);
          expect(response.products[0].sku).toBe('MED-001');
          expect(response.products[0].total_quantity).toBe(50); // 20 + 30
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/by-warehouse/1`);
      req.flush(mockResponse);
    });

    it('should handle error when getting products by warehouse', (done) => {
      service.getProductsByWarehouse(1).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/by-warehouse/1`);
      req.error(new ErrorEvent('Network error'));
    });

    it('should return empty array when no products found', (done) => {
      const mockResponse = {
        products: [],
        success: false
      };

      service.getProductsByWarehouse(1).subscribe({
        next: (response: ProductsResponse) => {
          expect(response.products.length).toBe(0);
          expect(response.success).toBe(false);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/by-warehouse/1`);
      req.flush(mockResponse);
    });

    it('should handle response without products array', (done) => {
      const mockResponse = {
        success: false
      };

      service.getProductsByWarehouse(1).subscribe({
        next: (response: ProductsResponse) => {
          expect(response.products.length).toBe(0);
          expect(response.success).toBe(false);
          expect(response.message).toBe('No se pudieron cargar los productos por bodega');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/by-warehouse/1`);
      req.flush(mockResponse);
    });

    it('should skip products without SKU', (done) => {
      const mockResponse = {
        products: [
          {
            product_id: 1,
            sku: '',
            name: 'Producto sin SKU',
            value: 1000,
            category_name: 'Medicamentos',
            quantity: 10
          },
          {
            product_id: 2,
            sku: 'MED-001',
            name: 'Producto con SKU',
            value: 1000,
            category_name: 'Medicamentos',
            quantity: 20
          }
        ],
        success: true
      };

      service.getProductsByWarehouse(1).subscribe({
        next: (response: ProductsResponse) => {
          expect(response.products.length).toBe(1);
          expect(response.products[0].sku).toBe('MED-001');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/by-warehouse/1`);
      req.flush(mockResponse);
    });

    it('should handle products with null image_url', (done) => {
      const mockResponse = {
        products: [
          {
            product_id: 1,
            sku: 'MED-001',
            name: 'Producto 1',
            value: 1000,
            category_name: 'Medicamentos',
            quantity: 10,
            image_url: null
          }
        ],
        success: true
      };

      service.getProductsByWarehouse(1).subscribe({
        next: (response: ProductsResponse) => {
          expect(response.products[0].image_url).toBeNull();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/by-warehouse/1`);
      req.flush(mockResponse);
    });

    it('should sum quantities correctly for multiple lots of same SKU', (done) => {
      const mockResponse = {
        products: [
          {
            product_id: 1,
            sku: 'MED-001',
            name: 'Producto 1',
            value: 1000,
            category_name: 'Medicamentos',
            quantity: 10
          },
          {
            product_id: 1,
            sku: 'MED-001',
            name: 'Producto 1',
            value: 1000,
            category_name: 'Medicamentos',
            quantity: 15
          },
          {
            product_id: 1,
            sku: 'MED-001',
            name: 'Producto 1',
            value: 1000,
            category_name: 'Medicamentos',
            quantity: 25
          }
        ],
        success: true
      };

      service.getProductsByWarehouse(1).subscribe({
        next: (response: ProductsResponse) => {
          expect(response.products.length).toBe(1);
          expect(response.products[0].total_quantity).toBe(50); // 10 + 15 + 25
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/by-warehouse/1`);
      req.flush(mockResponse);
    });

    it('should handle products without quantity field', (done) => {
      const mockResponse = {
        products: [
          {
            product_id: 1,
            sku: 'MED-001',
            name: 'Producto 1',
            value: 1000,
            category_name: 'Medicamentos'
          }
        ],
        success: true
      };

      service.getProductsByWarehouse(1).subscribe({
        next: (response: ProductsResponse) => {
          expect(response.products[0].total_quantity).toBe(0);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/by-warehouse/1`);
      req.flush(mockResponse);
    });
  });

  describe('getProductsWithoutStock', () => {
    it('should return products without stock', (done) => {
      const mockResponse = {
        products_without_stock: [
          {
            product_id: 1,
            sku: 'MED-001',
            name: 'Producto 1',
            value: 1000,
            category_name: 'Medicamentos'
          }
        ],
        success: true
      };

      service.getProductsWithoutStock().subscribe({
        next: (response: ProductsResponse) => {
          expect(response.success).toBe(true);
          expect(response.products.length).toBe(1);
          expect(response.products[0].total_quantity).toBe(0);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/without-stock`);
      req.flush(mockResponse);
    });

    it('should handle error when getting products without stock', (done) => {
      service.getProductsWithoutStock().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/without-stock`);
      req.error(new ErrorEvent('Network error'));
    });

    it('should handle response without products_without_stock array', (done) => {
      const mockResponse = {
        success: false
      };

      service.getProductsWithoutStock().subscribe({
        next: (response: ProductsResponse) => {
          expect(response.products.length).toBe(0);
          expect(response.success).toBe(false);
          expect(response.message).toBe('No se pudieron cargar los productos sin stock');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/without-stock`);
      req.flush(mockResponse);
    });

    it('should set image_url to null when not provided', (done) => {
      const mockResponse = {
        products_without_stock: [
          {
            product_id: 1,
            sku: 'MED-001',
            name: 'Producto 1',
            value: 1000,
            category_name: 'Medicamentos'
          }
        ],
        success: true
      };

      service.getProductsWithoutStock().subscribe({
        next: (response: ProductsResponse) => {
          expect(response.products[0].image_url).toBeNull();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/without-stock`);
      req.flush(mockResponse);
    });

    it('should preserve image_url when provided', (done) => {
      const mockResponse = {
        products_without_stock: [
          {
            product_id: 1,
            sku: 'MED-001',
            name: 'Producto 1',
            value: 1000,
            category_name: 'Medicamentos',
            image_url: 'https://example.com/image.jpg'
          }
        ],
        success: true
      };

      service.getProductsWithoutStock().subscribe({
        next: (response: ProductsResponse) => {
          expect(response.products[0].image_url).toBe('https://example.com/image.jpg');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/without-stock`);
      req.flush(mockResponse);
    });
  });

  describe('getProductById', () => {
    it('should return a product by id', (done) => {
      const mockProduct: Product = {
        product_id: 1,
        sku: 'MED-001',
        name: 'Producto 1',
        value: 1000,
        category_name: 'Medicamentos',
        total_quantity: 50
      };

      service.getProductById('1').subscribe({
        next: (product: Product) => {
          expect(product.product_id).toBe(1);
          expect(product.sku).toBe('MED-001');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/1`);
      req.flush(mockProduct);
    });

    it('should handle error when getting product by id', (done) => {
      service.getProductById('999').subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/999`);
      req.error(new ErrorEvent('Not found'), { status: 404 });
    });
  });

  describe('createProduct', () => {
    it('should create a new product', (done) => {
      const newProduct = {
        sku: 'MED-003',
        name: 'Producto 3',
        value: 3000,
        category_name: 'Suministros',
        total_quantity: 100
      } as any;

      const createdProduct: Product = {
        product_id: 3,
        ...newProduct
      };

      service.createProduct(newProduct as any).subscribe({
        next: (product: Product) => {
          expect(product.product_id).toBe(3);
          expect(product.sku).toBe('MED-003');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products`);
      expect(req.request.method).toBe('POST');
      req.flush(createdProduct);
    });

    it('should handle error when creating product', (done) => {
      const newProduct = {
        sku: 'MED-003',
        name: 'Producto 3',
        value: 3000,
        category_name: 'Suministros',
        total_quantity: 100
      } as any;

      service.createProduct(newProduct as any).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products`);
      req.error(new ErrorEvent('Bad request'), { status: 400 });
    });
  });

  describe('updateProduct', () => {
    it('should update an existing product', (done) => {
      const updatedData = {
        name: 'Producto Actualizado',
        value: 1500
      };

      const updatedProduct: Product = {
        product_id: 1,
        sku: 'MED-001',
        name: 'Producto Actualizado',
        value: 1500,
        category_name: 'Medicamentos',
        total_quantity: 50
      };

      service.updateProduct('1', updatedData).subscribe({
        next: (product: Product) => {
          expect(product.name).toBe('Producto Actualizado');
          expect(product.value).toBe(1500);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/1`);
      expect(req.request.method).toBe('PUT');
      req.flush(updatedProduct);
    });

    it('should handle error when updating product', (done) => {
      service.updateProduct('999', { name: 'Test' }).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/999`);
      req.error(new ErrorEvent('Not found'), { status: 404 });
    });
  });

  describe('deleteProduct', () => {
    it('should delete a product', (done) => {
      const mockResponse = {
        success: true,
        message: 'Producto eliminado exitosamente'
      };

      service.deleteProduct('1').subscribe({
        next: (response) => {
          expect(response.success).toBe(true);
          expect(response.message).toBe('Producto eliminado exitosamente');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(mockResponse);
    });

    it('should handle error when deleting product', (done) => {
      service.deleteProduct('999').subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/999`);
      req.error(new ErrorEvent('Not found'), { status: 404 });
    });
  });

  describe('toggleProductStatus', () => {
    it('should toggle product status to active', (done) => {
      const updatedProduct: Product = {
        product_id: 1,
        sku: 'MED-001',
        name: 'Producto 1',
        value: 1000,
        category_name: 'Medicamentos',
        total_quantity: 50
      };

      service.toggleProductStatus('1', 'activo').subscribe({
        next: (product: Product) => {
          expect(product.product_id).toBe(1);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/1/status`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ estado: 'activo' });
      req.flush(updatedProduct);
    });

    it('should toggle product status to inactive', (done) => {
      const updatedProduct: Product = {
        product_id: 1,
        sku: 'MED-001',
        name: 'Producto 1',
        value: 1000,
        category_name: 'Medicamentos',
        total_quantity: 50
      };

      service.toggleProductStatus('1', 'inactivo').subscribe({
        next: (product: Product) => {
          expect(product.product_id).toBe(1);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/1/status`);
      expect(req.request.body).toEqual({ estado: 'inactivo' });
      req.flush(updatedProduct);
    });

    it('should handle error when toggling product status', (done) => {
      service.toggleProductStatus('999', 'activo').subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/999/status`);
      req.error(new ErrorEvent('Not found'), { status: 404 });
    });
  });

  describe('insertProduct', () => {
    it('should insert a new product successfully', (done) => {
      const newProduct = {
        sku: 'MED-004',
        name: 'Producto 4',
        value: 4000,
        category_name: 'Suministros',
        quantity: 75,
        warehouse_id: 1,
        section: 'A',
        aisle: '1',
        shelf: '2',
        level: '3',
        image_url: 'https://example.com/image.jpg'
      };

      const mockResponse = {
        success: true,
        product_id: 4,
        message: 'Producto insertado exitosamente'
      };

      service.insertProduct(newProduct).subscribe({
        next: (response) => {
          expect(response.success).toBe(true);
          expect(response.product_id).toBe(4);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/insert`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newProduct);
      req.flush(mockResponse);
    });

    it('should insert product without location data', (done) => {
      const newProduct = {
        sku: 'MED-005',
        name: 'Producto 5',
        value: 5000,
        category_name: 'Equipos',
        quantity: 50,
        warehouse_id: 1
      };

      const mockResponse = {
        success: true,
        product_id: 5
      };

      service.insertProduct(newProduct).subscribe({
        next: (response) => {
          expect(response.success).toBe(true);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/insert`);
      req.flush(mockResponse);
    });

    it('should handle error when inserting product', (done) => {
      const newProduct = {
        sku: 'DUPLICATE-SKU',
        name: 'Producto Duplicado',
        value: 1000,
        category_name: 'Medicamentos',
        quantity: 10,
        warehouse_id: 1
      };

      service.insertProduct(newProduct).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/insert`);
      req.error(new ErrorEvent('Validation error'), { status: 400 });
    });

    it('should insert product with all location fields', (done) => {
      const newProduct = {
        sku: 'MED-006',
        name: 'Producto 6',
        value: 6000,
        category_name: 'Dispositivos',
        quantity: 100,
        warehouse_id: 2,
        section: 'B',
        aisle: '5',
        shelf: '10',
        level: '15'
      };

      const mockResponse = {
        success: true,
        product_id: 6
      };

      service.insertProduct(newProduct).subscribe({
        next: (response) => {
          expect(response.success).toBe(true);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/insert`);
      req.flush(mockResponse);
    });
  });
});

