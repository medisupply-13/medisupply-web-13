import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data?: any[];
}

export interface ProviderTemplate {
  nombre: string;
  apellido: string;
  correo: string;
  identificacion: string;
  telefono: string;
  nombre_empresa: string;
  contraseña: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProviderValidationService {
  private readonly api = environment.baseUrl;
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB
  private readonly allowedTypes = ['.csv', '.xlsx'];
  // Campos obligatorios para registro de proveedores
  private readonly requiredFields = ['nombre', 'apellido', 'correo', 'identificacion', 'telefono', 'nombre_empresa', 'contraseña'];

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
   * Valida proveedores contra el backend usando el endpoint /users/providers/upload/validate
   */
  async validateAgainstBackend(providers: ProviderTemplate[], fileName: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Construir URL correcta - asegurar que baseUrl termine con / y agregar la ruta completa
      const baseUrl = this.api.endsWith('/') ? this.api : `${this.api}/`;
      const url = `${baseUrl}users/providers/upload/validate`;
      
      console.log('=== VALIDAR PROVEEDORES EN BACKEND ===');
      console.log('Base URL:', this.api);
      console.log('URL completa construida:', url);
      console.log('Proveedores a validar:', providers.length);
      
      const jsonPayload = JSON.stringify(providers);
      console.log('Payload JSON completo:', jsonPayload);
      console.log('Primeros 500 chars del payload:', jsonPayload.substring(0, 500));
      
      // VERIFICACIÓN CRÍTICA: La URL DEBE contener /users/providers/upload/validate
      // Si no la contiene, significa que se está ejecutando código antiguo en caché
      if (!url.includes('/users/providers/upload/validate')) {
        const errorMsg = `❌ ERROR CRÍTICO: URL incorrecta detectada: ${url}. La URL debe ser: ${baseUrl}users/providers/upload/validate. Por favor, limpia el caché del navegador y recarga la página (Ctrl+Shift+R o Cmd+Shift+R).`;
        console.error(errorMsg);
        console.error('❌ Esto indica que el navegador está ejecutando código antiguo en caché.');
        console.error('❌ Solución: 1) Detener el servidor Angular, 2) Limpiar caché del navegador, 3) Reiniciar el servidor, 4) Recargar con Ctrl+Shift+R');
        errors.push(errorMsg);
        return { isValid: false, errors, warnings };
      }
      
      // Verificar que NO contenga la URL antigua incorrecta
      if (url.includes('/providers/upload/validate') && !url.includes('/users/providers/upload/validate')) {
        const errorMsg = `❌ ERROR: Se detectó la URL antigua incorrecta. Por favor, limpia el caché del navegador completamente.`;
        console.error(errorMsg);
        errors.push(errorMsg);
        return { isValid: false, errors, warnings };
      }
      
      console.log('✅ URL correcta verificada:', url);
      console.log('✅ Versión del código: 2024-11-11 - URL corregida con /users/providers/');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: jsonPayload
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('=== ERROR EN RESPUESTA ===');
        console.error('Status:', response.status);
        console.error('Status Text:', response.statusText);
        console.error('URL:', url);
        console.error('Error Text:', errorText);
        
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

    } catch (error: any) {
      console.error('=== ERROR AL VALIDAR PROVEEDORES ===');
      console.error('Error:', error);
      console.error('Error message:', error?.message);
      console.error('Error name:', error?.name);
      console.error('URL intentada:', `${this.api}users/providers/upload/validate`);
      
      // Detectar errores de CORS específicamente
      if (error?.message?.includes('CORS') || error?.message?.includes('cors')) {
        errors.push('Error de CORS: El servidor no permite la solicitud desde este origen. Verifica la configuración del backend.');
      } else if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
        errors.push('Error de red: No se pudo conectar con el servidor. Verifica que el servidor esté disponible y la URL sea correcta.');
      } else {
        errors.push(`No se pudo conectar con el servidor para validación: ${error?.message || 'Error desconocido'}`);
      }
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Valida un solo proveedor usando el mismo endpoint de validación masiva
   * Útil para validar proveedores individuales antes de insertarlos
   */
  async validateSingleProvider(provider: ProviderTemplate): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Convertir el proveedor a array para usar el mismo endpoint
      const providersArray = [provider];
      const jsonPayload = JSON.stringify(providersArray);

      console.log('🔍 ProviderValidationService: Validando proveedor individual');
      console.log('📦 Proveedor a validar:', JSON.stringify(provider, null, 2));
      
      const baseUrl = this.api.endsWith('/') ? this.api : `${this.api}/`;
      const url = `${baseUrl}users/providers/upload/validate`;
      console.log('🌐 URL:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: jsonPayload
      });

