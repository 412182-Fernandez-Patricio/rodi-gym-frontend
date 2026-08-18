import { Injectable, signal } from '@angular/core';

interface PageHeaderConfig {
  title: string;
  backLink?: string;
}

/**
 * Deja que una página tome el control del header del layout, para el título
 * dinámico y la flecha de volver. El layout lo limpia en cada navegación.
 */
@Injectable({ providedIn: 'root' })
export class PageHeaderService {
  readonly title = signal<string | null>(null);
  readonly backLink = signal<string | null>(null);

  set(config: PageHeaderConfig): void {
    this.title.set(config.title);
    this.backLink.set(config.backLink ?? null);
  }

  clear(): void {
    this.title.set(null);
    this.backLink.set(null);
  }
}
