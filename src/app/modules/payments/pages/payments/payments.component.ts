import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  Subject,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { FabButtonComponent } from '../../../../shared/components/fab-button/fab-button.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { PaymentListComponent } from '../../components/payment-list/payment-list.component';
import { PAYMENT_METHOD_LABELS, Payment, PaymentMethod } from '../../models/payment.model';
import { PaymentService } from '../../services/payment.service';

interface MethodFilter {
  label: string;
  method: PaymentMethod | null;
}

const PAGE_SIZE = 20;

/** Lo que se espera a que deje de tipear antes de consultar. */
const TYPING_PAUSE_MS = 300;

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [PaymentListComponent, FabButtonComponent, IconComponent],
  templateUrl: './payments.component.html',
})
export class PaymentsComponent {
  private readonly paymentService = inject(PaymentService);

  readonly filters: MethodFilter[] = [
    { label: 'Todos', method: null },
    ...(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((method) => ({
      label: PAYMENT_METHOD_LABELS[method],
      method,
    })),
  ];

  readonly searchTerm = signal('');
  readonly method = signal<PaymentMethod | null>(null);

  readonly payments = signal<Payment[]>([]);
  readonly total = signal(0);
  readonly isLastPage = signal(true);
  readonly loading = signal(false);
  readonly loadFailed = signal(false);

  private page = 0;
  private readonly nextPage = new Subject<void>();

  constructor() {
    const criteria = combineLatest([
      toObservable(this.searchTerm).pipe(
        debounceTime(TYPING_PAUSE_MS),
        // Recortado: un espacio de más al final no es un criterio nuevo.
        map((term) => term.trim()),
        distinctUntilChanged(),
      ),
      toObservable(this.method).pipe(distinctUntilChanged()),
    ]);

    /*
     * Igual que en Socios: un cambio de criterio vuelve a la primera página y
     * reemplaza; "cargar más" pide la siguiente y acumula. El switchMap cancela
     * la consulta anterior, así una respuesta vieja no pisa la nueva.
     */
    criteria
      .pipe(
        tap(() => (this.page = 0)),
        switchMap(() => this.fetch(true)),
        takeUntilDestroyed(),
      )
      .subscribe();

    this.nextPage
      .pipe(
        tap(() => (this.page += 1)),
        switchMap(() => this.fetch(false)),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  onSearch(value: string): void {
    this.searchTerm.set(value);
  }

  selectMethod(method: PaymentMethod | null): void {
    this.method.set(method);
  }

  loadMore(): void {
    this.nextPage.next();
  }

  chipClass(method: PaymentMethod | null): string {
    const base =
      'shrink-0 cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-semibold ' +
      '[-webkit-tap-highlight-color:transparent]';

    return this.method() === method
      ? `${base} border-ink bg-ink text-on-dark`
      : `${base} border-line bg-surface text-muted`;
  }

  private fetch(replace: boolean) {
    this.loading.set(true);

    return this.paymentService
      .searchPayments({
        search: this.searchTerm(),
        paymentMethod: this.method() ?? undefined,
        page: this.page,
        size: PAGE_SIZE,
      })
      .pipe(
        tap((page) => {
          this.payments.update((current) =>
            replace ? page.content : [...current, ...page.content],
          );
          this.total.set(page.totalElements);
          this.isLastPage.set(page.last);
          this.loadFailed.set(false);
          this.loading.set(false);
        }),
        // Adentro del switchMap: afuera, un error mataría el stream (R10).
        catchError(() => {
          // Si falla al pedir más, se deshace el avance para que reintentar no
          // saltee una página.
          if (!replace) {
            this.page -= 1;
          }
          this.loadFailed.set(true);
          this.loading.set(false);
          return of(null);
        }),
        startWith(null),
      );
  }
}
