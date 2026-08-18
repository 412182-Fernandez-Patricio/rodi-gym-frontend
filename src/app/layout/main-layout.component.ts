import { Component, computed, inject, signal } from '@angular/core';
import {
  NavigationEnd,
  NavigationStart,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PageHeaderService } from '../shared/services/page-header.service';

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
  host: { class: 'block h-full' },
})
export class MainLayoutComponent {
  private readonly router = inject(Router);
  private readonly pageHeader = inject(PageHeaderService);

  readonly navItems: NavItem[] = [
    { path: '/dashboard', label: 'Inicio', icon: 'home' },
    { path: '/members', label: 'Socios', icon: 'group' },
    { path: '/check-in', label: 'Ingresos', icon: 'qr_code_scanner' },
    { path: '/payments', label: 'Pagos', icon: 'account_balance_wallet' },
  ];

  private readonly routeTitle = signal('Inicio');

  /** Lo que fije la página gana sobre el título derivado de la ruta. */
  readonly pageTitle = computed(() => this.pageHeader.title() ?? this.routeTitle());
  readonly backLink = this.pageHeader.backLink;

  constructor() {
    this.updateRouteTitle(this.router.url);

    // Se limpia al arrancar la navegación, antes de que la página entrante
    // se construya y fije lo suyo.
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.pageHeader.clear());

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        this.updateRouteTitle((event as NavigationEnd).urlAfterRedirects);
      });
  }

  private updateRouteTitle(url: string): void {
    const path = url.split('?')[0];
    this.routeTitle.set(PAGE_TITLES[path] ?? 'RODI GYM');
  }
}