      console.log('📊 ProviderValidationService: Status de respuesta:', response.status);

      if (!response.ok) {
        const responseText = await response.text();
        console.error('❌ ProviderValidationService: Error en validación:', responseText);

        try {
          const errorJson = JSON.parse(responseText);
          
          // Buscar errores específicos primero
          if (errorJson.errors && Array.isArray(errorJson.errors)) {
            // Filtrar mensajes genéricos de archivo
            const specificErrors = errorJson.errors.filter((err: string) => {
              const lowerErr = err.toLowerCase();
              return !lowerErr.includes('¡ups! el archivo tiene errores de validación') &&
                     !lowerErr.includes('revisa y sube nuevamente') &&
                     !lowerErr.includes('el archivo tiene errores');
            });
            
            if (specificErrors.length > 0) {
              errors.push(...specificErrors);
            } else if (errorJson.detailed_errors && Array.isArray(errorJson.detailed_errors)) {
              errors.push(...errorJson.detailed_errors);
            } else if (errorJson.validation_errors && Array.isArray(errorJson.validation_errors)) {
              errors.push(...errorJson.validation_errors);
            } else {
              // Limpiar mensajes genéricos
              errors.push(...errorJson.errors.map((err: string) => 
                err.replace(/archivo/gi, 'proveedor').replace(/sube nuevamente/gi, 'intenta nuevamente')
              ));
            }
          } else if (errorJson.error) {
            errors.push(typeof errorJson.error === 'string' ? errorJson.error : JSON.stringify(errorJson.error));
          } else if (errorJson.message) {
            const message = errorJson.message.toLowerCase();
            // Filtrar mensajes genéricos
            if (!message.includes('¡ups! el archivo tiene errores de validación') &&
                !message.includes('revisa y sube nuevamente')) {
              errors.push(errorJson.message);
            }
          } else {
            errors.push(`Error del backend: ${responseText}`);
          }
        } catch {
          errors.push(`Error del backend (${response.status}): ${responseText}`);
        }

        return { isValid: false, errors, warnings };
      }

      // Leer respuesta exitosa
      const result = await response.json();
      console.log('✅ ProviderValidationService: Respuesta de validación completa:', JSON.stringify(result, null, 2));

      // Procesar errores - buscar en múltiples lugares donde el backend podría ponerlos
      let allErrors: string[] = [];
      
      // Buscar errores en diferentes campos del response
      if (result.errors && Array.isArray(result.errors)) {
        allErrors.push(...result.errors);
      }
      if (result.detailed_errors && Array.isArray(result.detailed_errors)) {
        allErrors.push(...result.detailed_errors);
      }
      if (result.validation_errors && Array.isArray(result.validation_errors)) {
        allErrors.push(...result.validation_errors);
      }
      if (result.error && typeof result.error === 'string') {
        allErrors.push(result.error);
      }
      
      // Buscar errores por índice si hay validaciones por proveedor
      if (result.invalid_records && Array.isArray(result.invalid_records)) {
        result.invalid_records.forEach((record: any, index: number) => {
          if (record.errors && Array.isArray(record.errors)) {
            allErrors.push(...record.errors);
          }
          if (record.error) {
            allErrors.push(record.error);
          }
          if (record.message) {
            allErrors.push(record.message);
          }
        });
      }
      
      // Filtrar mensajes genéricos de archivo cuando es validación individual
      const specificErrors = allErrors.filter((err: string) => {
        const lowerErr = err.toLowerCase();
        // Filtrar mensajes genéricos que mencionan "archivo" o "sube nuevamente"
        return !lowerErr.includes('¡ups! el archivo tiene errores de validación') &&
               !lowerErr.includes('revisa y sube nuevamente') &&
               !lowerErr.includes('el archivo tiene errores') &&
               !lowerErr.includes('el archivo excede') &&
               !lowerErr.includes('formato del archivo');
      });
      
      if (specificErrors.length > 0) {
        errors.push(...specificErrors);
      } else if (allErrors.length > 0) {
        // Si solo hay mensajes genéricos, limpiarlos y adaptarlos
        errors.push(...allErrors.map((err: string) => 
          err.replace(/archivo/gi, 'proveedor')
             .replace(/sube nuevamente/gi, 'intenta nuevamente')
             .replace(/el proveedor tiene errores de validación/gi, 'Error de validación')
        ));
      }
      
      console.log('🔍 ProviderValidationService: Errores específicos encontrados:', errors);

      // Procesar warnings
      if (result.warnings && result.warnings.length > 0) {
        warnings.push(...result.warnings);
      }

