'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Music } from 'lucide-react';

interface BgmPlayerIslandProps {
  readonly musicUrl?: string | null;
}

/**
 * Floating Audio Player Island (TDD §7.4 & Autoplay Policy Workaround).
 * Tombol melayang di pojok layar untuk mengontrol musik latar.
 * BGM dimulai saat tamu menekan tombol "Buka Undangan" pada CoverModal.
 */
export function BgmPlayerIsland({
  musicUrl,
}: Readonly<BgmPlayerIslandProps>) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const audioSrc =
    musicUrl || 'https://cdn.inveeta.com/defaults/wedding-bgm-default.mp3';

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn('[BGM] Autoplay tertahan oleh browser:', err);
        });
    }
  };

  return (
    <>
      {/* Audio Element Hidden */}
      <audio
        id="inveeta-bgm"
        ref={audioRef}
        src={audioSrc}
        loop
        preload="auto"
        aria-hidden="true"
      />

      {/* Floating Audio Controller Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Hentikan musik latar' : 'Putar musik latar'}
          className="relative group flex items-center justify-center w-12 h-12 rounded-full bg-white/90 backdrop-blur-md shadow-lg border border-gray-200/80 text-gray-700 hover:text-gray-900 hover:scale-105 active:scale-95 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
        >
          {isPlaying ? (
            <span className="relative flex items-center justify-center">
              <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-30 animate-ping" />
              <Volume2 className="w-5 h-5 text-amber-700" />
            </span>
          ) : (
            <VolumeX className="w-5 h-5 text-gray-500" />
          )}

          {/* Animated Disc Indicator */}
          <span
            className={`absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center text-white text-[9px] shadow-sm ${
              isPlaying ? 'animate-spin' : ''
            }`}
            style={{ animationDuration: '3s' }}
          >
            <Music className="w-2.5 h-2.5" />
          </span>
        </button>
      </div>
    </>
  );
}
