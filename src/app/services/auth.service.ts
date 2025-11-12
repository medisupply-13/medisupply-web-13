import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface LoginRequest {
  correo?: string;
  identificacion?: string;
  contraseña: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  user?: {
    user_id: number;
    name: string;
    last_name: string;
    email: string;
    role: string;
    identification?: string;
  };
  tokens?: {
    access_token: string;
    refresh_token?: string;
  };
}

export interface User {
  user_id: number;
  name: string;
  last_name: string;
  email: string;
  role: string;
  identification?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly api = environment.baseUrl;
  private readonly tokenKey = 'access_token';
  private readonly userKey = 'current_user';

  // Signals para el estado de autenticación
  private currentUserSubject = new BehaviorSubject<User | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  // Signal reactivo para el usuario actual
  currentUser = signal<User | null>(this.getUserFromStorage());
  isAuthenticated = computed(() => this.currentUser() !== null);
  readonly userRole = computed(() => this.currentUser()?.role || null);

  // Timer de inactividad (5 minutos = 300000 ms)
  private inactivityTimer: any = null;
  private readonly INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutos en milisegundos
  private activityListeners: (() => void)[] = [];

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    console.log('🔐 AuthService: Servicio de autenticación instanciado');
    console.log('🌐 AuthService: URL base:', this.api);
    
