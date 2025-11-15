import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { IconService } from './icon.service';
import { filter } from 'rxjs';
import { TranslatePipe } from './shared/pipes/translate.pipe';
import { AuthService } from './services/auth.service';

interface MenuItem {
  path: string;
  icon: string;
  labelKey: string;
  ariaKey: string;
  exact: boolean;
  roles: string[]; // Roles que pueden acceder a este menú
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatListModule,
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App implements OnInit {
  protected readonly title = signal('medisupply');
  private readonly iconService = inject(IconService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  currentUrl = signal(this.router.url);

  // Todos los items del menú con sus roles permitidos
  allMenuItems: MenuItem[] = [
    {
      path: '/dashboard',
      icon: 'home',
      labelKey: 'menu_dashboard_label',
      ariaKey: 'menu_dashboard_aria',
      exact: true,
      roles: ['ADMIN', 'PROVIDER', 'PLANNER', 'SUPERVISOR'],
    },
    {
      path: '/productos',
      icon: 'box',
      labelKey: 'menu_productos_label',
      ariaKey: 'menu_productos_aria',
      exact: false,
      roles: ['ADMIN', 'PROVIDER'],
    },
    {
      path: '/usuarios',
      icon: 'users',
      labelKey: 'menu_usuarios_label',
      ariaKey: 'menu_usuarios_aria',
      exact: false,
      roles: ['ADMIN'],
    },
    {
      path: '/reportes',
      icon: 'bar-chart',
      labelKey: 'menu_reportes_label',
      ariaKey: 'menu_reportes_aria',
      exact: false,
      roles: ['ADMIN', 'SUPERVISOR'],
    },
    {
      path: '/ventas',
      icon: 'dollar',
      labelKey: 'menu_ventas_label',
      ariaKey: 'menu_ventas_aria',
      exact: false,
      roles: ['ADMIN', 'SUPERVISOR'],
    },
    {
      path: '/rutas',
      icon: 'map',
      labelKey: 'menu_rutas_label',
      ariaKey: 'menu_rutas_aria',
      exact: false,
      roles: ['ADMIN', 'PLANNER'],
    },
  ];

  // Menú filtrado según el rol del usuario
  menuItems = computed(() => {
    const userRole = this.authService.getRole();
    if (!userRole) {
      return [];
    }
    
    return this.allMenuItems.filter(item => 
      item.roles.includes(userRole)
    );
  });

  // Verificar si estamos en la página de login
  isLoginPage = computed(() => {
    return this.currentUrl().startsWith('/login');
  });

  // Verificar si el usuario está autenticado
  isAuthenticated = computed(() => {
    return this.authService.isLoggedIn();
  });

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.currentUrl.set(e.urlAfterRedirects);
      });
  }

  ngOnInit(): void {
    console.log('📱 App: Menú inicializado');
    console.log('📱 App: Rol del usuario:', this.authService.getRole());
    console.log('📱 App: Items del menú:', this.menuItems().length);
  }

  isActive(route: string): boolean {
    const url = this.currentUrl();
    return route === '/dashboard'
      ? url === '/' || url.startsWith('/dashboard')
      : url.startsWith(route);
  }
}
