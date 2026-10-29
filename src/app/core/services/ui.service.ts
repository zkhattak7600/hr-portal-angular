import { Injectable, signal } from '@angular/core';

export interface Toast { id: number; type: 'success' | 'error' | 'info'; text: string; }
export interface ConfirmState { title: string; message: string; confirmText: string; danger: boolean; resolve: (ok: boolean) => void; }

/** App-wide toasts and confirm dialog. */
@Injectable({ providedIn: 'root' })
export class UiService {
  private seq = 0;
  readonly toasts = signal<Toast[]>([]);
  readonly confirmState = signal<ConfirmState | null>(null);

  success(text: string): void { this.push('success', text); }
  error(text: string): void { this.push('error', text); }
  info(text: string): void { this.push('info', text); }
  dismiss(id: number): void { this.toasts.update(t => t.filter(x => x.id !== id)); }

  confirm(message: string, opts: { title?: string; confirmText?: string; danger?: boolean } = {}): Promise<boolean> {
    return new Promise(resolve => this.confirmState.set({
      title: opts.title ?? 'Please confirm', message,
      confirmText: opts.confirmText ?? 'Confirm', danger: opts.danger ?? true, resolve
    }));
  }

  closeConfirm(ok: boolean): void {
    const s = this.confirmState();
    this.confirmState.set(null);
    s?.resolve(ok);
  }

  private push(type: Toast['type'], text: string): void {
    const id = ++this.seq;
    this.toasts.update(t => [...t, { id, type, text }]);
    setTimeout(() => this.dismiss(id), type === 'error' ? 6000 : 3500);
  }
}
