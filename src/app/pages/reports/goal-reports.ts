import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageHeader } from '../../shared/page-header/page-header';
import { CustomSelect } from '../../shared/custom-select/custom-select';
import { MatButtonModule } from '@angular/material/button';
import { StatusMessage } from '../../shared/status-message/status-message';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { SalesReportService, SalesComplianceRequest } from '../../services/sales-report.service';

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
  reportData = signal<any | null>(null);

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
    this.reportData.set(null);
  }

  generarReporte() {
    console.log('🚀 GoalReports: Generando reporte de cumplimiento...');
    console.log('👤 GoalReports: Vendedor:', this.vendedor());
    console.log('📅 GoalReports: Período:', this.periodo());

    // Limpiar mensaje anterior y datos
    this.showMessage.set(false);
    this.reportData.set(null);

    // Por ahora usar plan_id fijo (2) como en el curl de ejemplo
    // TODO: Implementar lógica para obtener plan_id basado en período
    const request: SalesComplianceRequest = {
      vendor_id: parseInt(this.vendedor(), 10),
      plan_id: 2 // Temporal - debe obtenerse según el período seleccionado
    };

    this.salesReportService.getSalesCompliance(request).subscribe({
      next: (response) => {
        console.log('✅ GoalReports: Reporte de cumplimiento recibido:', response);
        this.reportData.set(response.data);
        this.messageType.set('success');
        this.messageText.set('goalReportSuccess');
        this.showMessage.set(true);
      },
      error: (error) => {
        console.error('❌ GoalReports: Error generando reporte:', error);
        if (error.status === 404) {
          this.messageType.set('error');
          this.messageText.set('goalReportNoData');
        } else {
          this.messageType.set('error');
          this.messageText.set('goalReportError');
        }
        this.showMessage.set(true);
        this.reportData.set(null);
      }
    });
  }

  getProgressPercentage(achieved: number, goal: number): number {
    if (!goal || goal === 0) return 0;
    return Math.min((achieved / goal) * 100, 100);
  }

  getProgressColor(achieved: number, goal: number): string {
    const percentage = this.getProgressPercentage(achieved, goal);
    if (percentage >= 100) return 'green';
    if (percentage >= 50) return 'yellow';
    return 'red';
  }

  getStatusColor(status: string): string {
    if (status === 'verde') return 'green';
    if (status === 'amarillo') return 'yellow';
    return 'red';
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('es-CO').format(value);
  }

  // Calcular métricas agregadas desde detalle_productos
  getAggregatedMetrics() {
    const data = this.reportData();
    if (!data || !data.detalle_productos) {
      return {
        producto: { achieved: 0, goal: 0 },
        region: { achieved: 0, goal: 0 },
        total: { achieved: 0, goal: 0 }
      };
    }

    // Sumar ventas totales de productos
    const productoAchieved = data.detalle_productos.reduce((sum: number, p: any) => sum + (p.ventas || 0), 0);
    const productoGoal = data.detalle_productos.reduce((sum: number, p: any) => sum + (p.goal || 0), 0);

    // Para región, usar el mismo valor que producto (o puedes ajustar según lógica)
    const regionAchieved = productoAchieved;
    const regionGoal = productoGoal;

    return {
      producto: { achieved: productoAchieved, goal: productoGoal },
      region: { achieved: regionAchieved, goal: regionGoal },
      total: { achieved: data.ventasTotales || 0, goal: data.total_goal || 0 }
    };
  }
}

