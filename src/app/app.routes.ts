import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./modules/dashboard/pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'check-in',
        loadComponent: () => import('./modules/check-in/pages/check-in/check-in.component').then(m => m.CheckInComponent),
      },
      {
        path: 'members',
        loadComponent: () => import('./modules/members/pages/member-list/member-list.component').then(m => m.MemberListComponent),
      },
      {
        path: 'members/:id',
        loadComponent: () => import('./modules/members/pages/member-detail/member-detail.component').then(m => m.MemberDetailComponent),
      },
      {
        path: 'payments',
        loadComponent: () => import('./modules/payments/pages/payments/payments.component').then(m => m.PaymentsComponent),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];
