import {
  db,
  guests,
  events,
  eventSessions,
  guestSessionAllocations,
  rsvps,
} from '@inveeta/db';
import { eq, and, or, ilike, desc, inArray, sql } from 'drizzle-orm';
import {
  generateGuestToken,
  normalizeWhatsAppNumber,
  type CreateGuestInput,
  type UpdateGuestInput,
  type ManualOverrideRsvpInput,
  type GetGuestsQueryInput,
  type ManageGuestItemDTO,
  type PaginatedGuestsDTO,
  type GuestCategory,
  type RsvpStatus,
} from '@inveeta/shared';
import { appEventBus } from '../realtime/bus.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';

export function toDbCategory(cat?: string | null): 'vip' | 'family' | 'regular' {
  if (!cat) return 'regular';
  const lower = cat.toLowerCase();
  if (lower === 'vip') return 'vip';
  if (lower === 'keluarga' || lower === 'family') return 'family';
  return 'regular';
}

export function toDtoCategory(cat?: string | null): GuestCategory {
  if (!cat) return 'Reguler';
  const lower = cat.toLowerCase();
  if (lower === 'vip') return 'VIP';
  if (lower === 'keluarga' || lower === 'family') return 'Keluarga';
  return 'Reguler';
}

/**
 * Service Manajemen Tamu, Alokasi Sesi, dan Manual Override (TDD §5.2.B.3 & §11.3).
 */
