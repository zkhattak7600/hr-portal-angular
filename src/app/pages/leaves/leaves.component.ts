import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { EmployeeService } from '../../core/services/employee.service';
import { LeaveService } from '../../core/services/leave.service';
import { UiService } from '../../core/services/ui.service';
import { Employee, Leave, LeaveStatus, LeaveType } from '../../core/models/hr.models';
import { apiError, dateOnly, dayCount, toIsoDate } from '../../core/utils/format';
import { StateComponent } from '../../shared/state.component';
import { PaginationComponent, paginate } from '../../shared/pagination.component';

function dateRange(g: AbstractControl): ValidationErrors | null {
  const s = g.get('startDate')?.value as string;
  const e = g.get('endDate')?.value as string;
  return s && e && e < s ? { range: true } : null;
}

@Component({
  selector: 'app-leaves',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, StateComponent, PaginationComponent],
  templateUrl: './leaves.component.html'
})
export class LeavesComponent implements OnInit {
  private readonly api = inject(LeaveService);
  private readonly empApi = inject(EmployeeService);
  private readonly ui = inject(UiService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly isAdmin = computed(() => this.auth.currentUser()?.role === 'Admin');
  readonly dateOnly = dateOnly;
  readonly types: LeaveType[] = ['Annual', 'Sick', 'Casual', 'Unpaid'];
  readonly tabs: { value: '' | LeaveStatus; label: string }[] = [
    { value: 'Pending', label: 'Pending' }, { value: 'Approved', label: 'Approved' },
    { value: 'Rejected', label: 'Rejected' }, { value: '', label: 'All' }
  ];

  readonly items = signal<Leave[]>([]);
  // client-side pagination
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly pagedItems = computed(() => paginate(this.items(), this.page(), this.pageSize()));
  setPageSize(s: number): void { this.pageSize.set(s); this.page.set(1); }
  readonly employees = signal<Employee[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly applyOpen = signal(false);
  readonly saving = signal(false);
  readonly formError = signal('');
  readonly review = signal<{ leave: Leave; action: 'approve' | 'reject' } | null>(null);
  remarks = '';

  status: '' | LeaveStatus = 'Pending';
  employeeId = '';

  readonly form = this.fb.nonNullable.group({
    employeeId: [0, [Validators.min(1)]],
    leaveType: ['Annual' as LeaveType, Validators.required],
    startDate: [toIsoDate(), Validators.required],
    endDate: [toIsoDate(), Validators.required],
    reason: ['', [Validators.required, Validators.maxLength(500)]]
  }, { validators: dateRange });

  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly days = computed(() => dayCount(this.formValue().startDate ?? '', this.formValue().endDate ?? ''));

  ngOnInit(): void {
    if (!this.isBrowser) return;
    this.empApi.list().subscribe({ next: e => this.employees.set(e), error: () => {} });
    this.load();
  }

  setTab(s: '' | LeaveStatus): void { this.status = s; this.load(); }

  load(): void {
    this.page.set(1);
    this.loading.set(true);
    this.error.set('');
    this.api.list({ status: this.status, employeeId: this.employeeId }).subscribe({
      next: d => { this.items.set(d); this.loading.set(false); },
      error: e => { this.error.set(apiError(e, 'Could not load leave requests.')); this.loading.set(false); }
    });
  }

  openApply(): void {
    this.form.reset({ employeeId: 0, leaveType: 'Annual', startDate: toIsoDate(), endDate: toIsoDate(), reason: '' });
    this.formError.set('');
    this.applyOpen.set(true);
  }

  invalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.touched && c.invalid;
  }

  apply(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.api.create({ ...v, employeeId: Number(v.employeeId), reason: v.reason.trim() }).subscribe({
      next: () => {
        this.saving.set(false);
        this.applyOpen.set(false);
        this.ui.success('Leave request submitted.');
        this.load();
      },
      error: e => { this.saving.set(false); this.formError.set(apiError(e)); }
    });
  }

  openReview(leave: Leave, action: 'approve' | 'reject'): void {
    this.remarks = '';
    this.review.set({ leave, action });
  }

  submitReview(): void {
    const r = this.review();
    if (!r) return;
    this.saving.set(true);
    const req = r.action === 'approve' ? this.api.approve(r.leave.id, this.remarks.trim()) : this.api.reject(r.leave.id, this.remarks.trim());
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.review.set(null);
        this.ui.success(r.action === 'approve' ? 'Leave approved.' : 'Leave rejected.');
        this.load();
      },
      error: e => { this.saving.set(false); this.ui.error(apiError(e)); }
    });
  }

  async remove(l: Leave): Promise<void> {
    if (!(await this.ui.confirm(`Delete the pending ${l.leaveType} leave of ${l.employeeName}?`, { confirmText: 'Delete' }))) return;
    this.api.delete(l.id).subscribe({
      next: () => { this.ui.success('Leave request deleted.'); this.load(); },
      error: e => this.ui.error(apiError(e, 'Could not delete leave request.'))
    });
  }
}
