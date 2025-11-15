import { signal } from '@angular/core';
import ES_TRANSLATIONS from '../../pages/regional-settings/es.json';
import EN_TRANSLATIONS from '../../pages/regional-settings/en.json';
import ROUTES_ES from '../../pages/routes/routes-generate/i18n.es.json';
import ROUTES_EN from '../../pages/routes/routes-generate/i18n.en.json';
import REPORTS_ES from '../../pages/reports/i18n/i18n.es.json';
import REPORTS_EN from '../../pages/reports/i18n/i18n.en.json';

export const ACTIVE_TRANSLATIONS: Record<string, string> = {};

export type LangKey = 'es' | 'en';

export const currentLangSignal = signal<LangKey>(
  (localStorage.getItem('userLang')?.split('-')[0] as LangKey) || 'es',
);

function extractStringTranslations(obj: any): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key) && typeof obj[key] === 'string') {
      result[key] = obj[key];
    }
  }
  return result;
}

export function loadTranslations(lang: LangKey) {
  let newTranslations: Record<string, string> = {};

  if (lang === 'es') {
    const esTranslations = extractStringTranslations(ES_TRANSLATIONS);
    const routesEs = extractStringTranslations(ROUTES_ES);
    const reportsEs = extractStringTranslations(REPORTS_ES);
    newTranslations = { ...esTranslations, ...routesEs, ...reportsEs };
    console.log('🌐 LangStore: Cargando traducciones ES. Keys de REPORTS_ES:', Object.keys(reportsEs || {}));
    console.log('🌐 LangStore: goalReportButton en REPORTS_ES:', reportsEs['goalReportButton']);
  } else if (lang === 'en') {
    const enTranslations = extractStringTranslations(EN_TRANSLATIONS);
    const routesEn = extractStringTranslations(ROUTES_EN);
    const reportsEn = extractStringTranslations(REPORTS_EN);
    newTranslations = { ...enTranslations, ...routesEn, ...reportsEn };
    console.log('🌐 LangStore: Cargando traducciones EN. Keys de REPORTS_EN:', Object.keys(reportsEn || {}));
  }

  console.log('🌐 LangStore: goalReportButton en newTranslations:', newTranslations['goalReportButton']);
  Object.keys(ACTIVE_TRANSLATIONS).forEach((key) => delete ACTIVE_TRANSLATIONS[key]);
  Object.assign(ACTIVE_TRANSLATIONS, newTranslations);
  console.log('🌐 LangStore: goalReportButton en ACTIVE_TRANSLATIONS:', ACTIVE_TRANSLATIONS['goalReportButton']);
  currentLangSignal.set(lang);
}

loadTranslations(currentLangSignal());
