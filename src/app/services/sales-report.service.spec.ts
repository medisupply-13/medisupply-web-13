import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SalesReportService, SalesReportRequest, SalesReportResponse, SalesComplianceRequest, SalesComplianceResponse } from './sales-report.service';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

describe('SalesReportService', () => {
  let service: SalesReportService;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;
  const baseUrl = environment.baseUrl;
  const offerApi = environment.offerUrl;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getToken', 'getRole', 'getCurrentUser']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        SalesReportService,
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });
    service = TestBed.inject(SalesReportService);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;

    // Default spy returns
    authService.getToken.and.returnValue('mock-token');
    authService.getRole.and.returnValue('ADMIN');
    authService.getCurrentUser.and.returnValue(null);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getSalesReport', () => {
    it('should return sales report successfully', (done) => {
      const request: SalesReportRequest = {
        vendor_id: 'VEN001',
        period: 'monthly'
      };

      const mockResponse: SalesReportResponse = {
        data: {
          generated_at: '2025-01-31T00:00:00Z',
          grafico: [
            { periodo: '2025-01', ventas: 10000 },
            { periodo: '2025-02', ventas: 20000 },
            { periodo: '2025-03', ventas: 30000 },
            { periodo: '2025-04', ventas: 40000 },
            { periodo: '2025-05', ventas: 50000 }
          ],
          pedidos: 100,
          period_type: 'monthly',
          periodo: '2025-01',
          productos: [
            { nombre: 'Producto 1', ventas: 25000, cantidad: 50 },
            { nombre: 'Producto 2', ventas: 25000, cantidad: 50 }
          ],
          vendor_id: 'VEN001',
          ventasTotales: 50000
        },
        success: true
      };

      service.getSalesReport(request).subscribe({
        next: (response) => {
          expect(response.success).toBe(true);
          expect(response.data.ventasTotales).toBe(50000);
          expect(response.data.productos.length).toBe(2);
          expect(response.data.grafico.length).toBe(5);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}reports/sales-report`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush(mockResponse);
    });

    it('should handle error', (done) => {
      const request: SalesReportRequest = {
        vendor_id: 'INVALID',
        period: 'monthly'
      };

      service.getSalesReport(request).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}reports/sales-report`);
      req.error(new ErrorEvent('Not found'), { status: 404 });
    });

    it('should handle response with empty data', (done) => {
      const request: SalesReportRequest = {
        vendor_id: 'VEN002',
        period: 'yearly'
      };

      const mockResponse: SalesReportResponse = {
        data: {
          generated_at: '2024-12-31T00:00:00Z',
          grafico: [],
          pedidos: 0,
          period_type: 'yearly',
          periodo: '2024',
          productos: [],
          vendor_id: 'VEN002',
          ventasTotales: 0
        },
        success: true
      };

      service.getSalesReport(request).subscribe({
        next: (response) => {
          expect(response.success).toBe(true);
          expect(response.data.ventasTotales).toBe(0);
          expect(response.data.productos.length).toBe(0);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}reports/sales-report`);
      req.flush(mockResponse);
    });

    it('should handle network error', (done) => {
      const request: SalesReportRequest = {
        vendor_id: 'VEN003',
        period: 'weekly'
      };

      service.getSalesReport(request).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}reports/sales-report`);
      req.error(new ErrorEvent('Network error'), { status: 0 });
    });

    it('should handle 403 error with detailed logging', (done) => {
      const request: SalesReportRequest = {
        vendor_id: 'VEN001',
        period: 'monthly'
      };

      spyOn(console, 'error');

      service.getSalesReport(request).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(403);
          expect(console.error).toHaveBeenCalled();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}reports/sales-report`);
      req.flush({ Message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    });
  });

  describe('getVendors', () => {
    it('should return all vendors for non-SUPERVISOR roles', (done) => {
      authService.getRole.and.returnValue('ADMIN');
      authService.getCurrentUser.and.returnValue(null);

      const mockResponse = {
        data: [
          { id: 1, name: 'Vendor 1', active: true, email: 'vendor1@example.com', region: 'Norte', user_id: 10 },
          { id: 2, name: 'Vendor 2', active: true, email: 'vendor2@example.com', region: 'Sur', user_id: 20 },
          { id: 3, name: 'Vendor 3', active: false, email: 'vendor3@example.com', region: 'Centro' }
        ],
        success: true
      };

      service.getVendors().subscribe({
        next: (vendors) => {
          expect(vendors.length).toBe(2); // Solo activos
          expect(vendors[0].value).toBe('1');
          expect(vendors[0].labelKey).toBe('Vendor 1');
          expect(vendors[0].userId).toBe('10');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}users/sellers`);
      req.flush(mockResponse);
    });

    it('should filter inactive vendors', (done) => {
      authService.getRole.and.returnValue('ADMIN');

      const mockResponse = {
        data: [
          { id: 1, name: 'Vendor 1', active: true, email: 'vendor1@example.com', region: 'Norte' },
          { id: 2, name: 'Vendor 2', active: false, email: 'vendor2@example.com', region: 'Sur' },
          { id: 3, name: 'Vendor 3', active: null, email: 'vendor3@example.com', region: 'Centro' }
        ],
        success: true
      };

      service.getVendors().subscribe({
        next: (vendors) => {
          expect(vendors.length).toBe(2); // Solo activos (true y null se consideran activos)
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}users/sellers`);
      req.flush(mockResponse);
    });

    it('should return only own vendor for SUPERVISOR role by user_id', (done) => {
      authService.getRole.and.returnValue('SUPERVISOR');
      authService.getCurrentUser.and.returnValue({
        user_id: 10,
        name: 'Supervisor',
        last_name: 'Test',
        email: 'supervisor@example.com',
        role: 'SUPERVISOR'
      });

      const mockResponse = {
        data: [
          { id: 1, name: 'Vendor 1', active: true, email: 'vendor1@example.com', region: 'Norte', user_id: 10 },
          { id: 2, name: 'Vendor 2', active: true, email: 'vendor2@example.com', region: 'Sur', user_id: 20 }
        ],
        success: true
      };

      service.getVendors().subscribe({
        next: (vendors) => {
          expect(vendors.length).toBe(1);
          expect(vendors[0].value).toBe('1');
          expect(vendors[0].userId).toBe('10');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}users/sellers`);
      req.flush(mockResponse);
    });

    it('should return only own vendor for SUPERVISOR role by email', (done) => {
      authService.getRole.and.returnValue('SUPERVISOR');
      authService.getCurrentUser.and.returnValue({
        user_id: 999,
        name: 'Supervisor',
        last_name: 'Test',
        email: 'vendor2@example.com',
        role: 'SUPERVISOR'
      });

      const mockResponse = {
        data: [
          { id: 1, name: 'Vendor 1', active: true, email: 'vendor1@example.com', region: 'Norte', user_id: 10 },
          { id: 2, name: 'Vendor 2', active: true, email: 'vendor2@example.com', region: 'Sur', user_id: 20 }
        ],
        success: true
      };

      service.getVendors().subscribe({
        next: (vendors) => {
          expect(vendors.length).toBe(1);
          expect(vendors[0].value).toBe('2');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}users/sellers`);
      req.flush(mockResponse);
    });

    it('should return empty array when SUPERVISOR vendor not found', (done) => {
      authService.getRole.and.returnValue('SUPERVISOR');
      authService.getCurrentUser.and.returnValue({
        user_id: 999,
        name: 'Supervisor',
        last_name: 'Test',
        email: 'notfound@example.com',
        role: 'SUPERVISOR'
      });

      const mockResponse = {
        data: [
          { id: 1, name: 'Vendor 1', active: true, email: 'vendor1@example.com', region: 'Norte', user_id: 10 }
        ],
        success: true
      };

      service.getVendors().subscribe({
        next: (vendors) => {
          expect(vendors.length).toBe(0);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}users/sellers`);
      req.flush(mockResponse);
    });

    it('should handle empty response', (done) => {
      authService.getRole.and.returnValue('ADMIN');

      const mockResponse = {
        data: [],
        success: true
      };

      service.getVendors().subscribe({
        next: (vendors) => {
          expect(vendors.length).toBe(0);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}users/sellers`);
      req.flush(mockResponse);
    });

    it('should handle non-array response data', (done) => {
      authService.getRole.and.returnValue('ADMIN');

      const mockResponse = {
        data: null,
        success: true
      };

      service.getVendors().subscribe({
        next: (vendors) => {
          expect(vendors.length).toBe(0);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}users/sellers`);
      req.flush(mockResponse);
    });

    it('should handle error when getting vendors', (done) => {
      service.getVendors().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}users/sellers`);
      req.error(new ErrorEvent('Network error'), { status: 500 });
    });

    it('should handle vendors without user_id', (done) => {
      authService.getRole.and.returnValue('ADMIN');

      const mockResponse = {
        data: [
          { id: 1, name: 'Vendor 1', active: true, email: 'vendor1@example.com', region: 'Norte' }
        ],
        success: true
      };

      service.getVendors().subscribe({
        next: (vendors) => {
          expect(vendors.length).toBe(1);
          expect(vendors[0].userId).toBeNull();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}users/sellers`);
      req.flush(mockResponse);
    });

    it('should lowercase email addresses', (done) => {
      authService.getRole.and.returnValue('ADMIN');

      const mockResponse = {
        data: [
          { id: 1, name: 'Vendor 1', active: true, email: 'VENDOR1@EXAMPLE.COM', region: 'Norte' }
        ],
        success: true
      };

      service.getVendors().subscribe({
        next: (vendors) => {
          expect(vendors[0].email).toBe('vendor1@example.com');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}users/sellers`);
      req.flush(mockResponse);
    });
  });

  describe('getSalesCompliance', () => {
    it('should return sales compliance report successfully', (done) => {
      const request: SalesComplianceRequest = {
        vendor_id: 1,
        region: 'Norte',
        quarter: 'Q1',
        year: 2025
      };

      const mockResponse: SalesComplianceResponse = {
        success: true,
        data: {
          vendor_id: 1,
          cumplimiento_total_pct: 85.5,
          cumplimiento_region_pct: 90.0,
          total_goal: 1000,
          total_goal_vendor: 800,
          ventasTotales: 855,
          ventas_region: 900,
          pedidos: 50,
          period_start: '2025-01-01',
          period_end: '2025-03-31',
          status: 'verde',
          status_region: 'verde',
          region: 'Norte',
          num_plans_active: 2,
          num_sellers_region: 5,
          detalle_productos: [
            {
              product_id: 1,
              ventas: 400,
              goal: 500,
              goal_vendor: 400,
              cumplimiento_pct: 80.0,
              status: 'amarillo'
            }
          ]
        }
      };

      service.getSalesCompliance(request).subscribe({
        next: (response) => {
          expect(response.success).toBe(true);
          expect(response.data.cumplimiento_total_pct).toBe(85.5);
          expect(response.data.detalle_productos.length).toBe(1);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}reports/sales-compliance`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush(mockResponse);
    });

    it('should handle success: false response and convert to error', (done) => {
      const request: SalesComplianceRequest = {
        vendor_id: 2,
        region: 'Centro',
        quarter: 'Q1',
        year: 2025
      };

      const errorResponse = {
        success: false,
        error_type: 'region_mismatch',
        message: 'La región proporcionada no coincide con la región del vendedor.'
      };

      service.getSalesCompliance(request).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.error_type).toBe('region_mismatch');
          expect(error.error.message).toContain('región');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}reports/sales-compliance`);
      req.flush(errorResponse);
    });

    it('should handle HTTP error', (done) => {
      const request: SalesComplianceRequest = {
        vendor_id: 1,
        region: 'Norte',
        quarter: 'Q1',
        year: 2025
      };

      service.getSalesCompliance(request).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(404);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}reports/sales-compliance`);
      req.error(new ErrorEvent('Not found'), { status: 404, statusText: 'Not Found' });
    });

    it('should handle not_found error type', (done) => {
      const request: SalesComplianceRequest = {
        vendor_id: 1,
        region: 'Norte',
        quarter: 'Q3',
        year: 2025
      };

      const errorResponse = {
        success: false,
        error_type: 'not_found',
        message: 'No se encontró el plan de venta especificado'
      };

      service.getSalesCompliance(request).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.error.error_type).toBe('not_found');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}reports/sales-compliance`);
      req.flush(errorResponse);
    });
  });

  describe('getSalesPlans', () => {
    it('should return sales plans when response is array', (done) => {
      const mockPlans = [
        { plan_id: 1, region: 'Norte', quarter: 'Q1', year: 2025 },
        { plan_id: 2, region: 'Sur', quarter: 'Q1', year: 2025 }
      ];

      service.getSalesPlans().subscribe({
        next: (plans) => {
          expect(plans.length).toBe(2);
          expect(plans[0].value).toBe('1');
          expect(plans[0].labelKey).toContain('Norte');
          done();
        }
      });

      const req = httpMock.expectOne(`${offerApi}offers/plans`);
      expect(req.request.method).toBe('GET');
      req.flush(mockPlans);
    });

    it('should return sales plans when response has data property', (done) => {
      const mockResponse = {
        data: [
          { plan_id: 1, region: 'Norte', quarter: 'Q1', year: 2025 },
          { id: 2, region: 'Sur', quarter: 'Q1', year: 2025 }
        ]
      };

      service.getSalesPlans().subscribe({
        next: (plans) => {
          expect(plans.length).toBe(2);
          expect(plans[0].value).toBe('1');
          expect(plans[1].value).toBe('2');
          done();
        }
      });

      const req = httpMock.expectOne(`${offerApi}offers/plans`);
      req.flush(mockResponse);
    });

    it('should handle plans with id instead of plan_id', (done) => {
      const mockPlans = [
        { id: 1, region: 'Norte', quarter: 'Q1', year: 2025 },
        { id: 2, region: 'Sur', quarter: 'Q2', year: 2025 }
      ];

      service.getSalesPlans().subscribe({
        next: (plans) => {
          expect(plans.length).toBe(2);
          expect(plans[0].value).toBe('1');
          expect(plans[1].value).toBe('2');
          done();
        }
      });

      const req = httpMock.expectOne(`${offerApi}offers/plans`);
      req.flush(mockPlans);
    });

    it('should filter out invalid plans', (done) => {
      const mockPlans = [
        { plan_id: 1, region: 'Norte', quarter: 'Q1', year: 2025 },
        { region: 'Sur', quarter: 'Q1', year: 2025 }, // Sin id
        { plan_id: 3, quarter: 'Q1', year: 2025 } // Sin región pero tiene id
      ];

      service.getSalesPlans().subscribe({
        next: (plans) => {
          expect(plans.length).toBe(2); // Solo los que tienen value y labelKey válidos
          done();
        }
      });

      const req = httpMock.expectOne(`${offerApi}offers/plans`);
      req.flush(mockPlans);
    });

    it('should handle empty array response', (done) => {
      service.getSalesPlans().subscribe({
        next: (plans) => {
          expect(plans.length).toBe(0);
          done();
        }
      });

      const req = httpMock.expectOne(`${offerApi}offers/plans`);
      req.flush([]);
    });

    it('should handle non-array response', (done) => {
      service.getSalesPlans().subscribe({
        next: (plans) => {
          expect(plans.length).toBe(0);
          done();
        }
      });

      const req = httpMock.expectOne(`${offerApi}offers/plans`);
      req.flush({ error: 'Invalid format' });
    });

    it('should handle error when getting sales plans', (done) => {
      service.getSalesPlans().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${offerApi}offers/plans`);
      req.error(new ErrorEvent('Network error'), { status: 500 });
    });

    it('should format labelKey correctly', (done) => {
      const mockPlans = [
        { plan_id: 1, region: 'Norte', quarter: 'Q1', year: 2025 }
      ];

      service.getSalesPlans().subscribe({
        next: (plans) => {
          expect(plans[0].labelKey).toBe('Plan 1 - Norte Q1 2025');
          done();
        }
      });

      const req = httpMock.expectOne(`${offerApi}offers/plans`);
      req.flush(mockPlans);
    });

    it('should handle missing optional fields in labelKey', (done) => {
      const mockPlans = [
        { plan_id: 1, region: 'Norte' },
        { id: 2, quarter: 'Q2' }
      ];

      service.getSalesPlans().subscribe({
        next: (plans) => {
          expect(plans.length).toBe(2);
          expect(plans[0].labelKey).toContain('Plan 1');
          expect(plans[1].labelKey).toContain('Plan 2');
          done();
        }
      });

      const req = httpMock.expectOne(`${offerApi}offers/plans`);
      req.flush(mockPlans);
    });
  });
});

