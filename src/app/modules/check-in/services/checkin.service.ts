import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PageResponse } from '../../../shared/models/page-response.model';
import { Checkin } from '../models/checkin.model';

/** Filtros del endpoint de búsqueda. Todos opcionales, igual que en el backend. */
export interface CheckinSearch {
  memberId?: number;
  /** true solo permitidos, false solo rechazados, omitido para ambos. */
  success?: boolean;
  /** Desde, inclusive. */
  from?: string;
  /** Hasta, exclusive. */
  to?: string;
  page?: number;
  size?: number;
}

@Injectable({ providedIn: 'root' })
export class CheckinService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/checkins`;

  searchCheckins(search: CheckinSearch = {}): Observable<PageResponse<Checkin>> {
    return this.http.get<PageResponse<Checkin>>(this.baseUrl, { params: buildParams(search) });
  }
}

function buildParams(search: CheckinSearch): HttpParams {
  const entries: [string, string | number | boolean | undefined][] = [
    ['member_id', search.memberId],
    ['success', search.success],
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
