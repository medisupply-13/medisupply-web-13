import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Product {
  product_id: number;
  sku: string;
  name: string;
  value: number;
  category_name: string;
  total_quantity: number;
  image_url?: string;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  success: boolean;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  private readonly api = environment.baseUrl;

  constructor(private http: HttpClient) {
    console.log('🏗️ ProductsService: Servicio instanciado');
    console.log('🌐 ProductsService: URL base configurada:', this.api);
  }

  /**
   * Obtiene todos los productos disponibles
   */
  getAvailableProducts(cityId: number = 1): Observable<ProductsResponse> {
    const url = `${this.api}products/active`;

    console.log('🔍 ProductsService: ===== INICIANDO PETICIÓN AL BACKEND =====');
    console.log('🌐 ProductsService: URL completa:', url);
    console.log('🌐 ProductsService: API base:', this.api);
    console.log('📊 ProductsService: Método HTTP: GET');
    console.log('⏱️ ProductsService: Timestamp:', new Date().toISOString());

    return this.http.get<any>(url).pipe(
      tap(data => {
        console.log('📡 ProductsService: ===== RESPUESTA RECIBIDA =====');
        console.log('📡 ProductsService: Respuesta completa:', data);
        console.log('📊 ProductsService: TipogetAvailableProducts de respuesta:', typeof data);
        console.log('📋 ProductsService: Es array?', Array.isArray(data));

        // El backend devuelve un array directo, no un objeto con products
        if (Array.isArray(data)) {
          console.log('📦 ProductsService: Backend devuelve array directo con', data.length, 'productos');
          console.log('📦 ProductsService: Primeros 3 productos:', data.slice(0, 3));
        } else {
          console.log('📦 ProductsService: Backend devuelve objeto:', Object.keys(data || {}));
        }
      }),
      // Transformar la respuesta del backend al formato esperado por el frontend
      map(data => {
        console.log('🔄 ProductsService: ===== TRANSFORMANDO DATOS =====');
        console.log('🔄 ProductsService: Datos recibidos:', data);

        // El endpoint /products/available devuelve un array directo de productos
        if (Array.isArray(data)) {
          console.log('✅ ProductsService: Transformando array directo');

          // Mapear cantidad total tolerando distintos nombres desde el backend
          const products = data.map((product: any) => ({
            product_id: product.product_id,
            sku: product.sku,
            name: product.name,
            value: product.value,
            category_name: product.category_name,
            total_quantity: (
              product.total_quantity ??
              product.max_quantity ??
              product.quantity ??
              product.total_stock ??
              product.stock ??
              0
            ),
            image_url: product.image_url || null
          }));

          console.log('✅ ProductsService: Productos transformados:', products.length);
          console.log('✅ ProductsService: Primeros 3 productos:', products.slice(0, 3));

          return {
            products,
            total: products.length,
            success: true,
            message: 'Productos cargados exitosamente'
          };
        } else if (data.products && Array.isArray(data.products)) {
          // Fallback: si el backend devuelve un objeto con products array
          console.log('✅ ProductsService: Transformando objeto con products array');
          const products = data.products.map((product: any) => ({
            product_id: product.product_id,
            sku: product.sku,
            name: product.name,
            value: product.value,
            category_name: product.category_name,
            total_quantity: (
              product.total_quantity ??
              product.max_quantity ??
              product.quantity ??
              product.total_stock ??
              product.stock ??
              0
            ),
            image_url: product.image_url || null
          }));

          return {
            products,
            total: products.length,
            success: data.success || true,
            message: 'Productos cargados exitosamente'
          };
        } else {
          console.log('❌ ProductsService: Formato de respuesta no soportado');
          return {
            products: [],
            total: 0,
            success: false,
            message: 'Formato de respuesta no soportado'
          };
        }
      }),
      catchError(error => {
        console.error('❌ ProductsService: ===== ERROR EN PETICIÓN =====');
        console.error('❌ ProductsService: Error completo:', error);
        console.error('❌ ProductsService: Error message:', error.message);
        console.error('❌ ProductsService: Error status:', error.status);
        console.error('❌ ProductsService: Error statusText:', error.statusText);
        console.error('❌ ProductsService: Error url:', error.url);
        console.error('❌ ProductsService: Error stack:', error.stack);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtiene productos por bodega específica
   */
  getProductsByWarehouse(warehouseId: number): Observable<ProductsResponse> {
    const url = `${this.api}products/by-warehouse/${warehouseId}`;

    console.log('🔍 ProductsService: Obteniendo productos por bodega:', warehouseId);
    console.log('🌐 ProductsService: URL:', url);

    return this.http.get<any>(url).pipe(
      tap(data => {
        console.log('📡 ProductsService: Productos por bodega recibidos:', data);
      }),
      map(data => {
        if (data.products && Array.isArray(data.products)) {
          // Agrupar productos por SKU (el backend puede devolver múltiples lotes como productos separados)
          const productsMap = new Map<string, any>();

          data.products.forEach((product: any) => {
            const sku = product.sku || '';
            if (!sku) return;

            if (productsMap.has(sku)) {
              // Ya existe, sumar la cantidad
              const existing = productsMap.get(sku);
              existing.total_quantity = (existing.total_quantity || 0) + (product.quantity || 0);
            } else {
              // Nuevo producto
              productsMap.set(sku, {
                product_id: product.product_id,
                sku: product.sku,
                name: product.name,
                value: product.value,
                category_name: product.category_name,
                total_quantity: product.quantity || 0,
                image_url: product.image_url || null
              });
            }
          });

          const products = Array.from(productsMap.values());

          return {
            products,
            total: products.length,
            success: data.success || true,
            message: 'Productos por bodega cargados exitosamente'
          };
        }

        return {
          products: [],
          total: 0,
          success: false,
          message: 'No se pudieron cargar los productos por bodega'
        };
      }),
      catchError(error => {
        console.error('❌ ProductsService: Error al obtener productos por bodega:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtiene productos sin stock
   */
  getProductsWithoutStock(): Observable<ProductsResponse> {
    const url = `${this.api}products/without-stock`;

    console.log('🔍 ProductsService: Obteniendo productos sin stock');
    console.log('🌐 ProductsService: URL:', url);

    return this.http.get<any>(url).pipe(
      tap(data => {
        console.log('📡 ProductsService: Productos sin stock recibidos:', data);
      }),
      map(data => {
        if (data.products_without_stock && Array.isArray(data.products_without_stock)) {
          const products = data.products_without_stock.map((product: any) => ({
            product_id: product.product_id,
            sku: product.sku,
            name: product.name,
            value: product.value,
            category_name: product.category_name,
            total_quantity: 0, // Sin stock
            image_url: product.image_url || null
          }));

          return {
            products,
            total: products.length,
            success: data.success || true,
            message: 'Productos sin stock cargados exitosamente'
          };
        }

        return {
          products: [],
          total: 0,
          success: false,
          message: 'No se pudieron cargar los productos sin stock'
        };
      }),
      catchError(error => {
        console.error('❌ ProductsService: Error al obtener productos sin stock:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtiene un producto por ID
   */
  getProductById(id: string): Observable<Product> {
    const url = `${this.api}products/${id}`;

    console.log('🔍 ProductsService: Solicitando producto por ID:', id, 'desde:', url);

    return this.http.get<Product>(url).pipe(
      tap(data => console.log('📡 ProductsService: Producto recibido:', data)),
      catchError(error => {
        console.error('❌ ProductsService: Error al obtener producto:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Crea un nuevo producto
   */
  createProduct(product: Omit<Product, 'id' | 'fecha_creacion'>): Observable<Product> {
    const url = `${this.api}products`;

    console.log('🔍 ProductsService: Creando producto:', product);
    console.log('🌐 ProductsService: URL:', url);

    return this.http.post<Product>(url, product).pipe(
      tap(data => console.log('📡 ProductsService: Producto creado:', data)),
      catchError(error => {
        console.error('❌ ProductsService: Error al crear producto:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Inserta un nuevo producto usando el endpoint /products/insert
   * Este endpoint valida e inserta un solo producto
   */
  insertProduct(product: {
    sku: string;
    name: string;
    value: number;
    category_name: string;
    quantity: number;
    warehouse_id: number;
    section?: string;
    aisle?: string;
    shelf?: string;
    level?: string;
    image_url?: string;
  }): Observable<any> {
    const url = `${this.api}products/insert`;

    console.log('🔍 ProductsService: Insertando producto:', product);
    console.log('🌐 ProductsService: URL:', url);

    return this.http.post<any>(url, product).pipe(
      tap(data => console.log('📡 ProductsService: Producto insertado:', data)),
      catchError(error => {
        console.error('❌ ProductsService: Error al insertar producto:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Actualiza un producto existente
   */
  updateProduct(id: string, product: Partial<Product>): Observable<Product> {
    const url = `${this.api}products/${id}`;

    console.log('🔍 ProductsService: Actualizando producto ID:', id, 'con datos:', product);
    console.log('🌐 ProductsService: URL:', url);

    return this.http.put<Product>(url, product).pipe(
      tap(data => console.log('📡 ProductsService: Producto actualizado:', data)),
      catchError(error => {
        console.error('❌ ProductsService: Error al actualizar producto:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Elimina un producto
   */
  deleteProduct(id: string): Observable<{ success: boolean; message: string }> {
    const url = `${this.api}products/${id}`;

    console.log('🔍 ProductsService: Eliminando producto ID:', id);
    console.log('🌐 ProductsService: URL:', url);

    return this.http.delete<{ success: boolean; message: string }>(url).pipe(
      tap(data => console.log('📡 ProductsService: Producto eliminado:', data)),
      catchError(error => {
        console.error('❌ ProductsService: Error al eliminar producto:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Cambia el estado de un producto (activar/desactivar)
   */
  toggleProductStatus(id: string, status: 'activo' | 'inactivo'): Observable<Product> {
    const url = `${this.api}products/${id}/status`;

    console.log('🔍 ProductsService: Cambiando estado del producto ID:', id, 'a:', status);
    console.log('🌐 ProductsService: URL:', url);

    return this.http.patch<Product>(url, { estado: status }).pipe(
      tap(data => console.log('📡 ProductsService: Estado del producto actualizado:', data)),
      catchError(error => {
        console.error('❌ ProductsService: Error al cambiar estado del producto:', error);
        return throwError(() => error);
      })
    );
  }
}
