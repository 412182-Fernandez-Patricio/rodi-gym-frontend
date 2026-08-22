import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap } from 'rxjs';
import {
  Member,
  MemberStatus,
  formatDni,
  formatIsoDate,
  resolveMemberStatus,
} from '../../models/member.model';
import { MemberService } from '../../services/member.service';
import { AttendanceCalendarComponent } from '../../../check-in/components/attendance-calendar/attendance-calendar.component';
import { AttendanceDay, currentIsoMonth } from '../../../check-in/models/attendance.model';
import { AttendanceService } from '../../../check-in/services/attendance.service';
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
  imports: [PaymentListComponent, AttendanceCalendarComponent],
  templateUrl: './member-detail.component.html',
})
export class MemberDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly memberService = inject(MemberService);
  private readonly paymentService = inject(PaymentService);
  private readonly attendanceService = inject(AttendanceService);
  private readonly pageHeader = inject(PageHeaderService);

  private readonly memberId = Number(this.route.snapshot.paramMap.get('id'));

  readonly loadFailed = signal(false);
  readonly paymentsFailed = signal(false);
  readonly attendanceFailed = signal(false);

  readonly month = signal(currentIsoMonth());

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

  /**
   * Se vuelve a pedir cada vez que cambia el mes. El catchError va adentro del
   * switchMap a propósito: afuera, un mes que falla completa el stream y los
   * cambios de mes siguientes dejan de pedir nada.
   */
  readonly attendance = toSignal(
    toObservable(this.month).pipe(
      switchMap((month) => {
        this.attendanceFailed.set(false);
        return this.attendanceService.getAttendance(this.memberId, month).pipe(
          catchError(() => {
            this.attendanceFailed.set(true);
            return of<AttendanceDay[]>([]);
          }),
        );
      }),
    ),
    { initialValue: [] as AttendanceDay[] },
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
