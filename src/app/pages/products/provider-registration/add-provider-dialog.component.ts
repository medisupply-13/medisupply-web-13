import { Component, Inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ProviderTemplate } from '../../../services/provider-validation.service';
import { validatePassword } from '../../../utils/password-validator';
import { isValidEmail } from '../../../utils/email-validator';

export interface AddProviderDialogData {
  // No hay datos adicionales necesarios por ahora
}

@Component({
  selector: 'app-add-provider-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    TranslatePipe
  ],
  template: `
    <div class="add-dialog">
      <h2 mat-dialog-title>{{ 'addProviderDialogTitle' | translate }}</h2>
      
      <mat-dialog-content>
        <form #providerForm="ngForm" class="provider-form">
          <div class="form-row">
            <mat-form-field appearance="outline" class="half-width">
              <mat-label>{{ 'addProviderFirstNameLabel' | translate }}</mat-label>
              <input 
                matInput 
                [(ngModel)]="newProvider.nombre" 
                name="nombre"
                required
                [placeholder]="'addProviderFirstNamePlaceholder' | translate"
                #nombreInput="ngModel">
              <mat-error *ngIf="nombreInput.invalid && nombreInput.touched">
                {{ 'addProviderFirstNameRequired' | translate }}
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="half-width">
              <mat-label>{{ 'addProviderLastNameLabel' | translate }}</mat-label>
              <input 
                matInput 
                [(ngModel)]="newProvider.apellido" 
                name="apellido"
                required
                [placeholder]="'addProviderLastNamePlaceholder' | translate"
                #apellidoInput="ngModel">
              <mat-error *ngIf="apellidoInput.invalid && apellidoInput.touched">
                {{ 'addProviderLastNameRequired' | translate }}
              </mat-error>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width" [class.mat-form-field-invalid]="(correoInput.invalid && correoInput.touched) || emailError">
            <mat-label>{{ 'addProviderEmailLabel' | translate }}</mat-label>
            <input 
              matInput 
              type="email"
              [(ngModel)]="newProvider.correo" 
              name="correo"
              required
              [placeholder]="'addProviderEmailPlaceholder' | translate"
              (blur)="validateEmailField()"
              (input)="onEmailInput()"
              #correoInput="ngModel">
            <mat-error *ngIf="correoInput.errors?.['required'] && correoInput.touched">
              {{ 'addProviderEmailRequired' | translate }}
            </mat-error>
            <mat-error *ngIf="emailError && correoInput.touched && !correoInput.errors?.['required']">
              {{ 'addProviderEmailInvalid' | translate }}
            </mat-error>
          </mat-form-field>

          <div class="form-row">
            <mat-form-field appearance="outline" class="half-width">
              <mat-label>{{ 'addProviderIdentificationLabel' | translate }}</mat-label>
              <input 
                matInput 
                [(ngModel)]="newProvider.identificacion" 
                name="identificacion"
                required
                [placeholder]="'addProviderIdentificationPlaceholder' | translate"
                #identificacionInput="ngModel">
              <mat-error *ngIf="identificacionInput.invalid && identificacionInput.touched">
                {{ 'addProviderIdentificationRequired' | translate }}
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="half-width">
              <mat-label>{{ 'addProviderPhoneLabel' | translate }}</mat-label>
              <input 
                matInput 
                type="tel"
                [(ngModel)]="newProvider.telefono" 
                name="telefono"
                required
                [placeholder]="'addProviderPhonePlaceholder' | translate"
                #telefonoInput="ngModel">
              <mat-error *ngIf="telefonoInput.invalid && telefonoInput.touched">
                {{ 'addProviderPhoneRequired' | translate }}
              </mat-error>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'addProviderCompanyNameLabel' | translate }}</mat-label>
            <input 
              matInput 
              [(ngModel)]="newProvider.nombre_empresa" 
              name="nombre_empresa"
              required
              [placeholder]="'addProviderCompanyNamePlaceholder' | translate"
              #companyInput="ngModel">
            <mat-error *ngIf="companyInput.invalid && companyInput.touched">
              {{ 'addProviderCompanyNameRequired' | translate }}
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" [class.mat-form-field-invalid]="passwordErrors.length > 0 || (passwordInput.invalid && passwordInput.touched)">
            <mat-label>{{ 'addProviderPasswordLabel' | translate }}</mat-label>
            <input 
              matInput 
              type="password"
              [(ngModel)]="password" 
              name="password"
              required
              [placeholder]="'addProviderPasswordPlaceholder' | translate"
              (blur)="validatePasswordField()"
              (input)="onPasswordInput()"
              #passwordInput="ngModel">
            <mat-error *ngIf="passwordInput.invalid && passwordInput.touched && !passwordErrors.length">
              {{ 'addProviderPasswordRequired' | translate }}
            </mat-error>
            <mat-error *ngIf="passwordErrors.length > 0">
              <div *ngFor="let error of passwordErrors">
                {{ error | translate }}
              </div>
            </mat-error>
            <mat-hint *ngIf="shouldShowPasswordHint()">{{ 'passwordHint' | translate }}</mat-hint>
          </mat-form-field>
        </form>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">
          {{ 'addProviderCancelButton' | translate }}
        </button>
        <button 
          mat-flat-button 
          color="primary"
          [disabled]="!providerForm.form.valid"
          (click)="onSave()">
          {{ 'addProviderCreateButton' | translate }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .add-dialog {
      padding: 0;
      min-width: 500px;
    }
    
    h2[mat-dialog-title] {
      margin: 0 0 24px 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #333;
      padding: 0 24px;
    }
    
    mat-dialog-content {
      margin: 0 0 24px 0;
      padding: 0 24px;
      max-height: 70vh;
      overflow-y: auto;
    }
    
    .provider-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    .full-width {
      width: 100%;
    }
    
    .form-row {
      display: flex;
      gap: 16px;
    }
    
    .half-width {
      flex: 1;
    }
    
    mat-form-field {
      margin: 0;
      width: 100%;
    }
    
    mat-label {
      font-weight: 500;
      color: #333;
    }
    
    mat-dialog-actions {
      margin: 0;
      padding: 16px 24px;
      gap: 8px;
      border-top: 1px solid #e0e0e0;
    }
    
    button[mat-button] {
      color: #666;
      font-weight: 500;
    }
    
    button[mat-flat-button] {
      font-weight: 500;
      min-width: 120px;
    }
    
    input {
      font-size: 14px;
    }
    
    .mat-mdc-form-field-error {
      font-size: 12px;
    }
    
    @media (max-width: 600px) {
      .add-dialog {
        min-width: 100%;
        max-width: 100%;
      }
      
      mat-dialog-content {
        padding: 0 16px;
      }
      
      h2[mat-dialog-title] {
        padding: 0 16px;
      }
      
      mat-dialog-actions {
        padding: 16px;
      }
      
      .form-row {
        flex-direction: column;
        gap: 0;
      }
      
      .half-width {
        width: 100%;
      }
    }
  `]
})
export class AddProviderDialog {
  @ViewChild('providerForm') providerForm!: NgForm;
  @ViewChild('passwordInput') passwordInput!: NgModel;
  @ViewChild('correoInput') correoInput!: NgModel;

