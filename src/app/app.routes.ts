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
import { UserRegistration } from './pages/users/user-registration/user-registration';

@Component({
  standalone: true,
  template: `<h2>Página en construcción</h2>`,
})
class EmptyComponent {}

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: Dashboard },
  { path: 'productos', component: Productos },
  { path: 'usuarios', component: EmptyComponent },
  { path: 'reportes', component: Reports },
  { path: 'reportes/generar-venta', component: SalesReport },
  { path: 'reportes/metas', component: GoalReports },
  { path: 'ventas', component: EmptyComponent },
  { path: 'rutas', redirectTo: 'rutas/generar', pathMatch: 'full' },
  { path: 'settings/region', component: RegionalSettings },
  { path: 'productos/cargar', component: ProductList },
  { path: 'productos/ubicacion', component: UbicacionComponent },
  { path: 'rutas/generar', component: RoutesGenerate },
  { path: 'ventas/crear-plan', component: SalesPlan },
  { path: 'usuarios/registro', component: UserRegistration },
  { path: 'componentes', component: Components },
];
