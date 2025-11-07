import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { PageHeader } from '../../../shared/page-header/page-header';
import { StatusMessage } from '../../../shared/status-message/status-message';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { Router } from '@angular/router';
import { UserValidationService, ValidationResult } from '../../../services/user-validation.service';
import { ACTIVE_TRANSLATIONS } from '../../../shared/lang/lang-store';

interface UploadedFile {
  id: string;
  file: File;
  isValid: boolean;
  errorMessage?: string;
  progress: number;
  validationResult?: ValidationResult;
}

@Component({
  selector: 'app-user-registration',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressBarModule,
    MatSnackBarModule,
    PageHeader,
    StatusMessage,
    TranslatePipe
  ],
  templateUrl: './user-registration.html',
  styleUrls: ['./user-registration.css']
})
export class UserRegistration implements OnInit {
  pageTitle = 'userRegistrationTitle';
  backRoute = '/dashboard';

  // Estados para la funcionalidad de carga
  showUploadSection = signal(true); // Mostrar por defecto
  uploadedFiles = signal<UploadedFile[]>([]);
  isUploading = signal(false);
  showSuccessMessage = signal(false);
  showErrorMessage = signal(false);
  errorMessage = signal('');

  private readonly allowedTypes = ['.csv', '.xlsx'];
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB según HU107

  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private userValidationService = inject(UserValidationService);

  /**
   * Obtiene una traducción por su clave
   */
  private translate(key: string): string {
    return ACTIVE_TRANSLATIONS[key] || key;
  }

  ngOnInit(): void {
    // La sección de carga está visible por defecto
  }

  toggleUploadSection(): void {
    this.showUploadSection.set(!this.showUploadSection());
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      Array.from(input.files).forEach(file => this.processFile(file));
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files) {
      Array.from(files).forEach(file => this.processFile(file));
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  private processFile(file: File): void {
    // Validar tipo de archivo
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!this.allowedTypes.includes(fileExtension)) {
      this.snackBar.open(
        '¡Ups! El formato del archivo no es válido',
        this.translate('closeButton') || 'Cerrar',
        {
          duration: 5000,
          horizontalPosition: 'end',
          verticalPosition: 'top'
        }
      );
      return;
    }

    // Validar tamaño (5MB según HU107)
    if (file.size > this.maxFileSize) {
      this.snackBar.open(
        '¡Ups! El archivo excede el tamaño permitido (máx. 5 MB)',
        this.translate('closeButton') || 'Cerrar',
        {
          duration: 5000,
          horizontalPosition: 'end',
          verticalPosition: 'top'
        }
      );
      return;
    }

    // Crear objeto de archivo
    const uploadedFile: UploadedFile = {
      id: this.generateId(),
      file,
      isValid: true,
      progress: 0
    };

    // Validar el archivo
    this.validateFileContent(uploadedFile);

    // Agregar a la lista
    this.uploadedFiles.update(files => [...files, uploadedFile]);
  }

  private async validateFileContent(file: UploadedFile): Promise<void> {
    try {
      file.progress = 25;
      
      let validationResult: ValidationResult;
      
      // Primera validación: estructura del archivo
      if (file.file.name.toLowerCase().endsWith('.csv')) {
        validationResult = await this.userValidationService.validateCSVFile(file.file);
      } else {
        validationResult = {
          isValid: false,
          errors: ['Formato de archivo no soportado. Solo se aceptan archivos CSV'],
          warnings: []
        };
      }
      
      file.progress = 50;
      
      // Segunda validación: contra usuarios existentes (solo si la primera pasó)
      if (validationResult.isValid && validationResult.data) {
        const dbValidationResult = await this.userValidationService.validateAgainstBackend(
          validationResult.data,
          file.file.name
        );
        
        // Combinar resultados
        validationResult.errors = [...validationResult.errors, ...dbValidationResult.errors];
        validationResult.warnings = [...validationResult.warnings, ...dbValidationResult.warnings];
        validationResult.isValid = validationResult.errors.length === 0;
        validationResult.data = dbValidationResult.data || validationResult.data;
      }
      
      file.progress = 100;
      file.validationResult = validationResult;
      file.isValid = validationResult.isValid;
      
      if (!validationResult.isValid) {
        file.errorMessage = validationResult.errors.join('; ');
        // Mostrar mensaje específico según el tipo de error según HU107
        if (validationResult.errors.some(e => e.toLowerCase().includes('duplicado'))) {
          this.snackBar.open(
            '¡Ups! Existen usuarios duplicados, revisa el archivo',
            this.translate('closeButton') || 'Cerrar',
            {
              duration: 5000,
              horizontalPosition: 'end',
              verticalPosition: 'top'
            }
          );
        } else {
          this.snackBar.open(
            '¡Ups! El archivo tiene errores de validación, revisa y sube nuevamente',
            this.translate('closeButton') || 'Cerrar',
            {
              duration: 5000,
              horizontalPosition: 'end',
              verticalPosition: 'top'
            }
          );
        }
      }
      
    } catch (error) {
      file.isValid = false;
      file.errorMessage = 'Error al validar el archivo';
      file.progress = 100;
    }
  }

