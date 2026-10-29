import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { User } from '../models/auth.models';
import { AuthService } from '../services/auth.service';

/** Landing page for a user's role. */
export function homeUrl(user: User | null): string {
  if (!user) return '/login';
  return user.role === 'Admin' ? '/admin/dashboard' : '/employee/dashboard';
}

export const authGuard: CanActivateFn = () => {
  // On the server there is no localStorage; the browser decides after hydration.
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return true;
  return inject(AuthService).isLoggedIn() ? true : inject(Router).createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = () => {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return true;
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? inject(Router).parseUrl(homeUrl(auth.currentUser())) : true;
};

function roleGuard(role: 'Admin' | 'Employee'): CanActivateFn {
  return () => {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return true;
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.isLoggedIn()) return router.createUrlTree(['/login']);
    const user = auth.currentUser();
    const isAdmin = user?.role === 'Admin';
    if ((role === 'Admin') === isAdmin) {
      // Employee token without a linked HR record: sign out instead of showing an empty portal.
      if (role === 'Employee' && user?.employeeId == null) {
        auth.logout();
        return router.createUrlTree(['/login'], { queryParams: { reason: 'not-linked' } });
      }
      return true;
    }
    return router.parseUrl(homeUrl(user));
  };
}

export const adminGuard: CanActivateFn = roleGuard('Admin');
export const employeeGuard: CanActivateFn = roleGuard('Employee');

/** Used by the '' route: send users to their own dashboard (or login). */
export function roleHomeRedirect(): string {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return '/login';
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? homeUrl(auth.currentUser()) : '/login';
}
