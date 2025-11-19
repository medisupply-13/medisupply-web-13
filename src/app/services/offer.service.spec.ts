import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { OfferService, CreateSalesPlanPayload, CreateSalesPlanResponse, ValidateStockResponse } from './offer.service';
import { environment } from '../../environments/environment';

describe('OfferService', () => {
  let service: OfferService;
  let httpMock: HttpTestingController;
  const offerApi = environment.offerUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [OfferService]
    });
    service = TestBed.inject(OfferService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getRegions', () => {
    it('should return regions list', (done) => {
      const mockRegions = [
        { value: 'Norte', label: 'Norte' },
        { value: 'Centro', label: 'Centro' },
        { value: 'Sur', label: 'Sur' }
      ];

      service.getRegions().subscribe({
        next: (regions) => {
          expect(regions).toEqual(mockRegions);
          expect(regions.length).toBe(3);
          done();
        }
      });

      const req = httpMock.expectOne(`${offerApi}offers/regions`);
      expect(req.request.method).toBe('GET');
      req.flush(mockRegions);
    });

    it('should handle non-array response', (done) => {
      service.getRegions().subscribe({
        next: (regions) => {
          expect(regions).toEqual([]);
          done();
        }
      });

      const req = httpMock.expectOne(`${offerApi}offers/regions`);
      req.flush({ error: 'Not an array' });
    });

    it('should handle error', (done) => {
      service.getRegions().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${offerApi}offers/regions`);
      req.error(new ErrorEvent('Network error'), { status: 500 });
    });
  });

  describe('getQuarters', () => {
    it('should return quarters list', (done) => {
      const mockQuarters = [
        { value: 'Q1', label: 'Q1 - Enero a Marzo' },
        { value: 'Q2', label: 'Q2 - Abril a Junio' },
        { value: 'Q3', label: 'Q3 - Julio a Septiembre' },
        { value: 'Q4', label: 'Q4 - Octubre a Diciembre' }
      ];

      service.getQuarters().subscribe({
        next: (quarters) => {
          expect(quarters).toEqual(mockQuarters);
          expect(quarters.length).toBe(4);
          done();
        }
      });

      const req = httpMock.expectOne(`${offerApi}offers/quarters`);
      expect(req.request.method).toBe('GET');
      req.flush(mockQuarters);
    });

    it('should handle non-array response', (done) => {
      service.getQuarters().subscribe({
        next: (quarters) => {
          expect(quarters).toEqual([]);
          done();
        }
      });

      const req = httpMock.expectOne(`${offerApi}offers/quarters`);
      req.flush({ error: 'Not an array' });
    });

    it('should handle error', (done) => {
      service.getQuarters().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${offerApi}offers/quarters`);
      req.error(new ErrorEvent('Network error'), { status: 500 });
    });
  });

  describe('createSalesPlan', () => {
    it('should create sales plan successfully', (done) => {
      const payload: CreateSalesPlanPayload = {
        region: 'Norte',
        quarter: 'Q1',
        year: 2025,
        total_goal: 1000,
        products: [
          { product_id: 1, individual_goal: 500 },
          { product_id: 2, individual_goal: 500 }
        ]
      };

      const mockResponse: CreateSalesPlanResponse = {
        success: true,
        id: '123',
        message: 'Plan created successfully'
      };

      service.createSalesPlan(payload).subscribe({
        next: (response) => {
          expect(response.success).toBe(true);
          expect(response.id).toBe('123');
          done();
        }
      });

      const req = httpMock.expectOne(`${offerApi}offers/plans`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush(mockResponse);
    });

    it('should handle error when creating sales plan', (done) => {
      const payload: CreateSalesPlanPayload = {
        region: 'Norte',
        quarter: 'Q1',
        year: 2025,
        total_goal: 1000,
        products: []
      };

      service.createSalesPlan(payload).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${offerApi}offers/plans`);
      req.error(new ErrorEvent('Validation error'), { status: 400 });
    });
  });

  describe('getOfferProducts', () => {
    it('should return offer products list', (done) => {
      const mockProducts = [
        { id: 1, name: 'Producto 1', price: 1000 },
        { id: 2, name: 'Producto 2', price: 2000 }
      ];

      service.getOfferProducts().subscribe({
        next: (products) => {
          expect(products).toEqual(mockProducts);
          expect(products.length).toBe(2);
          done();
        }
      });

      const req = httpMock.expectOne(`${offerApi}offers/products`);
      expect(req.request.method).toBe('GET');
      req.flush(mockProducts);
    });

    it('should handle empty array response', (done) => {
      service.getOfferProducts().subscribe({
        next: (products) => {
          expect(products).toEqual([]);
          expect(products.length).toBe(0);
          done();
        }
      });

      const req = httpMock.expectOne(`${offerApi}offers/products`);
      req.flush([]);
    });

    it('should handle error', (done) => {
      service.getOfferProducts().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${offerApi}offers/products`);
      req.error(new ErrorEvent('Network error'), { status: 500 });
    });
  });

  describe('validateStock', () => {
    it('should validate stock successfully with sufficient stock', (done) => {
      const productId = 1;
      const individualGoal = 100;

      const mockResponse: ValidateStockResponse = {
        valid: true,
        message: 'Stock disponible',
        available_stock: 200
      };

      service.validateStock(productId, individualGoal).subscribe({
        next: (response) => {
          expect(response.valid).toBe(true);
          expect(response.available_stock).toBe(200);
          expect(response.message).toBe('Stock disponible');
          done();
        }
      });

      const req = httpMock.expectOne(`${offerApi}products/${productId}/validate-stock?individual_goal=${individualGoal}`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('individual_goal')).toBe(individualGoal.toString());
      req.flush(mockResponse);
    });

    it('should validate stock with insufficient stock', (done) => {
      const productId = 1;
      const individualGoal = 200;

      const mockResponse: ValidateStockResponse = {
        valid: false,
        message: 'No hay suficiente stock disponible',
        available_stock: 100
      };

      service.validateStock(productId, individualGoal).subscribe({
        next: (response) => {
          expect(response.valid).toBe(false);
          expect(response.available_stock).toBe(100);
          done();
        }
      });

      const req = httpMock.expectOne(`${offerApi}products/${productId}/validate-stock?individual_goal=${individualGoal}`);
      req.flush(mockResponse);
    });


    it('should handle network error', (done) => {
      const productId = 1;
      const individualGoal = 100;

      service.validateStock(productId, individualGoal).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${offerApi}products/${productId}/validate-stock?individual_goal=${individualGoal}`);
      req.error(new ErrorEvent('Network error'), { status: 0 });
    });

    it('should handle zero goal', (done) => {
      const productId = 1;
      const individualGoal = 0;

      const mockResponse: ValidateStockResponse = {
        valid: true,
        message: 'Stock disponible',
        available_stock: 100
      };

      service.validateStock(productId, individualGoal).subscribe({
        next: (response) => {
          expect(response.valid).toBe(true);
          done();
        }
      });

      const req = httpMock.expectOne(`${offerApi}products/${productId}/validate-stock?individual_goal=0`);
      req.flush(mockResponse);
    });

    it('should handle large goal values', (done) => {
      const productId = 1;
      const individualGoal = 1000000;

      const mockResponse: ValidateStockResponse = {
        valid: false,
        message: 'Stock insuficiente',
        available_stock: 1000
      };

      service.validateStock(productId, individualGoal).subscribe({
        next: (response) => {
          expect(response.valid).toBe(false);
          done();
        }
      });

      const req = httpMock.expectOne(`${offerApi}products/${productId}/validate-stock?individual_goal=${individualGoal}`);
      req.flush(mockResponse);
    });
  });
});

