import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ConfigService } from '../../../../shared/services/config.service';
import { PageHeaderService } from '../../../../shared/services/page-header.service';
import {
  MEMBER_STATUS_LABELS,
  Member,
  MemberStatus,
  formatDni,
  formatIsoDate,
  resolveMemberStatus,
} from '../../../members/models/member.model';
import { MemberService } from '../../../members/services/member.service';
import { PAYMENT_METHOD_LABELS, PaymentMethod, formatAmount } from '../../models/payment.model';
import { PaymentService } from '../../services/payment.service';

/** Resultados del buscador: alcanza para elegir, no es un listado. */
const SEARCH_SIZE = 5;

/** Lo que se espera a que deje de tipear antes de consultar. */
const TYPING_PAUSE_MS = 300;

const STATUS_COLORS: Record<MemberStatus, string> = {
  active: 'bg-accent-soft text-accent-strong',
  expired: 'bg-danger-soft text-danger-strong',
  inactive: 'bg-line text-muted',
};

@Component({
  selector: 'app-payment-create',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './payment-create.component.html',
})
export class PaymentCreateComponent {
  private readonly memberService = inject(MemberService);
  private readonly paymentService = inject(PaymentService);
  private readonly configService = inject(ConfigService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly destroyRef = inject(DestroyRef);

  /** El socio con el que se llegó desde el perfil, si se llegó así. */
  private readonly memberParam = parseMemberParam(
    inject(ActivatedRoute).snapshot.queryParamMap.get('member'),
  );

  readonly methods = (Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((method) => ({
    method,
    label: PAYMENT_METHOD_LABELS[method],
  }));

  readonly formatDni = formatDni;

  readonly member = signal<Member | null>(null);
  readonly loadingMember = signal(false);
  /** Por qué se volvió al buscador: el socio del link no cargó, o ya no existe. */
  readonly memberNotice = signal<string | null>(null);

  readonly searchTerm = signal('');
  readonly results = signal<Member[]>([]);
  readonly searched = signal(false);
  readonly searchFailed = signal(false);

  readonly method = signal<PaymentMethod | null>(null);

  readonly price = signal<number | null>(null);
  readonly priceFailed = signal(false);

  readonly saving = signal(false);
  readonly saveFailed = signal(false);

  readonly status = computed(() => {
    const member = this.member();
    return member ? resolveMemberStatus(member) : null;
  });

  readonly statusLabel = computed(() => {
    const status = this.status();
    return status ? MEMBER_STATUS_LABELS[status] : '';
  });

  readonly statusClass = computed(() => {
    const status = this.status();
    return (
      'shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold tracking-[0.04em] uppercase ' +
      (status ? STATUS_COLORS[status] : '')
    );
  });

  readonly memberDetail = computed(() => {
    const member = this.member();
    if (!member) {
      return '';
    }

    const dni = `DNI ${formatDni(member.id)}`;
    return member.expirationDate ? `${dni} · Vence el ${formatIsoDate(member.expirationDate)}` : dni;
  });

  /** Avisa, pero no bloquea: pagar por adelantado es legítimo. */
  readonly warning = computed(() => {
    const member = this.member();
    const status = this.status();

    if (status === 'active' && member?.expirationDate) {
      return `Está al día hasta el ${formatIsoDate(member.expirationDate)}. Este pago suma un mes más.`;
    }
    if (status === 'inactive') {
      return 'Está dado de baja. Al cobrarle se reactiva.';
    }
    return null;
  });

  /** Sin monto a la vista no se cobra: el administrador tiene que verlo antes. */
  readonly canPay = computed(
    () => !!this.member() && !!this.method() && this.price() !== null && !this.saving(),
  );

  readonly payLabel = computed(() => {
    if (this.saving()) {
      return 'Cobrando…';
    }

    const price = this.price();
    return price === null ? 'Cobrar' : `Cobrar ${formatAmount(price)}`;
  });

  constructor() {
    inject(PageHeaderService).set({
      title: 'Registrar pago',
      backLink: this.memberParam === null ? '/payments' : `/members/${this.memberParam}`,
    });

    this.loadPrice();

    if (this.memberParam !== null) {
      this.loadMember(this.memberParam);
    }

    // catchError adentro del switchMap: afuera, un error cortaría el buscador.
    toObservable(this.searchTerm)
      .pipe(
        debounceTime(TYPING_PAUSE_MS),
        map((term) => term.trim()),
        distinctUntilChanged(),
        tap(() => this.searchFailed.set(false)),
        switchMap((term) =>
          term
            ? this.memberService.searchMembers({ search: term, size: SEARCH_SIZE }).pipe(
                map((page) => page.content),
                tap(() => this.searched.set(true)),
                catchError(() => {
                  this.searchFailed.set(true);
                  return of([] as Member[]);
                }),
              )
            : of([] as Member[]).pipe(tap(() => this.searched.set(false))),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((members) => this.results.set(members));
  }

  onSearch(value: string): void {
    this.searchTerm.set(value);
  }

  selectMember(member: Member): void {
    this.member.set(member);
    this.memberNotice.set(null);
    this.saveFailed.set(false);
  }

  changeMember(): void {
    this.member.set(null);
    this.saveFailed.set(false);
  }

  selectMethod(method: PaymentMethod): void {
    this.method.set(method);
  }

  methodClass(method: PaymentMethod): string {
    const base =
      'flex-1 cursor-pointer rounded-full border px-3 py-2 text-[13px] font-semibold ' +
      '[-webkit-tap-highlight-color:transparent]';

    return this.method() === method
      ? `${base} border-ink bg-ink text-on-dark`
      : `${base} border-line bg-surface text-muted`;
  }

  loadPrice(): void {
    this.priceFailed.set(false);

    this.configService
      .getMonthlyPrice()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (price) => this.price.set(price),
        error: () => this.priceFailed.set(true),
      });
  }

  pay(): void {
    const member = this.member();
    const method = this.method();
    if (!this.canPay() || !member || !method) {
      return;
    }

    this.saving.set(true);
    this.saveFailed.set(false);

    this.paymentService
      .createPayment({ memberId: member.id, paymentMethod: method })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.goToProfile(member.id),
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);

          if (error.status === HttpStatusCode.NotFound) {
            this.member.set(null);
            this.memberNotice.set('El socio ya no existe.');
          } else {
            // Se conservan el socio y el medio, para reintentar con un toque.
            this.saveFailed.set(true);
          }
        },
      });
  }

  private loadMember(id: number): void {
    this.loadingMember.set(true);

    this.memberService
      .getMember(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (member) => {
          this.member.set(member);
          this.loadingMember.set(false);
        },
        error: () => {
          this.memberNotice.set('No se pudo cargar el socio. Buscalo acá abajo.');
          this.loadingMember.set(false);
        },
      });
  }

  /**
   * Si se llegó desde el perfil, se vuelve a esa entrada del historial: con
   * replaceUrl el historial quedaría con el perfil dos veces, y el primer "volver"
   * del sistema no haría nada visible. Si no hay pantalla previa de la app (link
   * directo) o se llegó desde Pagos, se reemplaza el formulario por el perfil.
   */
  private goToProfile(memberId: number): void {
    const cameFromProfile =
      this.memberParam === memberId && !!this.router.lastSuccessfulNavigation?.previousNavigation;

    if (cameFromProfile) {
      this.location.back();
    } else {
      this.router.navigate(['/members', memberId], { replaceUrl: true });
    }
  }
}

function parseMemberParam(value: string | null): number | null {
  const id = Number(value);
  return value && Number.isInteger(id) && id > 0 ? id : null;
}
