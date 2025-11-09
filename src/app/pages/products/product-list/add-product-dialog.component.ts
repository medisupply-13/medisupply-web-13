import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { Product } from '../../../services/products.service';

export interface AddProductDialogData {
  categories: string[];
}

@Component({
  selector: 'app-add-product-dialog',
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
      <h2 mat-dialog-title>Agregar Producto</h2>
      
      <mat-dialog-content>
        <form #productForm="ngForm" class="product-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>SKU *</mat-label>
            <input 
              matInput 
              [(ngModel)]="newProduct.sku" 
              name="sku"
              required
              placeholder="Ingrese el SKU del producto"
              #skuInput="ngModel">
            <mat-error *ngIf="skuInput.invalid && skuInput.touched">
              El SKU es requerido
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Nombre *</mat-label>
            <input 
              matInput 
              [(ngModel)]="newProduct.name" 
              name="name"
              required
              placeholder="Ingrese el nombre del producto"
              #nameInput="ngModel">
            <mat-error *ngIf="nameInput.invalid && nameInput.touched">
              El nombre es requerido
            </mat-error>
          </mat-form-field>

          <div class="form-row">
            <mat-form-field appearance="outline" class="half-width">
              <mat-label>Precio *</mat-label>
              <input 
                matInput 
                type="number" 
                [(ngModel)]="newProduct.value" 
                name="value"
                min="0"
                step="0.01"
                required
                placeholder="0.00"
                #valueInput="ngModel">
              <span matPrefix>$&nbsp;</span>
              <mat-error *ngIf="valueInput.invalid && valueInput.touched">
                El precio debe ser mayor a 0
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="half-width">
              <mat-label>Stock Total *</mat-label>
              <input 
                matInput 
                type="number" 
                [(ngModel)]="newProduct.total_quantity" 
                name="total_quantity"
                min="0"
                required
                placeholder="0"
                #quantityInput="ngModel">
              <mat-error *ngIf="quantityInput.invalid && quantityInput.touched">
                El stock total debe ser mayor o igual a 0
              </mat-error>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Categoría *</mat-label>
            <mat-select 
              [(ngModel)]="newProduct.category_name" 
              name="category_name"
              required
              placeholder="Seleccione una categoría"
              #categoryInput="ngModel">
              <mat-option *ngFor="let category of data.categories" [value]="category">
                {{ category }}
              </mat-option>
            </mat-select>
            <mat-error *ngIf="categoryInput.invalid && categoryInput.touched">
              La categoría es requerida
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>URL de Imagen</mat-label>
            <input 
              matInput 
              [(ngModel)]="newProduct.image_url" 
              name="image_url"
              type="url"
              placeholder="https://ejemplo.com/imagen.jpg">
          </mat-form-field>

          <!-- Campos de Ubicación -->
          <div class="location-section">
            <h3 class="location-title">{{ 'physicalLocationTitle' | translate }}</h3>
            <div class="form-row">
              <mat-form-field appearance="outline" class="quarter-width">
                <mat-label>{{ 'locationSection' | translate }}</mat-label>
                <input 
                  matInput 
                  [(ngModel)]="locationData.section" 
                  name="section"
                  placeholder="{{ 'locationSection' | translate }}">
              </mat-form-field>

              <mat-form-field appearance="outline" class="quarter-width">
                <mat-label>{{ 'locationAisle' | translate }}</mat-label>
                <input 
                  matInput 
                  [(ngModel)]="locationData.aisle" 
                  name="aisle"
                  placeholder="{{ 'locationAisle' | translate }}">
              </mat-form-field>

              <mat-form-field appearance="outline" class="quarter-width">
                <mat-label>{{ 'locationShelf' | translate }}</mat-label>
                <input 
                  matInput 
                  [(ngModel)]="locationData.shelf" 
                  name="shelf"
                  placeholder="{{ 'locationShelf' | translate }}">
              </mat-form-field>

              <mat-form-field appearance="outline" class="quarter-width">
                <mat-label>{{ 'locationLevel' | translate }}</mat-label>
                <input 
                  matInput 
                  [(ngModel)]="locationData.level" 
                  name="level"
                  placeholder="{{ 'locationLevel' | translate }}">
              </mat-form-field>
            </div>
          </div>
        </form>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">
          Cancelar
        </button>
        <button 
          mat-flat-button 
          color="primary"
          [disabled]="!productForm.form.valid"
          (click)="onSave()">
          Crear Producto
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
      max-height: 60vh;
      overflow-y: auto;
    }
    
    .product-form {
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

    .quarter-width {
      flex: 1;
    }

    .location-section {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }

    .location-title {
      margin: 0 0 16px 0;
      font-size: 1rem;
      font-weight: 600;
      color: #333;
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
    
    textarea {
      resize: vertical;
      min-height: 80px;
    }
    
    input, textarea {
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

      .quarter-width {
        width: 100%;
      }

      .location-section {
        margin-top: 8px;
        padding-top: 8px;
      }
    }
  `]
})
export class AddProductDialog {
  newProduct: Partial<Product> = {
    sku: '',
    name: '',
    value: 0,
    category_name: '',
    total_quantity: 0,
    image_url: ''
  };

  locationData: {
    section: string;
    aisle: string;
    shelf: string;
    level: string;
  } = {
    section: '',
    aisle: '',
    shelf: '',
    level: ''
  };

  constructor(
    public dialogRef: MatDialogRef<AddProductDialog>,
    @Inject(MAT_DIALOG_DATA) public data: AddProductDialogData
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.newProduct.sku && this.newProduct.name && 
        this.newProduct.value && this.newProduct.value > 0 && 
        this.newProduct.total_quantity !== undefined && this.newProduct.total_quantity >= 0 &&
        this.newProduct.category_name) {
      // Incluir datos de ubicación en el objeto que se retorna
      const productWithLocation = {
        ...this.newProduct,
        section: this.locationData.section,
        aisle: this.locationData.aisle,
        shelf: this.locationData.shelf,
        level: this.locationData.level
      };
      this.dialogRef.close(productWithLocation);
    }
  }
}

