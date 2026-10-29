import { Component, input } from '@angular/core';

/** Loading / empty / error state block. Icons are inline SVG (no emoji/font glyphs, which can render as a box). */
@Component({
  selector: 'app-state',
  standalone: true,
  template: `
    @if (loading()) {
      <div class="state"><div class="spinner"></div>{{ loadingText() }}</div>
    } @else if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    } @else if (empty()) {
      <div class="state">
        <div class="icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 13l2.5-7.5A2 2 0 017.4 4h9.2a2 2 0 011.9 1.5L21 13"/>
            <path d="M3 13v5a2 2 0 002 2h14a2 2 0 002-2v-5h-5.5a3.5 3.5 0 01-7 0z"/>
          </svg>
        </div>
        {{ emptyText() }}
      </div>
    }
  `
})
export class StateComponent {
  readonly loading = input(false);
  readonly error = input<string>('');
  readonly empty = input(false);
  readonly loadingText = input('Loading...');
  readonly emptyText = input('No records found.');
}