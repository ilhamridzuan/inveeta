/**
 * Custom Cloudflare Image Loader untuk apps/invitation (TDD §9.3.C).
 * Mengarahkan gambar Cloudflare R2 via cdn.inveeta.com untuk zero-egress fee
 * dan transformasi gambar CDN Cloudflare tanpa membebani Vercel compute.
 */
export default function cloudflareImageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  if (src.startsWith('https://cdn.inveeta.com')) {
    const q = quality || 85;
    return `${src}?w=${width}&q=${q}`;
  }
  return src;
}
