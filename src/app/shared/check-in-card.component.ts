import { isPlatformBrowser } from '@angular/common';
import { ApplicationRef, Component, EventEmitter, NgZone, OnDestroy, OnInit, Output, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { first } from 'rxjs';
import { MyAttendanceToday } from '../core/models/hr.models';
import { MeService, isNoProfile } from '../core/services/me.service';
import { UiService } from '../core/services/ui.service';
import { apiError, time12 } from '../core/utils/format';

/** Self-service Check In / Check Out widget with live clock and worked-hours timer. */
@Component({
  selector: 'app-check-in-card',
  standalone: true,
  template: `
    <div class="card emp-checkin">
      <div class="ci-row">
        <div class="ci-clock">
          <div class="ci-date">{{ dateText() }}</div>
          <div class="ci-time">{{ clock() }}</div>
          <div class="ci-status">
            Today:
            @if (today(); as t) { <span [class]="'badge badge-' + t.status">{{ t.status }}</span> }
            @else { <span class="badge">Not checked in</span> }
          </div>
        </div>
        <div class="ci-metrics">
          <div><div class="ci-k">Check-in</div><div class="ci-v">{{ timeOnly(today()?.checkIn ?? null) || '--:--' }}</div></div>
          <div><div class="ci-k">Check-out</div><div class="ci-v">{{ timeOnly(today()?.checkOut ?? null) || '--:--' }}</div></div>
          <div><div class="ci-k">Worked</div><div class="ci-v">{{ worked() }}</div></div>
        </div>
        <div class="ci-actions">
          <button class="btn" [disabled]="!canCheckIn() || busy()" (click)="checkIn()">@if (busy() && canCheckIn()) { <span class="btn-spinner"></span> Checking in... } @else { Check In }</button>
          <button class="btn btn-danger" [disabled]="!canCheckOut() || busy()" (click)="checkOut()">@if (busy() && canCheckOut()) { <span class="btn-spinner"></span> Checking out... } @else { Check Out }</button>
        </div>
      </div>
      @if (loadError()) { <div class="alert alert-error" style="margin-top:10px">{{ loadError() }}</div> }
    </div>  `
})
export class CheckInCardComponent implements OnInit, OnDestroy {
  private readonly me = inject(MeService);
  private readonly ui = inject(UiService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly zone = inject(NgZone);
  private readonly appRef = inject(ApplicationRef);
  private timer: ReturnType<typeof setInterval> | null = null;
  readonly timeOnly = time12;

  /** Emits after a successful check-in/out so the host page can refresh. */
  @Output() changed = new EventEmitter<MyAttendanceToday>();

  readonly now = signal(new Date());
  readonly today = signal<MyAttendanceToday | null>(null);
  readonly busy = signal(false);
  readonly loaded = signal(false);
  readonly loadError = signal('');

  readonly clock = computed(() => this.now().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  readonly dateText = computed(() => this.now().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
  readonly canCheckIn = computed(() => this.loaded() && !this.today()?.checkIn);
  readonly canCheckOut = computed(() => this.loaded() && !!this.today()?.checkIn && !this.today()?.checkOut);
  readonly worked = computed(() => {
    const t = this.today();
    if (!t?.checkIn) return '00:00:00';
    const start = secs(t.checkIn);
    const end = t.checkOut ? secs(t.checkOut) : secsOf(this.now());
    const s = Math.max(0, end - start);
    return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map(n => String(n).padStart(2, '0')).join(':');
  });

  ngOnInit(): void {
    // No token on the server: only call the API in the browser, otherwise SSR renders a 401 error.
    if (!this.isBrowser) return;
    this.load();
    // Start the 1s clock outside Angular's zone and only after the app is stable, so hydration can finish
    // (a zone-tracked setInterval keeps the app unstable forever and leaves stale SSR DOM on the page).
    this.appRef.isStable.pipe(first(s => s)).subscribe(() =>
      this.zone.runOutsideAngular(() => { this.timer = setInterval(() => this.now.set(new Date()), 1000); }));
  }

  ngOnDestroy(): void { if (this.timer) clearInterval(this.timer); }

  load(): void {
    this.me.attendanceToday().subscribe({
      next: t => { this.today.set(t); this.loaded.set(true); },
      error: err => { if (!isNoProfile(err)) this.loadError.set(apiError(err)); }
    });
  }

  checkIn(): void {
    this.busy.set(true);
    this.me.checkIn().subscribe({
      next: t => { this.busy.set(false); this.today.set(t); this.ui.success(`Checked in at ${time12(t.checkIn)}${t.status === 'Late' ? ' (late)' : ''}.`); this.changed.emit(t); },
      error: err => { this.busy.set(false); this.ui.error(apiError(err)); this.load(); }
    });
  }

  checkOut(): void {
    this.busy.set(true);
    this.me.checkOut().subscribe({
      next: t => { this.busy.set(false); this.today.set(t); this.ui.success(`Checked out at ${time12(t.checkOut)}. Worked ${t.workedHours ?? 0} h.`); this.changed.emit(t); },
      error: err => { this.busy.set(false); this.ui.error(apiError(err)); this.load(); }
    });
  }
}

function secs(hms: string): number { const [h, m, s] = hms.split(':').map(Number); return h * 3600 + m * 60 + (s || 0); }
function secsOf(d: Date): number { return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds(); }
