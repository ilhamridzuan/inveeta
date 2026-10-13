import React from 'react';
import Image from 'next/image';
import type { PublicEventDTO } from '@inveeta/shared';

interface LoveStorySectionProps {
  readonly event: PublicEventDTO;
}

export function LoveStorySection({ event }: Readonly<LoveStorySectionProps>) {
  if (!event.loveStory || event.loveStory.length === 0) return null;

  return (
    <section className="py-20 px-6 max-w-3xl mx-auto space-y-12">
      <div className="text-center space-y-2">
        <h2 className="text-xs uppercase tracking-[0.25em] text-gray-500 font-medium">
          Kisah Kami
        </h2>
        <p className="text-3xl font-serif text-gray-900 tracking-tight">
          Perjalanan Cinta
        </p>
      </div>

      <div className="relative border-l-2 border-gray-200 ml-4 sm:ml-32 space-y-10 pl-6 sm:pl-8">
        {event.loveStory.map((item, index) => (
          <div key={`${item.year}-${index}`} className="relative group">
            {/* Dot indicator */}
            <div className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-4 h-4 rounded-full bg-white border-4 border-gray-400 group-hover:border-gray-900 transition-colors" />

            <div className="space-y-3">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider bg-gray-100 text-gray-800">
                {item.year}
              </span>
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed font-light">
                {item.story}
              </p>
              {item.photoUrl && (
                <div className="relative w-full max-w-sm h-52 rounded-xl overflow-hidden shadow-sm border border-gray-100 mt-3">
                  <Image
                    src={item.photoUrl}
                    alt={`Cerita tahun ${item.year}`}
                    fill
                    sizes="(max-width: 640px) 100vw, 384px"
                    className="object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
