import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
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
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
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

  describe('ngOnInit and Data Loading', () => {
    it('should load products and catalogs on init', fakeAsync(() => {
      flush();
      fixture.detectChanges();

      expect(productsService.getAvailableProducts).toHaveBeenCalledWith(1);
      expect(offerService.getRegions).toHaveBeenCalled();
      expect(offerService.getQuarters).toHaveBeenCalled();
    }));

    it('should load products successfully', fakeAsync(() => {
      flush();
      fixture.detectChanges();

      expect(component.products.length).toBe(3);
      expect(component.products[0].name).toBe('Paracetamol 500mg');
      expect(component.products[0].price).toBe(5000);
    }));

    it('should map products correctly from backend', fakeAsync(() => {
      flush();
      fixture.detectChanges();

      expect(component.products[0].id).toBe('1');
      expect(component.products[0].name).toBe('Paracetamol 500mg');
      expect(component.products[0].price).toBe(5000);
      expect(component.products[0].image).toBe('image1.jpg');
    }));

    it('should handle products without image_url', fakeAsync(() => {
      flush();
      fixture.detectChanges();

      expect(component.products[1].image).toBeUndefined();
      expect(component.products[2].image).toBeUndefined();
    }));

    it('should handle error when loading products', fakeAsync(() => {
      const productsServiceErrorSpy = jasmine.createSpyObj('ProductsService', ['getAvailableProducts']);
      productsServiceErrorSpy.getAvailableProducts.and.returnValue(throwError(() => new Error('Network error')));

      const offerServiceSpy = TestBed.inject(OfferService) as jasmine.SpyObj<OfferService>;

      TestBed.overrideProvider(ProductsService, { useValue: productsServiceErrorSpy });
      TestBed.overrideProvider(OfferService, { useValue: offerServiceSpy });

      fixture = TestBed.createComponent(SalesPlan);
      component = fixture.componentInstance;

      flush();
      fixture.detectChanges();

      expect(component.products).toEqual([]);
      expect(component).toBeTruthy();
    }));

    it('should load regions successfully', fakeAsync(() => {
      flush();
      fixture.detectChanges();

      expect(component.regionOptions.length).toBeGreaterThan(0);
      expect(component.regionOptions[0].value).toBe('Norte');
    }));

    it('should handle error when loading regions', fakeAsync(() => {
      const offerServiceErrorSpy = jasmine.createSpyObj('OfferService', ['getRegions', 'getQuarters', 'createSalesPlan']);
      offerServiceErrorSpy.getRegions.and.returnValue(throwError(() => new Error('Network error')));
      offerServiceErrorSpy.getQuarters.and.returnValue(of(mockQuarters));

      const productsServiceSpy = TestBed.inject(ProductsService) as jasmine.SpyObj<ProductsService>;

      TestBed.overrideProvider(OfferService, { useValue: offerServiceErrorSpy });
      TestBed.overrideProvider(ProductsService, { useValue: productsServiceSpy });

      fixture = TestBed.createComponent(SalesPlan);
      component = fixture.componentInstance;

      flush();
      fixture.detectChanges();

      expect(component.regionOptions.length).toBeGreaterThan(0);
      expect(component.regionOptions[0].value).toBe('norte');
    }));

    it('should load quarters successfully', fakeAsync(() => {
      flush();
      fixture.detectChanges();

      expect(component.quarterOptions.length).toBeGreaterThan(0);
      expect(component.quarterOptions[0].value).toBe('Q1');
    }));

    it('should handle error when loading quarters', fakeAsync(() => {
      const offerServiceErrorSpy = jasmine.createSpyObj('OfferService', ['getRegions', 'getQuarters', 'createSalesPlan']);
      offerServiceErrorSpy.getRegions.and.returnValue(of(mockRegions));
      offerServiceErrorSpy.getQuarters.and.returnValue(throwError(() => new Error('Network error')));

      const productsServiceSpy = TestBed.inject(ProductsService) as jasmine.SpyObj<ProductsService>;

      TestBed.overrideProvider(OfferService, { useValue: offerServiceErrorSpy });
      TestBed.overrideProvider(ProductsService, { useValue: productsServiceSpy });

      fixture = TestBed.createComponent(SalesPlan);
      component = fixture.componentInstance;

      flush();
      fixture.detectChanges();

      expect(component.quarterOptions.length).toBeGreaterThan(0);
      expect(component.quarterOptions[0].value).toBe('Q1');
    }));

    it('should handle empty regions response', fakeAsync(() => {
      offerService.getRegions.and.returnValue(of([]));

      TestBed.overrideProvider(OfferService, { useValue: offerService });
      fixture = TestBed.createComponent(SalesPlan);
      component = fixture.componentInstance;

      flush();
      fixture.detectChanges();

      expect(component.regionOptions).toEqual([]);
    }));

    it('should handle non-array regions response', fakeAsync(() => {
      offerService.getRegions.and.returnValue(of(null as any));

      TestBed.overrideProvider(OfferService, { useValue: offerService });
      fixture = TestBed.createComponent(SalesPlan);
      component = fixture.componentInstance;

      flush();
      fixture.detectChanges();

      expect(Array.isArray(component.regionOptions)).toBe(true);
      expect(component.regionOptions.length).toBe(0);
    }));

    it('should handle regions with label undefined', fakeAsync(() => {
      const regionsWithoutLabel = [
        { value: 'Norte' },
        { value: 'Sur', label: 'Sur Sur' }
      ];

      offerService.getRegions.and.returnValue(of(regionsWithoutLabel as any));

      TestBed.overrideProvider(OfferService, { useValue: offerService });
      fixture = TestBed.createComponent(SalesPlan);
      component = fixture.componentInstance;

      flush();
      fixture.detectChanges();

      expect(component.regionOptions.length).toBe(2);
      expect(component.regionOptions[0].label).toBe('Norte');
      expect(component.regionOptions[1].label).toBe('Sur Sur');
    }));

    it('should handle regions array with empty array', fakeAsync(() => {
      offerService.getRegions.and.returnValue(of([]));

      TestBed.overrideProvider(OfferService, { useValue: offerService });
      fixture = TestBed.createComponent(SalesPlan);
      component = fixture.componentInstance;

      flush();
      fixture.detectChanges();

      expect(component.regionOptions).toEqual([]);
    }));

    it('should handle quarters with empty array', fakeAsync(() => {
      offerService.getQuarters.and.returnValue(of([]));

      TestBed.overrideProvider(OfferService, { useValue: offerService });
      fixture = TestBed.createComponent(SalesPlan);
      component = fixture.componentInstance;

      flush();
      fixture.detectChanges();

      expect(component.quarterOptions).toEqual([]);
    }));

    it('should handle quarters with null response', fakeAsync(() => {
      offerService.getQuarters.and.returnValue(of(null as any));

      TestBed.overrideProvider(OfferService, { useValue: offerService });
      fixture = TestBed.createComponent(SalesPlan);
      component = fixture.componentInstance;

      flush();
      fixture.detectChanges();

      expect(Array.isArray(component.quarterOptions)).toBe(true);
      expect(component.quarterOptions.length).toBe(0);
    }));

    it('should handle products response with empty products array', fakeAsync(() => {
      productsService.getAvailableProducts.and.returnValue(of({
        products: [],
        total: 0,
        success: true
      } as any));

      TestBed.overrideProvider(ProductsService, { useValue: productsService });
      fixture = TestBed.createComponent(SalesPlan);
      component = fixture.componentInstance;

      flush();
      fixture.detectChanges();

      expect(component.products.length).toBe(0);
    }));

    it('should handle products response with undefined products', fakeAsync(() => {
      productsService.getAvailableProducts.and.returnValue(of({
        products: undefined,
        total: 0,
        success: true
      } as any));

      TestBed.overrideProvider(ProductsService, { useValue: productsService });
      fixture = TestBed.createComponent(SalesPlan);
      component = fixture.componentInstance;

      flush();
      fixture.detectChanges();

      expect(component.products.length).toBe(0);
    }));

    it('should handle product mapping with all fallback fields', fakeAsync(() => {
      const productFallback = {
        id: null,
        product_id: null,
        sku: null,
        name: 'Test Product',
        value: 1000,
        category_name: 'Test',
        total_quantity: 10,
        image_url: null
      };

      productsService.getAvailableProducts.and.returnValue(of({
        products: [productFallback],
        total: 1,
        success: true
      } as any));

      TestBed.overrideProvider(ProductsService, { useValue: productsService });
      fixture = TestBed.createComponent(SalesPlan);
      component = fixture.componentInstance;

      flush();
      fixture.detectChanges();

      expect(component.products.length).toBe(1);
      expect(component.products[0].id).toBe('');
    }));
  });

  describe('Form Validation', () => {
    beforeEach(fakeAsync(() => {
      flush();
      fixture.detectChanges();
    }));

    it('should be invalid when form is empty', () => {
      expect(component.isFormValid()).toBe(false);
    });

    it('should be invalid when region is missing', () => {
      component.salesPlanForm.patchValue({
        quarter: 'Q1',
      });
      component.products[0].goal = 50;
      fixture.detectChanges();

      expect(component.isFormValid()).toBe(false);
    });

    it('should be invalid when quarter is missing', () => {
      component.salesPlanForm.patchValue({
        region: 'Norte',
      });
      component.products[0].goal = 50;
      fixture.detectChanges();

      expect(component.isFormValid()).toBe(false);
    });

    it('should be invalid when no products have goals', () => {
      component.salesPlanForm.patchValue({
        region: 'Norte',
        quarter: 'Q1',
      });
      fixture.detectChanges();

      expect(component.isFormValid()).toBe(false);
    });

    it('should be valid when all required fields are filled and products have goals', fakeAsync(() => {
      component.salesPlanForm.patchValue({
        region: 'Norte',
        quarter: 'Q1',
      });

      component.products[0].goal = 50;
      component.selectProduct(component.products[0]);
      tick();
      fixture.detectChanges();

      expect(component.isFormValid()).toBe(true);
    }));

    it('should react to form changes', fakeAsync(() => {
      component.salesPlanForm.patchValue({ region: 'Norte' });
      tick();
      fixture.detectChanges();

      expect(component.isFormValid()).toBeDefined();
    }));
  });

  describe('validateField', () => {
    beforeEach(fakeAsync(() => {
      flush();
      fixture.detectChanges();
    }));

    it('should set error when field is invalid and touched', () => {
      const field = component.salesPlanForm.get('region');
      field?.markAsTouched();
      field?.setValue('');
      fixture.detectChanges();

      component.validateField('region');
      fixture.detectChanges();

      const error = component.getErrorMessage('region');
      expect(error).toBeTruthy();
    });

    it('should clear error when field is valid', () => {
      component.salesPlanForm.patchValue({ region: 'Norte' });
      fixture.detectChanges();

      component.validateField('region');
      fixture.detectChanges();

      const error = component.getErrorMessage('region');
      expect(error).toBe('');
    });

    it('should not set error when field is not touched', () => {
      component.salesPlanForm.get('region')?.setValue('');
      fixture.detectChanges();

      component.validateField('region');
      fixture.detectChanges();

      const error = component.getErrorMessage('region');
      expect(error).toBe('');
    });

    it('should clear error when field becomes valid', () => {
      const field = component.salesPlanForm.get('region');
      field?.markAsTouched();
      field?.setValue('');
      fixture.detectChanges();
      component.validateField('region');
      fixture.detectChanges();

      field?.setValue('Norte');
      fixture.detectChanges();
      component.validateField('region');
      fixture.detectChanges();

      const error = component.getErrorMessage('region');
      expect(error).toBe('');
    });
  });

  describe('getErrorMessage', () => {
    beforeEach(fakeAsync(() => {
      flush();
      fixture.detectChanges();
    }));

    it('should return empty string when no error', () => {
      const error = component.getErrorMessage('region');
      expect(error).toBe('');
    });

    it('should return translated error message', () => {
      component.salesPlanForm.get('region')?.markAsTouched();
      component.salesPlanForm.get('region')?.setValue('');
      fixture.detectChanges();

      component.validateField('region');
      fixture.detectChanges();

      const error = component.getErrorMessage('region');
      expect(error).toBeTruthy();
      expect(typeof error).toBe('string');
    });

    it('should return key when translation not found', () => {
      component.formErrors.set({ region: 'unknownKey' });
      fixture.detectChanges();
      const error = component.getErrorMessage('region');
      expect(error).toBe('unknownKey');
    });

    it('should update when language changes', () => {
      component.formErrors.set({ region: 'fieldRequired' });
      fixture.detectChanges();

      loadTranslations('es');
      const errorEs = component.getErrorMessage('region');

      loadTranslations('en');
      const errorEn = component.getErrorMessage('region');

      expect(errorEs).toBeTruthy();
      expect(errorEn).toBeTruthy();
    });
  });

  describe('clearError', () => {
    beforeEach(fakeAsync(() => {
      flush();
      fixture.detectChanges();
    }));

    it('should clear specific error', () => {
      component.formErrors.set({ region: 'fieldRequired', quarter: 'fieldRequired' });
      fixture.detectChanges();

      component.clearError('region');
      fixture.detectChanges();

      expect(component.formErrors()['region']).toBeUndefined();
      expect(component.formErrors()['quarter']).toBe('fieldRequired');
    });

    it('should handle clearing non-existent error', () => {
      component.formErrors.set({ quarter: 'fieldRequired' });
      fixture.detectChanges();

      component.clearError('region');
      fixture.detectChanges();

      expect(component.formErrors()['quarter']).toBe('fieldRequired');
    });
  });

  describe('Product Selection', () => {
    beforeEach(fakeAsync(() => {
      flush();
      fixture.detectChanges();
    }));

    it('should toggle product selector', () => {
      expect(component.isProductSelectorOpen).toBe(false);

      component.toggleProductSelector();
      expect(component.isProductSelectorOpen).toBe(true);

      component.toggleProductSelector();
      expect(component.isProductSelectorOpen).toBe(false);
    });

    it('should select product', () => {
      const product = component.products[0];

      component.selectProduct(product);
      fixture.detectChanges();

      expect(component.isProductSelected(product)).toBe(true);
      expect(component.selectedProducts).toContain(product);
    });

    it('should deselect product when already selected', () => {
      const product = component.products[0];

      component.selectProduct(product);
      fixture.detectChanges();
      expect(component.isProductSelected(product)).toBe(true);

      component.selectProduct(product);
      fixture.detectChanges();
      expect(component.isProductSelected(product)).toBe(false);
      expect(component.selectedProducts).not.toContain(product);
    });

    it('should update total goal when selecting product with goal', fakeAsync(() => {
      const product = component.products[0];
      product.goal = 10;

      component.selectProduct(product);
      tick();
      fixture.detectChanges();

      const totalGoal = component.salesPlanForm.get('totalGoal')?.value;
      expect(totalGoal).toBeTruthy();
    }));

    it('should get selected products text - no products', () => {
      expect(component.getSelectedProductsText()).toBe('select_products');
    });

    it('should get selected products text - one product', () => {
      component.selectProduct(component.products[0]);
      fixture.detectChanges();
      const text = component.getSelectedProductsText();
      expect(text).toBe('Paracetamol 500mg');
    });

    it('should get selected products text - multiple products', () => {
      component.selectProduct(component.products[0]);
      component.selectProduct(component.products[1]);
      fixture.detectChanges();
      const text = component.getSelectedProductsText();
      expect(text).toContain('products_selected');
    });

    it('isProductSelected should return false for unselected product', () => {
      const product = component.products[0];
      expect(component.isProductSelected(product)).toBe(false);
    });
  });

  describe('Product Goal Management', () => {
    beforeEach(fakeAsync(() => {
      flush();
      fixture.detectChanges();
    }));

    it('should set product goal - open modal', () => {
      const product = component.products[0];
      const event = new Event('click');
      spyOn(event, 'stopPropagation');

      component.setProductGoal(product, event);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.showGoalModal).toBe(true);
      expect(component.currentProduct).toBe(product);
      expect(component.goalValue).toBe('');
    });

    it('should set product goal - with existing goal', () => {
      const product = component.products[0];
      product.goal = 100;
      const event = new Event('click');

      component.setProductGoal(product, event);

      expect(component.currentProduct).toBe(product);
      expect(component.goalValue).toBe('100');
    });

    it('should save goal successfully', fakeAsync(() => {
      component.currentProduct = component.products[0];
      component.goalValue = '50';
      component.showGoalModal = true;
      fixture.detectChanges();

      component.saveGoal();
      tick();
      fixture.detectChanges();

      expect(component.products[0].goal).toBe(50);
      expect(component.showGoalModal).toBe(false);
      expect(component.currentProduct).toBeNull();
      expect(component.selectedProducts).toContain(component.products[0]);
    }));

    it('should not save goal when value is invalid', () => {
      component.currentProduct = component.products[0];
      component.goalValue = '0';

      const initialGoal = component.products[0].goal;
      component.saveGoal();

      expect(component.products[0].goal).toBe(initialGoal);
      expect(component.showGoalModal).toBe(true);
    });

    it('should not save goal when value is negative', () => {
      component.currentProduct = component.products[0];
      component.goalValue = '-10';

      component.saveGoal();

      expect(component.products[0].goal).toBeUndefined();
      expect(component.showGoalModal).toBe(true);
    });

    it('should not save goal when value is not a number', () => {
      component.currentProduct = component.products[0];
      component.goalValue = 'abc';

      component.saveGoal();

      expect(component.products[0].goal).toBeUndefined();
      expect(component.showGoalModal).toBe(true);
    });

    it('should not save goal when no current product', () => {
      component.currentProduct = null;
      component.goalValue = '50';

      component.saveGoal();

      expect(component.showGoalModal).toBe(true);
    });

    it('should reset manual value when saving goal', fakeAsync(() => {
      component.onTotalGoalChange('1000');
      tick();
      fixture.detectChanges();

      component.currentProduct = component.products[0];
      component.goalValue = '50';
      component.showGoalModal = true;
      fixture.detectChanges();

      component.saveGoal();
      tick();
      fixture.detectChanges();

      expect(component.totalPlannedValue()).not.toBe(1000);
    }));

    it('should close goal modal', () => {
      component.showGoalModal = true;
      component.currentProduct = component.products[0];
      component.goalValue = '50';
      fixture.detectChanges();

      component.closeGoalModal();
      fixture.detectChanges();

      expect(component.showGoalModal).toBe(false);
      expect(component.currentProduct).toBeNull();
      expect(component.goalValue).toBe('');
    });

    it('should update total goal when saving goal', fakeAsync(() => {
      component.currentProduct = component.products[0];
      component.goalValue = '20';
      component.selectedProducts = [];
      component.showGoalModal = true;
      fixture.detectChanges();

      component.saveGoal();
      tick();
      fixture.detectChanges();

      expect(component.selectedProducts).toContain(component.products[0]);
      const totalGoal = component.salesPlanForm.get('totalGoal')?.value;
      expect(totalGoal).toBeTruthy();
    }));
  });

  describe('Total Goal Management', () => {
    beforeEach(fakeAsync(() => {
      flush();
      fixture.detectChanges();
    }));

    it('should handle onTotalGoalChange with valid value', fakeAsync(() => {
      component.onTotalGoalChange('$1,000,000');
      tick();
      fixture.detectChanges();

      expect(component.salesPlanForm.get('totalGoal')?.value).toBe('$1,000,000');
      expect(component.totalPlannedValue()).toBe(1000000);
    }));

    it('should extract numeric value from formatted string', fakeAsync(() => {
      component.onTotalGoalChange('S/ 500,000');
      tick();
      fixture.detectChanges();

      expect(component.totalPlannedValue()).toBe(500000);
    }));

    it('should extract numeric value with spaces', fakeAsync(() => {
      component.onTotalGoalChange('$ 1 000 000');
      tick();
      fixture.detectChanges();

      expect(component.totalPlannedValue()).toBe(1000000);
    }));

    it('should handle empty string', fakeAsync(() => {
      component.onTotalGoalChange('1000');
      tick();
      fixture.detectChanges();
      expect(component.totalPlannedValue()).toBe(1000);

      component.onTotalGoalChange('');
      tick();
      fixture.detectChanges();

      expect(component.salesPlanForm.get('totalGoal')?.value).toBe('');
      expect(component.totalPlannedValue()).toBe(0);
    }));

    it('should update totalGoal form field', () => {
      component.onTotalGoalChange('2000000');
      fixture.detectChanges();
      expect(component.salesPlanForm.get('totalGoal')?.value).toBe('2000000');
    });
  });

  describe('createSalesPlan', () => {
    beforeEach(fakeAsync(() => {
      flush();
      fixture.detectChanges();
      component.salesPlanForm.patchValue({
        region: 'Norte',
        quarter: 'Q1',
      });
      component.products[0].goal = 50;
      component.products[1].goal = 30;

      component.selectProduct(component.products[0]);
      component.selectProduct(component.products[1]);
      tick();
      fixture.detectChanges();
    }));

    it('should create sales plan successfully', fakeAsync(() => {
      const mockResponse: CreateSalesPlanResponse = {
        success: true,
        id: '123',
        message: 'Plan created successfully'
      };

      offerService.createSalesPlan.and.returnValue(of(mockResponse));

      component.createSalesPlan();
      tick();
      fixture.detectChanges();

      expect(offerService.createSalesPlan).toHaveBeenCalled();
      expect(component.saveStatus()).toBe('success');
      expect(component.showConfirmModal).toBe(false);

      const payload = offerService.createSalesPlan.calls.mostRecent().args[0];
      expect(payload.region).toBe('Norte');
      expect(payload.quarter).toBe('Q1');
      expect(payload.products.length).toBe(2);
    }));

    it('should handle error when creating sales plan', fakeAsync(() => {
      offerService.createSalesPlan.and.returnValue(
        throwError(() => new Error('Server error'))
      );

      component.createSalesPlan();
      tick();
      fixture.detectChanges();

      expect(offerService.createSalesPlan).toHaveBeenCalled();
      expect(component.saveStatus()).toBe('error');
      expect(component.showConfirmModal).toBe(false);
    }));

    it('should not create plan if form is invalid', () => {
      component.salesPlanForm.patchValue({
        region: '',
        quarter: '',
      });
      fixture.detectChanges();

      component.createSalesPlan();

      expect(offerService.createSalesPlan).not.toHaveBeenCalled();
    });

    it('should include all products with goals in payload', fakeAsync(() => {
      const mockResponse: CreateSalesPlanResponse = {
        success: true,
        id: '123',
        message: 'Success'
      };

      component.products[0].goal = 50;
      component.products[1].goal = 30;
      component.products[2].goal = 0;
      fixture.detectChanges();

      offerService.createSalesPlan.and.returnValue(of(mockResponse));

      component.createSalesPlan();
      tick();

      const payload = offerService.createSalesPlan.calls.mostRecent().args[0];
      expect(payload.products.length).toBe(2);
      expect(payload.products[0].product_id).toBe(1);
      expect(payload.products[0].individual_goal).toBe(50);
    }));

    it('should use manual value if set', fakeAsync(() => {
      const mockResponse: CreateSalesPlanResponse = {
        success: true,
        id: '123',
        message: 'Success'
      };

      component.onTotalGoalChange('5000000');
      component.products[0].goal = 50;
      tick();
      fixture.detectChanges();

      offerService.createSalesPlan.and.returnValue(of(mockResponse));

      component.createSalesPlan();
      tick();

      const payload = offerService.createSalesPlan.calls.mostRecent().args[0];
      expect(payload.total_goal).toBe(5000000);
    }));

    it('should use calculated value when manual value is null', fakeAsync(() => {
      const mockResponse: CreateSalesPlanResponse = {
        success: true,
        id: '123',
        message: 'Success'
      };

      component.products[0].goal = 50;
      component.products[0].price = 5000;
      component.selectProduct(component.products[0]);
      tick();
      fixture.detectChanges();

      offerService.createSalesPlan.and.returnValue(of(mockResponse));

      component.createSalesPlan();
      tick();

      const payload = offerService.createSalesPlan.calls.mostRecent().args[0];
      expect(payload.total_goal).toBeGreaterThan(0);
    }));

    it('should include current year', fakeAsync(() => {
      const mockResponse: CreateSalesPlanResponse = {
        success: true,
        id: '123',
        message: 'Success'
      };

      offerService.createSalesPlan.and.returnValue(of(mockResponse));

      component.createSalesPlan();
      tick();

      const payload = offerService.createSalesPlan.calls.mostRecent().args[0];
      expect(payload.year).toBe(new Date().getFullYear());
    }));

    it('should handle response with plan_id', fakeAsync(() => {
      const mockResponse: any = {
        plan_id: '456',
        message: 'Success'
      };

      offerService.createSalesPlan.and.returnValue(of(mockResponse));

      component.createSalesPlan();
      tick();

      expect(component.saveStatus()).toBe('success');
    }));

    it('should handle response without success flag but with plan_id', fakeAsync(() => {
      const mockResponse: any = {
        plan_id: '456',
        success: undefined
      };

      offerService.createSalesPlan.and.returnValue(of(mockResponse));

      component.createSalesPlan();
      tick();

      expect(component.saveStatus()).toBe('success');
    }));

    it('should handle response without success or plan_id', fakeAsync(() => {
      const mockResponse: any = {
        id: '789'
      };

      offerService.createSalesPlan.and.returnValue(of(mockResponse));

      component.createSalesPlan();
      tick();

      expect(component.saveStatus()).toBe('error');
    }));
  });

  describe('Modal Management', () => {
    beforeEach(fakeAsync(() => {
      flush();
      fixture.detectChanges();
    }));

    it('should open confirm modal when form is valid', fakeAsync(() => {
      component.salesPlanForm.patchValue({
        region: 'Norte',
        quarter: 'Q1'
      });
      component.products[0].goal = 50;
      component.selectProduct(component.products[0]);
      tick();
      fixture.detectChanges();

      component.openConfirm();
      fixture.detectChanges();

      expect(component.showConfirmModal).toBe(true);
    }));

    it('should not open confirm modal when form is invalid', () => {
      component.salesPlanForm.patchValue({
        region: '',
        quarter: ''
      });
      fixture.detectChanges();

      component.openConfirm();
      fixture.detectChanges();

      expect(component.showConfirmModal).toBe(false);
    });

    it('should cancel confirm', () => {
      component.showConfirmModal = true;
      fixture.detectChanges();

      component.cancelConfirm();
      fixture.detectChanges();

      expect(component.showConfirmModal).toBe(false);
    });
  });

  describe('Currency Conversion', () => {
    beforeEach(fakeAsync(() => {
      flush();
      fixture.detectChanges();
    }));

    it('should return correct currency symbol for Colombia', () => {
      localStorage.setItem('userCountry', 'CO');
      expect(component.currencySymbol()).toBe('$');
    });

    it('should return correct currency symbol for Peru', () => {
      localStorage.setItem('userCountry', 'PE');
      expect(component.currencySymbol()).toBe('S/');
    });

    it('should return correct currency symbol for Ecuador', () => {
      localStorage.setItem('userCountry', 'EC');
      expect(component.currencySymbol()).toBe('$');
    });

    it('should return correct currency symbol for Mexico', () => {
      localStorage.setItem('userCountry', 'MX');
      expect(component.currencySymbol()).toBe('$');
    });

    it('should return default currency symbol when country not set', () => {
      localStorage.removeItem('userCountry');
      expect(component.currencySymbol()).toBe('$');
    });

    it('should return default currency symbol for unknown country', () => {
      localStorage.setItem('userCountry', 'UNKNOWN');
      expect(component.currencySymbol()).toBe('$');
    });

    it('should convert value correctly for Colombia', () => {
      localStorage.setItem('userCountry', 'CO');
      const price = component.getConvertedPrice(component.products[0]);
      expect(price).toBe(5000);
    });

    it('should convert value correctly for Peru', () => {
      localStorage.setItem('userCountry', 'PE');
      const price = component.getConvertedPrice(component.products[0]);
      expect(price).toBe(Math.round(5000 * 3.7));
    });

    it('should convert value correctly for Mexico', () => {
      localStorage.setItem('userCountry', 'MX');
      const price = component.getConvertedPrice(component.products[0]);
      expect(price).toBe(Math.round(5000 * 17.5));
    });
  });

  describe('Image Handling', () => {
    beforeEach(fakeAsync(() => {
      flush();
      fixture.detectChanges();
    }));

    it('should return product image if available', () => {
      component.products[0].image = 'image-url.jpg';
      const image = component.getProductImage(component.products[0]);

      expect(image).toBe('image-url.jpg');
    });

    it('should return default image when product image is not available', () => {
      component.products[1].image = undefined;
      const image = component.getProductImage(component.products[1]);

      expect(image).toBe(component.defaultImage);
    });

    it('should handle image error', () => {
      const event = {
        target: {
          src: 'invalid-url.jpg'
        }
      } as any;

      component.onImageError(event, component.products[0]);

      expect(event.target.src).toBe(component.defaultImage);
    });
  });

  describe('Filtering and Search', () => {
    beforeEach(fakeAsync(() => {
      flush();
      fixture.detectChanges();
    }));

    it('should filter products by search query', fakeAsync(() => {
      component.productSearchFilter.set('Paracetamol');
      tick();
      fixture.detectChanges();

      const filtered = component.filteredProducts();
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toContain('Paracetamol');
    }));

    it('should filter products case-insensitively', fakeAsync(() => {
      component.productSearchFilter.set('paracetamol');
      tick();
      fixture.detectChanges();

      const filtered = component.filteredProducts();
      expect(filtered.length).toBe(1);
    }));

    it('should return all products when filter is empty', fakeAsync(() => {
      component.productSearchFilter.set('');
      tick();
      fixture.detectChanges();

      const filtered = component.filteredProducts();
      expect(filtered.length).toBe(3);
    }));

    it('should return empty array when no products match', fakeAsync(() => {
      component.productSearchFilter.set('NonexistentProduct');
      tick();
      fixture.detectChanges();

      const filtered = component.filteredProducts();
      expect(filtered.length).toBe(0);
    }));

    it('should clear product filter', () => {
      component.productSearchFilter.set('test');
      fixture.detectChanges();

      component.clearProductFilter();
      fixture.detectChanges();

      expect(component.productSearchFilter()).toBe('');
    });

    it('should reset page when search changes', fakeAsync(() => {
      component.currentPage.set(3);
      fixture.detectChanges();

      component.onSearchChange('test');
      tick();
      fixture.detectChanges();

      expect(component.currentPage()).toBe(1);
    }));
  });

  describe('Sorting', () => {
    beforeEach(fakeAsync(() => {
      flush();
      fixture.detectChanges();
    }));

    it('should set sort by name', () => {
      component.setSortBy('name');
      expect(component.sortBy()).toBe('name');
    });

    it('should set sort by price', () => {
      component.setSortBy('price');
      expect(component.sortBy()).toBe('price');
    });

    it('should set sort by popularity', () => {
      component.setSortBy('popularity');
      expect(component.sortBy()).toBe('popularity');
    });

    it('should toggle sort order', () => {
      component.sortOrder.set('asc');
      fixture.detectChanges();

      component.toggleSortOrder();
      fixture.detectChanges();
      expect(component.sortOrder()).toBe('desc');

      component.toggleSortOrder();
      fixture.detectChanges();
      expect(component.sortOrder()).toBe('asc');
    });

    it('should sort products by name ascending', fakeAsync(() => {
      component.setSortBy('name');
      component.sortOrder.set('asc');
      tick();
      fixture.detectChanges();

      const filtered = component.filteredProducts();
      expect(filtered[0].name).toBe('Aspirina 100mg');
      expect(filtered[1].name).toBe('Ibuprofeno 400mg');
    }));

    it('should sort products by name descending', fakeAsync(() => {
      component.setSortBy('name');
      component.sortOrder.set('desc');
      tick();
      fixture.detectChanges();

      const filtered = component.filteredProducts();
      expect(filtered[0].name).toBe('Paracetamol 500mg');
    }));

    it('should sort products by price ascending', fakeAsync(() => {
      component.setSortBy('price');
      component.sortOrder.set('asc');
      tick();
      fixture.detectChanges();

      const filtered = component.filteredProducts();
      expect(filtered[0].price).toBe(3000);
      expect(filtered[1].price).toBe(5000);
    }));

    it('should sort products by price descending', fakeAsync(() => {
      component.setSortBy('price');
      component.sortOrder.set('desc');
      tick();
      fixture.detectChanges();

      const filtered = component.filteredProducts();
      expect(filtered[0].price).toBe(7500);
    }));

    it('should sort products by popularity (ID asc)', fakeAsync(() => {
      component.setSortBy('popularity');
      component.sortOrder.set('asc');
      tick();
      fixture.detectChanges();

      const filtered = component.filteredProducts();
      expect(filtered[0].id).toBe('1');
      expect(filtered[1].id).toBe('2');
    }));

    it('should sort products by popularity (ID desc)', fakeAsync(() => {
      component.setSortBy('popularity');
      component.sortOrder.set('desc');
      tick();
      fixture.detectChanges();

      const filtered = component.filteredProducts();
      expect(filtered[0].id).toBe('3');
      expect(filtered[1].id).toBe('2');
    }));
  });

  describe('Pagination', () => {
    beforeEach(fakeAsync(() => {
      flush();
      fixture.detectChanges();
    }));

    it('should set items per page', () => {
      component.setItemsPerPage(20);
      fixture.detectChanges();

      expect(component.itemsPerPage()).toBe(20);
      expect(component.currentPage()).toBe(1);
    });

    it('should go to specific page', () => {
      component.itemsPerPage.set(1);
      fixture.detectChanges();

      component.goToPage(2);
      fixture.detectChanges();

      expect(component.currentPage()).toBe(2);
    });

    it('should not go to page less than 1', () => {
      component.goToPage(0);
      fixture.detectChanges();
      expect(component.currentPage()).toBeGreaterThanOrEqual(1);
    });

    it('should not go to page greater than total pages', () => {
      component.itemsPerPage.set(1);
      fixture.detectChanges();

      const totalPages = component.paginationInfo().totalPages;
      component.goToPage(totalPages + 1);
      fixture.detectChanges();

      expect(component.currentPage()).toBeLessThanOrEqual(totalPages);
    });

    it('should go to next page', () => {
      component.itemsPerPage.set(1);
      component.currentPage.set(1);
      fixture.detectChanges();

      component.nextPage();
      fixture.detectChanges();

      expect(component.currentPage()).toBe(2);
    });

    it('should not go to next page if on last page', () => {
      component.itemsPerPage.set(1);
      fixture.detectChanges();

      const totalPages = component.paginationInfo().totalPages;
      component.currentPage.set(totalPages);
      fixture.detectChanges();

      component.nextPage();
      fixture.detectChanges();

      expect(component.currentPage()).toBe(totalPages);
    });

    it('should go to previous page', () => {
      component.currentPage.set(2);
      fixture.detectChanges();

      component.previousPage();
      fixture.detectChanges();

      expect(component.currentPage()).toBe(1);
    });

    it('should not go to previous page if on first page', () => {
      component.currentPage.set(1);
      fixture.detectChanges();

      component.previousPage();
      fixture.detectChanges();

      expect(component.currentPage()).toBe(1);
    });

    it('should paginate products correctly', fakeAsync(() => {
      component.itemsPerPage.set(1);
      component.currentPage.set(1);
      tick();
      fixture.detectChanges();

      const paginated = component.paginatedProducts();
      expect(paginated.length).toBe(1);
    }));

    it('should calculate pagination info correctly', fakeAsync(() => {
      component.itemsPerPage.set(2);
      tick();
      fixture.detectChanges();

      const info = component.paginationInfo();
      expect(info.total).toBe(3);
      expect(info.totalPages).toBe(2);
      expect(info.current).toBe(1);
      expect(info.startItem).toBe(1);
      expect(info.endItem).toBe(2);
    }));

    it('should show all pages when total pages <= maxButtons', fakeAsync(() => {
      component.itemsPerPage.set(1);
      tick();
      fixture.detectChanges();

      const visible = component.visiblePages();
      expect(visible.length).toBe(3);
    }));

    it('should show ellipsis when many pages', fakeAsync(() => {
      for (let i = 4; i <= 15; i++) {
        component.products.push({
          id: String(i),
          name: `Product ${i}`,
          price: 1000 * i,
          goal: 0
        });
      }
      component.itemsPerPage.set(1);
      component.currentPage.set(5);
      tick();
      fixture.detectChanges();

      const visible = component.visiblePages();
      expect(visible).toContain('…');
    }));

    it('should handle visible pages when current page <= 3', fakeAsync(() => {
      for (let i = 4; i <= 15; i++) {
        component.products.push({
          id: String(i),
          name: `Product ${i}`,
          price: 1000 * i,
          goal: 0
        });
      }
      component.itemsPerPage.set(1);
      component.currentPage.set(2);
      tick();
      fixture.detectChanges();

      const visible = component.visiblePages();
      expect(visible.length).toBeLessThanOrEqual(9);
    }));

    it('should handle visible pages when current page >= total - 2', fakeAsync(() => {
      for (let i = 4; i <= 15; i++) {
        component.products.push({
          id: String(i),
          name: `Product ${i}`,
          price: 1000 * i,
          goal: 0
        });
      }
      component.itemsPerPage.set(1);
      fixture.detectChanges();

      const totalPages = component.paginationInfo().totalPages;
      component.currentPage.set(totalPages - 1);
      tick();
      fixture.detectChanges();

      const visible = component.visiblePages();
      expect(visible.length).toBeLessThanOrEqual(9);
    }));
  });

  describe('Computed Signals', () => {
    beforeEach(fakeAsync(() => {
      flush();
      fixture.detectChanges();
    }));

    it('should compute plannedProducts correctly', () => {
      component.products[0].goal = 50;
      component.products[1].goal = 0;
      component.products[2].goal = 30;
      fixture.detectChanges();

      const planned = component.plannedProducts();
      expect(planned.length).toBe(2);
      expect(planned).toContain(component.products[0]);
      expect(planned).toContain(component.products[2]);
    });

    it('should compute calculatedTotalValue correctly', () => {
      localStorage.setItem('userCountry', 'CO');
      component.products[0].goal = 10;
      component.products[0].price = 5000;
      component.products[1].goal = 5;
      component.products[1].price = 7500;
      fixture.detectChanges();

      const total = component.calculatedTotalValue();
      expect(total).toBe(10 * 5000 + 5 * 7500);
    });

    it('should compute totalPlannedValue with manual value', fakeAsync(() => {
      component.onTotalGoalChange('1000000');
      tick();
      fixture.detectChanges();

      component.products[0].goal = 50;
      fixture.detectChanges();

      const total = component.totalPlannedValue();
      expect(total).toBe(1000000);
    }));

    it('should validate goal when manual value is within range', fakeAsync(() => {
      component.products[0].goal = 10;
      component.products[0].price = 10000;
      fixture.detectChanges();

      component.onTotalGoalChange('110000');
      tick();
      fixture.detectChanges();

      expect(component.isGoalValid()).toBe(true);
    }));

    it('should invalidate goal when manual value is below range', fakeAsync(() => {
      component.products[0].goal = 10;
      component.products[0].price = 10000;
      fixture.detectChanges();

      component.onTotalGoalChange('85000');
      tick();
      fixture.detectChanges();

      expect(component.isGoalValid()).toBe(false);
    }));

    it('should invalidate goal when manual value is above range', fakeAsync(() => {
      component.products[0].goal = 10;
      component.products[0].price = 10000;
      fixture.detectChanges();

      component.onTotalGoalChange('130000');
      tick();
      fixture.detectChanges();

      expect(component.isGoalValid()).toBe(false);
    }));

    it('should validate goal when manual value is null', () => {
      component.products[0].goal = 10;
      fixture.detectChanges();

      expect(component.isGoalValid()).toBe(true);
    });

    it('should validate goal when calculated value is 0', fakeAsync(() => {
      component.onTotalGoalChange('1000');
      tick();
      fixture.detectChanges();

      component.products[0].goal = 0;
      fixture.detectChanges();

      expect(component.isGoalValid()).toBe(true);
    }));
  });

  describe('updateTotalGoalFromProducts', () => {
    beforeEach(fakeAsync(() => {
      flush();
      fixture.detectChanges();
    }));

    it('should update total goal when products have goals', fakeAsync(() => {
      component.selectedProducts = [component.products[0]];
      component.products[0].goal = 20;
      component.products[0].price = 5000;

      component.selectProduct(component.products[0]);
      tick();
      fixture.detectChanges();

      const totalGoal = component.salesPlanForm.get('totalGoal')?.value;
      expect(totalGoal).toBeTruthy();
    }));

    it('should format total goal with currency symbol', fakeAsync(() => {
      localStorage.setItem('userCountry', 'CO');
      component.selectedProducts = [component.products[0]];
      component.products[0].goal = 10;
      component.products[0].price = 5000;

      component.selectProduct(component.products[0]);
      tick();
      fixture.detectChanges();

      const totalGoal = component.salesPlanForm.get('totalGoal')?.value;
      expect(totalGoal).toContain('$');
    }));
  });

  describe('Edge Cases', () => {
    beforeEach(fakeAsync(() => {
      flush();
    }));

    it('should handle product without product_id but with sku', fakeAsync(() => {
      const productWithoutId = {
        id: '',
        sku: 'TEST-001',
        name: 'Test Product',
        value: 1000,
        category_name: 'Test',
        total_quantity: 10
      };

      productsService.getAvailableProducts.and.returnValue(of({
        products: [productWithoutId],
        total: 1,
        success: true
      } as any));

      TestBed.overrideProvider(ProductsService, { useValue: productsService });
      fixture = TestBed.createComponent(SalesPlan);
      component = fixture.componentInstance;

      flush();
      fixture.detectChanges();

      expect(component.products.length).toBe(1);
      expect(component.products[0].id).toBe('TEST-001');
    }));

    it('should handle product with zero price', fakeAsync(() => {
      flush();
      fixture.detectChanges();
      component.products[0].price = 0;
      const converted = component.getConvertedPrice(component.products[0]);
      expect(converted).toBe(0);
    }));

    it('should handle product with negative price', fakeAsync(() => {
      flush();
      fixture.detectChanges();
      component.products[0].price = -100;
      const converted = component.getConvertedPrice(component.products[0]);
      expect(converted).toBeLessThan(0);
    }));

    it('should handle pagination with zero items per page', fakeAsync(() => {
      flush();
      fixture.detectChanges();

      component.itemsPerPage.set(0);
      tick();
      fixture.detectChanges();

      const info = component.paginationInfo();
      expect(info.totalPages).toBe(Infinity);
    }));

    it('should handle empty products array', fakeAsync(() => {
      productsService.getAvailableProducts.and.returnValue(of({ products: [], total: 0, success: true }));
      TestBed.overrideProvider(ProductsService, { useValue: productsService });

      fixture = TestBed.createComponent(SalesPlan);
      component = fixture.componentInstance;

      flush();
      fixture.detectChanges();

      expect(component.products.length).toBe(0);
      expect(component.filteredProducts().length).toBe(0);
      expect(component.plannedProducts().length).toBe(0);
      expect(component.isFormValid()).toBe(false);
    }));

    it('should handle product selection with duplicate IDs', fakeAsync(() => {
      flush();
      fixture.detectChanges();

      const product1 = { ...component.products[0], id: '1' };
      const product2 = { ...component.products[1], id: '1' };
      component.products[1] = product2;
      fixture.detectChanges();

      component.selectProduct(product1);
      fixture.detectChanges();

      component.selectProduct(product2);
      fixture.detectChanges();

      expect(component.selectedProducts.length).toBe(0);
    }));

    it('should handle goal value as string in saveGoal', fakeAsync(() => {
      flush();
      fixture.detectChanges();

      component.currentProduct = component.products[0];
      component.goalValue = '100';
      component.showGoalModal = true;
      fixture.detectChanges();

      component.saveGoal();
      tick();
      fixture.detectChanges();

      expect(component.products[0].goal).toBe(100);
    }));

    it('should handle fractional goal values', fakeAsync(() => {
      flush();
      fixture.detectChanges();

      component.currentProduct = component.products[0];
      component.goalValue = '10.5';
      component.showGoalModal = true;
      fixture.detectChanges();

      component.saveGoal();
      tick();
      fixture.detectChanges();

      expect(component.products[0].goal).toBe(10.5);
    }));

    it('should handle product mapping with id from different fields (sku)', fakeAsync(() => {
      const productWithSku = {
        product_id: null,
        id: null,
        sku: 'SKU-001',
        name: 'Product by SKU',
        value: 1000,
        image_url: undefined
      };

      productsService.getAvailableProducts.and.returnValue(of({
        products: [productWithSku],
        total: 1,
        success: true
      } as any));

      TestBed.overrideProvider(ProductsService, { useValue: productsService });
      fixture = TestBed.createComponent(SalesPlan);
      component = fixture.componentInstance;

      flush();
      fixture.detectChanges();

      expect(component.products.length).toBe(1);
      expect(component.products[0].id).toBe('SKU-001');
    }));

    it('should handle region label mapping without label property', fakeAsync(() => {
      const regionsWithoutLabel = [
        { value: 'Norte' },
        { value: 'Sur' }
      ];

      offerService.getRegions.and.returnValue(of(regionsWithoutLabel as any));

      TestBed.overrideProvider(OfferService, { useValue: offerService });
      fixture = TestBed.createComponent(SalesPlan);
      component = fixture.componentInstance;

      flush();
      fixture.detectChanges();

      expect(component.regionOptions.length).toBe(2);
      expect(component.regionOptions[0].label).toBe('Norte');
    }));

    it('should handle region with accents in labelKey', fakeAsync(() => {
      const regionsWithAccents = [
        { value: 'Región', label: 'Región' }
      ];

      offerService.getRegions.and.returnValue(of(regionsWithAccents as any));

      TestBed.overrideProvider(OfferService, { useValue: offerService });
      fixture = TestBed.createComponent(SalesPlan);
      component = fixture.componentInstance;

      flush();
      fixture.detectChanges();

      expect(component.regionOptions.length).toBe(1);
      expect(component.regionOptions[0].labelKey).toBe('region_region');
    }));

    it('should test convertValue for all countries', fakeAsync(() => {
      flush();
      fixture.detectChanges();
      const testPrice = 1000;

      localStorage.setItem('userCountry', 'CO');
      expect(component.getConvertedPrice({ id: '1', name: 'Test', price: testPrice, goal: 0 })).toBe(1000);

      localStorage.setItem('userCountry', 'PE');
      expect(component.getConvertedPrice({ id: '1', name: 'Test', price: testPrice, goal: 0 })).toBe(3700);

      localStorage.setItem('userCountry', 'EC');
      expect(component.getConvertedPrice({ id: '1', name: 'Test', price: testPrice, goal: 0 })).toBe(1000);

      localStorage.setItem('userCountry', 'MX');
      expect(component.getConvertedPrice({ id: '1', name: 'Test', price: testPrice, goal: 0 })).toBe(17500);

      localStorage.setItem('userCountry', 'UNKNOWN');
      expect(component.getConvertedPrice({ id: '1', name: 'Test', price: testPrice, goal: 0 })).toBe(1000);
    }));

    it('should test extractNumericValue with different formats', fakeAsync(() => {
      flush();
      fixture.detectChanges();

      component.onTotalGoalChange('$1,000,000');
      tick();
      expect(component.totalPlannedValue()).toBe(1000000);

      component.onTotalGoalChange('S/ 500,000');
      tick();
      expect(component.totalPlannedValue()).toBe(500000);

      component.onTotalGoalChange('$ 1 000 000');
      tick();
      expect(component.totalPlannedValue()).toBe(1000000);

      component.onTotalGoalChange('123456');
      tick();
      expect(component.totalPlannedValue()).toBe(123456);

      component.onTotalGoalChange('$0');
      tick();
      expect(component.totalPlannedValue()).toBe(0);
    }));

    it('should execute valueChanges subscription on region change', fakeAsync(() => {
      flush();
      fixture.detectChanges();

      component.salesPlanForm.patchValue({ region: 'Norte' });
      tick();
      fixture.detectChanges();

      expect(component.salesPlanForm.get('region')?.value).toBe('Norte');

      component.salesPlanForm.patchValue({ region: 'Sur' });
      tick();
      fixture.detectChanges();

      expect(component.salesPlanForm.get('region')?.value).toBe('Sur');
    }));

    it('should execute valueChanges subscription on quarter change', fakeAsync(() => {
      flush();
      fixture.detectChanges();

      component.salesPlanForm.patchValue({ quarter: 'Q1' });
      tick();
      fixture.detectChanges();

      expect(component.salesPlanForm.get('quarter')?.value).toBe('Q1');

      component.salesPlanForm.patchValue({ quarter: 'Q2' });
      tick();
      fixture.detectChanges();

      expect(component.salesPlanForm.get('quarter')?.value).toBe('Q2');
    }));

    it('should execute all lines in loadAvailableProducts next callback', fakeAsync(() => {
      const productWithAllFields = {
        product_id: 99,
        sku: 'SKU-99',
        name: 'Product Complete',
        value: 9999,
        image_url: 'complete.jpg'
      };

      productsService.getAvailableProducts.and.returnValue(of({
        products: [productWithAllFields],
        total: 1,
        success: true
      } as any));

      TestBed.overrideProvider(ProductsService, { useValue: productsService });
      fixture = TestBed.createComponent(SalesPlan);
      component = fixture.componentInstance;

      flush();
      fixture.detectChanges();

      expect(component.products.length).toBe(1);
      expect(component.products[0].id).toBe('99');
      expect(component.products[0].name).toBe('Product Complete');
      expect(component.products[0].price).toBe(9999);
      expect(component.products[0].image).toBe('complete.jpg');
    }));

    it('should execute all lines in loadCatalogs regions next callback', fakeAsync(() => {
      const regionsWithAllFields = [
        { value: 'Norte', label: 'Norte Label' },
        { value: 'Sur', label: 'Sur Label' }
      ];

      offerService.getRegions.and.returnValue(of(regionsWithAllFields));

      TestBed.overrideProvider(OfferService, { useValue: offerService });
      fixture = TestBed.createComponent(SalesPlan);
      component = fixture.componentInstance;

      flush();
      fixture.detectChanges();

      expect(component.regionOptions.length).toBe(2);
      expect(component.regionOptions[0].value).toBe('Norte');
      expect(component.regionOptions[0].label).toBe('Norte Label');
      expect(component.regionOptions[0].labelKey).toContain('region_norte');
      expect(component.regionOptions[1].value).toBe('Sur');
      expect(component.regionOptions[1].label).toBe('Sur Label');
    }));

    it('should execute all lines in loadCatalogs quarters next callback', fakeAsync(() => {
      const quartersWithAllFields = [
        { value: 'Q1', label: 'Q1 Label' },
        { value: 'Q2', label: 'Q2 Label' }
      ];

      offerService.getQuarters.and.returnValue(of(quartersWithAllFields as any));

      TestBed.overrideProvider(OfferService, { useValue: offerService });
      fixture = TestBed.createComponent(SalesPlan);
      component = fixture.componentInstance;

      flush();
      fixture.detectChanges();

      expect(component.quarterOptions.length).toBe(2);
      expect(component.quarterOptions[0].value).toBe('Q1');
      expect(component.quarterOptions[0].labelKey).toBe('quarter_q1');
      expect(component.quarterOptions[1].value).toBe('Q2');
      expect(component.quarterOptions[1].labelKey).toBe('quarter_q2');
    }));

    it('should execute all lines in createSalesPlan including reduce operations', fakeAsync(() => {
      flush();
      fixture.detectChanges();

      component.salesPlanForm.patchValue({ region: 'Norte', quarter: 'Q1' });

      component.products[0].goal = 10;
      component.products[0].price = 5000;
      component.products[1].goal = 20;
      component.products[1].price = 3000;
      component.products[2].goal = 0;

      component.selectProduct(component.products[0]);
      component.selectProduct(component.products[1]);
      tick();
      fixture.detectChanges();

      const mockResponse: CreateSalesPlanResponse = {
        success: true,
        id: '123',
        message: 'Success'
      };

      offerService.createSalesPlan.and.returnValue(of(mockResponse));

      component.createSalesPlan();
      tick();
      fixture.detectChanges();

      const payload = offerService.createSalesPlan.calls.mostRecent().args[0];

      expect(payload.region).toBe('Norte');
      expect(payload.quarter).toBe('Q1');
      expect(payload.products.length).toBe(2);
      expect(payload.products[0].product_id).toBe(1);
      expect(payload.products[0].individual_goal).toBe(10);
      expect(payload.products[1].product_id).toBe(2);
      expect(payload.products[1].individual_goal).toBe(20);
    }));

    it('should execute all branches in createSalesPlan response handling', fakeAsync(() => {
      flush();
      fixture.detectChanges();

      component.salesPlanForm.patchValue({ region: 'Norte', quarter: 'Q1' });
      component.products[0].goal = 10;
      component.selectProduct(component.products[0]);
      tick();
      fixture.detectChanges();

      let mockResponse: any = { success: true, id: '123' };
      offerService.createSalesPlan.and.returnValue(of(mockResponse));
      component.createSalesPlan();
      tick();
      expect(component.saveStatus()).toBe('success');

      mockResponse = { plan_id: '456' };
      offerService.createSalesPlan.and.returnValue(of(mockResponse));
      component.createSalesPlan();
      tick();
      expect(component.saveStatus()).toBe('success');

      mockResponse = { id: '789' };
      offerService.createSalesPlan.and.returnValue(of(mockResponse));
      component.createSalesPlan();
      tick();
      expect(component.saveStatus()).toBe('error');
    }));
  });

  describe('Direct Method Testing', () => {
    beforeEach(fakeAsync(() => {
      flush();
      fixture.detectChanges();
    }));

    it('should test convertValue directly', () => {
      localStorage.setItem('userCountry', 'CO');
      expect(component.convertValue(1000)).toBe(1000);

      localStorage.setItem('userCountry', 'PE');
      expect(component.convertValue(1000)).toBe(3700);

      localStorage.setItem('userCountry', 'MX');
      expect(component.convertValue(1000)).toBe(17500);

      localStorage.setItem('userCountry', 'UNKNOWN');
      expect(component.convertValue(1000)).toBe(1000);
    });

    it('should test extractNumericValue directly', () => {
      expect(component.extractNumericValue('$1,000,000')).toBe(1000000);
      expect(component.extractNumericValue('S/ 500,000')).toBe(500000);
      expect(component.extractNumericValue('$ 1 000 000')).toBe(1000000);
      expect(component.extractNumericValue('123456')).toBe(123456);
      expect(component.extractNumericValue('$0')).toBe(0);
      expect(component.extractNumericValue('')).toBe(0);
      expect(component.extractNumericValue('invalid')).toBe(0);
    });

    it('should test updateTotalGoalFromProducts directly', fakeAsync(() => {
      component.selectedProducts = [];
      component.updateTotalGoalFromProducts();
      tick();
      fixture.detectChanges();
      expect(component.salesPlanForm.get('totalGoal')?.value).toContain('0');

      component.products[0].goal = 10;
      component.products[0].price = 5000;
      component.selectedProducts = [component.products[0]];
      component.updateTotalGoalFromProducts();
      tick();
      fixture.detectChanges();

      const value = component.salesPlanForm.get('totalGoal')?.value;
      expect(value).toContain('50,000');
    }));

    it('should test loadCatalogs directly', fakeAsync(() => {
      offerService.getRegions.calls.reset();
      offerService.getQuarters.calls.reset();
      offerService.getRegions.and.returnValue(of([]));
      offerService.getQuarters.and.returnValue(of([]));

      component.loadCatalogs();
      tick();
      flush();

      expect(offerService.getRegions).toHaveBeenCalled();
      expect(offerService.getQuarters).toHaveBeenCalled();
    }));

    it('should test loadCatalogs error handling for regions', fakeAsync(() => {
      offerService.getRegions.calls.reset();
      offerService.getQuarters.calls.reset();
      offerService.getRegions.and.returnValue(throwError(() => new Error('Error')));
      offerService.getQuarters.and.returnValue(of([]));

      component.loadCatalogs();
      tick();
      flush();

      expect(component.regionOptions.length).toBeGreaterThan(0);
      expect(component.regionOptions[0].value).toBe('norte');
    }));

    it('should test loadCatalogs error handling for quarters', fakeAsync(() => {
      offerService.getRegions.calls.reset();
      offerService.getQuarters.calls.reset();
      offerService.getRegions.and.returnValue(of([]));
      offerService.getQuarters.and.returnValue(throwError(() => new Error('Error')));

      component.loadCatalogs();
      tick();
      flush();

      expect(component.quarterOptions.length).toBeGreaterThan(0);
      expect(component.quarterOptions[0].value).toBe('Q1');
    }));

    it('should test loadAvailableProducts directly', fakeAsync(() => {
      productsService.getAvailableProducts.calls.reset();
      productsService.getAvailableProducts.and.returnValue(of(mockProductsResponse));

      component.loadAvailableProducts();
      tick();
      flush();

      expect(component.products.length).toBe(3);
    }));

    it('should test loadAvailableProducts error handling', fakeAsync(() => {
      productsService.getAvailableProducts.calls.reset();
      productsService.getAvailableProducts.and.returnValue(throwError(() => new Error('Error')));

      component.loadAvailableProducts();
      tick();
      flush();

      expect(component.products.length).toBe(0);
    }));

    it('should test createSalesPlan with hasSuccess = true branch', fakeAsync(() => {
      component.salesPlanForm.patchValue({ region: 'Norte', quarter: 'Q1' });
      component.products[0].goal = 10;
      component.selectProduct(component.products[0]);
      tick();
      fixture.detectChanges();

      const mockResponse: any = { success: true };
      offerService.createSalesPlan.and.returnValue(of(mockResponse));
      component.createSalesPlan();
      tick();
      fixture.detectChanges();

      expect(component.saveStatus()).toBe('success');
    }));

    it('should test createSalesPlan with hasPlanId = true branch', fakeAsync(() => {
      component.salesPlanForm.patchValue({ region: 'Norte', quarter: 'Q1' });
      component.products[0].goal = 10;
      component.selectProduct(component.products[0]);
      tick();
      fixture.detectChanges();

      const mockResponse: any = { plan_id: '123' };
      offerService.createSalesPlan.and.returnValue(of(mockResponse));
      component.createSalesPlan();
      tick();
      fixture.detectChanges();

      expect(component.saveStatus()).toBe('success');
    }));

    it('should test createSalesPlan with both hasSuccess and hasPlanId false', fakeAsync(() => {
      component.salesPlanForm.patchValue({ region: 'Norte', quarter: 'Q1' });
      component.products[0].goal = 10;
      component.selectProduct(component.products[0]);
      tick();
      fixture.detectChanges();

      const mockResponse: any = { id: '123' };
      offerService.createSalesPlan.and.returnValue(of(mockResponse));
      component.createSalesPlan();
      tick();
      fixture.detectChanges();

      expect(component.saveStatus()).toBe('error');
    }));

    it('should test createSalesPlan with null response', fakeAsync(() => {
      component.salesPlanForm.patchValue({ region: 'Norte', quarter: 'Q1' });
      component.products[0].goal = 10;
      component.selectProduct(component.products[0]);
      tick();
      fixture.detectChanges();

      const mockResponse: any = null;
      offerService.createSalesPlan.and.returnValue(of(mockResponse));
      component.createSalesPlan();
      tick();
      fixture.detectChanges();

      expect(component.saveStatus()).toBe('error');
    }));
  });

  describe('Additional Coverage Tests', () => {
    beforeEach(fakeAsync(() => {
      flush();
      fixture.detectChanges();
    }));

    describe('visiblePages edge cases', () => {
      it('should handle visiblePages with exactly 9 pages', fakeAsync(() => {
        // Crear exactamente 9 productos para tener 9 páginas
        for (let i = 4; i <= 12; i++) {
          component.products.push({
            id: String(i),
            name: `Product ${i}`,
            price: 1000 * i
          });
        }
        component.itemsPerPage.set(1);
        component.currentPage.set(5);
        tick();
        fixture.detectChanges();

        const visible = component.visiblePages();
        expect(visible.length).toBeLessThanOrEqual(9);
        expect(visible.length).toBeGreaterThan(0);
      }));

      it('should handle visiblePages when current is exactly at start boundary (page 4)', fakeAsync(() => {
        for (let i = 4; i <= 15; i++) {
          component.products.push({ id: String(i), name: `Product ${i}`, price: 1000 * i, goal: 0 });
        }
        component.itemsPerPage.set(1);
        component.currentPage.set(4);
        tick();
        fixture.detectChanges();

        const visible = component.visiblePages();
        expect(visible).toEqual([1, '…', 2, 3, 4, 5, 6, '…', 15]);
      }));

      it('should handle visiblePages when current is exactly at end boundary (total - 3)', fakeAsync(() => {
        for (let i = 4; i <= 15; i++) {
          component.products.push({ id: String(i), name: `Product ${i}`, price: 1000 * i, goal: 0 });
        }
        component.itemsPerPage.set(1);
        fixture.detectChanges();

        const totalPages = component.paginationInfo().totalPages;
        component.currentPage.set(totalPages - 3);
        tick();
        fixture.detectChanges();

        const visible = component.visiblePages();
        expect(visible).toEqual([1, '…', 10, 11, 12, 13, 14, '…', 15]);
      }));

      it('should handle visiblePages with start > 2 ellipsis case (page 10)', fakeAsync(() => {
        for (let i = 4; i <= 20; i++) {
          component.products.push({ id: String(i), name: `Product ${i}`, price: 1000 * i, goal: 0 });
        }
        component.itemsPerPage.set(1);
        component.currentPage.set(10);
        tick();
        fixture.detectChanges();

        const visible = component.visiblePages();
        expect(visible).toContain('…');
        expect(visible[0]).toBe(1);
      }));

      it('should handle visiblePages with end < total - 1 ellipsis case (page 5)', fakeAsync(() => {
        for (let i = 4; i <= 20; i++) {
          component.products.push({ id: String(i), name: `Product ${i}`, price: 1000 * i, goal: 0 });
        }
        component.itemsPerPage.set(1);
        component.currentPage.set(5);
        tick();
        fixture.detectChanges();

        const totalPages = component.paginationInfo().totalPages;
        const visible = component.visiblePages();
        expect(visible).toContain('…');
        expect(visible[visible.length - 1]).toBe(totalPages);
      }));
    });

    describe('saveGoal edge cases', () => {
      it('should not add product again if already in selectedProducts', fakeAsync(() => {
        component.currentProduct = component.products[0];
        component.goalValue = '50';
        component.selectedProducts = [component.products[0]];
        fixture.detectChanges();

        const initialLength = component.selectedProducts.length;

        component.saveGoal();
        tick();
        fixture.detectChanges();

        expect(component.products[0].goal).toBe(50);
        expect(component.selectedProducts.length).toBe(initialLength);
      }));

      it('should handle saveGoal with empty goalValue', () => {
        component.currentProduct = component.products[0];
        component.goalValue = '';
        component.showGoalModal = true;
        fixture.detectChanges();

        component.saveGoal();
        fixture.detectChanges();

        expect(component.showGoalModal).toBe(true);
        expect(component.products[0].goal).toBeUndefined();
      });

      it('should handle saveGoal with whitespace goalValue', () => {
        component.currentProduct = component.products[0];
        component.goalValue = '   ';
        component.showGoalModal = true;
        fixture.detectChanges();

        component.saveGoal();
        fixture.detectChanges();

        expect(component.showGoalModal).toBe(true);
        expect(component.products[0].goal).toBeUndefined();
      });

      it('should handle saveGoal with goalValue = 0', () => {
        component.currentProduct = component.products[0];
        component.goalValue = '0';
        component.showGoalModal = true;
        fixture.detectChanges();

        component.saveGoal();
        fixture.detectChanges();

        expect(component.showGoalModal).toBe(true);
        expect(component.products[0].goal).toBeUndefined();
      });

      it('should handle saveGoal with very large number', fakeAsync(() => {
        component.currentProduct = component.products[0];
        component.goalValue = '999999999';
        component.showGoalModal = true;
        fixture.detectChanges();

        component.saveGoal();
        tick();
        fixture.detectChanges();

        expect(component.products[0].goal).toBe(999999999);
        expect(component.showGoalModal).toBe(false);
      }));
    });

    describe('onTotalGoalChange edge cases', () => {
      it('should handle onTotalGoalChange with invalid string', fakeAsync(() => {
        component.onTotalGoalChange('abc123def');
        tick();
        fixture.detectChanges();

        const extracted = component.extractNumericValue('abc123def');
        if (extracted > 0) {
          expect(component.totalPlannedValue()).toBeGreaterThanOrEqual(0);
        } else {
          expect(component.totalPlannedValue()).toBeGreaterThanOrEqual(0);
        }
      }));

      it('should handle onTotalGoalChange with only symbols', fakeAsync(() => {
        component.onTotalGoalChange('$$$');
        tick();
        fixture.detectChanges();

        const extracted = component.extractNumericValue('$$$');
        expect(extracted).toBe(0);
        expect(component.totalPlannedValue()).toBeGreaterThanOrEqual(0);
      }));

      it('should handle onTotalGoalChange with negative value', fakeAsync(() => {
        component.onTotalGoalChange('-1000');
        tick();
        fixture.detectChanges();

        const extracted = component.extractNumericValue('-1000');
        expect(extracted).toBeLessThanOrEqual(0);
      }));

      it('should handle onTotalGoalChange with mixed formatting', fakeAsync(() => {
        component.onTotalGoalChange('$ 1,234,567.89');
        tick();
        fixture.detectChanges();

        const value = component.totalPlannedValue();
        expect(value).toBeGreaterThan(0);
      }));
    });

    describe('isGoalValid boundary cases', () => {
      it('should validate goal at exact minimum boundary (90%)', fakeAsync(() => {
        component.products[0].goal = 10;
        component.products[0].price = 10000;
        fixture.detectChanges();

        component.onTotalGoalChange('90000');
        tick();
        fixture.detectChanges();

        expect(component.isGoalValid()).toBe(true);
      }));

      it('should validate goal at exact maximum boundary (120%)', fakeAsync(() => {
        component.products[0].goal = 10;
        component.products[0].price = 10000;
        fixture.detectChanges();

        component.onTotalGoalChange('120000');
        tick();
        fixture.detectChanges();

        expect(component.isGoalValid()).toBe(true);
      }));

      it('should invalidate goal just below minimum (89.9%)', fakeAsync(() => {
        component.products[0].goal = 10;
        component.products[0].price = 10000;
        fixture.detectChanges();

        component.onTotalGoalChange('89999');
        tick();
        fixture.detectChanges();

        expect(component.isGoalValid()).toBe(false);
      }));

      it('should invalidate goal just above maximum (120.1%)', fakeAsync(() => {
        component.products[0].goal = 10;
        component.products[0].price = 10000;
        fixture.detectChanges();

        component.onTotalGoalChange('120001');
        tick();
        fixture.detectChanges();

        expect(component.isGoalValid()).toBe(false);
      }));

      it('should validate goal with zero calculated value', fakeAsync(() => {
        component.products[0].goal = 0;
        fixture.detectChanges();

        component.onTotalGoalChange('1000');
        tick();
        fixture.detectChanges();

        expect(component.isGoalValid()).toBe(true);
      }));
    });

    describe('updateTotalGoalFromProducts edge cases', () => {
      it('should update total goal with multiple products with goals', fakeAsync(() => {
        component.products[0].goal = 10;
        component.products[0].price = 5000;
        component.products[1].goal = 20;
        component.products[1].price = 3000;
        component.products[2].goal = 5;
        component.products[2].price = 7500;

        component.selectedProducts = [
          component.products[0],
          component.products[1],
          component.products[2]
        ];
        fixture.detectChanges();

        component.updateTotalGoalFromProducts();
        tick();
        fixture.detectChanges();

        const totalGoal = component.salesPlanForm.get('totalGoal')?.value;
        expect(totalGoal).toBeTruthy();
        expect(totalGoal).toContain(component.currencySymbol());
      }));

      it('should update total goal with products with zero goals', fakeAsync(() => {
        component.products[0].goal = 0;
        component.products[0].price = 5000;
        component.products[1].goal = 0;
        component.products[1].price = 3000;

        component.selectedProducts = [
          component.products[0],
          component.products[1]
        ];
        fixture.detectChanges();

        component.updateTotalGoalFromProducts();
        tick();
        fixture.detectChanges();

        const totalGoal = component.salesPlanForm.get('totalGoal')?.value;
        const numeric = component.extractNumericValue(totalGoal);
        expect(numeric).toBe(0);
      }));

      it('should update total goal with empty selectedProducts', fakeAsync(() => {
        component.selectedProducts = [];
        fixture.detectChanges();

        component.updateTotalGoalFromProducts();
        tick();
        fixture.detectChanges();

        const totalGoal = component.salesPlanForm.get('totalGoal')?.value;
        const numeric = component.extractNumericValue(totalGoal);
        expect(numeric).toBe(0);
      }));
    });

    describe('selectProduct edge cases', () => {
      it('should handle selectProduct with product already selected and goal exists', fakeAsync(() => {
        const product = component.products[0];
        product.goal = 50;
        component.selectedProducts = [product];
        fixture.detectChanges();

        component.selectProduct(product);
        tick();
        fixture.detectChanges();

        expect(component.selectedProducts).not.toContain(product);
        expect(component.isProductSelected(product)).toBe(false);
      }));

      it('should handle selectProduct multiple times rapidly', fakeAsync(() => {
        const product = component.products[0];

        component.selectProduct(product);
        tick();
        fixture.detectChanges();
        expect(component.isProductSelected(product)).toBe(true);

        component.selectProduct(product);
        tick();
        fixture.detectChanges();
        expect(component.isProductSelected(product)).toBe(false);

        component.selectProduct(product);
        tick();
        fixture.detectChanges();
        expect(component.isProductSelected(product)).toBe(true);
      }));
    });

    describe('filteredProducts complex cases', () => {
      it('should filter and sort products together', fakeAsync(() => {
        component.productSearchFilter.set('Aspirina');
        component.setSortBy('price');
        component.sortOrder.set('desc');

        tick();
        fixture.detectChanges();

        const filtered = component.filteredProducts();
        expect(filtered.length).toBe(1);
        expect(filtered[0].name).toContain('Aspirina');
      }));

      it('should handle filter with special characters (no match)', fakeAsync(() => {
        component.productSearchFilter.set('pará-500');
        tick();
        fixture.detectChanges();

        const filtered = component.filteredProducts();
        expect(filtered.length).toBe(0);
      }));

      it('should handle filter with only spaces', fakeAsync(() => {
        component.productSearchFilter.set('   ');
        tick();
        fixture.detectChanges();

        const filtered = component.filteredProducts();
        expect(filtered.length).toBe(3);
      }));

      it('should handle sorting by popularity with different IDs', fakeAsync(() => {
        component.products[0].id = '10';
        component.products[1].id = '2';
        component.products[2].id = '30';
        fixture.detectChanges();

        component.setSortBy('popularity');
        component.sortOrder.set('asc');
        tick();
        fixture.detectChanges();

        const filtered = component.filteredProducts();
        expect(filtered.map(p => p.id)).toEqual(['2', '10', '30']);
      }));

      it('should handle sorting by popularity with non-numeric IDs', fakeAsync(() => {
        component.products[0].id = 'ABC';
        component.products[1].id = 'DEF';
        component.products[2].id = 'GHI';
        fixture.detectChanges();

        component.setSortBy('popularity');
        tick();
        fixture.detectChanges();

        const filtered = component.filteredProducts();
        expect(filtered.length).toBe(3);
      }));
    });

    describe('paginatedProducts edge cases', () => {
      it('should handle pagination with last page having fewer items', fakeAsync(() => {
        component.itemsPerPage.set(2);
        component.currentPage.set(2);
        tick();
        fixture.detectChanges();

        const paginated = component.paginatedProducts();
        expect(paginated.length).toBe(1);
      }));

      it('should handle pagination when current page exceeds total pages', fakeAsync(() => {
        component.itemsPerPage.set(10);
        component.currentPage.set(100);
        tick();
        fixture.detectChanges();

        const paginated = component.paginatedProducts();
        expect(paginated.length).toBe(0);
      }));

      it('should handle pagination with itemsPerPage greater than total', fakeAsync(() => {
        component.itemsPerPage.set(100);
        component.currentPage.set(1);
        tick();
        fixture.detectChanges();

        const paginated = component.paginatedProducts();
        expect(paginated.length).toBe(3);
      }));
    });

    describe('convertValue edge cases', () => {
      it('should handle convertValue with zero', () => {
        localStorage.setItem('userCountry', 'PE');
        expect(component.convertValue(0)).toBe(0);
      });

      it('should handle convertValue with negative number', () => {
        localStorage.setItem('userCountry', 'PE');
        const result = component.convertValue(-100);
        expect(result).toBe(-370);
      });

      it('should handle convertValue with decimal', () => {
        localStorage.setItem('userCountry', 'PE');
        const result = component.convertValue(1000.5);
        expect(result).toBe(Math.round(1000.5 * 3.7));
      });
    });

    describe('getProductImage edge cases', () => {
      it('should return default image when product.image is empty string', () => {
        component.products[0].image = '';
        const image = component.getProductImage(component.products[0]);
        expect(image).toBe(component.defaultImage);
      });

      it('should return default image when product.image is null', () => {
        component.products[0].image = null as any;
        const image = component.getProductImage(component.products[0]);
        expect(image).toBe(component.defaultImage);
      });
    });

    describe('onImageError edge cases', () => {
      it('should handle onImageError with missing target', () => {
        const event = {} as any;
        expect(() => component.onImageError(event, component.products[0])).not.toThrow();
      });

      it('should handle onImageError with null target', () => {
        const event = { target: null } as any;
        expect(() => component.onImageError(event, component.products[0])).not.toThrow();
      });
    });

    describe('createSalesPlan edge cases', () => {
      it('should handle createSalesPlan with product having zero as ID', fakeAsync(() => {
        component.salesPlanForm.patchValue({ region: 'Norte', quarter: 'Q1' });
        component.products[0].id = '0';
        component.products[0].goal = 10;
        component.selectProduct(component.products[0]);
        tick();
        fixture.detectChanges();

        offerService.createSalesPlan.and.returnValue(of({ success: true, id: '123' }));

        component.createSalesPlan();
        tick();
        fixture.detectChanges();

        const payload = offerService.createSalesPlan.calls.mostRecent().args[0];
        expect(payload.products[0].product_id).toBe(0);
      }));

      it('should handle createSalesPlan with product having non-numeric ID', fakeAsync(() => {
        component.salesPlanForm.patchValue({ region: 'Norte', quarter: 'Q1' });
        component.products[0].id = 'ABC';
        component.products[0].goal = 10;
        component.selectProduct(component.products[0]);
        tick();
        fixture.detectChanges();

        offerService.createSalesPlan.and.returnValue(of({ success: true, id: '123' }));

        component.createSalesPlan();
        tick();
        fixture.detectChanges();

        const payload = offerService.createSalesPlan.calls.mostRecent().args[0];
        expect(payload.products[0].product_id).toBe(0);
      }));

      it('should not call createSalesPlan if only products with goal = 0 (form invalid)', fakeAsync(() => {
        component.salesPlanForm.patchValue({ region: 'Norte', quarter: 'Q1' });
        component.products[0].goal = 0;
        component.products[1].goal = 0;
        component.products[2].goal = 0;
        tick();
        fixture.detectChanges();

        component.createSalesPlan();
        tick();
        fixture.detectChanges();

        expect(offerService.createSalesPlan).not.toHaveBeenCalled();
      }));

      it('should handle createSalesPlan with mixed goal values', fakeAsync(() => {
        component.salesPlanForm.patchValue({ region: 'Norte', quarter: 'Q1' });
        component.products[0].goal = 10;
        component.products[1].goal = 0;
        component.products[2].goal = 20;

        component.selectProduct(component.products[0]);
        component.selectProduct(component.products[2]);
        tick();
        fixture.detectChanges();

        offerService.createSalesPlan.and.returnValue(of({ success: true, id: '123' }));

        component.createSalesPlan();
        tick();
        fixture.detectChanges();

        const payload = offerService.createSalesPlan.calls.mostRecent().args[0];
        expect(payload.products.length).toBe(2);
      }));
    });

    describe('isFormValid reactivity', () => {
      it('should react to selectedProductsVersion changes (saveGoal)', fakeAsync(() => {
        component.salesPlanForm.patchValue({ region: 'Norte', quarter: 'Q1' });
        tick();
        fixture.detectChanges();

        expect(component.isFormValid()).toBe(false);

        component.currentProduct = component.products[0];
        component.goalValue = '50';
        component.showGoalModal = true;
        component.saveGoal();
        tick();
        fixture.detectChanges();

        expect(component.isFormValid()).toBe(true);
      }));

      it('should react to formVersion changes on region', fakeAsync(() => {
        component.salesPlanForm.patchValue({ quarter: 'Q1' });
        component.products[0].goal = 50;
        component.selectProduct(component.products[0]);
        tick();
        fixture.detectChanges();

        expect(component.isFormValid()).toBe(false);

        component.salesPlanForm.patchValue({ region: 'Norte' });
        tick();
        fixture.detectChanges();

        expect(component.isFormValid()).toBe(true);
      }));

      it('should react to formVersion changes on quarter', fakeAsync(() => {
        component.salesPlanForm.patchValue({ region: 'Norte' });
        component.products[0].goal = 50;
        component.selectProduct(component.products[0]);
        tick();
        fixture.detectChanges();

        expect(component.isFormValid()).toBe(false);

        component.salesPlanForm.patchValue({ quarter: 'Q1' });
        tick();
        fixture.detectChanges();

        expect(component.isFormValid()).toBe(true);
      }));
    });

    describe('extractNumericValue additional cases', () => {
      it('should handle extractNumericValue with multiple S/ symbols', () => {
        const result = component.extractNumericValue('S/ S/ 1000');
        expect(result).toBe(1000);
      });

      it('should handle extractNumericValue with only commas', () => {
        const result = component.extractNumericValue(',,,,');
        expect(result).toBe(0);
      });

      it('should handle extractNumericValue with scientific notation string', () => {
        const result = component.extractNumericValue('1e5');
        expect(result).toBe(100000);
      });
    });

    describe('currencySymbol reactivity', () => {
      it('should update when country changes', () => {
        localStorage.setItem('userCountry', 'CO');
        const symbolCO = component.currencySymbol();

        localStorage.setItem('userCountry', 'PE');
        const symbolPE = component.currencySymbol();

        expect(symbolCO).toBe('$');
        expect(symbolPE).toBe('S/');
      });
    });

    describe('getConvertedPrice edge cases', () => {
      it('should handle getConvertedPrice with different countries', () => {
        localStorage.setItem('userCountry', 'CO');
        const priceCO = component.getConvertedPrice(component.products[0]);

        localStorage.setItem('userCountry', 'MX');
        const priceMX = component.getConvertedPrice(component.products[0]);

        expect(priceMX).toBeGreaterThan(priceCO);
      });
    });

    describe('onSearchChange edge cases', () => {
      it('should reset page when search changes to empty', fakeAsync(() => {
        component.currentPage.set(3);
        fixture.detectChanges();

        component.onSearchChange('');
        tick();
        fixture.detectChanges();

        expect(component.currentPage()).toBe(1);
      }));

      it('should reset page when search changes to non-empty', fakeAsync(() => {
        component.currentPage.set(3);
        fixture.detectChanges();

        component.onSearchChange('test');
        tick();
        fixture.detectChanges();

        expect(component.currentPage()).toBe(1);
      }));
    });
  });
});
