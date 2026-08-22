import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { MemberDetailComponent } from './member-detail.component';
import { PageHeaderService } from '../../../../shared/services/page-header.service';
import { currentIsoMonth, shiftMonth } from '../../../check-in/models/attendance.model';
import { caseConversionInterceptor } from '../../../../shared/interceptors/case-conversion.interceptor';

describe('MemberDetailComponent', () => {
  let fixture: ComponentFixture<MemberDetailComponent>;
  let httpMock: HttpTestingController;

  const memberBody = {
    id: 30111222,
    name: 'Ana',
    last_name: 'Garcia',
    phone_number: '3512345678',
    status: true,
    expiration_date: '2099-09-01',
  };

  const paymentsBody = {
    content: [
      {
        id: 1,
        member_id: 30111222,
        amount: 7000,
        payment_date: '2026-08-01 10:05:00',
        payment_method: 'TRANSFER',
      },
    ],
    page: 0,
    size: 5,
    total_elements: 1,
    total_pages: 1,
    last: true,
  };

  const attendanceBody = [{ date: '2026-08-03', success: true, checkins: 1 }];

  const memberRequest = () => httpMock.expectOne((req) => req.url === '/api/members/30111222');
  const paymentsRequest = () => httpMock.expectOne((req) => req.url === '/api/payments');
  const attendanceRequest = () =>
    httpMock.expectOne((req) => req.url === '/api/members/30111222/attendance');

  const flushMember = () => memberRequest().flush(memberBody);
  const flushPayments = () => paymentsRequest().flush(paymentsBody);
  const flushAttendance = () => attendanceRequest().flush(attendanceBody);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberDetailComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([caseConversionInterceptor])),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '30111222' }) } },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MemberDetailComponent);
  });

  afterEach(() => httpMock.verify());

  it('should render the member and publish the header title', () => {
    fixture.detectChanges();
    flushMember();
    flushPayments();
    flushAttendance();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Ana Garcia');
    expect(text).toContain('30.111.222');
    expect(text).toContain('01/09/2099');
    expect(TestBed.inject(PageHeaderService).title()).toBe('Perfil - Ana Garcia');
    expect(TestBed.inject(PageHeaderService).backLink()).toBe('/members');
  });

  it('should ask only for this member latest payments and render them', () => {
    fixture.detectChanges();
    flushMember();

    const request = paymentsRequest();
    expect(request.request.params.get('member_id')).toBe('30111222');
    expect(request.request.params.get('size')).toBe('5');
    request.flush(paymentsBody);
    flushAttendance();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Últimos pagos');
    expect(text).toContain('01/08/2026');
    expect(text).toContain('Transferencia');
    expect(text).toContain('$7.000');
  });

  it('should keep the profile usable when payments fail', () => {
    fixture.detectChanges();
    flushMember();

    paymentsRequest().flush('boom', { status: 500, statusText: 'Server Error' });
    flushAttendance();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Ana Garcia');
    expect(text).toContain('No se pudieron cargar los pagos');
  });

  it('should show a message when the member request fails', () => {
    fixture.detectChanges();
    memberRequest().flush('boom', { status: 500, statusText: 'Server Error' });
    flushPayments();
    flushAttendance();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'No se pudo cargar el socio',
    );
  });

  it('should ask for this month attendance and paint it', () => {
    fixture.detectChanges();
    flushMember();
    flushPayments();

    const request = attendanceRequest();
    expect(request.request.params.get('month')).toBe(currentIsoMonth());
    request.flush(attendanceBody);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Asistencia');
    expect((fixture.nativeElement as HTMLElement).querySelector('app-attendance-calendar'))
      .toBeTruthy();
  });

  it('should keep the profile usable when attendance fails', () => {
    fixture.detectChanges();
    flushMember();
    flushPayments();
    attendanceRequest().flush('boom', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Ana Garcia');
    expect(text).toContain('01/08/2026');
    expect(text).toContain('No se pudo cargar la asistencia');
  });

  it('should ask again when the calendar changes month', () => {
    fixture.detectChanges();
    flushMember();
    flushPayments();
    flushAttendance();
    fixture.detectChanges();

    const previous = shiftMonth(currentIsoMonth(), -1);
    fixture.componentInstance.month.set(previous);
    fixture.detectChanges();

    const request = attendanceRequest();
    expect(request.request.params.get('month')).toBe(previous);
    request.flush([{ date: `${previous}-05`, success: false, checkins: 1 }]);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Ana Garcia');
  });

  it('should recover on the next month after one fails', () => {
    fixture.detectChanges();
    flushMember();
    flushPayments();
    attendanceRequest().flush('boom', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'No se pudo cargar la asistencia',
    );

    fixture.componentInstance.month.set(shiftMonth(currentIsoMonth(), -1));
    fixture.detectChanges();

    attendanceRequest().flush(attendanceBody);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(
      'No se pudo cargar la asistencia',
    );
  });
});
