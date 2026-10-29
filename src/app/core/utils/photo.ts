import { environment } from '../../../environments/environment';

/** API origin (e.g. http://localhost:5000) used to resolve relative upload URLs like /uploads/avatars/x.png. */
export const API_ORIGIN = environment.apiUrl.replace(/\/api\/?$/, '');

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXT = /\.(jpe?g|png|webp)$/i;

/** Absolute URL for a stored photo, or null. */
export function photoSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : API_ORIGIN + (url.startsWith('/') ? url : '/' + url);
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return ((parts[0][0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** Client-side check mirroring the API rules. Returns an error message or null. */
export function validatePhoto(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXT.test(file.name)) return 'Only JPG, PNG or WEBP images are allowed.';
  if (file.size > MAX_PHOTO_BYTES) return 'Image must be 2 MB or smaller.';
  return null;
}