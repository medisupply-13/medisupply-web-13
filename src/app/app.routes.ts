import { Routes } from '@angular/router';
import { Component } from '@angular/core';
import { Dashboard } from './pages/dashboard/dashboard';
import { RegionalSettings } from './pages/regional-settings/regional-settings';
import { Components } from './pages/components/components';
import { Reports } from './pages/reports/reports';
import { SalesReport } from './pages/reports/sales-report';
import { GoalReports } from './pages/reports/goal-reports';
import { RoutesGenerate } from './pages/routes/routes-generate/routes-generate';
import { SalesPlan } from './pages/sales-plan/sales-plan';
import { Productos } from './pages/productos/productos';
import { UbicacionComponent } from './pages/productos/ubicacion/ubicacion';
import { ProductList } from './pages/products/product-list/product-list';
import { ProviderRegistration } from './pages/products/provider-registration/provider-registration';
import { Users } from './pages/users/users';
import { UserRegistration } from './pages/users/user-registration/user-registration';
import { SellerRegistration } from './pages/users/seller-registration/seller-registration';
import { LoginComponent } from './pages/login/login';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';

@Component({
  standalone: true,
  template: `<h2>Página en construcción</h2>`,
})
class EmptyComponent {}

export const routes: Routes = [
  // Ruta pública de login
  { path: 'login', component: LoginComponent },
  
  // Redirección: si no está autenticado, irá al login por el guard
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  
  // Rutas protegidas con autenticación
  { 
    path: 'dashboard', 
    component: Dashboard,
    canActivate: [AuthGuard]
  },
  
  // Gestión de Productos - ADMIN y PROVIDER
  { 
    path: 'productos', 
    component: Productos,
    canActivate: [AuthGuard, RoleGuard],
    data: { allowedRoles: ['ADMIN', 'PROVIDER'] }
  },
  { 
    path: 'productos/cargar', 
    component: ProductList,
    canActivate: [AuthGuard, RoleGuard],
    data: { allowedRoles: ['ADMIN', 'PROVIDER'] }
  },
  { 
    path: 'productos/ubicacion', 
    component: UbicacionComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { allowedRoles: ['ADMIN', 'PROVIDER'] }
  },
  { 
    path: 'productos/proveedores', 
    component: ProviderRegistration,
    canActivate: [AuthGuard, RoleGuard],
    data: { allowedRoles: ['ADMIN'] }
  },
  
  // Gestión de Usuarios - Solo ADMIN
  { 
    path: 'usuarios', 
    component: Users,
    canActivate: [AuthGuard, RoleGuard],
    data: { allowedRoles: ['ADMIN'] }
  },
  { 
    path: 'usuarios/registro', 
    component: UserRegistration,
    canActivate: [AuthGuard, RoleGuard],
    data: { allowedRoles: ['ADMIN'] }
  },
  { 
    path: 'usuarios/vendedores', 
    component: SellerRegistration,
    canActivate: [AuthGuard, RoleGuard],
    data: { allowedRoles: ['ADMIN'] }
  },
  
  // Reportes - ADMIN y SUPERVISOR
  { 
    path: 'reportes', 
    component: Reports,
    canActivate: [AuthGuard, RoleGuard],
    data: { allowedRoles: ['ADMIN', 'SUPERVISOR'] }
  },
  { 
    path: 'reportes/generar-venta', 
    component: SalesReport,
    canActivate: [AuthGuard, RoleGuard],
    data: { allowedRoles: ['ADMIN', 'SUPERVISOR'] }
  },
  { 
    path: 'reportes/metas', 
    component: GoalReports,
    canActivate: [AuthGuard, RoleGuard],
    data: { allowedRoles: ['ADMIN', 'SUPERVISOR'] }
  },
  
  // Gestión de Ventas - ADMIN y SUPERVISOR
  // Nota: No se pueden usar guards en rutas con redirectTo
  // Los guards se aplican en la ruta destino
  { 
    path: 'ventas', 
    redirectTo: 'ventas/crear-plan', 
    pathMatch: 'full'
  },
  { 
    path: 'ventas/crear-plan', 
    component: SalesPlan,
    canActivate: [AuthGuard, RoleGuard],
    data: { allowedRoles: ['ADMIN', 'SUPERVISOR'] }
  },
  
  // Gestión de Rutas - ADMIN y PLANNER
  // Nota: No se pueden usar guards en rutas con redirectTo
  // Los guards se aplican en la ruta destino
  { 
    path: 'rutas', 
    redirectTo: 'rutas/generar', 
    pathMatch: 'full'
  },
  { 
    path: 'rutas/generar', 
    component: RoutesGenerate,
    canActivate: [AuthGuard, RoleGuard],
    data: { allowedRoles: ['ADMIN', 'PLANNER'] }
  },
  
  // Configuración Regional - Disponible para todos los usuarios autenticados
  { 
    path: 'settings/region', 
    component: RegionalSettings,
    canActivate: [AuthGuard]
  },
  
  // Ruta de desarrollo (componentes)
  { 
    path: 'componentes', 
    component: Components,
    canActivate: [AuthGuard]
  },
];
