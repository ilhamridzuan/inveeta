import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(
    typeof window !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-amber-300/80 bg-amber-500 px-4 py-2 text-white shadow-md">
      <div className="flex items-center gap-2 text-xs font-medium sm:text-sm">
        <WifiOff className="h-4 w-4 shrink-0 animate-pulse text-amber-100" />
        <span>
          <strong>Koneksi internet terputus.</strong> Inveeta memerlukan koneksi aktif untuk memperbarui metrik & RSVP secara realtime.
        </span>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => window.location.reload()}
        className="h-7 shrink-0 border-white/40 bg-white/10 text-xs font-semibold text-white hover:bg-white/20 hover:text-white"
      >
        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
        <span>Coba Sambungkan</span>
      </Button>
    </div>
  );
};
