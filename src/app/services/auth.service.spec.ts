import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService, LoginRequest, LoginResponse, User } from './auth.service';
import { environment } from '../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: jasmine.SpyObj<Router>;
  const baseUrl = environment.baseUrl;

  const mockUser: User = {
    user_id: 1,
    name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    role: 'ADMIN',
    identification: '123456789'
  };

  const mockLoginResponse: LoginResponse = {
    success: true,
    user: {
      user_id: 1,
      name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      role: 'ADMIN',
      identification: '123456789'
    },
    tokens: {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token'
    }
  };

  beforeEach(() => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: Router, useValue: routerSpy }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Limpiar localStorage antes de cada test
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    // Limpiar cualquier timer activo
    (service as any).stopInactivityTimer();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with no user when localStorage is empty', () => {
      localStorage.clear();
      const newService = TestBed.inject(AuthService);
      expect(newService.getCurrentUser()).toBeNull();
      expect(newService.isLoggedIn()).toBe(false);
    });

    it('should initialize with user from localStorage', () => {
      localStorage.setItem('current_user', JSON.stringify(mockUser));
      localStorage.setItem('access_token', 'mock-token');
      const newService = TestBed.inject(AuthService);
      expect(newService.getCurrentUser()).toEqual(mockUser);
      expect(newService.isLoggedIn()).toBe(true);
    });

    it('should have isAuthenticated computed signal', () => {
      expect(service.isAuthenticated()).toBe(false);
      service['currentUser'].set(mockUser);
      expect(service.isAuthenticated()).toBe(true);
    });

    it('should have userRole computed signal', () => {
      expect(service.userRole()).toBeNull();
      service['currentUser'].set(mockUser);
      expect(service.userRole()).toBe('ADMIN');
    });
  });

  describe('login', () => {
    it('should login successfully with email and password', (done) => {
      const credentials: LoginRequest = {
        correo: 'john.doe@example.com',
        contraseña: 'password123'
      };

      service.login(credentials).subscribe({
        next: (response) => {
          expect(response.success).toBe(true);
          expect(response.user).toEqual(mockLoginResponse.user);
          expect(response.tokens?.access_token).toBe('mock-access-token');
          expect(service.getToken()).toBe('mock-access-token');
          expect(service.getCurrentUser()).toEqual(mockUser);
          expect(service.isLoggedIn()).toBe(true);
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne(`${baseUrl}users/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(credentials);
      req.flush(mockLoginResponse);
    });

    it('should login successfully with identification and password', (done) => {
      const credentials: LoginRequest = {
        identificacion: '123456789',
        contraseña: 'password123'
      };

      const responseWithId: LoginResponse = {
        ...mockLoginResponse,
        user: {
          user_id: 1,
          name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          role: 'ADMIN',
          identification: '123456789'
        }
      };

      service.login(credentials).subscribe({
        next: (response) => {
          expect(response.success).toBe(true);
          expect(response.user?.identification).toBe('123456789');
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne(`${baseUrl}users/login`);
      req.flush(responseWithId);
    });

    it('should map role correctly during login', (done) => {
      const sellerResponse: LoginResponse = {
        ...mockLoginResponse,
        user: {
          user_id: 1,
          name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          role: 'SELLER',
          identification: '123456789'
        }
      };

      service.login({ correo: 'test@example.com', contraseña: 'pass' }).subscribe({
        next: () => {
          expect(service.getRole()).toBe('SUPERVISOR');
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne(`${baseUrl}users/login`);
      req.flush(sellerResponse);
    });

    it('should handle login error', (done) => {
      const credentials: LoginRequest = {
        correo: 'wrong@example.com',
        contraseña: 'wrong'
      };

      service.login(credentials).subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(401);
          expect(service.isLoggedIn()).toBe(false);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}users/login`);
      req.flush({ success: false, message: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });
    });

    it('should not set user if response is not successful', (done) => {
      const invalidResponse: LoginResponse = {
        success: false,
        message: 'Invalid credentials'
      };

      service.login({ correo: 'test@example.com', contraseña: 'pass' }).subscribe({
        next: () => {
          expect(service.isLoggedIn()).toBe(false);
          expect(service.getToken()).toBeNull();
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne(`${baseUrl}users/login`);
      req.flush(invalidResponse);
    });

    it('should not set user if tokens are missing', (done) => {
      const responseWithoutTokens: LoginResponse = {
        success: true,
        user: mockUser,
        tokens: undefined
      };

      service.login({ correo: 'test@example.com', contraseña: 'pass' }).subscribe({
        next: () => {
          expect(service.isLoggedIn()).toBe(false);
          expect(service.getToken()).toBeNull();
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne(`${baseUrl}users/login`);
      req.flush(responseWithoutTokens);
    });

    it('should start inactivity timer after successful login', (done) => {
      spyOn(service as any, 'startInactivityTimer');

      service.login({ correo: 'test@example.com', contraseña: 'pass' }).subscribe({
        next: () => {
          expect((service as any).startInactivityTimer).toHaveBeenCalled();
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne(`${baseUrl}users/login`);
      req.flush(mockLoginResponse);
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      localStorage.setItem('access_token', 'mock-token');
      localStorage.setItem('current_user', JSON.stringify(mockUser));
      service['currentUser'].set(mockUser);
    });

    it('should logout successfully with token', (done) => {
      service.logout().subscribe({
        next: () => {
          expect(service.isLoggedIn()).toBe(false);
          expect(service.getToken()).toBeNull();
          expect(service.getCurrentUser()).toBeNull();
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne(`${baseUrl}users/logout`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ access_token: 'mock-token' });
      req.flush({ success: true });
    });

    it('should logout even if backend call fails', (done) => {
      service.logout().subscribe({
        next: () => done.fail('Should have failed'),
        error: () => {
          expect(service.isLoggedIn()).toBe(false);
          expect(service.getToken()).toBeNull();
          expect(service.getCurrentUser()).toBeNull();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}users/logout`);
      req.flush({ error: 'Server error' }, { status: 500, statusText: 'Internal Server Error' });
    });

    it('should clear session when no token exists', (done) => {
      localStorage.removeItem('access_token');
      service['currentUser'].set(null);

      service.logout().subscribe({
        next: (response) => {
          expect(response.success).toBe(true);
          expect(service.isLoggedIn()).toBe(false);
          done();
        },
        error: done.fail
      });

      httpMock.expectNone(`${baseUrl}users/logout`);
    });
  });

  describe('getToken', () => {
    it('should return null when no token exists', () => {
      expect(service.getToken()).toBeNull();
    });

    it('should return token from localStorage', () => {
      localStorage.setItem('access_token', 'test-token');
      expect(service.getToken()).toBe('test-token');
    });
  });

  describe('getCurrentUser', () => {
    it('should return null when no user exists', () => {
      expect(service.getCurrentUser()).toBeNull();
    });

    it('should return current user', () => {
      service['currentUser'].set(mockUser);
      expect(service.getCurrentUser()).toEqual(mockUser);
    });
  });

  describe('isLoggedIn', () => {
    it('should return false when not authenticated', () => {
      expect(service.isLoggedIn()).toBe(false);
    });

    it('should return true when authenticated', () => {
      service['currentUser'].set(mockUser);
      expect(service.isLoggedIn()).toBe(true);
    });
  });

  describe('getRole', () => {
    it('should return null when no user', () => {
      expect(service.getRole()).toBeNull();
    });

    it('should return user role', () => {
      service['currentUser'].set(mockUser);
      expect(service.getRole()).toBe('ADMIN');
    });
  });

  describe('hasRole', () => {
    it('should return false when no user', () => {
      expect(service.hasRole('ADMIN')).toBe(false);
    });

    it('should return true when user has the role', () => {
      service['currentUser'].set(mockUser);
      expect(service.hasRole('ADMIN')).toBe(true);
    });

    it('should return false when user does not have the role', () => {
      service['currentUser'].set(mockUser);
      expect(service.hasRole('SUPERVISOR')).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    it('should return false when no user', () => {
      expect(service.hasAnyRole(['ADMIN', 'SUPERVISOR'])).toBe(false);
    });

    it('should return true when user has one of the roles', () => {
      service['currentUser'].set(mockUser);
      expect(service.hasAnyRole(['ADMIN', 'SUPERVISOR'])).toBe(true);
    });

    it('should return false when user has none of the roles', () => {
      service['currentUser'].set({ ...mockUser, role: 'PROVIDER' });
      expect(service.hasAnyRole(['ADMIN', 'SUPERVISOR'])).toBe(false);
    });

    it('should return true when user has role from multiple options', () => {
      service['currentUser'].set({ ...mockUser, role: 'PLANNER' });
      expect(service.hasAnyRole(['ADMIN', 'PLANNER', 'SUPERVISOR'])).toBe(true);
    });
  });

  describe('mapRole', () => {
    it('should map ADMIN to ADMIN', () => {
      expect((service as any).mapRole('ADMIN')).toBe('ADMIN');
    });

    it('should map SELLER to SUPERVISOR', () => {
      expect((service as any).mapRole('SELLER')).toBe('SUPERVISOR');
    });

    it('should map CLIENT to PROVIDER', () => {
      expect((service as any).mapRole('CLIENT')).toBe('PROVIDER');
    });

    it('should map PLANNER to PLANNER', () => {
      expect((service as any).mapRole('PLANNER')).toBe('PLANNER');
    });

    it('should map PLANIFICADOR to PLANNER', () => {
      expect((service as any).mapRole('PLANIFICADOR')).toBe('PLANNER');
    });

    it('should handle lowercase roles', () => {
      expect((service as any).mapRole('admin')).toBe('ADMIN');
      expect((service as any).mapRole('seller')).toBe('SUPERVISOR');
    });

    it('should return uppercase for unknown roles', () => {
      expect((service as any).mapRole('unknown')).toBe('UNKNOWN');
    });
  });

  describe('redirectByRole', () => {
    it('should redirect ADMIN to dashboard', () => {
      service['currentUser'].set({ ...mockUser, role: 'ADMIN' });
      service.redirectByRole();
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('should redirect PROVIDER to dashboard', () => {
      service['currentUser'].set({ ...mockUser, role: 'PROVIDER' });
      service.redirectByRole();
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('should redirect PLANNER to dashboard', () => {
      service['currentUser'].set({ ...mockUser, role: 'PLANNER' });
      service.redirectByRole();
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('should redirect SUPERVISOR to dashboard', () => {
      service['currentUser'].set({ ...mockUser, role: 'SUPERVISOR' });
      service.redirectByRole();
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('should redirect unknown role to dashboard', () => {
      service['currentUser'].set({ ...mockUser, role: 'UNKNOWN' });
      service.redirectByRole();
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('should redirect to dashboard when no role', () => {
      service['currentUser'].set(null);
      service.redirectByRole();
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    });
  });

  describe('getUserFromStorage', () => {
    it('should return null when localStorage is empty', () => {
      localStorage.clear();
      expect((service as any).getUserFromStorage()).toBeNull();
    });

    it('should return user from localStorage', () => {
      localStorage.setItem('current_user', JSON.stringify(mockUser));
      expect((service as any).getUserFromStorage()).toEqual(mockUser);
    });

    it('should return null when localStorage has invalid JSON', () => {
      localStorage.setItem('current_user', 'invalid-json');
      expect((service as any).getUserFromStorage()).toBeNull();
    });
  });

  describe('setUser', () => {
    it('should save user to localStorage', () => {
      (service as any).setUser(mockUser);
      const stored = localStorage.getItem('current_user');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual(mockUser);
    });
  });

  describe('setToken', () => {
    it('should save token to localStorage', () => {
      (service as any).setToken('test-token');
      expect(localStorage.getItem('access_token')).toBe('test-token');
    });
  });

  describe('clearSession', () => {
    beforeEach(() => {
      localStorage.setItem('access_token', 'token');
      localStorage.setItem('current_user', JSON.stringify(mockUser));
      service['currentUser'].set(mockUser);
    });

    it('should clear localStorage and reset user', () => {
      spyOn(service as any, 'stopInactivityTimer');
      
      (service as any).clearSession();
      
      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('current_user')).toBeNull();
      expect(service.getCurrentUser()).toBeNull();
      expect((service as any).stopInactivityTimer).toHaveBeenCalled();
    });
  });

  describe('Inactivity Timer', () => {
    beforeEach(() => {
      jasmine.clock().install();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
      (service as any).stopInactivityTimer();
    });

    it('should start inactivity timer', () => {
      spyOn(service as any, 'resetInactivityTimer');
      spyOn(service as any, 'setupActivityListeners');
      
      (service as any).startInactivityTimer();
      
      expect((service as any).resetInactivityTimer).toHaveBeenCalled();
      expect((service as any).setupActivityListeners).toHaveBeenCalled();
    });

    it('should stop inactivity timer', () => {
      (service as any).inactivityTimer = setTimeout(() => {}, 1000);
      
      (service as any).stopInactivityTimer();
      
      expect((service as any).inactivityTimer).toBeNull();
    });

    it('should reset inactivity timer', () => {
      service['currentUser'].set(mockUser);
      spyOn(service, 'logout').and.returnValue(of({ success: true }));
      spyOn(router, 'navigate');
      
      (service as any).resetInactivityTimer();
      
      // Avanzar el tiempo más allá del timeout
      jasmine.clock().tick((service as any).INACTIVITY_TIMEOUT + 1000);
      
      // El logout debería haberse llamado
      expect(service.logout).toHaveBeenCalled();
    });

    it('should handle logout error in inactivity timer', () => {
      service['currentUser'].set(mockUser);
      spyOn(service, 'logout').and.returnValue(throwError(() => ({ status: 500 })));
      spyOn(router, 'navigate');
      
      (service as any).resetInactivityTimer();
      
      jasmine.clock().tick((service as any).INACTIVITY_TIMEOUT + 1000);
      
      expect(router.navigate).toHaveBeenCalledWith(
        ['/login'],
        jasmine.objectContaining({
          queryParams: jasmine.objectContaining({
            reason: 'inactivity'
          })
        })
      );
    });
  });

  describe('Activity Listeners', () => {
    it('should setup activity listeners', () => {
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      const addEventListenerSpy = spyOn(document, 'addEventListener');
      
      service['currentUser'].set(mockUser);
      (service as any).setupActivityListeners();
      
      expect(addEventListenerSpy).toHaveBeenCalledTimes(events.length);
    });

    it('should remove activity listeners', () => {
      (service as any).activityListeners = [
        jasmine.createSpy('remove1'),
        jasmine.createSpy('remove2')
      ];
      
      (service as any).removeActivityListeners();
      
      expect((service as any).activityListeners.length).toBe(0);
    });

    it('should reset timer on user activity when logged in', () => {
      service['currentUser'].set(mockUser);
      spyOn(service as any, 'resetInactivityTimer');
      
      (service as any).setupActivityListeners();
      
      // Simular un evento de actividad
      document.dispatchEvent(new MouseEvent('mousedown'));
      
      expect((service as any).resetInactivityTimer).toHaveBeenCalled();
    });

    it('should not reset timer on user activity when not logged in', () => {
      service['currentUser'].set(null);
      spyOn(service as any, 'resetInactivityTimer');
      
      (service as any).setupActivityListeners();
      
      document.dispatchEvent(new MouseEvent('mousedown'));
      
      expect((service as any).resetInactivityTimer).not.toHaveBeenCalled();
    });
  });
});

