import { Component, inject, Input, OnInit, computed } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '../pipes/translate.pipe';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    MatDialogModule,
    RouterLink,
    TranslatePipe,
  ],
  templateUrl: './page-header.html',
  styleUrls: ['./page-header.css'],
})
export class PageHeader implements OnInit {
  @Input() pageTitle = '';
  @Input() backRoute: string | null = null;
  menuVisible = false;

  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);

  // Usuario actual desde el servicio
  currentUser = computed(() => this.authService.currentUser());
  userName = computed(() => {
    const user = this.currentUser();
    if (user) {
      return `${user.name} ${user.last_name}`;
    }
    return 'Usuario';
  });
  userRole = computed(() => {
    const user = this.currentUser();
    if (!user) return 'Usuario';
    
    const roleMap: { [key: string]: string } = {
      'ADMIN': 'Administrador',
      'PROVIDER': 'Proveedor',
      'PLANNER': 'Planificador',
      'SUPERVISOR': 'Supervisor'
    };
    return roleMap[user.role] || user.role;
  });

  ngOnInit(): void {
    // El usuario se obtiene automáticamente desde el servicio
  }

  toggleMenu(): void {
    this.menuVisible = !this.menuVisible;
  }

  logout(): void {
    console.log('🔐 PageHeader: Iniciando logout...');
    
    // Mostrar confirmación
    if (confirm('¿Seguro que deseas cerrar sesión?')) {
      this.authService.logout().subscribe({
        next: () => {
          console.log('✅ PageHeader: Logout exitoso');
          this.router.navigate(['/login']);
        },
        error: (error) => {
          console.error('❌ PageHeader: Error en logout:', error);
          // Aun así, redirigir al login
          this.router.navigate(['/login']);
        }
      });
    }
  }

  goBack() {
    if (this.backRoute) {
      this.router.navigate([this.backRoute]);
    }
  }
}
