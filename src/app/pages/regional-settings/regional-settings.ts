import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  ApplicationRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { MatDividerModule } from '@angular/material/divider';
import { MatInputModule } from '@angular/material/input';
import { PageHeader } from '../../shared/page-header/page-header';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { currentLangSignal, loadTranslations } from '../../shared/lang/lang-store';
import { CustomSelect } from '../../shared/custom-select/custom-select';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    PageHeader,
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatInputModule,
    TranslatePipe,
    CustomSelect,
  ],
  templateUrl: './regional-settings.html',
  styleUrls: ['./regional-settings.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegionalSettings {
  private readonly appRef = inject(ApplicationRef);
  public readonly currentLangSignal = currentLangSignal;
  pageTitle = 'pageRegionTitle';
  appVersion = environment.version;

  languageOptions = [
    { value: 'es-CO', labelKey: 'language_es_co' },
    { value: 'en-US', labelKey: 'language_en_us' },
  ];

  countryOptions = [
    { value: 'CO', labelKey: 'country_co' },
    { value: 'PE', labelKey: 'country_pe' },
    { value: 'EC', labelKey: 'country_ec' },
    { value: 'MX', labelKey: 'country_mx' },
  ];

  selectedLanguage = signal<string>(localStorage.getItem('userLang') || 'es-CO');
  selectedCountry = signal<string>(localStorage.getItem('userCountry') || 'CO');

  initialLanguage = localStorage.getItem('userLang') || 'es-CO';
  initialCountry = localStorage.getItem('userCountry') || 'CO';

  saveStatus = signal<'idle' | 'saving' | 'success'>('idle');

  isSaveDisabled = computed(() => {
    const langChanged = this.selectedLanguage() !== this.initialLanguage;
    const countryChanged = this.selectedCountry() !== this.initialCountry;
    return this.saveStatus() === 'saving' || (!langChanged && !countryChanged);
  });

  saveSettings() {
    const newLang = this.selectedLanguage();
    const newCountry = this.selectedCountry();

    localStorage.setItem('userLang', newLang);
    localStorage.setItem('userCountry', newCountry);

    const newLangPrefix = newLang.split('-')[0];

    if (newLangPrefix === 'es' || newLangPrefix === 'en') {
      loadTranslations(newLangPrefix as 'es' | 'en');
      this.appRef.tick();
    }

    this.initialLanguage = newLang;
    this.initialCountry = newCountry;
  }
}
