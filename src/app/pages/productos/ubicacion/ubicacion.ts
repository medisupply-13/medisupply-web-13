import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PageHeader } from '../../../shared/page-header/page-header';
import { StatusMessage } from '../../../shared/status-message/status-message';
import { CustomSelect } from '../../../shared/custom-select/custom-select';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { LocationService, City, Warehouse, Product, ProductLocation } from '../../../services/location.service';
import { ACTIVE_TRANSLATIONS, currentLangSignal } from '../../../shared/lang/lang-store';

@Component({
  selector: 'app-ubicacion',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCardModule,
    MatPaginatorModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    PageHeader,
    StatusMessage,
    CustomSelect
  ],
  templateUrl: './ubicacion.html',
  styleUrls: ['./ubicacion.css']
})
export class UbicacionComponent implements OnInit {
  pageTitle = 'productLocationTitle';
  
  // Datos de búsqueda
  searchQuery = '';
  
  // Filtros
  selectedCity = signal('');
  selectedWarehouse = signal('');
  
  // Opciones para los filtros
  cityOptions: any[] = [];
  warehouseOptions: any[] = [];
  
  // Resultados
  allProducts: Product[] = [];
  products: Product[] = [];
  filteredProducts: Product[] = [];
  
  // Paginación
  pageSize = 3;
  currentPage = 0;
  totalProducts = 0;
  
  // Configuración de paginación
  readonly paginationOptions = [3, 5, 10, 20, 50];
  readonly defaultPageSize = 3;
  
  // Estados
  loading = false;
  message: any = null;
  
  // Popup de ubicaciones
  showLocationPopup = false;
  selectedProduct: Product | null = null;
  
  // Panel de navegación
  viewMode: 'grid' | 'list' = 'grid';
  availabilityFilter: 'all' | 'available' | 'unavailable' = 'all';
  sortBy: 'name' | 'availability' | 'none' = 'none';
  
  constructor(private locationService: LocationService) {}

  /**
   * Obtiene una traducción por su clave
   */
  private translate(key: string): string {
    return ACTIVE_TRANSLATIONS[key] || key;
  }
  
  ngOnInit() {
    this.initializeData();
  }
  
  private initializeData() {
    this.loadCities();
    this.loadAllProducts();
  }
  
  private loadCities() {
    this.loading = true;
    this.locationService.getCities().subscribe({
      next: (response) => {
        this.cityOptions = response.cities.map(city => ({
          value: city.city_id.toString(),
          labelKey: `city_${city.name.toLowerCase().replace('á', 'a').replace('í', 'i')}`,
          name: city.name
        }));
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading cities:', error);
        this.message = {
          type: 'error',
          key: 'errorLoadingCities'
        };
        this.loading = false;
      }
    });
  }

  private loadAllProducts() {
    this.loading = true;
    this.locationService.getProductsLocation().subscribe({
      next: (response) => {
        // Mapear los productos del backend al formato esperado por el frontend
        this.allProducts = response.products.map(product => this.mapProductToFrontendFormat(product));
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error loading products:', error);
        this.message = {
          type: 'error',
          key: 'errorLoadingProducts'
        };
        this.loading = false;
      }
    });
  }

  private mapProductToFrontendFormat(product: Product): any {
    const p = product as any;
    
    // Extraer ubicaciones primero para calcular el total si es necesario
    const backendLocations = this.extractLocationsFromBackend(product);
    const hasRealLocations = backendLocations.length > 0;
    
    // El backend ya devuelve el total correcto en quantity cuando agrupa por SKU
    // Si hay ubicaciones, podemos verificar que la suma coincida
    let totalAvailable = p.quantity ?? p.total_stock ?? 0;
    
    if (hasRealLocations && backendLocations.length > 0) {
      // El backend ya suma correctamente, usar el valor del backend
      // Pero podemos validar para debugging
      const sumFromLocations = backendLocations.reduce((sum, loc) => sum + loc.available, 0);
      if (sumFromLocations !== totalAvailable) {
        console.warn('⚠️ Ubicacion: Suma de ubicaciones (', sumFromLocations, ') no coincide con quantity del producto (', totalAvailable, ')');
      }
    }
    
    const hasAvailability = this.determineStockAvailability(product);
    
    return {
      ...product,
      product_id: product.product_id,
      id: product.product_id, // Para compatibilidad con el template
      totalAvailable: totalAvailable, // Usar el total del backend (ya agrupado por SKU)
      hasAvailability: hasAvailability,
      warehouse: p.warehouse_id,
      city: p.city_id,
      // Preservar city_name y warehouse_name del backend si están disponibles
      city_name: p.city_name || product.city_name,
      warehouse_name: p.warehouse_name || product.warehouse_name,
      locations: backendLocations, // Solo usar datos del backend
      hasRealLocations: hasRealLocations
    };
  }

