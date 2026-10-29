import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../core/services/auth.service';
import { AvatarComponent } from '../shared/avatar.component';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

interface NavItem { path: string; label: string; icon: string; }

@Component({
  selector: 'app-employee-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AvatarComponent],
  templateUrl: './employee-layout.component.html',
  styleUrls: ['../layout/layout.component.css', './employee-layout.component.css']
})
export class EmployeeLayoutComponent {
  private readonly auth = inject(AuthService);
  readonly user = this.auth.currentUser;
  readonly initial = computed(() => (this.user()?.fullName ?? '?').charAt(0).toUpperCase());
  readonly menuOpen = signal(false);
  /** UI-only: avatar dropdown in the top bar. */
  readonly userMenuOpen = signal(false);

  private readonly today = new Date();
  readonly greeting = (() => { const h = this.today.getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; })();
  readonly dateText = this.today.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  readonly firstName = computed(() => (this.user()?.fullName ?? '').split(' ')[0]);

  /** icon = SVG path data (24x24, stroke). */
  readonly nav: NavItem[] = [
    { path: '/employee/dashboard', label: 'My Dashboard', icon: 'M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10' },
    { path: '/employee/profile', label: 'My Profile', icon: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0' },
    { path: '/employee/leaves', label: 'My Leaves', icon: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4' },
    { path: '/employee/attendance', label: 'My Attendance', icon: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2' },
    { path: '/employee/payslips', label: 'My Payslips', icon: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3' }
  ];

  constructor() {
    inject(Router).events.pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => { this.menuOpen.set(false); this.userMenuOpen.set(false); });
    // Refresh cached user (incl. photoUrl) once in the browser so the avatar is current.
    if (isPlatformBrowser(inject(PLATFORM_ID)) && this.auth.isLoggedIn()) {
      this.auth.me().subscribe({ error: () => {} });
    }
  }

  toggle(): void { this.menuOpen.update(v => !v); }
  logout(): void { this.auth.logout(); }
}