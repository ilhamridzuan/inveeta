import React from 'react';
import Image from 'next/image';
import type { PublicEventDTO } from '@inveeta/shared';
import { formatEventDateTime } from '@inveeta/shared';
import { Calendar, Heart } from 'lucide-react';

interface CoverSectionProps {
  event: PublicEventDTO;
}

function calculateStaticCountdown(targetDateIso: string) {
  const target = new Date(targetDateIso).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, target - now);

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diffMs / (1000 * 60)) % 60);

  return { days, hours, minutes };
}

export function CoverSection({ event }: CoverSectionProps) {
  const coverMedia =
    event.media.find((m) => m.slotIdentifier === 'cover_photo') ||
    event.media.find((m) => m.mediaType === 'photo');

  const coverImageUrl =
    coverMedia?.fileUrl ||
    event.ogImageUrl ||
    'https://cdn.inveeta.com/defaults/default-cover.webp';

  const countdown = event.eventDate
    ? calculateStaticCountdown(event.eventDate)
    : null;

  const formattedDate = event.eventDate
    ? formatEventDateTime(event.eventDate, event.timeZone, false)
    : null;

  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-between text-center overflow-hidden py-16 px-4">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 -z-10">
        <Image
          src={coverImageUrl}
          alt={event.title}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center filter brightness-[0.7]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/80" />
      </div>

      {/* Top Pre-header */}
      <div className="pt-6 text-white/90 space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] font-medium">
          The Wedding of
        </p>
        <div className="flex items-center justify-center gap-2">
          <span className="w-8 h-[1px] bg-white/40" />
          <Heart className="w-4 h-4 text-white/80 fill-white/80" />
          <span className="w-8 h-[1px] bg-white/40" />
        </div>
      </div>

      {/* Main Couple Nicknames */}
      <div className="my-auto py-8 text-white space-y-4">
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-serif tracking-tight drop-shadow-md">
          {event.brideNickname || 'Mempelai Wanita'}
          <span className="block text-3xl sm:text-4xl my-2 font-sans font-light italic text-white/80">
            &
          </span>
          {event.groomNickname || 'Mempelai Pria'}
        </h1>
        <p className="text-sm sm:text-base text-white/90 max-w-md mx-auto font-light">
          {event.title}
        </p>
      </div>

      {/* Date & Static Countdown */}
      <div className="w-full max-w-sm mx-auto text-white space-y-6">
        {formattedDate && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs sm:text-sm">
            <Calendar className="w-4 h-4 text-white/80" />
            <span>{formattedDate}</span>
          </div>
        )}

        {countdown && (
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-black/40 backdrop-blur-md border border-white/15">
              <span className="block text-2xl font-bold font-serif">
                {countdown.days}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-white/70">
                Hari
              </span>
            </div>
            <div className="p-3 rounded-xl bg-black/40 backdrop-blur-md border border-white/15">
              <span className="block text-2xl font-bold font-serif">
                {countdown.hours}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-white/70">
                Jam
              </span>
            </div>
            <div className="p-3 rounded-xl bg-black/40 backdrop-blur-md border border-white/15">
              <span className="block text-2xl font-bold font-serif">
                {countdown.minutes}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-white/70">
                Menit
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
