import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Employee, EmployeeQuery, EmployeeSave } from '../models/hr.models';
import { toParams } from '../utils/http-params';

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/employees`;

  list(q?: EmployeeQuery): Observable<Employee[]> { return this.http.get<Employee[]>(this.url, { params: toParams({ ...q }) }); }
  get(id: number): Observable<Employee> { return this.http.get<Employee>(`${this.url}/${id}`); }
  create(body: EmployeeSave): Observable<Employee> { return this.http.post<Employee>(this.url, body); }
  update(id: number, body: EmployeeSave): Observable<Employee> { return this.http.put<Employee>(`${this.url}/${id}`, body); }
  delete(id: number): Observable<void> { return this.http.delete<void>(`${this.url}/${id}`); }
  uploadPhoto(id: number, file: File): Observable<{ photoUrl: string | null }> {
    const fd = new FormData();
    fd.append('file', file, file.name);
    return this.http.post<{ photoUrl: string | null }>(`${this.url}/${id}/photo`, fd);
  }
  deletePhoto(id: number): Observable<{ photoUrl: string | null }> { return this.http.delete<{ photoUrl: string | null }>(`${this.url}/${id}/photo`); }
}
