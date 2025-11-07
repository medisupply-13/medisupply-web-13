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
  private readonly validRoles = ['SELLER', 'CLIENT'];

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
        'Content-Type': 'application/json',
        'X-File-Name': fileName,
        'X-File-Type': 'csv'
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

    const normalizedHeaders = headers.map(h => 
      h.toLowerCase()
        .trim()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
    );

    const fieldVariations: { [key: string]: string[] } = {
      'nombre': ['nombre', 'name', 'first_name', 'firstname'],
      'apellido': ['apellido', 'last_name', 'lastname', 'surname'],
      'correo': ['correo', 'email', 'e_mail', 'mail'],
      'identificacion': ['identificacion', 'id', 'documento', 'document', 'cedula', 'dni'],
      'telefono': ['telefono', 'phone', 'telephone', 'celular', 'mobile'],
      'rol': ['rol', 'role', 'tipo', 'type', 'perfil'],
      'contraseña': ['contraseña', 'contrasea', 'password', 'pass', 'passwd']
    };

    const missingFields: string[] = [];
    
    for (const field of this.requiredFields) {
      let found = false;
      
      if (normalizedHeaders.includes(field)) {
        found = true;
      } else {
        const variations = fieldVariations[field] || [];
        for (const variation of variations) {
          if (normalizedHeaders.includes(variation)) {
            found = true;
            break;
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

    const normalizedHeaders = headers.map(h => 
      h.toLowerCase()
        .trim()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
    );

    const headerMap: { [key: string]: number } = {};
    normalizedHeaders.forEach((header, index) => {
      headerMap[header] = index;
    });

    // Validar campos requeridos
    const fieldMappings: { [key: string]: string[] } = {
      'nombre': ['nombre', 'name', 'first_name'],
      'apellido': ['apellido', 'last_name'],
      'correo': ['correo', 'email'],
      'identificacion': ['identificacion', 'id', 'documento'],
      'telefono': ['telefono', 'phone'],
      'rol': ['rol', 'role'],
      'contraseña': ['contraseña', 'password']
    };

    for (const [field, variations] of Object.entries(fieldMappings)) {
      let found = false;
      for (const variation of variations) {
        if (headerMap[variation] !== undefined) {
          const value = rowData[headerMap[variation]]?.trim();
          if (!value || value === '') {
            errors.push(`Fila ${rowNum}: ${field} es obligatorio`);
          }
          found = true;
          break;
        }
      }
      if (!found) {
        errors.push(`Fila ${rowNum}: Campo ${field} no encontrado`);
      }
    }

    // Validar formato de correo
    if (headerMap['correo'] !== undefined) {
      const email = rowData[headerMap['correo']]?.trim();
      if (email && !this.isValidEmail(email)) {
        errors.push(`Fila ${rowNum}: El correo "${email}" no es válido`);
      }
    }

    // Validar rol
    if (headerMap['rol'] !== undefined) {
      const rol = rowData[headerMap['rol']]?.trim().toUpperCase();
      if (rol && !this.validRoles.includes(rol)) {
        errors.push(`Fila ${rowNum}: El rol "${rol}" no es válido. Debe ser SELLER o CLIENT`);
      }
    }

    // Validar contraseña encriptada (debe ser una cadena encriptada, no texto plano)
    // Según HU107: Si se detecta texto plano, se rechaza todo el archivo
    if (headerMap['contraseña'] !== undefined || headerMap['password'] !== undefined) {
      const passwordField = headerMap['contraseña'] !== undefined ? 'contraseña' : 'password';
      const password = rowData[headerMap[passwordField]]?.trim();
      if (password) {
        // Verificar si parece ser texto plano
        // Las contraseñas encriptadas típicamente:
        // - bcrypt: empiezan con $2a$, $2b$, $2y$ y tienen 60 caracteres
        // - SHA256/512: tienen 64 o 128 caracteres hexadecimales
        // - Otros hashes: tienen al menos 32 caracteres hexadecimales
        const isEncrypted = 
          password.length >= 32 && (
            password.startsWith('$2a$') || 
            password.startsWith('$2b$') || 
            password.startsWith('$2y$') || 
            password.startsWith('$2$') ||
            /^[a-f0-9]{32,}$/i.test(password) ||
            password.length >= 60
          );
        
        if (!isEncrypted) {
          // Rechazar todo el archivo según HU107
          errors.push(`Fila ${rowNum}: La contraseña debe estar encriptada, no en texto plano. El archivo será rechazado.`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private mapRowToUser(rowData: string[], headers: string[]): UserTemplate {
    const normalizedHeaders = headers.map(h => 
      h.toLowerCase()
        .trim()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
    );

    const headerMap: { [key: string]: number } = {};
    normalizedHeaders.forEach((header, index) => {
      headerMap[header] = index;
    });

    const fieldMappings: { [key: string]: { variations: string[]; defaultValue?: string } } = {
      'nombre': { variations: ['nombre', 'name', 'first_name'] },
      'apellido': { variations: ['apellido', 'last_name'] },
      'correo': { variations: ['correo', 'email'] },
      'identificacion': { variations: ['identificacion', 'id', 'documento'] },
      'telefono': { variations: ['telefono', 'phone'] },
      'rol': { variations: ['rol', 'role'] },
      'contraseña': { variations: ['contraseña', 'password'] }
    };

    const user: any = {};

    for (const [field, config] of Object.entries(fieldMappings)) {
      let found = false;
      for (const variation of config.variations) {
        if (headerMap[variation] !== undefined) {
          user[field] = rowData[headerMap[variation]]?.trim() || '';
          found = true;
          break;
        }
      }
      if (!found && config.defaultValue) {
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

