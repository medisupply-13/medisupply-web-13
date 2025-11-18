import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  const userRole = authService.getRole();
  const currentUser = authService.getCurrentUser();

  // Excluir endpoints de autenticación (login, logout)
  const authEndpoints = ['/users/login', '/users/logout'];
  const isAuthEndpoint = authEndpoints.some(endpoint => req.url.includes(endpoint));

  // Logging detallado para endpoints de reportes (especialmente sales-report)
  const isReportEndpoint = req.url.includes('reports/');
  if (isReportEndpoint) {
    console.log('🔐 AuthInterceptor: ===== PETICIÓN A ENDPOINT DE REPORTE =====');
    console.log('🔐 AuthInterceptor: URL:', req.url);
    console.log('🔐 AuthInterceptor: Método:', req.method);
    console.log('🔐 AuthInterceptor: Token presente:', !!token);
    console.log('🔐 AuthInterceptor: Rol del usuario:', userRole);
    console.log('🔐 AuthInterceptor: Usuario actual:', currentUser);
    if (token) {
      // Decodificar el token JWT para ver los claims (sin verificar firma)
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log('🔐 AuthInterceptor: Claims del token:', {
            sub: payload.sub,
            role: payload.role || payload.roles || 'NO_ENCONTRADO',
            email: payload.email || 'NO_ENCONTRADO',
            exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'NO_ENCONTRADO',
            iat: payload.iat ? new Date(payload.iat * 1000).toISOString() : 'NO_ENCONTRADO',
            ...payload
          });
        }
      } catch (e) {
        console.warn('⚠️ AuthInterceptor: No se pudo decodificar el token JWT:', e);
      }
    }
    console.log('🔐 AuthInterceptor: Headers actuales:', Object.fromEntries(req.headers.keys().map(key => [key, req.headers.get(key)])));
  }

  // Si hay un token y no es un endpoint de autenticación, agregarlo al header
  if (token && !isAuthEndpoint) {
    const clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (isReportEndpoint) {
      console.log('🔐 AuthInterceptor: Header Authorization agregado');
      console.log('🔐 AuthInterceptor: Header completo:', clonedRequest.headers.get('Authorization')?.substring(0, 50) + '...');
    }
    
    return next(clonedRequest);
  }

  if (isReportEndpoint && !token) {
    console.error('❌ AuthInterceptor: ERROR - No hay token para endpoint de reporte!');
  }

  return next(req);
};

