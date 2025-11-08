import { Component, inject, OnInit } from '@angular/core';
import { PageHeader } from '../../shared/page-header/page-header';
import { ActionCard } from '../../shared/action-card/action-card';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

interface ProductCard {
  titleKey: string;
  subtitleKey: string;
  icon: string;
  ariaLabelKey: string;
  path: string;
  roles?: string[];
}

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, PageHeader, ActionCard],
  templateUrl: './productos.html',
  styleUrls: ['./productos.css'],
})
export class Productos implements OnInit {
  pageTitle = 'pageProductosTitle';
  private authService = inject(AuthService);
  cards: ProductCard[] = [];

  private allCards: ProductCard[] = [
    {
      titleKey: 'cardProductsUploadTitle',
      subtitleKey: 'cardProductsUploadSubtitle',
      icon: 'upload',
      ariaLabelKey: 'cardProductsUploadAria',
      path: '/productos/cargar',
      roles: ['ADMIN', 'PROVIDER'],
    },
    {
      titleKey: 'cardProductLocationTitle',
      subtitleKey: 'cardProductLocationSubtitle',
      icon: 'map',
      ariaLabelKey: 'cardProductLocationAria',
      path: '/productos/ubicacion',
      roles: ['ADMIN', 'PROVIDER'],
    },
    {
      titleKey: 'cardProvidersTitle',
      subtitleKey: 'cardProvidersSubtitle',
      icon: 'box',
      ariaLabelKey: 'cardProvidersAria',
      path: '/productos/proveedores',
      roles: ['ADMIN'],
    },
  ];

  ngOnInit(): void {
    this.updateCards();
  }

  private updateCards(): void {
    const userRole = this.authService.userRole();
    console.log('🔍 Productos: Rol del usuario:', userRole);
    
    if (!userRole) {
      this.cards = [];
      return;
    }
    
    this.cards = this.allCards.filter(card => 
      !card.roles || card.roles.includes(userRole)
    );
    
    console.log('🔍 Productos: Cards filtradas:', this.cards.length);
  }
}