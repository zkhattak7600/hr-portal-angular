import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { LeaveService } from '../../core/services/leave.service';
import { DashboardStats, Leave } from '../../core/models/hr.models';
import { apiError, dateOnly } from '../../core/utils/format';
import { StateComponent } from '../../shared/state.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, StateComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly dashboard = inject(DashboardService);
  private readonly leaves = inject(LeaveService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly user = this.auth.currentUser;
  readonly dateOnly = dateOnly;
  loading = false;
  errorMessage = '';

  readonly stats = signal<DashboardStats | null>(null);
  readonly statsLoading = signal(true);
  readonly statsError = signal('');
  readonly pending = signal<Leave[]>([]);
  readonly pendingLoading = signal(true);
  readonly pendingError = signal('');

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loading = true;
    this.auth.me().subscribe({
      next: () => (this.loading = false),
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        if (err.status !== 401) this.errorMessage = 'Could not load your profile from the server.';
      }
    });
    this.dashboard.stats().subscribe({
      next: s => { this.stats.set(s); this.statsLoading.set(false); },
      error: e => { this.statsError.set(apiError(e, 'Could not load statistics.')); this.statsLoading.set(false); }
    });
    this.leaves.list({ status: 'Pending' }).subscribe({
      next: l => { this.pending.set(l.slice(0, 5)); this.pendingLoading.set(false); },
      error: e => { this.pendingError.set(apiError(e, 'Could not load pending leaves.')); this.pendingLoading.set(false); }
    });
  }
}
