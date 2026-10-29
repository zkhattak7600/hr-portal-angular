import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Attendance, AttendanceSummary, Employee, Leave, LeaveBalance, LeaveType, MyAttendanceToday, MyDashboard, Payslip } from '../models/hr.models';
import { toParams } from '../utils/http-params';

export interface MyLeaveCreate { leaveType: LeaveType; startDate: string; endDate: string; reason: string; }

/** Self-service API for the logged-in employee (/api/me). */
@Injectable({ providedIn: 'root' })
export class MeService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/me`;

  profile(): Observable<Employee> { return this.http.get<Employee>(`${this.url}/profile`); }
  dashboard(): Observable<MyDashboard> { return this.http.get<MyDashboard>(`${this.url}/dashboard`); }
  leaves(): Observable<Leave[]> { return this.http.get<Leave[]>(`${this.url}/leaves`); }
  leaveBalance(year?: number): Observable<LeaveBalance[]> {
    return this.http.get<LeaveBalance[]>(`${this.url}/leave-balance`, { params: toParams({ year }) });
  }
  applyLeave(body: MyLeaveCreate): Observable<Leave> { return this.http.post<Leave>(`${this.url}/leaves`, body); }
  cancelLeave(id: number): Observable<void> { return this.http.delete<void>(`${this.url}/leaves/${id}`); }
  attendance(month: number, year: number): Observable<Attendance[]> {
    return this.http.get<Attendance[]>(`${this.url}/attendance`, { params: toParams({ month, year }) });
  }
  attendanceSummary(month: number, year: number): Observable<AttendanceSummary> {
    return this.http.get<AttendanceSummary>(`${this.url}/attendance/summary`, { params: toParams({ month, year }) });
  }
  attendanceToday(): Observable<MyAttendanceToday | null> { return this.http.get<MyAttendanceToday | null>(`${this.url}/attendance/today`); }
  checkIn(): Observable<MyAttendanceToday> { return this.http.post<MyAttendanceToday>(`${this.url}/attendance/check-in`, {}); }
  checkOut(): Observable<MyAttendanceToday> { return this.http.post<MyAttendanceToday>(`${this.url}/attendance/check-out`, {}); }
  payslips(): Observable<Payslip[]> { return this.http.get<Payslip[]>(`${this.url}/payslips`); }
  payslip(id: number): Observable<Payslip> { return this.http.get<Payslip>(`${this.url}/payslips/${id}`); }
  uploadPhoto(file: File): Observable<{ photoUrl: string | null }> {
    const fd = new FormData();
    fd.append('file', file, file.name);
    return this.http.post<{ photoUrl: string | null }>(`${this.url}/photo`, fd);
  }
  deletePhoto(): Observable<{ photoUrl: string | null }> { return this.http.delete<{ photoUrl: string | null }>(`${this.url}/photo`); }
}

/** True when the API says no employee profile is linked. */
export function isNoProfile(err: unknown): boolean {
  const e = err as { status?: number; error?: { message?: string } };
  return e?.status === 404 && !!e.error?.message?.startsWith('No employee profile');
}
