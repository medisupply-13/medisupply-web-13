import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SalesReportService, SalesReportRequest, SalesReportResponse } from './sales-report.service';
import { environment } from '../../environments/environment';

describe('SalesReportService', () => {
  let service: SalesReportService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.baseUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SalesReportService]
    });
    service = TestBed.inject(SalesReportService);
    httpMock = TestBed.inject(HttpTestingController);
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
        period: 'monthly',
        start_date: '2025-01-01',
        end_date: '2025-01-31'
      };

      const mockResponse: SalesReportResponse = {
        data: {
          ventasTotales: 50000,
          productos: [
            { nombre: 'Producto 1', ventas: 25000 },
            { nombre: 'Producto 2', ventas: 25000 }
          ],
          grafico: [10, 20, 30, 40, 50]
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
        period: 'monthly',
        start_date: '2025-01-01',
        end_date: '2025-01-31'
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
        period: 'yearly',
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };

      const mockResponse: SalesReportResponse = {
        data: {
          ventasTotales: 0,
          productos: [],
          grafico: []
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
        period: 'weekly',
        start_date: '2025-01-01',
        end_date: '2025-01-07'
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
  });
});