export class GuestsService {
  /**
   * Mengambil daftar tamu terpaginasi dengan filter pencarian, kategori, dan status RSVP.
   */
  async getGuestsByEvent(
    eventId: string,
    filter: Partial<GetGuestsQueryInput> = {}
  ): Promise<PaginatedGuestsDTO> {
    // 1. Ambil data acara untuk membentuk link undangan
    const [event] = await db
      .select({ id: events.id, slug: events.slug })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (!event) {
      throw new NotFoundError('Acara tidak ditemukan');
    }

    // 2. Susun kueri filter dinamis
    const conditions = [eq(guests.eventId, eventId)];

    if (filter.search?.trim()) {
      const searchPattern = `%${filter.search.trim()}%`;
      conditions.push(
        or(
          ilike(guests.name, searchPattern),
          ilike(guests.phoneNumber, searchPattern)
        )!
      );
    }

    if (filter.category?.trim()) {
      conditions.push(eq(guests.category, toDbCategory(filter.category)));
    }

    if (filter.rsvpStatus) {
      if (filter.rsvpStatus === 'attending') {
        conditions.push(
          sql`EXISTS (SELECT 1 FROM ${rsvps} WHERE ${rsvps.guestId} = ${guests.id} AND ${rsvps.status} = 'attending')`
        );
      } else if (filter.rsvpStatus === 'declined') {
        conditions.push(
          sql`EXISTS (SELECT 1 FROM ${rsvps} WHERE ${rsvps.guestId} = ${guests.id} AND ${rsvps.status} = 'declined')`
        );
      } else if (filter.rsvpStatus === 'pending') {
        conditions.push(
          sql`NOT EXISTS (SELECT 1 FROM ${rsvps} WHERE ${rsvps.guestId} = ${guests.id} AND ${rsvps.status} IN ('attending', 'declined'))`
        );
      }
    }

    const whereClause = and(...conditions);

    // 3. Hitung total tamu yang sesuai filter
    const [{ totalCount }] = await db
      .select({ totalCount: sql<number>`count(*)::int` })
      .from(guests)
      .where(whereClause);

    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
    const offset = (page - 1) * limit;

    if (totalCount === 0) {
      return {
        items: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    // 4. Ambil daftar tamu untuk halaman saat ini
    const guestRows = await db
      .select()
      .from(guests)
      .where(whereClause)
      .orderBy(desc(guests.createdAt))
      .limit(limit)
      .offset(offset);

    const guestIds = guestRows.map((g) => g.id);

    // 5. Ambil seluruh alokasi sesi untuk tamu terpilih (Anti N+1)
    const allocationRows = await db
      .select({
        guestId: guestSessionAllocations.guestId,
        sessionId: eventSessions.id,
        sessionTitle: eventSessions.title,
      })
      .from(guestSessionAllocations)
      .innerJoin(
        eventSessions,
        eq(guestSessionAllocations.eventSessionId, eventSessions.id)
      )
      .where(inArray(guestSessionAllocations.guestId, guestIds));

    // 6. Ambil seluruh RSVP untuk tamu terpilih (Anti N+1)
    const rsvpRows = await db
      .select({
        guestId: rsvps.guestId,
        sessionId: rsvps.eventSessionId,
        sessionTitle: eventSessions.title,
        status: rsvps.status,
        actualPax: rsvps.actualPax,
        notes: rsvps.notes,
        isManualOverride: rsvps.isManualOverride,
        overrideNotes: rsvps.overrideNotes,
        updatedAt: rsvps.updatedAt,
      })
      .from(rsvps)
      .innerJoin(eventSessions, eq(rsvps.eventSessionId, eventSessions.id))
      .where(inArray(rsvps.guestId, guestIds));

    // Petakan alokasi dan rsvp berdasarkan guestId
    const allocationMap = new Map<
      string,
      Array<{ sessionId: string; sessionTitle: string }>
    >();
    for (const alloc of allocationRows) {
      const list = allocationMap.get(alloc.guestId) ?? [];
      list.push({
        sessionId: alloc.sessionId,
        sessionTitle: alloc.sessionTitle,
      });
      allocationMap.set(alloc.guestId, list);
    }

    const rsvpMap = new Map<
      string,
      Array<{
        sessionId: string;
        sessionTitle: string;
        status: RsvpStatus;
        actualPax: number;
        notes: string | null;
        isManualOverride: boolean;
        overrideNotes: string | null;
        updatedAt: string;
      }>
    >();
    for (const r of rsvpRows) {
      const list = rsvpMap.get(r.guestId) ?? [];
      list.push({
        sessionId: r.sessionId,
        sessionTitle: r.sessionTitle,
        status: r.status as RsvpStatus,
        actualPax: r.actualPax,
        notes: r.notes ?? null,
        isManualOverride: r.isManualOverride,
        overrideNotes: r.overrideNotes ?? null,
        updatedAt: r.updatedAt.toISOString(),
      });
      rsvpMap.set(r.guestId, list);
    }

    // 7. Bentuk DTO lengkap
    const items: ManageGuestItemDTO[] = guestRows.map((g) => ({
      id: g.id,
      eventId: g.eventId,
      name: g.name,
      phoneNumber: g.phoneNumber,
      category: toDtoCategory(g.category),
      maxPax: g.maxPax,
      token: g.token,
      invitationUrl: `/${event.slug}/${g.token}`,
      allocatedSessions: allocationMap.get(g.id) ?? [],
      rsvps: rsvpMap.get(g.id) ?? [],
      checkedInAt: g.checkedInAt ? g.checkedInAt.toISOString() : null,
      checkInSessionId: g.checkInSessionId ?? null,
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
    }));

    return {
      items,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    };
  }

  /**
   * Menambahkan tamu baru beserta alokasi sesi secara atomik.
   */
  async createGuest(
    eventId: string,
    input: CreateGuestInput
  ): Promise<ManageGuestItemDTO> {
    const [event] = await db
      .select({ id: events.id, slug: events.slug })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (!event) {
      throw new NotFoundError('Acara tidak ditemukan');
    }

    // Verifikasi alokasi sesi valid untuk acara ini
    const sessions = await db
      .select({ id: eventSessions.id, title: eventSessions.title })
      .from(eventSessions)
      .where(
        and(
          eq(eventSessions.eventId, eventId),
          inArray(eventSessions.id, input.allocatedSessionIds)
        )
      );

    if (sessions.length !== input.allocatedSessionIds.length) {
      throw new BadRequestError(
        'VALIDATION_ERROR',
        'Satu atau lebih sesi acara yang dipilih tidak valid untuk acara ini'
      );
    }

    // Normalisasi nomor telepon
    let normalizedPhone: string | null = null;
    if (input.phoneNumber?.trim()) {
      normalizedPhone = normalizeWhatsAppNumber(input.phoneNumber);
    }

    // Bangkitkan token CSPRNG 128-bit
    const token = generateGuestToken();

    // Simpan ke database dalam transaksi atomik
    const newGuest = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(guests)
        .values({
          eventId,
          name: input.name.trim(),
          phoneNumber: normalizedPhone,
          category: toDbCategory(input.category),
          maxPax: input.maxPax ?? 2,
          token,
        })
        .returning();

      if (input.allocatedSessionIds.length > 0) {
        await tx.insert(guestSessionAllocations).values(
          input.allocatedSessionIds.map((sessionId) => ({
            guestId: inserted.id,
            eventSessionId: sessionId,
          }))
        );
      }

      return inserted;
    });

    return {
      id: newGuest.id,
      eventId: newGuest.eventId,
      name: newGuest.name,
      phoneNumber: newGuest.phoneNumber,
      category: toDtoCategory(newGuest.category),
      maxPax: newGuest.maxPax,
      token: newGuest.token,
      invitationUrl: `/${event.slug}/${newGuest.token}`,
      allocatedSessions: sessions.map((s) => ({
        sessionId: s.id,
        sessionTitle: s.title,
      })),
      rsvps: [],
      checkedInAt: null,
      checkInSessionId: null,
      createdAt: newGuest.createdAt.toISOString(),
      updatedAt: newGuest.updatedAt.toISOString(),
    };
  }

