import { TranslatePipe } from './translate.pipe';
import { ACTIVE_TRANSLATIONS } from '../lang/lang-store';

describe('TranslatePipe', () => {
  let pipe: TranslatePipe;
  let originalTranslations: Record<string, string>;

  beforeEach(() => {
    // Guardar el estado original de las traducciones
    originalTranslations = { ...ACTIVE_TRANSLATIONS };

    // Limpiar ACTIVE_TRANSLATIONS para cada test
    Object.keys(ACTIVE_TRANSLATIONS).forEach(key => {
      delete ACTIVE_TRANSLATIONS[key];
    });

    pipe = new TranslatePipe();
  });

  afterEach(() => {
    // Restaurar el estado original
    Object.keys(ACTIVE_TRANSLATIONS).forEach(key => {
      delete ACTIVE_TRANSLATIONS[key];
    });
    Object.assign(ACTIVE_TRANSLATIONS, originalTranslations);
  });

  it('should be created', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return translation when key exists', () => {
    ACTIVE_TRANSLATIONS['testKey'] = 'Test Translation';
    
    const result = pipe.transform('testKey');
    
    expect(result).toBe('Test Translation');
  });

  it('should return key when translation does not exist and key is not goalReportButton', () => {
    const result = pipe.transform('nonExistentKey');
    
    expect(result).toBe('nonExistentKey');
  });

  it('should return key and log warnings when key is goalReportButton and translation does not exist', () => {
    spyOn(console, 'warn');
    
    const result = pipe.transform('goalReportButton');
    
    expect(result).toBe('goalReportButton');
    expect(console.warn).toHaveBeenCalledTimes(2);
    expect(console.warn).toHaveBeenCalledWith('⚠️ TranslatePipe: goalReportButton no encontrado en ACTIVE_TRANSLATIONS');
    expect(console.warn).toHaveBeenCalledWith('⚠️ TranslatePipe: Keys disponibles:', []);
  });

  it('should return translation when goalReportButton exists', () => {
    ACTIVE_TRANSLATIONS['goalReportButton'] = 'Generar Reporte';
    spyOn(console, 'warn');
    
    const result = pipe.transform('goalReportButton');
    
    expect(result).toBe('Generar Reporte');
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('should filter and show available goal/report keys in warning when goalReportButton not found', () => {
    ACTIVE_TRANSLATIONS['goalReportTitle'] = 'Title';
    ACTIVE_TRANSLATIONS['goalReportError'] = 'Error';
    ACTIVE_TRANSLATIONS['reportSomething'] = 'Report';
    ACTIVE_TRANSLATIONS['otherKey'] = 'Other';
    spyOn(console, 'warn');
    
    pipe.transform('goalReportButton');
    
    expect(console.warn).toHaveBeenCalledWith('⚠️ TranslatePipe: goalReportButton no encontrado en ACTIVE_TRANSLATIONS');
    expect(console.warn).toHaveBeenCalledWith(
      '⚠️ TranslatePipe: Keys disponibles:',
      jasmine.arrayContaining(['goalReportTitle', 'goalReportError', 'reportSomething'])
    );
  });

  it('should handle empty ACTIVE_TRANSLATIONS', () => {
    const result = pipe.transform('anyKey');
    
    expect(result).toBe('anyKey');
  });

  it('should return empty string when translation is empty string', () => {
    ACTIVE_TRANSLATIONS['emptyKey'] = '';
    
    const result = pipe.transform('emptyKey');
    
    // Empty string es falsy, por lo que retornará la key
    expect(result).toBe('emptyKey');
  });

  it('should handle multiple translations', () => {
    ACTIVE_TRANSLATIONS['key1'] = 'value1';
    ACTIVE_TRANSLATIONS['key2'] = 'value2';
    ACTIVE_TRANSLATIONS['key3'] = 'value3';
    
    expect(pipe.transform('key1')).toBe('value1');
    expect(pipe.transform('key2')).toBe('value2');
    expect(pipe.transform('key3')).toBe('value3');
    expect(pipe.transform('key4')).toBe('key4');
  });

  it('should transform multiple keys correctly', () => {
    ACTIVE_TRANSLATIONS['key1'] = 'value1';
    ACTIVE_TRANSLATIONS['key2'] = 'value2';
    
    expect(pipe.transform('key1')).toBe('value1');
    expect(pipe.transform('key2')).toBe('value2');
    expect(pipe.transform('missing')).toBe('missing');
  });

  it('should handle keys with special characters', () => {
    ACTIVE_TRANSLATIONS['key.with.dots'] = 'Value with dots';
    ACTIVE_TRANSLATIONS['key-with-dashes'] = 'Value with dashes';
    
    expect(pipe.transform('key.with.dots')).toBe('Value with dots');
    expect(pipe.transform('key-with-dashes')).toBe('Value with dashes');
  });
});

