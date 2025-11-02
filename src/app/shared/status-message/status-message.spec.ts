import { ComponentFixture, TestBed } from '@angular/core/testing';
import { fakeAsync, tick } from '@angular/core/testing';

import { StatusMessage } from './status-message';

describe('StatusMessage', () => {
  let component: StatusMessage;
  let fixture: ComponentFixture<StatusMessage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusMessage],
    }).compileComponents();

    fixture = TestBed.createComponent(StatusMessage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should not hide message when duration is not set', () => {
      component.duration = undefined;
      component.ngOnInit();
      
      expect(component.visible()).toBe(true);
    });

    it('should not hide message when duration is 0', () => {
      component.duration = 0;
      component.ngOnInit();
      
      expect(component.visible()).toBe(true);
    });

    it('should hide message after duration', fakeAsync(() => {
      component.duration = 100;
      component.ngOnInit();
      
      expect(component.visible()).toBe(true);
      
      tick(50);
      expect(component.visible()).toBe(true);
      
      tick(50);
      expect(component.visible()).toBe(false);
    }));

    it('should hide message after multiple durations', fakeAsync(() => {
      component.duration = 200;
      component.ngOnInit();
      
      expect(component.visible()).toBe(true);
      
      tick(200);
      expect(component.visible()).toBe(false);
    }));
  });

  describe('Inputs', () => {
    it('should have default values', () => {
      expect(component.type).toBe('success');
      expect(component.messageKey).toBe('');
      expect(component.float).toBe(false);
    });

    it('should accept type input', () => {
      component.type = 'error';
      expect(component.type).toBe('error');
      
      component.type = 'success';
      expect(component.type).toBe('success');
    });

    it('should accept messageKey input', () => {
      component.messageKey = 'test.message';
      expect(component.messageKey).toBe('test.message');
    });

    it('should accept float input', () => {
      component.float = true;
      expect(component.float).toBe(true);
    });

    it('should accept duration input', () => {
      component.duration = 1000;
      expect(component.duration).toBe(1000);
    });
  });

  describe('visible signal', () => {
    it('should default to true', () => {
      expect(component.visible()).toBe(true);
    });

    it('should be toggleable', () => {
      component.visible.set(false);
      expect(component.visible()).toBe(false);
      
      component.visible.set(true);
      expect(component.visible()).toBe(true);
    });
  });
});
