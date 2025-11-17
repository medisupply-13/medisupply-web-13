import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface SalesPlanProductPayload {
  id: string;
  name: string;
  goal: number; // units
}

export interface CreateSalesPlanPayload {
  region: string;        // 'Norte', 'Centro', ...
  quarter: string;       // 'Q1'..'Q4'
  year: number;          // año actual
  total_goal: number;    // valor monetario de la meta total
  products: { product_id: number; individual_goal: number; }[]; // individual_goal en valor monetario (unidades × precio)
}

export interface CreateSalesPlanResponse {
  success: boolean;
  id?: string | number;
  message?: string;
}

export interface ValidateStockResponse {
  valid: boolean;
  message?: string;
  available_stock?: number;
}

@Injectable({ providedIn: 'root' })
export class OfferService {
  private readonly offerApi = environment.offerUrl;

  constructor(private http: HttpClient) {}

  getRegions() : Observable<{ value: string; label: string }[]> {
    const url = `${this.offerApi}offers/regions`;
    console.log('🌍 OfferService: GET regiones →', url);
    return this.http.get<any>(url).pipe(
      map(resp => Array.isArray(resp) ? resp : []),
      tap(resp => console.log('✅ OfferService: Regiones:', resp)),
      catchError(err => {
        console.error('❌ OfferService: Error obteniendo regiones:', err);
        return throwError(() => err);
      })
    );
  }

  getQuarters() : Observable<{ value: string; label: string }[]> {
    const url = `${this.offerApi}offers/quarters`;
    console.log('🗓️ OfferService: GET períodos →', url);
    return this.http.get<any>(url).pipe(
      map(resp => Array.isArray(resp) ? resp : []),
      tap(resp => console.log('✅ OfferService: Períodos:', resp)),
      catchError(err => {
        console.error('❌ OfferService: Error obteniendo períodos:', err);
        return throwError(() => err);
      })
    );
  }

  createSalesPlan(payload: CreateSalesPlanPayload): Observable<CreateSalesPlanResponse> {
    const url = `${this.offerApi}offers/plans`;
    const jsonPayload = JSON.stringify(payload);
    console.log('📝 OfferService: POST crear plan de ventas →', url, payload);
    console.log('=== CURL EXACTO ===');
    console.log(`curl -X POST -H 'Content-Type: application/json' -d '${jsonPayload}' ${url}`);
    return this.http.post<CreateSalesPlanResponse>(url, payload).pipe(
      tap(resp => console.log('✅ OfferService: Respuesta creación plan:', resp)),
      catchError(err => {
        console.error('❌ OfferService: Error al crear plan:', err);
        return throwError(() => err);
      })
    );
  }

  getOfferProducts(): Observable<any[]> {
    const url = `${this.offerApi}offers/products`;
    console.log('🛒 OfferService: GET productos →', url);
    return this.http.get<any[]>(url).pipe(
      tap(resp => console.log('✅ OfferService: Productos:', Array.isArray(resp) ? resp.length : resp)),
      catchError(err => {
        console.error('❌ OfferService: Error obteniendo productos:', err);
        return throwError(() => err);
      })
    );
  }

  validateStock(productId: number, individualGoal: number): Observable<ValidateStockResponse> {
    const url = `${this.offerApi}products/${productId}/validate-stock`;
    const params = new HttpParams().set('individual_goal', individualGoal.toString());
    
    // Logs detallados con parámetros
    console.log('📦 OfferService: ===== VALIDACIÓN DE STOCK =====');
    console.log('📦 OfferService: Parámetros recibidos:', {
      productId,
      individualGoal,
      productIdType: typeof productId,
      individualGoalType: typeof individualGoal
    });
    console.log('📦 OfferService: URL base (offerApi):', this.offerApi);
    console.log('📦 OfferService: URL completa:', url);
    console.log('📦 OfferService: Parámetros HTTP:', params.toString());
    console.log('📦 OfferService: Parámetros individuales:', {
      'individual_goal': individualGoal.toString()
    });
    
    // CURL exacto
    const curlCommand = `curl -v "${url}?individual_goal=${individualGoal}"`;
    console.log('=== CURL EXACTO ===');
    console.log(curlCommand);
    console.log('📦 OfferService: ====================================');
    
    return this.http.get<ValidateStockResponse>(url, { params }).pipe(
      tap(resp => {
        console.log('✅ OfferService: ===== RESPUESTA VALIDACIÓN STOCK =====');
        console.log('✅ OfferService: Respuesta completa:', resp);
        console.log('✅ OfferService: Tipo de respuesta:', typeof resp);
        console.log('✅ OfferService: Es válido:', resp.valid);
        console.log('✅ OfferService: Mensaje:', resp.message);
        console.log('✅ OfferService: Stock disponible:', resp.available_stock);
        console.log('✅ OfferService: =====================================');
      }),
      catchError(err => {
        console.error('❌ OfferService: ===== ERROR VALIDACIÓN STOCK =====');
        console.error('❌ OfferService: Error completo:', err);
        console.error('❌ OfferService: Status:', err.status);
        console.error('❌ OfferService: Status Text:', err.statusText);
        console.error('❌ OfferService: Error body:', err.error);
        console.error('❌ OfferService: URL llamada:', url);
        console.error('❌ OfferService: Parámetros enviados:', params.toString());
        console.error('❌ OfferService: ===================================');
        
        // Si el endpoint devuelve un error, tratarlo como stock insuficiente
        const errorResponse = err.error || {};
        const errorObj = {
          valid: false,
          message: errorResponse.message || 'No hay suficiente stock disponible',
          available_stock: errorResponse.available_stock,
          ...errorResponse
        };
        console.error('❌ OfferService: Error objeto creado:', errorObj);
        return throwError(() => errorObj);
      })
    );
  }
}


