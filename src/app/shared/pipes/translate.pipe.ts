import { Pipe, PipeTransform } from '@angular/core';
import { ACTIVE_TRANSLATIONS, currentLangSignal } from '../lang/lang-store';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  transform(key: string): string {
    currentLangSignal();
    const translation = ACTIVE_TRANSLATIONS[key];
    if (!translation && key === 'goalReportButton') {
      console.warn('⚠️ TranslatePipe: goalReportButton no encontrado en ACTIVE_TRANSLATIONS');
      console.warn('⚠️ TranslatePipe: Keys disponibles:', Object.keys(ACTIVE_TRANSLATIONS).filter(k => k.includes('goal') || k.includes('report')).slice(0, 10));
    }
    return translation || key;
  }
}
