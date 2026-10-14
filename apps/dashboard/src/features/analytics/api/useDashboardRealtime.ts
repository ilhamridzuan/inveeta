import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook useDashboardRealtime untuk mendengarkan Server-Sent Events (SSE) di Host Dashboard.
 * Memenuhi Aturan Kritis AGENTS.md (Jebakan 4):
 * - Anti-Thundering Herd & Reconnection Jitter: Randomized jitter delay 1–5 detik (Math.floor(Math.random() * 4000) + 1000).
 * - Sinkronisasi otomatis TanStack Query Cache saat rsvp.updated, metrics.updated, wish.created, dll.
 */
export function useDashboardRealtime(eventId?: string | null) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [lastEventAt, setLastEventAt] = useState<Date | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isUnmountedRef = useRef(false);

  const connect = useCallback(() => {
    if (!eventId || typeof window === 'undefined' || isUnmountedRef.current) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const streamUrl = `${apiUrl}/api/v1/realtime/events/${eventId}/stream`;

    const es = new EventSource(streamUrl, { withCredentials: true });
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
    };

    // 1. RSVP Updated
    es.addEventListener('rsvp.updated', () => {
      setLastEventAt(new Date());
      void queryClient.invalidateQueries({
        queryKey: ['events', eventId, 'metrics'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['events', eventId, 'guests'],
      });
    });

    // 2. Metrics Updated
    es.addEventListener('metrics.updated', () => {
      setLastEventAt(new Date());
      void queryClient.invalidateQueries({
        queryKey: ['events', eventId, 'metrics'],
      });
    });

    // 3. Wish Events (created, moderated, deleted)
    const handleWishChange = () => {
      setLastEventAt(new Date());
      void queryClient.invalidateQueries({
        queryKey: ['events', eventId, 'wishes'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['events', eventId, 'metrics'],
      });
    };

    es.addEventListener('wish.created', handleWishChange);
    es.addEventListener('wish.moderated', handleWishChange);
    es.addEventListener('wish.deleted', handleWishChange);

    // 4. Error & Reconnection Jitter Protocol
    es.onerror = () => {
      setIsConnected(false);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      if (isUnmountedRef.current) return;

      reconnectAttemptsRef.current += 1;
      // Exponential backoff base (max 15 detik)
      const baseBackoff = Math.min(
        15000,
        Math.pow(1.5, reconnectAttemptsRef.current) * 1000
      );
      // Randomized Jitter 1–5 detik (AGENTS.md Jebakan 4, CSPRNG for SonarCloud S2245 compliance)
      const randomValue =
        typeof window !== 'undefined' && window.crypto?.getRandomValues
          ? window.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296
          : 0.5;
      const jitter = Math.floor(randomValue * 4000) + 1000;
      const totalDelay = baseBackoff + jitter;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      reconnectTimeoutRef.current = setTimeout(() => {
        if (!isUnmountedRef.current) {
          connect();
        }
      }, totalDelay);
    };
  }, [eventId, queryClient]);

  useEffect(() => {
    isUnmountedRef.current = false;
    connect();

    return () => {
      isUnmountedRef.current = true;
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

  return { isConnected, lastEventAt };
}
