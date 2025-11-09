import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data?: any[];
}

export interface UserTemplate {
  nombre: string;
  apellido: string;
  correo: string;
  identificacion: string;
  telefono: string;
  rol: string;
  contraseña: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserValidationService {
  private readonly api = environment.baseUrl;
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB según HU107
  private readonly allowedTypes = ['.csv', '.xlsx'];
  private readonly requiredFields = ['nombre', 'apellido', 'correo', 'identificacion', 'telefono', 'rol', 'contraseña'];
  private readonly validRoles = ['SELLER', 'CLIENT', 'ADMIN'];

  /**
   * Valida un archivo CSV de usuarios
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

      const data: UserTemplate[] = [];
      const errors: string[] = [];
      const warnings: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const rowData = this.parseCSVLine(lines[i]);
        const rowValidation = this.validateRow(rowData, headers, i + 1);
        
        if (rowValidation.isValid) {
          data.push(this.mapRowToUser(rowData, headers));
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
   * Valida usuarios contra el backend usando el endpoint /users/upload/validate
   */
  async validateAgainstBackend(users: UserTemplate[], fileName: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      console.log('=== VALIDAR USUARIOS EN BACKEND ===');
      console.log('URL:', `${this.api}users/upload/validate`);
      console.log('Usuarios a validar:', users.length);
      
      const jsonPayload = JSON.stringify(users);
      console.log('Payload JSON:', jsonPayload.substring(0, 500) + '...');
      
      const response = await fetch(`${this.api}users/upload/validate`, {
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

      // Usar los usuarios validados del backend si están disponibles
      const validatedUsers = result.validated_users || result.data || (errors.length === 0 ? users : undefined);

      return {
        isValid: errors.length === 0 && validatedUsers !== undefined,
        errors,
        warnings,
        data: validatedUsers
      };

    } catch (error) {
      console.error('Error al validar usuarios en el backend:', error);
      errors.push('No se pudo conectar con el servidor para validación');
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Inserta usuarios validados usando el endpoint /users/upload/insert
   */
  async insertValidatedUsers(users: UserTemplate[], fileName: string): Promise<any> {
    const url = `${this.api}users/upload/insert`;
    
    console.log('=== INSERT USERS (POST) ===');
    console.log('URL:', url);
    console.log('Usuarios a insertar:', users.length);
    console.log('Nombre de archivo:', fileName);
    
    if (users.length > 0) {
      console.log('Primer usuario:', JSON.stringify(users[0], null, 2));
    }

    const jsonPayload = JSON.stringify(users);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: jsonPayload
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Error al insertar usuarios';
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
   * Genera una plantilla CSV para usuarios
   * NOTA: Las contraseñas en el ejemplo están encriptadas (hash bcrypt de ejemplo)
   */
  generateTemplateCSV(): string {
    const headers = this.requiredFields.join(',');
    // Contraseñas encriptadas de ejemplo (hash bcrypt de "Password123!")
    // En producción, el usuario debe proporcionar contraseñas ya encriptadas
    const encryptedPassword1 = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'; // Password123!
    const encryptedPassword2 = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // SecurePass456@
    const example1 = `Juan,Pérez,juan.perez@example.com,1234567890,3001234567,SELLER,${encryptedPassword1}`;
    const example2 = `María,González,maria.gonzalez@example.com,0987654321,3007654321,CLIENT,${encryptedPassword2}`;
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
      // Normalizar pero mantener caracteres especiales del español
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
      'rol': ['rol', 'role', 'tipo', 'type', 'perfil'],
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

    // Validar campos requeridos
    const fieldMappings: { [key: string]: string[] } = {
      'nombre': ['nombre', 'name', 'first_name'],
      'apellido': ['apellido', 'last_name'],
      'correo': ['correo', 'email'],
      'identificacion': ['identificacion', 'id', 'documento'],
      'telefono': ['telefono', 'phone'],
      'rol': ['rol', 'role'],
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

    // Validar rol
    const rolIndex = getHeaderIndex('rol', ['rol', 'role']);
    if (rolIndex !== undefined) {
      const rol = rowData[rolIndex]?.trim().toUpperCase();
      if (rol && !this.validRoles.includes(rol)) {
        errors.push(`Fila ${rowNum}: El rol "${rol}" no es válido. Debe ser SELLER, CLIENT o ADMIN`);
      }
    }

    // Validar que la contraseña existe (sin validar si está encriptada o en texto plano)
    const passwordIndex = getHeaderIndex('contraseña', ['contraseña', 'contrasea', 'contrasena', 'password']);
    if (passwordIndex !== undefined) {
      const password = rowData[passwordIndex]?.trim();
      // Solo validar que existe, aceptar cualquier formato (texto plano o encriptado)
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

  private mapRowToUser(rowData: string[], headers: string[]): UserTemplate {
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
      'rol': { variations: ['rol', 'role'] },
      'contraseña': { variations: ['contraseña', 'contrasea', 'contrasena', 'password'] }
    };

    const user: any = {};

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
        user[field] = rowData[headerIndex]?.trim() || '';
      } else if (config.defaultValue) {
        user[field] = config.defaultValue;
      }
    }

    // Normalizar rol a mayúsculas
    if (user.rol) {
      user.rol = user.rol.toUpperCase();
    }

    return user as UserTemplate;
  }

  private findDuplicates(data: UserTemplate[]): { correo: string[], identificacion: string[] } {
    const seenCorreo = new Set<string>();
    const seenIdentificacion = new Set<string>();
    const duplicateCorreos: string[] = [];
    const duplicateIdentificaciones: string[] = [];

    for (const user of data) {
      const correoKey = user.correo?.toLowerCase().trim();
      if (correoKey) {
        if (seenCorreo.has(correoKey)) {
          duplicateCorreos.push(user.correo);
        } else {
          seenCorreo.add(correoKey);
        }
      }

      const identificacionKey = user.identificacion?.trim();
      if (identificacionKey) {
        if (seenIdentificacion.has(identificacionKey)) {
          duplicateIdentificaciones.push(user.identificacion);
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