    // Iniciar el timer de inactividad si hay un usuario autenticado
    if (this.isLoggedIn()) {
      this.startInactivityTimer();
    }
  }

  /**
   * Inicia sesión con correo o identificación
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    const url = `${this.api}users/login`;
    
    console.log('🔐 AuthService: ===== INICIANDO LOGIN =====');
    console.log('🌐 AuthService: URL:', url);
    console.log('📧 AuthService: Credenciales:', {
      correo: credentials.correo || 'N/A',
      identificacion: credentials.identificacion || 'N/A',
      tieneContraseña: !!credentials.contraseña
    });

    return this.http.post<LoginResponse>(url, credentials).pipe(
      tap(response => {
        console.log('✅ AuthService: Respuesta del login:', response);
        
        if (response.success && response.user && response.tokens?.access_token) {
          // Mapear el rol del backend al rol del frontend
          const mappedUser = {
            ...response.user,
            role: this.mapRole(response.user.role)
          };

          // Guardar token y usuario
          this.setToken(response.tokens.access_token);
          this.setUser(mappedUser);
          this.currentUser.set(mappedUser);
          this.currentUserSubject.next(mappedUser);
          
          console.log('✅ AuthService: Usuario autenticado:', mappedUser.role);
          console.log('✅ AuthService: Token guardado');
          
          // Iniciar el timer de inactividad después del login
          this.startInactivityTimer();
        }
      }),
      catchError(error => {
        console.error('❌ AuthService: Error en login:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Cierra la sesión del usuario
   */
  logout(): Observable<any> {
    const token = this.getToken();
    const url = `${this.api}users/logout`;

    console.log('🔐 AuthService: ===== INICIANDO LOGOUT =====');
    console.log('🌐 AuthService: URL:', url);

    if (!token) {
      console.warn('⚠️ AuthService: No hay token para cerrar sesión');
      this.clearSession();
      return new Observable(observer => {
        observer.next({ success: true });
        observer.complete();
      });
    }

    return this.http.post(url, { access_token: token }).pipe(
      tap(() => {
        console.log('✅ AuthService: Logout exitoso');
        this.clearSession();
      }),
      catchError(error => {
        console.error('❌ AuthService: Error en logout:', error);
        // Aun así, limpiar la sesión local
        this.clearSession();
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtiene el token de acceso almacenado
   */
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Guarda el token de acceso
   */
  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  /**
   * Obtiene el usuario actual desde el almacenamiento
   */
  private getUserFromStorage(): User | null {
    const userStr = localStorage.getItem(this.userKey);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Guarda el usuario actual
   */
  private setUser(user: User): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  /**
   * Limpia la sesión (token y usuario)
   */
  private clearSession(): void {
    // Detener el timer de inactividad
    this.stopInactivityTimer();
    
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.currentUser.set(null);
    this.currentUserSubject.next(null);
    console.log('🧹 AuthService: Sesión limpiada');
  }

  /**
   * Verifica si el usuario tiene un rol específico
   */
  hasRole(role: string): boolean {
    const user = this.currentUser();
    return user?.role === role;
  }

  /**
   * Verifica si el usuario tiene alguno de los roles especificados
   */
  hasAnyRole(roles: string[]): boolean {
    const user = this.currentUser();
    if (!user) return false;
    return roles.includes(user.role);
  }

  /**
   * Obtiene el usuario actual (sincrónico)
   */
  getCurrentUser(): User | null {
    return this.currentUser();
  }

  /**
   * Verifica si el usuario está autenticado
   */
  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }

  /**
   * Obtiene el rol del usuario actual
   */
  getRole(): string | null {
    return this.userRole();
  }

  /**
   * Mapea el rol del backend al rol del frontend
   * El backend puede usar diferentes nombres de roles (SELLER, CLIENT, ADMIN)
   * pero el frontend usa: ADMIN, PROVIDER, PLANNER, SUPERVISOR
   */
  private mapRole(backendRole: string): string {
    const roleMap: { [key: string]: string } = {
      'ADMIN': 'ADMIN',
      'SELLER': 'SUPERVISOR', // Los vendedores son supervisores en la web
      'CLIENT': 'PROVIDER', // Los clientes pueden ser proveedores
      'PROVIDER': 'PROVIDER',
      'PLANNER': 'PLANNER',
      'PLANIFICADOR': 'PLANNER',
      'SUPERVISOR': 'SUPERVISOR',
    };

    const mappedRole = roleMap[backendRole.toUpperCase()] || backendRole.toUpperCase();
    console.log('🔄 AuthService: Mapeando rol:', backendRole, '->', mappedRole);
    return mappedRole;
  }

  /**
   * Redirige al usuario según su rol después del login
   */
  redirectByRole(): void {
    const role = this.getRole();
    console.log('🔄 AuthService: Redirigiendo por rol:', role);

    switch (role) {
      case 'ADMIN':
        this.router.navigate(['/dashboard']);
        break;
      case 'PROVIDER':
        this.router.navigate(['/dashboard']);
        break;
      case 'PLANNER':
        this.router.navigate(['/dashboard']);
        break;
      case 'SUPERVISOR':
        this.router.navigate(['/dashboard']);
        break;
      default:
        console.warn('⚠️ AuthService: Rol no reconocido:', role);
        this.router.navigate(['/dashboard']);
    }
  }

  /**
   * Inicia el timer de inactividad que cerrará la sesión después de 5 minutos
   */
  private startInactivityTimer(): void {
    // Detener el timer anterior si existe
    this.stopInactivityTimer();

    console.log('⏱️ AuthService: Iniciando timer de inactividad (5 minutos)');

    // Configurar el timer
    this.resetInactivityTimer();

    // Agregar listeners de actividad del usuario
    this.setupActivityListeners();
  }

  /**
   * Detiene el timer de inactividad
   */
  private stopInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
      console.log('⏱️ AuthService: Timer de inactividad detenido');
    }

    // Remover listeners de actividad
    this.removeActivityListeners();
  }

  /**
   * Reinicia el timer de inactividad
   */
  private resetInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    this.inactivityTimer = setTimeout(() => {
      console.warn('⏱️ AuthService: Tiempo de inactividad agotado (5 minutos)');
      console.warn('🔒 AuthService: Cerrando sesión automáticamente...');
      
      // Cerrar sesión automáticamente
      this.logout().subscribe({
        next: () => {
          console.log('✅ AuthService: Sesión cerrada automáticamente por inactividad');
          this.router.navigate(['/login'], { 
            queryParams: { 
              reason: 'inactivity',
              message: 'Tu sesión ha expirado por inactividad. Por favor, inicia sesión nuevamente.' 
            } 
          });
        },
        error: (error) => {
          console.error('❌ AuthService: Error al cerrar sesión automáticamente:', error);
          // Aun así, redirigir al login
          this.router.navigate(['/login'], { 
            queryParams: { 
              reason: 'inactivity',
              message: 'Tu sesión ha expirado por inactividad.' 
            } 
          });
        }
      });
    }, this.INACTIVITY_TIMEOUT);
  }

  /**
   * Configura los listeners para detectar actividad del usuario
   */
  private setupActivityListeners(): void {
    // Eventos que indican actividad del usuario
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    events.forEach(event => {
      const handler = () => {
        if (this.isLoggedIn()) {
          this.resetInactivityTimer();
        }
      };

      document.addEventListener(event, handler, { passive: true });
      this.activityListeners.push(() => {
        document.removeEventListener(event, handler);
      });
    });

    console.log('👂 AuthService: Listeners de actividad configurados');
  }

  /**
   * Remueve los listeners de actividad
   */
  private removeActivityListeners(): void {
    this.activityListeners.forEach(remove => remove());
    this.activityListeners = [];
    console.log('👂 AuthService: Listeners de actividad removidos');
  }
}

