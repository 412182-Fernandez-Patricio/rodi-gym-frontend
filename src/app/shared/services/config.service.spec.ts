import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ConfigService } from './config.service';
import { caseConversionInterceptor } from '../interceptors/case-conversion.interceptor';

describe('ConfigService', () => {
  it('should turn the monthly price text into a number', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([caseConversionInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    const httpMock = TestBed.inject(HttpTestingController);
    let price: number | undefined;

    TestBed.inject(ConfigService)
      .getMonthlyPrice()
      .subscribe((value) => (price = value));
    httpMock.expectOne('/api/config/monthly-price').flush({ key: 'monthly_price', value: '7000.0' });

    expect(price).toBe(7000);
    httpMock.verify();
  });
});
