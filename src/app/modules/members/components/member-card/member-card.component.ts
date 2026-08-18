import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Member, MemberStatus, resolveMemberStatus } from '../../models/member.model';

const STATUS_LABELS: Record<MemberStatus, string> = {
  active: 'Al día',
  expired: 'Vencido',
  inactive: 'Inactivo',
};

@Component({
  selector: 'app-member-card',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './member-card.component.html',
  styleUrl: './member-card.component.css',
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
}
