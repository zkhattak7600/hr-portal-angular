import { isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { Employee } from '../../../core/models/hr.models';
import { AuthService } from '../../../core/services/auth.service';
import { MeService, isNoProfile } from '../../../core/services/me.service';
import { UiService } from '../../../core/services/ui.service';
import { apiError, dateOnly } from '../../../core/utils/format';
import { validatePhoto } from '../../../core/utils/photo';
import { AvatarComponent } from '../../../shared/avatar.component';
import { PkrPipe } from '../../../shared/pkr.pipe';
import { StateComponent } from '../../../shared/state.component';
import { NO_PROFILE_TEXT } from '../no-profile';

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [PkrPipe, StateComponent, AvatarComponent],
  template: `
    <section class="page">
      <div class="page-head"><div><h1>My Profile</h1><p>Your employee record (read-only). Contact HR for changes.</p></div></div>
      @if (noProfile()) {
        <div class="alert alert-info">{{ noProfileText }}</div>
      } @else {
        <app-state [loading]="loading()" [error]="error()" loadingText="Loading profile..." />
        @if (emp(); as e) {
          <div class="card">
            <div class="photo-row">
              <div class="photo-wrap" [class.busy]="uploading()">
                <app-avatar [photoUrl]="e.photoUrl" [preview]="preview()" [name]="e.fullName" [size]="112" />
                @if (uploading()) { <div class="photo-overlay">Uploading...</div> }
              </div>
              <div class="photo-actions">
                <input #fileInput type="file" accept="image/*" hidden (change)="onFile($event)" />
                <button type="button" class="btn btn-sm" [disabled]="uploading()" (click)="fileInput.click()">
                  {{ e.photoUrl ? 'Change photo' : 'Upload photo' }}
                </button>
                @if (e.photoUrl) {
                  <button type="button" class="btn btn-light btn-sm" [disabled]="uploading()" (click)="removePhoto()">Remove</button>
                }
                <small class="muted">JPG, PNG or WEBP, max 2 MB.</small>
              </div>
            </div>
            <h2>{{ e.fullName }} <span class="badge" [class]="'badge badge-' + e.status">{{ e.status }}</span></h2>
            <dl class="dl">
              <dt>Employee code</dt><dd>{{ e.employeeCode }}</dd>
              <dt>Email</dt><dd>{{ e.email }}</dd>
              <dt>Phone</dt><dd>{{ e.phone || '-' }}</dd>
              <dt>Designation</dt><dd>{{ e.designation || '-' }}</dd>
              <dt>Department</dt><dd>{{ e.departmentName }}</dd>
              <dt>Joining date</dt><dd>{{ dateOnly(e.joiningDate) }}</dd>
              <dt>Basic salary</dt><dd>{{ e.basicSalary | pkr }}</dd>
            </dl>
          </div>
        }
      }
    </section>
  `,
  styles: [`
    .photo-row { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; margin-bottom: 16px; }
    .photo-wrap { position: relative; border-radius: 50%; box-shadow: 0 2px 10px rgba(0,0,0,.12); }
    .photo-wrap.busy { opacity: .75; }
    .photo-overlay { position: absolute; inset: 0; border-radius: 50%; display: flex; align-items: center;
      justify-content: center; background: rgba(0,0,0,.45); color: #fff; font-size: 12px; font-weight: 600; }
    .photo-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .photo-actions small { width: 100%; }
  `]
})
export class MyProfileComponent implements OnInit, OnDestroy {
  private readonly me = inject(MeService);
  private readonly auth = inject(AuthService);
  private readonly ui = inject(UiService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly noProfileText = NO_PROFILE_TEXT;
  readonly dateOnly = dateOnly;
  readonly loading = signal(true);
  readonly error = signal('');
  readonly noProfile = signal(false);
  readonly emp = signal<Employee | null>(null);
  readonly preview = signal<string | null>(null);
  readonly uploading = signal(false);

  ngOnInit(): void {
    this.me.profile().subscribe({
      next: e => { this.emp.set(e); this.loading.set(false); },
      error: err => { this.loading.set(false); if (isNoProfile(err)) this.noProfile.set(true); else this.error.set(apiError(err)); }
    });
  }

  ngOnDestroy(): void { this.clearPreview(); }

  onFile(ev: Event): void {
    const inputEl = ev.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    inputEl.value = '';
    if (!file || !this.isBrowser) return;
    const err = validatePhoto(file);
    if (err) { this.ui.error(err); return; }
    this.clearPreview();
    this.preview.set(URL.createObjectURL(file));
    this.uploading.set(true);
    this.me.uploadPhoto(file).subscribe({
      next: r => {
        this.uploading.set(false);
        this.emp.update(e => (e ? { ...e, photoUrl: r.photoUrl } : e));
        this.auth.setPhotoUrl(r.photoUrl);
        this.clearPreview();
        this.ui.success('Profile photo updated.');
      },
      error: e => { this.uploading.set(false); this.clearPreview(); this.ui.error(apiError(e, 'Could not upload photo.')); }
    });
  }

  async removePhoto(): Promise<void> {
    if (!(await this.ui.confirm('Remove your profile photo?', { confirmText: 'Remove' }))) return;
    this.uploading.set(true);
    this.me.deletePhoto().subscribe({
      next: () => {
        this.uploading.set(false);
        this.emp.update(e => (e ? { ...e, photoUrl: null } : e));
        this.auth.setPhotoUrl(null);
        this.ui.success('Profile photo removed.');
      },
      error: e => { this.uploading.set(false); this.ui.error(apiError(e, 'Could not remove photo.')); }
    });
  }

  private clearPreview(): void {
    const p = this.preview();
    if (p && this.isBrowser) URL.revokeObjectURL(p);
    this.preview.set(null);
  }
}