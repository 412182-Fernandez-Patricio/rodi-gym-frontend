import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AttendanceCalendarComponent } from './attendance-calendar.component';
import { AttendanceDay, currentIsoMonth, shiftMonth } from '../../models/attendance.model';

describe('AttendanceCalendarComponent', () => {
  let fixture: ComponentFixture<AttendanceCalendarComponent>;

  const render = (month: string, days: AttendanceDay[]) => {
    fixture.componentRef.setInput('month', month);
    fixture.componentRef.setInput('days', days);
    fixture.detectChanges();
  };

  const cellFor = (day: number): HTMLElement | undefined =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('span')).find(
      (span) => span.textContent?.trim() === `${day}` && span.className.includes('rounded-full'),
    ) as HTMLElement | undefined;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttendanceCalendarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AttendanceCalendarComponent);
  });

  it('should start the week on Sunday', () => {
    render('2026-08', []);

    const headers = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.grid > span'),
    ).slice(0, 7);

    expect(headers.map((header) => header.textContent?.trim())).toEqual([
      'D',
      'L',
      'M',
      'M',
      'J',
      'V',
      'S',
    ]);
  });

  it('should offset the first day to its weekday', () => {
    // El 1 de agosto de 2026 cae sábado: seis huecos antes del día 1.
    render('2026-08', []);

    const blanks = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.grid > span'),
    )
      .slice(7)
      .findIndex((span) => span.textContent?.trim() === '1');

    expect(blanks).toBe(6);
  });

  it('should paint a successful day green and a failed one red', () => {
    render('2026-08', [
      { date: '2026-08-03', success: true, checkins: 1 },
      { date: '2026-08-06', success: false, checkins: 1 },
    ]);

    expect(cellFor(3)?.className).toContain('bg-accent-soft');
    expect(cellFor(6)?.className).toContain('bg-danger-soft');
    expect(cellFor(4)?.className).not.toContain('bg-');
  });

  it('should paint a day with a failed and a successful attempt as successful', () => {
    render('2026-08', [{ date: '2026-08-01', success: true, checkins: 2 }]);

    expect(cellFor(1)?.className).toContain('bg-accent-soft');
    expect(cellFor(1)?.className).not.toContain('bg-danger-soft');
  });

  it('should render every day of the month', () => {
    render('2026-02', []);

    expect(cellFor(28)).toBeTruthy();
    expect(cellFor(29)).toBeFalsy();
  });

  const button = (label: string): HTMLButtonElement =>
    (fixture.nativeElement as HTMLElement).querySelector(
      `button[aria-label="${label}"]`,
    ) as HTMLButtonElement;

  it('should show the month and year being drawn', () => {
    render('2026-08', []);

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Agosto 2026');
  });

  it('should emit the previous month, crossing the year boundary', () => {
    const emitted: string[] = [];
    render('2026-01', []);
    fixture.componentInstance.monthChange.subscribe((month) => emitted.push(month));

    button('Mes anterior').click();

    expect(emitted).toEqual(['2025-12']);
  });

  it('should emit the next month when there is one', () => {
    const emitted: string[] = [];
    render(shiftMonth(currentIsoMonth(), -2), []);
    fixture.componentInstance.monthChange.subscribe((month) => emitted.push(month));

    button('Mes siguiente').click();

    expect(emitted).toEqual([shiftMonth(currentIsoMonth(), -1)]);
  });

  it('should not offer a month past the current one', () => {
    const emitted: string[] = [];
    render(currentIsoMonth(), []);
    fixture.componentInstance.monthChange.subscribe((month) => emitted.push(month));

    expect(button('Mes siguiente').disabled).toBeTrue();

    button('Mes siguiente').click();
    expect(emitted).toEqual([]);
  });
});
