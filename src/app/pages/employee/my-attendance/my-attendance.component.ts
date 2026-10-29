import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Attendance, AttendanceSummary } from '../../../core/models/hr.models';
import { MeService, isNoProfile } from '../../../core/services/me.service';
import { MONTHS, apiError, dateOnly, time12, timeOnly } from '../../../core/utils/format';
import { CheckInCardComponent } from '../../../shared/check-in-card.component';
import { StateComponent } from '../../../shared/state.component';
import { PaginationComponent, paginate } from '../../../shared/pagination.component';
import { NO_PROFILE_TEXT } from '../no-profile';

@Component({
  selector: 'app-my-attendance',
  standalone: true,
  imports: [FormsModule, StateComponent, CheckInCardComponent, PaginationComponent],
  template: `
    <section class="page">
      <div class="page-head"><div><h1>My Attendance</h1><p>Your daily attendance records.</p></div></div>
      @if (noProfile()) {
        <div class="alert alert-info">{{ noProfileText }}</div>
      } @else {
        <app-check-in-card (changed)="load()" />
        <div class="card">
          <div class="toolbar">
            <label class="field"><span>Month</span>
              <select class="input" [(ngModel)]="month" (ngModelChange)="load()">
                @for (m of months; track m; let i = $index) { <option [ngValue]="i + 1">{{ m }}</option> }
              </select>
            </label>
            <label class="field"><span>Year</span>
              <select class="input" [(ngModel)]="year" (ngModelChange)="load()">
                @for (y of years; track y) { <option [ngValue]="y">{{ y }}</option> }
              </select>
            </label>
            <div class="view-toggle" role="group" aria-label="View">
              <button type="button" [class.active]="view() === 'table'" [attr.aria-pressed]="view() === 'table'" (click)="view.set('table')">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>Table
              </button>
              <button type="button" [class.active]="view() === 'calendar'" [attr.aria-pressed]="view() === 'calendar'" (click)="view.set('calendar')">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"/></svg>Calendar
              </button>
            </div>
          </div>
          @if (summary(); as s) {
            <div class="stats" style="margin-bottom:14px">
              <div class="stat" style="border-left-color:#16a34a"><div class="label">Present</div><div class="value">{{ s.present }}</div></div>
              <div class="stat" style="border-left-color:#d97706"><div class="label">Late</div><div class="value">{{ s.late }}</div></div>
              <div class="stat"><div class="label">Half day</div><div class="value">{{ s.halfDay }}</div></div>
              <div class="stat" style="border-left-color:#7c3aed"><div class="label">On leave</div><div class="value">{{ s.leave }}</div></div>
              <div class="stat" style="border-left-color:#dc2626"><div class="label">Absent</div><div class="value">{{ s.absent }}</div></div>
            </div>
          }
          @if (view() === 'calendar') {
            <app-state [loading]="loading()" [error]="error()" />
            @if (!loading() && !error()) {
              <div class="att-cal" aria-label="Attendance calendar">
                @for (w of weekdays; track w) { <div class="att-cal-wd">{{ w }}</div> }
                @for (c of calendar(); track $index) {
                  @if (c) {
                    <div [class]="'att-cal-day att-' + c.kind" [class.is-today]="c.today" [attr.title]="c.title">
                      <span class="att-cal-num">{{ c.day }}</span>
                      @if (c.label) { <span class="att-cal-lbl">{{ c.label }}</span> }
                      @if (c.time) { <span class="att-cal-time">{{ c.time }}</span> }
                    </div>
                  } @else {
                    <div class="att-cal-day att-pad" aria-hidden="true"></div>
                  }
                }
              </div>
              <div class="att-legend">
                <span><i class="att-sw att-present"></i>Present</span>
                <span><i class="att-sw att-late"></i>Late</span>
                <span><i class="att-sw att-halfday"></i>Half day</span>
                <span><i class="att-sw att-absent"></i>Absent</span>
                <span><i class="att-sw att-leave"></i>Leave</span>
                <span><i class="att-sw att-off"></i>Weekend off</span>
                <span><i class="att-sw att-none"></i>No record</span>
                <span><i class="att-sw att-future"></i>Upcoming</span>
              </div>
            }
          } @else {
          <app-state [loading]="loading()" [error]="error()" [empty]="items().length === 0" emptyText="No attendance records for this month." />
          @if (!loading() && !error() && items().length) {
            <div class="table-wrap">
              <table class="table">
                <thead><tr><th>Date</th><th>Day</th><th>Status</th><th>Check-in</th><th>Check-out</th><th>Notes</th></tr></thead>
                <tbody>
                  @for (a of pagedItems(); track a.id) {
                    <tr [class.row-off]="isOff(a)">
                      <td>{{ dateOnly(a.date) }}</td>
                      <td>{{ dayName(a.date) }}</td>
                      <td><span [class]="'badge badge-' + a.status">{{ a.status }}</span></td>
                      <td>{{ timeOnly(a.checkIn) || '-' }}</td>
                      <td>{{ timeOnly(a.checkOut) || '-' }}</td>
                      <td>{{ isOff(a) ? 'Weekend' : (a.notes || '-') }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <app-pagination [total]="items().length" [page]="page()" [pageSize]="pageSize()" (pageChange)="page.set($event)" (pageSizeChange)="setPageSize($event)" />
          }
          }
        </div>
      }
    </section>
  `
})
export class MyAttendanceComponent implements OnInit {
  private readonly me = inject(MeService);
  readonly noProfileText = NO_PROFILE_TEXT;
  readonly months = MONTHS;
  readonly dateOnly = dateOnly;
  readonly timeOnly = time12;
  month = new Date().getMonth() + 1;
  year = new Date().getFullYear();
  readonly years = Array.from({ length: 5 }, (_, i) => this.year - i);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly noProfile = signal(false);
  readonly items = signal<Attendance[]>([]);
  readonly summary = signal<AttendanceSummary | null>(null);

