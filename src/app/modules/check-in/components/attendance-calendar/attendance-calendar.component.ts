import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import {
  AttendanceDay,
  currentIsoMonth,
  monthLabelOf,
  shiftMonth,
} from '../../models/attendance.model';
import { IconComponent } from '../../../../shared/components/icon/icon.component';

/** Domingo primero, como el mock. */
const WEEKDAY_INITIALS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];


const DAY_STATE_CLASSES = {
  none: 'text-ink',
  present: 'bg-accent-soft font-bold text-accent-strong',
  failed: 'bg-danger-soft font-bold text-danger-strong',
} as const;

type DayState = keyof typeof DAY_STATE_CLASSES;

interface CalendarCell {
  key: string;
  day: number | null;
  state: DayState;
  label: string;
}

@Component({
  selector: 'app-attendance-calendar',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './attendance-calendar.component.html',
})
export class AttendanceCalendarComponent {
  /** Mes a dibujar, en formato aaaa-mm. */
  readonly month = input.required<string>();
  readonly days = input.required<AttendanceDay[]>();

  readonly monthChange = output<string>();

  readonly weekdays = WEEKDAY_INITIALS;

  readonly monthLabel = computed(() => monthLabelOf(this.month()));

  /** No se puede ir más allá del mes en curso: no hay asistencia futura. */
  readonly canGoNext = computed(() => this.month() < currentIsoMonth());

  goToPreviousMonth(): void {
    this.monthChange.emit(shiftMonth(this.month(), -1));
  }

  goToNextMonth(): void {
    if (this.canGoNext()) {
      this.monthChange.emit(shiftMonth(this.month(), 1));
    }
  }

  /**
   * Celdas de la grilla: primero los huecos hasta el día de la semana en que
   * arranca el mes, después los días.
   *
   * Las fechas de la API se comparan como texto y nunca se pasan por Date: un
   * 'aaaa-mm-dd' se interpreta como UTC y en UTC-3 cae un día antes.
   */
  readonly cells = computed<CalendarCell[]>(() => {
    const month = this.month();
    const [year, monthNumber] = month.split('-').map(Number);
    const states = new Map(
      this.days().map((day) => [day.date, day.success ? 'present' : 'failed'] as const),
    );

    const firstWeekday = new Date(year, monthNumber - 1, 1).getDay();
    const totalDays = new Date(year, monthNumber, 0).getDate();

    const blanks: CalendarCell[] = Array.from({ length: firstWeekday }, (_, index) => ({
      key: `blank-${index}`,
      day: null,
      state: 'none',
      label: '',
    }));

    const days: CalendarCell[] = Array.from({ length: totalDays }, (_, index) => {
      const day = index + 1;
      const date = `${month}-${`${day}`.padStart(2, '0')}`;

      return {
        key: date,
        day,
        state: states.get(date) ?? 'none',
        label: `${day}`,
      };
    });

    return [...blanks, ...days];
  });

  cellClass(state: DayState): string {
    return `flex h-8 w-8 items-center justify-center justify-self-center rounded-full text-[13px] ${DAY_STATE_CLASSES[state]}`;
  }
}
