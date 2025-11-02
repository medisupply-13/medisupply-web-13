import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  total_goal: number;    // suma de metas (unidades)
  products: { product_id: number; individual_goal: number; }[];
}

export interface CreateSalesPlanResponse {
  success: boolean;
  id?: string | number;
  message?: string;
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
}


