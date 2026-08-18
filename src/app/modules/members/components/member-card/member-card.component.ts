import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { RouterLink } from '@angular/router';
import { Member, MemberStatus, resolveMemberStatus } from '../../models/member.model';

const STATUS_LABELS: Record<MemberStatus, string> = {
  active: 'Al día',
  expired: 'Vencido',
  inactive: 'Inactivo',
};

const BADGE_COLORS: Record<MemberStatus, string> = {
  active: 'bg-accent-soft text-accent-strong',
  expired: 'bg-danger-soft text-danger-strong',
  inactive: 'bg-line text-muted',
};

@Component({
  selector: 'app-member-card',
  standalone: true,
  imports: [IconComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './member-card.component.html',
})
export class MemberCardComponent {
  readonly member = input.required<Member>();
  readonly contact = output<Member>();

  readonly status = computed<MemberStatus>(() => resolveMemberStatus(this.member()));
  readonly statusLabel = computed(() => STATUS_LABELS[this.status()]);
  readonly fullName = computed(() => `${this.member().name} ${this.member().lastName}`);
  readonly initials = computed(() => {
    const { name, lastName } = this.member();
    return `${name.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  });

  private readonly isInactive = computed(() => this.status() === 'inactive');

  readonly cardClass = computed(
    () =>
      'flex items-center gap-3 rounded-[14px] border px-4 py-3.5 ' +
      (this.isInactive() ? 'border-transparent bg-neutral-soft' : 'border-line bg-surface'),
  );

  readonly avatarClass = computed(
    () =>
      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-line text-[13px] font-bold tracking-[0.02em] ' +
      (this.isInactive() ? 'text-muted' : 'text-ink'),
  );

  readonly nameClass = computed(
    () =>
      'max-w-full truncate text-[15px] ' +
      (this.isInactive() ? 'font-medium text-muted' : 'font-semibold text-ink-strong'),
  );

  readonly badgeClass = computed(
    () =>
      'rounded-md px-2 py-0.5 text-[10px] font-bold tracking-[0.04em] uppercase ' +
      BADGE_COLORS[this.status()],
  );
}