  removeFile(fileId: string): void {
    this.uploadedFiles.update(files => files.filter(file => file.id !== fileId));
  }

  async uploadUsers(): Promise<void> {
    const validFiles = this.uploadedFiles().filter(file => file.isValid);
    
    if (validFiles.length === 0) {
      this.snackBar.open(
        '¡Ups! No hay archivos válidos para subir',
        this.translate('closeButton') || 'Cerrar',
        {
          duration: 5000,
          horizontalPosition: 'end',
          verticalPosition: 'top'
        }
      );
      return;
    }

    this.isUploading.set(true);
    this.showSuccessMessage.set(false);
    this.showErrorMessage.set(false);

    try {
      console.log(`🔄 UserRegistration: Procesando ${validFiles.length} archivos válidos...`);
      
      // Procesar cada archivo válido
      for (const file of validFiles) {
        if (file.validationResult?.data) {
          console.log(`📤 UserRegistration: Insertando usuarios del archivo ${file.file.name}...`);
          
          try {
            console.log(`📊 UserRegistration: Usuarios a insertar:`, file.validationResult.data.length);
            const result = await this.userValidationService.insertValidatedUsers(
              file.validationResult.data,
              file.file.name
            );
            console.log(`✅ UserRegistration: Inserción completada para ${file.file.name}`);
            console.log(`📋 UserRegistration: Resultado del backend:`, result);
          } catch (error: any) {
            console.error(`❌ UserRegistration: Error enviando archivo ${file.file.name}:`, error);
            this.snackBar.open(
              error?.message || '¡Ups! Hubo un problema, intenta nuevamente en unos minutos',
              this.translate('closeButton') || 'Cerrar',
              {
                duration: 5000,
                horizontalPosition: 'end',
                verticalPosition: 'top'
              }
            );
            // Continuar con otros archivos aunque uno falle
          }
        }
      }
      
      this.isUploading.set(false);
      this.showSuccessMessage.set(true);
      
      // Mostrar mensaje de éxito según HU107
      this.snackBar.open(
        '¡El archivo se ha cargado exitosamente!',
        this.translate('closeButton') || 'Cerrar',
        {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top'
        }
      );
      
      // Limpiar archivos cargados
      this.uploadedFiles.set([]);
      
      // Ocultar mensaje de éxito después de 2 segundos y redirigir al dashboard
      setTimeout(() => {
        this.showSuccessMessage.set(false);
        // Redirigir al dashboard según HU107
        this.router.navigate(['/dashboard']);
      }, 2000);
      
    } catch (error) {
      console.error('Error al procesar archivos:', error);
      this.isUploading.set(false);
      // Mensaje según HU107
      this.snackBar.open(
        '¡Ups! Hubo un problema, intenta nuevamente en unos minutos',
        this.translate('closeButton') || 'Cerrar',
        {
          duration: 5000,
          horizontalPosition: 'end',
          verticalPosition: 'top'
        }
      );
    }
  }

  downloadTemplate(): void {
    try {
      const csvContent = this.userValidationService.generateTemplateCSV();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'plantilla_usuarios.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      this.snackBar.open(
        this.translate('templateDownloaded') || 'Plantilla descargada exitosamente',
        this.translate('closeButton') || 'Cerrar',
        {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top'
        }
      );
    } catch (error) {
      console.error('Error al generar plantilla:', error);
    }
  }


  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  get hasValidFiles(): boolean {
    return this.uploadedFiles().some(file => file.isValid);
  }

  get validFilesCount(): number {
    return this.uploadedFiles().filter(file => file.isValid).length;
  }
}

