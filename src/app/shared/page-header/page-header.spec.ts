import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { PageHeader } from './page-header';
import { AuthService, User } from '../../services/auth.service';

describe('PageHeader', () => {
  let component: PageHeader;
  let fixture: ComponentFixture<PageHeader>;
  let router: Router;
  let authService: jasmine.SpyObj<AuthService>;

  const mockUser: User = {
    user_id: 1,
    name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    role: 'ADMIN',
    identification: '123456789'
  };

  beforeEach(async () => {
    const currentUserSignal = signal<User | null>(null);
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['logout'], {
      currentUser: currentUserSignal
    });

    await TestBed.configureTestingModule({
      imports: [PageHeader, RouterTestingModule.withRoutes([]), BrowserAnimationsModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PageHeader);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    
    // Reset spy behavior
    authService.logout.and.returnValue(of({ success: true }));
    spyOn(router, 'navigate');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Inputs', () => {
    it('should have default values', () => {
      expect(component.pageTitle).toBe('');
      expect(component.backRoute).toBeNull();
      expect(component.menuVisible).toBe(false);
    });

    it('should accept custom pageTitle', () => {
      component.pageTitle = 'Test Page';
      expect(component.pageTitle).toBe('Test Page');
    });

    it('should accept custom backRoute', () => {
      component.backRoute = '/test';
      expect(component.backRoute).toBe('/test');
    });
  });

  describe('Computed Signals', () => {
    describe('currentUser', () => {
      it('should return null when no user is authenticated', () => {
        expect(component.currentUser()).toBeNull();
      });

      it('should return current user when authenticated', () => {
        (authService.currentUser as any).set(mockUser);
        fixture.detectChanges();
        expect(component.currentUser()).toEqual(mockUser);
      });
    });

    describe('userName', () => {
      it('should return "Usuario" when no user is authenticated', () => {
        expect(component.userName()).toBe('Usuario');
      });

      it('should return full name when user is authenticated', () => {
        (authService.currentUser as any).set(mockUser);
        fixture.detectChanges();
        expect(component.userName()).toBe('John Doe');
      });

      it('should handle user with only first name', () => {
        const userWithOneName: User = {
          ...mockUser,
          name: 'John',
          last_name: ''
        };
        (authService.currentUser as any).set(userWithOneName);
        fixture.detectChanges();
        expect(component.userName()).toBe('John ');
      });
    });

    describe('userRole', () => {
      it('should return "Usuario" when no user is authenticated', () => {
        expect(component.userRole()).toBe('Usuario');
      });

      it('should map ADMIN role to "Administrador"', () => {
        (authService.currentUser as any).set({ ...mockUser, role: 'ADMIN' });
        fixture.detectChanges();
        expect(component.userRole()).toBe('Administrador');
      });

      it('should map PROVIDER role to "Proveedor"', () => {
        (authService.currentUser as any).set({ ...mockUser, role: 'PROVIDER' });
        fixture.detectChanges();
        expect(component.userRole()).toBe('Proveedor');
      });

      it('should map PLANNER role to "Planificador"', () => {
        (authService.currentUser as any).set({ ...mockUser, role: 'PLANNER' });
        fixture.detectChanges();
        expect(component.userRole()).toBe('Planificador');
      });

      it('should map SUPERVISOR role to "Supervisor"', () => {
        (authService.currentUser as any).set({ ...mockUser, role: 'SUPERVISOR' });
        fixture.detectChanges();
        expect(component.userRole()).toBe('Supervisor');
      });

      it('should return role as-is for unmapped roles', () => {
        (authService.currentUser as any).set({ ...mockUser, role: 'UNKNOWN_ROLE' });
        fixture.detectChanges();
        expect(component.userRole()).toBe('UNKNOWN_ROLE');
      });
    });
  });

  describe('ngOnInit', () => {
    it('should initialize without errors', () => {
      expect(() => component.ngOnInit()).not.toThrow();
    });
  });

  describe('toggleMenu', () => {
    it('should toggle menuVisible from false to true', () => {
      expect(component.menuVisible).toBe(false);
      component.toggleMenu();
      expect(component.menuVisible).toBe(true);
    });

    it('should toggle menuVisible from true to false', () => {
      component.menuVisible = true;
      component.toggleMenu();
      expect(component.menuVisible).toBe(false);
    });

    it('should toggle menuVisible multiple times', () => {
      expect(component.menuVisible).toBe(false);
      component.toggleMenu();
      expect(component.menuVisible).toBe(true);
      component.toggleMenu();
      expect(component.menuVisible).toBe(false);
      component.toggleMenu();
      expect(component.menuVisible).toBe(true);
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      // Reset spy calls
      authService.logout.calls.reset();
      (router.navigate as jasmine.Spy).calls.reset();
    });

    it('should not logout when confirm is cancelled', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      
      component.logout();
      
      expect(window.confirm).toHaveBeenCalledWith('¿Seguro que deseas cerrar sesión?');
      expect(authService.logout).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should logout successfully when confirm is accepted', (done) => {
      spyOn(window, 'confirm').and.returnValue(true);
      authService.logout.and.returnValue(of({ success: true }));
      
      component.logout();
      
      expect(window.confirm).toHaveBeenCalled();
      expect(authService.logout).toHaveBeenCalled();
      
      // Wait for async operations
      setTimeout(() => {
        expect(router.navigate).toHaveBeenCalledWith(['/login']);
        done();
      }, 0);
    });

    it('should navigate to login even if logout fails', (done) => {
      spyOn(window, 'confirm').and.returnValue(true);
      authService.logout.and.returnValue(throwError(() => ({ status: 500 })));
      spyOn(console, 'error');
      
      component.logout();
      
      expect(authService.logout).toHaveBeenCalled();
      
      setTimeout(() => {
        expect(console.error).toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalledWith(['/login']);
        done();
      }, 0);
    });

    it('should log error when logout fails', (done) => {
      spyOn(window, 'confirm').and.returnValue(true);
      const error = { status: 500, message: 'Server error' };
      authService.logout.and.returnValue(throwError(() => error));
      spyOn(console, 'error');
      
      component.logout();
      
      setTimeout(() => {
        expect(console.error).toHaveBeenCalledWith('❌ PageHeader: Error en logout:', error);
        done();
      }, 0);
    });
  });

  describe('goBack', () => {
    beforeEach(() => {
      (router.navigate as jasmine.Spy).calls.reset();
    });

    it('should navigate to backRoute when set', () => {
      component.backRoute = '/previous-page';
      
      component.goBack();
      
      expect(router.navigate).toHaveBeenCalledWith(['/previous-page']);
      expect(router.navigate).toHaveBeenCalledTimes(1);
    });

    it('should not navigate when backRoute is null', () => {
      component.backRoute = null;
      
      component.goBack();
      
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should not navigate when backRoute is empty string', () => {
      component.backRoute = '';
      
      component.goBack();
      
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should handle multiple backRoute calls', () => {
      component.backRoute = '/test';
      
      component.goBack();
      component.goBack();
      component.goBack();
      
      expect(router.navigate).toHaveBeenCalledTimes(3);
      expect(router.navigate).toHaveBeenCalledWith(['/test']);
    });
  });

  describe('Template Rendering', () => {
    it('should render pageTitle', () => {
      component.pageTitle = 'Test Page';
      fixture.detectChanges();
      
      const titleElement = fixture.nativeElement.querySelector('.page-title');
      expect(titleElement).toBeTruthy();
    });

    it('should show back button when backRoute is set', () => {
      component.backRoute = '/previous';
      fixture.detectChanges();
      
      const backButton = fixture.nativeElement.querySelector('button[aria-label="Back"]');
      expect(backButton).toBeTruthy();
    });

    it('should not show back button when backRoute is null', () => {
      component.backRoute = null;
      fixture.detectChanges();
      
      const backButton = fixture.nativeElement.querySelector('button[aria-label="Back"]');
      expect(backButton).toBeFalsy();
    });

    it('should show menu when menuVisible is true', () => {
      component.menuVisible = true;
      fixture.detectChanges();
      
      const menu = fixture.nativeElement.querySelector('.custom-menu');
      expect(menu).toBeTruthy();
    });

    it('should hide menu when menuVisible is false', () => {
      component.menuVisible = false;
      fixture.detectChanges();
      
      const menu = fixture.nativeElement.querySelector('.custom-menu');
      expect(menu).toBeFalsy();
    });

    it('should display userName in user details', () => {
      (authService.currentUser as any).set(mockUser);
      fixture.detectChanges();
      
      const userNameElements = fixture.nativeElement.querySelectorAll('.body2');
      expect(userNameElements.length).toBeGreaterThan(0);
    });
  });

  describe('Component Lifecycle', () => {
    it('should initialize menuVisible as false', () => {
      expect(component.menuVisible).toBe(false);
    });

    it('should maintain state across lifecycle', () => {
      component.menuVisible = true;
      component.toggleMenu();
      expect(component.menuVisible).toBe(false);
    });
  });
});

