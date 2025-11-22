import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  ApplicationRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDividerModule } from '@angular/material/divider';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { PageHeader } from '../../shared/page-header/page-header';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { currentLangSignal, loadTranslations, ACTIVE_TRANSLATIONS } from '../../shared/lang/lang-store';
import { Router } from '@angular/router';
import { ProductsService, Product as BackendProduct } from '../../services/products.service';
import { OfferService, CreateSalesPlanPayload } from '../../services/offer.service';

interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  goal?: number;
}

@Component({
  selector: 'app-sales-plan',
  standalone: true,
  imports: [
    PageHeader,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatInputModule,
    MatExpansionModule,
    MatCheckboxModule,
    TranslatePipe,
  ],
  templateUrl: './sales-plan.html',
  styleUrls: ['./sales-plan.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesPlan {
  private readonly appRef = inject(ApplicationRef);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly productsService = inject(ProductsService);
  private readonly offerService = inject(OfferService);
  
  public readonly currentLangSignal = currentLangSignal;
  pageTitle = 'pageSalesPlanTitle';
  backRoute = '/dashboard';

  // Formulario reactivo
  salesPlanForm: FormGroup;

  // Opciones para los selectores
  regionOptions: { value: string; label?: string; labelKey: string }[] = [];
  quarterOptions: { value: string; labelKey: string }[] = [];

  // Productos (cargados desde backend)
  products: Product[] = [];

  // Imagen por defecto
  defaultImage = 'assets/images/products/por-defecto.png';

  // Función para convertir valores según el país
  // El backend devuelve valores en pesos colombianos (COP)
  private convertValue(value: number): number {
    const country = localStorage.getItem('userCountry') || 'CO';
    
    // Tasas de conversión actualizadas (el backend devuelve valores en COP)
    const rates: Record<string, number> = { 
      'CO': 1,           // Colombia - Sin conversión (ya está en pesos)
      'PE': 0.0014,      // Perú - COP a PEN (1 COP ≈ 0.0014 PEN)
      'EC': 0.00026,     // Ecuador - COP a USD (1 COP ≈ 0.00026 USD)
      'MX': 0.0047       // México - COP a MXN (1 COP ≈ 0.0047 MXN)
    };
    
    // No redondear aquí, dejar que el formateo maneje los decimales
    return value * (rates[country] || 1);
  }

  // Método para formatear precios con decimales apropiados (similar a productos y reportes)
  formatPrice(price: number): string {
    // Usar el formato de moneda con el símbolo correcto según el país
    const country = localStorage.getItem('userCountry') || 'CO';
    const currency = this.currencySymbol();

    // Formatear según el país
    const localeMap: Record<string, string> = {
      'CO': 'es-CO',
      'PE': 'es-PE',
      'EC': 'es-EC',
      'MX': 'es-MX'
    };

    const locale = localeMap[country] || 'es-CO';

    // Para valores muy pequeños, mostrar más decimales
    const minDigits = price < 1 ? 4 : 2;
    const maxDigits = price < 1 ? 4 : 2;

    const numberFormatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: minDigits,
      maximumFractionDigits: maxDigits
    }).format(price);

    // Unir el número con el código de moneda (por ejemplo, "1,234.00 COP")
    return `${numberFormatted} ${currency}`;
  }

  // Computed signal para obtener el símbolo de moneda según el país
  currencySymbol = computed(() => {
    const country = localStorage.getItem('userCountry') || 'CO';
    const symbols: Record<string, string> = { 
      'CO': 'COP', 
      'PE': 'PEN', 
      'EC': 'USD', 
      'MX': 'MXN' 
    };
    return symbols[country] || 'COP';
  });

  // Estados del selector de productos
  isProductSelectorOpen = false;
  selectedProducts: Product[] = [];
  // Señal para forzar recomputes cuando cambien metas/selecciones
  private selectedProductsVersion = signal(0);
  private formVersion = signal(0);
  productSearchFilter = signal('');
  sortBy = signal<'name' | 'price' | 'popularity'>('name');
  sortOrder = signal<'asc' | 'desc'>('asc');
  itemsPerPage = signal(10);
  currentPage = signal(1);
  
  // Estados del modal de meta
  showGoalModal = false;
  currentProduct: Product | null = null;
  goalValue = '';
  productStockError = signal<string | null>(null);
  validatingStock = signal<boolean>(false);

  // Modal de confirmación de creación
  showConfirmModal = false;

  // Estados del formulario
  saveStatus = signal<'idle' | 'saving' | 'success' | 'error'>('idle');
  formErrors = signal<Record<string, string>>({});
  
  // Almacenar meta editada manualmente
  private manualGoalValue = signal<number | null>(null);

  // Computed para validar si el formulario está completo (región + período + metas > 0)
  isFormValid = computed(() => {
    // Leer versión para que este cómputo reaccione a cambios en metas/selecciones
    this.selectedProductsVersion();
    this.formVersion();
    const region = this.salesPlanForm.get('region')?.value;
    const quarter = this.salesPlanForm.get('quarter')?.value;
    // Considera metas en cualquier producto (seleccionado o no)
    const hasUnits = this.products.some(p => (p.goal || 0) > 0);
    return !!region && !!quarter && hasUnits;
  });

  // Computed para filtrar, ordenar y paginar productos
  filteredProducts = computed(() => {
    const filter = this.productSearchFilter().trim();
    let filtered = this.products;
    
    // Aplicar filtro de búsqueda
    if (filter) {
      const filterLower = filter.toLowerCase();
      filtered = this.products.filter(product => 
        product.name.toLowerCase().includes(filterLower)
      );
    }
    
    // Aplicar ordenamiento
    const sortByValue = this.sortBy();
    const sortOrderValue = this.sortOrder();
    
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortByValue) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'popularity':
          // Simular popularidad basada en el ID (en un caso real vendría de datos)
          comparison = parseInt(a.id) - parseInt(b.id);
          break;
      }
      
      return sortOrderValue === 'desc' ? -comparison : comparison;
    });
    
    return filtered;
  });

  // Computed para productos paginados
  paginatedProducts = computed(() => {
    const allFiltered = this.filteredProducts();
    const page = this.currentPage();
    const perPage = this.itemsPerPage();
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    
    return allFiltered.slice(startIndex, endIndex);
  });

  // Computed para información de paginación
  paginationInfo = computed(() => {
    const total = this.filteredProducts().length;
    const perPage = this.itemsPerPage();
    const current = this.currentPage();
    const totalPages = Math.ceil(total / perPage);
    
    return {
      total,
      current,
      totalPages,
      startItem: (current - 1) * perPage + 1,
      endItem: Math.min(current * perPage, total)
    };
  });

  // Paginación adaptable con elipsis (sin placeholders negativos)
  visiblePages = computed(() => {
    const total = this.paginationInfo().totalPages;
    const current = this.paginationInfo().current;
    const maxButtons = 9; // máximo de elementos (números y elipsis)

    const result: (number | string)[] = [];
    if (total <= maxButtons) {
      for (let i = 1; i <= total; i++) result.push(i);
      return result;
    }

    result.push(1);

    const windowSize = 5; // cantidad de páginas alrededor de la actual
    let start = Math.max(2, current - Math.floor(windowSize / 2));
    let end = Math.min(total - 1, current + Math.floor(windowSize / 2));

    // Ajuste si ventana toca bordes
    if (current <= 3) {
      start = 2;
      end = 2 + windowSize - 1;
    } else if (current >= total - 2) {
      end = total - 1;
      start = end - (windowSize - 1);
    }

    if (start > 2) result.push('…');
    for (let p = start; p <= end; p++) result.push(p);
    if (end < total - 1) result.push('…');

    result.push(total);
    return result.slice(0, maxButtons);
  });

  constructor() {
    this.salesPlanForm = this.fb.group({
      product: ['', Validators.required],
      region: ['', Validators.required],
      quarter: ['', Validators.required],
      totalGoal: [''], // se calcula automáticamente con unidades x precio
    });

    // Cargar productos disponibles desde backend
    this.loadAvailableProducts();

    // Cargar catálogos desde Offer (8082)
    this.loadCatalogs();

    // Reactivar validación cuando cambien región o período
    this.salesPlanForm.get('region')?.valueChanges.subscribe(() => {
      this.formVersion.set(this.formVersion() + 1);
    });
    this.salesPlanForm.get('quarter')?.valueChanges.subscribe(() => {
      this.formVersion.set(this.formVersion() + 1);
    });
  }

  private loadCatalogs() {
    // Regiones
    this.offerService.getRegions().subscribe({
      next: (regions) => {
        // Backend retorna [{ value:'Norte', label:'Norte' }, ...]
        const safe = Array.isArray(regions) ? regions : [];
        // Usar el label directamente del backend
        this.regionOptions = safe.map(r => ({ 
          value: String(r.value), 
          label: String(r.label || r.value), // Label directo del backend
          labelKey: `region_${String(r.value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}` // Clave sin acentos para traducción
        }));
      },
      error: () => {
        // Fallback local
        this.regionOptions = [
          { value: 'norte', labelKey: 'region_norte' },
          { value: 'centro', labelKey: 'region_centro' },
          { value: 'sur', labelKey: 'region_sur' },
          { value: 'caribe', labelKey: 'region_caribe' },
          { value: 'pacifico', labelKey: 'region_pacifico' },
        ];
      }
    });

    // Períodos
    this.offerService.getQuarters().subscribe({
      next: (quarters) => {
        const safe = Array.isArray(quarters) ? quarters : [];
        // Backend retorna [{ value:'Q1', label:'Q1 - ...'}, ...]
        this.quarterOptions = safe.map(q => ({ value: String(q.value), labelKey: `quarter_${String(q.value).toLowerCase()}` }));
      },
      error: () => {
        this.quarterOptions = [
          { value: 'Q1', labelKey: 'quarter_q1' },
          { value: 'Q2', labelKey: 'quarter_q2' },
          { value: 'Q3', labelKey: 'quarter_q3' },
          { value: 'Q4', labelKey: 'quarter_q4' },
        ];
      }
    });
  }

  private loadAvailableProducts() {
    // Usa /products/available (ProductsService.getAvailableProducts)
    console.log('🛒 SalesPlan: Cargando productos disponibles desde el backend...');
    this.productsService.getAvailableProducts(1).subscribe({
      next: (resp) => {
        console.log('🛒 SalesPlan: Respuesta recibida:', resp);
        const list = (resp.products || []) as unknown as BackendProduct[];
        this.products = list.map((p: any) => {
          // Usar product_id directamente como string para mantener el ID numérico del backend
          const productId = String(p.product_id ?? p.id ?? p.sku ?? '0');
          return {
            id: productId, // String con el product_id del backend (ej: "1", "37", "190")
            name: p.name,
            price: Number(p.value) || 0,
            image: p.image_url || undefined,
          };
        });
        console.log('🛒 SalesPlan: Productos mapeados:', this.products.length);
        console.log('🛒 SalesPlan: Primeros 3 productos con IDs:', this.products.slice(0, 3).map(p => ({ id: p.id, name: p.name, id_as_number: Number(p.id) })));

        // Forzar detección de cambios en caso de que no se actualice de inmediato
        this.appRef.tick();
      },
      error: () => {
        console.error('🛒 SalesPlan: Error cargando productos.');
        // Mantener lista vacía si falla (botón quedará deshabilitado hasta seleccionar productos)
        this.products = [];
        this.appRef.tick();
      },
    });
  }

  onTotalGoalChange(totalGoal: string) {
    this.salesPlanForm.get('totalGoal')?.setValue(totalGoal);
    
    // Extraer el valor numérico del string (remover símbolos de moneda y comas)
    const numericValue = this.extractNumericValue(totalGoal);
    if (!isNaN(numericValue) && numericValue > 0) {
      this.manualGoalValue.set(numericValue);
    }
  }
  
  private extractNumericValue(formattedValue: string): number {
    // Remover símbolos de moneda comunes, comas y espacios
    // Remover: $, S/, coma, espacios
    const cleaned = formattedValue
      .replace(/S\//g, '')      // Remover S/ específicamente primero
      .replace(/[$,\s]/g, '');   // Luego remover $, comas y espacios
    return parseFloat(cleaned) || 0;
  }

  toggleProductSelector() {
    this.isProductSelectorOpen = !this.isProductSelectorOpen;
  }

  selectProduct(product: Product) {
    const index = this.selectedProducts.findIndex(p => p.id === product.id);
    if (index > -1) {
      // Si ya está seleccionado, lo removemos
      this.selectedProducts.splice(index, 1);
    } else {
      // Si no está seleccionado, lo agregamos
      this.selectedProducts.push(product);
    }
    this.updateTotalGoalFromProducts();
    this.selectedProductsVersion.set(this.selectedProductsVersion() + 1);
  }

  isProductSelected(product: Product): boolean {
    return this.selectedProducts.some(p => p.id === product.id);
  }

  getSelectedProductsText(): string {
    if (this.selectedProducts.length === 0) {
      return 'select_products';
    } else if (this.selectedProducts.length === 1) {
      return this.selectedProducts[0].name;
    } else {
      return `${this.selectedProducts.length} products_selected`;
    }
  }

  setProductGoal(product: Product, event: Event) {
    event.stopPropagation();
    this.currentProduct = product;
    this.goalValue = product.goal ? product.goal.toString() : '';
    this.productStockError.set(null); // Limpiar error anterior
    console.log('🎯 SalesPlan: Modal abierto para producto:', {
      id: product.id,
      name: product.name,
      id_type: typeof product.id,
      id_as_number: Number(product.id)
    });
    this.showGoalModal = true;
  }

  saveGoal(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    console.log('🎯 SalesPlan: ===== MÉTODO saveGoal() LLAMADO =====');
    console.log('🎯 SalesPlan: currentProduct:', this.currentProduct);
    console.log('🎯 SalesPlan: goalValue:', this.goalValue);
    console.log('🎯 SalesPlan: goalValue type:', typeof this.goalValue);
    console.log('🎯 SalesPlan: goalValue number:', Number(this.goalValue));
    console.log('🎯 SalesPlan: Validaciones:', {
      hasCurrentProduct: !!this.currentProduct,
      hasGoalValue: !!this.goalValue,
      goalValueString: String(this.goalValue),
      isNumber: !isNaN(Number(this.goalValue)),
      isPositive: Number(this.goalValue) > 0,
      allConditions: !!(this.currentProduct && this.goalValue && !isNaN(Number(this.goalValue)) && Number(this.goalValue) > 0)
    });
    
    // IMPORTANTE: NUNCA asignar meta sin validar stock
    // La validación de stock es OBLIGATORIA antes de asignar cualquier meta
    if (this.currentProduct && this.goalValue && !isNaN(Number(this.goalValue)) && Number(this.goalValue) > 0) {
      // Convertir el ID del producto (que es string del product_id del backend) a número
      const productId = parseInt(this.currentProduct.id, 10);
      const individualGoal = Number(this.goalValue);
      
      // Verificar que el productId sea válido
      if (isNaN(productId) || productId <= 0) {
        console.error('❌ SalesPlan: Product ID inválido:', {
          originalId: this.currentProduct.id,
          parsedId: productId,
          product: this.currentProduct
        });
        this.productStockError.set('Error: ID de producto inválido');
        return;
      }
      
      // Logs en el componente
      console.log('🎯 SalesPlan: ===== INICIANDO VALIDACIÓN DE META =====');
      console.log('🎯 SalesPlan: Producto actual:', this.currentProduct);
      console.log('🎯 SalesPlan: ID del producto (string):', this.currentProduct.id);
      console.log('🎯 SalesPlan: ID del producto (number):', productId);
      console.log('🎯 SalesPlan: Meta ingresada (string):', this.goalValue);
      console.log('🎯 SalesPlan: Meta ingresada (number):', individualGoal);
      console.log('🎯 SalesPlan: Tipos:', {
        productIdType: typeof productId,
        individualGoalType: typeof individualGoal,
        originalIdType: typeof this.currentProduct.id,
        goalValueType: typeof this.goalValue
      });
      console.log('🎯 SalesPlan: URL esperada:', `https://r1kyo276f3.execute-api.us-east-1.amazonaws.com/prod/products/${productId}/validate-stock?individual_goal=${individualGoal}`);
      console.log('🎯 SalesPlan: =======================================');
      
      // Validar stock antes de asignar la meta
      this.validatingStock.set(true);
      this.productStockError.set(null);
      
      console.log('🎯 SalesPlan: Llamando a validateStock con:', { productId, individualGoal });
      
      this.offerService.validateStock(productId, individualGoal).subscribe({
        next: (response) => {
          console.log('🎯 SalesPlan: ===== RESPUESTA RECIBIDA EN COMPONENTE =====');
          console.log('🎯 SalesPlan: Respuesta:', response);
          console.log('🎯 SalesPlan: response.valid:', response.valid);
          console.log('🎯 SalesPlan: response.message:', response.message);
          console.log('🎯 SalesPlan: response.available_stock:', response.available_stock);
          console.log('🎯 SalesPlan: ============================================');
          
          this.validatingStock.set(false);
          
          if (response.valid === true) {
            console.log('✅ SalesPlan: Stock válido, asignando meta...');
            // Stock válido, asignar la meta SOLO si valid es explícitamente true
            this.currentProduct!.goal = individualGoal;
            // Asegurar que el producto con meta quede seleccionado
            const exists = this.selectedProducts.some(p => p.id === this.currentProduct!.id);
            if (!exists) {
              this.selectedProducts.push(this.currentProduct!);
            }
            // Reset manual value cuando se recalcula automáticamente
            this.manualGoalValue.set(null);
            this.updateTotalGoalFromProducts();
            this.selectedProductsVersion.set(this.selectedProductsVersion() + 1);
            this.productStockError.set(null);
            this.closeGoalModal();
            console.log('✅ SalesPlan: Meta asignada exitosamente');
          } else {
            console.warn('⚠️ SalesPlan: Stock insuficiente según respuesta');
            // Stock insuficiente
            const availableStock = response.available_stock !== undefined ? response.available_stock : 'N/A';
            const reason = response.message || 'Stock insuficiente';
            // Mostrar mensaje conciso sin duplicar información
            if (reason.includes('Solicitado') || reason.includes('Disponible')) {
              this.productStockError.set(reason);
            } else if (availableStock !== 'N/A') {
              this.productStockError.set(
                `${reason}\nSolicitado: ${individualGoal} unidades\nDisponible: ${availableStock} unidades`
              );
            } else {
              this.productStockError.set(reason);
            }
          }
        },
        error: (error) => {
          console.error('🎯 SalesPlan: ===== ERROR EN COMPONENTE =====');
          console.error('🎯 SalesPlan: Error recibido:', error);
          console.error('🎯 SalesPlan: Error.message:', error?.message);
          console.error('🎯 SalesPlan: Error.error:', error?.error);
          console.error('🎯 SalesPlan: Error disponible:', error?.available_stock);
          console.error('🎯 SalesPlan: ================================');
          
          this.validatingStock.set(false);
          // IMPORTANTE: Si hay un error en la validación, NO asignar la meta
          // El error indica que NO hay suficiente stock o que hubo un problema con la validación
          const availableStock = error?.available_stock !== undefined ? error.available_stock : 'N/A';
          const reason = error?.message || error?.error?.message || 'No hay suficiente stock disponible';
          // Mostrar mensaje conciso sin duplicar información
          if (reason.includes('Solicitado') || reason.includes('Disponible')) {
            this.productStockError.set(reason);
          } else if (availableStock !== 'N/A') {
            this.productStockError.set(
              `${reason}\nSolicitado: ${individualGoal} unidades\nDisponible: ${availableStock} unidades`
            );
          } else {
            this.productStockError.set(reason);
          }
          // NO asignar la meta cuando hay error
          console.error('❌ SalesPlan: NO se asignará la meta debido al error en la validación');
        }
      });
    } else {
      console.warn('⚠️ SalesPlan: Validación fallida antes de enviar:', {
        currentProduct: !!this.currentProduct,
        goalValue: this.goalValue,
        isNumber: !isNaN(Number(this.goalValue)),
        isPositive: Number(this.goalValue) > 0
      });
    }
  }

  private updateTotalGoalFromProducts(): void {
    const totalValue = this.selectedProducts.reduce((sum, p) => {
      const units = p.goal || 0;
      const unitPrice = this.convertValue(p.price);
      return sum + (units * unitPrice);
    }, 0);
    const formatted = `${this.currencySymbol()} ${totalValue.toLocaleString()}`;
    this.salesPlanForm.get('totalGoal')?.setValue(formatted, { emitEvent: false });
  }

  closeGoalModal() {
    this.showGoalModal = false;
    this.currentProduct = null;
    this.goalValue = '';
    this.productStockError.set(null);
    this.validatingStock.set(false);
  }

  clearProductFilter() {
    this.productSearchFilter.set('');
  }

  onSearchChange(value: string) {
    this.productSearchFilter.set(value);
    this.currentPage.set(1); // Reset a la primera página al buscar
  }

  // Métodos para ordenamiento
  setSortBy(sortBy: 'name' | 'price' | 'popularity') {
    this.sortBy.set(sortBy);
  }

  toggleSortOrder() {
    this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
  }

  // Métodos para paginación
  setItemsPerPage(items: number) {
    this.itemsPerPage.set(items);
    this.currentPage.set(1); // Reset a la primera página
  }

  goToPage(page: number) {
    const totalPages = this.paginationInfo().totalPages;
    if (page >= 1 && page <= totalPages) {
      this.currentPage.set(page);
    }
  }

  nextPage() {
    const totalPages = this.paginationInfo().totalPages;
    if (this.currentPage() < totalPages) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }

  previousPage() {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }

  getProductImage(product: Product): string {
    if (product.image) {
      return product.image;
    }
    return this.defaultImage;
  }

  onImageError(event: any, product: Product) {
    // Si la imagen falla al cargar, usar la imagen por defecto
    event.target.src = this.defaultImage;
  }

  // Método para obtener el precio convertido de un producto
  getConvertedPrice(product: Product): number {
    return this.convertValue(product.price);
  }

  // Productos con meta > 0
  plannedProducts = computed(() => this.products.filter(p => (p.goal || 0) > 0));

  // Valor calculado automáticamente (suma de productos x unidades)
  calculatedTotalValue = computed(() => {
    return this.plannedProducts().reduce((sum, p) => sum + (this.convertValue(p.price) * (p.goal || 0)), 0);
  });

  // Resumen monetario total (usa valor manual si existe, sino calcula)
  totalPlannedValue = computed(() => {
    const manualValue = this.manualGoalValue();
    if (manualValue !== null) {
      return manualValue;
    }
    return this.calculatedTotalValue();
  });

  // Validar si el valor manual está dentro del rango permitido
  // Rango permitido: entre 10% menor y 20% mayor que el calculado
  isGoalValid = computed(() => {
    const manualValue = this.manualGoalValue();
    const calculatedValue = this.calculatedTotalValue();
    
    // Si no hay valor manual, es válido (usa el calculado)
    if (manualValue === null || calculatedValue === 0) {
      return true;
    }
    
    // Calcular los límites: 10% menor y 20% mayor
    const minAllowed = calculatedValue * 0.90;  // 10% menos
    const maxAllowed = calculatedValue * 1.20;  // 20% más
    
    // Validar que esté dentro del rango
    return manualValue >= minAllowed && manualValue <= maxAllowed;
  });

  // Abrir confirmación antes de crear
  openConfirm() {
    if (!this.isFormValid()) return;
    this.showConfirmModal = true;
  }

  cancelConfirm() {
    this.showConfirmModal = false;
  }

  clearError(field: string) {
    const errors = { ...this.formErrors() };
    delete errors[field];
    this.formErrors.set(errors);
  }

  validateField(fieldName: string) {
    const field = this.salesPlanForm.get(fieldName);
    if (field && field.invalid && field.touched) {
      // Guardar la clave de traducción en lugar del texto hardcodeado
      this.formErrors.set({
        ...this.formErrors(),
        [fieldName]: 'fieldRequired'
      });
    } else {
      this.clearError(fieldName);
    }
  }

  createSalesPlan() {
    if (this.isFormValid()) {
      this.saveStatus.set('saving');
      
      // Preparar datos del plan de venta
      const totalUnits = this.products.reduce((sum, p) => sum + (p.goal || 0), 0);
      const totalValue = this.products.reduce((sum, p) => sum + ((p.goal || 0) * this.convertValue(p.price)), 0);
      
      // Usar valor manual si existe, sino usar el calculado
      const manualValue = this.manualGoalValue();
      const finalTotalGoal = manualValue !== null ? manualValue : totalValue;
      
      // Productos con meta > 0
      const productsWithGoals = this.products.filter(p => (p.goal || 0) > 0);
      
      const salesPlanData = {
        region: this.salesPlanForm.get('region')?.value, // 'Norte', 'Centro', ...
        quarter: this.salesPlanForm.get('quarter')?.value, // 'Q1'..'Q4'
        year: new Date().getFullYear(),
        total_goal: finalTotalGoal, // valor monetario de la meta total (manual o calculado)
        products: productsWithGoals.map(p => {
          // Convertir la meta de unidades a valor monetario para que la comparación
          // en el reporte de cumplimiento sea correcta (valor monetario vs valor monetario)
          const units = p.goal || 0;
          const unitPrice = this.convertValue(p.price);
          const goalValue = units * unitPrice;
          
          return {
            product_id: Number(p.id) || 0,
            individual_goal: goalValue // valor monetario (unidades × precio)
          };
        })
      };
      
      console.log('Plan de venta a enviar:', salesPlanData);

      const payload: CreateSalesPlanPayload = salesPlanData;

      this.offerService.createSalesPlan(payload).subscribe({
        next: (resp) => {
          const ok = !!resp && (resp as any).success === true || typeof (resp as any)?.plan_id !== 'undefined';
          this.saveStatus.set(ok ? 'success' : 'error');
          this.showConfirmModal = false;
          // Limpiar errores de stock si todo salió bien
          this.clearError('stock');
          // No redirigir automáticamente; permanecer en la página
        },
        error: () => {
          this.saveStatus.set('error');
          this.showConfirmModal = false;
        }
      });
    }
  }

  getErrorMessage(fieldName: string): string {
    // Acceder al signal del idioma para reactividad
    currentLangSignal();
    
    const errorKey = this.formErrors()[fieldName];
    if (!errorKey) return '';
    
    // Si es una clave de traducción, devolver el texto traducido
    // Si no existe la traducción, devolver la clave como fallback
    return ACTIVE_TRANSLATIONS[errorKey] || errorKey;
  }
}
