import { isPlatformBrowser } from '@angular/common';
import { Component, HostListener, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { AttendanceService } from '../../core/services/attendance.service';
import { EmployeeService } from '../../core/services/employee.service';
import { UiService } from '../../core/services/ui.service';
import { Attendance, AttendanceSave, AttendanceStatus, AttendanceSummary, Employee } from '../../core/models/hr.models';
import { MONTHS, apiError, dateOnly, time12, timeOnly, toIsoDate } from '../../core/utils/format';
import { StateComponent } from '../../shared/state.component';
import { PaginationComponent, paginate } from '../../shared/pagination.component';

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, StateComponent, PaginationComponent],
  templateUrl: './attendance.component.html'
})
export class AttendanceComponent implements OnInit {
  private readonly api = inject(AttendanceService);
  private readonly empApi = inject(EmployeeService);
  private readonly ui = inject(UiService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly isAdmin = computed(() => this.auth.currentUser()?.role === 'Admin');
  readonly timeOnly = time12;
  readonly dateOnly = dateOnly;
  readonly months = MONTHS;
  readonly statuses: AttendanceStatus[] = ['Present', 'Absent', 'Late', 'HalfDay', 'Leave'];
  readonly years: number[];

  readonly view = signal<'daily' | 'summary'>('daily');
  readonly items = signal<Attendance[]>([]);
  readonly employees = signal<Employee[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly modalOpen = signal(false);
  readonly saving = signal(false);
  readonly formError = signal('');
  editingId: number | null = null;

  date = toIsoDate();

  // summary
  sumEmployeeId = 0;
  sumMonth = new Date().getMonth() + 1;
  sumYear = new Date().getFullYear();
  readonly summary = signal<AttendanceSummary | null>(null);
  readonly sumLoading = signal(false);
  readonly sumError = signal('');
  readonly sumItems = signal<Attendance[]>([]);

  // client-side pagination
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly pagedItems = computed(() => paginate(this.items(), this.page(), this.pageSize()));
  readonly sumPage = signal(1);
  readonly sumPageSize = signal(10);
  readonly pagedSumItems = computed(() => paginate(this.sumItems(), this.sumPage(), this.sumPageSize()));

  readonly form = this.fb.nonNullable.group({
    employeeId: [0, [Validators.min(1)]],
    date: [toIsoDate(), Validators.required],
    status: ['Present' as AttendanceStatus, Validators.required],
    checkIn: ['09:00'],
    checkOut: ['17:00'],
    notes: ['', Validators.maxLength(250)]
  });

  constructor() {
    const y = new Date().getFullYear();
    this.years = [y - 2, y - 1, y, y + 1];
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;
    this.empApi.list().subscribe({
      next: e => {
        this.employees.set(e);
        if (!this.sumEmployeeId && e.length) this.sumEmployeeId = e[0].id;
      },
      error: () => {}
    });
    this.load();
  }

  isOff(a: Attendance): boolean { return (a.status as string) === 'Off'; }

  dayName(v: string): string {
    const d = new Date(dateOnly(v) + 'T00:00:00');
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { weekday: 'long' });
  }

  isWeekendDate(v: string): boolean {
    const d = new Date(dateOnly(v) + 'T00:00:00');
    return d.getDay() === 0 || d.getDay() === 6;
  }

  /** Adds Saturday/Sunday "Off" rows (up to today), sorted by date. */
  private withWeekends(list: Attendance[], month: number, year: number): Attendance[] {
    const have = new Set(list.map(a => dateOnly(a.date)));
    const extra: Attendance[] = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = new Date(year, month, 0).getDate();
    for (let i = 1; i <= days; i++) {
      const d = new Date(year, month - 1, i);
      if (d > today) break;
      const iso = toIsoDate(d);
      if ((d.getDay() === 0 || d.getDay() === 6) && !have.has(iso)) {
        extra.push({ ...(list[0] ?? {}), id: -i, date: iso, status: 'Off', checkIn: null, checkOut: null, notes: null } as unknown as Attendance);
      }
    }
    return [...list, ...extra].sort((a, b) => dateOnly(a.date).localeCompare(dateOnly(b.date)));
  }

  setPageSize(s: number): void { this.pageSize.set(s); this.page.set(1); }
  setSumPageSize(s: number): void { this.sumPageSize.set(s); this.sumPage.set(1); }

  shiftDay(delta: number): void {
    const d = new Date(this.date + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    this.date = toIsoDate(d);
    this.load();
  }

  today(): void { this.date = toIsoDate(); this.load(); }

  load(): void {
    if (!this.date) return;
    this.page.set(1);
    this.loading.set(true);
    this.error.set('');
    this.api.list({ date: this.date }).subscribe({
      next: d => { this.items.set(d); this.loading.set(false); },
      error: e => { this.error.set(apiError(e, 'Could not load attendance.')); this.loading.set(false); }
    });
  }

  openAdd(): void {
    this.editingId = null;
    this.form.reset({ employeeId: 0, date: this.date, status: 'Present', checkIn: '09:00', checkOut: '17:00', notes: '' });
    this.formError.set('');
    this.modalOpen.set(true);
  }

  openEdit(a: Attendance): void {
    this.editingId = a.id;
    this.form.reset({
      employeeId: a.employeeId, date: dateOnly(a.date), status: a.status,
      checkIn: timeOnly(a.checkIn), checkOut: timeOnly(a.checkOut), notes: a.notes ?? ''
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
    const noTimes = v.status === 'Absent' || v.status === 'Leave';
    const body: AttendanceSave = {
      employeeId: Number(v.employeeId), date: v.date, status: v.status,
      checkIn: noTimes ? null : v.checkIn || null,
      checkOut: noTimes ? null : v.checkOut || null,
      notes: v.notes.trim() || null
    };
    if (body.checkIn && body.checkOut && body.checkOut < body.checkIn) {
      this.formError.set('Check-out cannot be before check-in.');
      return;
    }
    this.saving.set(true);
    const req = this.editingId ? this.api.update(this.editingId, body) : this.api.create(body);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.ui.success(this.editingId ? 'Attendance updated.' : 'Attendance marked.');
        if (body.date !== this.date) this.date = body.date;
        this.load();
      },
      error: e => { this.saving.set(false); this.formError.set(apiError(e)); }
    });
  }

  async remove(a: Attendance): Promise<void> {
    if (!(await this.ui.confirm(`Delete attendance of ${a.employeeName} on ${dateOnly(a.date)}?`, { confirmText: 'Delete' }))) return;
    this.api.delete(a.id).subscribe({
      next: () => { this.ui.success('Attendance deleted.'); this.load(); },
      error: e => this.ui.error(apiError(e, 'Could not delete attendance.'))
    });
  }

  showSummary(): void {
    this.view.set('summary');
    if (!this.summary() && this.sumEmployeeId) this.loadSummary();
  }

  loadSummary(): void {
    if (!this.sumEmployeeId) return;
    this.sumLoading.set(true);
    this.sumError.set('');
    this.sumPage.set(1);
    this.sumItems.set([]);
    const empId = Number(this.sumEmployeeId), m = Number(this.sumMonth), y = Number(this.sumYear);
    this.api.summary(empId, m, y).subscribe({
      next: s => { this.summary.set(s); this.sumLoading.set(false); },
      error: e => { this.summary.set(null); this.sumError.set(apiError(e, 'Could not load summary.')); this.sumLoading.set(false); }
    });
    // month's individual records (existing list endpoint, filtered by employee + date range)
    const mm = String(m).padStart(2, '0');
    const last = String(new Date(y, m, 0).getDate()).padStart(2, '0');
    this.api.list({ employeeId: empId, from: `${y}-${mm}-01`, to: `${y}-${mm}-${last}` }).subscribe({
      next: d => this.sumItems.set(this.withWeekends(d, this.sumMonth, this.sumYear)),
      error: () => this.sumItems.set([])
    });
  }

  employeeName(id: number): string {
    return this.employees().find(e => e.id === Number(id))?.fullName ?? '';
  }

  /** Row kebab menu (same pattern as Payroll): position:fixed so table-wrap overflow can't clip it. */
  readonly rowMenu = signal<{ r: Attendance; top: number | null; bottom: number | null; left: number } | null>(null);

  toggleRowMenu(r: Attendance, ev: MouseEvent): void {
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