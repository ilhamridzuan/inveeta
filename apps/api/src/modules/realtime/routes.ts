import { Hono } from 'hono';
import { db, wishes } from '@inveeta/db';
import { eq, and, gt } from 'drizzle-orm';
import { generateId } from '@inveeta/shared';
import { sseHub } from './hub.js';

export const realtimeRoutes = new Hono().get('/events/:id/stream', (c) => {
  const eventId = c.req.param('id');
  const clientId = generateId();
  const rawLastEventId =
    c.req.header('last-event-id') ||
    c.req.header('Last-Event-ID') ||
    c.req.query('lastTimestamp');

  const stream = new ReadableStream({
    async start(controller) {
      // 1. Subscribe koneksi klien ke SSE Channel Hub
      sseHub.subscribe(eventId, clientId, controller);

      // 2. Pemulihan Reconnect (Anti-Thundering Herd: .limit(20) - Jebakan 4 AGENTS.md)
      if (rawLastEventId) {
        const lastDate = new Date(rawLastEventId);
        if (!Number.isNaN(lastDate.getTime())) {
          try {
            const missedWishes = await db
              .select({
                id: wishes.id,
                eventId: wishes.eventId,
                senderName: wishes.senderName,
                message: wishes.message,
                createdAt: wishes.createdAt,
              })
              .from(wishes)
              .where(
                and(
                  eq(wishes.eventId, eventId),
                  eq(wishes.isHidden, false),
                  gt(wishes.createdAt, lastDate)
                )
              )
              .orderBy(wishes.createdAt)
              .limit(20); // BATAS KERAS Server Bounding

            for (const wish of missedWishes) {
              const payload = `id: ${wish.createdAt.toISOString()}\nevent: wish.created\ndata: ${JSON.stringify(wish)}\n\n`;
              controller.enqueue(new TextEncoder().encode(payload));
            }
          } catch {
            // Abaikan error database pada reconnect recovery agar stream tetap terbuka
          }
        }
      }

      // 3. Heartbeat berkala setiap 15 detik untuk mencegah socket timeout
      const heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': ping\n\n'));
        } catch {
          clearInterval(heartbeatTimer);
        }
      }, 15000);

      // 4. Pembersihan memori saat koneksi diputus oleh browser / network drop
      const cleanup = () => {
        clearInterval(heartbeatTimer);
        sseHub.unsubscribe(eventId, clientId);
      };

      c.req.raw.signal.addEventListener('abort', cleanup);
    },
    cancel() {
      sseHub.unsubscribe(eventId, clientId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Cegah proxy reverse buffer
    },
  });
});
