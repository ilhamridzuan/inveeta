'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getApiBaseUrl } from '@/lib/api-client';
import type { WishDTO } from '@inveeta/shared';

export interface SSEOptions {
  readonly onWishCreated?: (wish: WishDTO) => void;
  readonly onRsvpUpdated?: (data: unknown) => void;
  readonly onMetricsUpdated?: (data: unknown) => void;
  readonly enabled?: boolean;
}

/**
 * Hook useSSE untuk koneksi streaming realtime ke Server-Sent Events (SSE).
 * Mematuhi Aturan Kritis AGENTS.md (Jebakan 4):
 * - Auto-reconnection dengan RANDOMIZED JITTER DELAY (1–5 detik) untuk mencegah thundering herd spike di VPS.
 * - Membaca lastEventId / lastTimestamp untuk pemulihan data tertinggal (.limit(20) di server).
 */
export function useSSE(
  eventId?: string | null,
  options: Readonly<SSEOptions> = {}
) {
  const { onWishCreated, onRsvpUpdated, onMetricsUpdated, enabled = true } =
    options;
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Event | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const lastEventIdRef = useRef<string | null>(null);

  // Simpan callback terbaru agar tidak perlu re-trigger connect() saat callback berubah
  const onWishCreatedRef = useRef(onWishCreated);
  onWishCreatedRef.current = onWishCreated;
  const onRsvpUpdatedRef = useRef(onRsvpUpdated);
  onRsvpUpdatedRef.current = onRsvpUpdated;
  const onMetricsUpdatedRef = useRef(onMetricsUpdated);
  onMetricsUpdatedRef.current = onMetricsUpdated;

  const connect = useCallback(() => {
    if (!eventId || !enabled || typeof window === 'undefined') return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const baseUrl = getApiBaseUrl();
    let streamUrl = `${baseUrl}/api/v1/realtime/events/${eventId}/stream`;
    if (lastEventIdRef.current) {
      const separator = streamUrl.includes('?') ? '&' : '?';
      streamUrl += `${separator}lastTimestamp=${encodeURIComponent(
        lastEventIdRef.current
      )}`;
    }

    const es = new EventSource(streamUrl);
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
      setError(null);
      reconnectAttemptsRef.current = 0;
    };

    es.addEventListener('wish.created', (event: MessageEvent) => {
      if (event.lastEventId) {
        lastEventIdRef.current = event.lastEventId;
      }
      try {
        const parsed = JSON.parse(event.data) as WishDTO;
        onWishCreatedRef.current?.(parsed);
      } catch (err) {
        console.error('[SSE] Gagal mem-parse event wish.created:', err);
      }
    });

    es.addEventListener('rsvp.updated', (event: MessageEvent) => {
      if (event.lastEventId) {
        lastEventIdRef.current = event.lastEventId;
      }
      try {
        const parsed = JSON.parse(event.data);
        onRsvpUpdatedRef.current?.(parsed);
      } catch (err) {
        console.error('[SSE] Gagal mem-parse event rsvp.updated:', err);
      }
    });

    es.addEventListener('metrics.updated', (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data);
        onMetricsUpdatedRef.current?.(parsed);
      } catch (err) {
        console.error('[SSE] Gagal mem-parse event metrics.updated:', err);
      }
    });

    es.onerror = (err) => {
      setIsConnected(false);
      setError(err);
      es.close();
      eventSourceRef.current = null;

      // Jitter delay mitigasi thundering herd (AGENTS.md Jebakan 4 & TDD §8.3)
      const baseBackoffDelay = Math.min(
        1000 * 2 ** reconnectAttemptsRef.current,
        15000
      );
      const jitter = Math.floor(Math.random() * 4000) + 1000; // 1.000ms hingga 5.000ms
      const totalDelay = baseBackoffDelay + jitter;
      reconnectAttemptsRef.current += 1;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, totalDelay);
    };
  }, [eventId, enabled]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
    };
  }, [connect]);

  return { isConnected, error };
}
