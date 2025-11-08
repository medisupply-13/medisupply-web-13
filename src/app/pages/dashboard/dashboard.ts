import { Component, inject, computed, OnInit } from '@angular/core';
import { PageHeader } from '../../shared/page-header/page-header';
import { MatButtonModule } from '@angular/material/button';
import { ActionCard } from '../../shared/action-card/action-card';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

interface DashboardCard {
  titleKey: string;
  subtitleKey: string;
  icon: string;
  ariaLabelKey: string;
  path: string;
  roles: string[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, PageHeader, MatButtonModule, ActionCard],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class Dashboard implements OnInit {
  pageTitle = 'pageDashboardTitle';
  private authService = inject(AuthService);

  // Todas las cards disponibles
  allCards: DashboardCard[] = [
    {
      titleKey: 'cardProductsTitle',
      subtitleKey: 'cardProductsSubtitle',
      icon: 'box',
      ariaLabelKey: 'cardProductsAria',
      path: '/productos',
      roles: ['ADMIN', 'PROVIDER'],
    },
    {
      titleKey: 'cardRoutesTitle',
      subtitleKey: 'cardRoutesSubtitle',
      icon: 'map',
      ariaLabelKey: 'cardRoutesAria',
      path: '/rutas/generar',
      roles: ['ADMIN', 'PLANNER'],
    },
    {
      titleKey: 'cardSalesTitle',
      subtitleKey: 'cardSalesSubtitle',
      icon: 'list',
      ariaLabelKey: 'cardSalesAria',
      path: '/ventas/crear-plan',
      roles: ['ADMIN', 'SUPERVISOR'],
    },
    {
      titleKey: 'cardRegistrationsTitle',
      subtitleKey: 'cardRegistrationsSubtitle',
      icon: 'users',
      ariaLabelKey: 'cardRegistrationsAria',
      path: '/usuarios',
      roles: ['ADMIN'],
    },
    {
      titleKey: 'cardReportsTitle',
      subtitleKey: 'cardReportsSubtitle',
      icon: 'reports',
      ariaLabelKey: 'cardReportsAria',
      path: '/reportes',
      roles: ['ADMIN', 'SUPERVISOR'],
    },
  ];

  // Cards filtradas según el rol del usuario
  cards = computed(() => {
    const userRole = this.authService.getRole();
    if (!userRole) {
      return [];
    }
    
    return this.allCards.filter(card => 
      card.roles.includes(userRole)
    );
  });

  ngOnInit(): void {
    console.log('📊 Dashboard: Rol del usuario:', this.authService.getRole());
    console.log('📊 Dashboard: Cards disponibles:', this.cards().length);
  }
}
