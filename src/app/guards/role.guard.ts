import { Injectable, inject } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // Verificar si está autenticado
    if (!this.authService.isLoggedIn()) {
      console.log('🔒 RoleGuard: Usuario no autenticado');
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    // Obtener los roles permitidos desde la configuración de la ruta
    const allowedRoles = route.data['allowedRoles'] as string[];
    
    if (!allowedRoles || allowedRoles.length === 0) {
      // Si no hay roles especificados, permitir acceso
      return true;
    }

    // Verificar si el usuario tiene alguno de los roles permitidos
    const userRole = this.authService.getRole();
    const hasAccess = userRole && allowedRoles.includes(userRole);

    if (hasAccess) {
      return true;
    }

    // Si no tiene acceso, redirigir al dashboard
    console.log('🔒 RoleGuard: Usuario no tiene permisos para esta ruta');
    console.log('🔒 RoleGuard: Rol del usuario:', userRole);
    console.log('🔒 RoleGuard: Roles permitidos:', allowedRoles);
    this.router.navigate(['/dashboard']);
    return false;
  }
}

