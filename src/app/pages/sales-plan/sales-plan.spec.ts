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
  });

  describe('Currency and Price', () => {
    it('should get currency symbol', fakeAsync(() => {
      flush();
      localStorage.setItem('userCountry', 'CO');
      fixture.detectChanges();
      expect(component.currencySymbol()).toBe('$');
      
      localStorage.setItem('userCountry', 'PE');
      fixture.detectChanges();
      expect(component.currencySymbol()).toBe('S/');
    }));

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
  });

});
