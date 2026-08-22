import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  Checkin,
  formatCheckinTime,
  maskDni,
  reasonLabelOf,
} from '../../models/checkin.model';

interface CheckinRow {
  id: number;
  time: string;
  name: string;
  dni: string;
  reason: string;
  success: boolean;
  rowClass: string;
}

/**
 * Registro de ingresos. Presentacional: recibe los intentos ya resueltos y no
 * sabe de dónde salieron.
 */
@Component({
  selector: 'app-checkin-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './checkin-list.component.html',
})
export class CheckinListComponent {
  readonly checkins = input.required<Checkin[]>();
  /** Nombre por id de socio; si falta, la fila cae al DNI. */
  readonly memberNames = input<Map<number, string>>(new Map());
  readonly emptyMessage = input('Todavía no hubo ingresos hoy.');

  readonly rows = computed<CheckinRow[]>(() =>
    this.checkins().map((checkin) => ({
      id: checkin.id,
      time: formatCheckinTime(checkin.checkinTime),
      name: this.memberNames().get(checkin.memberId) ?? `Socio ${checkin.memberId}`,
      dni: maskDni(checkin.memberId),
      reason: reasonLabelOf(checkin.reason),
      success: checkin.success,
      rowClass: checkin.success
        ? 'border-l-4 border-accent bg-accent-soft'
        : 'border-l-4 border-danger bg-danger-soft',
    })),
  );
}
