import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

/**
 * Route handler webhook internal untuk On-Demand ISR Revalidation (TDD §7.2.A).
 * Melindungi cache purge Vercel CDN menggunakan x-revalidate-secret.
 */
export async function POST(req: NextRequest) {
  // 1. Verifikasi shared secret otorisasi internal
  const secret = req.headers.get('x-revalidate-secret');
  if (!secret || secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json(
      { success: false, message: 'Akses ditolak: shared secret tidak valid' },
      { status: 401 }
    );
  }

  try {
    const body = (await req.json()) as { tag?: string };
    const { tag } = body;

    if (!tag || typeof tag !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Tag wajib disertakan dalam format string' },
        { status: 400 }
      );
    }

    // 2. Bersihkan cache Next.js Data Cache / Vercel Edge CDN untuk tag terkait
    revalidateTag(tag);

    return NextResponse.json({
      success: true,
      revalidated: true,
      tag,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Gagal melakukan revalidasi';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
