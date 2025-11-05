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
  quarter = signal<string>('');
  showMessage = signal(false);
  messageType = signal<'success' | 'error'>('success');
  messageText = signal('');
  reportData = signal<any | null>(null);

  vendedores = signal<{ value: string; labelKey: string }[]>([]);
  planes = signal<any[]>([]);
  loadingPlans = signal(false);

  quarters = [
    { value: 'Q1', labelKey: 'quarter_q1' },
    { value: 'Q2', labelKey: 'quarter_q2' },
    { value: 'Q3', labelKey: 'quarter_q3' },
    { value: 'Q4', labelKey: 'quarter_q4' },
  ];

  get isButtonDisabled() {
    return !this.vendedor() || !this.quarter();
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
    // Cargar planes cuando hay vendedor y período seleccionados
    if (this.vendedor() && this.quarter()) {
      this.loadPlans();
    }
  }

  loadPlans() {
    if (this.loadingPlans()) return; // Evitar cargas duplicadas
    
    console.log('🔄 GoalReports: Cargando planes disponibles...');
    this.loadingPlans.set(true);
    
    this.salesReportService.getSalesPlans().subscribe({
      next: (plans) => {
        console.log('✅ GoalReports: Planes cargados (formato select):', plans);
        // Por ahora, los planes vienen en formato { value: string, labelKey: string }
        // Necesitamos obtener los planes completos con información de quarter, region, etc.
        // Por ahora, guardamos lo que tenemos y usamos mapeo temporal
        this.planes.set(plans);
        this.loadingPlans.set(false);
      },
      error: (error) => {
        console.error('❌ GoalReports: Error cargando planes:', error);
        console.warn('⚠️ GoalReports: Continuando con mapeo temporal de plan_id');
        this.loadingPlans.set(false);
        // Si falla, continuar con plan_id por defecto usando mapeo temporal
      }
    });
  }

  // Obtener el plan_id basado en el quarter seleccionado
  getPlanIdForQuarter(q: string): number | null {
    console.log('🔍 GoalReports: Buscando plan_id para quarter:', q);

    const planIdMap: { [key: string]: number } = {
      Q1: 1,
      Q2: 2,
      Q3: 3,
      Q4: 4,
    };

    const planId = planIdMap[q];
    if (!planId) {
      console.error('❌ GoalReports: Quarter no reconocido:', q);
      return null;
    }
    console.log('📦 GoalReports: plan_id seleccionado para', q, ':', planId);
    return planId;
  }

  generarReporte() {
    console.log('🚀 GoalReports: ===== INICIANDO GENERACIÓN DE REPORTE =====');
    console.log('👤 GoalReports: Vendedor seleccionado:', this.vendedor());
    console.log('🗓️ GoalReports: Quarter seleccionado:', this.quarter());

    this.showMessage.set(false);
    this.reportData.set(null);

    const planId = this.getPlanIdForQuarter(this.quarter());
    if (planId === null) {
      console.error('❌ GoalReports: No se pudo determinar plan_id para quarter:', this.quarter());
      this.messageType.set('error');
      this.messageText.set('goalReportError');
      this.showMessage.set(true);
      return;
    }

    const request: SalesComplianceRequest = {
      vendor_id: parseInt(this.vendedor(), 10),
      plan_id: planId,
    };

    console.log('📦 GoalReports: Request que se enviará:', JSON.stringify(request, null, 2));
    console.log('🔍 GoalReports: vendor_id:', request.vendor_id);
    console.log('🔍 GoalReports: plan_id:', request.plan_id, '(calculado para quarter:', this.quarter(), ')');
    console.log('🚀 GoalReports: Enviando request a sales-compliance...');

    this.salesReportService.getSalesCompliance(request).subscribe({
      next: (response) => {
        console.log('✅ GoalReports: ===== REPORTE DE CUMPLIMIENTO RECIBIDO =====');
        console.log('📋 GoalReports: Response completa:', JSON.stringify(response, null, 2));
        console.log('📊 GoalReports: Periodo del reporte:', response.data?.period_start, '-', response.data?.period_end);
        console.log('📊 GoalReports: Status del reporte:', response.data?.status);
        console.log('📊 GoalReports: Cumplimiento total:', response.data?.cumplimiento_total_pct, '%');
        console.log('✅ GoalReports: ===== REPORTE PROCESADO EXITOSAMENTE =====');
        this.reportData.set(response.data);
        this.messageType.set('success');
        this.messageText.set('goalReportSuccess');
        this.showMessage.set(true);
      },
      error: (error) => {
        console.error('❌ GoalReports: ===== ERROR GENERANDO REPORTE =====');
        console.error('📊 GoalReports: Status HTTP:', error.status || 'Desconocido');
        console.error('📋 GoalReports: Mensaje de error:', error.message || 'Sin mensaje');
        console.error('🔍 GoalReports: Error completo:', error);
        console.error('📦 GoalReports: Request que falló:', JSON.stringify(request, null, 2));
        console.error('❌ GoalReports: ===== ERROR PROCESADO =====');
        if (error.status === 404) {
          this.messageType.set('error');
          this.messageText.set('goalReportNoData');
        } else {
          this.messageType.set('error');
          this.messageText.set('goalReportError');
        }
        this.showMessage.set(true);
        this.reportData.set(null);
      },
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

  // Obtener el status para Producto (basado en detalle_productos)
  getProductStatus(): string {
    const data = this.reportData();
    if (!data || !data.detalle_productos || data.detalle_productos.length === 0) {
      return 'rojo';
    }
    // Contar cuántos productos tienen cada status
    const statusCounts: { [key: string]: number } = {};
    data.detalle_productos.forEach((p: any) => {
      const status = p.status || 'rojo';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    // Retornar el status más común, priorizando verde > amarillo > rojo
    if (statusCounts['verde'] && statusCounts['verde'] > 0) return 'verde';
    if (statusCounts['amarillo'] && statusCounts['amarillo'] > 0) return 'amarillo';
    return 'rojo';
  }

  // Obtener el status para Región (usar el mismo que Producto o el status general)
  getRegionStatus(): string {
    const data = this.reportData();
    if (!data) return 'rojo';
    // Si hay un status específico para región, usarlo; si no, usar el de productos
    return this.getProductStatus();
  }

  // Obtener el status para Total (usar el status del data principal)
  getTotalStatus(): string {
    const data = this.reportData();
    if (!data) return 'rojo';
    return data.status || 'rojo';
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

