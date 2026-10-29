import { isPlatformBrowser } from '@angular/common';
import { Component, HostListener, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { DepartmentService } from '../../core/services/department.service';
import { UiService } from '../../core/services/ui.service';
import { Department } from '../../core/models/hr.models';
import { apiError, dateOnly } from '../../core/utils/format';
import { StateComponent } from '../../shared/state.component';

@Component({
  selector: 'app-departments',
  standalone: true,
  imports: [ReactiveFormsModule, StateComponent],
  templateUrl: './departments.component.html'
})
export class DepartmentsComponent implements OnInit {
  private readonly api = inject(DepartmentService);
  private readonly ui = inject(UiService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly isAdmin = computed(() => this.auth.currentUser()?.role === 'Admin');
  readonly dateOnly = dateOnly;
  readonly items = signal<Department[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly modalOpen = signal(false);
  readonly saving = signal(false);
  readonly formError = signal('');
  editingId: number | null = null;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', [Validators.maxLength(500)]]
  });

  ngOnInit(): void { if (this.isBrowser) this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.list().subscribe({
      next: d => { this.items.set(d); this.loading.set(false); },
      error: e => { this.error.set(apiError(e, 'Could not load departments.')); this.loading.set(false); }
    });
  }

  openAdd(): void {
    this.editingId = null;
    this.form.reset({ name: '', description: '' });
    this.formError.set('');
    this.modalOpen.set(true);
  }

  openEdit(d: Department): void {
    this.editingId = d.id;
    this.form.reset({ name: d.name, description: d.description ?? '' });
    this.formError.set('');
    this.modalOpen.set(true);
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const body = { name: v.name.trim(), description: v.description.trim() || null };
    this.saving.set(true);
    const req = this.editingId ? this.api.update(this.editingId, body) : this.api.create(body);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.ui.success(this.editingId ? 'Department updated.' : 'Department created.');
        this.load();
      },
      error: e => { this.saving.set(false); this.formError.set(apiError(e)); }
    });
  }

  async remove(d: Department): Promise<void> {
    if (!(await this.ui.confirm(`Delete department "${d.name}"?`, { confirmText: 'Delete' }))) return;
    this.api.delete(d.id).subscribe({
      next: () => { this.ui.success('Department deleted.'); this.load(); },
      error: e => this.ui.error(apiError(e, 'Could not delete department.'))
    });
  }

  /** Row kebab menu (same pattern as Payroll): position:fixed so table-wrap overflow can't clip it. */
  readonly rowMenu = signal<{ r: Department; top: number | null; bottom: number | null; left: number } | null>(null);

  toggleRowMenu(r: Department, ev: MouseEvent): void {
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