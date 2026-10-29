import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../models/auth.models';

const TOKEN_KEY = 'elm-token';
const USER_KEY = 'elm-user';
const EXPIRY_KEY = 'elm-expiry';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  private readonly _user = signal<User | null>(this.readUser());
  readonly currentUser = this._user.asReadonly();

  login(body: LoginRequest, remember = true): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, body).pipe(
      tap(res => this.saveSession(res, remember))
    );
  }

  register(body: RegisterRequest): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/register`, body);
  }

  /** Dev: API returns devCode since there is no email service. */
  forgotPassword(email: string): Observable<{ message: string; devCode?: string }> {
    return this.http.post<{ message: string; devCode?: string }>(`${this.baseUrl}/forgot-password`, { email });
  }

  resetPassword(body: { email: string; code: string; newPassword: string }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/reset-password`, body);
  }

  me(): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/me`).pipe(
      tap(user => {
        this._user.set(user);
        this.activeStorage()?.setItem(USER_KEY, JSON.stringify(user));
      })
    );
  }

  /** Update the cached user's photo (e.g. after upload) so the top bar refreshes. */
  setPhotoUrl(photoUrl: string | null): void {
    const u = this._user();
    if (!u) return;
    const next = { ...u, photoUrl };
    this._user.set(next);
    this.activeStorage()?.setItem(USER_KEY, JSON.stringify(next));
  }

  logout(): void {
    if (this.isBrowser) {
      for (const s of [localStorage, sessionStorage]) {
        [TOKEN_KEY, USER_KEY, EXPIRY_KEY].forEach(k => s.removeItem(k));
      }
    }
    this._user.set(null);
    void this.router.navigateByUrl('/login');
  }

  getToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;
    const expiry = localStorage.getItem(EXPIRY_KEY) ?? sessionStorage.getItem(EXPIRY_KEY);
    return !(expiry && new Date(expiry).getTime() <= Date.now());
  }

  private saveSession(res: AuthResponse, remember: boolean): void {
    if (this.isBrowser) {
      const target = remember ? localStorage : sessionStorage;
      const other = remember ? sessionStorage : localStorage;
      [TOKEN_KEY, USER_KEY, EXPIRY_KEY].forEach(k => other.removeItem(k));
      target.setItem(TOKEN_KEY, res.token);
      target.setItem(EXPIRY_KEY, res.expiry);
      target.setItem(USER_KEY, JSON.stringify(res.user));
    }
    this._user.set(res.user);
  }

  private activeStorage(): Storage | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage;
  }

  private readUser(): User | null {
    if (!this.isBrowser) return null;
    const raw = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
    try {
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }
}