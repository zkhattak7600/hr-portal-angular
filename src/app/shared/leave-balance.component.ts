import { Component, input } from '@angular/core';
import { LeaveBalance, LeaveType } from '../core/models/hr.models';

/** Leave balance cards with progress bars (used = solid, pending = striped). */
@Component({
  selector: 'app-leave-balance',
  standalone: true,
  template: `
    <div class="card emp-section lb-section">
      <div class="card-head">
        <h2>Leave balance {{ year() }}</h2>
        <div class="lb-legend"><span><i class="lb-dot lb-dot-used"></i>Used</span><span><i class="lb-dot lb-dot-pend"></i>Pending</span></div>
      </div>
      @if (loading()) {
        <div class="state"><div class="spinner"></div>Loading balance...</div>
      } @else if (error()) {
        <div class="alert alert-error">{{ error() }}</div>
      } @else {
        <div class="lb-grid">
          @for (b of balances(); track b.type) {
            <div [class]="'lb-card lb-' + b.type">
              <div class="lb-head">
                <span class="lb-ico" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path [attr.d]="icon(b.type)"/></svg>
                </span>
                <div class="lb-title">{{ b.type }} leave</div>
                @if (b.entitled > 0) {
                  <div class="lb-rem"><strong>{{ b.remaining }}</strong><small>/ {{ b.entitled }} left</small></div>
                } @else {
                  <div class="lb-rem"><strong>{{ b.used }}</strong><small>days used</small></div>
                }
              </div>
              @if (b.entitled > 0) {
                <div class="lb-bar" role="progressbar" aria-valuemin="0" [attr.aria-valuemax]="b.entitled" [attr.aria-valuenow]="b.used" [attr.aria-label]="b.type + ' leave used'">
                  <span class="lb-used" [style.width.%]="pct(b.used, b.entitled)"></span>
                  <span class="lb-pend" [style.width.%]="pct(Math.min(b.pending, b.remaining), b.entitled)"></span>
                </div>
                <div class="lb-foot"><span>{{ b.used }} used</span><span>{{ b.pending }} pending</span><span>{{ b.entitled }} / year</span></div>
              } @else {
                <div class="lb-bar lb-bar-none"></div>
                <div class="lb-foot"><span>No fixed entitlement</span><span>{{ b.pending }} pending</span></div>
              }
            </div>
          }
        </div>
      }
    </div>
  `
})
export class LeaveBalanceComponent {
  readonly balances = input<LeaveBalance[]>([]);
  readonly loading = input(false);
  readonly error = input('');
  readonly year = input(new Date().getFullYear());
  readonly Math = Math;

  pct(part: number, total: number): number {
    if (!total || total <= 0) return 0;
    return Math.max(0, Math.min(100, (part / total) * 100));
  }

  icon(t: LeaveType): string {
    switch (t) {
      case 'Annual': return 'M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 100 8 4 4 0 000-8z';
      case 'Sick': return 'M12 21s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.5-7 10-7 10zM12 9v5M9.5 11.5h5';
      case 'Casual': return 'M4 7h16v13H4zM9 7V4h6v3M4 12h16';
      default: return 'M12 21a9 9 0 100-18 9 9 0 000 18zM8 12h8';
    }
  }
}