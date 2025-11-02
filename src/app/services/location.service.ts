import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface City {
  city_id: number;
  name: string;
  country: string;
  country_name: string;
}

export interface Warehouse {
  warehouse_id: number;
  name: string;
  description: string;
  city_name?: string;
  country?: string;
}

export interface ProductLocation {
  section: string;
  aisle: string;
  shelf: string;
  level: string;
  lot: string;
  expires: string;
  available: number;
  reserved: number;
}

export interface Product {
  product_id: number;
  name: string;
  sku: string;
  image_url?: string | null;
  total_quantity?: number;
  quantity?: number;
  totalAvailable?: number;
  hasAvailability?: boolean;
  warehouse?: number;
  city?: number;
  locations?: ProductLocation[];
  category_name?: string;
  value?: number;
  city_name?: string;
  country?: string;
  lote?: string;
  status?: string;
  warehouse_name?: string;
}

export interface LocationResponse {
  cities: City[];
  products: Product[];
  warehouses: Warehouse[];
  summary: {
    countries: string[];
    total_cities: number;
    total_products: number;
    total_warehouses: number;
  };
}

export interface CitiesResponse {
  cities: City[];
  success: boolean;
}

export interface WarehousesResponse {
  city_id?: number;
  success: boolean;
  warehouses: Warehouse[];
}

export interface WarehouseProductsResponse {
  products: Product[];
  success: boolean;
  warehouse_id: number;
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private baseUrl = environment.baseUrl || 'http://localhost:8081';

  constructor(private http: HttpClient) { }

  // Obtener todas las ciudades
  getCities(): Observable<CitiesResponse> {
    return this.http.get<CitiesResponse>(`${this.baseUrl}products/cities`);
  }

  // Obtener bodegas por ciudad
  getWarehouses(cityId?: number): Observable<WarehousesResponse> {
    const url = cityId 
      ? `${this.baseUrl}products/warehouses/by-city/${cityId}`
      : `${this.baseUrl}products/warehouses`;
    return this.http.get<WarehousesResponse>(url);
  }

  // Obtener todos los productos con ubicaciones
  getProductsLocation(): Observable<LocationResponse> {
    return this.http.get<LocationResponse>(`${this.baseUrl}products/location`);
  }

  // Obtener productos por bodega
  // includeZero: si es true, incluye productos con stock = 0
  // includeLocations: si es true, incluye datos de ubicación física (sección, pasillo, mueble, nivel, lotes)
  getProductsByWarehouse(warehouseId: number, includeZero: boolean = false, includeLocations: boolean = true): Observable<WarehouseProductsResponse> {
    const startTime = performance.now();
    const params = new URLSearchParams();
    if (includeZero) {
      params.append('include_zero', 'true');
    }
    if (includeLocations) {
      params.append('include_locations', 'true');
    }
    const queryString = params.toString();
    const url = queryString 
      ? `${this.baseUrl}products/by-warehouse/${warehouseId}?${queryString}`
      : `${this.baseUrl}products/by-warehouse/${warehouseId}`;
    
    console.log('📡 LocationService: ===== INICIANDO CONSULTA DE UBICACIÓN =====');
    console.log('⏱️ LocationService: Timestamp inicio:', new Date().toISOString());
    console.log('🕐 LocationService: Tiempo de inicio (ms):', startTime);
    console.log('🏢 LocationService: Bodega ID:', warehouseId);
    console.log('📋 LocationService: Parámetros:', { includeZero, includeLocations });
    
    return this.http.get<WarehouseProductsResponse>(url).pipe(
      tap((response) => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        const durationSeconds = duration / 1000;
        
        console.log('✅ LocationService: ===== RESPUESTA RECIBIDA =====');
        console.log('⏱️ LocationService: Timestamp fin:', new Date().toISOString());
        console.log('🕐 LocationService: Tiempo de fin (ms):', endTime);
        console.log('⏰ LocationService: Duración total (ms):', Math.round(duration * 100) / 100);
        console.log('⏰ LocationService: Duración total (segundos):', Math.round(durationSeconds * 100) / 100);
        console.log('📊 LocationService: Status HTTP: 200 OK');
        console.log('📦 LocationService: Productos recibidos:', response?.products?.length || 0);
        console.log('🎯 LocationService: ASR - Objetivo: < 2 segundos');
        
        if (durationSeconds < 2) {
          console.log('✅ LocationService: ASR CUMPLIDO - Respuesta en', Math.round(durationSeconds * 100) / 100, 'segundos (< 2s)');
        } else {
          console.warn('⚠️ LocationService: ASR NO CUMPLIDO - Respuesta en', Math.round(durationSeconds * 100) / 100, 'segundos (>= 2s)');
        }
        
        // Log detallado de ubicaciones si están disponibles
        if (response?.products && response.products.length > 0) {
          const productWithLocations = response.products.find(p => p.locations && p.locations.length > 0);
          if (productWithLocations) {
            console.log('📍 LocationService: Ejemplo de ubicación recibida:', {
              sku: productWithLocations.sku,
              nombre: productWithLocations.name,
              ubicaciones: productWithLocations.locations?.length || 0,
              primeraUbicacion: productWithLocations.locations?.[0] ? {
                seccion: productWithLocations.locations[0].section,
                pasillo: productWithLocations.locations[0].aisle,
                mueble: productWithLocations.locations[0].shelf,
                nivel: productWithLocations.locations[0].level,
                lote: productWithLocations.locations[0].lot,
                vencimiento: productWithLocations.locations[0].expires,
                cantidad: productWithLocations.locations[0].available
              } : null
            });
          }
        }
        
        console.log('✅ LocationService: ===== CONSULTA COMPLETADA =====');
      }),
      catchError((error) => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.error('❌ LocationService: ===== ERROR EN CONSULTA =====');
        console.error('⏱️ LocationService: Timestamp fin (error):', new Date().toISOString());
        console.error('⏰ LocationService: Duración antes del error (ms):', Math.round(duration * 100) / 100);
        console.error('🚨 LocationService: Error:', error);
        console.error('❌ LocationService: ===== CONSULTA FALLIDA =====');
        throw error;
      })
    );
  }
}
