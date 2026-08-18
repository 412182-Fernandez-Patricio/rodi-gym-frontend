import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Inicio',
  '/members': 'Socios',
  '/check-in': 'Ingresos',
  '/payments': 'Pagos',
};

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css',
})
export class MainLayoutComponent {
  private router = inject(Router);

  readonly navItems: NavItem[] = [
    { path: '/dashboard', label: 'Inicio', icon: 'home' },
    { path: '/members', label: 'Socios', icon: 'group' },
    { path: '/check-in', label: 'Ingresos', icon: 'qr_code_scanner' },
    { path: '/payments', label: 'Pagos', icon: 'account_balance_wallet' },
  ];

  readonly pageTitle = signal('Inicio');

  constructor() {
    this.updatePageTitle(this.router.url);

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        this.updatePageTitle((event as NavigationEnd).urlAfterRedirects);
      });
  }

  private updatePageTitle(url: string): void {
    const path = url.split('?')[0];
    this.pageTitle.set(PAGE_TITLES[path] ?? 'RODI GYM');
  }
}
