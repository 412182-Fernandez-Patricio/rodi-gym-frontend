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
  template: `
    <div class="app-shell">
      <header class="app-header">
        <div class="header-brand">
          <span class="brand-icon" aria-hidden="true">
            <mat-icon>fitness_center</mat-icon>
          </span>
          <span class="brand-text">RODI GYM</span>
        </div>
        <span class="header-divider">|</span>
        <span class="header-page">{{ pageTitle() }}</span>
      </header>

      <main class="app-content">
        <router-outlet />
      </main>

      <nav class="bottom-nav" aria-label="Navegación principal">
        @for (item of navItems; track item.path) {
          <a
            class="bottom-nav-item"
            [routerLink]="item.path"
            routerLinkActive="active"
            [attr.aria-label]="item.label">
            <mat-icon>{{ item.icon }}</mat-icon>
            <span>{{ item.label }}</span>
          </a>
        }
      </nav>

      <a class="fab-pay" routerLink="/payments" aria-label="Registrar pago rápido">
        <mat-icon>attach_money</mat-icon>
      </a>
    </div>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }

    .app-shell {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #f8fafc;
      position: relative;
    }

    .app-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px 16px;
      background: #1a2332;
      color: #fff;
      flex-shrink: 0;
    }

    .header-brand {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .brand-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: #22c55e;
    }

    .brand-icon mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #fff;
    }

    .brand-text {
      font-weight: 700;
      font-size: 15px;
      letter-spacing: 0.02em;
    }

    .header-divider {
      color: rgba(255, 255, 255, 0.35);
      font-weight: 300;
    }

    .header-page {
      font-size: 15px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.9);
    }

    .app-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      padding-bottom: 88px;
    }

    .bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      align-items: stretch;
      justify-content: space-around;
      height: 64px;
      background: #fff;
      border-top: 1px solid #e2e8f0;
      z-index: 100;
      padding-bottom: env(safe-area-inset-bottom, 0);
    }

    .bottom-nav-item {
      display: flex;
      flex: 1;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      text-decoration: none;
      color: #94a3b8;
      font-size: 11px;
      font-weight: 500;
      transition: color 0.15s ease;
      -webkit-tap-highlight-color: transparent;
    }

    .bottom-nav-item mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .bottom-nav-item.active {
      color: #0f172a;
      font-weight: 700;
    }

    .bottom-nav-item.active mat-icon {
      font-variation-settings: 'FILL' 1;
    }

    .fab-pay {
      position: fixed;
      bottom: calc(64px + env(safe-area-inset-bottom, 0px) + 12px);
      right: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      border-radius: 16px;
      background: #22c55e;
      color: #fff;
      text-decoration: none;
      box-shadow: 0 4px 14px rgba(34, 197, 94, 0.45);
      z-index: 101;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .fab-pay mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      font-weight: 700;
    }

    .fab-pay:active {
      transform: scale(0.95);
    }
  `,
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
