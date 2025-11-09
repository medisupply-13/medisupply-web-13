import { Component, signal, inject, OnInit, ViewChild, AfterViewInit, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { FormsModule } from '@angular/forms';
import { PageHeader } from '../../../shared/page-header/page-header';
import { StatusMessage } from '../../../shared/status-message/status-message';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { Router, ActivatedRoute } from '@angular/router';
import { FileValidationService, ValidationResult } from '../../../services/file-validation.service';
import { ProductsService, Product } from '../../../services/products.service';
import { ConfirmDialog } from './confirm-dialog.component';
import { EditProductDialog } from './edit-product-dialog.component';
import { AddProductDialog } from './add-product-dialog.component';
import { ACTIVE_TRANSLATIONS } from '../../../shared/lang/lang-store';


interface UploadedFile {
  id: string;
  file: File;
  isValid: boolean;
  errorMessage?: string;
  progress: number;
  validationResult?: ValidationResult;
}

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatCardModule,
    MatChipsModule,
    MatMenuModule,
    MatDividerModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatPaginatorModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSortModule,
    FormsModule,
    PageHeader,
    StatusMessage,
    TranslatePipe
  ],
  templateUrl: './product-list.html',
  styleUrls: ['./product-list.css']
})
export class ProductList implements OnInit, AfterViewInit {
  pageTitle = 'pageProductListTitle';
  backRoute = '/dashboard';

  // Estados para la funcionalidad de carga
  showUploadSection = signal(false);
  uploadedFiles = signal<UploadedFile[]>([]);
  isUploading = signal(false);
  showSuccessMessage = signal(false);
  showErrorMessage = signal(false);
  errorMessage = signal('');
  isLoading = signal(false);

  private readonly allowedTypes = ['.csv', '.xlsx'];
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB

  // Propiedades para paginación
  pageSize = 10;
  pageIndex = 0;
  totalProducts = signal(0);

  // Productos desde el servicio real
  products = signal<Product[]>([]);
  
  // DataSource para la tabla con ordenamiento
  dataSource = new MatTableDataSource<Product>([]);

  // Referencias a MatSort y MatPaginator
  @ViewChild(MatSort, { static: false }) sort!: MatSort;
  @ViewChild(MatPaginator, { static: false }) paginator!: MatPaginator;

  displayedColumns: string[] = [
    'sku',
    'name',
    'value',
    'category_name',
    'total_quantity',
    'actions'
  ];

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  private fileValidationService = inject(FileValidationService);
  private productsService = inject(ProductsService);
  private dialog = inject(MatDialog);

  /**
   * Obtiene una traducción por su clave
   */
  private translate(key: string): string {
    return ACTIVE_TRANSLATIONS[key] || key;
  }

  // Categorías disponibles para los productos
  availableCategories = ['Categoría A', 'Categoría B', 'Categoría C', 'Medicamentos', 'Equipos', 'Suministros'];
  
  // Unidades de medida disponibles
  availableUnits = ['unidad', 'kg', 'litro', 'ml', 'mg', 'g', 'caja', 'paquete'];
  
  // Parámetros de filtro
  selectedCityId: number | null = null;
  selectedWarehouseId: number | null = null;

