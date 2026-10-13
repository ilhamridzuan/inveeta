/**
 * Normalisasi format nomor telepon WhatsApp ke format E.164 tanpa simbol '+' (contoh: 628123456789).
 */
export function normalizeWhatsAppNumber(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) return '62' + cleaned.slice(1);
  if (cleaned.startsWith('62')) return cleaned;
  return cleaned;
}

/**
 * Menghasilkan tautan wa.me langsung dengan teks pesan ter-encode.
 */
export function formatWhatsAppLink(phone: string, message?: string): string {
  const normalized = normalizeWhatsAppNumber(phone);
  const baseUrl = `https://wa.me/${normalized}`;
  if (!message) return baseUrl;
  return `${baseUrl}?text=${encodeURIComponent(message)}`;
}
