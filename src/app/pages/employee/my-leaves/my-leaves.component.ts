import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Leave, LeaveBalance, LeaveType } from '../../../core/models/hr.models';
import { MeService, isNoProfile } from '../../../core/services/me.service';
import { UiService } from '../../../core/services/ui.service';
import { apiError, dateOnly, dayCount, toIsoDate } from '../../../core/utils/format';
import { StateComponent } from '../../../shared/state.component';
import { PaginationComponent, paginate } from '../../../shared/pagination.component';
import { LeaveBalanceComponent } from '../../../shared/leave-balance.component';
import { NO_PROFILE_TEXT } from '../no-profile';

@Component({
  selector: 'app-my-leaves',
  standalone: true,
  imports: [FormsModule, StateComponent, LeaveBalanceComponent, PaginationComponent],
  templateUrl: './my-leaves.component.html'
})
export class MyLeavesComponent implements OnInit {
  private readonly me = inject(MeService);
  private readonly ui = inject(UiService);
  readonly noProfileText = NO_PROFILE_TEXT;
  readonly dateOnly = dateOnly;
  readonly dayCount = dayCount;
  readonly types: LeaveType[] = ['Annual', 'Sick', 'Casual', 'Unpaid'];

  readonly loading = signal(true);
  readonly error = signal('');
  readonly noProfile = signal(false);
  readonly items = signal<Leave[]>([]);
  // client-side pagination
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly pagedItems = computed(() => paginate(this.items(), this.page(), this.pageSize()));
  setPageSize(s: number): void { this.pageSize.set(s); this.page.set(1); }
  readonly balance = signal<LeaveBalance[]>([]);
  readonly balanceLoading = signal(true);
  readonly balanceError = signal('');
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly showForm = signal(false);
  readonly saving = signal(false);
  formError = '';

  leaveType: LeaveType = 'Annual';
  startDate = toIsoDate();
  endDate = toIsoDate();
  reason = '';

  // API calls need the browser-stored token, so skip them during SSR.
  ngOnInit(): void { if (this.isBrowser) this.load(); }

  load(): void {
    this.page.set(1);
    this.loading.set(true);
    this.error.set('');
    this.me.leaves().subscribe({
      next: l => { this.items.set(l); this.loading.set(false); },
      error: err => { this.loading.set(false); if (isNoProfile(err)) this.noProfile.set(true); else this.error.set(apiError(err)); }
    });
    this.me.leaveBalance().subscribe({
      next: b => { this.balance.set(b); this.balanceLoading.set(false); this.balanceError.set(''); },
      error: err => { this.balanceLoading.set(false); if (!isNoProfile(err)) this.balanceError.set(apiError(err)); }
    });
  }

  open(): void {
    this.leaveType = 'Annual'; this.startDate = toIsoDate(); this.endDate = toIsoDate(); this.reason = '';
    this.formError = ''; this.showForm.set(true);
  }

  submit(): void {
    this.formError = '';
    if (!this.startDate || !this.endDate) { this.formError = 'Start and end dates are required.'; return; }
    if (dayCount(this.startDate, this.endDate) === 0) { this.formError = 'End date must be on or after start date.'; return; }
    if (!this.reason.trim()) { this.formError = 'Please enter a reason.'; return; }
    this.saving.set(true);
    this.me.applyLeave({ leaveType: this.leaveType, startDate: this.startDate, endDate: this.endDate, reason: this.reason.trim() }).subscribe({
      next: () => { this.saving.set(false); this.showForm.set(false); this.ui.success('Leave request submitted.'); this.load(); },
      error: err => { this.saving.set(false); this.formError = apiError(err); }
    });
  }

  async cancel(l: Leave): Promise<void> {
    if (!(await this.ui.confirm(`Cancel your ${l.leaveType} leave from ${dateOnly(l.startDate)}?`, { confirmText: 'Cancel leave' }))) return;
    this.me.cancelLeave(l.id).subscribe({
      next: () => { this.ui.success('Leave request cancelled.'); this.load(); },
      error: err => this.ui.error(apiError(err))
    });
  }
}