  private determineStockAvailability(product: Product): boolean {
    // El backend puede devolver 'quantity' o 'total_stock', usar el que esté disponible
    const totalQuantity = (product as any).quantity ?? (product as any).total_stock ?? 0;
    
    // Opción 1: Solo verificar si hay cantidad > 0
    if (totalQuantity > 0) {
      return true;
    }
    
    // Opción 2: Verificar si el producto está activo (si tienes este campo)
    // if (product.status === 'activo' && totalQuantity > 0) {
    //   return true;
    // }
    
    // Opción 3: Verificar stock mínimo (si tienes este campo)
    // const minimumStock = product.minimum_stock || 0;
    // if (totalQuantity > minimumStock) {
    //   return true;
    // }
    
    return false;
  }

  // Métodos adicionales para manejar diferentes tipos de stock
  getStockStatus(product: any): 'available' | 'low-stock' | 'out-of-stock' {
    const totalAvailable = product.totalAvailable || 0;
    
    if (totalAvailable === 0) {
      return 'out-of-stock';
    } else if (totalAvailable <= 10) { // Ajusta este valor según tu lógica de negocio
      return 'low-stock';
    } else {
      return 'available';
    }
  }

  getStockStatusText(product: any): string {
    const status = this.getStockStatus(product);
    
    switch (status) {
      case 'available':
        return `${product.totalAvailable} ${this.translate('unitsAvailable')}`;
      case 'low-stock':
        return `${this.translate('lowStock')}: ${product.totalAvailable} ${this.translate('unitsLabel')}`;
      case 'out-of-stock':
        return this.translate('outOfStock');
      default:
        return this.translate('unknownStatus');
    }
  }

  getStockStatusClass(product: any): string {
    const status = this.getStockStatus(product);
    
    switch (status) {
      case 'available':
        return 'available';
      case 'low-stock':
        return 'low-stock';
      case 'out-of-stock':
        return 'unavailable';
      default:
        return 'unknown';
    }
  }

