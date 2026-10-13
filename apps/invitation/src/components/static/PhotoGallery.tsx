import React from 'react';
import Image from 'next/image';
import type { PublicEventDTO } from '@inveeta/shared';

interface PhotoGalleryProps {
  event: PublicEventDTO;
}

export function PhotoGallery({ event }: PhotoGalleryProps) {
  // Ambil media foto galeri (mengecualikan slot tunggal khusus cover dan profil jika ada foto khusus)
  const galleryPhotos = event.media.filter(
    (m) =>
      m.mediaType === 'photo' &&
      m.slotIdentifier !== 'bride_photo' &&
      m.slotIdentifier !== 'groom_photo'
  );

  const photosToDisplay =
    galleryPhotos.length > 0
      ? galleryPhotos
      : event.media.filter((m) => m.mediaType === 'photo');

  if (photosToDisplay.length === 0) return null;

  return (
    <section className="py-20 px-6 max-w-5xl mx-auto space-y-12">
      <div className="text-center space-y-2">
        <h2 className="text-xs uppercase tracking-[0.25em] text-gray-500 font-medium">
          Momen Indah
        </h2>
        <p className="text-3xl font-serif text-gray-900 tracking-tight">
          Galeri Foto
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        {photosToDisplay.map((photo, index) => (
          <div
            key={photo.id}
            className={`relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group bg-gray-100 ${
              index === 0 ? 'col-span-2 md:col-span-2 aspect-[16/9]' : 'aspect-square'
            }`}
          >
            <Image
              src={photo.fileUrl}
              alt={`Galeri foto ${index + 1}`}
              fill
              sizes="(max-width: 768px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