  /**
   * Memperbarui detail tamu dan alokasi sesi acara.
   */
  async updateGuest(
    guestId: string,
    eventId: string,
    input: UpdateGuestInput
  ): Promise<ManageGuestItemDTO> {
    const [event] = await db
      .select({ id: events.id, slug: events.slug })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (!event) {
      throw new NotFoundError('Acara tidak ditemukan');
    }

    const [existingGuest] = await db
      .select()
      .from(guests)
      .where(and(eq(guests.id, guestId), eq(guests.eventId, eventId)))
      .limit(1);

    if (!existingGuest) {
      throw new NotFoundError('Tamu tidak ditemukan pada acara ini');
    }

    // Jika alokasi sesi diubah, verifikasi ketersediaan sesi pada event
    if (input.allocatedSessionIds && input.allocatedSessionIds.length > 0) {
      const validSessions = await db
        .select({ id: eventSessions.id })
        .from(eventSessions)
        .where(
          and(
            eq(eventSessions.eventId, eventId),
            inArray(eventSessions.id, input.allocatedSessionIds)
          )
        );

      if (validSessions.length !== input.allocatedSessionIds.length) {
        throw new BadRequestError(
          'VALIDATION_ERROR',
          'Satu atau lebih sesi acara yang dipilih tidak valid'
        );
      }
    }

    let normalizedPhone: string | null | undefined = undefined;
    if (input.phoneNumber !== undefined) {
      normalizedPhone = input.phoneNumber?.trim()
        ? normalizeWhatsAppNumber(input.phoneNumber)
        : null;
    }

    await db.transaction(async (tx) => {
      const updatePayload: Partial<typeof guests.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (input.name !== undefined) updatePayload.name = input.name.trim();
      if (normalizedPhone !== undefined) updatePayload.phoneNumber = normalizedPhone;
      if (input.category !== undefined)
        updatePayload.category = toDbCategory(input.category);
      if (input.maxPax !== undefined) updatePayload.maxPax = input.maxPax;

      await tx
        .update(guests)
        .set(updatePayload)
        .where(and(eq(guests.id, guestId), eq(guests.eventId, eventId)));

      if (input.allocatedSessionIds !== undefined) {
        // Hapus alokasi lama dan masukkan alokasi baru
        await tx
          .delete(guestSessionAllocations)
          .where(eq(guestSessionAllocations.guestId, guestId));

        if (input.allocatedSessionIds.length > 0) {
          await tx.insert(guestSessionAllocations).values(
            input.allocatedSessionIds.map((sessionId) => ({
              guestId,
              eventSessionId: sessionId,
            }))
          );
        }
      }
    });

    // Ambil data terbaru untuk dikembalikan
    const result = await this.getGuestsByEvent(eventId, {
      search: existingGuest.name,
      page: 1,
      limit: 10,
    });
    const updated = result.items.find((item) => item.id === guestId);
    if (!updated) {
      throw new NotFoundError('Gagal memuat tamu setelah pembaruan');
    }
    return updated;
  }

