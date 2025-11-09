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
  });
});