  private extractLocationsFromBackend(product: Product): ProductLocation[] {
    // Extraer ubicaciones del backend si están disponibles
    const backendLocations = (product as any).locations;
    const p = product as any;
    
    console.log('🔍 Ubicacion: Extrayendo ubicaciones del producto:', product.product_id, 'SKU:', product.sku);
    console.log('🔍 Ubicacion: Estructura completa del producto recibido:', {
      product_id: product.product_id,
      sku: product.sku,
      hasLocationsField: 'locations' in product,
      locationsType: typeof backendLocations,
      locationsIsArray: Array.isArray(backendLocations),
      locationsLength: Array.isArray(backendLocations) ? backendLocations.length : 'N/A',
      allProductKeys: Object.keys(product)
    });
    
    if (!backendLocations || !Array.isArray(backendLocations) || backendLocations.length === 0) {
      console.log('⚠️ Ubicacion: No hay ubicaciones en el backend para este producto');
      console.log('⚠️ Ubicacion: Detalle - backendLocations existe:', !!backendLocations, ', es array:', Array.isArray(backendLocations), ', longitud:', Array.isArray(backendLocations) ? backendLocations.length : 'N/A');
      return [];
    }
    
    // LOG CRÍTICO: Ver el contenido REAL del array locations
    console.log('🔍 Ubicacion: Array locations COMPLETO (JSON):', JSON.stringify(backendLocations, null, 2));
    if (backendLocations.length > 0) {
      console.log('🔍 Ubicacion: Primera ubicación del array:', JSON.stringify(backendLocations[0], null, 2));
      console.log('🔍 Ubicacion: Keys de la primera ubicación:', Object.keys(backendLocations[0]));
      console.log('🔍 Ubicacion: Valores de la primera ubicación:', {
        section: backendLocations[0].section,
        aisle: backendLocations[0].aisle,
        shelf: backendLocations[0].shelf,
        level: backendLocations[0].level,
        lote: backendLocations[0].lote,
        lot: backendLocations[0].lot,
        quantity: backendLocations[0].quantity,
        available: backendLocations[0].available,
        expiry_date: backendLocations[0].expiry_date,
        expires: backendLocations[0].expires
      });
    }
    
    // El backend con include_locations=true devuelve un array de ubicaciones,
    // donde cada ubicación tiene: section, aisle, shelf, level, lote, quantity, expiry_date, etc.
    const locations: ProductLocation[] = [];
    
    for (const location of backendLocations) {
      // El servicio LocationService ya normaliza los campos, usar los nombres normalizados
      // Pero también verificar nombres alternativos por si acaso
      const lotNumber = location.lot || location.lote || '';
      
      // NO omitir ubicaciones sin lote - algunas ubicaciones pueden no tener lote asignado
      // Solo omitir si la ubicación está completamente vacía
      const hasLocationData = location.section || location.aisle || location.shelf || location.level || lotNumber;
      if (!hasLocationData) {
        console.warn('⚠️ Ubicacion: Ubicación completamente vacía, omitiendo:', location);
        continue;
      }
      
      // Formatear la fecha de vencimiento - usar el campo normalizado 'expires'
      let expiryDate = '';
      const expirySource = location.expires || location.expiry_date || location.expiration_date;
      if (expirySource) {
        try {
          const date = new Date(expirySource);
          if (!isNaN(date.getTime())) {
            expiryDate = date.toISOString().split('T')[0];
          } else {
            expiryDate = expirySource;
          }
        } catch (e) {
          expiryDate = expirySource || '';
        }
      }
      
      // CRÍTICO: Preservar los valores tal cual vienen, incluso si son null o strings vacíos
      // El problema puede ser que los valores están como null y se convierten a ''
      const extractedLocation: ProductLocation = {
        section: location.section !== null && location.section !== undefined ? String(location.section) : '',
        aisle: location.aisle !== null && location.aisle !== undefined ? String(location.aisle) : '',
        shelf: location.shelf !== null && location.shelf !== undefined ? String(location.shelf) : '',
        level: location.level !== null && location.level !== undefined ? String(location.level) : '',
        lot: lotNumber,
        expires: expiryDate,
        // El servicio ya normaliza a 'available' y 'reserved'
        available: location.available !== undefined ? location.available : (location.quantity || 0),
        reserved: location.reserved !== undefined ? location.reserved : (location.reserved_quantity || 0)
      };
      
      // LOG para verificar qué valores se están extrayendo
      console.log('🔍 Ubicacion: Ubicación extraída:', {
        section: `"${extractedLocation.section}" (original: ${location.section}, tipo: ${typeof location.section})`,
        aisle: `"${extractedLocation.aisle}" (original: ${location.aisle}, tipo: ${typeof location.aisle})`,
        shelf: `"${extractedLocation.shelf}" (original: ${location.shelf}, tipo: ${typeof location.shelf})`,
        level: `"${extractedLocation.level}" (original: ${location.level}, tipo: ${typeof location.level})`,
        lot: extractedLocation.lot
      });
      
      locations.push(extractedLocation);
    }
    
    console.log('✅ Ubicacion: Total de ubicaciones extraídas:', locations.length);
    if (locations.length > 0) {
      const total = locations.reduce((sum, loc) => sum + loc.available, 0);
      console.log('📊 Ubicacion: Suma de cantidades de ubicaciones:', total, 'vs quantity del producto:', p.quantity);
    }
    
    return locations;
  }

  onCityChange() {
    console.log('🏙️ Ubicacion: Ciudad seleccionada:', this.selectedCity());
    this.selectedWarehouse.set('');
    this.warehouseOptions = [];
    this.products = [];
    this.filteredProducts = [];
    this.totalProducts = 0;
    
    if (this.selectedCity()) {
      console.log('🔄 Ubicacion: Cargando bodegas para ciudad:', this.selectedCity());
      this.loadWarehouses();
    }
  }
  
  private loadWarehouses() {
    const cityId = this.selectedCity();
    console.log('🏢 Ubicacion: loadWarehouses - cityId:', cityId);
    if (!cityId) {
      this.warehouseOptions = [];
      return;
    }

    this.loading = true;
    console.log('📡 Ubicacion: Llamando al backend para cityId:', cityId);
    this.locationService.getWarehouses(parseInt(cityId)).subscribe({
      next: (response) => {
        console.log('✅ Ubicacion: Respuesta del backend para bodegas:', response);
        console.log('🏢 Ubicacion: Bodegas recibidas:', response.warehouses);
        this.warehouseOptions = response.warehouses.map(warehouse => ({
          value: warehouse.warehouse_id.toString(),
          labelKey: warehouse.name, // Usar el nombre real de la bodega
          name: warehouse.name,
          description: warehouse.description
        }));
        console.log('📋 Ubicacion: Opciones de bodega mapeadas:', this.warehouseOptions);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading warehouses:', error);
        this.message = {
          type: 'error',
          key: 'errorLoadingWarehouses'
        };
        this.loading = false;
      }
    });
  }

