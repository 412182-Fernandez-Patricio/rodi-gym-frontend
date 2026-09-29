import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PaymentService } from './payment.service';
import { caseConversionInterceptor } from '../../../shared/interceptors/case-conversion.interceptor';

describe('PaymentService', () => {
  let service: PaymentService;
  let httpMock: HttpTestingController;

  const emptyPage = {
    content: [],
    page: 0,
    size: 20,
    total_elements: 0,
    total_pages: 0,
    last: true,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([caseConversionInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(PaymentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should send the search trimmed, next to the other filters', () => {
    service.searchPayments({ search: '  garcia ', paymentMethod: 'CASH' }).subscribe();

    const request = httpMock.expectOne((req) => req.url === '/api/payments');
    expect(request.request.params.get('search')).toBe('garcia');
    expect(request.request.params.get('payment_method')).toBe('CASH');
    request.flush(emptyPage);
  });

  it('should not send a blank search', () => {
    service.searchPayments({ search: '   ' }).subscribe();

    const request = httpMock.expectOne((req) => req.url === '/api/payments');
    expect(request.request.params.has('search')).toBeFalse();
    request.flush(emptyPage);
  });

  it('should create a payment sending the body in snake_case', () => {
    service.createPayment({ memberId: 30111222, paymentMethod: 'DEBIT' }).subscribe();

    const request = httpMock.expectOne('/api/payments');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ member_id: 30111222, payment_method: 'DEBIT' });
    request.flush(null, { status: 201, statusText: 'Created' });
  });

  it('should bring the member name in camelCase', () => {
    let names: string[] = [];

    service
      .searchPayments()
      .subscribe((page) => (names = page.content.map((p) => `${p.memberName} ${p.memberLastName}`)));

    httpMock.expectOne((req) => req.url === '/api/payments').flush({
      ...emptyPage,
      content: [
        {
          id: 34,
          member_id: 30111222,
          member_name: 'Ana',
          member_last_name: 'Garcia',
          amount: 7000.0,
          payment_date: '2026-09-22 10:05:00',
          payment_method: 'CASH',
        },
      ],
    });

    expect(names).toEqual(['Ana Garcia']);
  });
});
