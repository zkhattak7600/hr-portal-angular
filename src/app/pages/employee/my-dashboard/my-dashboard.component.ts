import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Leave, LeaveBalance, MyDashboard } from '../../../core/models/hr.models';
import { AuthService } from '../../../core/services/auth.service';
import { MeService, isNoProfile } from '../../../core/services/me.service';
import { MONTHS, apiError, dateOnly } from '../../../core/utils/format';
import { PkrPipe } from '../../../shared/pkr.pipe';
import { CheckInCardComponent } from '../../../shared/check-in-card.component';
import { StateComponent } from '../../../shared/state.component';
import { LeaveBalanceComponent } from '../../../shared/leave-balance.component';
import { NO_PROFILE_TEXT } from '../no-profile';

@Component({
  selector: 'app-my-dashboard',
  standalone: true,
  imports: [RouterLink, PkrPipe, StateComponent, CheckInCardComponent, LeaveBalanceComponent],
  templateUrl: './my-dashboard.component.html'
})
export class MyDashboardComponent implements OnInit {
  private readonly me = inject(MeService);
  readonly user = inject(AuthService).currentUser;
  readonly months = MONTHS;
  readonly noProfileText = NO_PROFILE_TEXT;
  readonly dateOnly = dateOnly;

  readonly loading = signal(true);
  readonly error = signal('');
  readonly noProfile = signal(false);
  readonly stats = signal<MyDashboard | null>(null);
  readonly recent = signal<Leave[]>([]);
  readonly balance = signal<LeaveBalance[]>([]);
  readonly balanceLoading = signal(true);
  readonly balanceError = signal('');

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // The token lives in browser storage, so skip the API call during SSR (it would 401 and render an error).
  ngOnInit(): void { if (this.isBrowser) this.load(); }

  load(): void {
    this.me.dashboard().subscribe({
      next: s => { this.stats.set(s); this.loading.set(false); },
      error: err => {
        this.loading.set(false);
        if (isNoProfile(err)) this.noProfile.set(true); else this.error.set(apiError(err));
      }
    });
    this.me.leaves().subscribe({ next: l => this.recent.set(l.slice(0, 5)), error: () => this.recent.set([]) });
    this.me.leaveBalance().subscribe({
      next: b => { this.balance.set(b); this.balanceLoading.set(false); this.balanceError.set(''); },
      error: err => { this.balanceLoading.set(false); if (!isNoProfile(err)) this.balanceError.set(apiError(err)); }
    });
  }
}
