import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Member, MemberDto, mapMemberFromDto } from '../models/member.model';

@Injectable({ providedIn: 'root' })
export class MemberService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/members`;

  getMembers(): Observable<Member[]> {
    return this.http
      .get<MemberDto[]>(this.baseUrl)
      .pipe(map((dtos) => dtos.map(mapMemberFromDto)));
  }

  getMember(id: number): Observable<Member> {
    return this.http
      .get<MemberDto>(`${this.baseUrl}/${id}`)
      .pipe(map(mapMemberFromDto));
  }
}
