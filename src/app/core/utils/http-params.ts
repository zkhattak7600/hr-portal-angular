import { HttpParams } from '@angular/common/http';

/** Builds HttpParams, skipping null/undefined/empty values. */
export function toParams(obj: Record<string, unknown> | undefined | null): HttpParams {
  let p = new HttpParams();
  if (!obj) return p;
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined || v === '') continue;
    p = p.set(k, String(v));
  }
  return p;
}
