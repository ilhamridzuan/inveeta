import React from 'react';
import type { Metadata } from 'next';
import { getCachedPublicEvent } from '@/lib/api-client';
import { TemplateRenderer } from '@/components/TemplateRenderer';

interface PageProps {
  readonly params: Promise<{ slug: string }>;
}

/**
 * Metadata Open Graph WhatsApp & Media Sosial (TDD §7.3).
 * Menghasilkan kartu preview instan tanpa komputasi dinamis @vercel/og runtime.
 */
export async function generateMetadata({
  params,
}: Readonly<PageProps>): Promise<Metadata> {
  const { slug } = await params;
  const event = await getCachedPublicEvent(slug);

  if (!event) {
    return {
      title: 'Undangan Tidak Ditemukan — Inveeta',
      description: 'Halaman undangan pernikahan tidak ditemukan.',
    };
  }

  const bride = event.brideNickname || event.brideName || 'Mempelai Wanita';
  const groom = event.groomNickname || event.groomName || 'Mempelai Pria';
  const title = `The Wedding of ${bride} & ${groom}`;
  const description =
    event.quoteText ||
    'Tanpa mengurangi rasa hormat, kami mengundang Anda untuk hadir pada momen bahagia pernikahan kami.';
  const ogImageUrl =
    event.ogImageUrl || 'https://cdn.inveeta.com/defaults/default-cover.webp';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://inveeta.com/${slug}`,
      siteName: 'Inveeta',
      locale: 'id_ID',
      type: 'website',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

/**
 * Server Component Halaman Undangan Publik Umum (TDD §7.4).
 * Di-render di server dan di-cache melalui On-Demand ISR Tags.
 */
export default async function PublicEventPage({
  params,
}: Readonly<PageProps>) {
  const { slug } = await params;
  const event = await getCachedPublicEvent(slug);

  if (!event) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gray-50">
        <div className="max-w-md space-y-4">
          <h1 className="text-3xl font-serif font-bold text-gray-800 tracking-tight">
            Undangan Tidak Ditemukan
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed font-light">
            Mohon maaf, tautan undangan yang Anda buka tidak valid atau belum
            dipublikasikan oleh penyelenggara acara.
          </p>
          <div className="pt-2">
            <a
              href="https://inveeta.com"
              className="inline-flex px-5 py-2.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-colors shadow-sm"
            >
              Kembali ke Beranda
            </a>
          </div>
        </div>
      </main>
    );
  }

  return <TemplateRenderer event={event} />;
}
