import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
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
    const isApiGateway = this.baseUrl.includes('execute-api');
    
    // Para API Gateway, construir la URL manualmente para asegurar que los parámetros se envíen correctamente
    // Esto es necesario porque algunos API Gateways tienen problemas con HttpParams
    let url: string;
    let httpParams = new HttpParams();
    
    if (isApiGateway) {
      // Para API Gateway, construir la URL manualmente con los query parameters
      const params: string[] = [];
      if (includeZero) {
        params.push('include_zero=true');
        httpParams = httpParams.set('include_zero', 'true');
      }
      if (includeLocations) {
        params.push('include_locations=true');
        httpParams = httpParams.set('include_locations', 'true');
      }
      
      const queryString = params.length > 0 ? `?${params.join('&')}` : '';
      url = `${this.baseUrl}products/by-warehouse/${warehouseId}${queryString}`;
    } else {
      // Para ELB, usar HttpParams normalmente
      if (includeZero) {
        httpParams = httpParams.set('include_zero', 'true');
      }
      if (includeLocations) {
        httpParams = httpParams.set('include_locations', 'true');
      }
      url = `${this.baseUrl}products/by-warehouse/${warehouseId}`;
    }
    
    console.log('📡 LocationService: ===== INICIANDO CONSULTA DE UBICACIÓN =====');
    console.log('🌐 LocationService: URL base del backend:', this.baseUrl);
    console.log('🔗 LocationService: URL final construida:', url);
    console.log('📋 LocationService: HttpParams:', httpParams.toString());
    console.log('⏱️ LocationService: Timestamp inicio:', new Date().toISOString());
    console.log('🕐 LocationService: Tiempo de inicio (ms):', startTime);
    console.log('🏢 LocationService: Bodega ID:', warehouseId);
    console.log('📋 LocationService: Parámetros solicitados:', { includeZero, includeLocations });
    console.log('🔍 LocationService: Tipo de backend:', isApiGateway ? 'API Gateway' : this.baseUrl.includes('elb') ? 'ELB' : 'Desconocido');
    console.log('🔍 LocationService: Método de construcción:', isApiGateway ? 'URL manual' : 'HttpParams');
    
    // Verificar que los parámetros están correctos
    const urlHasIncludeLocations = url.includes('include_locations=true');
    const urlHasIncludeZero = url.includes('include_zero=true');
    console.log('✅ LocationService: Verificación de parámetros en URL:');
    console.log('  - include_locations en URL:', urlHasIncludeLocations);
    console.log('  - include_zero en URL:', urlHasIncludeZero);
    
    if (!urlHasIncludeLocations && includeLocations) {
      console.error('❌ LocationService: ERROR CRÍTICO - include_locations=true NO está en la URL aunque se solicitó!');
      console.error('❌ LocationService: Esto causará que el backend no devuelva ubicaciones');
    }
    
    // Agregar headers explícitos para API Gateway
    const headers: { [key: string]: string } = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    
    // Para API Gateway, no usar HttpParams en las opciones si ya construimos la URL manualmente
    // Para ELB, usar HttpParams normalmente
    const httpOptions: any = { 
      headers,
      responseType: 'json' as const,
      observe: 'response' as const
    };
    
    if (!isApiGateway) {
      // Solo usar HttpParams para ELB
      httpOptions.params = httpParams;
    }
    
    return this.http.get<any>(url, httpOptions).pipe(
      tap((response) => {
        const resBody: any = (response as any)?.body ?? response;
        const endTime = performance.now();
        const duration = endTime - startTime;
        const durationSeconds = duration / 1000;
        
        console.log('✅ LocationService: ===== RESPUESTA RECIBIDA =====');
        console.log('⏱️ LocationService: Timestamp fin:', new Date().toISOString());
        console.log('🕐 LocationService: Tiempo de fin (ms):', endTime);
        console.log('⏰ LocationService: Duración total (ms):', Math.round(duration * 100) / 100);
        console.log('⏰ LocationService: Duración total (segundos):', Math.round(durationSeconds * 100) / 100);
        console.log('📊 LocationService: Status HTTP: 200 OK');
        console.log('📦 LocationService: Productos recibidos:', resBody?.products?.length || 0);
        
        // Verificar el tipo de respuesta
        console.log('🔍 LocationService: Tipo de respuesta:', typeof resBody);
        console.log('🔍 LocationService: Es array?:', Array.isArray(resBody));
        console.log('🔍 LocationService: Keys de respuesta:', resBody ? Object.keys(resBody) : 'null');
        
        // Intentar parsear la respuesta si viene como string (problema común con API Gateway)
        let parsedResponse: WarehouseProductsResponse = resBody as WarehouseProductsResponse;
        if (typeof resBody === 'string') {
          try {
            console.log('⚠️ LocationService: Respuesta es string, parseando JSON...');
            parsedResponse = JSON.parse(resBody);
            console.log('✅ LocationService: JSON parseado exitosamente');
          } catch (e) {
            console.error('❌ LocationService: Error al parsear JSON:', e);
          }
        }
        
        // Verificar si la respuesta está envuelta en otro objeto (común en API Gateway)
        if (parsedResponse && !parsedResponse.products && (parsedResponse as any).body) {
          console.log('⚠️ LocationService: Respuesta envuelta en body, extrayendo...');
          parsedResponse = (parsedResponse as any).body;
        }
        
        // Verificar si la respuesta está en otro formato
        if (parsedResponse && !parsedResponse.products && (parsedResponse as any).data) {
          console.log('⚠️ LocationService: Respuesta en data, extrayendo...');
          parsedResponse = (parsedResponse as any).data;
        }
        
        // Log completo de la estructura
        console.log('🔍 LocationService: Estructura de respuesta completa (primeros 3000 chars):', JSON.stringify(parsedResponse, null, 2).substring(0, 3000));
        console.log('🔍 LocationService: Estructura resumida:', {
          tieneProducts: !!parsedResponse?.products,
          tieneSuccess: 'success' in (parsedResponse || {}),
          tieneWarehouseId: 'warehouse_id' in (parsedResponse || {}),
          tipoProducts: Array.isArray(parsedResponse?.products) ? 'array' : typeof parsedResponse?.products,
          keysRespuesta: parsedResponse ? Object.keys(parsedResponse) : [],
          cantidadProducts: parsedResponse?.products?.length || 0
        });
        
        // Log CRÍTICO: Mostrar respuesta RAW del backend sin procesar
        console.log('🚨 LocationService: ===== RESPUESTA RAW DEL BACKEND (SIN PROCESAR) =====');
        console.log('🚨 LocationService: Respuesta completa:', JSON.stringify(resBody, null, 2));
        if (parsedResponse?.products && parsedResponse.products.length > 0) {
          console.log('🚨 LocationService: PRIMER PRODUCTO RAW (completo):', JSON.stringify(parsedResponse.products[0], null, 2));
          console.log('🚨 LocationService: ¿Tiene campo locations?:', 'locations' in parsedResponse.products[0]);
          console.log('🚨 LocationService: Valor de locations:', (parsedResponse.products[0] as any).locations);
          console.log('🚨 LocationService: Tipo de locations:', typeof (parsedResponse.products[0] as any).locations);
          console.log('🚨 LocationService: Es array?:', Array.isArray((parsedResponse.products[0] as any).locations));
          console.log('🚨 LocationService: Todas las keys del primer producto:', Object.keys(parsedResponse.products[0]));
        }
        console.log('🚨 LocationService: ===== FIN RESPUESTA RAW =====');
        
        // Log detallado de productos sin ubicaciones
        if (parsedResponse?.products && parsedResponse.products.length > 0) {
          const productsWithoutLocations = parsedResponse.products.filter(p => !p.locations || (Array.isArray(p.locations) && p.locations.length === 0));
          const productsWithLocations = parsedResponse.products.filter(p => p.locations && Array.isArray(p.locations) && p.locations.length > 0);
          
          console.log('📊 LocationService: Resumen de productos:');
          console.log('  - Total productos:', parsedResponse.products.length);
          console.log('  - Con ubicaciones:', productsWithLocations.length);
          console.log('  - Sin ubicaciones:', productsWithoutLocations.length);
          
          if (productsWithoutLocations.length > 0) {
            const firstProduct = productsWithoutLocations[0] as any;
            console.log('⚠️ LocationService: PRIMER PRODUCTO SIN UBICACIONES (completo):', JSON.stringify(firstProduct, null, 2));
            console.log('⚠️ LocationService: Análisis del primer producto:', {
              id: firstProduct.product_id,
              sku: firstProduct.sku,
              name: firstProduct.name,
              tieneLocationsField: 'locations' in firstProduct,
              locationsValue: firstProduct.locations,
              locationsType: typeof firstProduct.locations,
              locationsIsArray: Array.isArray(firstProduct.locations),
              locationsLength: Array.isArray(firstProduct.locations) ? firstProduct.locations.length : 'N/A',
              allKeys: Object.keys(firstProduct),
              valoresCampos: Object.keys(firstProduct).reduce((acc: any, key) => {
                const value = firstProduct[key];
                acc[key] = {
                  type: typeof value,
                  isArray: Array.isArray(value),
                  isNull: value === null,
                  isUndefined: value === undefined,
                  value: value
                };
                return acc;
              }, {})
            });
            
            // Buscar campos que puedan contener ubicaciones con nombres alternativos
            const possibleLocationKeys = Object.keys(firstProduct).filter(key => 
              key.toLowerCase().includes('location') || 
              key.toLowerCase().includes('ubicacion') ||
              Array.isArray(firstProduct[key])
            );
            if (possibleLocationKeys.length > 0) {
              console.log('🔍 LocationService: Campos que podrían contener ubicaciones:', possibleLocationKeys);
              possibleLocationKeys.forEach(key => {
                console.log(`  - ${key}:`, firstProduct[key]);
              });
            }
          }
          
          if (productsWithLocations.length > 0) {
            const productWithLocations = productsWithLocations[0];
            console.log('📍 LocationService: Ejemplo de producto CON ubicaciones:', {
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
        } else {
          console.error('❌ LocationService: No se encontraron productos en la respuesta o la estructura es incorrecta');
          console.error('❌ LocationService: Respuesta completa:', parsedResponse);
        }
        
        console.log('🎯 LocationService: ASR - Objetivo: < 2 segundos');
        if (durationSeconds < 2) {
          console.log('✅ LocationService: ASR CUMPLIDO - Respuesta en', Math.round(durationSeconds * 100) / 100, 'segundos (< 2s)');
        } else {
          console.warn('⚠️ LocationService: ASR NO CUMPLIDO - Respuesta en', Math.round(durationSeconds * 100) / 100, 'segundos (>= 2s)');
        }
        
        console.log('✅ LocationService: ===== CONSULTA COMPLETADA =====');
      }),
      // Mapear la respuesta para asegurar que siempre tenga la estructura correcta
      map((resp: any): WarehouseProductsResponse => {
        let response: any = (resp?.body ?? resp);
        console.log('🔄 LocationService: Iniciando mapeo de respuesta...');
        console.log('🔄 LocationService: Tipo de respuesta en map:', typeof response);
        console.log('🔄 LocationService: Respuesta es array?:', Array.isArray(response));
        
        // Si la respuesta es un string, parsearla
        if (typeof response === 'string') {
          try {
            console.log('⚠️ LocationService: Respuesta es string en map, parseando...');
            response = JSON.parse(response);
            console.log('✅ LocationService: Parseado exitoso en map');
          } catch (e) {
            console.error('❌ LocationService: Error al parsear respuesta como JSON en map:', e);
            throw new Error('Respuesta inválida del servidor');
          }
        }
        
        // Si la respuesta está envuelta en body o data, extraerla
        if (response && !response.products) {
          console.log('⚠️ LocationService: Respuesta no tiene products directamente, buscando en body/data...');
          console.log('⚠️ LocationService: Keys de respuesta:', Object.keys(response));
          if (response.body) {
            console.log('✅ LocationService: Encontrado en body, extrayendo...');
            response = response.body;
          } else if (response.data) {
            console.log('✅ LocationService: Encontrado en data, extrayendo...');
            response = response.data;
          } else if (response.Items) {
            // Posible formato de API Gateway Lambda
            console.log('✅ LocationService: Encontrado en Items (formato Lambda), extrayendo...');
            response = { products: response.Items };
          }
        }
        
        // Asegurar que la respuesta tenga la estructura correcta
        if (!response || !response.products) {
          console.error('❌ LocationService: Respuesta no tiene la estructura esperada después del mapeo');
          console.error('❌ LocationService: Respuesta completa:', JSON.stringify(response, null, 2).substring(0, 1000));
          console.error('❌ LocationService: Tipo de respuesta:', typeof response);
          console.error('❌ LocationService: Es array?:', Array.isArray(response));
          if (response) {
            console.error('❌ LocationService: Keys disponibles:', Object.keys(response));
          }
          
          // Si es API Gateway y no tiene productos, podría ser un problema de configuración
          if (isApiGateway) {
            console.error('⚠️ LocationService: ADVERTENCIA - Usando API Gateway pero la respuesta no tiene la estructura esperada');
            console.error('⚠️ LocationService: Esto sugiere que el API Gateway no está pasando correctamente los parámetros al backend');
            console.error('⚠️ LocationService: Verificar la configuración del API Gateway (query parameters, integration request, etc.)');
          }
          
          return {
            success: false,
            warehouse_id: warehouseId,
            products: []
          };
        }
        
        // Verificar si los productos tienen ubicaciones
        const productsWithLocations = response.products.filter((p: any) => p.locations && Array.isArray(p.locations) && p.locations.length > 0);
        console.log('📊 LocationService: Después del mapeo - Productos con ubicaciones:', productsWithLocations.length, 'de', response.products.length);
        
        if (isApiGateway && productsWithLocations.length === 0 && response.products.length > 0) {
          console.error('❌ LocationService: ERROR CRÍTICO - API Gateway devolvió productos pero SIN ubicaciones');
          console.error('❌ LocationService: URL que se envió:', url);
          console.error('❌ LocationService: Parámetro include_locations en URL:', url.includes('include_locations=true'));
          console.error('❌ LocationService: Esto indica que el parámetro include_locations=true NO está siendo procesado correctamente por el backend');
          console.error('❌ LocationService: Verificar en la pestaña Network del navegador:');
          console.error('  1. ¿La URL incluye include_locations=true?');
          console.error('  2. ¿La respuesta del API Gateway tiene las ubicaciones?');
          console.error('  3. ¿Hay algún error en la consola del navegador?');
          console.error('❌ LocationService: PROBLEMA EN EL BACKEND - El backend NO está devolviendo ubicaciones aunque se solicitó');
          
          // Mostrar el primer producto para debugging
          if (response.products.length > 0) {
            const firstProd = response.products[0] as any;
            console.error('❌ LocationService: Primer producto recibido (completo):', JSON.stringify(firstProd, null, 2));
            console.error('❌ LocationService: Primer producto resumido:', {
              id: firstProd.product_id,
              sku: firstProd.sku,
              tieneLocations: 'locations' in firstProd,
              locations: firstProd.locations,
              locationsType: typeof firstProd.locations,
              allKeys: Object.keys(firstProd),
              valoresTodosLosCampos: Object.keys(firstProd).reduce((acc: any, key) => {
                acc[key] = {
                  type: typeof firstProd[key],
                  value: firstProd[key],
                  isArray: Array.isArray(firstProd[key])
                };
                return acc;
              }, {})
            });
          }
        }
        
        return response as WarehouseProductsResponse;
      }),
      catchError((error) => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.error('❌ LocationService: ===== ERROR EN CONSULTA =====');
        console.error('⏱️ LocationService: Timestamp fin (error):', new Date().toISOString());
        console.error('⏰ LocationService: Duración antes del error (ms):', Math.round(duration * 100) / 100);
        console.error('🌐 LocationService: URL que falló:', url);
        console.error('🔍 LocationService: Tipo de backend:', this.baseUrl.includes('execute-api') ? 'API Gateway' : this.baseUrl.includes('elb') ? 'ELB' : 'Desconocido');
        console.error('🚨 LocationService: Error completo:', error);
        console.error('📊 LocationService: Status del error:', error?.status || 'N/A');
        console.error('📄 LocationService: Mensaje del error:', error?.message || 'N/A');
        console.error('📋 LocationService: Error text:', error?.error || 'N/A');
        
        if (error?.error) {
          try {
            console.error('📄 LocationService: Error parseado:', JSON.stringify(error.error, null, 2));
          } catch (e) {
            console.error('📄 LocationService: Error como texto:', error.error);
          }
        }
        
        console.error('❌ LocationService: ===== CONSULTA FALLIDA =====');
        throw error;
      })
    );
  }
}
