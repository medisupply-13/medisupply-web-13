import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data?: any[];
}

export interface ProviderTemplate {
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProviderValidationService {
  private readonly api = environment.baseUrl;
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB
  private readonly allowedTypes = ['.csv', '.xlsx'];
  // Solo campo name según la tabla products.Providers
  private readonly requiredFields = ['name'];

  /**
   * Valida un archivo CSV de proveedores
   */
  async validateCSVFile(file: File): Promise<ValidationResult> {
    try {
      // Validar tipo de archivo
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!this.allowedTypes.includes(fileExtension)) {
        return {
          isValid: false,
          errors: ['El formato del archivo no es válido'],
          warnings: []
        };
      }

      // Validar tamaño
      if (file.size > this.maxFileSize) {
        return {
          isValid: false,
          errors: ['El archivo excede el tamaño permitido (máx. 5 MB)'],
          warnings: []
        };
      }

      const text = await this.readFileAsText(file);
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        return {
          isValid: false,
          errors: ['El archivo debe contener al menos una fila de datos'],
          warnings: []
        };
      }

      const headers = this.parseCSVLine(lines[0]);
      const validationResult = this.validateHeaders(headers);
      
      if (!validationResult.isValid) {
        return validationResult;
      }

      const data: ProviderTemplate[] = [];
      const errors: string[] = [];
      const warnings: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const rowData = this.parseCSVLine(lines[i]);
        const rowValidation = this.validateRow(rowData, headers, i + 1);
        
        if (rowValidation.isValid) {
          data.push(this.mapRowToProvider(rowData, headers));
        } else {
          errors.push(...rowValidation.errors);
        }
      }