  // client-side pagination
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly pagedItems = computed(() => paginate(this.items(), this.page(), this.pageSize()));

  /** Table (default) or month calendar grid. */
  readonly view = signal<'table' | 'calendar'>('table');
  readonly weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Month grid (Monday first; null = padding cell). Uses items() which already include weekend "Off" rows. */
  readonly calendar = computed<(CalendarCell | null)[]>(() => {
    const byDate = new Map(this.items().map(a => [dateOnly(a.date), a] as const));
    const y = this.year, m = this.month;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = new Date(y, m, 0).getDate();
    const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7;
    const cells: (CalendarCell | null)[] = Array.from({ length: lead }, () => null);
    for (let i = 1; i <= days; i++) {
      const d = new Date(y, m - 1, i);
      const iso = `${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const weekend = d.getDay() === 0 || d.getDay() === 6;
      const rec = byDate.get(iso);
      const dateText = d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
      let kind: string, label = '', time = '';
      if (rec && !this.isOff(rec)) {
        kind = String(rec.status).toLowerCase();
        label = rec.status === 'HalfDay' ? 'Half day' : String(rec.status);
        time = this.timeOnly(rec.checkIn) || '';
      } else if (weekend) { kind = 'off'; label = 'Off'; }
      else if (d > today) { kind = 'future'; }
      else { kind = 'none'; }
      const title = `${dateText}: ${label || (kind === 'future' ? 'Upcoming' : 'No record')}${time ? ' (in ' + time + ')' : ''}`;
      cells.push({ day: i, kind, label, time, title, today: d.getTime() === today.getTime() });
    }
    while (cells.length % 7) cells.push(null);
    return cells;
  });

  // API calls need the browser-stored token, so skip them during SSR.
  ngOnInit(): void { if (this.isBrowser) this.load(); }

  isOff(a: Attendance): boolean { return (a.status as string) === 'Off'; }

  dayName(v: string): string {
    const d = new Date(dateOnly(v) + 'T00:00:00');
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { weekday: 'long' });
  }

  /** Adds Saturday/Sunday "Off" rows (up to today) and sorts newest first. */
  private withWeekends(list: Attendance[]): Attendance[] {
    const have = new Set(list.map(a => dateOnly(a.date)));
    const extra: Attendance[] = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = new Date(this.year, this.month, 0).getDate();
    for (let i = 1; i <= days; i++) {
      const d = new Date(this.year, this.month - 1, i);
      if (d > today) break;
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      if ((d.getDay() === 0 || d.getDay() === 6) && !have.has(iso)) {
        extra.push({ ...(list[0] ?? {}), id: -i, date: iso, status: 'Off', checkIn: null, checkOut: null, notes: null } as unknown as Attendance);
      }
    }
    return [...list, ...extra].sort((a, b) => dateOnly(b.date).localeCompare(dateOnly(a.date)));
  }

  setPageSize(s: number): void { this.pageSize.set(s); this.page.set(1); }

  load(): void {
    this.page.set(1);
    this.loading.set(true);
    this.error.set('');
    forkJoin([this.me.attendance(this.month, this.year), this.me.attendanceSummary(this.month, this.year)]).subscribe({
      next: ([list, sum]) => { this.items.set(this.withWeekends(list)); this.summary.set(sum); this.loading.set(false); },
      error: err => { this.loading.set(false); if (isNoProfile(err)) this.noProfile.set(true); else this.error.set(apiError(err)); }
    });
  }
}

interface CalendarCell { day: number; kind: string; label: string; time: string; title: string; today: boolean; }
