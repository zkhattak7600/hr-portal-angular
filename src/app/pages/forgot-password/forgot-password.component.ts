import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

const match = (g: AbstractControl): ValidationErrors | null =>
  g.get('newPassword')?.value === g.get('confirm')?.value ? null : { mismatch: true };

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: '../login/login.component.css'
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  step: 1 | 2 | 3 = 1;
  loading = false;
  submitted1 = false;
  submitted2 = false;
  showPassword = false;
  errorMessage = '';
  infoMessage = '';
  devCode = '';
  successMessage = '';

  emailForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  resetForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirm: ['', [Validators.required]]
  }, { validators: match });

  err1(): boolean {
    const c = this.emailForm.controls.email;
    return c.invalid && (c.touched || this.submitted1);
  }

  err2(name: 'code' | 'newPassword' | 'confirm'): boolean {
    const c = this.resetForm.controls[name];
    const shown = c.touched || this.submitted2;
    if (name === 'confirm') return shown && (c.invalid || this.resetForm.hasError('mismatch'));
    return shown && c.invalid;
  }

  requestCode(): void {
    this.submitted1 = true;
    this.errorMessage = '';
    if (this.emailForm.invalid) { this.emailForm.markAllAsTouched(); return; }
    this.loading = true;
    this.auth.forgotPassword(this.emailForm.getRawValue().email)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: res => {
          this.infoMessage = res.message;
          this.devCode = res.devCode ?? '';
          this.step = 2;
        },
        error: (e: HttpErrorResponse) => (this.errorMessage = this.text(e, 'Could not request a reset code.'))
      });
  }

  resetPassword(): void {
    this.submitted2 = true;
    this.errorMessage = '';
    if (this.resetForm.invalid) { this.resetForm.markAllAsTouched(); return; }
    const { code, newPassword } = this.resetForm.getRawValue();
    this.loading = true;
    this.auth.resetPassword({ email: this.emailForm.getRawValue().email, code, newPassword })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: res => { this.successMessage = res.message; this.step = 3; },
        error: (e: HttpErrorResponse) => (this.errorMessage = this.text(e, 'Could not reset password.'))
      });
  }

  back(): void {
    this.step = 1;
    this.errorMessage = '';
    this.submitted2 = false;
    this.resetForm.reset();
  }

  private text(e: HttpErrorResponse, fallback: string): string {
    if (e.status === 0) return 'Cannot reach the server. Is the API running?';
    const err = e.error;
    if (err?.errors && typeof err.errors === 'object') return (Object.values(err.errors) as unknown[]).flat().join(' ');
    return err?.message ?? fallback;
  }
}