import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Department, DepartmentSave } from '../models/hr.models';

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/departments`;

  list(): Observable<Department[]> { return this.http.get<Department[]>(this.url); }
  get(id: number): Observable<Department> { return this.http.get<Department>(`${this.url}/${id}`); }
  create(body: DepartmentSave): Observable<Department> { return this.http.post<Department>(this.url, body); }
  update(id: number, body: DepartmentSave): Observable<Department> { return this.http.put<Department>(`${this.url}/${id}`, body); }
  delete(id: number): Observable<void> { return this.http.delete<void>(`${this.url}/${id}`); }
}
