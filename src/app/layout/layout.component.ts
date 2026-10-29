import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../core/services/auth.service';
import { AvatarComponent } from '../shared/avatar.component';

interface NavItem { path: string; label: string; icon: string; }

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AvatarComponent],
  templateUrl: './layout.component.html',
  // Reuses the employee shell styles (scoped to .emp); .adm hooks live in styles.css.
  styleUrls: ['./layout.component.css', '../employee-layout/employee-layout.component.css']
})
export class LayoutComponent {
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
    { path: '/admin/dashboard', label: 'Dashboard', icon: 'M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10' },
    { path: '/admin/employees', label: 'Employees', icon: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21a7 7 0 0114 0M16 3.5a4 4 0 010 7.5M22 21a7 7 0 00-4-6.3' },
    { path: '/admin/departments', label: 'Departments', icon: 'M4 21V5l8-2v18M12 7h8v14M7 8h2M7 12h2M7 16h2M15 11h2M15 15h2M2 21h20' },
    { path: '/admin/leaves', label: 'Leave', icon: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4' },
    { path: '/admin/attendance', label: 'Attendance', icon: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2' },
    { path: '/admin/payroll', label: 'Payroll', icon: 'M3 7h18v12H3zM3 11h18M7 15h3' }
  ];

  constructor() {
    inject(Router).events.pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => { this.menuOpen.set(false); this.userMenuOpen.set(false); });
  }

  toggle(): void { this.menuOpen.update(v => !v); }
  logout(): void { this.auth.logout(); }
}