import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomSelect } from './custom-select';

describe('CustomSelect', () => {
  let component: CustomSelect;
  let fixture: ComponentFixture<CustomSelect>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomSelect],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomSelect);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('toggle', () => {
    it('should toggle isOpen signal', () => {
      expect(component.isOpen()).toBe(false);
      component.toggle();
      expect(component.isOpen()).toBe(true);
      component.toggle();
      expect(component.isOpen()).toBe(false);
    });

    it('should set touched to true when closing', () => {
      component.toggle(); // open
      expect(component.touched()).toBe(false);
      component.toggle(); // close
      expect(component.touched()).toBe(true);
    });
  });

  describe('select', () => {
    it('should set model value and emit modelChange', () => {
      spyOn(component.modelChange, 'emit');
      
      component.select('option1');
      
      expect(component.model()).toBe('option1');
      expect(component.modelChange.emit).toHaveBeenCalledWith('option1');
      expect(component.isOpen()).toBe(false);
      expect(component.touched()).toBe(true);
    });

    it('should close dropdown after selection', () => {
      component.toggle(); // open
      expect(component.isOpen()).toBe(true);
      
      component.select('option1');
      
      expect(component.isOpen()).toBe(false);
    });
  });

  describe('hasError', () => {
    it('should return false when not required', () => {
      component.required = false;
      expect(component.hasError).toBe(false);
    });

    it('should return false when required but not touched', () => {
      component.required = true;
      component.touched.set(false);
      component.model.set('');
      expect(component.hasError).toBe(false);
    });

    it('should return false when required and touched but has value', () => {
      component.required = true;
      component.touched.set(true);
      component.model.set('value');
      expect(component.hasError).toBe(false);
    });

    it('should return true when required, touched and empty', () => {
      component.required = true;
      component.touched.set(true);
      component.model.set('');
      expect(component.hasError).toBe(true);
    });
  });

  describe('selectedLabelKey', () => {
    it('should return labelKey of selected option', () => {
      component.options = [
        { value: 'val1', labelKey: 'label1' },
        { value: 'val2', labelKey: 'label2' }
      ];
      component.model.set('val1');
      
      expect(component.selectedLabelKey).toBe('label1');
    });

    it('should return placeholderKey when no option selected', () => {
      component.options = [
        { value: 'val1', labelKey: 'label1' }
      ];
      component.model.set('');
      component.placeholderKey = 'placeholder';
      
      expect(component.selectedLabelKey).toBe('placeholder');
    });

    it('should return placeholderKey when selected value not found', () => {
      component.options = [
        { value: 'val1', labelKey: 'label1' }
      ];
      component.model.set('invalid');
      component.placeholderKey = 'placeholder';
      
      expect(component.selectedLabelKey).toBe('placeholder');
    });
  });
});
