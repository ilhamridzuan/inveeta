import {
  db,
  events,
  eventSessions,
  guests,
  guestSessionAllocations,
  rsvps,
  wishes,
} from '@inveeta/db';
import { eq, sql } from 'drizzle-orm';
import {
  type EventDashboardMetricsDTO,
  type SessionMetricBreakdown,
} from '@inveeta/shared';
import { NotFoundError } from '../../utils/errors.js';

export class MetricsService {
  /**
   * Menghitung metrik ringkasan KPI acara dan statistik sesi (TDD §5.2.B.8).
   */
  async getEventMetrics(eventId: string): Promise<EventDashboardMetricsDTO> {
    // 1. Verifikasi keberadaan acara
    const [event] = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (!event) {
      throw new NotFoundError('Acara tidak ditemukan');
    }

    // 2. Query seluruh tamu acara
    const allGuests = await db
      .select({
        id: guests.id,
        maxPax: guests.maxPax,
      })
      .from(guests)
      .where(eq(guests.eventId, eventId));

    // 3. Query seluruh sesi acara terurut
    const allSessions = await db
      .select({
        id: eventSessions.id,
        title: eventSessions.title,
        sortOrder: eventSessions.sortOrder,
      })
      .from(eventSessions)
      .where(eq(eventSessions.eventId, eventId))
      .orderBy(eventSessions.sortOrder);

    // 4. Query seluruh alokasi sesi tamu acara
    const allAllocations = await db
      .select({
        guestId: guestSessionAllocations.guestId,
        eventSessionId: guestSessionAllocations.eventSessionId,
        maxPax: guests.maxPax,
      })
      .from(guestSessionAllocations)
      .innerJoin(guests, eq(guestSessionAllocations.guestId, guests.id))
      .where(eq(guests.eventId, eventId));

    // 5. Query seluruh RSVP acara
    const allRsvps = await db
      .select({
        guestId: rsvps.guestId,
        eventSessionId: rsvps.eventSessionId,
        status: rsvps.status,
        actualPax: rsvps.actualPax,
      })
      .from(rsvps)
      .where(eq(rsvps.eventId, eventId));

    // 6. Query total ucapan yang diterima
    const [{ totalWishes }] = await db
      .select({ totalWishes: sql<number>`count(*)::int` })
      .from(wishes)
      .where(eq(wishes.eventId, eventId));

    // 7. Hitung ringkasan total tamu dan pax
    const totalGuestsInvited = allGuests.length;
    const totalPaxAllocated = allGuests.reduce(
      (sum, g) => sum + g.maxPax,
      0
    );

    // 8. Kelompokkan RSVP per tamu untuk rsvpSummary
    const rsvpsByGuest = new Map<string, typeof allRsvps>();
    for (const r of allRsvps) {
      const list = rsvpsByGuest.get(r.guestId) ?? [];
      list.push(r);
      rsvpsByGuest.set(r.guestId, list);
    }

    let attendingCount = 0;
    let declinedCount = 0;
    let pendingCount = 0;
    let totalActualPax = 0;

    for (const guest of allGuests) {
      const guestRsvps = rsvpsByGuest.get(guest.id) ?? [];
      const hasAttending = guestRsvps.some((r) => r.status === 'attending');
      const hasDeclined = guestRsvps.some((r) => r.status === 'declined');

      if (hasAttending) {
        attendingCount++;
        const attendingList = guestRsvps.filter(
          (r) => r.status === 'attending'
        );
        const maxActual = Math.max(
          ...attendingList.map((r) => r.actualPax),
          0
        );
        totalActualPax += maxActual;
      } else if (hasDeclined) {
        declinedCount++;
      } else {
        pendingCount++;
      }
    }

    // 9. Kelompokkan alokasi & RSVP per sesi untuk sessionBreakdown
    const allocationsBySession = new Map<
      string,
      Array<{ guestId: string; maxPax: number }>
    >();
    for (const alloc of allAllocations) {
      const list = allocationsBySession.get(alloc.eventSessionId) ?? [];
      list.push(alloc);
      allocationsBySession.set(alloc.eventSessionId, list);
    }

    const rsvpsBySession = new Map<
      string,
      Map<string, { status: string; actualPax: number }>
    >();
    for (const r of allRsvps) {
      let sessionMap = rsvpsBySession.get(r.eventSessionId);
      if (!sessionMap) {
        sessionMap = new Map();
        rsvpsBySession.set(r.eventSessionId, sessionMap);
      }
      sessionMap.set(r.guestId, r);
    }

    const sessionBreakdown: SessionMetricBreakdown[] = allSessions.map(
      (session) => {
        const sessionAllocs = allocationsBySession.get(session.id) ?? [];
        const sessionRsvps = rsvpsBySession.get(session.id);

        let allocatedPax = 0;
        let confirmedPax = 0;
        let declinedPax = 0;
        let pendingPax = 0;

        for (const alloc of sessionAllocs) {
          allocatedPax += alloc.maxPax;
          const rsvp = sessionRsvps?.get(alloc.guestId);

          if (rsvp?.status === 'attending') {
            confirmedPax += rsvp.actualPax;
          } else if (rsvp?.status === 'declined') {
            declinedPax += alloc.maxPax;
          } else {
            pendingPax += alloc.maxPax;
          }
        }

        return {
          sessionId: session.id,
          sessionTitle: session.title,
          allocatedPax,
          confirmedPax,
          declinedPax,
          pendingPax,
        };
      }
    );

    return {
      totalGuestsInvited,
      totalPaxAllocated,
      rsvpSummary: {
        attendingCount,
        declinedCount,
        pendingCount,
        totalActualPax,
      },
      sessionBreakdown,
      totalWishesReceived: totalWishes,
    };
  }
}

export const metricsService = new MetricsService();
