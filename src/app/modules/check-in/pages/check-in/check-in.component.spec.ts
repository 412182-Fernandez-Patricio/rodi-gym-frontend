import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CheckInComponent } from './check-in.component';
import { caseConversionInterceptor } from '../../../../shared/interceptors/case-conversion.interceptor';

describe('CheckInComponent', () => {
  let fixture: ComponentFixture<CheckInComponent>;
  let httpMock: HttpTestingController;

  const checkinsBody = {
    content: [
      {
        id: 2,
        member_id: 30111222,
        checkin_time: '2026-08-19T18:25:00',
        success: true,
        reason: 'ACCESS_GRANTED',
        message: 'Access granted',
      },
      {
        id: 1,
        member_id: 31222888,
        checkin_time: '2026-08-19T09:10:00',
        success: false,
        reason: 'MEMBERSHIP_EXPIRED',
        message: 'Membership expired or not found',
      },
    ],
    page: 0,
    size: 50,
    total_elements: 12,
    total_pages: 1,
    last: true,
  };

  // El padron ahora viene paginado, igual que pagos y check-ins.
  const membersBody = {
    content: [
      {
        id: 30111222,
        name: 'Ana',
        last_name: 'Garcia',
        phone_number: '351',
        status: true,
        expiration_date: '2099-01-01',
      },
    ],
    page: 0,
    size: 500,
    total_elements: 1,
    total_pages: 1,
    last: true,
  };

  const grantedBody = { ...checkinsBody, content: [], total_elements: 11 };

  const logRequest = () =>
    httpMock.expectOne((req) => req.url === '/api/checkins' && !req.params.has('success'));
  const grantedRequest = () =>
    httpMock.expectOne((req) => req.url === '/api/checkins' && req.params.get('success') === 'true');

  const flushCheckins = () => {
    logRequest().flush(checkinsBody);
    grantedRequest().flush(grantedBody);
  };
  const membersRequest = () => httpMock.expectOne((req) => req.url === '/api/members');
  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(async () => {
    // Karma corre la pagina en segundo plano, asi que document.hidden es true y el
    // polling no arrancaria nunca. Se fuerza visible para poder ejercitarlo.
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });

    await TestBed.configureTestingModule({
      imports: [CheckInComponent],
      providers: [
        provideHttpClient(withInterceptors([caseConversionInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CheckInComponent);
  });

  afterEach(() => {
    // ignoreCancelled: al fallar una de las dos consultas, forkJoin cancela la otra.
    httpMock.verify({ ignoreCancelled: true });
    delete (document as unknown as Record<string, unknown>)['hidden'];
  });

  it('should ask only for today and cap the rows', () => {
    fixture.detectChanges();
    membersRequest().flush(membersBody);

    const request = logRequest();
    const from = request.request.params.get('from') ?? '';
    const to = request.request.params.get('to') ?? '';

    expect(from).toContain('T00:00:00');
    expect(to).toContain('T00:00:00');
    expect(to > from).toBeTrue();
    expect(request.request.params.get('size')).toBe('50');

    request.flush(checkinsBody);
    grantedRequest().flush(grantedBody);
  });

  it('should count only the entries that got in', () => {
    fixture.detectChanges();
    membersRequest().flush(membersBody);
    flushCheckins();
    fixture.detectChanges();

    // 12 intentos, 11 permitidos: el numero grande son los 11 y el resto rechazos.
    expect(text()).toContain('11');
    expect(text()).toContain('1 rechazado');
    expect(text()).not.toContain('12 ');
  });

  it('should count from the total and not from the rows on screen', () => {
    fixture.detectChanges();
    membersRequest().flush(membersBody);
    flushCheckins();
    fixture.detectChanges();

    expect(text()).toContain('11');
  });

  it('should resolve member names and mask the dni', () => {
    fixture.detectChanges();
    membersRequest().flush(membersBody);
    flushCheckins();
    fixture.detectChanges();

    expect(text()).toContain('Ana Garcia');
    expect(text()).toContain('...1222');
    expect(text()).toContain('Cuota vencida');
  });

  it('should keep the rows on screen when a refresh fails', () => {
    fixture.detectChanges();
    membersRequest().flush(membersBody);
    flushCheckins();
    fixture.detectChanges();

    fixture.componentInstance.refresh();
    // forkJoin cancela la consulta hermana al fallar una, asi que no hay que
    // responderla: no puede quedar el contador al dia con el registro viejo.
    logRequest().flush('boom', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(text()).toContain('Sin conexión');
    expect(text()).toContain('Ana Garcia');
    expect(text()).toContain('11');
  });

  it('should still show check-ins when the member list fails', () => {
    fixture.detectChanges();
    membersRequest().flush('boom', { status: 500, statusText: 'Server Error' });
    flushCheckins();
    fixture.detectChanges();

    expect(text()).toContain('Socio 30111222');
  });
});
