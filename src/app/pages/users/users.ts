import { Component } from '@angular/core';
import { PageHeader } from '../../shared/page-header/page-header';
import { ActionCard } from '../../shared/action-card/action-card';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, PageHeader, ActionCard],
  templateUrl: './users.html',
  styleUrls: ['./users.css']
})
export class Users {
  pageTitle = 'pageUsersTitle';

  cards = [
    {
      titleKey: 'cardUsersRegistrationTitle',
      subtitleKey: 'cardUsersRegistrationSubtitle',
      icon: 'users',
      ariaLabelKey: 'cardUsersRegistrationAria',
      path: '/usuarios/registro',
    },
    {
      titleKey: 'cardSellersRegistrationTitle',
      subtitleKey: 'cardSellersRegistrationSubtitle',
      icon: 'user',
      ariaLabelKey: 'cardSellersRegistrationAria',
      path: '/usuarios/vendedores',
    },
  ];
}


