import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CheckinListComponent } from './checkin-list.component';
import { Checkin } from '../../models/checkin.model';

describe('CheckinListComponent', () => {
  let fixture: ComponentFixture<CheckinListComponent>;

  const checkin = (overrides: Partial<Checkin> = {}): Checkin => ({
    id: 1,
    memberId: 30111222,
    checkinTime: '2026-08-19T18:25:00',
    success: true,
    reason: 'ACCESS_GRANTED',
    message: 'Access granted',
    ...overrides,
  });

  const render = (checkins: Checkin[], names = new Map<number, string>()) => {
    fixture.componentRef.setInput('checkins', checkins);
    fixture.componentRef.setInput('memberNames', names);
    fixture.detectChanges();
  };

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckinListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CheckinListComponent);
  });

  it('should show the time, the name and the masked dni', () => {
    render([checkin()], new Map([[30111222, 'Ana García']]));

    expect(text()).toContain('18:25');
    expect(text()).toContain('Ana García');
    expect(text()).toContain('...1222');
    expect(text()).not.toContain('30111222');
  });

  it('should fall back to the member id when the name is unknown', () => {
    render([checkin()]);

    expect(text()).toContain('Socio 30111222');
  });

  it('should mark an allowed entry green and a refused one red', () => {
    render([
      checkin({ id: 1 }),
      checkin({ id: 2, success: false, reason: 'MEMBERSHIP_EXPIRED' }),
    ]);

    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('li');
    expect(rows[0].className).toContain('bg-accent-soft');
    expect(rows[1].className).toContain('bg-danger-soft');
  });

  it('should spell out the reason in Spanish only when refused', () => {
    render([checkin({ success: false, reason: 'MEMBER_INACTIVE' })]);
    expect(text()).toContain('Socio dado de baja');

    render([checkin({ success: false, reason: 'MEMBERSHIP_EXPIRED' })]);
    expect(text()).toContain('Cuota vencida');

    render([checkin()]);
    expect(text()).not.toContain('Acceso permitido');
  });

  it('should show the empty message when nobody came in', () => {
    render([]);

    expect(text()).toContain('Todavía no hubo ingresos hoy.');
  });
});
