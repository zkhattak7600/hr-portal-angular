import { HttpErrorResponse } from '@angular/common/http';

const pkr = new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 });
export function formatPkr(v: number | null | undefined): string {
  return pkr.format(Number(v ?? 0));
}

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** yyyy-MM-dd for a local date. */
export function toIsoDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** yyyy-MM-dd part of an API date string. */
export function dateOnly(v: string | null | undefined): string {
  return v ? v.substring(0, 10) : '';
}

/** HH:mm part of an API time string. */
export function timeOnly(v: string | null | undefined): string {
  return v ? v.substring(0, 5) : '';
}

/** 12-hour time with AM/PM, e.g. 09:05 AM. */
export function time12(v: string | null | undefined): string {
  const s = timeOnly(v);
  if (!/^\d{2}:\d{2}$/.test(s)) return s;
  let h = +s.substring(0, 2);
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return String(h).padStart(2, '0') + ':' + s.substring(3) + ' ' + ap;
}

/** Inclusive day count between two yyyy-MM-dd strings (0 if invalid). */
export function dayCount(start: string, end: string): number {
  if (!start || !end) return 0;
  const a = Date.parse(start + 'T00:00:00');
  const b = Date.parse(end + 'T00:00:00');
  if (isNaN(a) || isNaN(b) || b < a) return 0;
  return Math.round((b - a) / 86400000) + 1;
}

/** Readable message from an API error ({message} or ProblemDetails). */
export function apiError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!(err instanceof HttpErrorResponse)) return fallback;
  if (err.status === 0) return 'Cannot reach the server. Is the API running?';
  const body = err.error;
  if (body && typeof body === 'object') {
    if (body.errors && typeof body.errors === 'object') {
      const msgs = Object.values(body.errors as Record<string, string[] | string>).flat();
      if (msgs.length) return msgs.join(' ');
    }
    for (const k of ['message', 'detail', 'title']) {
      if (typeof body[k] === 'string' && body[k]) return body[k];
    }
  }
  if (typeof body === 'string' && body.trim()) return body;
  if (err.status === 403) return 'You are not allowed to perform this action.';
  if (err.status === 404) return 'Record not found.';
  return fallback;
}
