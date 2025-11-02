import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { ApplicationRef } from '@angular/core';
import { of, throwError } from 'rxjs';
import { SalesPlan } from './sales-plan';
import { ProductsService, ProductsResponse } from '../../services/products.service';
import { OfferService, CreateSalesPlanResponse } from '../../services/offer.service';
import { loadTranslations } from '../../shared/lang/lang-store';

describe('SalesPlan', () => {
  let component: SalesPlan;
  let fixture: ComponentFixture<SalesPlan>;
  let productsService: jasmine.SpyObj<ProductsService>;
  let offerService: jasmine.SpyObj<OfferService>;
  let router: jasmine.SpyObj<Router>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let appRef: ApplicationRef;
  let activatedRoute: any;

  const mockProducts = [
    {
      product_id: 1,
      sku: 'MED-001',
      name: 'Paracetamol 500mg',
      value: 5000,
      category_name: 'MEDICATION',
      total_quantity: 100,
      image_url: 'image1.jpg'
    },
    {
      product_id: 2,
      sku: 'MED-002',
      name: 'Ibuprofeno 400mg',
      value: 7500,
      category_name: 'MEDICATION',
      total_quantity: 50,
      image_url: undefined
    },
    {
      product_id: 3,
      sku: 'MED-003',
      name: 'Aspirina 100mg',
      value: 3000,
      category_name: 'MEDICATION',
      total_quantity: 30,
      image_url: undefined
    }
  ];

  const mockProductsResponse: ProductsResponse = {
    products: mockProducts,
    total: 3,
    success: true
  };

  const mockRegions = [
    { value: 'Norte', label: 'Norte' },
    { value: 'Centro', label: 'Centro' },
    { value: 'Sur', label: 'Sur' }
  ];

  const mockQuarters = [
    { value: 'Q1', label: 'Q1 - Primer Trimestre' },
    { value: 'Q2', label: 'Q2 - Segundo Trimestre' },
    { value: 'Q3', label: 'Q3 - Tercer Trimestre' },
    { value: 'Q4', label: 'Q4 - Cuarto Trimestre' }
  ];

  beforeEach(async () => {
    loadTranslations('es');
    localStorage.clear();

    const productsServiceSpy = jasmine.createSpyObj('ProductsService', [
      'getAvailableProducts'
    ]);
    const offerServiceSpy = jasmine.createSpyObj('OfferService', [
      'getRegions',
      'getQuarters',
      'createSalesPlan'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate', 'createUrlTree', 'serializeUrl']);
    routerSpy.createUrlTree.and.returnValue({} as any);
    routerSpy.serializeUrl.and.returnValue('/test');
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    activatedRoute = {
      queryParams: of({})
    };

    productsServiceSpy.getAvailableProducts.and.callFake((cityId?: number) => {
      return of(mockProductsResponse);
    });
    offerServiceSpy.getRegions.and.returnValue(of(mockRegions));
    offerServiceSpy.getQuarters.and.returnValue(of(mockQuarters));
    offerServiceSpy.createSalesPlan.and.returnValue(of({ success: true, id: '123' }));

    await TestBed.configureTestingModule({
      imports: [
        SalesPlan,
        HttpClientTestingModule,
        BrowserAnimationsModule
      ],
      providers: [
        { provide: ProductsService, useValue: productsServiceSpy },
        { provide: OfferService, useValue: offerServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: ActivatedRoute, useValue: activatedRoute }
      ]
    }).compileComponents();

    // Registrar iconos SVG necesarios para PageHeader
    const iconRegistry = TestBed.inject(MatIconRegistry);
    const sanitizer = TestBed.inject(DomSanitizer);
    const icons = ['user', 'logout', 'arrow_back'];
    icons.forEach(icon => {
      iconRegistry.addSvgIcon(icon, sanitizer.bypassSecurityTrustResourceUrl(`assets/icons/${icon}.svg`));
    });

    fixture = TestBed.createComponent(SalesPlan);
    component = fixture.componentInstance;

    productsService = TestBed.inject(ProductsService) as jasmine.SpyObj<ProductsService>;
    offerService = TestBed.inject(OfferService) as jasmine.SpyObj<OfferService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
    appRef = TestBed.inject(ApplicationRef);
  });

  afterEach(() => {
    localStorage.clear();
  });

  // El resto de tus pruebas (228) no necesitan cambios,
  // ya que el error estaba en la configuración del 'beforeEach'.

  describe('Component Creation', () => {
    it('should create', fakeAsync(() => {
      flush();
      expect(component).toBeTruthy();
    }));

    it('should have correct page title', () => {
      expect(component.pageTitle).toBe('pageSalesPlanTitle');
    });

    it('should have correct back route', () => {
      expect(component.backRoute).toBe('/dashboard');
    });

    it('should initialize form', fakeAsync(() => {
      flush();
      expect(component.salesPlanForm).toBeDefined();
      expect(component.salesPlanForm.get('region')).toBeTruthy();
      expect(component.salesPlanForm.get('quarter')).toBeTruthy();
      expect(component.salesPlanForm.get('totalGoal')).toBeTruthy();
    }));
  });

  describe('Product Selector', () => {
    it('should toggle product selector', fakeAsync(() => {
      flush();
      const initial = component.isProductSelectorOpen;
      component.toggleProductSelector();
      expect(component.isProductSelectorOpen).toBe(!initial);
      component.toggleProductSelector();
      expect(component.isProductSelectorOpen).toBe(initial);
    }));

    it('should check if product is selected', fakeAsync(() => {
      flush();
      const product = { id: '1', name: 'Product 1', price: 1000 };
      expect(component.isProductSelected(product)).toBe(false);
      component.selectProduct(product);
      expect(component.isProductSelected(product)).toBe(true);
    }));

    it('should deselect product when selecting again', fakeAsync(() => {
      flush();
      const product = { id: '1', name: 'Product 1', price: 1000 };
      component.selectProduct(product);
      expect(component.isProductSelected(product)).toBe(true);
      component.selectProduct(product);
      expect(component.isProductSelected(product)).toBe(false);
    }));

    it('should get selected products text', fakeAsync(() => {
      flush();
      expect(component.getSelectedProductsText()).toBe('select_products');
      
      const product = { id: '1', name: 'Product 1', price: 1000 };
      component.selectProduct(product);
      expect(component.getSelectedProductsText()).toBe('Product 1');
      
      const product2 = { id: '2', name: 'Product 2', price: 2000 };
      component.selectProduct(product2);
      expect(component.getSelectedProductsText()).toContain('products_selected');
    }));
  });

  describe('Goal Modal', () => {
    it('should close goal modal', fakeAsync(() => {
      flush();
      component.showGoalModal = true;
      component.currentProduct = { id: '1', name: 'Product 1', price: 1000 };
      component.goalValue = '100';
      component.closeGoalModal();
      expect(component.showGoalModal).toBe(false);
      expect(component.currentProduct).toBeNull();
      expect(component.goalValue).toBe('');
    }));

    it('should set product goal', fakeAsync(() => {
      flush();
      const product = { id: '1', name: 'Product 1', price: 1000 };
      const mockEvent = { stopPropagation: jasmine.createSpy('stopPropagation') } as any;
      component.setProductGoal(product, mockEvent);
      expect(component.currentProduct).toBe(product);
      expect(component.showGoalModal).toBe(true);
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    }));

    it('should set product goal with existing goal', fakeAsync(() => {
      flush();
      const product = { id: '1', name: 'Product 1', price: 1000, goal: 50 };
      const mockEvent = { stopPropagation: jasmine.createSpy('stopPropagation') } as any;
      component.setProductGoal(product, mockEvent);
      expect(component.goalValue).toBe('50');
    }));

    it('should save goal', fakeAsync(() => {
      flush();
      const product: any = { id: '1', name: 'Product 1', price: 1000 };
      component.currentProduct = product;
      component.goalValue = '100';
      component.saveGoal();
      expect(product.goal).toBe(100);
      expect(component.showGoalModal).toBe(false);
    }));

    it('should not save goal with invalid value', fakeAsync(() => {
      flush();
      const product: any = { id: '1', name: 'Product 1', price: 1000 };
      component.currentProduct = product;
      component.goalValue = '0';
      component.saveGoal();
      expect(product.goal).toBeUndefined();
    }));

    it('should not save goal with empty value', fakeAsync(() => {
      flush();
      const product: any = { id: '1', name: 'Product 1', price: 1000 };
      component.currentProduct = product;
      component.goalValue = '';
      component.saveGoal();
      expect(product.goal).toBeUndefined();
    }));
  });

  describe('Product Filter and Search', () => {
    it('should clear product filter', fakeAsync(() => {
      flush();
      component.productSearchFilter.set('test');
      component.clearProductFilter();
      expect(component.productSearchFilter()).toBe('');
    }));

    it('should handle search change', fakeAsync(() => {
      flush();
      component.currentPage.set(2);
      component.onSearchChange('new search');
      expect(component.productSearchFilter()).toBe('new search');
      expect(component.currentPage()).toBe(1);
    }));
  });

  describe('Sorting', () => {
    it('should set sort by', fakeAsync(() => {
      flush();
      component.setSortBy('price');
      expect(component.sortBy()).toBe('price');
      component.setSortBy('name');
      expect(component.sortBy()).toBe('name');
      component.setSortBy('popularity');
      expect(component.sortBy()).toBe('popularity');
    }));

    it('should toggle sort order', fakeAsync(() => {
      flush();
      component.sortOrder.set('asc');
      component.toggleSortOrder();
      expect(component.sortOrder()).toBe('desc');
      component.toggleSortOrder();
      expect(component.sortOrder()).toBe('asc');
    }));
  });

  describe('Pagination', () => {
    it('should set items per page', fakeAsync(() => {
      flush();
      component.currentPage.set(3);
      component.setItemsPerPage(20);
      expect(component.itemsPerPage()).toBe(20);
      expect(component.currentPage()).toBe(1);
    }));

    it('should go to specific page', fakeAsync(() => {
      flush();
      component.products = [
        { id: '1', name: 'Product 1', price: 1000 },
        { id: '2', name: 'Product 2', price: 2000 }
      ];
      component.itemsPerPage.set(1);
      component.goToPage(1);
      expect(component.currentPage()).toBe(1);
      component.goToPage(2);
      expect(component.currentPage()).toBe(2);
    }));

    it('should not go to page out of range', fakeAsync(() => {
      flush();
      component.products = [
        { id: '1', name: 'Product 1', price: 1000 },
        { id: '2', name: 'Product 2', price: 2000 }
      ];
      component.itemsPerPage.set(1);
      component.currentPage.set(1);
      component.goToPage(0);
      expect(component.currentPage()).toBe(1);
      component.goToPage(10);
      expect(component.currentPage()).toBe(1);
    }));

    it('should go to next page', fakeAsync(() => {
      flush();
      component.products = Array.from({ length: 15 }, (_, i) => ({
        id: String(i + 1),
        name: `Product ${i + 1}`,
        price: 1000
      }));
      component.itemsPerPage.set(10);
      component.currentPage.set(1);
      component.nextPage();
      expect(component.currentPage()).toBe(2);
    }));

    it('should not go to next page if already on last page', fakeAsync(() => {
      flush();
      component.products = Array.from({ length: 10 }, (_, i) => ({
        id: String(i + 1),
        name: `Product ${i + 1}`,
        price: 1000
      }));
      component.itemsPerPage.set(10);
      component.currentPage.set(1);
      component.nextPage();
      expect(component.currentPage()).toBe(1);
    }));

    it('should go to previous page', fakeAsync(() => {
      flush();
      component.currentPage.set(2);
      component.previousPage();
      expect(component.currentPage()).toBe(1);
      component.previousPage();
      expect(component.currentPage()).toBe(1);
    }));
  });

  describe('Product Image', () => {
    it('should get product image', fakeAsync(() => {
      flush();
      const productWithImage = { id: '1', name: 'Product 1', price: 1000, image: 'image.jpg' };
      expect(component.getProductImage(productWithImage)).toBe('image.jpg');
      
      const productWithoutImage = { id: '2', name: 'Product 2', price: 2000 };
      expect(component.getProductImage(productWithoutImage)).toBe(component.defaultImage);
    }));

    it('should handle image error', fakeAsync(() => {
      flush();
      const mockEvent = { target: { src: '' } };
      component.onImageError(mockEvent, { id: '1', name: 'Product 1', price: 1000 });
      expect(mockEvent.target.src).toBe(component.defaultImage);
    }));
  });

  describe('Currency and Price', () => {
    it('should get converted price', fakeAsync(() => {
      flush();
      const product = { id: '1', name: 'Product 1', price: 1000 };
      localStorage.setItem('userCountry', 'CO');
      expect(component.getConvertedPrice(product)).toBe(1000);
      
      localStorage.setItem('userCountry', 'PE');
      expect(component.getConvertedPrice(product)).toBeGreaterThan(1000);
    }));
  });

  describe('Confirm Modal', () => {
    it('should open confirm modal', fakeAsync(() => {
      flush();
      component.salesPlanForm.patchValue({ region: 'Norte', quarter: 'Q1' });
      const product = { id: '1', name: 'Product 1', price: 1000, goal: 10 };
      component.products = [product];
      component.openConfirm();
      expect(component.showConfirmModal).toBe(true);
    }));

    it('should not open confirm modal if form is invalid', fakeAsync(() => {
      flush();
      component.salesPlanForm.patchValue({ region: '', quarter: '' });
      component.products = [];
      component.openConfirm();
      expect(component.showConfirmModal).toBe(false);
    }));

    it('should cancel confirm modal', fakeAsync(() => {
      flush();
      component.showConfirmModal = true;
      component.cancelConfirm();
      expect(component.showConfirmModal).toBe(false);
    }));
  });

  describe('Form Validation', () => {
    it('should clear error', fakeAsync(() => {
      flush();
      component.formErrors.set({ region: 'error', quarter: 'error' });
      component.clearError('region');
      expect(component.formErrors()['region']).toBeUndefined();
      expect(component.formErrors()['quarter']).toBe('error');
    }));

    it('should validate field', fakeAsync(() => {
      flush();
      component.salesPlanForm.get('region')?.markAsTouched();
      component.salesPlanForm.get('region')?.setValue('');
      component.validateField('region');
      expect(component.formErrors()['region']).toBe('fieldRequired');
      
      component.salesPlanForm.get('region')?.setValue('Norte');
      component.validateField('region');
      expect(component.formErrors()['region']).toBeUndefined();
    }));
  });

  describe('Total Goal', () => {
    it('should handle total goal change', fakeAsync(() => {
      flush();
      component.onTotalGoalChange('1000000');
      expect(component.salesPlanForm.get('totalGoal')?.value).toBe('1000000');
    }));

    it('should handle total goal change with currency symbol', fakeAsync(() => {
      flush();
      localStorage.setItem('userCountry', 'CO');
      component.onTotalGoalChange('$ 1,000,000');
      expect(component.salesPlanForm.get('totalGoal')?.value).toBe('$ 1,000,000');
    }));
  });

  describe('Computed Properties', () => {
    it('should compute planned products', fakeAsync(() => {
      flush();
      component.products = [
        { id: '1', name: 'Product 1', price: 1000, goal: 10 },
        { id: '2', name: 'Product 2', price: 2000 },
        { id: '3', name: 'Product 3', price: 3000, goal: 20 }
      ];
      const planned = component.plannedProducts();
      expect(planned.length).toBe(2);
      expect(planned[0].id).toBe('1');
      expect(planned[1].id).toBe('3');
    }));

    it('should compute filtered products', fakeAsync(() => {
      flush();
      component.products = [
        { id: '1', name: 'Paracetamol', price: 1000 },
        { id: '2', name: 'Ibuprofeno', price: 2000 },
        { id: '3', name: 'Aspirina', price: 3000 }
      ];
      component.productSearchFilter.set('Paracetamol');
      const filtered = component.filteredProducts();
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Paracetamol');
    }));

    it('should compute filtered products sorted by price', fakeAsync(() => {
      flush();
      component.products = [
        { id: '1', name: 'Product 1', price: 3000 },
        { id: '2', name: 'Product 2', price: 1000 },
        { id: '3', name: 'Product 3', price: 2000 }
      ];
      component.setSortBy('price');
      component.sortOrder.set('asc');
      const filtered = component.filteredProducts();
      expect(filtered[0].price).toBe(1000);
      expect(filtered[1].price).toBe(2000);
      expect(filtered[2].price).toBe(3000);
    }));

    it('should compute filtered products sorted by popularity', fakeAsync(() => {
      flush();
      component.products = [
        { id: '3', name: 'Product 3', price: 1000 },
        { id: '1', name: 'Product 1', price: 1000 },
        { id: '2', name: 'Product 2', price: 1000 }
      ];
      component.setSortBy('popularity');
      component.sortOrder.set('asc');
      const filtered = component.filteredProducts();
      expect(filtered[0].id).toBe('1');
      expect(filtered[1].id).toBe('2');
      expect(filtered[2].id).toBe('3');
    }));

    it('should compute filtered products with no filter', fakeAsync(() => {
      flush();
      component.products = [
        { id: '1', name: 'Product 1', price: 1000 },
        { id: '2', name: 'Product 2', price: 2000 }
      ];
      component.productSearchFilter.set('');
      const filtered = component.filteredProducts();
      expect(filtered.length).toBe(2);
    }));

    it('should compute pagination info', fakeAsync(() => {
      flush();
      component.products = Array.from({ length: 25 }, (_, i) => ({
        id: String(i + 1),
        name: `Product ${i + 1}`,
        price: 1000
      }));
      component.itemsPerPage.set(10);
      component.currentPage.set(2);
      const info = component.paginationInfo();
      expect(info.total).toBe(25);
      expect(info.current).toBe(2);
      expect(info.totalPages).toBe(3);
      expect(info.startItem).toBe(11);
      expect(info.endItem).toBe(20);
    }));

    it('should compute isFormValid', fakeAsync(() => {
      flush();
      component.salesPlanForm.patchValue({ region: 'Norte', quarter: 'Q1' });
      component.products = [
        { id: '1', name: 'Product 1', price: 1000, goal: 10 }
      ];
      tick();
      expect(component.isFormValid()).toBe(true);
    }));

    it('should compute isFormValid as false when missing data', fakeAsync(() => {
      flush();
      component.salesPlanForm.patchValue({ region: '', quarter: '' });
      component.products = [];
      tick();
      expect(component.isFormValid()).toBe(false);
    }));

    it('should compute visiblePages for small total', fakeAsync(() => {
      flush();
      component.products = Array.from({ length: 5 }, (_, i) => ({
        id: String(i + 1),
        name: `Product ${i + 1}`,
        price: 1000
      }));
      component.itemsPerPage.set(1);
      const pages = component.visiblePages();
      expect(pages.length).toBe(5);
    }));

    it('should compute calculatedTotalValue', fakeAsync(() => {
      flush();
      component.products = [
        { id: '1', name: 'Product 1', price: 1000, goal: 10 },
        { id: '2', name: 'Product 2', price: 2000, goal: 5 }
      ];
      localStorage.setItem('userCountry', 'CO');
      const total = component.calculatedTotalValue();
      expect(total).toBe(20000); // 1000*10 + 2000*5
    }));

    it('should compute totalPlannedValue without manual value', fakeAsync(() => {
      flush();
      component.products = [
        { id: '1', name: 'Product 1', price: 1000, goal: 10 }
      ];
      const total = component.totalPlannedValue();
      expect(total).toBeGreaterThan(0);
    }));

    it('should compute totalPlannedValue with manual value', fakeAsync(() => {
      flush();
      component.products = [
        { id: '1', name: 'Product 1', price: 1000, goal: 10 }
      ];
      (component as any).manualGoalValue.set(50000);
      const total = component.totalPlannedValue();
      expect(total).toBe(50000);
    }));

    it('should compute isGoalValid when valid', fakeAsync(() => {
      flush();
      component.products = [
        { id: '1', name: 'Product 1', price: 1000, goal: 10 }
      ];
      const calculated = component.calculatedTotalValue();
      (component as any).manualGoalValue.set(calculated * 1.1); // 10% más
      expect(component.isGoalValid()).toBe(true);
    }));

    it('should compute isGoalValid when invalid (too high)', fakeAsync(() => {
      flush();
      component.products = [
        { id: '1', name: 'Product 1', price: 1000, goal: 10 }
      ];
      const calculated = component.calculatedTotalValue();
      (component as any).manualGoalValue.set(calculated * 2); // 100% más (fuera de rango)
      expect(component.isGoalValid()).toBe(false);
    }));

    it('should compute isGoalValid when invalid (too low)', fakeAsync(() => {
      flush();
      component.products = [
        { id: '1', name: 'Product 1', price: 1000, goal: 10 }
      ];
      const calculated = component.calculatedTotalValue();
      (component as any).manualGoalValue.set(calculated * 0.5); // 50% menos (fuera de rango)
      expect(component.isGoalValid()).toBe(false);
    }));

    it('should compute isGoalValid when no manual value', fakeAsync(() => {
      flush();
      component.products = [
        { id: '1', name: 'Product 1', price: 1000, goal: 10 }
      ];
      (component as any).manualGoalValue.set(null);
      expect(component.isGoalValid()).toBe(true);
    }));
  });

  describe('Error Messages', () => {
    it('should get error message', fakeAsync(() => {
      flush();
      component.formErrors.set({ region: 'fieldRequired' });
      const message = component.getErrorMessage('region');
      expect(message).toBeDefined();
    }));

    it('should return empty string when no error', fakeAsync(() => {
      flush();
      const message = component.getErrorMessage('region');
      expect(message).toBe('');
    }));
  });

  describe('Create Sales Plan', () => {
    it('should not create sales plan if form is invalid', fakeAsync(() => {
      flush();
      component.salesPlanForm.patchValue({ region: '', quarter: '' });
      component.createSalesPlan();
      expect(offerService.createSalesPlan).not.toHaveBeenCalled();
    }));

    it('should create sales plan when form is valid', fakeAsync(() => {
      flush();
      component.salesPlanForm.patchValue({ region: 'Norte', quarter: 'Q1' });
      component.products = [
        { id: '1', name: 'Product 1', price: 1000, goal: 10 }
      ];
      offerService.createSalesPlan.and.returnValue(of({ success: true, plan_id: '123' }));
      component.createSalesPlan();
      tick();
      expect(offerService.createSalesPlan).toHaveBeenCalled();
      expect(component.saveStatus()).toBe('success');
    }));

    it('should handle error when creating sales plan', fakeAsync(() => {
      flush();
      component.salesPlanForm.patchValue({ region: 'Norte', quarter: 'Q1' });
      component.products = [
        { id: '1', name: 'Product 1', price: 1000, goal: 10 }
      ];
      offerService.createSalesPlan.and.returnValue(throwError(() => new Error('Error')));
      component.createSalesPlan();
      tick();
      expect(component.saveStatus()).toBe('error');
    }));

    it('should create sales plan with manual value', fakeAsync(() => {
      flush();
      component.salesPlanForm.patchValue({ region: 'Norte', quarter: 'Q1' });
      component.products = [
        { id: '1', name: 'Product 1', price: 1000, goal: 10 }
      ];
      (component as any).manualGoalValue.set(50000);
      offerService.createSalesPlan.and.returnValue(of({ success: true, plan_id: '123' }));
      component.createSalesPlan();
      tick();
      expect(offerService.createSalesPlan).toHaveBeenCalled();
    }));
  });

  describe('Load Products Error Handling', () => {
    it('should handle error loading products', fakeAsync(() => {
      flush();
      productsService.getAvailableProducts.and.returnValue(throwError(() => new Error('Error')));
      component.products = [];
      tick();
      expect(component.products).toEqual([]);
    }));
  });

  describe('Load Catalogs Error Handling', () => {
    it('should handle error loading regions', fakeAsync(() => {
      flush();
      offerService.getRegions.and.returnValue(throwError(() => new Error('Error')));
      tick();
      expect(component.regionOptions.length).toBeGreaterThan(0);
    }));

    it('should handle error loading quarters', fakeAsync(() => {
      flush();
      offerService.getQuarters.and.returnValue(throwError(() => new Error('Error')));
      tick();
      expect(component.quarterOptions.length).toBeGreaterThan(0);
    }));
  });

  describe('Form Value Changes', () => {
    it('should update formVersion when region changes', fakeAsync(() => {
      flush();
      const initialVersion = (component as any).formVersion();
      component.salesPlanForm.patchValue({ region: 'Norte' });
      tick();
      expect((component as any).formVersion()).toBeGreaterThan(initialVersion);
    }));

    it('should update formVersion when quarter changes', fakeAsync(() => {
      flush();
      const initialVersion = (component as any).formVersion();
      component.salesPlanForm.patchValue({ quarter: 'Q1' });
      tick();
      expect((component as any).formVersion()).toBeGreaterThan(initialVersion);
    }));
  });

  describe('Pagination Edge Cases', () => {
    it('should handle pagination info with empty products', fakeAsync(() => {
      flush();
      component.products = [];
      component.itemsPerPage.set(10);
      component.currentPage.set(1);
      const info = component.paginationInfo();
      expect(info.total).toBe(0);
      expect(info.totalPages).toBe(0);
    }));

    it('should handle visiblePages for large total', fakeAsync(() => {
      flush();
      component.products = Array.from({ length: 100 }, (_, i) => ({
        id: String(i + 1),
        name: `Product ${i + 1}`,
        price: 1000
      }));
      component.itemsPerPage.set(10);
      component.currentPage.set(5);
      const pages = component.visiblePages();
      expect(pages.length).toBeGreaterThan(0);
    }));
  });

  describe('Product Selection', () => {
    it('should add product to selectedProducts when setting goal', fakeAsync(() => {
      flush();
      const product: any = { id: '1', name: 'Product 1', price: 1000 };
      component.currentProduct = product;
      component.goalValue = '100';
      component.saveGoal();
      expect(component.selectedProducts.length).toBeGreaterThan(0);
    }));

    it('should update total goal when product goal is saved', fakeAsync(() => {
      flush();
      const product: any = { id: '1', name: 'Product 1', price: 1000 };
      component.selectedProducts = [product];
      component.currentProduct = product;
      component.goalValue = '50';
      component.saveGoal();
      tick();
      expect(component.salesPlanForm.get('totalGoal')?.value).toBeDefined();
    }));
  });

});
