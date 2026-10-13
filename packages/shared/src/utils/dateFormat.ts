import type { IndonesiaTimeZone } from '../constants/categories.js';

export const TIME_ZONE_LABEL_MAP: Record<IndonesiaTimeZone, string> = {
  'Asia/Jakarta': 'WIB',
  'Asia/Makassar': 'WITA',
  'Asia/Jayapura': 'WIT',
};

/**
 * Format string ISO 8601 ke dalam format ramah bahasa Indonesia dengan zona waktu akurat.
 * Menggunakan standar IANA Identifier untuk kompatibilitas native Intl.DateTimeFormat tanpa RangeError.
 * Contoh output: "Sabtu, 12 Desember 2026 • 19:00 WIB"
 */
export function formatEventDateTime(
  isoDateString: string,
  timeZone: IndonesiaTimeZone = 'Asia/Jakarta',
  includeTime = true
): string {
  const date = new Date(isoDateString);
  const label = TIME_ZONE_LABEL_MAP[timeZone] || 'WIB';

  const datePart = new Intl.DateTimeFormat('id-ID', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);

  if (!includeTime) return datePart;

  const timePart = new Intl.DateTimeFormat('id-ID', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

  return `${datePart} • ${timePart} ${label}`;
}
