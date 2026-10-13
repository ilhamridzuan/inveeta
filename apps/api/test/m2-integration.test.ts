import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/index.js';
import {
  db,
  events,
  guests,
  eventSessions,
  guestSessionAllocations,
  rsvps,
  wishes,
} from '@inveeta/db';
import { eq, and } from 'drizzle-orm';
import { appEventBus, type AppDomainEvent } from '../src/modules/realtime/bus.js';
import type { WishDTO } from '@inveeta/shared';

describe('Milestone M2 End-to-End Integration Tests (Task M2.6)', () => {
  let isDbConnected = false;
  let testEventId = '';
  const testSlug = 'budi-dan-ani';
  let testGuestId = '';
  let testGuestToken = '';
  let testMaxPax = 2;
  const testSessionIds: string[] = [];

  before(async () => {
    try {
      // Periksa konektivitas basis data PostgreSQL
      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.slug, testSlug))
        .limit(1);

      if (event) {
        isDbConnected = true;
        testEventId = event.id;

        // Ambil sesi acara
        const sessions = await db
          .select()
          .from(eventSessions)
          .where(eq(eventSessions.eventId, testEventId));
        for (const s of sessions) {
          testSessionIds.push(s.id);
        }

        // Ambil tamu contoh (Bambang Sudibyo)
        const [guest] = await db
          .select()
          .from(guests)
          .where(eq(guests.eventId, testEventId))
          .limit(1);

        if (guest) {
          testGuestId = guest.id;
          testGuestToken = guest.token;
          testMaxPax = guest.maxPax;
        }
      }
    } catch (err) {
      console.warn(
        '[Test] Database tidak dapat diakses atau belum di-seed:',
        err instanceof Error ? err.message : err
      );
      isDbConnected = false;
    }
  });

  // ============================================================================
  // 1. UJI ENDPOINT PUBLIK ACARA
  // ============================================================================
  describe('1. Endpoint Publik Acara (GET /api/v1/public/events/:slug)', () => {
    it('mengembalikan 200 dan PublicEventDTO lengkap hanya dengan sesi publik', async (t) => {
      if (!isDbConnected) {
        t.skip('Database tidak terhubung');
        return;
      }

      const res = await app.request(`/api/v1/public/events/${testSlug}`);
      assert.equal(res.status, 200);

      const body = (await res.json()) as {
        success: boolean;
        data: {
          id: string;
          slug: string;
          title: string;
          sessions: Array<{ id: string; title: string; isPublic?: boolean }>;
        };
      };

      assert.equal(body.success, true);
      assert.equal(body.data.slug, testSlug);
      assert.equal(body.data.title, 'Pernikahan Budi & Ani');

      // Verifikasi pembatasan sesi: hanya sesi isPublic = true yang disertakan (Zero PII / Akses Terbatas)
      assert.ok(body.data.sessions.length > 0);
      for (const session of body.data.sessions) {
        assert.notEqual(session.title, 'Akad Nikah', 'Sesi privat Akad Nikah tidak boleh bocor ke publik');
        assert.equal(session.title, 'Resepsi Pernikahan', 'Sesi publik Resepsi harus tersedia');
      }
    });

    it('mengembalikan 404 terstruktur jika slug acara tidak ditemukan', async (t) => {
      if (!isDbConnected) {
        t.skip('Database tidak terhubung');
        return;
      }

      const res = await app.request(
        '/api/v1/public/events/slug-palsu-tidak-ada-99999'
      );
      assert.equal(res.status, 404);

      const body = (await res.json()) as {
        success: boolean;
        error: { code: string; message: string };
      };

      assert.equal(body.success, false);
      assert.equal(body.error.code, 'NOT_FOUND');
    });

    it('mengembalikan PersonalizedGuestContextDTO lengkap pada endpoint token personal', async (t) => {
      if (!isDbConnected || !testGuestToken) {
        t.skip('Database tidak terhubung atau token tamu belum siap');
        return;
      }

      const res = await app.request(
        `/api/v1/public/events/${testSlug}/guests/${testGuestToken}`
      );
      assert.equal(res.status, 200);

      const body = (await res.json()) as {
        success: boolean;
        data: {
          guest: { id: string; name: string; maxPax: number; token: string };
          allocatedSessions: Array<{ sessionId: string; sessionTitle: string }>;
        };
      };

      assert.equal(body.success, true);
      assert.equal(body.data.guest.id, testGuestId);
      assert.ok(body.data.allocatedSessions.length >= 2, 'Tamu harus menerima sesi Akad dan Resepsi yang dialokasikan');
    });
  });

  // ============================================================================
  // 2. UJI BATCH TRANSAKSI RSVP & PERSISTENSI POSTGRESQL
  // ============================================================================
  describe('2. Transaksi Batch RSVP (POST /api/v1/public/rsvp)', () => {
    it('berhasil menyimpan batch RSVP multi-sesi dan persisten di tabel rsvps', async (t) => {
      if (!isDbConnected || !testGuestId || testSessionIds.length < 2) {
        t.skip('Prasyarat data RSVP belum terpenuhi');
        return;
      }

      const testNotes = `Integrasi E2E Sukses pada ${new Date().toISOString()}`;
      const payload = {
        eventId: testEventId,
        guestId: testGuestId,
        sessions: [
          {
            eventSessionId: testSessionIds[0],
            status: 'attending',
            actualPax: testMaxPax,
          },
          {
            eventSessionId: testSessionIds[1],
            status: 'attending',
            actualPax: testMaxPax,
          },
        ],
        notes: testNotes,
      };

      const res = await app.request('/api/v1/public/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      assert.equal(res.status, 200);
      const resBody = (await res.json()) as {
        success: boolean;
        data: {
          guestId: string;
          sessions: Array<{ eventSessionId: string; status: string; actualPax: number }>;
        };
      };
      assert.equal(resBody.success, true);
      assert.equal(resBody.data.guestId, testGuestId);
      assert.equal(resBody.data.sessions.length, 2);

      // Verifikasi langsung ke basis data PostgreSQL (Drizzle)
      const savedRows = await db
        .select()
        .from(rsvps)
        .where(
          and(eq(rsvps.guestId, testGuestId), eq(rsvps.eventId, testEventId))
        );

      assert.equal(savedRows.length, 2, 'Harus tersimpan 2 baris RSVP di PostgreSQL');
      for (const row of savedRows) {
        assert.equal(row.status, 'attending');
        assert.equal(row.actualPax, testMaxPax);
        assert.equal(row.notes, testNotes);
      }
    });

    it('menolak RSVP jika actualPax melebihi alokasi maxPax tamu (Jebakan 1)', async (t) => {
      if (!isDbConnected || !testGuestId || testSessionIds.length === 0) {
        t.skip('Prasyarat data RSVP belum terpenuhi');
        return;
      }

      const invalidPayload = {
        eventId: testEventId,
        guestId: testGuestId,
        sessions: [
          {
            eventSessionId: testSessionIds[0],
            status: 'attending',
            actualPax: testMaxPax + 10, // Melebihi kuota maxPax
          },
        ],
      };

      const res = await app.request('/api/v1/public/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      });

      assert.equal(res.status, 400);
      const body = (await res.json()) as {
        success: boolean;
        error: { code: string; message: string };
      };
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'EXCEEDS_MAX_PAX');
    });
  });

  // ============================================================================
  // 3. UJI BUKU UCAPAN DAN EVENT BUS / SSE BROADCAST
  // ============================================================================
  describe('3. Buku Ucapan & Realtime Broadcast (POST /api/v1/public/wishes)', () => {
    it('menyimpan ucapan baru dan memancarkan event wish.created ke AppEventBus', async (t) => {
      if (!isDbConnected || !testEventId) {
        t.skip('Database tidak terhubung');
        return;
      }

      const uniqueMessage = `Doa E2E SSE Realtime - ${Date.now()}`;
      const senderName = 'Rifky Pratama';

      let eventReceived: AppDomainEvent<WishDTO> | null = null;

      // Daftarkan listener pada AppEventBus
      const unsubscribe = appEventBus.subscribe('wish.created', (event) => {
        if (event.eventId === testEventId) {
          eventReceived = event as AppDomainEvent<WishDTO>;
        }
      });

      try {
        const res = await app.request('/api/v1/public/wishes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': `192.168.1.${Math.floor(Math.random() * 200) + 10}`, // Random IP anti-rate-limit
          },
          body: JSON.stringify({
            eventId: testEventId,
            senderName,
            message: uniqueMessage,
          }),
        });

        assert.equal(res.status, 201);
        const resBody = (await res.json()) as {
          success: boolean;
          data: WishDTO;
        };
        assert.equal(resBody.success, true);
        assert.equal(resBody.data.senderName, senderName);
        assert.equal(resBody.data.message, uniqueMessage);

        // Verifikasi bahwa event wish.created berhasil dipancarkan ke AppEventBus
        assert.ok(eventReceived, 'Event wish.created harus terpancar ke EventBus');
        const eventData = (eventReceived as AppDomainEvent<WishDTO>).payload;
        assert.equal(eventData.senderName, senderName);
        assert.equal(eventData.message, uniqueMessage);

        // Verifikasi penyimpanan di tabel wishes database PostgreSQL
        const [savedWish] = await db
          .select()
          .from(wishes)
          .where(eq(wishes.id, resBody.data.id))
          .limit(1);

        assert.ok(savedWish, 'Ucapan harus tersimpan di tabel wishes');
        assert.equal(savedWish.message, uniqueMessage);
      } finally {
        unsubscribe();
      }
    });

    it('mengambil daftar ucapan terpaginasi via GET /api/v1/public/wishes/:eventId', async (t) => {
      if (!isDbConnected || !testEventId) {
        t.skip('Database tidak terhubung');
        return;
      }

      const res = await app.request(
        `/api/v1/public/wishes/${testEventId}?limit=5`
      );
      assert.equal(res.status, 200);

      const body = (await res.json()) as {
        success: boolean;
        data: {
          wishes: WishDTO[];
          hasMore: boolean;
        };
      };

      assert.equal(body.success, true);
      assert.ok(Array.isArray(body.data.wishes));
    });
  });
});
