import React from 'react';
import type { PublicEventDTO } from '@inveeta/shared';

interface QuoteSectionProps {
  event: PublicEventDTO;
}

export function QuoteSection({ event }: QuoteSectionProps) {
  if (!event.quoteText) return null;

  return (
    <section className="py-16 px-6 bg-gray-50/50 text-center">
      <div className="max-w-2xl mx-auto space-y-4">
        <span className="text-4xl text-gray-400 font-serif leading-none select-none">
          “
        </span>
        <blockquote className="text-base sm:text-lg font-serif italic text-gray-700 leading-relaxed">
          {event.quoteText}
        </blockquote>
        {event.quoteSource && (
          <cite className="block text-xs uppercase tracking-widest text-gray-500 font-semibold not-italic">
            — {event.quoteSource}
          </cite>
        )}
      </div>
    </section>
  );
}
