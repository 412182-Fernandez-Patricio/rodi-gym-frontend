import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PageResponse } from '../../../shared/models/page-response.model';
import { Payment, PaymentMethod } from '../models/payment.model';

/** Filtros del endpoint de búsqueda. Todos opcionales, igual que en el backend. */
export interface PaymentSearch {
  memberId?: number;
  paymentMethod?: PaymentMethod;
  /** Desde, inclusive. */
  from?: string;
  /** Hasta, exclusive. */
  to?: string;
  page?: number;
  size?: number;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/payments`;

  searchPayments(search: PaymentSearch = {}): Observable<PageResponse<Payment>> {
    return this.http.get<PageResponse<Payment>>(this.baseUrl, { params: buildParams(search) });
  }
}

function buildParams(search: PaymentSearch): HttpParams {
  const entries: [string, string | number | undefined][] = [
    ['member_id', search.memberId],
    ['payment_method', search.paymentMethod],
    ['from', search.from],
    ['to', search.to],
    ['page', search.page],
    ['size', search.size],
  ];

  return entries.reduce(
    (params, [key, value]) => (value === undefined ? params : params.set(key, value)),
    new HttpParams(),
  );
}
