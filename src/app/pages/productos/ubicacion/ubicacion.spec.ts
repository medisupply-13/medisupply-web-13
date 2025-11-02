import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { UbicacionComponent } from './ubicacion';
import { LocationService, CitiesResponse, WarehousesResponse, WarehouseProductsResponse, Product, ProductLocation } from '../../../services/location.service';

describe('UbicacionComponent', () => {
  let component: UbicacionComponent;
  let fixture: ComponentFixture<UbicacionComponent>;
  let locationService: jasmine.SpyObj<LocationService>;

  const mockCities = [
    {
      city_id: 1,
      name: 'Bogotá',
      country: 'Colombia',
      country_name: 'Colombia'
    },
    {
      city_id: 2,
      name: 'Medellín',
      country: 'Colombia',
      country_name: 'Colombia'
    }
  ];

  const mockWarehouses = [
    {
      warehouse_id: 1,
      name: 'Bodega Norte',
      description: 'Bodega principal',
      city_name: 'Bogotá'
    }
  ];

  const mockProducts: Product[] = [
    {
      product_id: 1,
      sku: 'MED-001',
      name: 'Producto 1',
      quantity: 50,
      totalAvailable: 50,
      hasAvailability: true,
      locations: [
        {
          section: 'A',
          aisle: '1',
          shelf: '2',
          level: '3',
          lot: 'LOT001',
          expires: '2025-12-31',
          available: 50,
          reserved: 0
        }
      ] as ProductLocation[]
    },
    {
      product_id: 2,
      sku: 'MED-002',
      name: 'Producto 2',
      quantity: 0,
      totalAvailable: 0,
      hasAvailability: false
    }
  ];

  beforeEach(async () => {
    const locationServiceSpy = jasmine.createSpyObj('LocationService', [
      'getCities',
      'getWarehouses',
      'getProductsLocation',
      'getProductsByWarehouse'
    ]);

    await TestBed.configureTestingModule({
      imports: [
        UbicacionComponent,
        HttpClientTestingModule,
        BrowserAnimationsModule
      ],
      providers: [
        { provide: LocationService, useValue: locationServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UbicacionComponent);
    component = fixture.componentInstance;
    locationService = TestBed.inject(LocationService) as jasmine.SpyObj<LocationService>;

    locationService.getCities.and.returnValue(
      of({ cities: mockCities, success: true } as CitiesResponse)
    );
    locationService.getWarehouses.and.returnValue(
      of({ warehouses: mockWarehouses, success: true } as WarehousesResponse)
    );
    locationService.getProductsLocation.and.returnValue(
      of({
        cities: mockCities,
        products: mockProducts,
        warehouses: mockWarehouses,
        summary: {
          countries: ['Colombia'],
          total_cities: 2,
          total_products: 2,
          total_warehouses: 1
        }
      })
    );
    locationService.getProductsByWarehouse.and.returnValue(
      of({
        products: mockProducts,
        success: true,
        warehouse_id: 1
      } as WarehouseProductsResponse)
    );
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have correct page title', () => {
    expect(component.pageTitle).toBe('productLocationTitle');
  });

  it('should initialize with default values', () => {
    expect(component.searchQuery).toBe('');
    expect(component.selectedCity()).toBe('');
    expect(component.selectedWarehouse()).toBe('');
    expect(component.pageSize).toBe(3);
    expect(component.currentPage).toBe(0);
    expect(component.viewMode).toBe('grid');
    expect(component.availabilityFilter).toBe('all');
    expect(component.sortBy).toBe('none');
  });

  describe('ngOnInit', () => {
    it('should load cities and products on init', () => {
      fixture.detectChanges();
      
      expect(locationService.getCities).toHaveBeenCalled();
      expect(locationService.getProductsLocation).toHaveBeenCalled();
    });

    it('should handle error when loading cities', () => {
      locationService.getCities.and.returnValue(
        throwError(() => new Error('Network error'))
      );
      
      fixture.detectChanges();
      
      expect(component.message).toBeTruthy();
      expect(component.message.type).toBe('error');
    });

    it('should handle error when loading products', () => {
      locationService.getProductsLocation.and.returnValue(
        throwError(() => new Error('Network error'))
      );
      
      fixture.detectChanges();
      
      expect(component.message).toBeTruthy();
      expect(component.message.type).toBe('error');
    });
  });

  describe('onCityChange', () => {
    it('should reset warehouse and products when city changes', () => {
      component.selectedWarehouse.set('1');
      component.products = mockProducts;
      
      component.selectedCity.set('1');
      component.onCityChange();
      
      expect(component.selectedWarehouse()).toBe('');
      expect(component.products.length).toBe(0);
      expect(locationService.getWarehouses).toHaveBeenCalledWith(1);
    });

    it('should not load warehouses if no city selected', () => {
      component.selectedCity.set('');
      component.onCityChange();
      
      expect(locationService.getWarehouses).not.toHaveBeenCalled();
    });
  });

  describe('onWarehouseChange', () => {
    it('should load products when warehouse is selected', () => {
      component.selectedWarehouse.set('1');
      component.onWarehouseChange();
      
      expect(locationService.getProductsByWarehouse).toHaveBeenCalledWith(1, true, true);
    });

    it('should clear products when warehouse is cleared', () => {
      component.products = mockProducts;
      component.selectedWarehouse.set('');
      component.onWarehouseChange();
      
      expect(component.products.length).toBe(0);
      expect(locationService.getProductsByWarehouse).not.toHaveBeenCalled();
    });
  });

  describe('onSearch', () => {
    it('should show all products when search query is empty', () => {
      component.products = mockProducts;
      component.filteredProducts = [];
      component.searchQuery = '';
      
      component.onSearch();
      
      expect(component.filteredProducts.length).toBe(2);
      expect(component.message).toBeNull();
    });

    it('should show warning when warehouse is not selected', () => {
      component.selectedWarehouse.set('');
      component.searchQuery = 'test';
      
      component.onSearch();
      
      expect(component.message).toBeTruthy();
      expect(component.message.type).toBe('warning');
    });

    it('should filter products by search query', fakeAsync(() => {
      component.products = mockProducts;
      component.selectedWarehouse.set('1');
      component.searchQuery = 'Producto 1';
      
      component.onSearch();
      
      tick(600);
      expect(component.filteredProducts.length).toBe(1);
      expect(component.filteredProducts[0].name).toBe('Producto 1');
    }));
  });

  describe('onViewLocations', () => {
    it('should open location popup', () => {
      const product = mockProducts[0];
      
      component.onViewLocations(product);
      
      expect(component.showLocationPopup).toBe(true);
      expect(component.selectedProduct).toBe(product);
    });
  });

  describe('closeLocationPopup', () => {
    it('should close location popup', () => {
      component.showLocationPopup = true;
      component.selectedProduct = mockProducts[0];
      
      component.closeLocationPopup();
      
      expect(component.showLocationPopup).toBe(false);
      expect(component.selectedProduct).toBeNull();
    });
  });

  describe('getStockStatus', () => {
    it('should return available for product with stock', () => {
      const product = mockProducts[0];
      const status = component.getStockStatus(product);
      
      expect(status).toBe('available');
    });

    it('should return out-of-stock for product without stock', () => {
      const product = mockProducts[1];
      const status = component.getStockStatus(product);
      
      expect(status).toBe('out-of-stock');
    });

    it('should return low-stock for product with low quantity', () => {
      const product = {
        ...mockProducts[0],
        totalAvailable: 5
      };
      const status = component.getStockStatus(product);
      
      expect(status).toBe('low-stock');
    });
  });

  describe('getStockStatusText', () => {
    it('should return correct status text for available product', () => {
      const product = mockProducts[0];
      const text = component.getStockStatusText(product);
      
      expect(text).toContain('50');
    });

    it('should return correct status text for out of stock product', () => {
      const product = mockProducts[1];
      const text = component.getStockStatusText(product);
      
      expect(text).toBeTruthy();
    });
  });

  describe('toggleViewMode', () => {
    it('should toggle between grid and list view', () => {
      expect(component.viewMode).toBe('grid');
      
      component.toggleViewMode();
      expect(component.viewMode).toBe('list');
      
      component.toggleViewMode();
      expect(component.viewMode).toBe('grid');
    });
  });

  describe('toggleSort', () => {
    it('should cycle through sort options', () => {
      expect(component.sortBy).toBe('none');
      
      component.toggleSort();
      expect(component.sortBy).toBe('name');
      
      component.toggleSort();
      expect(component.sortBy).toBe('availability');
      
      component.toggleSort();
      expect(component.sortBy).toBe('none');
    });
  });

  describe('setAvailabilityFilter', () => {
    it('should set availability filter', () => {
      component.setAvailabilityFilter('available');
      expect(component.availabilityFilter).toBe('available');
      
      component.setAvailabilityFilter('unavailable');
      expect(component.availabilityFilter).toBe('unavailable');
    });

    it('should reset pagination when filter changes', () => {
      component.currentPage = 2;
      
      component.setAvailabilityFilter('available');
      
      expect(component.currentPage).toBe(0);
    });
  });

  describe('getFilteredProducts', () => {
    it('should return filtered products by availability', () => {
      component.filteredProducts = mockProducts;
      component.availabilityFilter = 'available';
      
      const filtered = component.getFilteredProducts();
      
      expect(filtered.length).toBe(1);
      expect(filtered[0].sku).toBe('MED-001');
    });

    it('should return filtered products sorted by name', () => {
      component.filteredProducts = mockProducts;
      component.sortBy = 'name';
      
      const filtered = component.getFilteredProducts();
      
      expect(filtered.length).toBe(2);
    });

    it('should apply pagination', () => {
      component.filteredProducts = mockProducts;
      component.pageSize = 1;
      component.currentPage = 0;
      
      const filtered = component.getFilteredProducts();
      
      expect(filtered.length).toBe(1);
    });
  });

  describe('getAvailableCount', () => {
    it('should return count of available products', () => {
      component.filteredProducts = mockProducts;
      
      const count = component.getAvailableCount();
      
      expect(count).toBe(1);
    });
  });

  describe('getUnavailableCount', () => {
    it('should return count of unavailable products', () => {
      component.filteredProducts = mockProducts;
      
      const count = component.getUnavailableCount();
      
      expect(count).toBe(1);
    });
  });

  describe('formatDate', () => {
    it('should format date string correctly', () => {
      const formatted = component.formatDate('2024-01-15');
      
      expect(formatted).toBeTruthy();
      expect(formatted).toContain('2024');
    });

    it('should return empty string for invalid date', () => {
      const formatted = component.formatDate('invalid-date');
      
      expect(formatted).toBe('');
    });

    it('should return empty string for empty date', () => {
      const formatted = component.formatDate('');
      
      expect(formatted).toBe('');
    });
  });

  describe('onPageChange', () => {
    it('should update page index and size', () => {
      const event = {
        pageIndex: 2,
        pageSize: 5
      };
      
      component.onPageChange(event);
      
      expect(component.currentPage).toBe(2);
      expect(component.pageSize).toBe(5);
    });
  });

  describe('resetPagination', () => {
    it('should reset current page to 0', () => {
      component.currentPage = 5;
      
      component.resetPagination();
      
      expect(component.currentPage).toBe(0);
    });
  });

  describe('trackByProductId', () => {
    it('should return product id for tracking', () => {
      const product = mockProducts[0];
      
      const id = component.trackByProductId(0, product);
      
      expect(id).toBe(1);
    });
  });

  describe('getSortIcon', () => {
    it('should return correct icon for name sort', () => {
      component.sortBy = 'name';
      expect(component.getSortIcon()).toBe('sort_by_alpha');
    });

    it('should return correct icon for availability sort', () => {
      component.sortBy = 'availability';
      expect(component.getSortIcon()).toBe('sort');
    });

    it('should return default icon for no sort', () => {
      component.sortBy = 'none';
      expect(component.getSortIcon()).toBe('sort');
    });
  });

  describe('onImageError', () => {
    it('should set default image on error', () => {
      const event = {
        target: {
          src: ''
        }
      } as any;
      
      component.onImageError(event);
      
      expect(event.target.src).toBe('/assets/images/products/por-defecto.png');
    });
  });

  describe('getStockStatusClass', () => {
    it('should return available class for product with stock', () => {
      const product = mockProducts[0];
      const statusClass = component.getStockStatusClass(product);
      
      expect(statusClass).toBe('available');
    });

    it('should return unavailable class for product without stock', () => {
      const product = mockProducts[1];
      const statusClass = component.getStockStatusClass(product);
      
      expect(statusClass).toBe('unavailable');
    });

    it('should return low-stock class for product with low quantity', () => {
      const product = {
        ...mockProducts[0],
        totalAvailable: 5
      };
      const statusClass = component.getStockStatusClass(product);
      
      expect(statusClass).toBe('low-stock');
    });
  });

  describe('getCityName', () => {
    it('should return city name for valid city id', () => {
      component.cityOptions = [
        { value: '1', name: 'Bogotá', labelKey: 'city_bogota' }
      ];
      
      const cityName = component.getCityName('1');
      
      expect(cityName).toBe('Bogotá');
    });

    it('should return city id when city not found', () => {
      component.cityOptions = [];
      
      const cityName = component.getCityName('999');
      
      expect(cityName).toBe('999');
    });
  });

  describe('getWarehouseName', () => {
    it('should return warehouse name with description', () => {
      component.warehouseOptions = [
        { value: '1', name: 'Bodega Norte', description: 'Bodega principal', labelKey: 'Bodega Norte' }
      ];
      
      const warehouseName = component.getWarehouseName('1');
      
      expect(warehouseName).toBe('Bodega Norte - Bodega principal');
    });

    it('should return warehouse id when warehouse not found', () => {
      component.warehouseOptions = [];
      
      const warehouseName = component.getWarehouseName('999');
      
      expect(warehouseName).toBe('999');
    });
  });

  describe('getTotalFilteredProducts', () => {
    it('should return total count when filter is all', () => {
      component.filteredProducts = mockProducts;
      component.availabilityFilter = 'all';
      
      const count = component.getTotalFilteredProducts();
      
      expect(count).toBe(2);
    });

    it('should return available count when filter is available', () => {
      component.filteredProducts = mockProducts;
      component.availabilityFilter = 'available';
      
      const count = component.getTotalFilteredProducts();
      
      expect(count).toBe(1);
    });

    it('should return unavailable count when filter is unavailable', () => {
      component.filteredProducts = mockProducts;
      component.availabilityFilter = 'unavailable';
      
      const count = component.getTotalFilteredProducts();
      
      expect(count).toBe(1);
    });
  });

  describe('getSortTooltip', () => {
    it('should return correct tooltip for name sort', () => {
      component.sortBy = 'name';
      const tooltip = component.getSortTooltip();
      
      expect(tooltip).toBeTruthy();
    });

    it('should return correct tooltip for availability sort', () => {
      component.sortBy = 'availability';
      const tooltip = component.getSortTooltip();
      
      expect(tooltip).toBeTruthy();
    });

    it('should return correct tooltip for no sort', () => {
      component.sortBy = 'none';
      const tooltip = component.getSortTooltip();
      
      expect(tooltip).toBeTruthy();
    });
  });

  describe('getSortLabel', () => {
    it('should return correct label for name sort', () => {
      component.sortBy = 'name';
      const label = component.getSortLabel();
      
      expect(label).toBeTruthy();
    });

    it('should return correct label for availability sort', () => {
      component.sortBy = 'availability';
      const label = component.getSortLabel();
      
      expect(label).toBeTruthy();
    });

    it('should return empty string for no sort', () => {
      component.sortBy = 'none';
      const label = component.getSortLabel();
      
      expect(label).toBe('');
    });
  });

});

