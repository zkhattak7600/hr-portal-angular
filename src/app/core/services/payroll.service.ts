import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PayrollGenerate, PayrollGenerateResult, Payslip, PayslipCreate, PayslipUpdate } from '../models/hr.models';
import { toParams } from '../utils/http-params';

@Injectable({ providedIn: 'root' })
export class PayrollService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/payroll`;

  list(q?: { month?: number | null; year?: number | null; employeeId?: number | string | null }): Observable<Payslip[]> {
    return this.http.get<Payslip[]>(this.url, { params: toParams({ ...q }) });
  }
  get(id: number): Observable<Payslip> { return this.http.get<Payslip>(`${this.url}/${id}`); }
  generate(body: PayrollGenerate): Observable<PayrollGenerateResult> { return this.http.post<PayrollGenerateResult>(`${this.url}/generate`, body); }
  create(body: PayslipCreate): Observable<Payslip> { return this.http.post<Payslip>(this.url, body); }
  update(id: number, body: PayslipUpdate): Observable<Payslip> { return this.http.put<Payslip>(`${this.url}/${id}`, body); }
  pay(id: number): Observable<Payslip> { return this.http.put<Payslip>(`${this.url}/${id}/pay`, {}); }
  delete(id: number): Observable<void> { return this.http.delete<void>(`${this.url}/${id}`); }
}
