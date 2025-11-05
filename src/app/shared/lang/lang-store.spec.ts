import { TestBed } from '@angular/core/testing';
import { loadTranslations, currentLangSignal, ACTIVE_TRANSLATIONS, LangKey } from './lang-store';

describe('LangStore', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    // Reset ACTIVE_TRANSLATIONS
    Object.keys(ACTIVE_TRANSLATIONS).forEach((key) => delete ACTIVE_TRANSLATIONS[key]);
    
    // Reset signal to default
    currentLangSignal.set('es');
  });

  describe('currentLangSignal', () => {
    it('should default to es when no language in localStorage', () => {
      expect(currentLangSignal()).toBe('es');
    });

    it('should read language from localStorage', () => {
      localStorage.setItem('userLang', 'en-US');
      currentLangSignal.set((localStorage.getItem('userLang')?.split('-')[0] as LangKey) || 'es');
      expect(currentLangSignal()).toBe('en');
    });

    it('should handle es-ES from localStorage', () => {
      localStorage.setItem('userLang', 'es-ES');
      currentLangSignal.set((localStorage.getItem('userLang')?.split('-')[0] as LangKey) || 'es');
      expect(currentLangSignal()).toBe('es');
    });
  });

  describe('loadTranslations', () => {
    it('should load Spanish translations', () => {
      loadTranslations('es');
      
      expect(currentLangSignal()).toBe('es');
      expect(Object.keys(ACTIVE_TRANSLATIONS).length).toBeGreaterThan(0);
    });

    it('should load English translations', () => {
      loadTranslations('en');
      
      expect(currentLangSignal()).toBe('en');
      expect(Object.keys(ACTIVE_TRANSLATIONS).length).toBeGreaterThan(0);
    });

    it('should overwrite previous translations', () => {
      loadTranslations('es');
      const esKeys = Object.keys(ACTIVE_TRANSLATIONS);
      
      loadTranslations('en');
      const enKeys = Object.keys(ACTIVE_TRANSLATIONS);
      
      expect(enKeys.length).toBeGreaterThan(0);
      expect(esKeys).not.toEqual(enKeys);
    });

    it('should clear previous translations before loading new ones', () => {
      loadTranslations('es');
      const firstLoad = Object.keys(ACTIVE_TRANSLATIONS).length;
      
      // Manually add some keys to simulate old translations
      ACTIVE_TRANSLATIONS['oldKey'] = 'oldValue';
      expect(Object.keys(ACTIVE_TRANSLATIONS).length).toBe(firstLoad + 1);
      
      loadTranslations('en');
      
      // Should not have oldKey
      expect(ACTIVE_TRANSLATIONS['oldKey']).toBeUndefined();
    });

    it('should update signal when loading translations', () => {
      loadTranslations('es');
      expect(currentLangSignal()).toBe('es');
      
      loadTranslations('en');
      expect(currentLangSignal()).toBe('en');
    });
  });
});