  onWarehouseChange() {
    const selectedWarehouse = this.selectedWarehouse();
    console.log('🏢 Ubicacion: Bodega seleccionada:', selectedWarehouse);
    if (selectedWarehouse) {
      this.loadProductsByWarehouse(selectedWarehouse);
    } else {
      this.products = [];
      this.filteredProducts = [];
      this.totalProducts = 0;
    }
  }

  private loadProductsByWarehouse(warehouseId: string) {
    const startTime = performance.now();
    this.loading = true;
    this.message = null;
    
    console.log('📦 Ubicacion: Cargando productos para bodega:', warehouseId);
    console.log('📡 Ubicacion: Llamando al backend para warehouseId:', warehouseId, '(incluyendo productos sin stock y ubicaciones)');
    console.log('🎯 Ubicacion: ASR - Consulta de localización de producto en bodega');
    console.log('🎯 Ubicacion: ASR - Objetivo: < 2 segundos para visualizar información física del inventario');
    
    // Cargar todos los productos con ubicaciones, incluyendo los que tienen stock = 0
    this.locationService.getProductsByWarehouse(parseInt(warehouseId), true, true).subscribe({
      next: (response) => {
        const endTime = performance.now();
        const duration = (endTime - startTime) / 1000;
        
        console.log('✅ Ubicacion: Respuesta del backend para productos:', response);
        console.log('📦 Ubicacion: Productos recibidos del backend:', response.products.length);
        console.log('⏰ Ubicacion: Tiempo total de carga (segundos):', Math.round(duration * 100) / 100);
        
        // Validar ASR: tiempo de respuesta < 2 segundos
        if (duration < 2) {
          console.log('✅ Ubicacion: ASR CUMPLIDO - Información visualizada en', Math.round(duration * 100) / 100, 'segundos');
        } else {
          console.warn('⚠️ Ubicacion: ASR NO CUMPLIDO - Información visualizada en', Math.round(duration * 100) / 100, 'segundos (>= 2s)');
        }
        
        // El backend ya agrupa por SKU y devuelve el total en quantity
        // Solo necesitamos mapear al formato del frontend
        this.products = response.products.map(product => this.mapProductToFrontendFormat(product));
        this.filteredProducts = [...this.products];
        this.totalProducts = this.products.length;
        
        const productsWithRealLocations = this.products.filter((p: any) => p.hasRealLocations);
        console.log('✅ Ubicacion: Productos mapeados:', this.products.length);
        console.log('✅ Ubicacion: Productos con ubicaciones reales:', productsWithRealLocations.length);
        
        // Log para verificar totales
        if (productsWithRealLocations.length > 0) {
          const example = productsWithRealLocations[0];
          console.log('📊 Ubicacion: Ejemplo de producto:', {
            sku: example.sku,
            totalAvailable: example.totalAvailable,
            locationsCount: example.locations?.length || 0,
            locationsQuantitySum: example.locations?.reduce((sum: number, loc: any) => sum + (loc.available || 0), 0) || 0
          });
        }
        
        this.loading = false;
        
        // Mostrar mensaje si no hay productos en esta bodega
        if (this.products.length === 0) {
          this.message = {
            type: 'info',
            key: 'noProductsFound'
          };
        }
      },
      error: (error) => {
        console.error('Error loading products by warehouse:', error);
        this.message = {
          type: 'error',
          key: 'errorLoadingProducts'
        };
        this.loading = false;
      }
    });
  }
  
  onSearch() {
    if (!this.searchQuery.trim()) {
      // Si no hay término de búsqueda, mostrar todos los productos de la bodega
      this.filteredProducts = [...this.products];
      this.totalProducts = this.products.length;
      this.message = null;
      return;
    }
    
    if (!this.selectedWarehouse()) {
      this.message = {
        type: 'warning',
        key: 'warehouseRequired'
      };
      return;
    }
    
    this.searchProducts();
  }
  
  private searchProducts() {
    this.loading = true;
    this.message = null;
    
    // Simular tiempo de carga
    setTimeout(() => {
      const searchTerm = this.searchQuery.toLowerCase().trim();
      
      // Filtrar solo los productos ya cargados por bodega
      this.filteredProducts = this.products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm) || 
          product.sku.toLowerCase().includes(searchTerm);
        
        return matchesSearch;
      });
      
