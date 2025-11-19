import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { LocationService, City, Warehouse, Product, CitiesResponse, WarehousesResponse, LocationResponse, WarehouseProductsResponse } from './location.service';
import { environment } from '../../environments/environment';

describe('LocationService', () => {
  let service: LocationService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.baseUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [LocationService]
    });
    service = TestBed.inject(LocationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getCities', () => {
    it('should return cities list', (done) => {
      const mockResponse: CitiesResponse = {
        cities: [
          {
            city_id: 1,
            name: 'Bogotá',
            country: 'Colombia',
            country_name: 'Colombia'
          },
          {
            city_id: 2,
            name: 'Medellín',
            country: 'Colombia',
            country_name: 'Colombia'
          }
        ],
        success: true
      };

      service.getCities().subscribe({
        next: (response: CitiesResponse) => {
          expect(response.success).toBe(true);
          expect(response.cities.length).toBe(2);
          expect(response.cities[0].name).toBe('Bogotá');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/cities`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle error when getting cities', (done) => {
      service.getCities().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/cities`);
      req.error(new ErrorEvent('Network error'));
    });

    it('should handle empty cities list', (done) => {
      const mockResponse: CitiesResponse = {
        cities: [],
        success: true
      };

      service.getCities().subscribe({
        next: (response: CitiesResponse) => {
          expect(response.cities.length).toBe(0);
          expect(response.success).toBe(true);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/cities`);
      req.flush(mockResponse);
    });
  });

  describe('getWarehouses', () => {
    it('should return warehouses by city id', (done) => {
      const mockResponse: WarehousesResponse = {
        warehouses: [
          {
            warehouse_id: 1,
            name: 'Bodega Norte',
            description: 'Bodega principal',
            city_name: 'Bogotá'
          }
        ],
        success: true,
        city_id: 1
      };

      service.getWarehouses(1).subscribe({
        next: (response: WarehousesResponse) => {
          expect(response.success).toBe(true);
          expect(response.warehouses.length).toBe(1);
          expect(response.warehouses[0].name).toBe('Bodega Norte');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/warehouses/by-city/1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should return all warehouses when no city id provided', (done) => {
      const mockResponse: WarehousesResponse = {
        warehouses: [
          {
            warehouse_id: 1,
            name: 'Bodega Norte',
            description: 'Bodega principal'
          },
          {
            warehouse_id: 2,
            name: 'Bodega Sur',
            description: 'Bodega secundaria'
          }
        ],
        success: true
      };

      service.getWarehouses().subscribe({
        next: (response: WarehousesResponse) => {
          expect(response.warehouses.length).toBe(2);
          expect(response.success).toBe(true);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/warehouses`);
      req.flush(mockResponse);
    });

    it('should handle error when getting warehouses', (done) => {
      service.getWarehouses(1).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/warehouses/by-city/1`);
      req.error(new ErrorEvent('Network error'));
    });
  });

  describe('getProductsLocation', () => {
    it('should return products with locations', (done) => {
      const mockResponse: LocationResponse = {
        cities: [
          {
            city_id: 1,
            name: 'Bogotá',
            country: 'Colombia',
            country_name: 'Colombia'
          }
        ],
        products: [
          {
            product_id: 1,
            sku: 'MED-001',
            name: 'Producto 1',
            quantity: 50,
            locations: []
          }
        ],
        warehouses: [],
        summary: {
          countries: ['Colombia'],
          total_cities: 1,
          total_products: 1,
          total_warehouses: 0
        }
      };

      service.getProductsLocation().subscribe({
        next: (response: LocationResponse) => {
          expect(response.products.length).toBe(1);
          expect(response.cities.length).toBe(1);
          expect(response.summary.total_products).toBe(1);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/location`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle error when getting products location', (done) => {
      service.getProductsLocation().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/location`);
      req.error(new ErrorEvent('Network error'));
    });
  });

  describe('getProductsByWarehouse', () => {
    it('should return products by warehouse without parameters', (done) => {
      const mockResponse: WarehouseProductsResponse = {
        products: [
          {
            product_id: 1,
            sku: 'MED-001',
            name: 'Producto 1',
            quantity: 50
          }
        ],
        success: true,
        warehouse_id: 1
      };

      service.getProductsByWarehouse(1).subscribe({
        next: (response: WarehouseProductsResponse) => {
          expect(response.success).toBe(true);
          expect(response.products.length).toBe(1);
          expect(response.warehouse_id).toBe(1);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/by-warehouse/1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should return products with include_zero parameter', (done) => {
      const mockResponse: WarehouseProductsResponse = {
        products: [
          {
            product_id: 1,
            sku: 'MED-001',
            name: 'Producto 1',
            quantity: 0
          }
        ],
        success: true,
        warehouse_id: 1
      };

      service.getProductsByWarehouse(1, true).subscribe({
        next: (response: WarehouseProductsResponse) => {
          expect(response.products.length).toBe(1);
          expect(response.products[0].quantity).toBe(0);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/by-warehouse/1?include_zero=true`);
      req.flush(mockResponse);
    });

    it('should return products with include_locations parameter', (done) => {
      const mockResponse: WarehouseProductsResponse = {
        products: [
          {
            product_id: 1,
            sku: 'MED-001',
            name: 'Producto 1',
            quantity: 50,
            locations: [
              {
                section: 'A',
                aisle: '1',
                shelf: '2',
                level: '3',
                lot: 'LOT001',
                quantity: 50,
                expiry_date: '2025-12-31'
              } as any
            ]
          }
        ],
        success: true,
        warehouse_id: 1
      };

      service.getProductsByWarehouse(1, false, true).subscribe({
        next: (response: WarehouseProductsResponse) => {
          expect(response.products.length).toBe(1);
          expect(response.products[0].locations).toBeDefined();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/by-warehouse/1?include_locations=true`);
      req.flush(mockResponse);
    });

    it('should return products with both parameters', (done) => {
      const mockResponse: WarehouseProductsResponse = {
        products: [
          {
            product_id: 1,
            sku: 'MED-001',
            name: 'Producto 1',
            quantity: 50
          }
        ],
        success: true,
        warehouse_id: 1
      };

      service.getProductsByWarehouse(1, true, true).subscribe({
        next: (response: WarehouseProductsResponse) => {
          expect(response.products.length).toBe(1);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/by-warehouse/1?include_zero=true&include_locations=true`);
      req.flush(mockResponse);
    });

    it('should handle error when getting products by warehouse', (done) => {
      service.getProductsByWarehouse(999).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/by-warehouse/999`);
      req.error(new ErrorEvent('Not found'), { status: 404 });
    });

    it('should handle empty products list', (done) => {
      const mockResponse: WarehouseProductsResponse = {
        products: [],
        success: true,
        warehouse_id: 1
      };

      service.getProductsByWarehouse(1).subscribe({
        next: (response: WarehouseProductsResponse) => {
          expect(response.products.length).toBe(0);
          expect(response.success).toBe(true);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/by-warehouse/1`);
      req.flush(mockResponse);
    });

    it('should handle array response format', (done) => {
      const mockProducts = [
        {
          product_id: 1,
          sku: 'MED-001',
          name: 'Producto 1',
          quantity: 50
        },
        {
          product_id: 2,
          sku: 'MED-002',
          name: 'Producto 2',
          quantity: 30
        }
      ];

      service.getProductsByWarehouse(1).subscribe({
        next: (response: WarehouseProductsResponse) => {
          expect(response.products.length).toBe(2);
          expect(response.warehouse_id).toBe(1);
          expect(response.success).toBe(true);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/by-warehouse/1`);
      req.flush(mockProducts);
    });

    it('should handle response wrapped in body property', (done) => {
      const mockResponse = {
        body: {
          products: [
            {
              product_id: 1,
              sku: 'MED-001',
              name: 'Producto 1',
              quantity: 50
            }
          ],
          success: true,
          warehouse_id: 1
        }
      };

      service.getProductsByWarehouse(1).subscribe({
        next: (response: WarehouseProductsResponse) => {
          expect(response.products.length).toBe(1);
          expect(response.success).toBe(true);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/by-warehouse/1`);
      req.flush(mockResponse);
    });

    it('should handle response wrapped in data property', (done) => {
      const mockResponse = {
        data: {
          products: [
            {
              product_id: 1,
              sku: 'MED-001',
              name: 'Producto 1',
              quantity: 50
            }
          ],
          success: true,
          warehouse_id: 1
        }
      };

      service.getProductsByWarehouse(1).subscribe({
        next: (response: WarehouseProductsResponse) => {
          expect(response.products.length).toBe(1);
          expect(response.success).toBe(true);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/by-warehouse/1`);
      req.flush(mockResponse);
    });

    it('should handle response with Items property (Lambda format)', (done) => {
      const mockResponse = {
        Items: [
          {
            product_id: 1,
            sku: 'MED-001',
            name: 'Producto 1',
            quantity: 50
          }
        ]
      };

      service.getProductsByWarehouse(1).subscribe({
        next: (response: WarehouseProductsResponse) => {
          expect(response.products.length).toBe(1);
          expect(response.warehouse_id).toBe(1);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/by-warehouse/1`);
      req.flush(mockResponse);
    });

    it('should handle invalid response format', (done) => {
      const mockResponse = {
        invalid: 'format'
      };

      service.getProductsByWarehouse(1).subscribe({
        next: (response: WarehouseProductsResponse) => {
          expect(response.success).toBe(false);
          expect(response.products.length).toBe(0);
          expect(response.warehouse_id).toBe(1);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/by-warehouse/1`);
      req.flush(mockResponse);
    });

    it('should handle products with locations array', (done) => {
      const mockResponse: WarehouseProductsResponse = {
        products: [
          {
            product_id: 1,
            sku: 'MED-001',
            name: 'Producto 1',
            quantity: 50,
            locations: [
              {
                section: 'A',
                aisle: '1',
                shelf: '2',
                level: '3',
                lot: 'LOT001',
                expires: '2025-12-31',
                available: 50,
                reserved: 0
              }
            ]
          }
        ],
        success: true,
        warehouse_id: 1
      };

      service.getProductsByWarehouse(1, false, true).subscribe({
        next: (response: WarehouseProductsResponse) => {
          expect(response.products.length).toBe(1);
          expect(response.products[0].locations).toBeDefined();
          expect(response.products[0].locations?.length).toBe(1);
          expect(response.products[0].locations?.[0].section).toBe('A');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/by-warehouse/1?include_locations=true`);
      req.flush(mockResponse);
    });

    it('should handle products with flattened location fields', (done) => {
      const mockResponse = {
        products: [
          {
            product_id: 1,
            sku: 'MED-001',
            name: 'Producto 1',
            quantity: 50,
            section: 'A',
            aisle: '1',
            shelf: '2',
            level: '3',
            lote: 'LOT001'
          }
        ],
        success: true,
        warehouse_id: 1
      };

      service.getProductsByWarehouse(1, false, true).subscribe({
        next: (response: WarehouseProductsResponse) => {
          expect(response.products.length).toBe(1);
          expect(response.products[0].section).toBe('A');
          expect(response.products[0].aisle).toBe('1');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/by-warehouse/1?include_locations=true`);
      req.flush(mockResponse);
    });

    it('should handle string response and parse JSON', (done) => {
      const mockResponseString = JSON.stringify({
        products: [
          {
            product_id: 1,
            sku: 'MED-001',
            name: 'Producto 1',
            quantity: 50
          }
        ],
        success: true,
        warehouse_id: 1
      });

      service.getProductsByWarehouse(1).subscribe({
        next: (response: WarehouseProductsResponse) => {
          expect(response.products.length).toBe(1);
          expect(response.success).toBe(true);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/by-warehouse/1`);
      req.flush(mockResponseString);
    });

    it('should handle network error with 404 status', (done) => {
      service.getProductsByWarehouse(999).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/by-warehouse/999`);
      req.error(new ErrorEvent('Not found'), { status: 404, statusText: 'Not Found' });
    });

    it('should handle network error with 0 status', (done) => {
      service.getProductsByWarehouse(1).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/by-warehouse/1`);
      req.error(new ErrorEvent('Network error'), { status: 0 });
    });

    it('should correctly construct URL with both parameters', (done) => {
      const mockResponse: WarehouseProductsResponse = {
        products: [],
        success: true,
        warehouse_id: 1
      };

      service.getProductsByWarehouse(1, true, true).subscribe({
        next: (response: WarehouseProductsResponse) => {
          expect(response).toBeTruthy();
          expect(response.products.length).toBe(0);
          expect(response.success).toBe(true);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}products/by-warehouse/1?include_zero=true&include_locations=true`);
      expect(req.request.url).toContain('include_zero=true');
      expect(req.request.url).toContain('include_locations=true');
      req.flush(mockResponse);
    });
  });
});

