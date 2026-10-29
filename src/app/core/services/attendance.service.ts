import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Attendance, AttendanceSave, AttendanceSummary } from '../models/hr.models';
import { toParams } from '../utils/http-params';

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/attendance`;

  list(q?: { employeeId?: number | string | null; from?: string; to?: string; date?: string }): Observable<Attendance[]> {
    return this.http.get<Attendance[]>(this.url, { params: toParams({ ...q }) });
  }
  get(id: number): Observable<Attendance> { return this.http.get<Attendance>(`${this.url}/${id}`); }
  summary(employeeId: number, month: number, year: number): Observable<AttendanceSummary> {
    return this.http.get<AttendanceSummary>(`${this.url}/summary`, { params: toParams({ employeeId, month, year }) });
  }
  create(body: AttendanceSave): Observable<Attendance> { return this.http.post<Attendance>(this.url, body); }
  update(id: number, body: AttendanceSave): Observable<Attendance> { return this.http.put<Attendance>(`${this.url}/${id}`, body); }
  delete(id: number): Observable<void> { return this.http.delete<void>(`${this.url}/${id}`); }
}
