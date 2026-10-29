import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Payslip } from '../../../core/models/hr.models';
import { MeService, isNoProfile } from '../../../core/services/me.service';
import { UiService } from '../../../core/services/ui.service';
import { MONTHS, apiError, dateOnly } from '../../../core/utils/format';
import { printPayslip } from '../../../core/utils/payslip-print';
import { PkrPipe } from '../../../shared/pkr.pipe';
import { StateComponent } from '../../../shared/state.component';
import { PaginationComponent, paginate } from '../../../shared/pagination.component';
import { NO_PROFILE_TEXT } from '../no-profile';

@Component({
  selector: 'app-my-payslips',
  standalone: true,
  imports: [PkrPipe, StateComponent, PaginationComponent],
  templateUrl: './my-payslips.component.html',
  styleUrl: '../../payroll/payroll.component.css'
})
export class MyPayslipsComponent implements OnInit {
  private readonly me = inject(MeService);
  private readonly ui = inject(UiService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly noProfileText = NO_PROFILE_TEXT;
  readonly months = MONTHS;
  readonly dateOnly = dateOnly;

  readonly loading = signal(true);
  readonly error = signal('');
  readonly noProfile = signal(false);
  readonly items = signal<Payslip[]>([]);
  // client-side pagination
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly pagedItems = computed(() => paginate(this.items(), this.page(), this.pageSize()));
  setPageSize(s: number): void { this.pageSize.set(s); this.page.set(1); }
  readonly selected = signal<Payslip | null>(null);

  // API calls need the browser-stored token, so skip them during SSR.
  ngOnInit(): void {
    if (!this.isBrowser) return;
    this.me.payslips().subscribe({
      next: p => { this.page.set(1); this.items.set(p); this.loading.set(false); },
      error: err => { this.loading.set(false); if (isNoProfile(err)) this.noProfile.set(true); else this.error.set(apiError(err)); }
    });
  }

  view(p: Payslip): void {
    this.me.payslip(p.id).subscribe({ next: s => this.selected.set(s), error: err => this.ui.error(apiError(err)) });
  }

  print(): void { if (this.isBrowser) window.print(); }

  downloadPdf(p: Payslip): void { if (this.isBrowser) printPayslip(p); }
}
