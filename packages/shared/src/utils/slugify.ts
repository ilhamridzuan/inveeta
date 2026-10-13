/**
 * Mengubah string judul menjadi format URL-safe kebab-case.
 * Contoh: "Andi & Siti's Wedding! 2026" -> "andi-sitis-wedding-2026"
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Ganti spasi dengan tanda hubung
    .replace(/[^\w\-]+/g, '') // Hapus seluruh karakter non-kata kecuali minus
    .replace(/\-\-+/g, '-') // Ganti minus berulang dengan minus tunggal
    .replace(/^-+/, '') // Hapus minus di awal
    .replace(/-+$/, ''); // Hapus minus di akhir
}