  /**
   * Menghapus tamu (Cascade otomatis ke alokasi sesi dan rsvps di PostgreSQL).
   */
  async deleteGuest(
    guestId: string,
    eventId: string
  ): Promise<{ id: string; deleted: boolean }> {
    const [existing] = await db
      .select({ id: guests.id })
      .from(guests)
      .where(and(eq(guests.id, guestId), eq(guests.eventId, eventId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Tamu tidak ditemukan pada acara ini');
    }

    await db
      .delete(guests)
      .where(and(eq(guests.id, guestId), eq(guests.eventId, eventId)));

    // Pancarkan pembaruan metrik ke AppEventBus
    appEventBus.publish({
      eventId,
      type: 'metrics.updated',
      payload: { timestamp: new Date().toISOString() },
      timestamp: new Date().toISOString(),
    });

    return { id: guestId, deleted: true };
  }

  /**
   * Melakukan override status kehadiran tamu secara manual oleh Host (TDD §11.3).
   * Menandai rsvps.isManualOverride = true, mencatat audit overrideNotes,
   * dan memancarkan event realtime ke AppEventBus.
   */
  async manualOverrideRsvp(
    guestId: string,
    eventId: string,
    input: ManualOverrideRsvpInput
  ): Promise<{
    success: boolean;
    guestId: string;
    sessionId: string;
    status: RsvpStatus;
    actualPax: number;
    isManualOverride: boolean;
  }> {
    const result = await db.transaction(async (tx) => {
      // 1. Kunci baris tamu: SELECT ... FOR UPDATE
      const [guest] = await tx
        .select()
        .from(guests)
        .where(and(eq(guests.id, guestId), eq(guests.eventId, eventId)))
        .for('update');

      if (!guest) {
        throw new NotFoundError('Tamu tidak ditemukan pada acara ini');
      }

      // 2. Verifikasi ketersediaan sesi acara
      const [session] = await tx
        .select({ id: eventSessions.id, title: eventSessions.title })
        .from(eventSessions)
        .where(
          and(
            eq(eventSessions.id, input.sessionId),
            eq(eventSessions.eventId, eventId)
          )
        )
        .limit(1);

      if (!session) {
        throw new NotFoundError('Sesi acara tidak ditemukan');
      }

      // 3. Verifikasi alokasi sesi tamu
      const [allocation] = await tx
        .select({ id: guestSessionAllocations.id })
        .from(guestSessionAllocations)
        .where(
          and(
            eq(guestSessionAllocations.guestId, guestId),
            eq(guestSessionAllocations.eventSessionId, input.sessionId)
          )
        )
        .limit(1);

      if (!allocation) {
        throw new BadRequestError(
          'VALIDATION_ERROR',
          'Tamu tidak memiliki alokasi pada sesi acara ini'
        );
      }

      // 4. Validasi konsistensi status dan kuota actualPax
      let effectiveActualPax = 0;
      if (input.status === 'attending') {
        if (input.actualPax <= 0) {
          throw new BadRequestError(
            'VALIDATION_ERROR',
            'Jumlah kehadiran (actualPax) wajib lebih dari 0 untuk status Hadir'
          );
        }
        if (input.actualPax > guest.maxPax) {
          throw new BadRequestError(
            'EXCEEDS_MAX_PAX',
            `Jumlah kehadiran (${input.actualPax}) melebihi kuota maksimal tamu (${guest.maxPax} pax)`
          );
        }
        effectiveActualPax = input.actualPax;
      }

      const now = new Date();
      const overrideNotes = input.notes?.trim() || 'Disesuaikan manual oleh Host';

      // 5. Upsert ke tabel rsvps dengan flag isManualOverride = true
      const [upserted] = await tx
        .insert(rsvps)
        .values({
          guestId,
          eventSessionId: input.sessionId,
          eventId,
          status: input.status,
          actualPax: effectiveActualPax,
          notes: input.notes?.trim() || null,
          isManualOverride: true,
          overrideNotes,
          submittedAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [rsvps.guestId, rsvps.eventSessionId],
          set: {
            status: input.status,
            actualPax: effectiveActualPax,
            notes: input.notes?.trim() || sql`${rsvps.notes}`,
            isManualOverride: true,
            overrideNotes,
            updatedAt: now,
          },
        })
        .returning();

      return {
        guest,
        session,
        rsvp: upserted,
      };
    });

    // 6. Pancarkan event realtime ke AppEventBus
    appEventBus.publish({
      eventId,
      type: 'rsvp.updated',
      payload: {
        guestId,
        eventSessionId: input.sessionId,
        status: input.status,
        actualPax: result.rsvp.actualPax,
        isManualOverride: true,
      },
      timestamp: new Date().toISOString(),
    });

    appEventBus.publish({
      eventId,
      type: 'metrics.updated',
      payload: {
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      guestId,
      sessionId: input.sessionId,
      status: input.status,
      actualPax: result.rsvp.actualPax,
      isManualOverride: true,
    };
  }
}

export const guestsService = new GuestsService();