  newProvider: ProviderTemplate = {
    nombre: '',
    apellido: '',
    correo: '',
    identificacion: '',
    telefono: '',
    nombre_empresa: '',
    contraseña: ''
  };

  passwordErrors: string[] = [];
  emailError: boolean = false;

  // Propiedad temporal para el binding de contraseña (para evitar problemas con caracteres especiales)
  get password(): string {
    return this.newProvider.contraseña;
  }

  set password(value: string) {
    this.newProvider.contraseña = value;
    // Limpiar errores cuando el usuario está escribiendo
    if (this.passwordErrors.length > 0) {
      this.validatePasswordField();
    }
  }

  constructor(
    public dialogRef: MatDialogRef<AddProviderDialog>,
    @Inject(MAT_DIALOG_DATA) public data: AddProviderDialogData
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onEmailInput(): void {
    // Validar en tiempo real mientras el usuario escribe
    if (this.correoInput && this.correoInput.touched) {
      this.validateEmailField();
    }
  }

  onPasswordInput(): void {
    // Validar en tiempo real mientras el usuario escribe
    if (this.passwordInput && this.passwordInput.touched) {
      this.validatePasswordField();
    }
  }

  validateEmailField(): void {
    // Validar email usando el validador personalizado
    if (this.correoInput && this.correoInput.control) {
      const emailValue = this.correoInput.control.value;
      if (emailValue && emailValue.trim().length > 0) {
        const isValid = isValidEmail(emailValue);
        this.emailError = !isValid;
        
        if (!isValid) {
          // Marcar el control como inválido
          const currentErrors = this.correoInput.control.errors || {};
          this.correoInput.control.setErrors({ ...currentErrors, 'invalidEmail': true });
        } else {
          // Limpiar error de email inválido si ahora es válido
          const errors = { ...this.correoInput.control.errors };
          delete errors['invalidEmail'];
          this.correoInput.control.setErrors(Object.keys(errors).length > 0 ? errors : null);
          this.emailError = false;
        }
      } else {
        this.emailError = false;
      }
    }
  }

  validatePasswordField(): void {
    const validation = validatePassword(this.newProvider.contraseña);
    this.passwordErrors = validation.errors;
    
    // Marcar el control como touched para activar el estado de error visual
    if (this.passwordInput && !this.passwordInput.touched) {
      this.passwordInput.control.markAsTouched();
    }
    
    // Marcar como inválido si hay errores
    if (this.passwordInput && validation.errors.length > 0) {
      this.passwordInput.control.setErrors({ 'passwordInvalid': true });
    } else if (this.passwordInput && this.newProvider.contraseña) {
      // Limpiar errores si la contraseña es válida
      this.passwordInput.control.setErrors(null);
    }
  }

  shouldShowPasswordHint(): boolean {
    // No mostrar hint si no hay contraseña (campo vacío)
    if (!this.newProvider.contraseña || this.newProvider.contraseña.trim().length === 0) {
      return true; // Mostrar hint cuando está vacío
    }
    // Si hay contraseña, validar y mostrar hint solo si hay errores
    // NO mostrar hint cuando la contraseña es válida
    const validation = validatePassword(this.newProvider.contraseña);
    return validation.errors.length > 0; // Solo mostrar si hay errores
  }

  onSave(): void {
    // Marcar todos los campos como touched para mostrar errores
    if (this.providerForm) {
      Object.keys(this.providerForm.controls).forEach(key => {
        this.providerForm.controls[key].markAsTouched();
      });
    }

    // Validar email antes de guardar
    this.validateEmailField();
    if (this.emailError || (this.correoInput && this.correoInput.invalid)) {
      if (this.correoInput) {
        this.correoInput.control.markAsTouched();
      }
      return; // No cerrar el diálogo si el email es inválido
    }

    // Validar contraseña antes de guardar
    const passwordValidation = validatePassword(this.newProvider.contraseña);
    if (!passwordValidation.isValid) {
      this.passwordErrors = passwordValidation.errors;
      if (this.passwordInput) {
        this.passwordInput.control.markAsTouched();
        this.passwordInput.control.setErrors({ 'passwordInvalid': true });
      }
      return; // No cerrar el diálogo si la contraseña es inválida
    }

    if (this.newProvider.nombre && this.newProvider.apellido && 
        this.newProvider.correo && this.newProvider.identificacion &&
        this.newProvider.telefono && this.newProvider.nombre_empresa && this.newProvider.contraseña) {
      this.dialogRef.close(this.newProvider);
    }
  }
}

