import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageHeader } from '../../shared/page-header/page-header';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-goal-reports',
  standalone: true,
  imports: [CommonModule, PageHeader, TranslatePipe],
  templateUrl: './goal-reports.html',
  styleUrls: ['./goal-reports.css'],
})
export class GoalReports {
  pageTitle = 'viewGoalReports';
}

