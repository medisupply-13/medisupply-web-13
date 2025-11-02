import { Injectable } from '@angular/core';
import { ProductValidationService } from './product-validation.service';
import { ProductsService } from './products.service';
import { environment } from '../../environments/environment';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data?: any[];
}

export interface ProductTemplate {
  sku: string;
  name: string;
  value: number;
  category_name: string;
  quantity: number;
  warehouse_id: number;
}

@Injectable({
  providedIn: 'root'
})
export class FileValidationService {
  
  constructor(
    private productValidationService: ProductValidationService,
    private productsService: ProductsService
  ) {}
  private readonly requiredFields = [
    'sku',
    'name',
    'value',
    'category_name',
    'quantity',
    'warehouse_id'
  ];

  private readonly fieldTypes = {
    sku: 'string',
    name: 'string',
    value: 'number',
    category_name: 'string',
    quantity: 'number',
    warehouse_id: 'number'
  };

  async validateCSVFile(file: File): Promise<ValidationResult> {
    try {
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
      
      // Debug: Log los headers encontrados
      console.log('Headers encontrados:', headers);
      console.log('Headers normalizados:', headers.map(h => 
        h.toLowerCase()
          .trim()
          .replace(/[^a-z0-9_]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '')
      ));
      
      const validationResult = this.validateHeaders(headers);
      
      if (!validationResult.isValid) {
        return validationResult;
      }

      const data: ProductTemplate[] = [];
      const errors: string[] = [];
      const warnings: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const rowData = this.parseCSVLine(lines[i]);
        const rowValidation = this.validateRow(rowData, i + 1);
        
        if (rowValidation.isValid) {
          data.push(this.mapRowToProduct(rowData, headers));
        } else {
          errors.push(...rowValidation.errors);
        }
      }

      // Validar duplicados (siempre ejecutar, independientemente de otros errores)
      const duplicates = this.findDuplicates(data);
      if (duplicates.sku.length > 0) {
        errors.push(`Se encontraron SKUs duplicados en el archivo: ${duplicates.sku.join(', ')}`);
      }
      if (duplicates.name.length > 0) {
        errors.push(`Se encontraron productos duplicados en el archivo: ${duplicates.name.join(', ')}`);
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

  async validateXLSXFile(file: File): Promise<ValidationResult> {
    // Para archivos XLSX necesitaríamos una librería como xlsx
    // Por ahora simulamos la validación
    return {
      isValid: false,
      errors: ['La validación de archivos XLSX aún no está implementada. Usa archivos CSV.'],
      warnings: []
    };
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

    // Normalizar headers (minúsculas, sin espacios, sin caracteres especiales)
    const normalizedHeaders = headers.map(h => 
      h.toLowerCase()
        .trim()
        .replace(/[^a-z0-9_]/g, '_') // Reemplazar caracteres especiales con _
        .replace(/_+/g, '_') // Reemplazar múltiples _ con uno solo
        .replace(/^_|_$/g, '') // Quitar _ del inicio y final
    );

    // Mapeo de variaciones de nombres de campos
    const fieldVariations: { [key: string]: string[] } = {
      'sku': ['sku', 'codigo', 'code', 'cod', 'id_producto', 'product_id'],
      'name': ['name', 'nombre', 'producto', 'product', 'item'],
      'value': ['value', 'precio', 'price', 'costo', 'cost', 'valor'],
      'category_name': ['category_name', 'categoria', 'category', 'categ', 'tipo', 'type'],
      'quantity': ['quantity', 'stock_minimo', 'stock_min', 'minimo', 'minimum', 'min_stock', 'stock'],
      'warehouse_id': ['warehouse_id', 'warehouse', 'bodega', 'bodega_id', 'almacen', 'almacen_id']
    };

    // Verificar campos obligatorios con variaciones
    const missingFields: string[] = [];
    const foundFields: string[] = [];
    
    for (const field of this.requiredFields) {
      let found = false;
      
      // Buscar el campo exacto
      if (normalizedHeaders.includes(field)) {
        found = true;
        foundFields.push(field);
      } else {
        // Buscar variaciones
        const variations = fieldVariations[field] || [];
        for (const variation of variations) {
          if (normalizedHeaders.includes(variation)) {
            found = true;
            foundFields.push(field);
            break;
          }
        }
      }
      
      if (!found) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      errors.push(`Campos obligatorios faltantes: ${missingFields.join(', ')}`);
      errors.push(`Headers encontrados: ${normalizedHeaders.join(', ')}`);
    }

    // Verificar campos adicionales (solo si no hay campos faltantes)
    if (missingFields.length === 0) {
      const additionalFields = normalizedHeaders.filter(h => !foundFields.includes(h));
      if (additionalFields.length > 0) {
        warnings.push(`Campos adicionales encontrados: ${additionalFields.join(', ')}`);
      }
    }

    // Verificar headers duplicados
    const duplicateHeaders = this.findDuplicateHeaders(normalizedHeaders);
    if (duplicateHeaders.length > 0) {
      errors.push(`Headers duplicados encontrados: ${duplicateHeaders.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateRow(rowData: string[], rowNumber: number): ValidationResult {
    const errors: string[] = [];

    // Verificar que no esté vacía
    if (rowData.every(cell => !cell.trim())) {
      errors.push(`Fila ${rowNumber}: Fila vacía`);
      return { isValid: false, errors, warnings: [] };
    }

    // Validar campos obligatorios (asumiendo orden estándar)
    const fieldNames = this.requiredFields;
    
    for (let i = 0; i < fieldNames.length && i < rowData.length; i++) {
      const fieldName = fieldNames[i];
      const value = rowData[i]?.trim();
      
      if (!value) {
        errors.push(`Fila ${rowNumber}: Campo '${fieldName}' es obligatorio`);
        continue;
      }

      // Validar tipo de dato
      const expectedType = this.fieldTypes[fieldName as keyof typeof this.fieldTypes];
      if (expectedType === 'number') {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0) {
          errors.push(`Fila ${rowNumber}: Campo '${fieldName}' debe ser un número válido mayor o igual a 0`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  private mapRowToProduct(rowData: string[], headers: string[]): ProductTemplate {
    // Normalizar headers para hacer el mapeo
    const normalizedHeaders = headers.map(h => 
      h.toLowerCase()
        .trim()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
    );

    // Crear un mapa de headers normalizados a índices
    const headerMap: { [key: string]: number } = {};
    normalizedHeaders.forEach((header, index) => {
      headerMap[header] = index;
    });

    return {
      sku: rowData[headerMap['sku']]?.trim() || '',
      name: rowData[headerMap['name']]?.trim() || '',
      value: parseFloat(rowData[headerMap['value']]?.trim() || '0'),
      category_name: rowData[headerMap['category_name']]?.trim() || '',
      quantity: parseInt(rowData[headerMap['quantity']]?.trim() || '0'),
      warehouse_id: parseInt(rowData[headerMap['warehouse_id']]?.trim() || '1')
    };
  }

  private findDuplicateHeaders(headers: string[]): string[] {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    
    for (const header of headers) {
      if (seen.has(header)) {
        duplicates.push(header);
      } else {
        seen.add(header);
      }
    }
    
    return duplicates;
  }

  private findDuplicates(data: ProductTemplate[]): { sku: string[], name: string[] } {
    const seenSku = new Set<string>();
    const seenName = new Set<string>();
    const duplicateSkus: string[] = [];
    const duplicateNames: string[] = [];
    
    for (const product of data) {
      // Validar duplicados por SKU
      const skuKey = product.sku.toLowerCase().trim();
      if (skuKey && seenSku.has(skuKey)) {
        duplicateSkus.push(product.sku);
      } else if (skuKey) {
        seenSku.add(skuKey);
      }
      
      // Validar duplicados por nombre
      const nameKey = product.name.toLowerCase().trim();
      if (nameKey && seenName.has(nameKey)) {
        duplicateNames.push(product.name);
      } else if (nameKey) {
        seenName.add(nameKey);
      }
    }
    
    return { sku: duplicateSkus, name: duplicateNames };
  }

  /**
   * Valida productos contra la base de datos existente usando el endpoint de upload
   * Si el backend no está disponible, hace validación local
   */
  async validateAgainstExistingProducts(data: ProductTemplate[], originalFile?: File): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      let file: File;
      
      // SIEMPRE usar el archivo original del usuario
      if (originalFile) {
        console.log('✅ Usando archivo original del usuario:', originalFile.name);
        console.log('📁 Archivo original - Tamaño:', originalFile.size, 'bytes');
        console.log('📁 Archivo original - Tipo:', originalFile.type);
        file = originalFile;
      } else {
        console.log('❌ ERROR: No se proporcionó archivo original');
        errors.push('No se pudo obtener el archivo original para enviar al backend');
        return { isValid: false, errors, warnings };
      }
      
      // Crear FormData para enviar al endpoint de upload
      // IMPORTANTE: El backend espera el campo "files" (plural)
      const formData = new FormData();
      formData.append('files', file);
      
      // Leer el contenido del archivo original para verificar
      const reader = new FileReader();
      reader.onload = (e) => {
        console.log('=== CONTENIDO DEL ARCHIVO ORIGINAL ===');
        console.log('Contenido:', e.target?.result);
        console.log('Tamaño en caracteres:', (e.target?.result as string)?.length);
      };
      reader.readAsText(file);
      
      // Probar la estructura del FormData
      this.testFormDataStructure(file);
      
      console.log('=== ENVIANDO AL BACKEND ===');
      console.log('URL del backend:', `${environment.baseUrl}products/upload3/validate`);
      console.log('File name:', file.name);
      console.log('File size:', file.size);
      console.log('File type:', file.type);
      console.log('FormData keys:', Array.from(formData.keys()));
      
      // Simular el comando curl exacto
      console.log('=== COMANDO CURL EQUIVALENTE ===');
      console.log(`curl -X POST -F "files=@${file.name}" ${environment.baseUrl}products/upload3/validate`);
      
      // Verificar el FormData exactamente como lo recibe el backend
      console.log('=== VERIFICACIÓN FORMDATA ===');
      for (let [key, value] of formData.entries()) {
        console.log(`FormData[${key}]:`, value);
        if (value instanceof File) {
          console.log('  - File name:', value.name);
          console.log('  - File size:', value.size);
          console.log('  - File type:', value.type);
          console.log('  - File lastModified:', value.lastModified);
        }
      }
      
      // Simular exactamente lo que hace curl con más detalles
      console.log('=== SIMULACIÓN CURL DETALLADA ===');
      console.log('Comando curl completo:');
      console.log(`curl -X POST \\`);
      console.log(`  -F "files=@${file.name}" \\`);
      console.log(`  -H "Content-Type: multipart/form-data" \\`);
      console.log(`  "${environment.baseUrl}products/upload3/validate"`);
      
      // Mostrar headers que enviará el navegador
      console.log('=== HEADERS QUE ENVIARÁ EL NAVEGADOR ===');
      console.log('Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...');
      console.log('Content-Length: [calculado automáticamente]');
      console.log('Origin: http://localhost:4200');
      console.log('Referer: http://localhost:4200/products/cargar');
      
      // ENVIAR COMO ARRAY JSON (más simple)
      console.log('=== ENVIANDO COMO ARRAY JSON ===');
      
      // Convertir el archivo CSV a array de objetos
      const fileContent = await this.readFileAsText(file);
      const lines = fileContent.split('\n').filter(line => line.trim());
      const headers = this.parseCSVLine(lines[0]);
      const products = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCSVLine(lines[i]);
        const product: any = {};
        headers.forEach((header, index) => {
          product[header.trim()] = values[index]?.trim() || '';
        });
        products.push(product);
      }
      
      console.log('=== PRODUCTOS A ENVIAR ===');
      console.log('Cantidad de productos:', products.length);
      console.log('Primeros 3 productos:', products.slice(0, 3));
      
      // Log del JSON que se enviará
      const jsonPayload = JSON.stringify(products);
      console.log('=== PAYLOAD JSON ===');
      console.log('Tamaño del JSON:', jsonPayload.length, 'caracteres');
      console.log('Primeros 500 caracteres:', jsonPayload.substring(0, 500) + (jsonPayload.length > 500 ? '...' : ''));
      
      // Log de la petición HTTP
      console.log('=== PETICIÓN HTTP ===');
      console.log('URL:', `${environment.baseUrl}products/upload3/validate`);
      console.log('Método: POST');
      console.log('Content-Type: text/plain');
      console.log('Body: Array JSON como string');
      
      // Log del CURL exacto en una sola línea
      console.log('=== CURL EXACTO ===');
      console.log(`curl -X POST -H "Content-Type: text/plain" -d '${jsonPayload}' ${environment.baseUrl}products/upload3/validate`);
      
            const response = await fetch(`${environment.baseUrl}products/upload3/validate`, {
              method: 'POST',
              headers: {
                'Content-Type': 'text/plain'
              },
              body: jsonPayload
            });
      
      console.log('=== RESPUESTA DEL SERVIDOR ===');
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);
      console.log('Headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        // Log del cuerpo de la respuesta para errores
        const responseText = await response.text();
        console.log('=== CUERPO DE LA RESPUESTA (ERROR) ===');
        console.log('Tamaño de la respuesta:', responseText.length, 'caracteres');
        console.log('Respuesta completa:', responseText);
        
        console.error('=== ERROR DEL SERVIDOR ===');
        console.error('Error del servidor:', responseText);
        console.error('Status del servidor:', response.status);
        console.error('Headers del servidor:', Object.fromEntries(response.headers.entries()));
        
        // Mostrar el error específico del backend
        try {
          const errorJson = JSON.parse(responseText);
          if (errorJson.error) {
            errors.push(`Error del backend: ${errorJson.error}`);
          } else if (errorJson.message) {
            errors.push(`Error del backend: ${errorJson.message}`);
          } else {
            errors.push(`Error del backend: ${responseText}`);
          }
        } catch {
          errors.push(`Error del backend (${response.status}): ${responseText}`);
        }
        
        // Agregar información adicional para debug
        errors.push(`Status HTTP: ${response.status}`);
        errors.push(`URL: ${environment.baseUrl}products/upload3/validate`);
        
        return { isValid: false, errors, warnings };
      }
      
      // Para respuestas exitosas, leer como JSON directamente
      const result = await response.json();
      console.log('=== RESPUESTA EXITOSA ===');
      console.log('Respuesta del backend:', result);
      console.log('Tipo de respuesta:', typeof result);
      console.log('Claves de la respuesta:', Object.keys(result));
      
      // Procesar la respuesta del backend
      if (result.errors && result.errors.length > 0) {
        errors.push(...result.errors);
      }
      
      if (result.warnings && result.warnings.length > 0) {
        warnings.push(...result.warnings);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        data: errors.length === 0 ? data : undefined
      };

    } catch (error) {
      console.error('Error al validar contra productos existentes:', error);
      warnings.push('No se pudo conectar con el servidor para validación. Se validará solo localmente.');
      
      // Usar validación local como fallback
      return this.validateLocallyOnly(data);
    }
  }

  /**
   * Inserta productos ya validados usando el endpoint dedicado
   */
  async insertValidatedProducts(products: any[]): Promise<any> {
    const url = `${environment.baseUrl}products/upload3/insert`;
    const jsonPayload = JSON.stringify(products);
    console.log('=== INSERT PRODUCTS (POST) ===');
    console.log('URL:', url);
    console.log('Método: POST');
    console.log('Content-Type: application/json');
    console.log('Productos:', products.length);
    console.log('Payload JSON:', jsonPayload);
    console.log('Tamaño del payload:', jsonPayload.length, 'caracteres');
    console.log('CURL EXACTO:');
    console.log(`curl -X POST -H "Content-Type: application/json" -d '${jsonPayload}' ${url}`);
    console.log('=== ENVIANDO REQUEST ===');
    console.log('Headers:', { 'Content-Type': 'application/json' });
    console.log('Body:', jsonPayload);
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jsonPayload
    });
    console.log('=== RESPUESTA DEL SERVIDOR ===');
    console.log('Status:', resp.status);
    console.log('Status Text:', resp.statusText);
    console.log('Headers de respuesta:', Object.fromEntries(resp.headers.entries()));
    const text = await resp.text();
    console.log('Cuerpo de la respuesta:', text);
    console.log('=== CURL DE RESPUESTA ===');
    const statusLine = resp.status === 200 ? 'HTTP/1.1 200 OK' : resp.status === 201 ? 'HTTP/1.1 201 Created' : `HTTP/1.1 ${resp.status} ${resp.statusText}`;
    console.log(statusLine);
    console.log('Headers de respuesta:');
    resp.headers.forEach((value, key) => {
      console.log(`${key}: ${value}`);
    });
    console.log('');
    console.log('Body de respuesta:');
    console.log(text);
    console.log('');
    console.log('=== RESUMEN ===');
    console.log(`curl -X POST -H "Content-Type: application/json" -d '${jsonPayload}' ${url}`);
    console.log(`Respuesta: HTTP ${resp.status} ${resp.statusText}`);
    console.log(`Body: ${text}`);
    try { return JSON.parse(text); } catch { return { raw: text, status: resp.status }; }
  }

  /**
   * Convierte los datos de productos a formato CSV con las columnas que espera el backend
   */
  private convertDataToCSV(data: ProductTemplate[]): string {
    // Headers que espera el backend
    const backendHeaders = ['sku', 'name', 'value', 'category_name', 'quantity', 'warehouse_id'];
    const headers = backendHeaders.join(',');
    
    const rows = data.map(product => 
      `${product.sku},${product.name},${product.value},${product.category_name},${product.quantity},${product.warehouse_id}`
    );
    
    return `${headers}\n${rows.join('\n')}`;
  }

  /**
   * Valida productos solo localmente (sin backend)
   */
  async validateLocallyOnly(data: ProductTemplate[]): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

      // Validar duplicados en el archivo
      const skuDuplicates = this.productValidationService.validateSkuDuplicatesInFile(data);
      const nameDuplicates = this.productValidationService.validateNameDuplicatesInFile(data);

      skuDuplicates.forEach(duplicate => {
        errors.push(`SKU '${duplicate.sku}' duplicado en las filas: ${duplicate.rowNumbers.join(', ')}`);
      });

      nameDuplicates.forEach(duplicate => {
        errors.push(`Producto '${duplicate.nombre}' duplicado en las filas: ${duplicate.rowNumbers.join(', ')}`);
      });

    warnings.push('Validación realizada solo localmente. No se validó contra productos existentes en el servidor.');

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        data: errors.length === 0 ? data : undefined
      };
  }

  /**
   * Valida productos sin intentar conectar al backend
   */
  async validateWithoutBackend(data: ProductTemplate[]): Promise<ValidationResult> {
    console.log('Validando productos sin backend...');
    return this.validateLocallyOnly(data);
  }

  /**
   * Prueba la estructura del FormData para debug
   */
  testFormDataStructure(file: File): void {
    console.log('=== PRUEBA DE ESTRUCTURA FORMDATA ===');
    
    const formData = new FormData();
    formData.append('files', file);
    
    console.log('FormData creado con:');
    console.log('- Campo: "files"');
    console.log('- Archivo:', file.name);
    console.log('- Tamaño:', file.size, 'bytes');
    console.log('- Tipo:', file.type);
    
    // Verificar que el FormData tiene la estructura correcta
    const entries = Array.from(formData.entries());
    console.log('Entradas del FormData:', entries.length);
    
    entries.forEach(([key, value], index) => {
      console.log(`Entrada ${index + 1}:`);
      console.log(`  Key: "${key}"`);
      console.log(`  Value type: ${typeof value}`);
      if (value instanceof File) {
        console.log(`  File name: ${value.name}`);
        console.log(`  File size: ${value.size}`);
        console.log(`  File type: ${value.type}`);
      }
    });
    
    // Simular el comando curl equivalente
    console.log('Comando curl equivalente:');
    console.log(`curl -X POST -F "files=@${file.name}" ${environment.baseUrl}products/upload3/validate`);
  }

  /**
   * Prueba directa del endpoint sin validación previa
   */
  async testDirectUpload(file: File): Promise<void> {
    console.log('=== PRUEBA DIRECTA DEL UPLOAD ===');
    
    const formData = new FormData();
    formData.append('files', file);
    
    console.log('Enviando archivo directamente:', file.name);
    console.log('Tamaño:', file.size, 'bytes');
    console.log('Tipo:', file.type);
    
    try {
      const response = await fetch(`${environment.baseUrl}products/upload3/validate`, {
        method: 'POST',
        body: formData
      });
      
      console.log('Respuesta del servidor:');
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);
      console.log('Headers:', Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log('Contenido de la respuesta:', responseText);
      
      if (response.ok) {
        console.log('✅ Upload exitoso!');
        try {
          const jsonResponse = JSON.parse(responseText);
          console.log('JSON parseado:', jsonResponse);
        } catch (e) {
          console.log('No se pudo parsear como JSON');
        }
      } else {
        console.log('❌ Upload falló');
      }

    } catch (error) {
      console.error('Error en la prueba:', error);
    }
  }

  generateTemplateCSV(): string {
    const headers = this.requiredFields.join(',');
    // Plantilla con UN ejemplo completo con todos los campos prellenados como referencia
    // Campos: sku, name, value, category_name, quantity, warehouse_id (6 campos total)
    // Este método se usa como fallback cuando no se pueden obtener datos del backend
    const sampleData = 'EJEMPLO-001,Producto de Ejemplo,5000,Categoría Ejemplo,50,1';
    
    return `${headers}\n${sampleData}`;
  }

  /**
   * Genera una plantilla CSV usando productos reales del backend
   */
  generateTemplateCSVWithRealData(): Promise<string> {
    const headers = this.requiredFields.join(',');
    
    console.log('🔍 FileValidationService: Iniciando generación de plantilla con datos reales');
    console.log('🌐 FileValidationService: Headers requeridos:', headers);
    
    return new Promise((resolve) => {
      this.productsService.getAvailableProducts().subscribe({
        next: (response) => {
          console.log('📡 FileValidationService: Respuesta completa del backend:', response);
          console.log('📊 FileValidationService: Tipo de respuesta:', typeof response);
          console.log('📋 FileValidationService: Propiedades de la respuesta:', Object.keys(response));
          
          if (response && response.products && Array.isArray(response.products) && response.products.length > 0) {
            console.log('✅ FileValidationService: Productos encontrados:', response.products.length);
            console.log('📦 FileValidationService: Primeros productos:', response.products.slice(0, 3));
            
            // Usar el PRIMER producto real como ejemplo completo con todos los campos prellenados
            // Campos: sku, name, value, category_name, quantity, warehouse_id (6 campos total)
            const firstProduct = response.products[0];
            console.log('🔧 FileValidationService: Procesando producto ejemplo:', firstProduct);
            
            // Prellenar todos los campos con datos del producto real como ejemplo
            // Asegurar que todos los campos tengan valores de ejemplo, incluso si el producto no los tiene
            const sampleData = [
              firstProduct.sku || 'EJEMPLO-001',
              firstProduct.name || 'Producto Ejemplo',
              firstProduct.value != null ? String(firstProduct.value) : '1000',
              firstProduct.category_name || 'Categoría Ejemplo',
              firstProduct.total_quantity != null ? String(firstProduct.total_quantity) : '10',
              '1' // warehouse_id de ejemplo
            ].join(',');
            console.log('📝 FileValidationService: Línea CSV generada (ejemplo completo):', sampleData);
            console.log('📝 FileValidationService: Valores individuales:', {
              sku: firstProduct.sku || 'EJEMPLO-001',
              name: firstProduct.name || 'Producto Ejemplo',
              value: firstProduct.value != null ? String(firstProduct.value) : '1000',
              category: firstProduct.category_name || 'Categoría Ejemplo',
              quantity: firstProduct.total_quantity != null ? String(firstProduct.total_quantity) : '10'
            });
            const finalCsv = `${headers}\n${sampleData}`;
            console.log('📄 FileValidationService: CSV final generado (solo SKUs prellenados):', finalCsv);
            resolve(finalCsv);
          } else {
            console.log('⚠️ FileValidationService: No hay productos o respuesta inválida');
            console.log('📊 FileValidationService: response.products:', response?.products);
            console.log('📊 FileValidationService: Array.isArray:', Array.isArray(response?.products));
            console.log('📊 FileValidationService: Length:', response?.products?.length);
            
            // Fallback a un solo dato de ejemplo si no hay productos (con todos los campos)
            const fallbackData = 'FALLBACK-001,Producto Ejemplo,1000,Categoría Ejemplo,10,1';
            console.log('🔄 FileValidationService: Usando datos de fallback (sin productos del backend) - solo SKUs');
            resolve(`${headers}\n${fallbackData}`);
          }
        },
        error: (error) => {
          console.error('❌ FileValidationService: Error al obtener productos para plantilla:', error);
          console.error('❌ FileValidationService: Detalles del error:', {
            message: error.message,
            status: error.status,
            statusText: error.statusText,
            url: error.url
          });
          
          // Fallback a un solo dato de ejemplo en caso de error (con todos los campos)
          const fallbackData = 'ERROR-001,Producto Ejemplo,1000,Categoría Ejemplo,10,1';
          console.log('🔄 FileValidationService: Usando datos de fallback por error de conexión - solo SKUs');
          resolve(`${headers}\n${fallbackData}`);
        }
      });
    });
  }
}

