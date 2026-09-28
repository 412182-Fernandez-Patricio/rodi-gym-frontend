import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PageResponse } from '../../../shared/models/page-response.model';
import { Member, MemberCreate, MemberStatus } from '../models/member.model';

/** Filtros del endpoint de búsqueda. Todos opcionales, igual que en el backend. */
export interface MemberSearch {
  /** Texto libre: busca en nombre, apellido, nombre completo y DNI. */
  search?: string;
  status?: MemberStatus;
  page?: number;
  size?: number;
}

@Injectable({ providedIn: 'root' })
export class MemberService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/members`;

  searchMembers(search: MemberSearch = {}): Observable<PageResponse<Member>> {
    return this.http.get<PageResponse<Member>>(this.baseUrl, { params: buildParams(search) });
  }

  getMember(id: number): Observable<Member> {
    return this.http.get<Member>(`${this.baseUrl}/${id}`);
  }

  /** Responde 201 con el socio, sin membresía; 409 si el DNI ya existe. */
  createMember(member: MemberCreate): Observable<Member> {
    return this.http.post<Member>(this.baseUrl, member);
  }
}

function buildParams(search: MemberSearch): HttpParams {
  const entries: [string, string | number | undefined][] = [
    ['search', search.search?.trim() || undefined],
    // El backend nombra los estados en mayúsculas.
    ['status', search.status?.toUpperCase()],
    ['page', search.page],
    ['size', search.size],
  ];

  return entries.reduce(
    (params, [key, value]) => (value === undefined ? params : params.set(key, value)),
    new HttpParams(),
  );
}
