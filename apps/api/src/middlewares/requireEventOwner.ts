import { createMiddleware } from 'hono/factory';
import { db, events } from '@inveeta/db';
import { eq } from 'drizzle-orm';
import { ForbiddenError, NotFoundError } from '../utils/errors.js';
import type { AuthVariables } from './requireAuth.js';

export const requireEventOwner = (paramKey: 'id' | 'eventId' = 'id') => {
  return createMiddleware<{
    Variables: AuthVariables & { eventId: string };
  }>(async (c, next) => {
    const user = c.get('user');
    const targetEventId = c.req.param(paramKey);

    if (!targetEventId) {
      throw new NotFoundError('Parameter pengenal acara wajib disertakan');
    }

    const [event] = await db
      .select({ id: events.id, hostId: events.hostId })
      .from(events)
      .where(eq(events.id, targetEventId));

    if (!event) {
      throw new NotFoundError('Acara tidak ditemukan');
    }

    if (event.hostId !== user.id) {
      throw new ForbiddenError(
        'Anda tidak memiliki hak akses untuk mengelola acara ini'
      );
    }

    c.set('eventId', event.id);
    await next();
  });
};
