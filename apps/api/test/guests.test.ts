import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/index.js';
import {
  db,
  events,
  eventSessions,
  guests,
  guestSessionAllocations,
  rsvps,
} from '@inveeta/db';
import { eq, and } from 'drizzle-orm';
import { guestsService } from '../src/modules/guests/service.js';
import { appEventBus, type AppDomainEvent } from '../src/modules/realtime/bus.js';

describe('Milestone M3.1: Guest Management, Allocations & Manual Override', () => {
  let isDbConnected = false;
  let testEventId = '';
  const testSlug = 'budi-dan-ani';
  const testSessionIds: string[] = [];
  let authCookie = '';

  before(async () => {
    try {
      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.slug, testSlug))
        .limit(1);

      if (event) {
        isDbConnected = true;
        testEventId = event.id;

        const sessions = await db
          .select()
          .from(eventSessions)
          .where(eq(eventSessions.eventId, testEventId));

        for (const s of sessions) {
          testSessionIds.push(s.id);
        }

        // Coba login via Better Auth untuk menguji endpoint HTTP
        const loginRes = await app.request('/api/auth/sign-in/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@inveeta.com',
            password: 'password123',
          }),
        });

        if (loginRes.ok) {
          const setCookie = loginRes.headers.get('set-cookie');
          if (setCookie) {
            authCookie = setCookie;
          }
        }
      }
    } catch (err) {
      console.warn(
        '[Test Setup] DB belum siap atau belum di-seed:',
        err instanceof Error ? err.message : err
      );
      isDbConnected = false;
    }
  });

  // ============================================================================
  // 1. UJI SERVICE: getGuestsByEvent DENGAN PAGINASI & FILTER
  // ============================================================================
  describe('1. Service: getGuestsByEvent()', () => {
    it('mengembalikan daftar tamu terpaginasi dengan alokasi dan status RSVP', async (t) => {
      if (!isDbConnected || !testEventId) {
        t.skip('Database tidak terhubung');
        return;
      }

      const result = await guestsService.getGuestsByEvent(testEventId, {
        page: 1,
        limit: 10,
      });

      assert.ok(result.total > 0, 'Total tamu harus lebih dari 0');
      assert.ok(result.items.length > 0, 'Items harus memiliki baris tamu');
      assert.equal(result.page, 1);
      assert.equal(result.limit, 10);

      const firstGuest = result.items[0];
      assert.ok(firstGuest.id);
      assert.ok(firstGuest.name);
      assert.ok(firstGuest.token);
      assert.ok(firstGuest.invitationUrl.startsWith(`/${testSlug}/`));
      assert.ok(Array.isArray(firstGuest.allocatedSessions));
      assert.ok(Array.isArray(firstGuest.rsvps));
    });

    it('mendukung filter pencarian nama tamu', async (t) => {
      if (!isDbConnected || !testEventId) {
        t.skip('Database tidak terhubung');
        return;
      }

      const result = await guestsService.getGuestsByEvent(testEventId, {
        search: 'Bambang',
        page: 1,
        limit: 5,
      });

      assert.ok(result.total >= 1);
      assert.ok(
        result.items.some((g) => g.name.toLowerCase().includes('bambang'))
      );
    });

    it('mendukung filter kategori tamu (VIP / Keluarga / Reguler)', async (t) => {
      if (!isDbConnected || !testEventId) {
        t.skip('Database tidak terhubung');
        return;
      }

      const result = await guestsService.getGuestsByEvent(testEventId, {
        category: 'VIP',
        page: 1,
        limit: 10,
      });

      for (const item of result.items) {
        assert.equal(item.category, 'VIP');
      }
    });
  });

  // ============================================================================
  // 2. UJI SERVICE: createGuest(), updateGuest(), deleteGuest()
  // ============================================================================
  describe('2. Service: CRUD Tamu & Alokasi Sesi Atomik', () => {
    let createdGuestId = '';

    it('berhasil membuat tamu baru dengan token 128-bit CSPRNG dan alokasi sesi', async (t) => {
      if (!isDbConnected || !testEventId || testSessionIds.length === 0) {
        t.skip('Prasyarat basis data belum terpenuhi');
        return;
      }

      const input = {
        name: 'dr. H. Muhammad Ilham, Sp.A',
        phoneNumber: '081298765432',
        category: 'VIP' as const,
        maxPax: 3,
        allocatedSessionIds: [testSessionIds[0]],
      };

      const guest = await guestsService.createGuest(testEventId, input);

      assert.ok(guest.id);
      assert.equal(guest.name, input.name);
      assert.equal(guest.phoneNumber, '6281298765432', 'Nomor telepon harus dinormalisasi ke E.164');
      assert.equal(guest.category, 'VIP');
      assert.equal(guest.maxPax, 3);
      assert.equal(guest.token.length, 22, 'Token CSPRNG 128-bit Base64URL memiliki 22 karakter');
      assert.equal(guest.allocatedSessions.length, 1);
      assert.equal(guest.allocatedSessions[0].sessionId, testSessionIds[0]);

      createdGuestId = guest.id;

      // Verifikasi langsung ke database PostgreSQL
      const [saved] = await db
        .select()
        .from(guests)
        .where(eq(guests.id, createdGuestId));
      assert.ok(saved);
      assert.equal(saved.token, guest.token);

      const allocs = await db
        .select()
        .from(guestSessionAllocations)
        .where(eq(guestSessionAllocations.guestId, createdGuestId));
      assert.equal(allocs.length, 1);
    });

    it('memperbarui detail tamu dan alokasi sesi', async (t) => {
      if (!isDbConnected || !createdGuestId || testSessionIds.length < 2) {
        t.skip('Tamu uji coba belum siap');
        return;
      }

      const updated = await guestsService.updateGuest(
        createdGuestId,
        testEventId,
        {
          name: 'dr. H. Muhammad Ilham, Sp.A (Updated)',
          maxPax: 4,
          allocatedSessionIds: [testSessionIds[0], testSessionIds[1]],
        }
      );

      assert.equal(updated.name, 'dr. H. Muhammad Ilham, Sp.A (Updated)');
      assert.equal(updated.maxPax, 4);
      assert.equal(updated.allocatedSessions.length, 2);
    });

    it('berhasil menghapus tamu dan cascade relasi di database', async (t) => {
      if (!isDbConnected || !createdGuestId) {
        t.skip('Tamu uji coba belum siap');
        return;
      }

      let metricsEmitted = false;
      const unsubscribe = appEventBus.subscribe('metrics.updated', (event) => {
        if (event.eventId === testEventId) {
          metricsEmitted = true;
        }
      });

      try {
        const delRes = await guestsService.deleteGuest(
          createdGuestId,
          testEventId
        );
        assert.equal(delRes.deleted, true);

        // Verifikasi terhapus di database
        const [check] = await db
          .select()
          .from(guests)
          .where(eq(guests.id, createdGuestId));
        assert.equal(check, undefined, 'Tamu harus terhapus permanen dari tabel guests');

        const allocCheck = await db
          .select()
          .from(guestSessionAllocations)
          .where(eq(guestSessionAllocations.guestId, createdGuestId));
        assert.equal(allocCheck.length, 0, 'Alokasi sesi harus terhapus secara cascade');

        assert.ok(metricsEmitted, 'Event metrics.updated harus dipancarkan saat tamu dihapus');
      } finally {
        unsubscribe();
      }
    });
  });

  // ============================================================================
  // 3. UJI SERVICE: manualOverrideRsvp() & EMISI REALTIME EVENT BUS
  // ============================================================================
  describe('3. Service: manualOverrideRsvp() & Audit Row-Locking', () => {
    let overrideGuestId = '';

    before(async () => {
      if (!isDbConnected || !testEventId || testSessionIds.length === 0) return;

      // Buat tamu khusus untuk pengujian manual override
      const tempGuest = await guestsService.createGuest(testEventId, {
        name: 'Tamu Uji Override Manual',
        phoneNumber: '081211112222',
        category: 'Reguler',
        maxPax: 2,
        allocatedSessionIds: [testSessionIds[0]],
      });
      overrideGuestId = tempGuest.id;
    });

    it('berhasil melakukan manual override kehadiran dan memancarkan rsvp.updated & metrics.updated', async (t) => {
      if (!isDbConnected || !overrideGuestId || testSessionIds.length === 0) {
        t.skip('Prasyarat data belum terpenuhi');
        return;
      }

      let rsvpEvent: AppDomainEvent | null = null;
      let metricsEvent: AppDomainEvent | null = null;

      const unsubRsvp = appEventBus.subscribe('rsvp.updated', (event) => {
        if (event.eventId === testEventId) rsvpEvent = event;
      });
      const unsubMetrics = appEventBus.subscribe('metrics.updated', (event) => {
        if (event.eventId === testEventId) metricsEvent = event;
      });

      try {
        const overrideRes = await guestsService.manualOverrideRsvp(
          overrideGuestId,
          testEventId,
          {
            sessionId: testSessionIds[0],
            status: 'attending',
            actualPax: 2,
            notes: 'Konfirmasi langsung via telepon oleh Host',
            lockGuestForm: true,
          }
        );

        assert.equal(overrideRes.success, true);
        assert.equal(overrideRes.status, 'attending');
        assert.equal(overrideRes.actualPax, 2);
        assert.equal(overrideRes.isManualOverride, true);

        // Verifikasi langsung ke tabel rsvps
        const [savedRsvp] = await db
          .select()
          .from(rsvps)
          .where(
            and(
              eq(rsvps.guestId, overrideGuestId),
              eq(rsvps.eventSessionId, testSessionIds[0])
            )
          );

        assert.ok(savedRsvp);
        assert.equal(savedRsvp.isManualOverride, true);
        assert.equal(savedRsvp.overrideNotes, 'Konfirmasi langsung via telepon oleh Host');
        assert.equal(savedRsvp.actualPax, 2);

        // Verifikasi event dipancarkan ke AppEventBus
        assert.ok(rsvpEvent, 'Event rsvp.updated harus terpancar');
        assert.ok(metricsEvent, 'Event metrics.updated harus terpancar');
      } finally {
        unsubRsvp();
        unsubMetrics();
      }
    });

    it('menolak override jika actualPax melebihi alokasi maxPax tamu', async (t) => {
      if (!isDbConnected || !overrideGuestId || testSessionIds.length === 0) {
        t.skip('Prasyarat data belum terpenuhi');
        return;
      }

      await assert.rejects(
        async () => {
          await guestsService.manualOverrideRsvp(
            overrideGuestId,
            testEventId,
            {
              sessionId: testSessionIds[0],
              status: 'attending',
              actualPax: 10, // Melebihi kuota 2
            }
          );
        },
        {
          name: 'AppError',
          code: 'EXCEEDS_MAX_PAX',
        }
      );
    });

    it('menolak override jika tamu tidak dialokasikan pada sesi tersebut', async (t) => {
      if (!isDbConnected || !overrideGuestId || testSessionIds.length < 2) {
        t.skip('Prasyarat data belum terpenuhi');
        return;
      }

      await assert.rejects(
        async () => {
          await guestsService.manualOverrideRsvp(
            overrideGuestId,
            testEventId,
            {
              sessionId: testSessionIds[1], // Sesi ke-2 belum dialokasikan untuk tamu ini
              status: 'attending',
              actualPax: 1,
            }
          );
        },
        {
          name: 'AppError',
          code: 'VALIDATION_ERROR',
        }
      );
    });
  });

  // ============================================================================
  // 4. UJI HTTP ENDPOINT GUARDS: requireAuth & requireEventOwner
  // ============================================================================
  describe('4. HTTP Router Guards (/api/v1/manage/events/:id/guests)', () => {
    it('menolak akses tanpa autentikasi (401 Unauthorized)', async () => {
      const res = await app.request(
        `/api/v1/manage/events/${testEventId || 'evt_dummy'}/guests`
      );
      assert.equal(res.status, 401);

      const body = (await res.json()) as {
        success: boolean;
        error: { code: string };
      };
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'UNAUTHORIZED');
    });

    it('mengembalikan 200 jika autentikasi dan kepemilikan acara valid', async (t) => {
      if (!isDbConnected || !testEventId || !authCookie) {
        t.skip('Database atau sesi login belum siap');
        return;
      }

      const res = await app.request(
        `/api/v1/manage/events/${testEventId}/guests?page=1&limit=5`,
        {
          headers: {
            Cookie: authCookie,
          },
        }
      );

      assert.equal(res.status, 200);
      const body = (await res.json()) as {
        success: boolean;
        data: { items: unknown[]; total: number };
      };
      assert.equal(body.success, true);
      assert.ok(Array.isArray(body.data.items));
    });
  });
});
