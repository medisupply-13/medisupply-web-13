import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data?: any[];
}

export interface SellerTemplate {
  nombre: string;
  apellido: string;
  correo: string;
  identificacion: string;
  telefono: string;
  zona: string;
  contraseña: string;
}

@Injectable({
  providedIn: 'root'
})
export class SellerValidationService {
  private readonly api = environment.baseUrl;
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB
  private readonly allowedTypes = ['.csv', '.xlsx'];
  // Cambio: zona en lugar de rol
  private readonly requiredFields = ['nombre', 'apellido', 'correo', 'identificacion', 'telefono', 'zona', 'contraseña'];

  /**
   * Valida un archivo CSV de vendedores
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

      const data: SellerTemplate[] = [];
      const errors: string[] = [];
      const warnings: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const rowData = this.parseCSVLine(lines[i]);
        const rowValidation = this.validateRow(rowData, headers, i + 1);
        
        if (rowValidation.isValid) {
          data.push(this.mapRowToSeller(rowData, headers));
        } else {
          errors.push(...rowValidation.errors);
        }
      }

      // Validar duplicados en el archivo
      const duplicates = this.findDuplicates(data);
      if (duplicates.correo.length > 0) {
        errors.push(`Se encontraron correos duplicados en el archivo: ${duplicates.correo.join(', ')}`);
      }
      if (duplicates.identificacion.length > 0) {
        errors.push(`Se encontraron identificaciones duplicadas en el archivo: ${duplicates.identificacion.join(', ')}`);
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
   * Valida vendedores contra el backend usando el endpoint /users/sellers/upload/validate
   */
  async validateAgainstBackend(sellers: SellerTemplate[], fileName: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      console.log('=== VALIDAR VENDEDORES EN BACKEND ===');
      console.log('URL:', `${this.api}users/sellers/upload/validate`);
      console.log('Vendedores a validar:', sellers.length);
      
      const jsonPayload = JSON.stringify(sellers);
      console.log('Payload JSON:', jsonPayload.substring(0, 500) + '...');
      
      const response = await fetch(`${this.api}users/sellers/upload/validate`, {
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

      // Usar los vendedores validados del backend si están disponibles
      const validatedSellers = result.validated_sellers || result.data || (errors.length === 0 ? sellers : undefined);

      return {
        isValid: errors.length === 0 && validatedSellers !== undefined,
        errors,
        warnings,
        data: validatedSellers
      };

    } catch (error) {
      console.error('Error al validar vendedores en el backend:', error);
      errors.push('No se pudo conectar con el servidor para validación');
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Inserta vendedores validados usando el endpoint /users/sellers/upload/insert
   */
  async insertValidatedSellers(sellers: SellerTemplate[], fileName: string): Promise<any> {
    const url = `${this.api}users/sellers/upload/insert`;
    
    console.log('=== INSERT SELLERS (POST) ===');
    console.log('URL:', url);
    console.log('Vendedores a insertar:', sellers.length);
    console.log('Nombre de archivo:', fileName);
    
    if (sellers.length > 0) {
      console.log('Primer vendedor:', JSON.stringify(sellers[0], null, 2));
    }

    const jsonPayload = JSON.stringify(sellers);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: jsonPayload
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Error al insertar vendedores';
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
   * Genera una plantilla CSV para vendedores
   */
  generateTemplateCSV(): string {
    const headers = this.requiredFields.join(',');
    // Contraseñas en texto plano (el backend las encriptará)
    const example1 = `Juan,Pérez,juan.perez@example.com,1234567890,3001234567,Norte,Password123!`;
    const example2 = `María,González,maria.gonzalez@example.com,0987654321,3007654321,Sur,SecurePass456@`;
    return `${headers}\n${example1}\n${example2}`;
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
      'nombre': ['nombre', 'name', 'first_name', 'firstname'],
      'apellido': ['apellido', 'last_name', 'lastname', 'surname'],
      'correo': ['correo', 'email', 'e_mail', 'mail'],
      'identificacion': ['identificacion', 'id', 'documento', 'document', 'cedula', 'dni'],
      'telefono': ['telefono', 'phone', 'telephone', 'celular', 'mobile'],
      'zona': ['zona', 'zone', 'region', 'región'],
      'contraseña': ['contraseña', 'contrasea', 'contrasena', 'password', 'pass', 'passwd']
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

    // Validar campos requeridos (zona en lugar de rol)
    const fieldMappings: { [key: string]: string[] } = {
      'nombre': ['nombre', 'name', 'first_name'],
      'apellido': ['apellido', 'last_name'],
      'correo': ['correo', 'email'],
      'identificacion': ['identificacion', 'id', 'documento'],
      'telefono': ['telefono', 'phone'],
      'zona': ['zona', 'zone', 'region', 'región'],
      'contraseña': ['contraseña', 'contrasea', 'contrasena', 'password']
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

    // Validar formato de correo
    const correoIndex = getHeaderIndex('correo', ['correo', 'email']);
    if (correoIndex !== undefined) {
      const email = rowData[correoIndex]?.trim();
      if (email && !this.isValidEmail(email)) {
        errors.push(`Fila ${rowNum}: El correo "${email}" no es válido`);
      }
    }

    // Validar que la contraseña existe
    const passwordIndex = getHeaderIndex('contraseña', ['contraseña', 'contrasea', 'contrasena', 'password']);
    if (passwordIndex !== undefined) {
      const password = rowData[passwordIndex]?.trim();
      if (!password || password === '') {
        errors.push(`Fila ${rowNum}: contraseña es obligatorio`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private mapRowToSeller(rowData: string[], headers: string[]): SellerTemplate {
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
      'nombre': { variations: ['nombre', 'name', 'first_name'] },
      'apellido': { variations: ['apellido', 'last_name'] },
      'correo': { variations: ['correo', 'email'] },
      'identificacion': { variations: ['identificacion', 'id', 'documento'] },
      'telefono': { variations: ['telefono', 'phone'] },
      'zona': { variations: ['zona', 'zone', 'region', 'región'] },
      'contraseña': { variations: ['contraseña', 'contrasea', 'contrasena', 'password'] }
    };

    const seller: any = {};

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
        seller[field] = rowData[headerIndex]?.trim() || '';
      } else if (config.defaultValue) {
        seller[field] = config.defaultValue;
      }
    }

    return seller as SellerTemplate;
  }

  private findDuplicates(data: SellerTemplate[]): { correo: string[], identificacion: string[] } {
    const seenCorreo = new Set<string>();
    const seenIdentificacion = new Set<string>();
    const duplicateCorreos: string[] = [];
    const duplicateIdentificaciones: string[] = [];

    for (const seller of data) {
      const correoKey = seller.correo?.toLowerCase().trim();
      if (correoKey) {
        if (seenCorreo.has(correoKey)) {
          duplicateCorreos.push(seller.correo);
        } else {
          seenCorreo.add(correoKey);
        }
      }

      const identificacionKey = seller.identificacion?.trim();
      if (identificacionKey) {
        if (seenIdentificacion.has(identificacionKey)) {
          duplicateIdentificaciones.push(seller.identificacion);
        } else {
          seenIdentificacion.add(identificacionKey);
        }
      }
    }

    return { correo: duplicateCorreos, identificacion: duplicateIdentificaciones };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