      // Obtener proveedor validado del backend si está disponible
      const validatedProviders = result.validated_providers && result.validated_providers.length > 0 
        ? result.validated_providers 
        : (result.data && result.data.length > 0 
          ? result.data 
          : (errors.length === 0 ? providersArray : undefined));

      return {
        isValid: errors.length === 0 && validatedProviders !== undefined,
        errors,
        warnings,
        data: validatedProviders
      };

    } catch (error) {
      console.error('❌ ProviderValidationService: Error al validar proveedor:', error);
      errors.push('No se pudo conectar con el servidor para validación');
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Inserta proveedores validados usando el endpoint /users/providers/upload/insert
   */
  async insertValidatedProviders(providers: ProviderTemplate[], fileName: string): Promise<any> {
    // Construir URL correcta - asegurar que baseUrl termine con / y agregar la ruta completa
    const baseUrl = this.api.endsWith('/') ? this.api : `${this.api}/`;
    const url = `${baseUrl}users/providers/upload/insert`;
    
    console.log('=== INSERT PROVIDERS (POST) ===');
    console.log('Base URL:', this.api);
    console.log('URL completa construida:', url);
    console.log('Proveedores a insertar:', providers.length);
    console.log('Nombre de archivo:', fileName);
    
    // Verificar que la URL sea correcta
    if (!url.includes('/users/providers/upload/insert')) {
      console.error('❌ ERROR: URL incorrecta detectada:', url);
      throw new Error(`Error de configuración: URL incorrecta. URL actual: ${url}`);
    }
    
    console.log('✅ URL correcta verificada:', url);
    
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
    // Contraseñas en texto plano (el backend las encriptará)
    // Formato: nombre,apellido,correo,identificacion,telefono,nombre_empresa,contraseña
    const example1 = `Juan,Pérez,juan.perez@proveedor.com,9001234567,3001234567,Proveedora Médica ABC S.A.,Provider123!`;
    const example2 = `María,González,maria.gonzalez@proveedor.com,9007654321,3007654321,Distribuidora XYZ S.A.S.,SecurePass456@`;
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
      'nombre_empresa': ['nombre_empresa', 'nombreempresa', 'empresa', 'company', 'company_name', 'razon_social', 'razón_social'],
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
      'nombre_empresa': ['nombre_empresa', 'nombreempresa', 'empresa', 'company', 'company_name', 'razon_social', 'razón_social'],
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

    // Validar contraseña (mínimo 8 caracteres, mayúscula, minúscula, número y carácter especial)
    const passwordIndex = getHeaderIndex('contraseña', ['contraseña', 'contrasea', 'contrasena', 'password']);
    if (passwordIndex !== undefined) {
      const password = rowData[passwordIndex]?.trim();
      if (!password || password === '') {
        errors.push(`Fila ${rowNum}: contraseña es obligatorio`);
      } else if (!this.isValidPassword(password)) {
        errors.push(`Fila ${rowNum}: La contraseña debe tener mínimo 8 caracteres, incluir mayúscula, minúscula, número y carácter especial`);
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
      'nombre': { variations: ['nombre', 'name', 'first_name'] },
      'apellido': { variations: ['apellido', 'last_name'] },
      'correo': { variations: ['correo', 'email'] },
      'identificacion': { variations: ['identificacion', 'id', 'documento'] },
      'telefono': { variations: ['telefono', 'phone'] },
      'nombre_empresa': { variations: ['nombre_empresa', 'nombreempresa', 'empresa', 'company', 'company_name', 'razon_social', 'razón_social'] },
      'contraseña': { variations: ['contraseña', 'contrasea', 'contrasena', 'password'] }
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

  private findDuplicates(data: ProviderTemplate[]): { correo: string[], identificacion: string[] } {
    const seenCorreo = new Set<string>();
    const seenIdentificacion = new Set<string>();
    const duplicateCorreos: string[] = [];
    const duplicateIdentificaciones: string[] = [];

    for (const provider of data) {
      const correoKey = provider.correo?.toLowerCase().trim();
      if (correoKey) {
        if (seenCorreo.has(correoKey)) {
          duplicateCorreos.push(provider.correo);
        } else {
          seenCorreo.add(correoKey);
        }
      }

      const identificacionKey = provider.identificacion?.trim();
      if (identificacionKey) {
        if (seenIdentificacion.has(identificacionKey)) {
          duplicateIdentificaciones.push(provider.identificacion);
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

  /**
   * Valida que la contraseña cumpla con los requisitos:
   * - Mínimo 8 caracteres
   * - Al menos una mayúscula
   * - Al menos una minúscula
   * - Al menos un número
   * - Al menos un carácter especial
   */
  private isValidPassword(password: string): boolean {
    if (password.length < 8) {
      return false;
    }
    
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
  }
}

