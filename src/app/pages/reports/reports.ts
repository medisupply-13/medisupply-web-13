import { Component } from '@angular/core';
import { PageHeader } from '../../shared/page-header/page-header';
import { ActionCard } from '../../shared/action-card/action-card';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, PageHeader, ActionCard],
  templateUrl: './reports.html',
  styleUrls: ['./reports.css'],
})
export class Reports {
  pageTitle = 'pageReportsTitle';

  cards = [
    {
      titleKey: 'generateSalesReport',
      subtitleKey: 'generateSalesReportSubtitle',
      icon: 'dollar',
      ariaLabelKey: 'generateSalesReportAria',
      path: '/reportes/generar-venta',
    },
    {
      titleKey: 'viewGoalReports',
      subtitleKey: 'viewGoalReportsSubtitle',
      icon: 'chart',
      ariaLabelKey: 'viewGoalReportsAria',
      path: '/reportes/metas',
    },
  ];
}
