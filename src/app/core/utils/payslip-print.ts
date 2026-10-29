import { Payslip } from '../models/hr.models';

/**
 * "Download PDF" without extra dependencies: the open payslip modal is print-styled (@media print in styles.css),
 * so the browser print dialog can "Save as PDF". The document title becomes the suggested file name.
 * Browser-only: callers must guard with isPlatformBrowser.
 */
export function printPayslip(p: Payslip): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const prev = document.title;
  const code = (p.employeeCode || 'employee').replace(/[^A-Za-z0-9_-]/g, '');
  document.title = `Payslip-${code}-${p.year}-${String(p.month).padStart(2, '0')}`;
  document.body.classList.add('printing-slip');
  const restore = () => {
    document.title = prev;
    document.body.classList.remove('printing-slip');
    window.removeEventListener('afterprint', restore);
  };
  window.addEventListener('afterprint', restore);
  // Let the modal finish rendering before opening the dialog.
  setTimeout(() => { window.print(); setTimeout(restore, 1000); }, 50);
}