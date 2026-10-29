import { Component, computed, input, output } from '@angular/core';

/** Client-side pagination bar: range text, page buttons and page-size select. */
@Component({
  selector: 'app-pagination',
  standalone: true,
  template: `
    @if (total() > 0) {
      <div class="pagination">
        <span class="muted">Showing {{ from() }}&ndash;{{ to() }} of {{ total() }}</span>
        <div class="pagination-pages">
          <button type="button" class="btn btn-light btn-sm" [disabled]="current() === 1" (click)="go(1)">First</button>
          <button type="button" class="btn btn-light btn-sm" [disabled]="current() === 1" (click)="go(current() - 1)">&lsaquo; Prev</button>
          @for (p of pages(); track $index) {
            @if (p === 0) {
              <span class="pagination-ellipsis">&hellip;</span>
            } @else {
              <button type="button" class="btn btn-sm" [class.btn-light]="p !== current()" (click)="go(p)">{{ p }}</button>
            }
          }
          <button type="button" class="btn btn-light btn-sm" [disabled]="current() === pageCount()" (click)="go(current() + 1)">Next &rsaquo;</button>
          <button type="button" class="btn btn-light btn-sm" [disabled]="current() === pageCount()" (click)="go(pageCount())">Last</button>
        </div>
        <label class="pagination-size muted">Rows
          <select class="input" [value]="pageSize()" (change)="changeSize($event)">
            @for (s of sizes; track s) { <option [value]="s" [selected]="s === pageSize()">{{ s }}</option> }
          </select>
        </label>
      </div>
    }
  `
})
export class PaginationComponent {
  readonly total = input(0);
  readonly page = input(1);
  readonly pageSize = input(10);
  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();
  readonly sizes = [10, 25, 50];

  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  readonly current = computed(() => Math.min(Math.max(1, this.page()), this.pageCount()));
  readonly from = computed(() => (this.current() - 1) * this.pageSize() + 1);
  readonly to = computed(() => Math.min(this.total(), this.current() * this.pageSize()));

  /** Page numbers with 0 as an ellipsis marker. */
  readonly pages = computed(() => {
    const n = this.pageCount(), c = this.current();
    if (n <= 7) return Array.from({ length: n }, (_, i) => i + 1);
    const out: number[] = [1];
    const start = Math.max(2, c - 1), end = Math.min(n - 1, c + 1);
    if (start > 2) out.push(0);
    for (let i = start; i <= end; i++) out.push(i);
    if (end < n - 1) out.push(0);
    out.push(n);
    return out;
  });

  go(p: number): void {
    const t = Math.min(Math.max(1, p), this.pageCount());
    if (t !== this.current()) this.pageChange.emit(t);
  }

  changeSize(e: Event): void {
    this.pageSizeChange.emit(Number((e.target as HTMLSelectElement).value));
  }
}

/** Slice helper for signal-based client-side paging. */
export function paginate<T>(rows: T[], page: number, size: number): T[] {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const p = Math.min(Math.max(1, page), pages);
  return rows.slice((p - 1) * size, p * size);
}