import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PaymentsComponent } from './payments.component';
import { caseConversionInterceptor } from '../../../../shared/interceptors/case-conversion.interceptor';

describe('PaymentsComponent', () => {
  let fixture: ComponentFixture<PaymentsComponent>;
  let httpMock: HttpTestingController;

  const payment = (id: number, name: string, lastName: string, method = 'CASH') => ({
    id,
    member_id: 30111222 + id,
    member_name: name,
    member_last_name: lastName,
    amount: 7000,
    payment_date: '2026-09-22 10:05:00',
    payment_method: method,
  });

  const pageOf = (content: unknown[], overrides: Record<string, unknown> = {}) => ({
    content,
    page: 0,
    size: 20,
    total_elements: content.length,
    total_pages: 1,
    last: true,
    ...overrides,
  });

  const paymentsRequest = () => httpMock.expectOne((req) => req.url === '/api/payments');
  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const chip = (label: string): HTMLButtonElement =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === label,
    ) as HTMLButtonElement;

  /** Entra a la pantalla y responde la primera consulta. */
  const enter = (content: unknown[] = [], overrides: Record<string, unknown> = {}) => {
    fixture.detectChanges();
    tick(300);
    paymentsRequest().flush(pageOf(content, overrides));
    fixture.detectChanges();
  };

  // detectChanges tras escribir el signal: toObservable se alimenta de un effect,
  // que se vacía en la detección de cambios.
  const search = (value: string, wait = 300) => {
    fixture.componentInstance.onSearch(value);
    fixture.detectChanges();
    tick(wait);
  };

  const clickChip = (label: string) => {
    chip(label).click();
    fixture.detectChanges();
    tick(300);
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentsComponent],
      providers: [
        provideHttpClient(withInterceptors([caseConversionInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PaymentsComponent);
  });

  afterEach(() => httpMock.verify({ ignoreCancelled: true }));

  it('should ask for the first 20 with no filters and show who paid', fakeAsync(() => {
    fixture.detectChanges();
    tick(300);

    const request = paymentsRequest();
    expect(request.request.params.get('size')).toBe('20');
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.has('search')).toBeFalse();
    expect(request.request.params.has('payment_method')).toBeFalse();

    request.flush(pageOf([payment(1, 'Ana', 'Garcia', 'TRANSFER')]));
    fixture.detectChanges();

    expect(text()).toContain('Ana Garcia');
    expect(text()).toContain('22/09/2026 · Transferencia');
    expect(text()).toContain('$7.000');
  }));

  it('should show "Cargando…" while there is no data yet', fakeAsync(() => {
    fixture.detectChanges();
    tick(300);
    fixture.detectChanges();

    expect(text()).toContain('Cargando…');
    paymentsRequest().flush(pageOf([]));
  }));

  it('should wait for a pause before searching, and ask only once', fakeAsync(() => {
    enter();

    search('a', 100);
    search('an', 100);
    search('ana');

    const request = paymentsRequest();
    expect(request.request.params.get('search')).toBe('ana');
    request.flush(pageOf([]));
  }));

  it('should not ask again for a trailing space', fakeAsync(() => {
    enter();
    search('ana');
    paymentsRequest().flush(pageOf([]));

    search('ana ');

    expect(httpMock.match((req) => req.url === '/api/payments').length).toBe(0);
  }));

  it('should cancel a pending search when the criteria changes', fakeAsync(() => {
    enter();

    search('an');
    const stale = paymentsRequest();

    search('ana');
    expect(stale.cancelled).toBeTrue();

    paymentsRequest().flush(pageOf([payment(2, 'Ana', 'Garcia')]));
    fixture.detectChanges();

    expect(text()).toContain('Ana Garcia');
  }));

  it('should filter by method keeping the search, and "Todos" should clear it', fakeAsync(() => {
    enter();
    expect(chip('Todos').getAttribute('aria-pressed')).toBe('true');

    search('garcia');
    paymentsRequest().flush(pageOf([]));

    clickChip('Efectivo');
    const byMethod = paymentsRequest();
    expect(byMethod.request.params.get('payment_method')).toBe('CASH');
    expect(byMethod.request.params.get('search')).toBe('garcia');
    byMethod.flush(pageOf([]));
    fixture.detectChanges();
    expect(chip('Efectivo').getAttribute('aria-pressed')).toBe('true');
    expect(chip('Todos').getAttribute('aria-pressed')).toBe('false');

    clickChip('Todos');
    const all = paymentsRequest();
    expect(all.request.params.has('payment_method')).toBeFalse();
    all.flush(pageOf([]));
  }));

  it('should append the next page, and show the total at the end', fakeAsync(() => {
    enter([payment(1, 'Ana', 'Garcia')], { last: false, total_elements: 2 });
    expect(chip('Cargar más')).toBeTruthy();

    fixture.componentInstance.loadMore();
    const next = paymentsRequest();
    expect(next.request.params.get('page')).toBe('1');
    next.flush(pageOf([payment(2, 'Beto', 'Lopez')], { total_elements: 2 }));
    fixture.detectChanges();

    expect(text()).toContain('Ana Garcia');
    expect(text()).toContain('Beto Lopez');
    expect(text()).toContain('2 pagos');
    expect(chip('Cargar más')).toBeUndefined();
  }));

  it('should say "1 pago" in singular', fakeAsync(() => {
    enter([payment(1, 'Ana', 'Garcia')]);

    expect(text()).toContain('1 pago');
    expect(text()).not.toContain('1 pagos');
  }));

  it('should replace the list and go back to the first page on a new chip', fakeAsync(() => {
    enter([payment(1, 'Ana', 'Garcia')], { last: false, total_elements: 2 });
    fixture.componentInstance.loadMore();
    paymentsRequest().flush(pageOf([payment(2, 'Beto', 'Lopez')], { total_elements: 2 }));
    fixture.detectChanges();

    clickChip('Débito');
    const request = paymentsRequest();
    expect(request.request.params.get('page')).toBe('0');
    request.flush(pageOf([payment(3, 'Carla', 'Diaz', 'DEBIT')]));
    fixture.detectChanges();

    expect(text()).toContain('Carla Diaz');
    expect(text()).not.toContain('Ana Garcia');
    expect(text()).not.toContain('Beto Lopez');
  }));

  it('should say so when nothing matches', fakeAsync(() => {
    enter();

    expect(text()).toContain('No hay pagos que coincidan.');
  }));

  it('should keep asking after an error', fakeAsync(() => {
    fixture.detectChanges();
    tick(300);
    paymentsRequest().flush('boom', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(text()).toContain('No se pudieron cargar los pagos.');

    clickChip('Transferencia');
    paymentsRequest().flush(pageOf([payment(1, 'Ana', 'Garcia', 'TRANSFER')]));
    fixture.detectChanges();

    expect(text()).toContain('Ana Garcia');
    expect(text()).not.toContain('No se pudieron cargar');
  }));

  it('should not skip a page when loading more fails', fakeAsync(() => {
    enter([payment(1, 'Ana', 'Garcia')], { last: false });

    fixture.componentInstance.loadMore();
    paymentsRequest().flush('boom', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    fixture.componentInstance.loadMore();
    const retry = paymentsRequest();
    expect(retry.request.params.get('page')).toBe('1');
    retry.flush(pageOf([payment(2, 'Beto', 'Lopez')]));
  }));
});
