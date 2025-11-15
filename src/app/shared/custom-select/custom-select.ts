import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../pipes/translate.pipe';
import { MatIconModule } from '@angular/material/icon';

interface SelectOption {
  value: string;
  labelKey: string;
}

@Component({
  selector: 'app-custom-select',
  standalone: true,
  imports: [CommonModule, TranslatePipe, MatIconModule],
  templateUrl: './custom-select.html',
  styleUrls: ['./custom-select.css'],
})
export class CustomSelect {
  @Input() labelKey!: string;
  @Input() options: SelectOption[] = [];
  @Input() model = signal<string>('');
  @Input() name = '';
  @Input() required!: boolean;
  @Input() placeholderKey = 'selectPlaceholder';
  @Input() maxOptionsHeight = 200;
  @Input() selectId = 'custom-select-' + Math.random().toString(36).substring(2, 8);
  @Output() modelChange = new EventEmitter<string>();

  isOpen = signal(false);
  touched = signal(false);

  get hasError() {
    return this.required && this.touched() && !this.model();
  }

  toggle() {
    this.isOpen.update((open) => !open);
    if (!this.isOpen()) this.touched.set(true);
  }

  select(value: string) {
    this.model.set(value);
    this.modelChange.emit(value);
    this.isOpen.set(false);
    this.touched.set(true);
  }

  get selectedLabelKey(): string {
    const selected = this.options.find((opt) => opt.value === this.model());
    return selected?.labelKey ?? this.placeholderKey;
  }
}
