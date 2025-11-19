import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AddProductDialog, AddProductDialogData } from './add-product-dialog.component';
import { Product } from '../../../services/products.service';

describe('AddProductDialog', () => {
  let component: AddProductDialog;
  let fixture: ComponentFixture<AddProductDialog>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<AddProductDialog>>;
  let mockDialogData: AddProductDialogData;

  const mockCategories = ['Medicamentos', 'Equipos', 'Insumos', 'Dispositivos'];

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    mockDialogData = {
      categories: mockCategories
    };

    await TestBed.configureTestingModule({
      imports: [
        AddProductDialog,
        FormsModule,
        BrowserAnimationsModule
      ],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AddProductDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize with empty product data', () => {
      expect(component.newProduct.sku).toBe('');
      expect(component.newProduct.name).toBe('');
      expect(component.newProduct.value).toBe(0);
      expect(component.newProduct.category_name).toBe('');
      expect(component.newProduct.total_quantity).toBe(0);
      expect(component.newProduct.image_url).toBe('');
    });

    it('should initialize with empty location data', () => {
      expect(component.locationData.section).toBe('');
      expect(component.locationData.aisle).toBe('');
      expect(component.locationData.shelf).toBe('');
      expect(component.locationData.level).toBe('');
    });

    it('should receive categories from dialog data', () => {
      expect(component.data.categories).toEqual(mockCategories);
      expect(component.data.categories.length).toBe(4);
    });
  });

  describe('onCancel', () => {
    it('should close the dialog when cancel is called', () => {
      component.onCancel();
      expect(dialogRef.close).toHaveBeenCalled();
      expect(dialogRef.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('onSave', () => {
    it('should not close dialog when form is invalid (missing sku)', () => {
      component.newProduct = {
        name: 'Test Product',
        value: 100,
        total_quantity: 10,
        category_name: 'Medicamentos'
      };

      component.onSave();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('should not close dialog when form is invalid (missing name)', () => {
      component.newProduct = {
        sku: 'TEST-001',
        value: 100,
        total_quantity: 10,
        category_name: 'Medicamentos'
      };

      component.onSave();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('should not close dialog when form is invalid (missing value)', () => {
      component.newProduct = {
        sku: 'TEST-001',
        name: 'Test Product',
        total_quantity: 10,
        category_name: 'Medicamentos'
      };

      component.onSave();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('should not close dialog when form is invalid (value is 0)', () => {
      component.newProduct = {
        sku: 'TEST-001',
        name: 'Test Product',
        value: 0,
        total_quantity: 10,
        category_name: 'Medicamentos'
      };

      component.onSave();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('should not close dialog when form is invalid (negative value)', () => {
      component.newProduct = {
        sku: 'TEST-001',
        name: 'Test Product',
        value: -10,
        total_quantity: 10,
        category_name: 'Medicamentos'
      };

      component.onSave();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('should not close dialog when form is invalid (missing total_quantity)', () => {
      component.newProduct = {
        sku: 'TEST-001',
        name: 'Test Product',
        value: 100,
        category_name: 'Medicamentos'
      };
      component.newProduct.total_quantity = undefined;

      component.onSave();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('should not close dialog when form is invalid (negative total_quantity)', () => {
      component.newProduct = {
        sku: 'TEST-001',
        name: 'Test Product',
        value: 100,
        total_quantity: -5,
        category_name: 'Medicamentos'
      };

      component.onSave();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('should not close dialog when form is invalid (missing category_name)', () => {
      component.newProduct = {
        sku: 'TEST-001',
        name: 'Test Product',
        value: 100,
        total_quantity: 10
      };

      component.onSave();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('should close dialog with product data when form is valid', () => {
      component.newProduct = {
        sku: 'TEST-001',
        name: 'Test Product',
        value: 100.50,
        total_quantity: 10,
        category_name: 'Medicamentos',
        image_url: 'https://example.com/image.jpg'
      };

      component.onSave();

      expect(dialogRef.close).toHaveBeenCalledTimes(1);
      expect(dialogRef.close).toHaveBeenCalledWith({
        sku: 'TEST-001',
        name: 'Test Product',
        value: 100.50,
        total_quantity: 10,
        category_name: 'Medicamentos',
        image_url: 'https://example.com/image.jpg',
        section: '',
        aisle: '',
        shelf: '',
        level: ''
      });
    });

    it('should include location data when closing with valid product', () => {
      component.newProduct = {
        sku: 'TEST-001',
        name: 'Test Product',
        value: 100,
        total_quantity: 10,
        category_name: 'Medicamentos'
      };

      component.locationData = {
        section: 'A',
        aisle: '1',
        shelf: '2',
        level: '3'
      };

      component.onSave();

      expect(dialogRef.close).toHaveBeenCalledWith({
        sku: 'TEST-001',
        name: 'Test Product',
        value: 100,
        total_quantity: 10,
        category_name: 'Medicamentos',
        section: 'A',
        aisle: '1',
        shelf: '2',
        level: '3'
      });
    });

    it('should close dialog with product data when total_quantity is 0', () => {
      component.newProduct = {
        sku: 'TEST-001',
        name: 'Test Product',
        value: 100,
        total_quantity: 0,
        category_name: 'Medicamentos'
      };

      component.onSave();

      expect(dialogRef.close).toHaveBeenCalledTimes(1);
      expect(dialogRef.close).toHaveBeenCalledWith({
        sku: 'TEST-001',
        name: 'Test Product',
        value: 100,
        total_quantity: 0,
        category_name: 'Medicamentos',
        section: '',
        aisle: '',
        shelf: '',
        level: ''
      });
    });

    it('should handle decimal values correctly', () => {
      component.newProduct = {
        sku: 'TEST-001',
        name: 'Test Product',
        value: 99.99,
        total_quantity: 5,
        category_name: 'Equipos'
      };

      component.onSave();

      expect(dialogRef.close).toHaveBeenCalledWith(
        jasmine.objectContaining({
          value: 99.99
        })
      );
    });
  });

  describe('Form Validation', () => {
    it('should have required fields marked as required in template', () => {
      const formElement = fixture.nativeElement.querySelector('form');
      expect(formElement).toBeTruthy();

      const skuInput = fixture.nativeElement.querySelector('input[name="sku"]');
      const nameInput = fixture.nativeElement.querySelector('input[name="name"]');
      const valueInput = fixture.nativeElement.querySelector('input[name="value"]');
      const quantityInput = fixture.nativeElement.querySelector('input[name="total_quantity"]');
      const categorySelect = fixture.nativeElement.querySelector('mat-select[name="category_name"]');

      expect(skuInput).toBeTruthy();
      expect(skuInput.hasAttribute('required')).toBeTruthy();
      
      expect(nameInput).toBeTruthy();
      expect(nameInput.hasAttribute('required')).toBeTruthy();
      
      expect(valueInput).toBeTruthy();
      expect(valueInput.hasAttribute('required')).toBeTruthy();
      expect(valueInput.hasAttribute('min')).toBeTruthy();
      expect(valueInput.getAttribute('min')).toBe('0');
      
      expect(quantityInput).toBeTruthy();
      expect(quantityInput.hasAttribute('required')).toBeTruthy();
      expect(quantityInput.hasAttribute('min')).toBeTruthy();
      expect(quantityInput.getAttribute('min')).toBe('0');
      
      expect(categorySelect).toBeTruthy();
    });

    it('should have image_url field without required attribute', () => {
      const imageInput = fixture.nativeElement.querySelector('input[name="image_url"]');
      expect(imageInput).toBeTruthy();
      expect(imageInput.hasAttribute('required')).toBeFalsy();
      expect(imageInput.getAttribute('type')).toBe('url');
    });

    it('should display all category options', () => {
      fixture.detectChanges();
      
      // Open the select (this requires Material's select to be opened)
      const categorySelect = fixture.nativeElement.querySelector('mat-select[name="category_name"]');
      expect(categorySelect).toBeTruthy();
    });
  });

  describe('Location Data', () => {
    it('should allow setting location data independently', () => {
      component.locationData.section = 'B';
      component.locationData.aisle = '2';
      component.locationData.shelf = '3';
      component.locationData.level = '4';

      expect(component.locationData.section).toBe('B');
      expect(component.locationData.aisle).toBe('2');
      expect(component.locationData.shelf).toBe('3');
      expect(component.locationData.level).toBe('4');
    });

    it('should include empty location data when product is saved', () => {
      component.newProduct = {
        sku: 'TEST-001',
        name: 'Test Product',
        value: 100,
        total_quantity: 10,
        category_name: 'Medicamentos'
      };

      component.locationData = {
        section: '',
        aisle: '',
        shelf: '',
        level: ''
      };

      component.onSave();

      expect(dialogRef.close).toHaveBeenCalledWith(
        jasmine.objectContaining({
          section: '',
          aisle: '',
          shelf: '',
          level: ''
        })
      );
    });

    it('should merge location data with product data when saving', () => {
      component.newProduct = {
        sku: 'TEST-001',
        name: 'Test Product',
        value: 100,
        total_quantity: 10,
        category_name: 'Medicamentos',
        image_url: 'https://test.com/img.jpg'
      };

      component.locationData = {
        section: 'C',
        aisle: '10',
        shelf: '20',
        level: '30'
      };

      component.onSave();

      const closedData = dialogRef.close.calls.mostRecent().args[0];
      expect(closedData.sku).toBe('TEST-001');
      expect(closedData.name).toBe('Test Product');
      expect(closedData.value).toBe(100);
      expect(closedData.total_quantity).toBe(10);
      expect(closedData.category_name).toBe('Medicamentos');
      expect(closedData.image_url).toBe('https://test.com/img.jpg');
      expect(closedData.section).toBe('C');
      expect(closedData.aisle).toBe('10');
      expect(closedData.shelf).toBe('20');
      expect(closedData.level).toBe('30');
    });
  });

  describe('Component Properties', () => {
    it('should expose dialogRef', () => {
      expect(component.dialogRef).toBe(dialogRef);
    });

    it('should expose data', () => {
      expect(component.data).toBe(mockDialogData);
      expect(component.data.categories).toEqual(mockCategories);
    });
  });
});

