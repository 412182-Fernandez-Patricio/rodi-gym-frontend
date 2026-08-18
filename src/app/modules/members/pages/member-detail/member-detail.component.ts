import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import {
  Member,
  MemberStatus,
  formatDni,
  formatIsoDate,
  resolveMemberStatus,
} from '../../models/member.model';
import { MemberService } from '../../services/member.service';
import { PageHeaderService } from '../../../../shared/services/page-header.service';

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
  imports: [],
  templateUrl: './member-detail.component.html',
})
export class MemberDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly memberService = inject(MemberService);
  private readonly pageHeader = inject(PageHeaderService);

  readonly loadFailed = signal(false);

  readonly member = toSignal(
    this.memberService.getMember(Number(this.route.snapshot.paramMap.get('id'))).pipe(
      catchError(() => {
        this.loadFailed.set(true);
        return of<Member | null>(null);
      }),
    ),
    { initialValue: null as Member | null },
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
