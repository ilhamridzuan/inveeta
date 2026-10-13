import React from 'react';
import Image from 'next/image';
import type { PublicEventDTO } from '@inveeta/shared';
import { Heart } from 'lucide-react';

interface CoupleSectionProps {
  event: PublicEventDTO;
}

export function CoupleSection({ event }: CoupleSectionProps) {
  const bridePhoto = event.media.find(
    (m) => m.slotIdentifier === 'bride_photo'
  )?.fileUrl;

  const groomPhoto = event.media.find(
    (m) => m.slotIdentifier === 'groom_photo'
  )?.fileUrl;

  return (
    <section className="py-20 px-6 max-w-4xl mx-auto text-center space-y-12">
      <div className="space-y-3">
        <h2 className="text-xs uppercase tracking-[0.25em] text-gray-500 font-medium">
          Mempelai yang Berbahagia
        </h2>
        <p className="text-3xl sm:text-4xl font-serif text-gray-900 tracking-tight">
          Menyambut Hari Bahagia
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Mempelai Wanita */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative w-44 h-44 rounded-full overflow-hidden shadow-lg border-4 border-white/80 ring-2 ring-gray-200">
            {bridePhoto ? (
              <Image
                src={bridePhoto}
                alt={event.brideName || 'Mempelai Wanita'}
                fill
                sizes="(max-width: 768px) 176px, 176px"
                className="object-cover object-top"
              />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                <span>Foto Mempelai</span>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-serif font-bold text-gray-900">
              {event.brideName || event.brideNickname || 'Mempelai Wanita'}
            </h3>
            {event.brideNickname && (
              <p className="text-sm font-medium text-gray-500 italic">
                ({event.brideNickname})
              </p>
            )}
            {event.brideParents && (
              <p className="text-xs sm:text-sm text-gray-600 max-w-xs pt-2">
                Putri dari Bapak & Ibu {event.brideParents}
              </p>
            )}
          </div>
        </div>

        {/* Mempelai Pria */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative w-44 h-44 rounded-full overflow-hidden shadow-lg border-4 border-white/80 ring-2 ring-gray-200">
            {groomPhoto ? (
              <Image
                src={groomPhoto}
                alt={event.groomName || 'Mempelai Pria'}
                fill
                sizes="(max-width: 768px) 176px, 176px"
                className="object-cover object-top"
              />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                <span>Foto Mempelai</span>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-serif font-bold text-gray-900">
              {event.groomName || event.groomNickname || 'Mempelai Pria'}
            </h3>
            {event.groomNickname && (
              <p className="text-sm font-medium text-gray-500 italic">
                ({event.groomNickname})
              </p>
            )}
            {event.groomParents && (
              <p className="text-xs sm:text-sm text-gray-600 max-w-xs pt-2">
                Putra dari Bapak & Ibu {event.groomParents}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="pt-4 flex items-center justify-center gap-3 text-gray-400">
        <span className="w-12 h-[1px] bg-gray-300" />
        <Heart className="w-4 h-4 text-red-400 fill-red-400" />
        <span className="w-12 h-[1px] bg-gray-300" />
      </div>
    </section>
  );
}
