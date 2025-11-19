import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

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

export interface SalesComplianceRequest {
  vendor_id: number;
  region: string;
  quarter: string;
  year: number;
}

export interface SalesComplianceResponse {
  data: {
    cumplimiento_total_pct: number;
    cumplimiento_region_pct?: number;
    detalle_productos: Array<{
      cumplimiento_pct: number;
      goal: number;
      goal_vendor?: number;
      product_id: number;
      status: string;
      ventas: number;
    }>;
    num_plans_active?: number;
    num_sellers_region?: number;
    pedidos: number;
    period_end: string;
    period_start: string;
    region?: string;
    status: string;
    status_region?: string;
    total_goal: number;
    total_goal_vendor?: number;
    vendor_id: number;
    ventasTotales: number;
    ventas_region?: number;
  };
  success: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SalesReportService {
  private api = environment.baseUrl;
  private offerApi = environment.offerUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    console.log('🏗️ SalesReportService: Servicio instanciado');
    console.log('🌐 SalesReportService: URL base configurada:', this.api);
  }

  getSalesReport(request: SalesReportRequest): Observable<SalesReportResponse> {
    const url = `${this.api}reports/sales-report`;
    const startTime = performance.now();
    const token = this.authService.getToken();
    const jsonPayload = JSON.stringify(request);
    
    console.log('🔍 SalesReportService: ===== INICIANDO CONSULTA AL BACKEND =====');
    console.log('🌐 SalesReportService: URL completa:', url);
    console.log('📊 SalesReportService: Método HTTP: POST');
    console.log('📋 SalesReportService: Headers: Content-Type: application/json');
    console.log('📦 SalesReportService: Payload completo:', jsonPayload);
    console.log('🔑 SalesReportService: Token presente:', !!token);
    console.log('⏱️ SalesReportService: Timestamp inicio:', new Date().toISOString());
    console.log('🕐 SalesReportService: Tiempo de inicio (ms):', startTime);
    
    // Generar curl exacto para debugging
    const curlCommand = `curl -X POST "${url}" \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer ${token || 'TOKEN_MISSING'}" \\\n  -d '${jsonPayload}'`;
    console.log('=== CURL EXACTO ===');
    console.log(curlCommand);
    console.log('==================');
    
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
        const userRole = this.authService.getRole();
        const currentUser = this.authService.getCurrentUser();
        
        console.error('❌ SalesReportService: ===== ERROR EN CONSULTA =====');
        console.error('⏱️ SalesReportService: Timestamp error:', new Date().toISOString());
        console.error('🕐 SalesReportService: Tiempo de error (ms):', endTime);
        console.error('⏰ SalesReportService: Duración hasta error (ms):', Math.round(duration * 100) / 100);
        console.error('📊 SalesReportService: Status HTTP:', error.status || 'Desconocido');
        console.error('📋 SalesReportService: Mensaje de error:', error.message || 'Sin mensaje');
        console.error('👤 SalesReportService: Rol del usuario:', userRole);
        console.error('👤 SalesReportService: Usuario actual:', currentUser);
        
        // Manejo específico para error 403 (Forbidden)
        if (error.status === 403) {
          console.error('🚫 SalesReportService: ===== ERROR 403 - ACCESO DENEGADO =====');
          console.error('🚫 SalesReportService: El API Gateway o la Lambda autorizadora ha rechazado la petición');
          console.error('🚫 SalesReportService: Posibles causas:');
          console.error('  1. El rol del usuario (' + userRole + ') no tiene permisos para este endpoint');
          console.error('  2. La Lambda autorizadora no está configurada para permitir el rol ' + userRole);
          console.error('  3. El token no contiene los claims correctos para el rol ' + userRole);
          console.error('  4. El endpoint /reports/sales-report no está configurado para permitir vendedores (SUPERVISOR/SELLER)');
          console.error('🚫 SalesReportService: SOLUCIÓN: Verificar la configuración del API Gateway y la Lambda autorizadora');
          console.error('🚫 SalesReportService: Asegurarse de que el rol ' + userRole + ' tenga permisos para /reports/sales-report');
        }
        
        // Intentar extraer el mensaje del body del error si está disponible
        if (error.error) {
          console.error('📋 SalesReportService: Error body:', JSON.stringify(error.error, null, 2));
          if (error.error.message) {
            console.error('📋 SalesReportService: Mensaje del backend:', error.error.message);
          }
          if (error.error.error) {
            console.error('📋 SalesReportService: Error del backend:', error.error.error);
          }
          // Mensajes específicos de API Gateway
          if (error.error.Message) {
            console.error('📋 SalesReportService: Mensaje del API Gateway:', error.error.Message);
          }
        }
        
        console.error('🔍 SalesReportService: Error completo:', error);
        console.error('🔍 SalesReportService: Headers de respuesta:', error.headers);
        console.error('❌ SalesReportService: ===== CONSULTA FALLIDA =====');
        return throwError(() => error);
      })
    );
  }

  getVendors(): Observable<{ value: string; labelKey: string }[]> {
    const url = `${this.api}users/sellers`;
    const startTime = performance.now();

    console.log('🔍 SalesReportService: Solicitando vendedores (users/sellers)');
    console.log('🌐 SalesReportService: URL completa:', url);

    return this.http.get<{ data: Array<{ id: number; name: string; active: boolean; email: string; region: string; user_id?: number }>; success: boolean }>(url).pipe(
      tap((response) => {
        const endTime = performance.now();
        console.log('✅ SalesReportService: Vendedores recibidos en', Math.round((endTime - startTime) * 100) / 100, 'ms');
        console.log('📋 SalesReportService: Respuesta completa:', JSON.stringify(response, null, 2));
      }),
      map((response) => {
        if (!response?.data || !Array.isArray(response.data)) {
          console.error('❌ SalesReportService: Respuesta de vendedores no tiene data o no es un arreglo:', response);
          return [] as { value: string; labelKey: string }[];
        }
        const allVendors = response.data
          .filter(v => v.active !== false) // Filtrar solo vendors activos
          .map((v) => ({
            value: String(v.id),
            labelKey: v.name,
            email: v.email?.toLowerCase() || '',
            userId: v.user_id ? String(v.user_id) : null
          }));

        const role = this.authService.getRole();
        const currentUser = this.authService.getCurrentUser();

        if (role === 'SUPERVISOR' && currentUser) {
          const currentEmail = currentUser.email?.toLowerCase();
          const currentUserId = currentUser.user_id ? String(currentUser.user_id) : null;

          let ownVendor = null;
          if (currentUserId) {
            ownVendor = allVendors.find(v => v.userId === currentUserId);
          }
          if (!ownVendor && currentEmail) {
            ownVendor = allVendors.find(v => v.email === currentEmail);
          }

          if (ownVendor) {
            // Para vendedores, incluir también el user_id en el resultado
            const result = [{ 
              value: ownVendor.value, 
              labelKey: ownVendor.labelKey,
              userId: ownVendor.userId 
            }];
            console.log('🔐 SalesReportService: Rol SUPERVISOR, restringiendo vendors:', result);
            return result;
          }

          console.warn('⚠️ SalesReportService: No se encontró vendor para el usuario actual, retornando lista vacía');
          return [];
        }

        const vendors = allVendors.map(({ value, labelKey, userId }) => ({ value, labelKey, userId }));
        console.log('🔄 SalesReportService: Vendedores mapeados:', vendors);
        return vendors;
      }),
      catchError((error) => {
        console.error('❌ SalesReportService: Error obteniendo vendedores:', error);
        return throwError(() => error);
      })
    );
  }

  getSalesCompliance(request: SalesComplianceRequest): Observable<SalesComplianceResponse> {
    const url = `${this.api}reports/sales-compliance`;
    const startTime = performance.now();

    console.log('🔍 SalesReportService: ===== INICIANDO CONSULTA DE CUMPLIMIENTO =====');
    console.log('🌐 SalesReportService: URL completa:', url);
    console.log('📊 SalesReportService: Método HTTP: POST');
    console.log('📦 SalesReportService: Payload completo:', JSON.stringify(request, null, 2));
    console.log('⏱️ SalesReportService: Timestamp inicio:', new Date().toISOString());

    return this.http.post<any>(url, request).pipe(
      map((response) => {
        // Verificar si la respuesta tiene success: false (error del backend con HTTP 200)
        if (response && response.success === false) {
          console.error('❌ SalesReportService: ===== RESPUESTA CON ERROR DEL BACKEND =====');
          console.error('📋 SalesReportService: Response completa:', JSON.stringify(response, null, 2));
          console.error('📋 SalesReportService: Error type:', response.error_type || 'Desconocido');
          console.error('📋 SalesReportService: Mensaje:', response.message || 'Sin mensaje');
          
          // Crear un error similar a los errores HTTP para manejo consistente
          const error: any = new Error(response.message || 'Error en la respuesta del backend');
          error.status = response.status || 400;
          error.error = {
            message: response.message,
            error_type: response.error_type,
            success: false
          };
          throw error;
        }
        return response as SalesComplianceResponse;
      }),
      tap((response) => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.log('✅ SalesReportService: ===== RESPUESTA DE CUMPLIMIENTO RECIBIDA =====');
        console.log('⏱️ SalesReportService: Duración total (ms):', Math.round(duration * 100) / 100);
        console.log('📋 SalesReportService: Response completa:', JSON.stringify(response, null, 2));
        console.log('✅ SalesReportService: ===== CONSULTA COMPLETADA =====');
      }),
      catchError((error) => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.error('❌ SalesReportService: ===== ERROR EN CONSULTA DE CUMPLIMIENTO =====');
        console.error('⏱️ SalesReportService: Duración hasta error (ms):', Math.round(duration * 100) / 100);
        console.error('📊 SalesReportService: Status HTTP:', error.status || 'Desconocido');
        console.error('📋 SalesReportService: Mensaje de error:', error.message || 'Sin mensaje');
        console.error('🔍 SalesReportService: Error completo:', error);
        console.error('❌ SalesReportService: ===== CONSULTA FALLIDA =====');
        return throwError(() => error);
      })
    );
  }

  getSalesPlans(): Observable<{ value: string; labelKey: string }[]> {
    const url = `${this.offerApi}offers/plans`;
    const startTime = performance.now();

    console.log('🔍 SalesReportService: Solicitando planes');
    console.log('🌐 SalesReportService: URL completa:', url);

    return this.http.get<any>(url).pipe(
      tap(() => {
        const endTime = performance.now();
        console.log('✅ SalesReportService: Planes recibidos en', Math.round((endTime - startTime) * 100) / 100, 'ms');
      }),
      map((response) => {
        const list = Array.isArray(response) ? response : (response?.data ?? []);
        if (!Array.isArray(list)) {
          console.error('❌ SalesReportService: Respuesta de planes no es un arreglo:', response);
          return [] as { value: string; labelKey: string }[];
        }
        const plans = list.map((p: any) => ({
          value: String(p.plan_id ?? p.id ?? ''),
          labelKey: `Plan ${p.plan_id ?? p.id ?? ''} - ${p.region || ''} Q${p.quarter || ''} ${p.year || ''}`
        })).filter(opt => opt.value && opt.labelKey);
        console.log('🔄 SalesReportService: Planes mapeados:', plans);
        return plans;
      }),
      catchError((error) => {
        console.error('❌ SalesReportService: Error obteniendo planes:', error);
        return throwError(() => error);
      })
    );
  }
}
