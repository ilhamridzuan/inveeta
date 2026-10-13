'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { WishDTO } from '@inveeta/shared';
import { useSSE } from '@/hooks/useSSE';
import { fetchWishes, submitWish } from '@/lib/api-client';
import { MessageSquareHeart, Send, RefreshCw, Sparkles } from 'lucide-react';

interface LiveWishesIslandProps {
  readonly eventId: string;
  readonly slug?: string;
  readonly defaultSenderName?: string;
}

/**
 * LiveWishesIsland (TDD §7.4, §8.3 & AGENTS.md).
 * Buku ucapan tamu realtime berbasis Server-Sent Events (SSE)
 * dengan paginasi cursor dan formulir anti-spam.
 */
export function LiveWishesIsland({
  eventId,
  defaultSenderName,
}: Readonly<LiveWishesIslandProps>) {
  const [wishes, setWishes] = useState<WishDTO[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Form State
  const [senderName, setSenderName] = useState(defaultSenderName || '');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState(false);

  // Update senderName jika defaultSenderName berubah (dari token)
  useEffect(() => {
    if (defaultSenderName) {
      setSenderName(defaultSenderName);
    }
  }, [defaultSenderName]);

  // Muat ucapan awal
  useEffect(() => {
    let isMounted = true;

    async function loadInitialWishes() {
      setLoading(true);
      try {
        const data = await fetchWishes(eventId, null, 20);
        if (isMounted) {
          setWishes(data.wishes);
          setNextCursor(data.nextCursor);
          setHasMore(data.hasMore);
        }
      } catch (err) {
        console.error('[Wishes] Gagal memuat daftar ucapan:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (eventId) {
      loadInitialWishes();
    }

    return () => {
      isMounted = false;
    };
  }, [eventId]);

  // Handler saat event wish.created diterima via SSE Hub
  const handleWishCreated = useCallback((newWish: WishDTO) => {
    setWishes((prev) => {
      if (prev.some((w) => w.id === newWish.id)) return prev;
      return [newWish, ...prev];
    });
  }, []);

  // Hubungkan ke SSE Hub
  useSSE(eventId, {
    onWishCreated: handleWishCreated,
  });

  // Muat halaman berikutnya (cursor pagination)
  const handleLoadMore = async () => {
    if (!hasMore || !nextCursor || loadingMore) return;
    setLoadingMore(true);

    try {
      const data = await fetchWishes(eventId, nextCursor, 20);
      setWishes((prev) => [...prev, ...data.wishes]);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      console.error('[Wishes] Gagal memuat ucapan selanjutnya:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Kirim ucapan baru
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedName = senderName.trim();
    const trimmedMessage = message.trim();

    if (trimmedName.length < 2) {
      setErrorMessage('Nama pengirim minimal 2 karakter.');
      return;
    }

    if (trimmedMessage.length < 5 || trimmedMessage.length > 500) {
      setErrorMessage('Pesan ucapan harus antara 5 hingga 500 karakter.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessNotice(false);

    try {
      const res = await submitWish({
        eventId,
        senderName: trimmedName,
        message: trimmedMessage,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Gagal mengirim ucapan.');
        return;
      }

      // Reset pesan & tampilkan notice
      setMessage('');
      setSuccessNotice(true);
      setTimeout(() => setSuccessNotice(false), 4000);

      // Optimistic update jika belum ditangkap oleh SSE
      if (res.data) {
        handleWishCreated(res.data);
      }
    } catch {
      setErrorMessage('Terjadi kendala saat mengirim ucapan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return '';
    }
  };

  return (
    <section className="py-20 px-6 max-w-2xl mx-auto space-y-10">
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 rounded-full bg-amber-50 text-amber-700 mb-1">
          <MessageSquareHeart className="w-5 h-5" />
        </div>
        <h2 className="text-xs uppercase tracking-[0.25em] text-gray-500 font-medium">
          Doa & Restu
        </h2>
        <p className="text-3xl font-serif text-gray-900 tracking-tight">
          Buku Ucapan
        </p>
        <p className="text-xs text-gray-500">
          Tinggalkan pesan cinta dan doa restu untuk kedua mempelai
        </p>
      </div>

      {/* Form Kirim Ucapan */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-6 shadow-xs space-y-4">
        {successNotice && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Terima kasih! Ucapan Anda telah diteruskan ke mempelai.</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label
              htmlFor="sender-name"
              className="block text-xs font-medium text-gray-700"
            >
              Nama Anda
            </label>
            <input
              id="sender-name"
              type="text"
              required
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Contoh: Budi Santoso"
              maxLength={100}
              className="w-full text-xs rounded-xl border border-gray-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-medium text-gray-700">
              <label htmlFor="wish-message">Ucapan & Doa</label>
              <span className="text-[11px] text-gray-400 font-normal">
                {message.length}/500
              </span>
            </div>
            <textarea
              id="wish-message"
              required
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tuliskan harapan dan doa terbaik..."
              maxLength={500}
              className="w-full text-xs rounded-xl border border-gray-200 p-3.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-white text-xs font-medium transition-all shadow-sm disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Mengirimkan Ucapan...</span>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Kirim Ucapan</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Daftar Ucapan Realtime */}
      <div className="space-y-3">
        <h3 className="text-xs uppercase tracking-wider text-gray-500 font-semibold px-1">
          Ucapan Sahabat & Keluarga ({wishes.length})
        </h3>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-gray-50/70 border border-gray-100 rounded-2xl p-4 animate-pulse space-y-2"
              >
                <div className="h-4 w-28 bg-gray-200 rounded" />
                <div className="h-3 w-full bg-gray-200/60 rounded" />
              </div>
            ))}
          </div>
        ) : wishes.length === 0 ? (
          <div className="text-center py-10 bg-gray-50/60 rounded-2xl border border-dashed border-gray-200 text-xs text-gray-500 space-y-1">
            <p className="font-medium text-gray-700">Belum ada ucapan</p>
            <p>Jadilah yang pertama mengirimkan doa untuk kedua mempelai!</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {wishes.map((w) => (
              <article
                key={w.id}
                className="bg-white border border-gray-200/70 rounded-2xl p-4 shadow-2xs space-y-1.5 transition-all hover:border-gray-300"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-900">
                    {w.senderName}
                  </span>
                  <time
                    dateTime={w.createdAt}
                    className="text-[10px] text-gray-400"
                  >
                    {formatDate(w.createdAt)}
                  </time>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed break-words">
                  {w.message}
                </p>
              </article>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {hasMore && (
          <div className="text-center pt-2">
            <button
              type="button"
              disabled={loadingMore}
              onClick={handleLoadMore}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium transition-colors disabled:opacity-50"
            >
              {loadingMore ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Memuat...</span>
                </>
              ) : (
                <span>Lihat Ucapan Lainnya</span>
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