  constructor() {
    // Los productos se cargarán en ngOnInit
    // Configurar función de ordenamiento personalizada para columnas especiales
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'value':
          return item.value || 0;
        case 'total_quantity':
          return item.total_quantity || 0;
        case 'category_name':
          return item.category_name || '';
        default:
          return (item as any)[property] || '';
      }
    };
  }

  ngOnInit(): void {
    // Limpiar cualquier dato residual
    this.products.set([]);
    this.totalProducts.set(0);
    this.dataSource.data = [];
    
    // Obtener parámetros de la URL
    this.route.queryParams.subscribe(params => {
      this.selectedCityId = params['cityId'] ? +params['cityId'] : null;
      this.selectedWarehouseId = params['warehouseId'] ? +params['warehouseId'] : null;
      
      console.log('🔍 ProductList: Parámetros de URL recibidos:');
      console.log('🏙️ ProductList: Ciudad ID:', this.selectedCityId);
      console.log('🏢 ProductList: Bodega ID:', this.selectedWarehouseId);
      
      // Cargar productos según los parámetros
      this.loadProducts();
    });
  }

  ngAfterViewInit(): void {
    // Conectar el MatSort y MatPaginator con el DataSource
    this.connectSortAndPaginator();
  }

  /**
   * Conecta el MatSort y MatPaginator con el DataSource
   */
  private connectSortAndPaginator(): void {
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
  }

  /**
   * Carga los productos desde el servicio
   */
  loadProducts(): void {
    this.isLoading.set(true);
    this.showErrorMessage.set(false);
    
    console.log('🔄 ProductList: Iniciando carga de productos desde el backend...');
    console.log('🏢 ProductList: Bodega seleccionada:', this.selectedWarehouseId);
    
    // Cargar siempre productos activos (sin filtrar por ciudad)
    console.log('🟢 ProductList: Cargando productos activos (sin filtro de ciudad)');
    const productsObservable = this.productsService.getAvailableProducts();
    
    productsObservable.subscribe({
      next: (response) => {
        console.log('✅ ProductList: Productos cargados exitosamente:', response);
        console.log('📊 ProductList: Cantidad de productos recibidos:', response?.products?.length || 0);
        console.log('🔍 ProductList: Estructura completa de la respuesta:', JSON.stringify(response, null, 2));
        
        const products = response.products || [];
        console.log('📦 ProductList: Productos individuales:', products);
        
        this.products.set(products);
        this.totalProducts.set(response.total || products.length);
        
        // Actualizar el DataSource con los productos
        this.dataSource.data = products;
        
        this.isLoading.set(false);
        
        // Reconectar Sort y Paginator DESPUÉS de que isLoading sea false
        // para asegurar que la tabla esté visible en el DOM
        setTimeout(() => {
          this.connectSortAndPaginator();
          
          // Verificar que el sort esté conectado
          if (this.sort) {
            console.log('🔍 Sort conectado:', this.dataSource.sort !== null);
            console.log('🔍 Sort activo:', this.dataSource.sort?.active);
          } else {
            console.warn('⚠️ Sort no encontrado en ViewChild');
          }
          
          // Actualizar configuración del paginator si está disponible
          if (this.paginator) {
            this.paginator.length = response.total || products.length;
            this.paginator.pageSize = this.pageSize;
          }
        }, 100);
        
        if (products.length === 0) {
          console.log('⚠️ ProductList: No hay productos en el backend');
          this.snackBar.open(this.translate('noProductsInSystem'), this.translate('closeButton'), {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top'
          });
        } else {
          console.log('✅ ProductList: Mostrando', products.length, 'productos del backend');
        }
      },
      error: (error) => {
        console.error('❌ ProductList: Error al cargar productos:', error);
        this.isLoading.set(false);
        this.showErrorMessage.set(true);
        this.errorMessage.set('errorLoadingProducts');
        this.snackBar.open(this.translate('errorLoadingProducts'), this.translate('closeButton'), {
          duration: 5000,
          horizontalPosition: 'end',
          verticalPosition: 'top'
        });
      }
    });
  }

  toggleUploadSection(): void {
    this.showUploadSection.set(!this.showUploadSection());
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      Array.from(input.files).forEach(file => this.processFile(file));
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files) {
      Array.from(files).forEach(file => this.processFile(file));
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  private processFile(file: File): void {
    // Validar tipo de archivo
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!this.allowedTypes.includes(fileExtension)) {
      this.showError('uploadInvalidFormat');
      return;
    }

    // Validar tamaño
    if (file.size > this.maxFileSize) {
      this.showError('uploadFileTooLarge');
      return;
    }

    // Crear objeto de archivo
    const uploadedFile: UploadedFile = {
      id: this.generateId(),
      file,
      isValid: true,
      progress: 0
    };

    // Simular validación del archivo
    this.validateFileContent(uploadedFile);

    // Agregar a la lista
    this.uploadedFiles.update(files => [...files, uploadedFile]);
  }

  private async validateFileContent(file: UploadedFile): Promise<void> {
    try {
      file.progress = 25;
      
      let validationResult: ValidationResult;
      
      // Primera validación: estructura del archivo
      if (file.file.name.toLowerCase().endsWith('.csv')) {
        validationResult = await this.fileValidationService.validateCSVFile(file.file);
      } else if (file.file.name.toLowerCase().endsWith('.xlsx')) {
        validationResult = await this.fileValidationService.validateXLSXFile(file.file);
      } else {
        validationResult = {
          isValid: false,
          errors: ['Formato de archivo no soportado'],
          warnings: []
        };
      }
      
      file.progress = 50;
      
      // Segunda validación: contra productos existentes (solo si la primera pasó)
      if (validationResult.isValid && validationResult.data) {
        const dbValidationResult = await this.fileValidationService.validateAgainstExistingProducts(validationResult.data, file.file);
        
        // Combinar resultados
        validationResult.errors = [...validationResult.errors, ...dbValidationResult.errors];
        validationResult.warnings = [...validationResult.warnings, ...dbValidationResult.warnings];
        validationResult.isValid = validationResult.errors.length === 0;
      }
      
      file.validationResult = validationResult;
      file.isValid = validationResult.isValid;
      file.progress = 100;
      
      if (!validationResult.isValid) {
        file.errorMessage = validationResult.errors.join('; ');
      }
      
    } catch (error) {
      file.isValid = false;
      file.errorMessage = 'Error al validar el archivo';
      file.progress = 100;
    }
  }

  removeFile(fileId: string): void {
    this.uploadedFiles.update(files => 
      files.filter(file => file.id !== fileId)
    );
  }

  downloadTemplate(): void {
    // Usar el método que obtiene datos reales del backend
    this.fileValidationService.generateTemplateCSVWithRealData().then(csvContent => {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'plantilla_productos.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      this.snackBar.open(this.translate('templateDownloadedRealData'), this.translate('closeButton'), {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });
    }).catch(error => {
      console.error('Error al generar plantilla:', error);
      // Fallback al método síncrono en caso de error
      const csvContent = this.fileValidationService.generateTemplateCSV();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'plantilla_productos.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  async uploadProducts(): Promise<void> {
    const validFiles = this.uploadedFiles().filter(file => file.isValid);
    
    if (validFiles.length === 0) {
      this.showError('uploadNoValidFiles');
      return;
    }

    this.isUploading.set(true);
    this.showSuccessMessage.set(false);
    this.showErrorMessage.set(false);

    try {
      console.log(`🔄 ProductList: Procesando ${validFiles.length} archivos válidos...`);
      
      // Procesar cada archivo válido: si ya pasó validación, insertar
      for (const file of validFiles) {
        if (file.validationResult?.data) {
          console.log(`📤 ProductList: Insertando productos del archivo ${file.file.name}...`);
          
          try {
            // Inserción final usando endpoint /insert
            console.log(`📊 ProductList: Productos a insertar:`, file.validationResult.data.length);
            const result = await this.fileValidationService.insertValidatedProducts(file.validationResult.data);
            console.log(`✅ ProductList: Inserción completada para ${file.file.name}`);
            console.log(`📋 ProductList: Resultado del backend:`, result);
          } catch (error) {
            console.error(`❌ ProductList: Error enviando archivo ${file.file.name}:`, error);
            // Continuar con otros archivos aunque uno falle
          }
        }
      }
      
      // Esperar un momento para que el backend procese los datos
      console.log('⏳ ProductList: Esperando que el backend procese los datos...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 segundo de espera
      
      // Actualizar la tabla después de enviar todos los archivos
      console.log('🔄 ProductList: Actualizando tabla después de enviar archivos...');
      // Esperar un poco más para asegurar que los datos estén en el backend
      await new Promise(resolve => setTimeout(resolve, 500));
      this.loadProducts();
      
      this.isUploading.set(false);
      this.showSuccessMessage.set(true);
      
      // Mostrar mensaje de éxito
      this.addProductsFromFiles(validFiles);
      
      // Limpiar archivos cargados
      this.uploadedFiles.set([]);
      this.showUploadSection.set(false);
      
      // Ocultar mensaje de éxito después de 3 segundos
      setTimeout(() => {
        this.showSuccessMessage.set(false);
      }, 3000);
      
    } catch (error) {
      console.error('Error al procesar archivos:', error);
      this.isUploading.set(false);
      this.showError('uploadSystemError');
    }
  }

  private addProductsFromFiles(files: UploadedFile[]): void {
    // Mostrar mensaje de confirmación de carga exitosa
    const fileText = files.length === 1 
      ? `✅ ${files.length} ${this.translate('fileProcessedSingular')}`
      : `✅ ${files.length} ${this.translate('filesProcessedPlural')}`;
    this.snackBar.open(fileText, this.translate('closeButton'), {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }

  private showError(messageKey: string): void {
    this.errorMessage.set(messageKey);
    this.showErrorMessage.set(true);
    setTimeout(() => this.showErrorMessage.set(false), 5000);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  get hasValidFiles(): boolean {
    return this.uploadedFiles().some(file => file.isValid);
  }

  get validFilesCount(): number {
    return this.uploadedFiles().filter(file => file.isValid).length;
  }

  addProduct(): void {
    // Obtener categorías únicas de los productos existentes
    const categories = this.getUniqueCategories();
    
    const dialogRef = this.dialog.open(AddProductDialog, {
      width: '600px',
      data: {
        categories: categories.length > 0 ? categories : this.availableCategories
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.createProduct(result);
      }
    });
  }

  private getUniqueCategories(): string[] {
    const categoriesSet = new Set<string>();
    this.products().forEach(product => {
      if (product.category_name) {
        categoriesSet.add(product.category_name);
      }
    });
    return Array.from(categoriesSet).sort();
  }

  private createProduct(productData: Partial<Product> & { section?: string; aisle?: string; shelf?: string; level?: string }): void {
    this.isLoading.set(true);
    
    // Preparar los datos para el endpoint /products/insert
    const productToInsert: any = {
      sku: productData.sku!,
      name: productData.name!,
      value: productData.value!,
      category_name: productData.category_name!,
      quantity: productData.total_quantity || 0,
      warehouse_id: this.selectedWarehouseId || 1
    };

    // Incluir campos opcionales
    if (productData.image_url) {
      productToInsert.image_url = productData.image_url;
    }
    
    // IMPORTANTE: Incluir campos de ubicación siempre (incluso si están vacíos)
    // El backend espera estos campos cuando se envían desde CSV
    productToInsert.section = productData.section || '';
    productToInsert.aisle = productData.aisle || '';
    productToInsert.shelf = productData.shelf || '';
    productToInsert.level = productData.level || '';
    
    console.log('📦 ProductList: Datos completos a enviar al backend:', JSON.stringify(productToInsert, null, 2));
    console.log('📦 ProductList: Campos de ubicación:', {
      section: productToInsert.section,
      aisle: productToInsert.aisle,
      shelf: productToInsert.shelf,
      level: productToInsert.level
    });
    
    // Usar el servicio para insertar el producto
    this.productsService.insertProduct(productToInsert).subscribe({
      next: (result) => {
        console.log('✅ ProductList: Producto creado exitosamente:', result);
        this.snackBar.open(
          this.translate('productCreatedSuccess') || 'Producto creado exitosamente',
          this.translate('closeButton') || 'Cerrar',
          {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top'
          }
        );
        // Recargar la lista de productos
        this.loadProducts();
      },
      error: (error) => {
        console.error('❌ ProductList: Error al crear producto:', error);
        this.isLoading.set(false);
        let errorMessage = 'Error al crear el producto';
        
        // Extraer mensaje de error del response
        if (error?.error) {
          if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.error.message) {
            errorMessage = error.error.message;
          } else if (error.error.errors && Array.isArray(error.error.errors)) {
            errorMessage = error.error.errors.join(', ');
          } else if (error.error.error) {
            errorMessage = error.error.error;
          }
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        this.snackBar.open(
          errorMessage,
          this.translate('closeButton') || 'Cerrar',
          {
            duration: 5000,
            horizontalPosition: 'end',
            verticalPosition: 'top'
          }
        );
      }
    });
  }

  editProduct(product: Product): void {
    // Por ahora, mostrar mensaje de que la edición no está implementada
    this.snackBar.open(this.translate('editNotImplemented'), this.translate('closeButton'), {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }

  deleteProduct(product: Product): void {
    // Por ahora, mostrar mensaje de que la eliminación no está implementada
    this.snackBar.open(this.translate('deleteNotImplemented'), this.translate('closeButton'), {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }

  toggleProductStatus(product: Product): void {
    // Por ahora, mostrar mensaje de que el cambio de estado no está implementado
    this.snackBar.open(this.translate('statusChangeNotImplemented'), this.translate('closeButton'), {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }

  // Función para convertir valores según el país
  // El backend devuelve valores en pesos colombianos (COP)
  private convertValue(value: number): number {
    const country = localStorage.getItem('userCountry') || 'CO';
    
    // Tasas de conversión (el backend devuelve valores en COP)
    const rates: Record<string, number> = { 
      'CO': 1,           // Colombia - Sin conversión (ya está en pesos)
      'PE': 0.0014,      // Perú - COP a PEN (1 COP ≈ 0.0014 PEN)
      'EC': 0.00026,     // Ecuador - COP a USD (1 COP ≈ 0.00026 USD)
      'MX': 0.0047       // México - COP a MXN (1 COP ≈ 0.0047 MXN)
    };
    
    const rate = rates[country] || 1;
    return Math.round(value * rate);
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

  // Obtener el precio convertido según el país
  getConvertedPrice(product: Product): number {
    return this.convertValue(product.value);
  }

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
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }
}
