import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AttendanceDay } from '../models/attendance.model';

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly http = inject(HttpClient);

  /**
   * Días con actividad de un socio en un mes.
   *
   * @param memberId socio a consultar.
   * @param month mes en formato aaaa-mm.
   */
  getAttendance(memberId: number, month: string): Observable<AttendanceDay[]> {
    return this.http.get<AttendanceDay[]>(
      `${environment.apiUrl}/members/${memberId}/attendance`,
      { params: new HttpParams().set('month', month) },
    );
  }
}
