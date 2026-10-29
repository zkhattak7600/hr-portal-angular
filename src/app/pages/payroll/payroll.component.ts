import { isPlatformBrowser } from '@angular/common';
import { Component, HostListener, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { PayrollService } from '../../core/services/payroll.service';
import { UiService } from '../../core/services/ui.service';
import { Payslip } from '../../core/models/hr.models';
import { MONTHS, apiError, dateOnly } from '../../core/utils/format';
import { printPayslip } from '../../core/utils/payslip-print';
import { PkrPipe } from '../../shared/pkr.pipe';
import { StateComponent } from '../../shared/state.component';
import { PaginationComponent, paginate } from '../../shared/pagination.component';

@Component({
  selector: 'app-payroll',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, StateComponent, PkrPipe, PaginationComponent],
  templateUrl: './payroll.component.html',
  styleUrl: './payroll.component.css'
})
export class PayrollComponent implements OnInit {
  private readonly api = inject(PayrollService);
  private readonly ui = inject(UiService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly isAdmin = computed(() => this.auth.currentUser()?.role === 'Admin');
  readonly months = MONTHS;
  readonly dateOnly = dateOnly;
  readonly years: number[];

  month = new Date().getMonth() + 1;
  year = new Date().getFullYear();

  readonly items = signal<Payslip[]>([]);
  // client-side pagination
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly pagedItems = computed(() => paginate(this.items(), this.page(), this.pageSize()));
  setPageSize(s: number): void { this.pageSize.set(s); this.page.set(1); this.rowMenu.set(null); }
  readonly loading = signal(true);
  readonly error = signal('');
  readonly saving = signal(false);
  readonly formError = signal('');
  readonly generateOpen = signal(false);
  readonly editing = signal<Payslip | null>(null);
  readonly viewing = signal<Payslip | null>(null);
  /** Row kebab menu: rendered position:fixed so the table-wrap overflow can't clip it. */
  readonly rowMenu = signal<{ p: Payslip; top: number | null; bottom: number | null; left: number } | null>(null);

  readonly totals = computed(() => {
    const list = this.items();
    return {
      net: list.reduce((a, p) => a + Number(p.netSalary), 0),
      paid: list.filter(p => p.status === 'Paid').length,
      draft: list.filter(p => p.status === 'Draft').length
    };
  });

  readonly genForm = this.fb.group({
    allowances: [null as number | null, Validators.min(0)],
    deductions: [null as number | null, Validators.min(0)],
    tax: [null as number | null, Validators.min(0)]
  });

  readonly editForm = this.fb.nonNullable.group({
    basicSalary: [0, [Validators.required, Validators.min(0)]],
    allowances: [0, [Validators.required, Validators.min(0)]],
    deductions: [0, [Validators.required, Validators.min(0)]],
    tax: [0, [Validators.required, Validators.min(0)]]
  });

  constructor() {
    const y = new Date().getFullYear();
    this.years = [y - 2, y - 1, y, y + 1];
  }

  ngOnInit(): void { if (this.isBrowser) this.load(); }

  load(): void {
    this.page.set(1);
    this.rowMenu.set(null);
    this.loading.set(true);
    this.error.set('');
    this.api.list({ month: this.month, year: this.year }).subscribe({
      next: d => { this.items.set(d); this.loading.set(false); },
      error: e => { this.error.set(apiError(e, 'Could not load payslips.')); this.loading.set(false); }
    });
  }

  openGenerate(): void {
    this.genForm.reset({ allowances: null, deductions: null, tax: null });
    this.formError.set('');
    this.generateOpen.set(true);
  }

  generate(): void {
    if (this.genForm.invalid) { this.genForm.markAllAsTouched(); return; }
    const v = this.genForm.getRawValue();
    const num = (x: number | null | undefined) => (x === null || x === undefined || (x as unknown) === '' ? null : Number(x));
    this.saving.set(true);
    this.api.generate({ month: this.month, year: this.year, allowances: num(v.allowances), deductions: num(v.deductions), tax: num(v.tax) }).subscribe({
      next: r => {
        this.saving.set(false);
        this.generateOpen.set(false);
        this.ui.success(`Payroll generated: ${r.generated} created, ${r.skipped} skipped.`);
        this.load();
      },
      error: e => { this.saving.set(false); this.formError.set(apiError(e)); }
    });
  }

  openEdit(p: Payslip): void {
    this.editForm.reset({ basicSalary: p.basicSalary, allowances: p.allowances, deductions: p.deductions, tax: p.tax });
    this.formError.set('');
    this.editing.set(p);
  }

  get editNet(): number {
    const v = this.editForm.getRawValue();
    return Number(v.basicSalary) + Number(v.allowances) - Number(v.deductions) - Number(v.tax);
  }

  saveEdit(): void {
    const p = this.editing();
    if (!p) return;
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    const v = this.editForm.getRawValue();
    this.saving.set(true);
    this.api.update(p.id, {
      basicSalary: Number(v.basicSalary), allowances: Number(v.allowances),
      deductions: Number(v.deductions), tax: Number(v.tax)
    }).subscribe({
      next: () => { this.saving.set(false); this.editing.set(null); this.ui.success('Payslip updated.'); this.load(); },
      error: e => { this.saving.set(false); this.formError.set(apiError(e)); }
    });
  }

  async pay(p: Payslip): Promise<void> {
    if (!(await this.ui.confirm(`Mark payslip of ${p.employeeName} as paid?`, { confirmText: 'Mark paid', danger: false }))) return;
    this.api.pay(p.id).subscribe({
      next: updated => {
        this.ui.success('Payslip marked as paid.');
        if (this.viewing()?.id === p.id) this.viewing.set(updated ?? null);
        this.load();
      },
      error: e => this.ui.error(apiError(e))
    });
  }

  async remove(p: Payslip): Promise<void> {
    if (!(await this.ui.confirm(`Delete draft payslip of ${p.employeeName}?`, { confirmText: 'Delete' }))) return;
    this.api.delete(p.id).subscribe({
      next: () => { this.ui.success('Payslip deleted.'); this.load(); },
      error: e => this.ui.error(apiError(e))
    });
  }

  print(): void {
    if (this.isBrowser) window.print();
  }

  downloadPdf(p: Payslip): void {
    if (this.isBrowser) printPayslip(p);
  }

  toggleRowMenu(p: Payslip, ev: MouseEvent): void {
    if (!this.isBrowser) return;
    if (this.rowMenu()?.p.id === p.id) { this.rowMenu.set(null); return; }
    const r = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const width = 176, approxHeight = 150;
    const left = Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8));
    const flip = r.bottom + approxHeight > window.innerHeight;
    this.rowMenu.set({ p, left, top: flip ? null : r.bottom + 4, bottom: flip ? window.innerHeight - r.top + 4 : null });
  }

  menuAction(fn: (p: Payslip) => void): void {
    const m = this.rowMenu();
    this.rowMenu.set(null);
    if (m) fn.call(this, m.p);
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

  view(p: Payslip): void { this.viewing.set(p); }
}
