import { Component, Inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { SellerTemplate } from '../../../services/seller-validation.service';
import { validatePassword } from '../../../utils/password-validator';
import { isValidEmail } from '../../../utils/email-validator';

export interface AddSellerDialogData {
  zones?: string[]; // Zonas disponibles (opcional)
}

@Component({
  selector: 'app-add-seller-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    TranslatePipe
  ],
  template: `
    <div class="add-dialog">
      <h2 mat-dialog-title>{{ 'addSellerDialogTitle' | translate }}</h2>
      
      <mat-dialog-content>
        <form #sellerForm="ngForm" class="seller-form">
          <div class="form-row">
            <mat-form-field appearance="outline" class="half-width">
              <mat-label>{{ 'addSellerFirstNameLabel' | translate }}</mat-label>
              <input 
                matInput 
                [(ngModel)]="newSeller.nombre" 
                name="nombre"
                required
                [placeholder]="'addSellerFirstNamePlaceholder' | translate"
                #nombreInput="ngModel">
              <mat-error *ngIf="nombreInput.invalid && nombreInput.touched">
                {{ 'addSellerFirstNameRequired' | translate }}
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="half-width">
              <mat-label>{{ 'addSellerLastNameLabel' | translate }}</mat-label>
              <input 
                matInput 
                [(ngModel)]="newSeller.apellido" 
                name="apellido"
                required
                [placeholder]="'addSellerLastNamePlaceholder' | translate"
                #apellidoInput="ngModel">
              <mat-error *ngIf="apellidoInput.invalid && apellidoInput.touched">
                {{ 'addSellerLastNameRequired' | translate }}
              </mat-error>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width" [class.mat-form-field-invalid]="(correoInput.invalid && correoInput.touched) || emailError">
            <mat-label>{{ 'addSellerEmailLabel' | translate }}</mat-label>
            <input 
              matInput 
              type="email"
              [(ngModel)]="newSeller.correo" 
              name="correo"
              required
              [placeholder]="'addSellerEmailPlaceholder' | translate"
              (blur)="validateEmailField()"
              (input)="onEmailInput()"
              #correoInput="ngModel">
            <mat-error *ngIf="correoInput.errors?.['required'] && correoInput.touched">
              {{ 'addSellerEmailRequired' | translate }}
            </mat-error>
            <mat-error *ngIf="emailError && correoInput.touched && !correoInput.errors?.['required']">
              {{ 'addSellerEmailInvalid' | translate }}
            </mat-error>
          </mat-form-field>

          <div class="form-row">
            <mat-form-field appearance="outline" class="half-width">
              <mat-label>{{ 'addSellerIdentificationLabel' | translate }}</mat-label>
              <input 
                matInput 
                [(ngModel)]="newSeller.identificacion" 
                name="identificacion"
                required
                [placeholder]="'addSellerIdentificationPlaceholder' | translate"
                #identificacionInput="ngModel">
              <mat-error *ngIf="identificacionInput.invalid && identificacionInput.touched">
                {{ 'addSellerIdentificationRequired' | translate }}
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="half-width">
              <mat-label>{{ 'addSellerPhoneLabel' | translate }}</mat-label>
              <input 
                matInput 
                type="tel"
                [(ngModel)]="newSeller.telefono" 
                name="telefono"
                required
                [placeholder]="'addSellerPhonePlaceholder' | translate"
                #telefonoInput="ngModel">
              <mat-error *ngIf="telefonoInput.invalid && telefonoInput.touched">
                {{ 'addSellerPhoneRequired' | translate }}
              </mat-error>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'addSellerZoneLabel' | translate }}</mat-label>
            <mat-select 
              [(ngModel)]="newSeller.zona" 
              name="zona"
              required
              [placeholder]="'addSellerZonePlaceholder' | translate"
              #zonaInput="ngModel">
              <ng-container *ngIf="data.zones && data.zones.length > 0">
                <mat-option *ngFor="let zone of data.zones" [value]="zone">
                  {{ zone }}
                </mat-option>
              </ng-container>
              <ng-container *ngIf="!data.zones || data.zones.length === 0">
                <mat-option value="Norte">Norte</mat-option>
                <mat-option value="Sur">Sur</mat-option>
                <mat-option value="Centro">Centro</mat-option>
                <mat-option value="Oriente">Oriente</mat-option>
                <mat-option value="Occidente">Occidente</mat-option>
              </ng-container>
            </mat-select>
            <mat-error *ngIf="zonaInput.invalid && zonaInput.touched">
              {{ 'addSellerZoneRequired' | translate }}
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" [class.mat-form-field-invalid]="passwordErrors.length > 0 || (passwordInput.invalid && passwordInput.touched)">
            <mat-label>{{ 'addSellerPasswordLabel' | translate }}</mat-label>
            <input 
              matInput 
              type="password"
              [(ngModel)]="password" 
              name="password"
              required
              [placeholder]="'addSellerPasswordPlaceholder' | translate"
              (blur)="validatePasswordField()"
              (input)="onPasswordInput()"
              #passwordInput="ngModel">
            <mat-error *ngIf="passwordInput.invalid && passwordInput.touched && !passwordErrors.length">
              {{ 'addSellerPasswordRequired' | translate }}
            </mat-error>
            <mat-error *ngIf="passwordErrors.length > 0">
              <div *ngFor="let error of passwordErrors">
                {{ error | translate }}
              </div>
            </mat-error>
            <mat-hint>{{ 'passwordHint' | translate }}</mat-hint>
          </mat-form-field>
        </form>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">
          {{ 'addSellerCancelButton' | translate }}
        </button>
        <button 
          mat-flat-button 
          color="primary"
          [disabled]="!sellerForm.form.valid"
          (click)="onSave()">
          {{ 'addSellerCreateButton' | translate }}
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
    
    .seller-form {
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
    
    mat-select {
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
export class AddSellerDialog {
  @ViewChild('sellerForm') sellerForm!: NgForm;
  @ViewChild('passwordInput') passwordInput!: NgModel;
  @ViewChild('correoInput') correoInput!: NgModel;

  newSeller: SellerTemplate = {
    nombre: '',
    apellido: '',
    correo: '',
    identificacion: '',
    telefono: '',
    zona: '',
    contraseña: ''
  };

  passwordErrors: string[] = [];
  emailError: boolean = false;

  // Propiedad temporal para el binding de contraseña (para evitar problemas con caracteres especiales)
  get password(): string {
    return this.newSeller.contraseña;
  }

  set password(value: string) {
    this.newSeller.contraseña = value;
    // Limpiar errores cuando el usuario está escribiendo
    if (this.passwordErrors.length > 0) {
      this.validatePasswordField();
    }
  }

  constructor(
    public dialogRef: MatDialogRef<AddSellerDialog>,
    @Inject(MAT_DIALOG_DATA) public data: AddSellerDialogData
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
    const validation = validatePassword(this.newSeller.contraseña);
    this.passwordErrors = validation.errors;
    
    // Marcar el control como touched para activar el estado de error visual
    if (this.passwordInput && !this.passwordInput.touched) {
      this.passwordInput.control.markAsTouched();
    }
    
    // Marcar como inválido si hay errores
    if (this.passwordInput && validation.errors.length > 0) {
      this.passwordInput.control.setErrors({ 'passwordInvalid': true });
    } else if (this.passwordInput && this.newSeller.contraseña) {
      // Limpiar errores si la contraseña es válida
      this.passwordInput.control.setErrors(null);
    }
  }

  onSave(): void {
    // Marcar todos los campos como touched para mostrar errores
    if (this.sellerForm) {
      Object.keys(this.sellerForm.controls).forEach(key => {
        this.sellerForm.controls[key].markAsTouched();
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
    const passwordValidation = validatePassword(this.newSeller.contraseña);
    if (!passwordValidation.isValid) {
      this.passwordErrors = passwordValidation.errors;
      if (this.passwordInput) {
        this.passwordInput.control.markAsTouched();
        this.passwordInput.control.setErrors({ 'passwordInvalid': true });
      }
      return; // No cerrar el diálogo si la contraseña es inválida
    }

    if (this.newSeller.nombre && this.newSeller.apellido && 
        this.newSeller.correo && this.newSeller.identificacion &&
        this.newSeller.telefono && this.newSeller.zona && this.newSeller.contraseña) {
      this.dialogRef.close(this.newSeller);
    }
  }
}

