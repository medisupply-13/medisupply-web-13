import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageHeader } from '../../shared/page-header/page-header';
import { CustomSelect } from '../../shared/custom-select/custom-select';
import { MatButtonModule } from '@angular/material/button';
import { StatusMessage } from '../../shared/status-message/status-message';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { SalesReportService } from '../../services/sales-report.service';

@Component({
  selector: 'app-goal-reports',
  standalone: true,
  imports: [CommonModule, PageHeader, CustomSelect, MatButtonModule, TranslatePipe, StatusMessage],
  templateUrl: './goal-reports.html',
  styleUrls: ['./goal-reports.css'],
})
export class GoalReports implements OnInit {
  pageTitle = 'viewGoalReports';
  vendedor = signal<string>('');
  periodo = signal<string>('');
  showMessage = signal(false);
  messageType = signal<'success' | 'error'>('success');
  messageText = signal('');

  vendedores = signal<{ value: string; labelKey: string }[]>([]);

  periodos = [
    { value: 'bimestral', labelKey: 'salesReportPeriodBimestral' },
    { value: 'trimestral', labelKey: 'salesReportPeriodTrimestral' },
    { value: 'semestral', labelKey: 'salesReportPeriodSemestral' },
    { value: 'anual', labelKey: 'salesReportPeriodAnual' },
  ];

  get isButtonDisabled() {
    return !this.vendedor() || !this.periodo();
  }

  constructor(private salesReportService: SalesReportService) {
    console.log('🏗️ GoalReports: Componente instanciado');
  }

  ngOnInit(): void {
    console.log('🔄 GoalReports: Cargando vendors desde backend...');
    this.salesReportService.getVendors().subscribe({
      next: (vendors) => {
        console.log('✅ GoalReports: Vendors cargados:', vendors);
        this.vendedores.set(vendors);
      },
      error: (error) => {
        console.error('❌ GoalReports: Error cargando vendors:', error);
        this.messageType.set('error');
        this.messageText.set('salesReportVendorsError');
        this.showMessage.set(true);
      }
    });
  }

  onSelectionChange() {
    this.showMessage.set(false);
  }

  generarReporte() {
    console.log('🚀 GoalReports: Generando reporte de metas...');
    console.log('👤 GoalReports: Vendedor:', this.vendedor());
    console.log('📅 GoalReports: Período:', this.periodo());
    
    // Por ahora solo muestra un mensaje
    this.messageType.set('success');
    this.messageText.set('goalReportSuccess');
    this.showMessage.set(true);
  }
}

