import { Component, computed, input, signal, effect } from '@angular/core';
import { initials, photoSrc } from '../core/utils/photo';

/** Circular avatar: photo when available, initials otherwise. SSR-safe (plain img/text). */
@Component({
  selector: 'app-avatar',
  standalone: true,
  template: `
    <span class="app-avatar" [style.width.px]="size()" [style.height.px]="size()" [style.font-size.px]="size() * 0.4">
      @if (src() && !failed()) {
        <img [src]="src()" [alt]="name() + ' photo'" (error)="failed.set(true)" />
      } @else {
        {{ letters() }}
      }
    </span>
  `,
  styles: [`
    :host { display: inline-flex; flex-shrink: 0; }
    .app-avatar { display: inline-flex; align-items: center; justify-content: center; border-radius: 50%;
      overflow: hidden; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff; font-weight: 600;
      line-height: 1; user-select: none; }
    .app-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
  `]
})
export class AvatarComponent {
  readonly photoUrl = input<string | null | undefined>(null);
  /** Optional local preview (blob:/data: URL) that takes priority over photoUrl. */
  readonly preview = input<string | null | undefined>(null);
  readonly name = input<string | null | undefined>('');
  readonly size = input<number>(36);
  readonly failed = signal(false);
  readonly src = computed(() => this.preview() || photoSrc(this.photoUrl()));
  readonly letters = computed(() => initials(this.name()));

  constructor() {
    effect(() => { this.src(); this.failed.set(false); }, { allowSignalWrites: true });
  }
}