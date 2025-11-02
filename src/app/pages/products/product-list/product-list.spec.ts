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
      'getProductsByWarehouse'
    ]);
    const fileValidationServiceSpy = jasmine.createSpyObj('FileValidationService', [
      'validateCSVFile',
      'validateXLSXFile',
      'validateAgainstExistingProducts',
      'generateTemplateCSV',
      'generateTemplateCSVWithRealData'
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
      fileValidationService.validateAgainstExistingProducts.and.returnValue(
        Promise.resolve(mockValidationResult)
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

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15');
      const formatted = component.formatDate(date);
      expect(formatted).toContain('2024');
    });
  });
});

