import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { homeUrl } from '../../core/guards/auth.guard';
import { PortalRole } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  constructor() {
    if (this.route.snapshot.queryParamMap.get('reason') === 'not-linked')
      this.errorMessage = 'Your account is not registered in the HR system yet. Please contact HR.';
  }

  submitted = false;
  loading = false;
  errorMessage = '';
  touchMessage = '';
  showPassword = false;
  loginAs: PortalRole = 'Employee';

  setRole(role: PortalRole): void {
    this.loginAs = role;
    this.errorMessage = '';
  }

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    keepLoggedIn: [true]
  });

  showError(name: 'email' | 'password'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted);
  }

  login(): void {
    this.submitted = true;
    this.touchMessage = '';
    this.errorMessage = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password, keepLoggedIn } = this.form.getRawValue();
    this.loading = true;
    this.auth
      .login({ email, password, loginAs: this.loginAs }, keepLoggedIn)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: res => void this.router.navigateByUrl(homeUrl(res.user)),
        error: (err: HttpErrorResponse) => {
          if (err.status === 403) this.errorMessage = err.error?.message ?? 'This account cannot use this portal.';
          else if (err.status === 401) this.errorMessage = 'Invalid email or password.';
          else if (err.status === 0) this.errorMessage = 'Cannot reach the server. Is the API running?';
          else this.errorMessage = err.error?.message ?? err.error?.title ?? 'Login failed. Please try again.';
        }
      });
  }

  loginWithTouchId(): void {
    this.errorMessage = '';
    this.touchMessage = 'Touch ID is not set up on this device. Use email login.';
  }
}