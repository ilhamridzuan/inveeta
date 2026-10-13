'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import type { PublicEventDTO } from '@inveeta/shared';
import { MailOpen, Heart } from 'lucide-react';

interface CoverModalProps {
  readonly event: PublicEventDTO;
  readonly guestName?: string | null;
  readonly onOpen?: () => void;
}

/**
 * Fullscreen Cover Modal ("Buka Undangan" Screen).
 * Memenuhi Browser Autoplay Policy: Audio dipicu langsung pada event klik user.
 */
export function CoverModal({
  event,
  guestName,
  onOpen,
}: Readonly<CoverModalProps>) {
  const [isOpen, setIsOpen] = useState(false);

  const bride = event.brideNickname || event.brideName || 'Mempelai Wanita';
  const groom = event.groomNickname || event.groomName || 'Mempelai Pria';

  const coverMedia =
    event.media.find((m) => m.slotIdentifier === 'cover_photo') ||
    event.media.find((m) => m.mediaType === 'photo');

  const coverImageUrl =
    coverMedia?.fileUrl ||
    event.ogImageUrl ||
    'https://cdn.inveeta.com/defaults/default-cover.webp';

  const handleOpenInvitation = () => {
    // 1. Pemicu audio playback langsung pada user gesture (Autoplay Workaround)
    const audioElement = document.getElementById(
      'inveeta-bgm'
    ) as HTMLAudioElement | null;
    if (audioElement) {
      audioElement.play().catch((err) => {
        console.warn('[CoverModal] Pemutaran audio otomatis ditolak:', err);
      });
    }

    // 2. Set state terbuka untuk animasi slide-up & fade-out
    setIsOpen(true);
    onOpen?.();
  };

  return (
    <div
      aria-hidden={isOpen}
      className={`fixed inset-0 z-50 flex flex-col justify-between items-center text-center p-8 transition-all duration-1000 ease-in-out ${
        isOpen
          ? '-translate-y-full opacity-0 pointer-events-none'
          : 'translate-y-0 opacity-100'
      }`}
    >
      {/* Background Image with Dark & Blur Overlay */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <Image
          src={coverImageUrl}
          alt={`Pernikahan ${bride} & ${groom}`}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center scale-105 filter blur-[2px]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
      </div>

      {/* Header Info */}
      <div className="pt-8 space-y-2 text-white/90">
        <p className="text-xs uppercase tracking-[0.3em] font-light">
          Walimatul Ursy
        </p>
        <h2 className="text-xl sm:text-2xl font-serif tracking-widest font-light">
          The Wedding of
        </h2>
      </div>

      {/* Center Couple Typography */}
      <div className="space-y-4 text-white my-auto py-6">
        <h1 className="text-4xl sm:text-6xl font-serif font-bold tracking-tight drop-shadow-md">
          {bride} <span className="text-amber-300 font-light">&</span> {groom}
        </h1>
        <div className="flex items-center justify-center gap-2 text-amber-200/80 text-xs">
          <span className="h-[1px] w-8 bg-amber-200/50" />
          <Heart className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
          <span className="h-[1px] w-8 bg-amber-200/50" />
        </div>
      </div>

      {/* Guest Card & Open Button */}
      <div className="w-full max-w-sm pb-8 space-y-6">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 text-white space-y-1 shadow-xl">
          <p className="text-xs text-white/70 uppercase tracking-widest font-light">
            Kepada Yth. Bapak/Ibu/Saudara/i:
          </p>
          <p className="text-lg sm:text-xl font-serif font-semibold text-white tracking-wide">
            {guestName || 'Tamu Undangan'}
          </p>
          {guestName && (
            <p className="text-[11px] text-amber-200/90 font-light italic">
              Di Tempat
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleOpenInvitation}
          className="group relative w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-full bg-amber-500 hover:bg-amber-400 active:scale-95 text-gray-900 font-medium text-sm transition-all duration-300 shadow-xl shadow-amber-900/30 hover:shadow-amber-500/30"
        >
          <MailOpen className="w-4 h-4 text-gray-900 transition-transform group-hover:scale-110" />
          <span>Buka Undangan</span>
        </button>
      </div>
    </div>
  );
}
