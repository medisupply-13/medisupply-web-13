import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatSnackBarModule,
    TranslatePipe
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  hidePassword = true;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  constructor() {
    this.loginForm = this.fb.group({
      correo: ['', [Validators.required, Validators.email]],
      contraseña: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    // Si ya está autenticado, redirigir al dashboard
    if (this.authService.isLoggedIn()) {
      this.authService.redirectByRole();
    }
  }

  /**
   * Maneja el submit del formulario de login
   */
  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.isLoading = true;
    const credentials = this.loginForm.value;

    console.log('🔐 LoginComponent: Intentando iniciar sesión...');
    console.log('📧 LoginComponent: Correo:', credentials.correo);

    this.authService.login(credentials).subscribe({
      next: (response) => {
        console.log('✅ LoginComponent: Login exitoso');
        this.isLoading = false;

        if (response.success && response.user) {
          // Redirigir según el rol
          this.authService.redirectByRole();
        } else {
          this.showError(response.message || 'Error al iniciar sesión');
        }
      },
      error: (error) => {
        console.error('❌ LoginComponent: Error en login:', error);
        this.isLoading = false;

        let errorMessage = 'Error al iniciar sesión';
        
        if (error?.error) {
          if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.error.message) {
            errorMessage = error.error.message;
          } else if (error.error.error) {
            errorMessage = error.error.error;
          }
        } else if (error?.message) {
          errorMessage = error.message;
        }

        // Manejar mensajes específicos según HU37
        if (errorMessage.toLowerCase().includes('no está registrado') || 
            errorMessage.toLowerCase().includes('no encontrado') ||
            error?.status === 404) {
          this.showError('¡Ups! El usuario no está registrado');
        } else if (errorMessage.toLowerCase().includes('credenciales') || 
                   errorMessage.toLowerCase().includes('contraseña') ||
                   errorMessage.toLowerCase().includes('password') ||
                   error?.status === 401) {
          this.showError('¡Ups! Credenciales inválidas, por favor intente nuevamente');
        } else {
          this.showError(errorMessage);
        }
      }
    });
  }

  /**
   * Marca todos los campos del formulario como touched para mostrar errores
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  /**
   * Obtiene el mensaje de error para un campo específico
   */
  getErrorMessage(fieldName: string): string {
    const control = this.loginForm.get(fieldName);
    
    if (control?.hasError('required')) {
      return 'Campo obligatorio';
    }
    
    if (control?.hasError('email')) {
      return 'Ingrese un correo válido';
    }
    
    return '';
  }

  /**
   * Muestra un mensaje de error
   */
  private showError(message: string): void {
    this.snackBar.open(
      message,
      'Cerrar',
      {
        duration: 5000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      }
    );
  }

  /**
   * Alterna la visibilidad de la contraseña
   */
  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }
}

