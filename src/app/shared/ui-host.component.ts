import { Component, inject } from '@angular/core';
import { UiService } from '../core/services/ui.service';

/** Renders global toasts and the confirm dialog. */
@Component({
  selector: 'app-ui-host',
  standalone: true,
  template: `
    <div class="toasts no-print">
      @for (t of ui.toasts(); track t.id) {
        <div class="toast" [class]="'toast toast-' + t.type" (click)="ui.dismiss(t.id)">{{ t.text }}</div>
      }
    </div>
    @if (ui.confirmState(); as c) {
      <div class="modal-backdrop" (click)="ui.closeConfirm(false)">
        <div class="modal modal-sm" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          <div class="modal-head"><h3>{{ c.title }}</h3></div>
          <div class="modal-body">{{ c.message }}</div>
          <div class="modal-foot">
            <button type="button" class="btn btn-light" (click)="ui.closeConfirm(false)">Cancel</button>
            <button type="button" class="btn" [class.btn-danger]="c.danger" (click)="ui.closeConfirm(true)">{{ c.confirmText }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .toasts { position: fixed; top: 16px; right: 16px; z-index: 100; display: flex; flex-direction: column; gap: 8px; max-width: 360px; }
    .toast { padding: 12px 16px; border-radius: 12px; color: #fff; font-size: 14px; font-weight: 500; box-shadow: 0 10px 24px rgba(0,0,0,.18); cursor: pointer; }
    .toast-success { background: #16a34a; }
    .toast-error { background: #dc2626; }
    .toast-info { background: #2f80ed; }
  `
})
export class UiHostComponent {
  readonly ui = inject(UiService);
}
