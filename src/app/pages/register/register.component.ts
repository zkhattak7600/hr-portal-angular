import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: '../login/login.component.css'
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  submitted = false;
  loading = false;
  errorMessage = '';
  successMessage = '';
  showPassword = false;

  form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  showError(name: 'fullName' | 'email' | 'password'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted);
  }

  register(): void {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.auth
      .register(this.form.getRawValue())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: user => {
          if (user?.employeeId == null) {
            this.successMessage = 'Account created. You can log in once HR adds you to the system.';
            this.form.reset();
            this.submitted = false;
            return;
          }
          this.successMessage = 'Account created! Redirecting to login...';
          setTimeout(() => void this.router.navigateByUrl('/login'), 1200);
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 409) this.errorMessage = 'Email already exists.';
          else if (err.status === 400) this.errorMessage = this.validationText(err) ?? 'Please check the entered details.';
          else if (err.status === 0) this.errorMessage = 'Cannot reach the server. Is the API running?';
          else this.errorMessage = err.error?.message ?? 'Registration failed. Please try again.';
        }
      });
  }

  private validationText(err: HttpErrorResponse): string | null {
    const e = err.error;
    if (e?.errors && typeof e.errors === 'object') {
      return (Object.values(e.errors) as unknown[]).flat().join(' ');
    }
    return e?.message ?? (typeof e === 'string' ? e : null);
  }
}