      // Validar duplicados en el archivo (por nombre)
      const duplicates = this.findDuplicates(data);
      if (duplicates.name.length > 0) {
        errors.push(`Se encontraron nombres duplicados en el archivo: ${duplicates.name.join(', ')}`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        data: errors.length === 0 ? data : undefined
      };

    } catch (error) {
      return {
        isValid: false,
        errors: ['Error al leer el archivo CSV'],
        warnings: []
      };
    }
  }

  /**
   * Valida proveedores contra el backend usando el endpoint /providers/upload/validate
   */
  async validateAgainstBackend(providers: ProviderTemplate[], fileName: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      console.log('=== VALIDAR PROVEEDORES EN BACKEND ===');
      console.log('URL:', `${this.api}providers/upload/validate`);
      console.log('Proveedores a validar:', providers.length);
      
      const jsonPayload = JSON.stringify(providers);
      console.log('Payload JSON:', jsonPayload.substring(0, 500) + '...');
      
      const response = await fetch(`${this.api}providers/upload/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: jsonPayload
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.errors && Array.isArray(errorJson.errors)) {
            errors.push(...errorJson.errors);
          } else if (errorJson.message) {
            errors.push(errorJson.message);
          } else {
            errors.push(`Error del backend: ${errorText}`);
          }
        } catch {
          errors.push(`Error del backend (${response.status}): ${errorText}`);
        }
        return { isValid: false, errors, warnings };
      }

      const result = await response.json();
      console.log('=== RESPUESTA VALIDACIÓN ===');
      console.log('Resultado:', result);

      if (result.errors && result.errors.length > 0) {
        errors.push(...result.errors);
      }

      if (result.warnings && result.warnings.length > 0) {
        warnings.push(...result.warnings);
      }

      // Usar los proveedores validados del backend si están disponibles
      const validatedProviders = result.validated_providers || result.data || (errors.length === 0 ? providers : undefined);

      return {
        isValid: errors.length === 0 && validatedProviders !== undefined,
        errors,
        warnings,
        data: validatedProviders
      };

    } catch (error) {
      console.error('Error al validar proveedores en el backend:', error);
      errors.push('No se pudo conectar con el servidor para validación');
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Inserta proveedores validados usando el endpoint /providers/upload/insert
   */
  async insertValidatedProviders(providers: ProviderTemplate[], fileName: string): Promise<any> {
    const url = `${this.api}providers/upload/insert`;
    
    console.log('=== INSERT PROVIDERS (POST) ===');
    console.log('URL:', url);
    console.log('Proveedores a insertar:', providers.length);
    console.log('Nombre de archivo:', fileName);
    
    if (providers.length > 0) {
      console.log('Primer proveedor:', JSON.stringify(providers[0], null, 2));
    }

    const jsonPayload = JSON.stringify(providers);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: jsonPayload
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Error al insertar proveedores';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
        if (errorJson.errors && Array.isArray(errorJson.errors)) {
          errorMessage = errorJson.errors.join(', ');
        }
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  }

  /**
   * Genera una plantilla CSV para proveedores
   */
  generateTemplateCSV(): string {
    const headers = this.requiredFields.join(',');
    const example1 = `Proveedor ABC`;
    const example2 = `Proveedor XYZ`;
    const example3 = `Distribuidora Médica Sur`;
    return `${headers}\n${example1}\n${example2}\n${example3}`;
  }

  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file, 'UTF-8');
    });
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  private validateHeaders(headers: string[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Normalizar headers preservando caracteres especiales del español (ñ, acentos)
    const normalizedHeaders = headers.map(h => {
      const trimmed = h.toLowerCase().trim();
      return trimmed
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos diacríticos
        .replace(/[^a-z0-9_ñ]/g, '_') // Mantener ñ
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
    });

    // También crear un mapa de headers originales (sin normalizar) para búsqueda directa
    const originalHeadersMap: { [key: string]: number } = {};
    headers.forEach((header, index) => {
      const key = header.toLowerCase().trim();
      originalHeadersMap[key] = index;
    });

    const fieldVariations: { [key: string]: string[] } = {
      'name': ['name', 'nombre', 'provider_name', 'proveedor', 'razon_social', 'razón_social']
    };

    const missingFields: string[] = [];
    
    for (const field of this.requiredFields) {
      let found = false;
      
      // Buscar en headers normalizados
      const fieldNormalized = field
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9_ñ]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      
      if (normalizedHeaders.includes(fieldNormalized)) {
        found = true;
      } else {
        // Buscar en headers originales (sin normalizar)
        if (originalHeadersMap[field] !== undefined) {
          found = true;
        } else {
          // Buscar variaciones
          const variations = fieldVariations[field] || [];
          for (const variation of variations) {
            // Buscar variación normalizada
            const variationNormalized = variation
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9_ñ]/g, '_')
              .replace(/_+/g, '_')
              .replace(/^_|_$/g, '');
            
            if (normalizedHeaders.includes(variationNormalized)) {
              found = true;
              break;
            }
            
            // Buscar variación en headers originales
            if (originalHeadersMap[variation] !== undefined) {
              found = true;
              break;
            }
          }
        }
      }
      
      if (!found) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      errors.push(`Faltan campos obligatorios: ${missingFields.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateRow(rowData: string[], headers: string[], rowNum: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Normalizar headers preservando caracteres especiales del español (ñ, acentos)
    const normalizedHeaders = headers.map(h => {
      const trimmed = h.toLowerCase().trim();
      return trimmed
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos diacríticos
        .replace(/[^a-z0-9_ñ]/g, '_') // Mantener ñ
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
    });

    // Crear mapa de headers normalizados
    const headerMap: { [key: string]: number } = {};
    normalizedHeaders.forEach((header, index) => {
      headerMap[header] = index;
    });

    // También crear mapa de headers originales para búsqueda directa
    const originalHeaderMap: { [key: string]: number } = {};
    headers.forEach((header, index) => {
      const key = header.toLowerCase().trim();
      originalHeaderMap[key] = index;
    });

    // Función auxiliar para obtener índice de header
    const getHeaderIndex = (fieldName: string, variations: string[]): number | undefined => {
      const fieldNormalized = fieldName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9_ñ]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      
      if (headerMap[fieldNormalized] !== undefined) {
        return headerMap[fieldNormalized];
      }
      if (originalHeaderMap[fieldName] !== undefined) {
        return originalHeaderMap[fieldName];
      }
      
      for (const variation of variations) {
        const variationNormalized = variation
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9_ñ]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');
        
        if (headerMap[variationNormalized] !== undefined) {
          return headerMap[variationNormalized];
        }
        if (originalHeaderMap[variation] !== undefined) {
          return originalHeaderMap[variation];
        }
      }
      return undefined;
    };

    // Validar campos requeridos (solo name)
    const fieldMappings: { [key: string]: string[] } = {
      'name': ['name', 'nombre', 'provider_name', 'proveedor', 'razon_social', 'razón_social']
    };

    for (const [field, variations] of Object.entries(fieldMappings)) {
      const headerIndex = getHeaderIndex(field, variations);
      
      if (headerIndex !== undefined) {
        const value = rowData[headerIndex]?.trim();
        if (!value || value === '') {
          errors.push(`Fila ${rowNum}: ${field} es obligatorio`);
        }
      } else {
        errors.push(`Fila ${rowNum}: Campo ${field} no encontrado`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private mapRowToProvider(rowData: string[], headers: string[]): ProviderTemplate {
    // Normalizar headers preservando caracteres especiales del español (ñ, acentos)
    const normalizedHeaders = headers.map(h => {
      const trimmed = h.toLowerCase().trim();
      return trimmed
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos diacríticos
        .replace(/[^a-z0-9_ñ]/g, '_') // Mantener ñ
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
    });

    // Crear mapa de headers normalizados
    const headerMap: { [key: string]: number } = {};
    normalizedHeaders.forEach((header, index) => {
      headerMap[header] = index;
    });

    // También crear mapa de headers originales para búsqueda directa
    const originalHeaderMap: { [key: string]: number } = {};
    headers.forEach((header, index) => {
      const key = header.toLowerCase().trim();
      originalHeaderMap[key] = index;
    });

    const fieldMappings: { [key: string]: { variations: string[]; defaultValue?: string } } = {
      'name': { variations: ['name', 'nombre', 'provider_name', 'proveedor', 'razon_social', 'razón_social'] }
    };

    const provider: any = {};

    for (const [field, config] of Object.entries(fieldMappings)) {
      let found = false;
      let headerIndex: number | undefined;
      
      // Normalizar el nombre del campo para buscar en headers normalizados
      const fieldNormalized = field
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9_ñ]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      
      // Buscar primero en headers normalizados
      if (headerMap[fieldNormalized] !== undefined) {
        headerIndex = headerMap[fieldNormalized];
        found = true;
      } else {
        // Buscar en headers originales
        if (originalHeaderMap[field] !== undefined) {
          headerIndex = originalHeaderMap[field];
          found = true;
        } else {
          // Buscar variaciones
          for (const variation of config.variations) {
            const variationNormalized = variation
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9_ñ]/g, '_')
              .replace(/_+/g, '_')
              .replace(/^_|_$/g, '');
            
            if (headerMap[variationNormalized] !== undefined) {
              headerIndex = headerMap[variationNormalized];
              found = true;
              break;
            }
            
            if (originalHeaderMap[variation] !== undefined) {
              headerIndex = originalHeaderMap[variation];
              found = true;
              break;
            }
          }
        }
      }
      
      if (found && headerIndex !== undefined) {
        provider[field] = rowData[headerIndex]?.trim() || '';
      } else if (config.defaultValue) {
        provider[field] = config.defaultValue;
      }
    }

    return provider as ProviderTemplate;
  }

  private findDuplicates(data: ProviderTemplate[]): { name: string[] } {
    const seenName = new Set<string>();
    const duplicateNames: string[] = [];

    for (const provider of data) {
      const nameKey = provider.name?.toLowerCase().trim();
      if (nameKey) {
        if (seenName.has(nameKey)) {
          duplicateNames.push(provider.name);
        } else {
          seenName.add(nameKey);
        }
      }
    }

    return { name: duplicateNames };
  }
}

