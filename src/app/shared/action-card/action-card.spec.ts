import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { ActionCard } from './action-card';

describe('ActionCard', () => {
  let component: ActionCard;
  let fixture: ComponentFixture<ActionCard>;
  let router: Router;

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [ActionCard],
      providers: [{ provide: Router, useValue: routerSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(ActionCard);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to routerPath when navigateTo is called', () => {
    component.routerPath = '/test-path';
    component.navigateTo();
    
    expect(router.navigate).toHaveBeenCalledWith(['/test-path']);
  });

  it('should navigate to different paths', () => {
    component.routerPath = '/products';
    component.navigateTo();
    
    expect(router.navigate).toHaveBeenCalledWith(['/products']);
  });
});
