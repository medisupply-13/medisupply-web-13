import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { ProductList } from './product-list';
import { ProductsService, ProductsResponse, Product } from '../../../services/products.service';
import { FileValidationService, ValidationResult } from '../../../services/file-validation.service';

describe('ProductList', () => {
  let component: ProductList;
  let fixture: ComponentFixture<ProductList>;
  let productsService: jasmine.SpyObj<ProductsService>;
  let fileValidationService: jasmine.SpyObj<FileValidationService>;
  let router: jasmine.SpyObj<Router>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let activatedRoute: any;

  const mockProducts: Product[] = [
    {
      product_id: 1,
      sku: 'MED-001',
      name: 'Producto 1',
      value: 1000,
      category_name: 'Medicamentos',
      total_quantity: 50
    },
    {
      product_id: 2,
      sku: 'MED-002',
      name: 'Producto 2',
      value: 2000,
      category_name: 'Equipos',
      total_quantity: 30
    }
  ];

  const mockProductsResponse: ProductsResponse = {
    products: mockProducts,
    total: 2,
    success: true
  };

  beforeEach(async () => {
    const productsServiceSpy = jasmine.createSpyObj('ProductsService', [
      'getAvailableProducts',
      'getProductsByWarehouse',
      'insertProduct'
    ]);
    const fileValidationServiceSpy = jasmine.createSpyObj('FileValidationService', [
      'validateCSVFile',
      'validateXLSXFile',
      'validateAgainstExistingProducts',
      'generateTemplateCSV',
      'generateTemplateCSVWithRealData',
      'insertValidatedProducts',
      'validateSingleProduct'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    activatedRoute = {
      queryParams: of({})
    };

    await TestBed.configureTestingModule({
      imports: [
        ProductList,
        HttpClientTestingModule,
        BrowserAnimationsModule
      ],
      providers: [
        { provide: ProductsService, useValue: productsServiceSpy },
        { provide: FileValidationService, useValue: fileValidationServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: ActivatedRoute, useValue: activatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProductList);
    component = fixture.componentInstance;
    productsService = TestBed.inject(ProductsService) as jasmine.SpyObj<ProductsService>;
    fileValidationService = TestBed.inject(FileValidationService) as jasmine.SpyObj<FileValidationService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
    dialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;

    productsService.getAvailableProducts.and.returnValue(of(mockProductsResponse));
    productsService.getProductsByWarehouse.and.returnValue(of(mockProductsResponse));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have correct page title and back route', () => {
    expect(component.pageTitle).toBe('pageProductListTitle');
    expect(component.backRoute).toBe('/dashboard');
  });

  it('should initialize with default values', () => {
    expect(component.showUploadSection()).toBe(false);
    expect(component.uploadedFiles().length).toBe(0);
    expect(component.isUploading()).toBe(false);
    expect(component.isLoading()).toBe(false);
    expect(component.pageSize).toBe(10);
    expect(component.pageIndex).toBe(0);
  });

  describe('ngOnInit', () => {
    it('should load products on init', () => {
      activatedRoute.queryParams = of({});
      fixture.detectChanges();
      
      expect(productsService.getAvailableProducts).toHaveBeenCalledWith(1);
      expect(component.products().length).toBe(2);
    });

    it('should load products by city when cityId is provided', () => {
      activatedRoute.queryParams = of({ cityId: '2' });
      component.ngOnInit();
      fixture.detectChanges();
      
      expect(component.selectedCityId).toBe(2);
      expect(productsService.getAvailableProducts).toHaveBeenCalledWith(2);
    });

    it('should load products by warehouse when warehouseId is provided', () => {
      activatedRoute.queryParams = of({ warehouseId: '3' });
      component.ngOnInit();
      fixture.detectChanges();
      
      expect(component.selectedWarehouseId).toBe(3);
      expect(productsService.getProductsByWarehouse).toHaveBeenCalledWith(3);
    });

    it('should prioritize warehouse over city', () => {
      activatedRoute.queryParams = of({ cityId: '2', warehouseId: '3' });
      component.ngOnInit();
      fixture.detectChanges();
      
      expect(productsService.getProductsByWarehouse).toHaveBeenCalledWith(3);
      expect(productsService.getAvailableProducts).not.toHaveBeenCalled();
    });
  });

  describe('loadProducts', () => {
    it('should load products successfully', fakeAsync(() => {
      component.loadProducts();
      
      tick(150);
      expect(component.isLoading()).toBe(false);
      expect(component.products().length).toBe(2);
      expect(component.totalProducts()).toBe(2);
      expect(component.dataSource.data.length).toBe(2);
    }));

    it('should handle error when loading products', () => {
      productsService.getAvailableProducts.and.returnValue(
        throwError(() => new Error('Network error'))
      );
      
      component.loadProducts();
      
      expect(component.isLoading()).toBe(false);
      expect(component.showErrorMessage()).toBe(true);
      expect(snackBar.open).toHaveBeenCalled();
    });

    it('should show snackbar when no products found', fakeAsync(() => {
      const emptyResponse: ProductsResponse = {
        products: [],
        total: 0,
        success: true
      };
      productsService.getAvailableProducts.and.returnValue(of(emptyResponse));
      
      component.loadProducts();
      
      tick(150);
      expect(snackBar.open).toHaveBeenCalled();
    }));
  });

  describe('toggleUploadSection', () => {
    it('should toggle upload section visibility', () => {
      expect(component.showUploadSection()).toBe(false);
      
      component.toggleUploadSection();
      expect(component.showUploadSection()).toBe(true);
      
      component.toggleUploadSection();
      expect(component.showUploadSection()).toBe(false);
    });
  });

  describe('onFileSelected', () => {
    it('should process valid CSV file', async () => {
      const file = new File(['content'], 'test.csv', { type: 'text/csv' });
      const mockValidationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        data: []
      };
      
      fileValidationService.validateCSVFile.and.returnValue(Promise.resolve(mockValidationResult));
      fileValidationService.validateAgainstExistingProducts.and.returnValue(Promise.resolve(mockValidationResult));
      
      const event = {
        target: {
          files: [file]
        }
      } as any;
      
      component.onFileSelected(event);
      
      await fixture.whenStable();
      expect(component.uploadedFiles().length).toBe(1);
    });

    it('should reject invalid file type', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const event = {
        target: {
          files: [file]
        }
      } as any;
      
      component.onFileSelected(event);
      
      expect(component.uploadedFiles().length).toBe(0);
      expect(snackBar.open).toHaveBeenCalled();
    });

    it('should reject file that is too large', () => {
      const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'test.csv', { type: 'text/csv' });
      const event = {
        target: {
          files: [largeFile]
        }
      } as any;
      
      component.onFileSelected(event);
      
      expect(component.uploadedFiles().length).toBe(0);
    });
  });

  describe('onDrop', () => {
    it('should process dropped files', () => {
      const file = new File(['content'], 'test.csv', { type: 'text/csv' });
      const mockValidationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        data: []
      };
      
      fileValidationService.validateCSVFile.and.returnValue(Promise.resolve(mockValidationResult));
      fileValidationService.validateAgainstExistingProducts.and.returnValue(Promise.resolve(mockValidationResult));
      
      const event = {
        preventDefault: jasmine.createSpy('preventDefault'),
        dataTransfer: {
          files: [file]
        }
      } as any;
      
      component.onDrop(event);
      
      expect(event.preventDefault).toHaveBeenCalled();
    });
  });

  describe('removeFile', () => {
    it('should remove file from uploaded files', async () => {
      const file = new File(['content'], 'test.csv', { type: 'text/csv' });
      const mockValidationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        data: []
      };
      
      fileValidationService.validateCSVFile.and.returnValue(Promise.resolve(mockValidationResult));
      fileValidationService.validateAgainstExistingProducts.and.returnValue(Promise.resolve(mockValidationResult));
      
      const event = {
        target: {
          files: [file]
        }
      } as any;
      
      component.onFileSelected(event);
      
      await fixture.whenStable();
      const fileId = component.uploadedFiles()[0].id;
      
      component.removeFile(fileId);
      
      expect(component.uploadedFiles().length).toBe(0);
    });
  });

  describe('downloadTemplate', () => {
    it('should download template with real data', async () => {
      const mockCSV = 'sku,name,value\nMED-001,Producto 1,1000';
      fileValidationService.generateTemplateCSVWithRealData.and.returnValue(Promise.resolve(mockCSV));
      
      spyOn(document, 'createElement').and.callThrough();
      
      await component.downloadTemplate();
      
      expect(fileValidationService.generateTemplateCSVWithRealData).toHaveBeenCalled();
    });

    it('should fallback to generateTemplateCSV on error', async () => {
      const mockCSV = 'sku,name,value\nMED-001,Producto 1,1000';
      fileValidationService.generateTemplateCSVWithRealData.and.returnValue(
        Promise.reject(new Error('Error'))
      );
      fileValidationService.generateTemplateCSV.and.returnValue(mockCSV);
      
      await component.downloadTemplate();
      
      expect(fileValidationService.generateTemplateCSV).toHaveBeenCalled();
    });
  });

  describe('uploadProducts', () => {
    it('should upload valid files', async () => {
      const mockValidationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        data: [
          {
            sku: 'MED-003',
            name: 'Producto 3',
            value: 3000,
            category_name: 'Suministros',
            quantity: 100,
            warehouse_id: 1
          }
        ]
      };
      
      const file = new File(['content'], 'test.csv', { type: 'text/csv' });
      const uploadedFile = {
        id: '1',
        file: file,
        isValid: true,
        progress: 100,
        validationResult: mockValidationResult
      };
      
      component.uploadedFiles.set([uploadedFile]);
      fileValidationService.insertValidatedProducts.and.returnValue(
        Promise.resolve({ success: true })
      );
      productsService.getAvailableProducts.and.returnValue(of(mockProductsResponse));
      
      await component.uploadProducts();
      
      expect(component.isUploading()).toBe(false);
      expect(component.showSuccessMessage()).toBe(true);
      expect(component.uploadedFiles().length).toBe(0);
    });

    it('should not upload if no valid files', async () => {
      const file = new File(['content'], 'test.csv', { type: 'text/csv' });
      const uploadedFile = {
        id: '1',
        file: file,
        isValid: false,
        progress: 100
      };
      
      component.uploadedFiles.set([uploadedFile]);
      
      await component.uploadProducts();
      
      expect(snackBar.open).toHaveBeenCalled();
    });
  });

  describe('formatPrice', () => {
    it('should format price correctly', () => {
      const formatted = component.formatPrice(1000);
      expect(formatted).toContain('1');
      expect(formatted).toContain('COP');
    });
  });

  describe('formatFileSize', () => {
    it('should format file size correctly', () => {
      expect(component.formatFileSize(0)).toBe('0 Bytes');
      expect(component.formatFileSize(1024)).toContain('KB');
      expect(component.formatFileSize(1024 * 1024)).toContain('MB');
    });
  });

  describe('hasValidFiles', () => {
    it('should return true when there are valid files', () => {
      const file = new File(['content'], 'test.csv', { type: 'text/csv' });
      const uploadedFile = {
        id: '1',
        file: file,
        isValid: true,
        progress: 100
      };
      
      component.uploadedFiles.set([uploadedFile]);
      
      expect(component.hasValidFiles).toBe(true);
    });

    it('should return false when there are no valid files', () => {
      const file = new File(['content'], 'test.csv', { type: 'text/csv' });
      const uploadedFile = {
        id: '1',
        file: file,
        isValid: false,
        progress: 100
      };
      
      component.uploadedFiles.set([uploadedFile]);
      
      expect(component.hasValidFiles).toBe(false);
    });
  });

  describe('editProduct', () => {
    it('should show message that edit is not implemented', () => {
      component.editProduct(mockProducts[0]);
      
      expect(snackBar.open).toHaveBeenCalled();
    });
  });

  describe('deleteProduct', () => {
    it('should show message that delete is not implemented', () => {
      component.deleteProduct(mockProducts[0]);
      
      expect(snackBar.open).toHaveBeenCalled();
    });
  });

  describe('toggleProductStatus', () => {
    it('should show message that status change is not implemented', () => {
      component.toggleProductStatus(mockProducts[0]);
      
      expect(snackBar.open).toHaveBeenCalled();
    });
  });

  describe('onDragOver', () => {
    it('should prevent default behavior', () => {
      const event = {
        preventDefault: jasmine.createSpy('preventDefault')
      } as any;
      
      component.onDragOver(event);
      
      expect(event.preventDefault).toHaveBeenCalled();
    });
  });

  describe('ngAfterViewInit', () => {
    it('should connect sort and paginator after view init', () => {
      const connectSpy = spyOn(component as any, 'connectSortAndPaginator');
      
      component.ngAfterViewInit();
      
      expect(connectSpy).toHaveBeenCalled();
    });
  });

  describe('addProduct', () => {
    it('should open dialog and create product when result is provided', () => {
      const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRef.afterClosed.and.returnValue(of({
        sku: 'MED-003',
        name: 'Producto 3',
        value: 3000,
        category_name: 'Suministros',
        total_quantity: 50
      }));
      dialog.open.and.returnValue(dialogRef);

      const insertSpy = spyOn(productsService, 'insertProduct').and.returnValue(of({ success: true }));
      
      component.addProduct();
      
      expect(dialog.open).toHaveBeenCalled();
      expect(insertSpy).toHaveBeenCalled();
    });

    it('should not create product when dialog is closed without result', () => {
      const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRef.afterClosed.and.returnValue(of(null));
      dialog.open.and.returnValue(dialogRef);

      const createSpy = spyOn(component as any, 'createProduct');
      
      component.addProduct();
      
      expect(dialog.open).toHaveBeenCalled();
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('should use availableCategories when no products exist', () => {
      component.products.set([]);
      const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRef.afterClosed.and.returnValue(of(null));
      dialog.open.and.returnValue(dialogRef);
      
      component.addProduct();
      
      expect(dialog.open).toHaveBeenCalledWith(jasmine.any(Function), {
        width: '600px',
        data: {
          categories: component.availableCategories
        }
      });
    });
  });

  describe('getUniqueCategories', () => {
    it('should return unique categories from products', () => {
      component.products.set([
        { product_id: 1, sku: 'MED-001', name: 'Producto 1', value: 1000, category_name: 'Medicamentos', total_quantity: 50 },
        { product_id: 2, sku: 'MED-002', name: 'Producto 2', value: 2000, category_name: 'Equipos', total_quantity: 30 },
        { product_id: 3, sku: 'MED-003', name: 'Producto 3', value: 3000, category_name: 'Medicamentos', total_quantity: 20 }
      ]);
      
      const categories = (component as any).getUniqueCategories();
      
      expect(categories).toEqual(['Equipos', 'Medicamentos']);
    });

    it('should return empty array when no products', () => {
      component.products.set([]);
      
      const categories = (component as any).getUniqueCategories();
      
      expect(categories).toEqual([]);
    });
  });

  describe('createProduct', () => {
    it('should validate and create product successfully', async () => {
      const productData = {
        sku: 'MED-003',
        name: 'Producto 3',
        value: 3000,
        category_name: 'Suministros',
        total_quantity: 50,
        section: 'A',
        aisle: '1',
        shelf: '2',
        level: '3'
      };

      const validatedProduct = {
        sku: 'MED-003',
        name: 'Producto 3',
        value: 3000,
        category_name: 'Suministros',
        quantity: 50,
        warehouse_id: 1,
        section: 'A',
        aisle: '1',
        shelf: '2',
        level: '3'
      };

      const validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        data: [validatedProduct]
      };

      fileValidationService.validateSingleProduct.and.returnValue(Promise.resolve(validationResult));
      fileValidationService.insertValidatedProducts.and.returnValue(Promise.resolve({ success: true }));
      productsService.getAvailableProducts.and.returnValue(of(mockProductsResponse));

      await (component as any).createProduct(productData);

      expect(fileValidationService.validateSingleProduct).toHaveBeenCalled();
      expect(fileValidationService.insertValidatedProducts).toHaveBeenCalled();
      expect(snackBar.open).toHaveBeenCalled();
      expect(productsService.getAvailableProducts).toHaveBeenCalled();
    });

    it('should show validation errors when product fails validation', async () => {
      const productData = {
        sku: 'DUPLICATE-SKU',
        name: 'Producto 3',
        value: 3000,
        category_name: 'Suministros',
        total_quantity: 50
      };

      const validationResult = {
        isValid: false,
        errors: ['El SKU ya existe en la base de datos'],
        warnings: [],
        data: undefined
      };

      fileValidationService.validateSingleProduct.and.returnValue(Promise.resolve(validationResult));

      await (component as any).createProduct(productData);

      expect(fileValidationService.validateSingleProduct).toHaveBeenCalled();
      expect(fileValidationService.insertValidatedProducts).not.toHaveBeenCalled();
      expect(component.isLoading()).toBe(false);
      expect(snackBar.open).toHaveBeenCalled();
    });

    it('should show warnings when validation has warnings but is valid', async () => {
      const productData = {
        sku: 'MED-003',
        name: 'Producto 3',
        value: 3000,
        category_name: 'Suministros',
        total_quantity: 50
      };

      const validatedProduct = {
        sku: 'MED-003',
        name: 'Producto 3',
        value: 3000,
        category_name: 'Suministros',
        quantity: 50,
        warehouse_id: 1
      };

      const validationResult = {
        isValid: true,
        errors: [],
        warnings: ['SKU muy corto, considerar usar más de 5 caracteres'],
        data: [validatedProduct]
      };

      fileValidationService.validateSingleProduct.and.returnValue(Promise.resolve(validationResult));
      fileValidationService.insertValidatedProducts.and.returnValue(Promise.resolve({ success: true }));
      productsService.getAvailableProducts.and.returnValue(of(mockProductsResponse));

      await (component as any).createProduct(productData);

      expect(fileValidationService.validateSingleProduct).toHaveBeenCalled();
      expect(snackBar.open).toHaveBeenCalledTimes(2); // Warnings + success
    });

    it('should handle error during insertion after validation', async () => {
      const productData = {
        sku: 'MED-003',
        name: 'Producto 3',
        value: 3000,
        category_name: 'Suministros',
        total_quantity: 50
      };

      const validatedProduct = {
        sku: 'MED-003',
        name: 'Producto 3',
        value: 3000,
        category_name: 'Suministros',
        quantity: 50,
        warehouse_id: 1
      };

      const validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        data: [validatedProduct]
      };

      fileValidationService.validateSingleProduct.and.returnValue(Promise.resolve(validationResult));
      fileValidationService.insertValidatedProducts.and.returnValue(Promise.reject({ error: 'Error al insertar' }));

      await (component as any).createProduct(productData);

      expect(component.isLoading()).toBe(false);
      expect(snackBar.open).toHaveBeenCalled();
    });

    it('should use default warehouse_id when not selected', async () => {
      component.selectedWarehouseId = null;
      const productData = {
        sku: 'MED-003',
        name: 'Producto 3',
        value: 3000,
        category_name: 'Suministros',
        total_quantity: 50
      };

      const validatedProduct = {
        sku: 'MED-003',
        name: 'Producto 3',
        value: 3000,
        category_name: 'Suministros',
        quantity: 50,
        warehouse_id: 1
      };

      const validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        data: [validatedProduct]
      };

      fileValidationService.validateSingleProduct.and.returnValue(Promise.resolve(validationResult));
      fileValidationService.insertValidatedProducts.and.returnValue(Promise.resolve({ success: true }));
      productsService.getAvailableProducts.and.returnValue(of(mockProductsResponse));

      await (component as any).createProduct(productData);

      expect(fileValidationService.validateSingleProduct).toHaveBeenCalledWith(
        jasmine.objectContaining({
          warehouse_id: 1
        })
      );
    });
  });

  describe('convertValue', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('should return original value for CO country', () => {
      localStorage.setItem('userCountry', 'CO');
      
      const converted = (component as any).convertValue(1000);
      
      expect(converted).toBe(1000);
    });

    it('should convert value for PE country', () => {
      localStorage.setItem('userCountry', 'PE');
      
      const converted = (component as any).convertValue(1000);
      
      expect(converted).toBeCloseTo(1.4, 2);
    });

    it('should convert value for EC country with high precision', () => {
      localStorage.setItem('userCountry', 'EC');
      
      const converted = (component as any).convertValue(100);
      
      expect(converted).toBeCloseTo(0.026, 4);
    });

    it('should use default CO when country not set', () => {
      const converted = (component as any).convertValue(1000);
      
      expect(converted).toBe(1000);
    });

    it('should round small values to 4 decimals', () => {
      localStorage.setItem('userCountry', 'EC');
      
      const converted = (component as any).convertValue(100);
      
      expect(converted.toString()).toMatch(/^\d+\.\d{4}$/);
    });

    it('should round normal values to 2 decimals', () => {
      localStorage.setItem('userCountry', 'PE');
      
      const converted = (component as any).convertValue(1000);
      
      expect(converted.toString()).toMatch(/^\d+\.\d{2}$/);
    });
  });

  describe('getConvertedPrice', () => {
    it('should return converted price for product', () => {
      localStorage.setItem('userCountry', 'PE');
      const product = mockProducts[0];
      
      const price = component.getConvertedPrice(product);
      
      expect(price).toBeCloseTo(1.4, 2);
    });
  });

  describe('currencySymbol', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('should return COP for CO country', () => {
      localStorage.setItem('userCountry', 'CO');
      fixture.detectChanges();
      
      expect(component.currencySymbol()).toBe('COP');
    });

    it('should return PEN for PE country', () => {
      localStorage.setItem('userCountry', 'PE');
      fixture.detectChanges();
      
      expect(component.currencySymbol()).toBe('PEN');
    });

    it('should return USD for EC country', () => {
      localStorage.setItem('userCountry', 'EC');
      fixture.detectChanges();
      
      expect(component.currencySymbol()).toBe('USD');
    });

    it('should return MXN for MX country', () => {
      localStorage.setItem('userCountry', 'MX');
      fixture.detectChanges();
      
      expect(component.currencySymbol()).toBe('MXN');
    });

    it('should default to COP when country not set', () => {
      expect(component.currencySymbol()).toBe('COP');
    });
  });

  describe('formatPrice', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('should format price with correct locale for CO', () => {
      localStorage.setItem('userCountry', 'CO');
      const formatted = component.formatPrice(1000);
      
      expect(formatted).toContain('COP');
      expect(formatted).toContain('1');
    });

    it('should format small price with more decimals', () => {
      localStorage.setItem('userCountry', 'EC');
      const formatted = component.formatPrice(0.5);
      
      expect(formatted).toContain('USD');
    });

    it('should format normal price with 2 decimals', () => {
      localStorage.setItem('userCountry', 'PE');
      const formatted = component.formatPrice(1000);
      
      expect(formatted).toContain('PEN');
    });
  });

  describe('validFilesCount', () => {
    it('should return count of valid files', () => {
      const file1 = new File(['content'], 'test1.csv', { type: 'text/csv' });
      const file2 = new File(['content'], 'test2.csv', { type: 'text/csv' });
      
      component.uploadedFiles.set([
        { id: '1', file: file1, isValid: true, progress: 100 },
        { id: '2', file: file2, isValid: false, progress: 100 }
      ]);
      
      expect(component.validFilesCount).toBe(1);
    });

    it('should return 0 when no valid files', () => {
      const file = new File(['content'], 'test.csv', { type: 'text/csv' });
      
      component.uploadedFiles.set([
        { id: '1', file: file, isValid: false, progress: 100 }
      ]);
      
      expect(component.validFilesCount).toBe(0);
    });
  });

  describe('processFile', () => {
    it('should process valid CSV file', async () => {
      const file = new File(['content'], 'test.csv', { type: 'text/csv' });
      const mockValidationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        data: []
      };
      
      fileValidationService.validateCSVFile.and.returnValue(Promise.resolve(mockValidationResult));
      fileValidationService.validateAgainstExistingProducts.and.returnValue(Promise.resolve(mockValidationResult));
      
      (component as any).processFile(file);
      
      await fixture.whenStable();
      expect(component.uploadedFiles().length).toBe(1);
    });

    it('should process valid XLSX file', async () => {
      const file = new File(['content'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const mockValidationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        data: []
      };
      
      fileValidationService.validateXLSXFile.and.returnValue(Promise.resolve(mockValidationResult));
      fileValidationService.validateAgainstExistingProducts.and.returnValue(Promise.resolve(mockValidationResult));
      
      (component as any).processFile(file);
      
      await fixture.whenStable();
      expect(component.uploadedFiles().length).toBe(1);
    });

    it('should reject unsupported file type', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      
      (component as any).processFile(file);
      
      expect(component.uploadedFiles().length).toBe(0);
    });

    it('should reject file that is too large', () => {
      const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'test.csv', { type: 'text/csv' });
      
      (component as any).processFile(largeFile);
      
      expect(component.uploadedFiles().length).toBe(0);
    });
  });

  describe('validateFileContent', () => {
    it('should validate CSV file successfully', async () => {
      const file = new File(['content'], 'test.csv', { type: 'text/csv' });
      const uploadedFile = {
        id: '1',
        file: file,
        isValid: true,
        progress: 0
      };
      
      const mockValidationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        data: [{ sku: 'TEST', name: 'Test', value: 100, category_name: 'Cat', quantity: 10, warehouse_id: 1 }]
      };
      
      fileValidationService.validateCSVFile.and.returnValue(Promise.resolve(mockValidationResult));
      fileValidationService.validateAgainstExistingProducts.and.returnValue(Promise.resolve(mockValidationResult));
      
      await (component as any).validateFileContent(uploadedFile);
      
      expect(uploadedFile.progress).toBe(100);
      expect(uploadedFile.isValid).toBe(true);
    });

    it('should handle validation error', async () => {
      const file = new File(['content'], 'test.csv', { type: 'text/csv' });
      const uploadedFile: any = {
        id: '1',
        file: file,
        isValid: true,
        progress: 0
      };
      
      fileValidationService.validateCSVFile.and.returnValue(Promise.reject(new Error('Validation error')));
      
      await (component as any).validateFileContent(uploadedFile);
      
      expect(uploadedFile.isValid).toBe(false);
      expect(uploadedFile.progress).toBe(100);
    });

    it('should handle unsupported file format', async () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const uploadedFile: any = {
        id: '1',
        file: file,
        isValid: true,
        progress: 0
      };
      
      await (component as any).validateFileContent(uploadedFile);
      
      expect(uploadedFile.isValid).toBe(false);
    });
  });

  describe('uploadProducts', () => {
    it('should handle error during upload', async () => {
      const file = new File(['content'], 'test.csv', { type: 'text/csv' });
      const uploadedFile = {
        id: '1',
        file: file,
        isValid: true,
        progress: 100,
        validationResult: {
          isValid: true,
          errors: [],
          warnings: [],
          data: [{ sku: 'TEST', name: 'Test', value: 100, category_name: 'Cat', quantity: 10, warehouse_id: 1 }]
        }
      };
      
      component.uploadedFiles.set([uploadedFile]);
      fileValidationService.insertValidatedProducts = jasmine.createSpy('insertValidatedProducts').and.returnValue(
        Promise.reject(new Error('Upload error'))
      );
      
      await component.uploadProducts();
      
      expect(component.isUploading()).toBe(false);
      expect(component.showErrorMessage()).toBe(true);
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = (component as any).generateId();
      const id2 = (component as any).generateId();
      
      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
    });
  });
});

