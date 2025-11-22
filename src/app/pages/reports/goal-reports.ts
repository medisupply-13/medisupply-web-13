import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageHeader } from '../../shared/page-header/page-header';
import { CustomSelect } from '../../shared/custom-select/custom-select';
import { MatButtonModule } from '@angular/material/button';
import { StatusMessage } from '../../shared/status-message/status-message';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { SalesReportService, SalesComplianceRequest } from '../../services/sales-report.service';
import { OfferService } from '../../services/offer.service';
import { ACTIVE_TRANSLATIONS, currentLangSignal } from '../../shared/lang/lang-store';

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
    this.showMessage.set(false);
    this.reportData.set(null);

    if (!this.vendedor() || !this.quarter() || !this.region()) {
      this.messageType.set('error');
      this.messageText.set('goalReportError');
      this.showMessage.set(true);
      return;
    }

    const regionCapitalized = this.region().charAt(0).toUpperCase() + this.region().slice(1).toLowerCase();

    const request: SalesComplianceRequest = {
      vendor_id: parseInt(this.vendedor(), 10),
      region: regionCapitalized,
      quarter: this.quarter(),
      year: new Date().getFullYear(),
    };

    console.log('📦 GoalReports: Request:', JSON.stringify(request, null, 2));

    this.salesReportService.getSalesCompliance(request).subscribe({
      next: (response) => {
        console.log('✅ GoalReports: Reporte recibido:', response.data);
        this.reportData.set(response.data);
        this.messageType.set('success');
        this.messageText.set('goalReportSuccess');
        this.showMessage.set(true);
      },
      error: (error) => {
        console.error('❌ GoalReports: Error:', error);
        const errorMessage = error?.error?.message || error?.message || '';
        const errorType = error?.error?.error_type || '';
        const errorStatus = error?.status || 0;

        this.messageType.set('error');

        if (errorType === 'region_mismatch' || errorMessage.toLowerCase().includes('región')) {
          this.messageText.set('goalReportRegionError');
        } else if (errorType === 'not_found' || errorStatus === 404) {
          this.messageText.set('goalReportNoData');
        } else if (errorMessage.toLowerCase().includes('plan')) {
          this.messageText.set('goalReportNoData');
        } else {
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
    if (status === 'gris') return 'gray';
    return 'red';
  }

  getStatusLabel(status: string): string {
    if (status === 'verde') return ACTIVE_TRANSLATIONS['goalReportStatusCompleted'] || 'Cumplido';
    if (status === 'amarillo') return ACTIVE_TRANSLATIONS['goalReportStatusInProgress'] || 'En progreso';
    if (status === 'rojo') return ACTIVE_TRANSLATIONS['goalReportStatusNotCompleted'] || 'Sin cumplir';
    if (status === 'gris') return ACTIVE_TRANSLATIONS['goalReportStatusNoGoal'] || 'Sin meta';
    return '';
  }

  // --- NUEVA LÓGICA: Calcula el status del producto basado en el porcentaje visualizado ---
  getProductCalculatedStatus(product: any): string {
    // 1. Primero verificamos si tiene meta
    const goal = product.goal ?? 0;
    
    // Si la meta es 0 o nula, devolvemos estado neutro
    if (goal === 0) {
      return 'gris';
    }

    // 2. Si tiene meta, calculamos el porcentaje
    const pct = this.getProductCumplimientoPct(product);
    
    if (pct >= 100) return 'verde';
    if (pct >= 60) return 'amarillo';
    return 'rojo';
  }

  // Actualizado para usar el status calculado, no el del backend
  getProductStatus(): string {
    const data = this.reportData();
    if (!data || !data.detalle_productos || data.detalle_productos.length === 0) {
      return 'rojo';
    }
    const statusCounts: { [key: string]: number } = {};
    data.detalle_productos.forEach((p: any) => {
      // Usamos la nueva función de cálculo local
      const status = this.getProductCalculatedStatus(p);
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    if (statusCounts['verde'] && statusCounts['verde'] > 0) return 'verde';
    if (statusCounts['amarillo'] && statusCounts['amarillo'] > 0) return 'amarillo';
    return 'rojo';
  }

  getRegionStatus(): string {
    const pct = this.getCumplimientoRegionPct();
    if (pct >= 100) return 'verde';
    if (pct >= 60) return 'amarillo';
    return 'rojo';
  }

  getTotalStatus(): string {
    const pct = this.getCumplimientoTotalPct();
    if (pct >= 100) return 'verde';
    if (pct >= 60) return 'amarillo';
    return 'rojo';
  }

  formatNumber(value: number): string {
    const lang = currentLangSignal();
    const localeMap: Record<string, string> = {
      'es': 'es-CO',
      'en': 'en-US'
    };
    const locale = localeMap[lang] || 'es-CO';
    return new Intl.NumberFormat(locale).format(value);
  }

  getCumplimientoTotalPct(): number {
    const data = this.reportData();
    if (!data) return 0;

    const sales = data.ventasTotales || 0;
    const goal = data.total_goal || 0;

    if (goal === 0) return 0;
    return (sales / goal) * 100;
  }

  getCumplimientoRegionPct(): number {
    const data = this.reportData();
    if (!data) return 0;

    if (data.ventas_region && data.total_goal) {
      const metaRegion = data.total_goal || 0;
      if (metaRegion === 0) return 0;
      return (data.ventas_region / metaRegion) * 100;
    }

    return data.cumplimiento_region_pct || 0;
  }

  getProductCumplimientoPct(product: any): number {
    if (!product) return 0;

    const sales = product.ventas || 0;
    const goal = product.goal || 0;

    if (goal === 0) return 0;
    return (sales / goal) * 100;
  }

  getDetalleProductos(): any[] {
    const data = this.reportData();
    if (!data || !data.detalle_productos) return [];
    return data.detalle_productos;
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    try {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      const lang = currentLangSignal();
      const localeMap: Record<string, string> = {
        'es': 'es-CO',
        'en': 'en-US'
      };
      const locale = localeMap[lang] || 'es-CO';
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC'
      }).format(date);
    } catch {
      return dateString;
    }
  }

  getAggregatedMetrics() {
    const data = this.reportData();
    if (!data || !data.detalle_productos) {
      return {
        producto: { achieved: 0, goal: 0 },
        region: { achieved: 0, goal: 0 },
        total: { achieved: 0, goal: 0 }
      };
    }

    const productos = data.detalle_productos;
    const productosConMeta = productos.filter((p: any) => (p.goal ?? 0) > 0);
    const hayProductosConMeta = productosConMeta.length > 0;

    const productoAchieved = hayProductosConMeta
      ? productosConMeta.reduce((sum: number, p: any) => sum + (p.ventas || 0), 0)
      : (data.ventasTotales || 0);

    const productoGoal = hayProductosConMeta
      ? productosConMeta.reduce((sum: number, p: any) => sum + (p.goal ?? 0), 0)
      : (data.total_goal ?? 0);

    const regionAchieved = data.ventas_region || data.ventasTotales || 0;
    const regionGoal = (data.total_goal || 0);
    const totalGoal = (data.total_goal ?? 0);

    return {
      producto: { achieved: productoAchieved, goal: productoGoal },
      region: { achieved: regionAchieved, goal: regionGoal },
      total: { achieved: data.ventasTotales || 0, goal: totalGoal }
    };
  }

  getSummaryStats() {
    const data = this.reportData();
    if (!data || !data.detalle_productos) {
      return {
        totalProducts: 0, productsWithGoal: 0, productsWithoutGoal: 0,
        productsCompleted: 0, productsInProgress: 0, productsNotCompleted: 0,
        totalSales: 0, totalGoal: 0, difference: 0
      };
    }
    const productos = data.detalle_productos;
    const productsWithGoal = productos.filter((p: any) => (p.goal ?? 0) > 0);
    const productsWithoutGoal = productos.filter((p: any) => (p.goal ?? 0) === 0);

    // Actualizado para usar el status calculado localmente
    const productsCompleted = productos.filter((p: any) => this.getProductCalculatedStatus(p) === 'verde');
    const productsInProgress = productos.filter((p: any) => this.getProductCalculatedStatus(p) === 'amarillo');
    const productsNotCompleted = productos.filter((p: any) => this.getProductCalculatedStatus(p) === 'rojo');

    const totalGoal = (data.total_goal ?? 0);

    return {
      totalProducts: productos.length,
      productsWithGoal: productsWithGoal.length,
      productsWithoutGoal: productsWithoutGoal.length,
      productsCompleted: productsCompleted.length,
      productsInProgress: productsInProgress.length,
      productsNotCompleted: productsNotCompleted.length,
      totalSales: data.ventasTotales || 0,
      totalGoal: totalGoal,
      difference: (data.ventasTotales || 0) - totalGoal
    };
  }

  getProductsWithGoalStatus(): string {
    const data = this.reportData();
    if (!data || !data.detalle_productos) return 'rojo';
    const productos = data.detalle_productos;
    const productsWithGoal = productos.filter((p: any) => (p.goal ?? 0) > 0);
    if (productsWithGoal.length === 0) return 'rojo';
    const statusCounts: { [key: string]: number } = {};
    productsWithGoal.forEach((p: any) => {
      // Actualizado para usar status calculado localmente
      const status = this.getProductCalculatedStatus(p);
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    if (statusCounts['verde'] && statusCounts['verde'] > 0) return 'verde';
    if (statusCounts['amarillo'] && statusCounts['amarillo'] > 0) return 'amarillo';
    return 'rojo';
  }

  getDetalleProductosSorted(): any[] {
    const productos = this.getDetalleProductos();
    return [...productos].sort((a, b) => (a.product_id || 0) - (b.product_id || 0));
  }
}
