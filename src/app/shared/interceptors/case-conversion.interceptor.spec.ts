import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { caseConversionInterceptor } from './case-conversion.interceptor';

describe('caseConversionInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([caseConversionInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should turn response keys into camelCase', () => {
    let body: unknown;
    http.get('/api/members/1').subscribe((response) => (body = response));

    httpMock.expectOne('/api/members/1').flush({ id: 1, last_name: 'Garcia', expiration_date: null });

    expect(body).toEqual({ id: 1, lastName: 'Garcia', expirationDate: null });
  });

  it('should reach into arrays and nested objects', () => {
    let body: unknown;
    http.get('/api/payments').subscribe((response) => (body = response));

    httpMock.expectOne('/api/payments').flush({
      content: [{ member_id: 7, payment_method: 'CASH' }],
      total_elements: 1,
    });

    expect(body).toEqual({
      content: [{ memberId: 7, paymentMethod: 'CASH' }],
      totalElements: 1,
    });
  });

  it('should turn request bodies into snake_case', () => {
    http.post('/api/members', { id: 1, lastName: 'Garcia', phoneNumber: '351' }).subscribe();

    const request = httpMock.expectOne('/api/members');

    expect(request.request.body).toEqual({ id: 1, last_name: 'Garcia', phone_number: '351' });
    request.flush({});
  });

  it('should leave requests to other origins alone', () => {
    let body: unknown;
    http.get('https://example.com/thing').subscribe((response) => (body = response));

    httpMock.expectOne('https://example.com/thing').flush({ left_alone: true });

    expect(body).toEqual({ left_alone: true });
  });

  it('should not touch values, only keys', () => {
    let body: unknown;
    http.get('/api/payments').subscribe((response) => (body = response));

    httpMock
      .expectOne('/api/payments')
      .flush({ payment_method: 'CASH', payment_date: '2026-08-01 10:05:00', amount: 7000 });

    expect(body).toEqual({
      paymentMethod: 'CASH',
      paymentDate: '2026-08-01 10:05:00',
      amount: 7000,
    });
  });
});
