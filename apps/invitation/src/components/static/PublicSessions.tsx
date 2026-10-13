import React from 'react';
import type { PublicEventDTO } from '@inveeta/shared';
import { formatEventDateTime } from '@inveeta/shared';
import { MapPin, Clock, ExternalLink, Navigation } from 'lucide-react';

interface PublicSessionsProps {
  event: PublicEventDTO;
}

export function PublicSessions({ event }: PublicSessionsProps) {
  if (!event.sessions || event.sessions.length === 0) return null;

  return (
    <section className="py-20 px-6 max-w-4xl mx-auto space-y-12">
      <div className="text-center space-y-2">
        <h2 className="text-xs uppercase tracking-[0.25em] text-gray-500 font-medium">
          Waktu & Lokasi
        </h2>
        <p className="text-3xl font-serif text-gray-900 tracking-tight">
          Rangkaian Acara
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {event.sessions.map((session) => {
          const formattedStart = formatEventDateTime(
            session.startTime,
            event.timeZone
          );

          return (
            <div
              key={session.id}
              className="p-8 rounded-2xl bg-white border border-gray-150 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-6 text-center sm:text-left"
            >
              <div className="space-y-4">
                <h3 className="text-2xl font-serif font-bold text-gray-900 tracking-tight">
                  {session.title}
                </h3>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-700 font-medium">
                    <Clock className="w-4 h-4 text-gray-500 shrink-0" />
                    <span>{formattedStart}</span>
                  </div>

                  <div className="flex items-start justify-center sm:justify-start gap-2 pt-2">
                    <MapPin className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">
                        {session.locationName}
                      </p>
                      <p className="text-xs text-gray-500 leading-relaxed mt-1">
                        {session.address}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
                {session.googleMapsUrl && (
                  <a
                    href={session.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-colors shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Google Maps</span>
                  </a>
                )}

                {session.wazeUrl && (
                  <a
                    href={session.wazeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-500 text-white text-xs font-medium hover:bg-sky-600 transition-colors shadow-sm"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Buka di Waze</span>
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
