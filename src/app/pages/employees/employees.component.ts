import { isPlatformBrowser } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { DepartmentService } from '../../core/services/department.service';
import { EmployeeService } from '../../core/services/employee.service';
import { UiService } from '../../core/services/ui.service';
import { Department, Employee, EmployeeSave, EmployeeStatus } from '../../core/models/hr.models';
import { apiError, dateOnly, toIsoDate } from '../../core/utils/format';
import { PkrPipe } from '../../shared/pkr.pipe';
import { StateComponent } from '../../shared/state.component';
import { AvatarComponent } from '../../shared/avatar.component';
import { validatePhoto } from '../../core/utils/photo';
import { PaginationComponent, paginate } from '../../shared/pagination.component';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, StateComponent, PkrPipe, AvatarComponent, PaginationComponent],
  templateUrl: './employees.component.html'
})
export class EmployeesComponent implements OnInit, OnDestroy {
  private readonly api = inject(EmployeeService);
  private readonly deptApi = inject(DepartmentService);
  private readonly ui = inject(UiService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly search$ = new Subject<void>();
  private sub?: Subscription;

  readonly isAdmin = computed(() => this.auth.currentUser()?.role === 'Admin');
  readonly dateOnly = dateOnly;
  readonly items = signal<Employee[]>([]);
  // client-side pagination
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly pagedItems = computed(() => paginate(this.items(), this.page(), this.pageSize()));
  setPageSize(s: number): void { this.pageSize.set(s); this.page.set(1); }
  readonly departments = signal<Department[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly modalOpen = signal(false);
  readonly saving = signal(false);
  readonly formError = signal('');
  readonly viewing = signal<Employee | null>(null);
  readonly photoBusy = signal(false);
  editing: Employee | null = null;

  search = '';
  departmentId = '';
  status = '';

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(50)]],
    lastName: ['', [Validators.required, Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.pattern(/^[0-9+\-\s()]{7,20}$/)]],
    designation: ['', [Validators.maxLength(100)]],
    departmentId: [0, [Validators.required, Validators.min(1)]],
    joiningDate: [toIsoDate(), [Validators.required]],
    basicSalary: [0, [Validators.required, Validators.min(0)]],
    status: ['Active' as EmployeeStatus, [Validators.required]]
  });

  ngOnInit(): void {
    if (!this.isBrowser) return;
    this.sub = this.search$.pipe(debounceTime(300)).subscribe(() => this.load());
    this.deptApi.list().subscribe({ next: d => this.departments.set(d), error: () => {} });
    this.load();
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  onSearch(): void { this.page.set(1); this.search$.next(); }

  clearFilters(): void { this.search = ''; this.departmentId = ''; this.status = ''; this.load(); }

  load(): void {
    this.page.set(1);
    this.loading.set(true);
    this.error.set('');
    this.api.list({ search: this.search.trim(), departmentId: this.departmentId, status: this.status }).subscribe({
      next: d => { this.items.set(d); this.loading.set(false); },
      error: e => { this.error.set(apiError(e, 'Could not load employees.')); this.loading.set(false); }
    });
  }

  openAdd(): void {
    this.editing = null;
    this.form.reset({
      firstName: '', lastName: '', email: '', phone: '', designation: '',
      departmentId: 0, joiningDate: toIsoDate(), basicSalary: 0, status: 'Active'
    });
    this.formError.set('');
    this.modalOpen.set(true);
  }

  openEdit(e: Employee): void {
    this.editing = e;
    this.viewing.set(null);
    this.form.reset({
      firstName: e.firstName, lastName: e.lastName, email: e.email, phone: e.phone ?? '',
      designation: e.designation ?? '', departmentId: e.departmentId, joiningDate: dateOnly(e.joiningDate),
      basicSalary: e.basicSalary, status: e.status
    });
    this.formError.set('');
    this.modalOpen.set(true);
  }

  invalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.touched && c.invalid;
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const body: EmployeeSave = {
      firstName: v.firstName.trim(), lastName: v.lastName.trim(), email: v.email.trim(),
      phone: v.phone.trim() || null, designation: v.designation.trim() || null,
      departmentId: Number(v.departmentId), joiningDate: v.joiningDate,
      basicSalary: Number(v.basicSalary), status: v.status, userId: this.editing?.userId ?? null
    };
    this.saving.set(true);
    const req = this.editing ? this.api.update(this.editing.id, body) : this.api.create(body);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.ui.success(this.editing ? 'Employee updated.' : 'Employee added.');
        this.load();
      },
      error: e => { this.saving.set(false); this.formError.set(apiError(e)); }
    });
  }

  private applyPhoto(id: number, photoUrl: string | null): void {
    this.items.update(list => list.map(x => (x.id === id ? { ...x, photoUrl } : x)));
    const v = this.viewing();
    if (v?.id === id) this.viewing.set({ ...v, photoUrl });
    const me = this.auth.currentUser();
    if (me?.employeeId === id) this.auth.setPhotoUrl(photoUrl);
  }

  onPhoto(e: Employee, ev: Event): void {
    const inputEl = ev.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    inputEl.value = '';
    if (!file) return;
    const err = validatePhoto(file);
    if (err) { this.ui.error(err); return; }
    this.photoBusy.set(true);
    this.api.uploadPhoto(e.id, file).subscribe({
      next: r => { this.photoBusy.set(false); this.applyPhoto(e.id, r.photoUrl); this.ui.success('Photo updated.'); },
      error: x => { this.photoBusy.set(false); this.ui.error(apiError(x, 'Could not upload photo.')); }
    });
  }

  async removePhoto(e: Employee): Promise<void> {
    if (!(await this.ui.confirm(`Remove photo for ${e.fullName}?`, { confirmText: 'Remove' }))) return;
    this.photoBusy.set(true);
    this.api.deletePhoto(e.id).subscribe({
      next: () => { this.photoBusy.set(false); this.applyPhoto(e.id, null); this.ui.success('Photo removed.'); },
      error: x => { this.photoBusy.set(false); this.ui.error(apiError(x, 'Could not remove photo.')); }
    });
  }

  async remove(e: Employee): Promise<void> {
    if (!(await this.ui.confirm(`Delete employee ${e.fullName} (${e.employeeCode})? This cannot be undone.`, { confirmText: 'Delete' }))) return;
    this.api.delete(e.id).subscribe({
      next: () => { this.ui.success('Employee deleted.'); this.viewing.set(null); this.load(); },
      error: err => this.ui.error(apiError(err, 'Could not delete employee.'))
    });
  }

  /** Row kebab menu (same pattern as Payroll): position:fixed so table-wrap overflow can't clip it. */
  readonly rowMenu = signal<{ r: Employee; top: number | null; bottom: number | null; left: number } | null>(null);

  toggleRowMenu(r: Employee, ev: MouseEvent): void {
    if (!this.isBrowser) return;
    if (this.rowMenu()?.r.id === r.id) { this.rowMenu.set(null); return; }
    const b = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const width = 176, approxHeight = 150;
    const left = Math.max(8, Math.min(b.right - width, window.innerWidth - width - 8));
    const flip = b.bottom + approxHeight > window.innerHeight;
    this.rowMenu.set({ r, left, top: flip ? null : b.bottom + 4, bottom: flip ? window.innerHeight - b.top + 4 : null });
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent): void {
    if (!this.rowMenu()) return;
    const t = ev.target as HTMLElement | null;
    if (t?.closest?.('.row-menu, .kebab-btn')) return;
    this.rowMenu.set(null);
  }

  @HostListener('document:keydown.escape')
  @HostListener('window:resize')
  @HostListener('window:scroll')
  closeRowMenu(): void { if (this.rowMenu()) this.rowMenu.set(null); }
}