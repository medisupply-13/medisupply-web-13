import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageHeader } from '../../shared/page-header/page-header';
import { CustomSelect } from '../../shared/custom-select/custom-select';
import { MatButtonModule } from '@angular/material/button';
import { StatusMessage } from '../../shared/status-message/status-message';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { SalesReportService, SalesComplianceRequest } from '../../services/sales-report.service';
import { OfferService } from '../../services/offer.service';

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
  region = signal<string>('');
  showMessage = signal(false);
  messageType = signal<'success' | 'error'>('success');
  messageText = signal('');
  reportData = signal<any | null>(null);

  vendedores = signal<{ value: string; labelKey: string }[]>([]);
  regionOptions: { value: string; label?: string; labelKey: string }[] = [];

  quarters = [
    { value: 'Q1', labelKey: 'quarter_q1' },
    { value: 'Q2', labelKey: 'quarter_q2' },
    { value: 'Q3', labelKey: 'quarter_q3' },
    { value: 'Q4', labelKey: 'quarter_q4' },
  ];

  get isButtonDisabled() {
    return !this.vendedor() || !this.quarter() || !this.region();
  }

  constructor(
    private salesReportService: SalesReportService,
    private offerService: OfferService
  ) {
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

    // Cargar regiones desde OfferService
    this.loadRegions();
  }

  private loadRegions() {
    this.offerService.getRegions().subscribe({
      next: (regions) => {
        const safe = Array.isArray(regions) ? regions : [];
        this.regionOptions = safe.map(r => ({
          value: String(r.value),
          label: String(r.label || r.value),
          labelKey: `region_${String(r.value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`
        }));
        console.log('✅ GoalReports: Regiones cargadas:', this.regionOptions);
      },
      error: () => {
        // Fallback local
        this.regionOptions = [
          { value: 'norte', labelKey: 'region_norte' },
          { value: 'centro', labelKey: 'region_centro' },
          { value: 'sur', labelKey: 'region_sur' },
          { value: 'caribe', labelKey: 'region_caribe' },
          { value: 'pacifico', labelKey: 'region_pacifico' },
        ];
        console.log('⚠️ GoalReports: Usando regiones de fallback');
      }
    });
  }

  onSelectionChange() {
    this.showMessage.set(false);
    this.reportData.set(null);
  }

  generarReporte() {
    console.log('🚀 GoalReports: ===== INICIANDO GENERACIÓN DE REPORTE =====');
    console.log('👤 GoalReports: Vendedor seleccionado:', this.vendedor());
    console.log('🗓️ GoalReports: Quarter seleccionado:', this.quarter());
    console.log('🌍 GoalReports: Región seleccionada:', this.region());

    this.showMessage.set(false);
    this.reportData.set(null);

    if (!this.vendedor() || !this.quarter() || !this.region()) {
      console.error('❌ GoalReports: Faltan campos requeridos');
      this.messageType.set('error');
      this.messageText.set('goalReportError');
      this.showMessage.set(true);
      return;
    }

    // Capitalizar la primera letra de la región (ej: "pacifico" -> "Pacifico")
    const regionCapitalized = this.region().charAt(0).toUpperCase() + this.region().slice(1).toLowerCase();

    const request: SalesComplianceRequest = {
      vendor_id: parseInt(this.vendedor(), 10),
      region: regionCapitalized,
      quarter: this.quarter(),
      year: new Date().getFullYear(),
    };

    console.log('📦 GoalReports: Request que se enviará:', JSON.stringify(request, null, 2));
    console.log('🔍 GoalReports: vendor_id:', request.vendor_id);
    console.log('🔍 GoalReports: region:', request.region);
    console.log('🔍 GoalReports: quarter:', request.quarter);
    console.log('🔍 GoalReports: year:', request.year);
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

  getStatusLabel(status: string): string {
    if (status === 'verde') return 'Cumplido';
    if (status === 'amarillo') return 'En progreso';
    return 'Sin cumplir';
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

  // Obtener el status para Región basado en el porcentaje de cumplimiento
  getRegionStatus(): string {
    const data = this.reportData();
    if (!data) return 'rojo';
    // Usar el mismo status que Total ya que ambos tienen la misma meta (total_goal)
    return this.getTotalStatus();
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

  // Obtener el porcentaje de cumplimiento total corregido
  // Según el JSON del backend, viene como ratio (ej: 3.045 = 304.5%)
  // Si el valor es >= 100, ya es un porcentaje, si no, es un ratio que hay que multiplicar por 100
  getCumplimientoTotalPct(): number {
    const data = this.reportData();
    if (!data || data.cumplimiento_total_pct === undefined || data.cumplimiento_total_pct === null) {
      return 0;
    }
    const pct = data.cumplimiento_total_pct;
    
    // Si el valor es 0, retornar 0
    if (pct === 0) {
      return 0;
    }
    
    // Si el valor es >= 100, probablemente ya es un porcentaje
    // Si el valor está entre 0 y 100, es un ratio -> multiplicar por 100
    if (pct >= 100) {
      return pct;
    }
    
    // Para valores entre 0 y 100, multiplicar por 100 para convertir ratio a porcentaje
    return pct * 100;
  }

  // Obtener el porcentaje de cumplimiento de un producto
  // Según el JSON del backend, los valores vienen como ratios (ej: 25.0 = 2500%)
  // Si el valor es >= 100, ya es un porcentaje, si no, es un ratio que hay que multiplicar por 100
  getProductCumplimientoPct(product: any): number {
    if (!product || product.cumplimiento_pct === undefined || product.cumplimiento_pct === null) {
      return 0;
    }
    const pct = product.cumplimiento_pct;
    
    // Si el valor es 0, retornar 0
    if (pct === 0) {
      return 0;
    }
    
    // Si el valor es >= 100, probablemente ya es un porcentaje (ej: 2500%)
    // Si el valor está entre 1 y 100, es un ratio (ej: 25.0) -> multiplicar por 100
    // Si el valor es menor a 1, es un decimal (ej: 0.25) -> multiplicar por 100
    if (pct >= 100) {
      return pct;
    }
    
    // Para valores entre 0 y 100, multiplicar por 100 para convertir ratio a porcentaje
    return pct * 100;
  }

  // Obtener los productos del detalle
  getDetalleProductos(): any[] {
    const data = this.reportData();
    if (!data || !data.detalle_productos || !Array.isArray(data.detalle_productos)) {
      return [];
    }
    return data.detalle_productos;
  }

  // Formatear fecha
  formatDate(dateString: string): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date);
    } catch {
      return dateString;
    }
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

    // Sumar ventas y metas individuales de productos
    const productoAchieved = data.detalle_productos.reduce((sum: number, p: any) => sum + (p.ventas || 0), 0);
    const productoGoal = data.detalle_productos.reduce((sum: number, p: any) => sum + (p.goal || 0), 0);
    
    // Para región, usar ventas totales y la meta total (que es la meta de la región)
    const regionAchieved = data.ventasTotales || 0;
    const regionGoal = data.total_goal || 0;

    return {
      producto: { achieved: productoAchieved, goal: productoGoal },
      region: { achieved: regionAchieved, goal: regionGoal },
      total: { achieved: data.ventasTotales || 0, goal: data.total_goal || 0 }
    };
  }

  // Obtener resumen estadístico
  getSummaryStats() {
    const data = this.reportData();
    if (!data || !data.detalle_productos) {
      return {
        totalProducts: 0,
        productsWithGoal: 0,
        productsWithoutGoal: 0,
        productsCompleted: 0,
        productsInProgress: 0,
        productsNotCompleted: 0,
        totalSales: 0,
        totalGoal: 0,
        difference: 0
      };
    }

    const productos = data.detalle_productos;
    const productsWithGoal = productos.filter((p: any) => p.goal && p.goal > 0);
    const productsWithoutGoal = productos.filter((p: any) => !p.goal || p.goal === 0);
    const productsCompleted = productos.filter((p: any) => p.status === 'verde');
    const productsInProgress = productos.filter((p: any) => p.status === 'amarillo');
    const productsNotCompleted = productos.filter((p: any) => p.status === 'rojo');

    return {
      totalProducts: productos.length,
      productsWithGoal: productsWithGoal.length,
      productsWithoutGoal: productsWithoutGoal.length,
      productsCompleted: productsCompleted.length,
      productsInProgress: productsInProgress.length,
      productsNotCompleted: productsNotCompleted.length,
      totalSales: data.ventasTotales || 0,
      totalGoal: data.total_goal || 0,
      difference: (data.ventasTotales || 0) - (data.total_goal || 0)
    };
  }

  // Ordenar productos (por defecto por product_id, pero se puede cambiar)
  getDetalleProductosSorted(): any[] {
    const productos = this.getDetalleProductos();
    // Ordenar por product_id ascendente
    return [...productos].sort((a, b) => (a.product_id || 0) - (b.product_id || 0));
  }
}

