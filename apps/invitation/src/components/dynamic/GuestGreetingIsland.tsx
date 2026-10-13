'use client';

import React, { useEffect, useState } from 'react';
import type { PersonalizedGuestContextDTO } from '@inveeta/shared';
import { getGuestContext } from '@/lib/api-client';
import { Users, Lock } from 'lucide-react';

interface GuestGreetingIslandProps {
  readonly slug: string;
  readonly token: string;
  readonly onGuestLoaded?: (context: PersonalizedGuestContextDTO) => void;
}

/**
 * GuestGreetingIsland (TDD §7.4 & AGENTS.md Jebakan 2).
 * Di-hydrate dinamis di browser untuk membaca data personal tamu
 * tanpa mengotori cache Edge CDN Vercel.
 */
export function GuestGreetingIsland({
  slug,
  token,
  onGuestLoaded,
}: Readonly<GuestGreetingIslandProps>) {
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<PersonalizedGuestContextDTO | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadGuest() {
      setLoading(true);
      setError(null);
      try {
        const data = await getGuestContext(slug, token);
        if (!isMounted) return;

        if (!data) {
          setError('Tautan undangan personal tidak valid.');
        } else {
          setContext(data);
          onGuestLoaded?.(data);
        }
      } catch {
        if (isMounted) {
          setError('Gagal memuat sapaan personal.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (slug && token) {
      void loadGuest();
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [slug, token, onGuestLoaded]);

  if (loading) {
    return (
      <div className="max-w-xl mx-auto my-8 px-6">
        <div className="animate-pulse bg-amber-50/80 border border-amber-200/50 rounded-2xl p-6 text-center space-y-3">
          <div className="h-3 w-32 bg-amber-200/60 rounded mx-auto" />
          <div className="h-6 w-48 bg-amber-300/60 rounded mx-auto" />
          <div className="h-4 w-40 bg-amber-200/50 rounded mx-auto" />
        </div>
      </div>
    );
  }

  if (error || !context) {
    return null;
  }

  const { guest, isRsvpLocked, lockReason } = context;

  const categoryLabel: Record<string, string> = {
    family: 'Keluarga',
    vip: 'Tamu Kehormatan (VIP)',
    friend: 'Sahabat & Teman',
    colleague: 'Rekan Kerja',
    neighbor: 'Tetangga',
    general: 'Tamu Undangan',
  };

  return (
    <aside
      aria-label="Informasi Tamu Undangan"
      className="max-w-xl mx-auto my-8 px-6"
    >
      <div className="relative overflow-hidden bg-gradient-to-b from-amber-50/90 to-amber-100/40 border border-amber-200/80 rounded-2xl p-6 text-center shadow-sm space-y-3">
        <span className="text-[11px] uppercase tracking-widest text-amber-800 font-medium">
          Undangan Spesial Untuk:
        </span>

        <h3 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 tracking-tight">
          {guest.name}
        </h3>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-amber-900 font-medium border border-amber-200 shadow-2xs">
            {categoryLabel[guest.category] || 'Tamu Undangan'}
          </span>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-gray-700 border border-amber-200 shadow-2xs">
            <Users className="w-3.5 h-3.5 text-amber-600" />
            <span>Alokasi: Maksimal {guest.maxPax} Orang</span>
          </span>
        </div>

        {isRsvpLocked && (
          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200">
              <Lock className="w-3 h-3 text-rose-600" />
              <span>
                Konfirmasi RSVP telah ditutup (
                {lockReason === 'DEADLINE_PASSED'
                  ? 'Melewati Batas Waktu'
                  : 'Dikunci oleh Host'}
                )
              </span>
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
