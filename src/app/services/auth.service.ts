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
  userRole = computed(() => this.currentUser()?.role || null);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    console.log('🔐 AuthService: Servicio de autenticación instanciado');
    console.log('🌐 AuthService: URL base:', this.api);
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
}