      this.totalProducts = this.filteredProducts.length;
      this.loading = false;
      
      // Mostrar mensaje si no hay resultados
      if (this.filteredProducts.length === 0) {
        this.message = {
          type: 'info',
          key: 'noProductsFound'
        };
      }
    }, 500);
  }
  
  onViewLocations(product: any) {
    this.selectedProduct = product;
    this.showLocationPopup = true;
  }

  closeLocationPopup() {
    this.showLocationPopup = false;
    this.selectedProduct = null;
  }

  getCityName(cityId: string): string {
    const city = this.cityOptions.find(c => c.value === cityId);
    return city ? city.name : cityId;
  }

  getWarehouseName(warehouseId: string): string {
    const warehouse = this.warehouseOptions.find(w => w.value === warehouseId);
    return warehouse ? `${warehouse.name} - ${warehouse.description}` : warehouseId;
  }

  formatDate(dateString: string): string {
    if (!dateString) {
      return '';
    }
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn('⚠️ Ubicacion: Fecha inválida:', dateString);
        return '';
      }
      
      // Usar el locale según el idioma actual
      const lang = currentLangSignal();
      const localeMap: Record<string, string> = {
        'es': 'es-ES',
        'en': 'en-US'
      };
      const locale = localeMap[lang] || 'es-ES';
      
      return date.toLocaleDateString(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      console.error('❌ Ubicacion: Error al formatear fecha:', dateString, e);
      return '';
    }
  }

  // Métodos para el panel de navegación
  toggleViewMode() {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
  }

  toggleSort() {
    if (this.sortBy === 'none') {
      this.sortBy = 'name';
    } else if (this.sortBy === 'name') {
      this.sortBy = 'availability';
    } else {
      this.sortBy = 'none';
    }
    this.resetPagination();
  }

  setAvailabilityFilter(filter: 'all' | 'available' | 'unavailable') {
    this.availabilityFilter = filter;
    this.resetPagination();
  }

  getFilteredProducts() {
    let filtered = [...this.filteredProducts];
    
    // Filtrar por disponibilidad
    if (this.availabilityFilter === 'available') {
      filtered = filtered.filter(product => product.hasAvailability);
    } else if (this.availabilityFilter === 'unavailable') {
      filtered = filtered.filter(product => !product.hasAvailability);
    }
    
    // Ordenar según el criterio seleccionado
    if (this.sortBy === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    } else if (this.sortBy === 'availability') {
      filtered.sort((a, b) => {
        if (a.hasAvailability && !b.hasAvailability) return -1;
        if (!a.hasAvailability && b.hasAvailability) return 1;
        return 0;
      });
    }
    
    // Aplicar paginación
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    
    return filtered.slice(startIndex, endIndex);
  }

  getAvailableCount() {
    return this.filteredProducts.filter(product => product.hasAvailability).length;
  }

  getUnavailableCount() {
    return this.filteredProducts.filter(product => !product.hasAvailability).length;
  }

  getTotalFilteredProducts() {
    let filtered = [...this.filteredProducts];
    
    // Aplicar los mismos filtros que en getFilteredProducts pero sin paginación
    if (this.availabilityFilter === 'available') {
      filtered = filtered.filter(product => product.hasAvailability);
    } else if (this.availabilityFilter === 'unavailable') {
      filtered = filtered.filter(product => !product.hasAvailability);
    }
    
    return filtered.length;
  }

  trackByProductId(index: number, product: Product) {
    return product.product_id;
  }

  getSortIcon() {
    switch (this.sortBy) {
      case 'name':
        return 'sort_by_alpha';
      case 'availability':
        return 'sort';
      default:
        return 'sort';
    }
  }

  getSortTooltip() {
    switch (this.sortBy) {
      case 'name':
        return this.translate('sortByAvailability');
      case 'availability':
        return this.translate('noSorting');
      default:
        return this.translate('sortByName');
    }
  }

  getSortLabel() {
    switch (this.sortBy) {
      case 'name':
        return this.translate('sortedByName');
      case 'availability':
        return this.translate('sortedByAvailability');
      default:
        return '';
    }
  }
  
  onPageChange(event: any) {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  resetPagination() {
    this.currentPage = 0;
  }

  onImageError(event: any) {
    // Si la imagen falla al cargar, usar imagen por defecto
    event.target.src = '/assets/images/products/por-defecto.png';
  }
}
