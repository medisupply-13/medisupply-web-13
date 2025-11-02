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
  });
});
