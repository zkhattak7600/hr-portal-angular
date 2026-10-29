import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Leave, LeaveCreate } from '../models/hr.models';
import { toParams } from '../utils/http-params';

@Injectable({ providedIn: 'root' })
export class LeaveService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/leaves`;

  list(q?: { employeeId?: number | string | null; status?: string | null }): Observable<Leave[]> {
    return this.http.get<Leave[]>(this.url, { params: toParams({ ...q }) });
  }
  get(id: number): Observable<Leave> { return this.http.get<Leave>(`${this.url}/${id}`); }
  create(body: LeaveCreate): Observable<Leave> { return this.http.post<Leave>(this.url, body); }
  delete(id: number): Observable<void> { return this.http.delete<void>(`${this.url}/${id}`); }
  approve(id: number, remarks: string): Observable<Leave> { return this.http.put<Leave>(`${this.url}/${id}/approve`, { remarks }); }
  reject(id: number, remarks: string): Observable<Leave> { return this.http.put<Leave>(`${this.url}/${id}/reject`, { remarks }); }
}
