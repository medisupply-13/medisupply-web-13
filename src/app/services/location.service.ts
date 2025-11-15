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
    
    // CRÍTICO: Para API Gateway, usar 'body' para que Angular parsee automáticamente el JSON
    // Para ELB, usar 'response' para tener más control
    const httpOptions: any = { 
      headers,
      responseType: 'json' as const
    };
    
    if (isApiGateway) {
      // Para API Gateway, usar 'body' para obtener directamente el objeto parseado
      // Esto evita problemas con la extracción del body de HttpResponse
      httpOptions.observe = 'body' as const;
      console.log('🔵 LocationService: API Gateway - Usando observe: body para parsing automático');
    } else {
      // Para ELB, usar 'response' y HttpParams normalmente
      httpOptions.observe = 'response' as const;
      httpOptions.params = httpParams;
      console.log('🟢 LocationService: ELB - Usando observe: response con HttpParams');
    }
    
    return this.http.get<any>(url, httpOptions).pipe(
      tap((response) => {
        // CRÍTICO: Con observe: 'body', Angular ya nos devuelve el objeto parseado directamente
        // Con observe: 'response', necesitamos extraer el body de HttpResponse
        let resBody: any;
        
        if (isApiGateway) {
          // Para API Gateway con observe: 'body', la respuesta ya es el objeto parseado
          resBody = response;
          console.log('🔵 LocationService: API Gateway con observe:body - Respuesta ya es el objeto parseado');
          console.log('🔵 LocationService: Tipo de response:', typeof resBody);
          console.log('🔵 LocationService: Es array?:', Array.isArray(resBody));
          console.log('🔵 LocationService: Keys de response:', resBody ? Object.keys(resBody) : 'null');
        } else {
          // Para ELB con observe: 'response', extraer el body
          resBody = (response as any)?.body ?? response;
          console.log('🟢 LocationService: ELB con observe:response - Extrayendo body de HttpResponse');
        }
        
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
        console.log('🔍 LocationService: Tipo de resBody:', typeof resBody);
        console.log('🔍 LocationService: resBody es array?:', Array.isArray(resBody));
        console.log('🔍 LocationService: Keys de resBody:', resBody ? Object.keys(resBody) : 'null');
        
        // LOG CRÍTICO: Para API Gateway, mostrar la respuesta RAW del primer producto
        if (isApiGateway && resBody?.products && resBody.products.length > 0) {
          console.log('🔵 LocationService: ===== RESPUESTA RAW DEL API GATEWAY (PRIMER PRODUCTO) =====');
          console.log('🔵 LocationService: Primer producto COMPLETO (RAW):', JSON.stringify(resBody.products[0], null, 2));
          console.log('🔵 LocationService: ¿Tiene array locations?:', Array.isArray(resBody.products[0].locations));
          if (Array.isArray(resBody.products[0].locations) && resBody.products[0].locations.length > 0) {
            console.log('🔵 LocationService: Primera ubicación del array (RAW):', JSON.stringify(resBody.products[0].locations[0], null, 2));
            console.log('🔵 LocationService: Campos de ubicación en RAW:', {
              section: resBody.products[0].locations[0].section,
              aisle: resBody.products[0].locations[0].aisle,
              shelf: resBody.products[0].locations[0].shelf,
              level: resBody.products[0].locations[0].level,
              lote: resBody.products[0].locations[0].lote
            });
          } else {
            console.log('🔵 LocationService: Primer producto NO tiene array locations');
            console.log('🔵 LocationService: Campos aplanados en producto:', {
              lote: resBody.products[0].lote,
              section: resBody.products[0].section,
              aisle: resBody.products[0].aisle,
              shelf: resBody.products[0].shelf,
              level: resBody.products[0].level
            });
          }
          console.log('🔵 LocationService: ===== FIN RESPUESTA RAW =====');
        }
        
        // Intentar parsear la respuesta si viene como string (problema común con API Gateway)
        let parsedResponse: WarehouseProductsResponse = resBody as WarehouseProductsResponse;
        if (typeof resBody === 'string') {
          try {
            console.log('⚠️ LocationService: resBody es string, parseando JSON...');
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
        
        // NUEVO: Verificar si la respuesta es directamente un array de productos (formato alternativo)
        if (parsedResponse && Array.isArray(parsedResponse) && parsedResponse.length > 0) {
          console.log('⚠️ LocationService: Respuesta es array directo de productos, envolviendo...');
          parsedResponse = {
            success: true,
            warehouse_id: warehouseId,
            products: parsedResponse
          } as WarehouseProductsResponse;
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
        console.log('🔄 LocationService: ===== INICIANDO MAPEO DE RESPUESTA =====');
        console.log('🔄 LocationService: Tipo de backend:', isApiGateway ? 'API Gateway' : 'ELB');
        
        // Para API Gateway con observe: 'body', la respuesta ya es el objeto parseado
        // Para ELB con observe: 'response', necesitamos extraer el body
        let response: any;
        if (isApiGateway) {
          // Con observe: 'body', Angular ya parseó el JSON y nos da el objeto directamente
          response = resp;
          console.log('🔵 LocationService (map): API Gateway con observe:body - Respuesta ya es objeto parseado');
          console.log('🔵 LocationService (map): Tipo de resp:', typeof response);
          console.log('🔵 LocationService (map): Es array?:', Array.isArray(response));
          console.log('🔵 LocationService (map): Keys de resp:', response ? Object.keys(response) : 'null');
        } else {
          // Con observe: 'response', extraer el body de HttpResponse
          response = (resp?.body ?? resp);
          console.log('🟢 LocationService (map): ELB con observe:response - Extrayendo body');
        }
        
        console.log('🔄 LocationService: Tipo de response en map:', typeof response);
        console.log('🔄 LocationService: Response es array?:', Array.isArray(response));
        console.log('🔄 LocationService: Keys de response:', response ? Object.keys(response) : 'null');
        
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
        if (response && !response.products && !Array.isArray(response)) {
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
        
        // Verificar si la respuesta es directamente un array de productos
        if (response && Array.isArray(response) && response.length > 0) {
          console.log('⚠️ LocationService: Respuesta es array directo de productos, envolviendo...');
          response = {
            success: true,
            warehouse_id: warehouseId,
            products: response
          } as WarehouseProductsResponse;
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
        
        // NORMALIZAR PRODUCTOS: Asegurar que las ubicaciones estén en el formato correcto
        console.log('🔄 LocationService: Normalizando productos y ubicaciones...');
        console.log('🔄 LocationService: Total de productos a normalizar:', response.products.length);
        
        // LOG CRÍTICO: Verificar el primer producto ANTES de normalizar
        if (response.products.length > 0 && isApiGateway) {
          const firstProductRaw = response.products[0];
          console.log('🔵 LocationService: PRIMER PRODUCTO RAW (ANTES DE NORMALIZAR) - API Gateway:');
          console.log('🔵 LocationService: Producto completo:', JSON.stringify(firstProductRaw, null, 2));
          console.log('🔵 LocationService: Tiene campo locations?:', 'locations' in firstProductRaw);
          console.log('🔵 LocationService: Valor de locations:', firstProductRaw.locations);
          console.log('🔵 LocationService: Tipo de locations:', typeof firstProductRaw.locations);
          console.log('🔵 LocationService: Es array?:', Array.isArray(firstProductRaw.locations));
          console.log('🔵 LocationService: Todas las keys del producto:', Object.keys(firstProductRaw));
          
          // Buscar cualquier campo que pueda contener ubicaciones
          Object.keys(firstProductRaw).forEach(key => {
            const value = firstProductRaw[key];
            if (typeof value === 'object' && value !== null) {
              console.log(`🔵 LocationService: Campo "${key}":`, {
                tipo: typeof value,
                esArray: Array.isArray(value),
                valor: JSON.stringify(value).substring(0, 200)
              });
            }
          });
        }
        
        const normalizedProducts = response.products.map((product: any, index: number) => {
          // Crear una copia del producto para no modificar el original
          const normalizedProduct = { ...product };
          
          // LOG CRÍTICO: Para API Gateway, analizar TODOS los productos para entender la estructura
          const hasLote = normalizedProduct.lote !== undefined && normalizedProduct.lote !== null;
          const hasLocationFields = normalizedProduct.section !== undefined || normalizedProduct.aisle !== undefined || normalizedProduct.shelf !== undefined || normalizedProduct.level !== undefined;
          const hasLocationsArray = normalizedProduct.locations && Array.isArray(normalizedProduct.locations) && normalizedProduct.locations.length > 0;
          
          // Para API Gateway, hacer log de los primeros productos para entender la estructura
          if (isApiGateway && index < 5) {
            console.log(`🔵 LocationService: ===== Producto ${index} (SKU: ${normalizedProduct.sku}, ID: ${normalizedProduct.product_id}) =====`);
            console.log(`🔵 LocationService: - Tiene array locations?:`, hasLocationsArray);
            if (hasLocationsArray) {
              console.log(`🔵 LocationService: - Array locations (primeros 500 chars):`, JSON.stringify(normalizedProduct.locations, null, 2).substring(0, 500));
            }
            console.log(`🔵 LocationService: - Campos en producto:`, {
              lote: normalizedProduct.lote,
              section: normalizedProduct.section,
              aisle: normalizedProduct.aisle,
              shelf: normalizedProduct.shelf,
              level: normalizedProduct.level,
              quantity: normalizedProduct.quantity
            });
            console.log(`🔵 LocationService: - Todas las keys del producto (${Object.keys(normalizedProduct).length}):`, Object.keys(normalizedProduct));
          }
          
          // CRÍTICO: El API Gateway puede devolver los datos de dos formas:
          // 1. Con array locations completo (como Zoplicona)
          // 2. Con campos aplanados en el producto (sin array locations)
          // Necesitamos manejar ambos casos
          
          if (!hasLocationsArray) {
            // Caso 1: No hay array locations - buscar campos aplanados en el producto
            if (hasLote || hasLocationFields) {
              // El API Gateway aplanó las ubicaciones - reconstruir el array
              console.log(`🔵 LocationService: Producto ${index} (SKU: ${normalizedProduct.sku}) - API Gateway aplanó ubicaciones, reconstruyendo array...`);
              
              // Construir objeto de ubicación a partir de los campos del producto
              // IMPORTANTE: El API Gateway puede no incluir section, aisle, shelf, level cuando aplana
              // Si no están en el producto, los dejamos como strings vacíos (el backend los tiene null)
              const locationObj: any = {
                section: normalizedProduct.section !== undefined ? (normalizedProduct.section || '') : '',
                aisle: normalizedProduct.aisle !== undefined ? (normalizedProduct.aisle || '') : '',
                shelf: normalizedProduct.shelf !== undefined ? (normalizedProduct.shelf || '') : '',
                level: normalizedProduct.level !== undefined ? (normalizedProduct.level || '') : '',
                lote: normalizedProduct.lote || '',
                expiry_date: normalizedProduct.expiry_date !== undefined ? normalizedProduct.expiry_date : null,
                quantity: normalizedProduct.quantity || 0,
                reserved_quantity: normalizedProduct.reserved_quantity || 0
              };
              
              // Agregar campos adicionales si existen
              if (normalizedProduct.city_id !== undefined) locationObj.city_id = normalizedProduct.city_id;
              if (normalizedProduct.city_name !== undefined) locationObj.city_name = normalizedProduct.city_name;
              if (normalizedProduct.country !== undefined) locationObj.country = normalizedProduct.country;
              locationObj.warehouse_id = normalizedProduct.warehouse_id || warehouseId;
              if (normalizedProduct.warehouse_name !== undefined) locationObj.warehouse_name = normalizedProduct.warehouse_name;
              
              normalizedProduct.locations = [locationObj];
              
              if (isApiGateway && index < 5) {
                console.log(`🔵 LocationService: Producto ${index} (SKU: ${normalizedProduct.sku}) - Array locations reconstruido:`, JSON.stringify(normalizedProduct.locations, null, 2));
              }
            } else {
              // No hay información de ubicación - inicializar como array vacío
              normalizedProduct.locations = [];
            }
          } else {
            // Caso 2: Ya hay array locations - verificar que esté completo
            console.log(`🔵 LocationService: Producto ${index} (SKU: ${normalizedProduct.sku}) - Ya tiene array locations con ${normalizedProduct.locations.length} elemento(s)`);
            if (isApiGateway && normalizedProduct.locations.length > 0) {
              console.log(`🔵 LocationService: Primera ubicación del array:`, JSON.stringify(normalizedProduct.locations[0], null, 2));
            }
          }
          
          // Si el producto tiene ubicaciones (ya sea array original o reconstruido), normalizarlas
          if (normalizedProduct.locations !== undefined && normalizedProduct.locations !== null) {
            // Si locations es un string (JSON serializado), parsearlo
            if (typeof normalizedProduct.locations === 'string') {
              try {
                console.log(`⚠️ LocationService: Producto ${index} - locations es string, parseando...`);
                normalizedProduct.locations = JSON.parse(normalizedProduct.locations);
                console.log(`✅ LocationService: Producto ${index} - locations parseado exitosamente`);
              } catch (e) {
                console.error(`❌ LocationService: Producto ${index} - Error al parsear locations:`, e);
                console.error(`❌ LocationService: Producto ${index} - String que falló:`, normalizedProduct.locations?.substring(0, 200));
                normalizedProduct.locations = [];
              }
            }
            
            // Asegurar que locations sea un array
            if (!Array.isArray(normalizedProduct.locations)) {
              console.warn(`⚠️ LocationService: Producto ${index} - locations no es array, convirtiendo...`);
              console.warn(`⚠️ LocationService: Producto ${index} - Tipo de locations:`, typeof normalizedProduct.locations);
              console.warn(`⚠️ LocationService: Producto ${index} - Valor de locations:`, normalizedProduct.locations);
              
              // Si es un objeto, convertirlo a array
              if (typeof normalizedProduct.locations === 'object' && normalizedProduct.locations !== null) {
                normalizedProduct.locations = [normalizedProduct.locations];
                console.log(`✅ LocationService: Producto ${index} - Objeto convertido a array con 1 elemento`);
              } else {
                console.warn(`⚠️ LocationService: Producto ${index} - locations no es objeto válido, inicializando como array vacío`);
                normalizedProduct.locations = [];
              }
            }
            
            // LOG: Verificar estado después de asegurar que es array
            if (index === 0 && isApiGateway) {
              console.log('🔵 LocationService: Después de asegurar array - Longitud:', normalizedProduct.locations?.length || 0);
              if (normalizedProduct.locations && normalizedProduct.locations.length > 0) {
                console.log('🔵 LocationService: Primera ubicación RAW:', JSON.stringify(normalizedProduct.locations[0], null, 2));
              }
            }
            
            // Normalizar cada ubicación SOLO si el array tiene elementos
            if (Array.isArray(normalizedProduct.locations) && normalizedProduct.locations.length > 0) {
              const originalLength = normalizedProduct.locations.length;
              
              // Función helper para obtener campos preservando valores reales (incluso null o strings vacíos)
              const getField = (primary: any, ...alternatives: any[]) => {
                // Buscar el primer valor que no sea undefined
                for (const val of [primary, ...alternatives]) {
                  if (val !== undefined) {
                    // Preservar el valor tal cual, incluso si es null, string vacío, o 0
                    // Solo convertir null a string vacío para campos de texto
                    if (val === null) {
                      return '';
                    }
                    return val;
                  }
                }
                return '';
              };
              
              normalizedProduct.locations = normalizedProduct.locations.map((loc: any, locIndex: number) => {
                // LOG para productos con ubicaciones completas (primeros 3 productos)
                if (isApiGateway && index < 3 && locIndex === 0) {
                  console.log(`🔵 LocationService: Producto ${index} (SKU: ${normalizedProduct.sku}) - Ubicación ANTES de normalizar:`, JSON.stringify(loc, null, 2));
                }
                
                // Normalizar nombres de campos (pueden venir en diferentes casos)
                // CRÍTICO: Preservar los valores reales (strings como "2", "3", "A", etc.)
                const normalizedLoc = {
                  section: getField(loc.section, loc.Section, loc.section_name),
                  aisle: getField(loc.aisle, loc.Aisle, loc.aisle_name),
                  shelf: getField(loc.shelf, loc.Shelf, loc.shelf_name),
                  level: getField(loc.level, loc.Level, loc.level_name),
                  lot: getField(loc.lote, loc.lot, loc.Lote, loc.Lot, loc.lote_number, loc.lotNumber),
                  expires: getField(loc.expiry_date, loc.expires, loc.ExpiryDate, loc.expiration_date),
                  available: loc.quantity !== undefined ? (loc.quantity || 0) : (loc.available !== undefined ? (loc.available || 0) : (loc.Available || loc.available_quantity || 0)),
                  reserved: loc.reserved_quantity !== undefined ? (loc.reserved_quantity || 0) : (loc.reserved !== undefined ? (loc.reserved || 0) : (loc.ReservedQuantity || loc.Reserved || loc.reserved_qty || 0))
                };
                
                // LOG para productos con ubicaciones completas después de normalizar
                if (isApiGateway && index < 3 && locIndex === 0) {
                  console.log(`🔵 LocationService: Producto ${index} (SKU: ${normalizedProduct.sku}) - Ubicación DESPUÉS de normalizar:`, JSON.stringify(normalizedLoc, null, 2));
                  console.log(`🔵 LocationService: Valores críticos preservados:`, {
                    section: `"${normalizedLoc.section}" (tipo: ${typeof normalizedLoc.section})`,
                    aisle: `"${normalizedLoc.aisle}" (tipo: ${typeof normalizedLoc.aisle})`,
                    shelf: `"${normalizedLoc.shelf}" (tipo: ${typeof normalizedLoc.shelf})`,
                    level: `"${normalizedLoc.level}" (tipo: ${typeof normalizedLoc.level})`,
                    lot: `"${normalizedLoc.lot}" (tipo: ${typeof normalizedLoc.lot})`
                  });
                }
                
                return normalizedLoc;
              });
              // NO filtrar ubicaciones aquí - el componente decidirá qué mostrar
              // Solo asegurar que el array no esté vacío si había ubicaciones
              
              if (index === 0 && isApiGateway) {
                console.log(`🔵 LocationService: Ubicaciones normalizadas: ${normalizedProduct.locations.length} de ${originalLength} originales`);
              }
            } else {
              if (index === 0 && isApiGateway) {
                console.warn('⚠️ LocationService: Array de ubicaciones está VACÍO después de asegurar que es array');
              }
            }
          } else {
            // Si no tiene locations, inicializar como array vacío
            if (index === 0 && isApiGateway) {
              console.warn('⚠️ LocationService: Producto no tiene campo locations o es null/undefined');
            }
            normalizedProduct.locations = [];
          }
          
          // LOG final para el primer producto
          if (index === 0 && isApiGateway) {
            console.log('🔵 LocationService: ===== PRODUCTO DESPUÉS DE NORMALIZAR (índice 0) =====');
            console.log('🔵 LocationService: locations después de normalizar:', normalizedProduct.locations);
            console.log('🔵 LocationService: Longitud final:', normalizedProduct.locations?.length || 0);
          }
          
          return normalizedProduct;
        });
        
        // Crear respuesta normalizada
        const normalizedResponse: WarehouseProductsResponse = {
          success: response.success !== undefined ? response.success : true,
          warehouse_id: response.warehouse_id || warehouseId,
          products: normalizedProducts
        };
        
        // Verificar si los productos tienen ubicaciones después de la normalización
        const productsWithLocations = normalizedResponse.products.filter((p: any) => 
          p.locations && Array.isArray(p.locations) && p.locations.length > 0
        );
        console.log('📊 LocationService: Después de normalización - Productos con ubicaciones:', productsWithLocations.length, 'de', normalizedResponse.products.length);
        
        if (isApiGateway && productsWithLocations.length === 0 && normalizedResponse.products.length > 0) {
          console.error('❌ LocationService: ERROR CRÍTICO - API Gateway devolvió productos pero SIN ubicaciones después de normalización');
          console.error('❌ LocationService: URL que se envió:', url);
          console.error('❌ LocationService: Parámetro include_locations en URL:', url.includes('include_locations=true'));
          
          // Mostrar el primer producto para debugging
          if (normalizedResponse.products.length > 0) {
            const firstProd = normalizedResponse.products[0] as any;
            console.error('❌ LocationService: Primer producto después de normalización (completo):', JSON.stringify(firstProd, null, 2));
            console.error('❌ LocationService: Primer producto resumido:', {
              id: firstProd.product_id,
              sku: firstProd.sku,
              tieneLocations: 'locations' in firstProd,
              locations: firstProd.locations,
              locationsType: typeof firstProd.locations,
              locationsIsArray: Array.isArray(firstProd.locations),
              locationsLength: Array.isArray(firstProd.locations) ? firstProd.locations.length : 'N/A',
              allKeys: Object.keys(firstProd)
            });
          }
        }
        
        console.log('✅ LocationService: ===== MAPEO COMPLETADO =====');
        return normalizedResponse;
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
