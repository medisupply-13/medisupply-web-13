import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ValidationErrorDialogData {
  title?: string;
  errors: string[];
  warnings?: string[];
}

@Component({
  selector: 'app-validation-error-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="validation-error-dialog">
      <h2 mat-dialog-title>
        <mat-icon color="warn">error</mat-icon>
        {{ data.title || 'Errores de Validación' }}
      </h2>
      
      <mat-dialog-content>
        <div class="errors-section" *ngIf="data.errors && data.errors.length > 0">
          <h3 class="section-title">Errores:</h3>
          <ul class="error-list">
            <li *ngFor="let error of data.errors" class="error-item">
              {{ error }}
            </li>
          </ul>
        </div>
        
        <div class="warnings-section" *ngIf="data.warnings && data.warnings.length > 0">
          <h3 class="section-title warning">Advertencias:</h3>
          <ul class="warning-list">
            <li *ngFor="let warning of data.warnings" class="warning-item">
              {{ warning }}
            </li>
          </ul>
        </div>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end">
        <button mat-flat-button color="primary" (click)="onClose()">
          Cerrar
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .validation-error-dialog {
      padding: 0;
      min-width: 400px;
      max-width: 600px;
    }
    
    h2[mat-dialog-title] {
      margin: 0 0 16px 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #d32f2f;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    mat-dialog-content {
      margin: 0 0 24px 0;
      padding: 0;
      max-height: 400px;
      overflow-y: auto;
    }
    
    .errors-section,
    .warnings-section {
      margin-bottom: 16px;
    }
    
    .errors-section:last-child,
    .warnings-section:last-child {
      margin-bottom: 0;
    }
    
    .section-title {
      margin: 0 0 8px 0;
      font-size: 1rem;
      font-weight: 600;
      color: #d32f2f;
    }
    
    .section-title.warning {
      color: #f57c00;
    }
    
    .error-list,
    .warning-list {
      margin: 0;
      padding-left: 20px;
      list-style-type: disc;
    }
    
    .error-item,
    .warning-item {
      margin-bottom: 8px;
      line-height: 1.5;
      color: #666;
    }
    
    .error-item:last-child,
    .warning-item:last-child {
      margin-bottom: 0;
    }
    
    mat-dialog-actions {
      margin: 0;
      padding: 0;
    }
    
    button[mat-flat-button] {
      font-weight: 500;
    }
  `]
})
export class ValidationErrorDialog {
  constructor(
    public dialogRef: MatDialogRef<ValidationErrorDialog>,
    @Inject(MAT_DIALOG_DATA) public data: ValidationErrorDialogData
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }
}

