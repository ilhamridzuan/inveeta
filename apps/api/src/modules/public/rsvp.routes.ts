import { Hono } from 'hono';
import { zValidator } from '../../utils/validator.js';
import {
  db,
  events,
  guests,
  guestSessionAllocations,
  rsvps,
} from '@inveeta/db';
import { eq, and } from 'drizzle-orm';
import {
  submitRsvpSchema,
  type SubmitRsvpInput,
  type RsvpResponseDTO,
  type RsvpSubmittedSession,
} from '@inveeta/shared';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import { appEventBus } from '../realtime/bus.js';

interface BatchRsvpExecutionResult {
  guestId: string;
  guestName: string;
  eventId: string;
  response: RsvpResponseDTO;
}

/**
 * Memvalidasi batas waktu RSVP acara.
 */
function assertRsvpDeadline(eventDeadline: Date | null | undefined): void {
  if (eventDeadline && new Date() > new Date(eventDeadline)) {
    throw new BadRequestError(
      'DEADLINE_PASSED',
      'Batas waktu konfirmasi kehadiran (RSVP) telah berakhir'
    );
  }
}

/**
 * Mengeksekusi transaksi batch RSVP per sesi tamu (Jebakan 1 AGENTS.md).
 * Wajib row-lock FOR UPDATE, looping per sesi, verifikasi kuota & alokasi,
 * dan atomic rollback jika ada 1 sesi yang gagal.
 */
async function processBatchRsvp(
  input: SubmitRsvpInput
): Promise<BatchRsvpExecutionResult> {
  return await db.transaction(async (tx) => {
    // 1. Ambil data event dan verifikasi batas waktu
    const [event] = await tx
      .select({
        id: events.id,
        rsvpDeadline: events.rsvpDeadline,
      })
      .from(events)
      .where(eq(events.id, input.eventId))
      .limit(1);

    if (!event) {
      throw new NotFoundError('Acara tidak ditemukan');
    }

    assertRsvpDeadline(event.rsvpDeadline);

    // 2. Kunci baris tamu: SELECT ... FROM guests WHERE id = $guestId FOR UPDATE
    const [guest] = await tx
      .select()
      .from(guests)
      .where(
        and(eq(guests.id, input.guestId), eq(guests.eventId, input.eventId))
      )
      .for('update')
      .limit(1);

    if (!guest) {
      throw new NotFoundError('Tamu undangan tidak ditemukan');
    }

    // 3. Ambil data alokasi sesi dan status override host
    const allocations = await tx
      .select({ eventSessionId: guestSessionAllocations.eventSessionId })
      .from(guestSessionAllocations)
      .where(eq(guestSessionAllocations.guestId, guest.id));

    const allocatedSessionIds = new Set(
      allocations.map((a) => a.eventSessionId)
    );

    const existingRsvps = await tx
      .select()
      .from(rsvps)
      .where(
        and(eq(rsvps.guestId, guest.id), eq(rsvps.eventId, input.eventId))
      );

    const existingRsvpMap = new Map(
      existingRsvps.map((r) => [r.eventSessionId, r])
    );

    const submittedSessions: RsvpSubmittedSession[] = [];
    const now = new Date();

    // 4. Lakukan looping: for (const sessionItem of input.sessions)
    for (const sessionItem of input.sessions) {
      // a. Verifikasi alokasi di guestSessionAllocations
      if (!allocatedSessionIds.has(sessionItem.eventSessionId)) {
        throw new BadRequestError(
          'SESSION_NOT_ALLOCATED',
          `Sesi dengan ID '${sessionItem.eventSessionId}' tidak dialokasikan untuk tamu ini`
        );
      }

      // b. Tolak jika rsvps.isManualOverride === true
      const existing = existingRsvpMap.get(sessionItem.eventSessionId);
      if (existing?.isManualOverride) {
        throw new BadRequestError(
          'HOST_OVERRIDE',
          'Konfirmasi kehadiran untuk sesi ini telah dikunci oleh Host dan tidak dapat diubah'
        );
      }

      // c. Verifikasi kuota: sessionItem.actualPax <= guest.maxPax
      if (sessionItem.actualPax > guest.maxPax) {
        throw new BadRequestError(
          'EXCEEDS_MAX_PAX',
          `Jumlah kehadiran (${sessionItem.actualPax} pax) melebihi batas maksimal alokasi (${guest.maxPax} pax)`
        );
      }

      // d. Upsert ke rsvps dengan onConflictDoUpdate({ target: [guestId, eventSessionId] })
      const [upserted] = await tx
        .insert(rsvps)
        .values({
          guestId: guest.id,
          eventSessionId: sessionItem.eventSessionId,
          eventId: input.eventId,
          status: sessionItem.status,
          actualPax: sessionItem.actualPax,
          notes: input.notes ?? null,
          submittedAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [rsvps.guestId, rsvps.eventSessionId],
          set: {
            status: sessionItem.status,
            actualPax: sessionItem.actualPax,
            notes: input.notes ?? null,
            submittedAt: now,
            updatedAt: now,
          },
        })
        .returning();

      submittedSessions.push({
        id: upserted.id,
        eventSessionId: upserted.eventSessionId,
        status: upserted.status as 'attending' | 'declined',
        actualPax: upserted.actualPax,
        updatedAt: upserted.updatedAt.toISOString(),
      });
    }

    return {
      guestId: guest.id,
      guestName: guest.name,
      eventId: input.eventId,
      response: {
        guestId: guest.id,
        sessions: submittedSessions,
        notes: input.notes ?? null,
      },
    };
  });
}

export const publicRsvpRoutes = new Hono()
  /**
   * Konfirmasi kehadiran tamu (Atomic Multi-Session Batch Upsert)
   * POST /api/v1/public/rsvp
   */
  .post('/', zValidator('json', submitRsvpSchema), async (c) => {
    const input = c.req.valid('json');

    const result = await processBatchRsvp(input);

    // Pancarkan event 'rsvp.updated' ke AppEventBus setelah transaksi berhasil di-commit
    appEventBus.publish({
      eventId: result.eventId,
      type: 'rsvp.updated',
      payload: {
        guestId: result.guestId,
        guestName: result.guestName,
        sessions: result.response.sessions,
        notes: result.response.notes,
        updatedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });

    return c.json({
      success: true,
      data: result.response,
    });
  });
