import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';
import {
  Member,
  MemberStatus,
  formatDni,
  formatIsoDate,
  resolveMemberStatus,
} from '../../models/member.model';
import { MemberService } from '../../services/member.service';
import { PaymentListComponent } from '../../../payments/components/payment-list/payment-list.component';
import { Payment } from '../../../payments/models/payment.model';
import { PaymentService } from '../../../payments/services/payment.service';
import { PageHeaderService } from '../../../../shared/services/page-header.service';

const PAYMENTS_SHOWN = 5;

const STATUS_LABELS: Record<MemberStatus, string> = {
  active: 'Al día',
  expired: 'Vencido',
  inactive: 'Inactivo',
};

const STATUS_COLORS: Record<MemberStatus, string> = {
  active: 'bg-surface text-accent-strong',
  expired: 'bg-danger-soft text-danger-strong',
  inactive: 'bg-line text-muted',
};

@Component({
  selector: 'app-member-detail',
  standalone: true,
  imports: [PaymentListComponent],
  templateUrl: './member-detail.component.html',
})
export class MemberDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly memberService = inject(MemberService);
  private readonly paymentService = inject(PaymentService);
  private readonly pageHeader = inject(PageHeaderService);

  private readonly memberId = Number(this.route.snapshot.paramMap.get('id'));

  readonly loadFailed = signal(false);
  readonly paymentsFailed = signal(false);

  readonly member = toSignal(
    this.memberService.getMember(this.memberId).pipe(
      catchError(() => {
        this.loadFailed.set(true);
        return of<Member | null>(null);
      }),
    ),
    { initialValue: null as Member | null },
  );

  readonly payments = toSignal(
    this.paymentService.searchPayments({ memberId: this.memberId, size: PAYMENTS_SHOWN }).pipe(
      map((page) => page.content),
      catchError(() => {
        this.paymentsFailed.set(true);
        return of<Payment[]>([]);
      }),
    ),
    { initialValue: [] as Payment[] },
  );

  readonly status = computed<MemberStatus | null>(() => {
    const member = this.member();
    return member ? resolveMemberStatus(member) : null;
  });

  readonly statusLabel = computed(() => {
    const status = this.status();
    return status ? STATUS_LABELS[status] : '';
  });

  readonly fullName = computed(() => {
    const member = this.member();
    return member ? `${member.name} ${member.lastName}` : '';
  });

  readonly initials = computed(() => {
    const member = this.member();
    return member ? `${member.name.charAt(0)}${member.lastName.charAt(0)}`.toUpperCase() : '';
  });

  readonly dni = computed(() => {
    const member = this.member();
    return member ? formatDni(member.id) : '';
  });

  readonly expiration = computed(() => {
    const member = this.member();
    return member?.expirationDate ? formatIsoDate(member.expirationDate) : null;
  });

  readonly profileClass = computed(
    () =>
      'relative flex flex-col items-center rounded-[14px] px-4 pt-6 pb-5 text-center ' +
      (this.status() === 'inactive' ? 'bg-neutral-soft' : 'bg-accent-soft'),
  );

  readonly statusClass = computed(() => {
    const status = this.status();
    return (
      'absolute top-3 right-3 rounded-md px-2 py-0.5 text-[10px] font-bold tracking-[0.04em] uppercase ' +
      (status ? STATUS_COLORS[status] : '')
    );
  });

  constructor() {
    this.pageHeader.set({ title: 'Perfil', backLink: '/members' });

    effect(() => {
      const name = this.fullName();
      if (name) {
        this.pageHeader.set({ title: `Perfil - ${name}`, backLink: '/members' });
      }
    });
  }
}
