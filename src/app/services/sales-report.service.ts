import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface SalesReportRequest {
  vendor_id: string;
  period: string;
}

export interface SalesReportResponse {
  data: {
    generated_at: string;
    grafico: Array<{
      periodo: string;
      ventas: number;
    }>;
    pedidos: number;
    period_type: string;
    periodo: string;
    productos: Array<{
      nombre: string;
      ventas: number;
      cantidad: number;
    }>;
    vendor_id: string;
    ventasTotales: number;
  };
  success: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SalesReportService {
  private api = environment.baseUrl;

  constructor(private http: HttpClient) {
    console.log('🏗️ SalesReportService: Servicio instanciado');
    console.log('🌐 SalesReportService: URL base configurada:', this.api);
  }

  getSalesReport(request: SalesReportRequest): Observable<SalesReportResponse> {
    const url = `${this.api}reports/sales-report`;
    const startTime = performance.now();
    
    console.log('🔍 SalesReportService: ===== INICIANDO CONSULTA AL BACKEND =====');
    console.log('🌐 SalesReportService: URL completa:', url);
    console.log('📊 SalesReportService: Método HTTP: POST');
    console.log('📋 SalesReportService: Headers: Content-Type: application/json');
    console.log('📦 SalesReportService: Payload completo:', JSON.stringify(request, null, 2));
    console.log('⏱️ SalesReportService: Timestamp inicio:', new Date().toISOString());
    console.log('🕐 SalesReportService: Tiempo de inicio (ms):', startTime);
    
    return this.http.post<SalesReportResponse>(url, request).pipe(
      tap((response) => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.log('✅ SalesReportService: ===== RESPUESTA RECIBIDA =====');
        console.log('⏱️ SalesReportService: Timestamp fin:', new Date().toISOString());
        console.log('🕐 SalesReportService: Tiempo de fin (ms):', endTime);
        console.log('⏰ SalesReportService: Duración total (ms):', Math.round(duration * 100) / 100);
        console.log('📊 SalesReportService: Status HTTP: 200 OK');
        console.log('📋 SalesReportService: Response completa:', JSON.stringify(response, null, 2));
        console.log('🔍 SalesReportService: Tamaño de respuesta:', JSON.stringify(response).length, 'caracteres');
        
        if (response?.data) {
          console.log('📦 SalesReportService: Datos extraídos de response.data:');
          console.log('💰 SalesReportService: Ventas totales:', response.data.ventasTotales);
          console.log('📦 SalesReportService: Número de productos:', response.data.productos?.length || 0);
          console.log('📊 SalesReportService: Datos del gráfico:', response.data.grafico);
        }
        console.log('✅ SalesReportService: ===== CONSULTA COMPLETADA =====');
      }),
      catchError((error) => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.error('❌ SalesReportService: ===== ERROR EN CONSULTA =====');
        console.error('⏱️ SalesReportService: Timestamp error:', new Date().toISOString());
        console.error('🕐 SalesReportService: Tiempo de error (ms):', endTime);
        console.error('⏰ SalesReportService: Duración hasta error (ms):', Math.round(duration * 100) / 100);
        console.error('📊 SalesReportService: Status HTTP:', error.status || 'Desconocido');
        console.error('📋 SalesReportService: Mensaje de error:', error.message || 'Sin mensaje');
        console.error('🔍 SalesReportService: Error completo:', error);
        console.error('❌ SalesReportService: ===== CONSULTA FALLIDA =====');
        return throwError(() => error);
      })
    );
  }

  getVendors(): Observable<{ value: string; labelKey: string }[]> {
    const url = `${this.api}reports/vendors`;
    const startTime = performance.now();

    console.log('🔍 SalesReportService: Solicitando vendors');
    console.log('🌐 SalesReportService: URL completa:', url);

    return this.http.get<{ data: Array<{ id: number; name: string; active: boolean; email: string; region: string }>; success: boolean }>(url).pipe(
      tap((response) => {
        const endTime = performance.now();
        console.log('✅ SalesReportService: Vendors recibidos en', Math.round((endTime - startTime) * 100) / 100, 'ms');
        console.log('📋 SalesReportService: Respuesta completa:', JSON.stringify(response, null, 2));
      }),
      map((response) => {
        if (!response?.data || !Array.isArray(response.data)) {
          console.error('❌ SalesReportService: Respuesta de vendors no tiene data o no es un arreglo:', response);
          return [] as { value: string; labelKey: string }[];
        }
        const vendors = response.data
          .filter(v => v.active !== false) // Filtrar solo vendors activos
          .map((v) => ({
            value: String(v.id),
            labelKey: v.name
          }));
        console.log('🔄 SalesReportService: Vendors mapeados:', vendors);
        return vendors;
      }),
      catchError((error) => {
        console.error('❌ SalesReportService: Error obteniendo vendors:', error);
        return throwError(() => error);
      })
    );
  }
}
