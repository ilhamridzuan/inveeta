/**
 * Mengubah string judul menjadi format URL-safe kebab-case.
 * Contoh: "Andi & Siti's Wedding! 2026" -> "andi-sitis-wedding-2026"
 */
export function slugify(text: string): string {
  let slug = text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Ganti spasi dengan tanda hubung
    .replace(/[^\w-]+/g, '') // Hapus seluruh karakter non-kata kecuali minus
    .replace(/-{2,}/g, '-'); // Ganti minus berulang dengan minus tunggal

  while (slug.startsWith('-')) {
    slug = slug.slice(1);
  }
  while (slug.endsWith('-')) {
    slug = slug.slice(0, -1);
  }

  return slug;
}
