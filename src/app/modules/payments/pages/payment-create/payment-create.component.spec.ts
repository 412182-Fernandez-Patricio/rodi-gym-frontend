import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Location } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Navigation, Router, convertToParamMap, provideRouter } from '@angular/router';
import { PaymentCreateComponent } from './payment-create.component';
import { PageHeaderService } from '../../../../shared/services/page-header.service';
import { caseConversionInterceptor } from '../../../../shared/interceptors/case-conversion.interceptor';

describe('PaymentCreateComponent', () => {
  let fixture: ComponentFixture<PaymentCreateComponent>;
  let httpMock: HttpTestingController;
  let router: Router;
  let location: Location;

  const memberBody = (overrides: Record<string, unknown> = {}) => ({
    id: 30111222,
    name: 'Ana',
    last_name: 'Garcia',
    phone_number: '3512345678',
    status: true,
    expiration_date: '2020-01-01',
    ...overrides,
  });

  const paymentBody = {
    id: 90,
    member_id: 30111222,
    member_name: 'Ana',
    member_last_name: 'Garcia',
    amount: 7000,
    payment_date: '2026-09-28 10:05:00',
    payment_method: 'CASH',
  };

  const element = () => fixture.nativeElement as HTMLElement;
  const text = () => element().textContent ?? '';
  const button = (label: string) =>
    Array.from(element().querySelectorAll('button')).find((b) =>
      b.textContent?.trim().startsWith(label),
    ) as HTMLButtonElement | undefined;
  const payButton = () => button('Cobr') as HTMLButtonElement;
  const searchInput = () => element().querySelector('input[type="search"]') as HTMLInputElement | null;

  const priceRequest = () => httpMock.expectOne('/api/config/monthly-price');
  const memberRequest = () => httpMock.expectOne('/api/members/30111222');
  const searchRequest = () => httpMock.expectOne((req) => req.url === '/api/members');
  const paymentRequest = () =>
    httpMock.expectOne((req) => req.method === 'POST' && req.url === '/api/payments');

  /** Arma la pantalla, con o sin `?member`. */
  const setup = (member: string | null = null) => {
    TestBed.configureTestingModule({
      imports: [PaymentCreateComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([caseConversionInterceptor])),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap(member ? { member } : {}) },
          },
        },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
    spyOn(router, 'navigate').and.resolveTo(true);
    spyOn(location, 'back');

    fixture = TestBed.createComponent(PaymentCreateComponent);
  };

  /** Entra y responde el monto y, si hace falta, el socio. */
  const enter = (member: Record<string, unknown> | null = null) => {
    fixture.detectChanges();
    tick(300);
    priceRequest().flush({ key: 'monthly_price', value: '7000.0' });
    if (member) {
      memberRequest().flush(member);
    }
    fixture.detectChanges();
  };

  const click = (target: HTMLButtonElement | undefined) => {
    target!.click();
    fixture.detectChanges();
  };

  const search = (value: string) => {
    fixture.componentInstance.onSearch(value);
    fixture.detectChanges();
    tick(300);
  };

  /** Con el socio y el medio elegidos, listo para cobrar. */
  const ready = (member = memberBody()) => {
    setup('30111222');
    enter(member);
    click(button('Efectivo'));
  };

  afterEach(() => httpMock.verify());

  describe('without a member', () => {
    beforeEach(() => setup());

    it('should title the header and go back to the payments list', fakeAsync(() => {
      enter();

      const header = TestBed.inject(PageHeaderService);
      expect(header.title()).toBe('Registrar pago');
      expect(header.backLink()).toBe('/payments');
    }));

    it('should search 5 members after a pause and pick one without navigating', fakeAsync(() => {
      enter();
      expect(searchInput()).not.toBeNull();

      search('ana');
      const request = searchRequest();
      expect(request.request.params.get('search')).toBe('ana');
      expect(request.request.params.get('size')).toBe('5');
      request.flush({
        content: [memberBody()],
        page: 0,
        size: 5,
        total_elements: 1,
        total_pages: 1,
        last: true,
      });
      fixture.detectChanges();

      click(button('Ana Garcia'));

      expect(searchInput()).toBeNull();
      expect(text()).toContain('DNI 30.111.222');
      expect(button('Cambiar')).toBeTruthy();
      expect(router.navigate).not.toHaveBeenCalled();
    }));

    it('should start with no method chosen and the pay button disabled', fakeAsync(() => {
      enter();

      for (const label of ['Efectivo', 'Transferencia', 'Débito']) {
        expect(button(label)?.getAttribute('aria-pressed')).toBe('false');
      }
      expect(payButton().disabled).toBeTrue();
    }));

    it('should replace the form with the profile after paying', fakeAsync(() => {
      enter();
      fixture.componentInstance.selectMember({
        id: 30111222,
        name: 'Ana',
        lastName: 'Garcia',
        phoneNumber: '351',
        status: true,
        expirationDate: null,
      });
      fixture.detectChanges();
      click(button('Débito'));

      click(payButton());
      paymentRequest().flush(paymentBody, { status: 201, statusText: 'Created' });

      expect(router.navigate).toHaveBeenCalledWith(['/members', 30111222], { replaceUrl: true });
      expect(location.back).not.toHaveBeenCalled();
    }));
  });

  describe('with a member', () => {
    it('should go back to the profile from the header', fakeAsync(() => {
      setup('30111222');
      enter(memberBody());

      expect(TestBed.inject(PageHeaderService).backLink()).toBe('/members/30111222');
    }));

    it('should load and pick the member of the link', fakeAsync(() => {
      setup('30111222');
      enter(memberBody());

      expect(text()).toContain('Ana Garcia');
      expect(text()).toContain('Vencido');
      expect(text()).toContain('Vence el 01/01/2020');
      expect(searchInput()).toBeNull();
    }));

    it('should fall back to the search when the member does not load', fakeAsync(() => {
      setup('30111222');
      fixture.detectChanges();
      tick(300);
      priceRequest().flush({ key: 'monthly_price', value: '7000.0' });
      memberRequest().flush(null, { status: 404, statusText: 'Not Found' });
      fixture.detectChanges();

      expect(text()).toContain('No se pudo cargar el socio.');
      expect(searchInput()).not.toBeNull();
    }));

    it('should go back to the search with "Cambiar"', fakeAsync(() => {
      setup('30111222');
      enter(memberBody());

      click(button('Cambiar'));

      expect(searchInput()).not.toBeNull();
      expect(text()).not.toContain('Ana Garcia');
    }));

    it('should warn when the member is up to date, without blocking', fakeAsync(() => {
      ready(memberBody({ expiration_date: '2099-09-01' }));

      expect(text()).toContain('Está al día hasta el 01/09/2099. Este pago suma un mes más.');
      expect(payButton().disabled).toBeFalse();
    }));

    it('should warn when the member is inactive', fakeAsync(() => {
      ready(memberBody({ status: false }));

      expect(text()).toContain('Está dado de baja. Al cobrarle se reactiva.');
      expect(payButton().disabled).toBeFalse();
    }));

    it('should not warn when the member is overdue', fakeAsync(() => {
      ready();

      expect(text()).not.toContain('Está al día');
      expect(text()).not.toContain('dado de baja');
    }));

    it('should show the amount on the pay button', fakeAsync(() => {
      ready();

      expect(button('Efectivo')?.getAttribute('aria-pressed')).toBe('true');
      expect(payButton().textContent?.trim()).toBe('Cobrar $7.000');
      expect(payButton().disabled).toBeFalse();
    }));

    it('should not let pay without the amount, and retry it', fakeAsync(() => {
      setup('30111222');
      fixture.detectChanges();
      tick(300);
      priceRequest().flush('boom', { status: 500, statusText: 'Server Error' });
      memberRequest().flush(memberBody());
      fixture.detectChanges();
      click(button('Efectivo'));

      expect(text()).toContain('No se pudo cargar el monto de la cuota.');
      expect(payButton().disabled).toBeTrue();

      click(button('Reintentar'));
      priceRequest().flush({ key: 'monthly_price', value: '7000.0' });
      fixture.detectChanges();

      expect(text()).not.toContain('No se pudo cargar el monto');
      expect(payButton().disabled).toBeFalse();
    }));

    it('should send a single POST in snake_case while paying', fakeAsync(() => {
      ready();

      click(payButton());
      expect(payButton().disabled).toBeTrue();
      expect(payButton().textContent?.trim()).toBe('Cobrando…');
      click(payButton());

      const request = paymentRequest();
      expect(request.request.body).toEqual({ member_id: 30111222, payment_method: 'CASH' });
      request.flush(paymentBody, { status: 201, statusText: 'Created' });
    }));

    it('should go back in the history when it came from the profile', fakeAsync(() => {
      ready();
      spyOnProperty(router, 'lastSuccessfulNavigation', 'get').and.returnValue({
        previousNavigation: {} as Navigation,
      } as Navigation);

      click(payButton());
      paymentRequest().flush(paymentBody, { status: 201, statusText: 'Created' });

      expect(location.back).toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    }));

    it('should replace the form with the profile when the link was opened directly', fakeAsync(() => {
      ready();

      click(payButton());
      paymentRequest().flush(paymentBody, { status: 201, statusText: 'Created' });

      expect(location.back).not.toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/members', 30111222], { replaceUrl: true });
    }));

    it('should go back to the search when the member no longer exists', fakeAsync(() => {
      ready();

      click(payButton());
      paymentRequest().flush(null, { status: 404, statusText: 'Not Found' });
      fixture.detectChanges();

      expect(text()).toContain('El socio ya no existe.');
      expect(searchInput()).not.toBeNull();
    }));

    it('should keep the choice to retry after a server error', fakeAsync(() => {
      ready();

      click(payButton());
      paymentRequest().flush(null, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      expect(text()).toContain('No se pudo registrar el pago.');
      expect(text()).toContain('Ana Garcia');
      expect(button('Efectivo')?.getAttribute('aria-pressed')).toBe('true');
      expect(payButton().disabled).toBeFalse();
    }));
  });
});
