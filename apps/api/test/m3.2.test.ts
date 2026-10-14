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
  wishes,
  waMessageTemplates,
} from '@inveeta/db';
import { eq } from 'drizzle-orm';
import { whatsAppService } from '../src/modules/whatsapp/service.js';
import { wishesManageService } from '../src/modules/wishes/manage.service.js';
import { metricsService } from '../src/modules/metrics/service.js';
import { appEventBus, type AppDomainEvent } from '../src/modules/realtime/bus.js';
import { DEFAULT_WA_MESSAGE_TEMPLATE } from '@inveeta/shared';

describe('Milestone M3.2: WhatsApp Template, Wishes Moderation & Dashboard Metrics', () => {
  let isDbConnected = false;
  let testEventId = '';
  const testSlug = 'budi-dan-ani';
  let testGuestId = '';
  let testGuestWithoutPhoneId = '';
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

        // Ambil atau buat tamu uji dengan nomor WhatsApp
        const [existingGuest] = await db
          .select()
          .from(guests)
          .where(eq(guests.eventId, testEventId))
          .limit(1);

        if (existingGuest) {
          testGuestId = existingGuest.id;
        }

        // Coba login via Better Auth untuk pengujian guard HTTP
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
        '[Test Setup M3.2] DB belum siap atau belum di-seed:',
        err instanceof Error ? err.message : err
      );
      isDbConnected = false;
    }
  });

  // ============================================================================
  // 1. UJI MODUL WHATSAPP TEMPLATE & DEEP-LINK
  // ============================================================================
  describe('1. WhatsApp Module: Service & Link Generation', () => {
    it('mengembalikan default template jika belum ada template kustom', async (t) => {
      if (!isDbConnected || !testEventId) {
        t.skip('Database tidak terhubung');
        return;
      }

      // Hapus template kustom jika ada agar menguji fallback
      await db
        .delete(waMessageTemplates)
        .where(eq(waMessageTemplates.eventId, testEventId));

      const template = await whatsAppService.getTemplate(testEventId);
      assert.equal(template.eventId, testEventId);
      assert.equal(template.templateText, DEFAULT_WA_MESSAGE_TEMPLATE);
      assert.equal(template.isCustom, false);
    });

    it('dapat menyimpan dan memperbarui template WhatsApp kustom (Upsert)', async (t) => {
      if (!isDbConnected || !testEventId) {
        t.skip('Database tidak terhubung');
        return;
      }

      const customText = `Halo {nama}! Kami mengundang Anda ke {acara} pada {tanggal}. Tautan: {link}`;
      const saved = await whatsAppService.updateTemplate(testEventId, customText);

      assert.equal(saved.eventId, testEventId);
      assert.equal(saved.templateText, customText);
      assert.equal(saved.isCustom, true);

      // Verifikasi pembacaan ulang
      const reRead = await whatsAppService.getTemplate(testEventId);
      assert.equal(reRead.templateText, customText);
      assert.equal(reRead.isCustom, true);
    });

    it('menghasilkan tautan wa.me dengan normalisasi nomor dan substitusi variabel', async (t) => {
      if (!isDbConnected || !testEventId || !testGuestId) {
        t.skip('Database tidak terhubung');
        return;
      }

      // Pastikan guest memiliki nomor WhatsApp valid
      await db
        .update(guests)
        .set({ phoneNumber: '081234567890' })
        .where(eq(guests.id, testGuestId));

      const linkDto = await whatsAppService.generateWhatsAppLink(
        testEventId,
        testGuestId
      );

      assert.equal(linkDto.phoneNumber, '6281234567890');
      assert.ok(linkDto.encodedUrl.startsWith('https://wa.me/6281234567890?text='));
      assert.ok(linkDto.rawMessage.includes('Budi dan Ani') || linkDto.rawMessage.length > 10);
      assert.ok(!linkDto.rawMessage.includes('{nama}'), 'Variabel {nama} harus tersubstitusi');
      assert.ok(!linkDto.rawMessage.includes('{link}'), 'Variabel {link} harus tersubstitusi');
    });

    it('menolak pembuatan tautan wa.me jika tamu belum memiliki nomor telepon', async (t) => {
      if (!isDbConnected || !testEventId) {
        t.skip('Database tidak terhubung');
        return;
      }

      const [guestNoPhone] = await db
        .insert(guests)
        .values({
          eventId: testEventId,
          name: 'Tamu Tanpa Nomor',
          phoneNumber: null,
          maxPax: 1,
          token: `token-no-phone-${Date.now()}`,
        })
        .returning();

      testGuestWithoutPhoneId = guestNoPhone.id;

      await assert.rejects(
        async () => {
          await whatsAppService.generateWhatsAppLink(
            testEventId,
            testGuestWithoutPhoneId
          );
        },
        {
          name: 'AppError',
          code: 'PHONE_REQUIRED',
        }
      );
    });
  });

  // ============================================================================
  // 2. UJI MODUL MODERASI BUKU UCAPAN (HIDE/DELETE & REALTIME)
  // ============================================================================
  describe('2. Wishes Moderation Module: Soft & Hard Moderation', () => {
    let testWishId = '';

    before(async () => {
      if (!isDbConnected || !testEventId) return;

      const [newWish] = await db
        .insert(wishes)
        .values({
          eventId: testEventId,
          senderName: 'Penguji Moderasi',
          message: 'Semoga berbahagia selalu sampai kakek nenek!',
          isHidden: false,
          ipHash: 'test_ip_hash_m32',
        })
        .returning();

      testWishId = newWish.id;
    });

    it('mengambil daftar ucapan terpaginasi untuk Host termasuk status visibilitas', async (t) => {
      if (!isDbConnected || !testEventId || !testWishId) {
        t.skip('Prasyarat data belum terpenuhi');
        return;
      }

      const result = await wishesManageService.getManageWishes(testEventId, {
        page: 1,
        limit: 10,
        status: 'all',
      });

      assert.ok(result.total >= 1);
      assert.ok(result.items.some((w) => w.id === testWishId));
      assert.equal(result.page, 1);
    });

    it('melakukan toggle isHidden (Soft Moderation) dan memancarkan event wish.moderated', async (t) => {
      if (!isDbConnected || !testEventId || !testWishId) {
        t.skip('Prasyarat data belum terpenuhi');
        return;
      }

      let moderatedEvent: AppDomainEvent | null = null;
      const unsub = appEventBus.subscribe('wish.moderated', (e) => {
        if (e.eventId === testEventId) moderatedEvent = e;
      });

      try {
        const updated = await wishesManageService.toggleWishVisibility(
          testEventId,
          testWishId,
          true
        );

        assert.equal(updated.id, testWishId);
        assert.equal(updated.isHidden, true);

        // Verifikasi langsung ke DB
        const [saved] = await db
          .select()
          .from(wishes)
          .where(eq(wishes.id, testWishId));
        assert.equal(saved.isHidden, true);

        // Verifikasi event realtime terpancar
        assert.ok(moderatedEvent, 'Event wish.moderated harus dipancarkan');
        assert.deepEqual(moderatedEvent.payload, {
          wishId: testWishId,
          isHidden: true,
        });
      } finally {
        unsub();
      }
    });

    it('melakukan hard delete ucapan dan memancarkan event wish.deleted & metrics.updated', async (t) => {
      if (!isDbConnected || !testEventId || !testWishId) {
        t.skip('Prasyarat data belum terpenuhi');
        return;
      }

      let deletedEvent: AppDomainEvent | null = null;
      let metricsEvent: AppDomainEvent | null = null;

      const unsubDeleted = appEventBus.subscribe('wish.deleted', (e) => {
        if (e.eventId === testEventId) deletedEvent = e;
      });
      const unsubMetrics = appEventBus.subscribe('metrics.updated', (e) => {
        if (e.eventId === testEventId) metricsEvent = e;
      });

      try {
        const result = await wishesManageService.deleteWish(
          testEventId,
          testWishId
        );

        assert.equal(result.id, testWishId);

        // Verifikasi ucapan telah terhapus dari DB
        const [checkDb] = await db
          .select()
          .from(wishes)
          .where(eq(wishes.id, testWishId));
        assert.equal(checkDb, undefined);

        // Verifikasi event realtime terpancar
        assert.ok(deletedEvent, 'Event wish.deleted harus dipancarkan');
        assert.ok(metricsEvent, 'Event metrics.updated harus dipancarkan');
      } finally {
        unsubDeleted();
        unsubMetrics();
      }
    });
  });

  // ============================================================================
  // 3. UJI MODUL METRIK DASHBOARD HOST
  // ============================================================================
  describe('3. Metrics Module: Aggregation & Invariants', () => {
    it('mengembalikan seluruh metrik KPI acara dengan konsistensi data', async (t) => {
      if (!isDbConnected || !testEventId) {
        t.skip('Database tidak terhubung');
        return;
      }

      const metrics = await metricsService.getEventMetrics(testEventId);

      assert.ok(typeof metrics.totalGuestsInvited === 'number');
      assert.ok(typeof metrics.totalPaxAllocated === 'number');
      assert.ok(typeof metrics.totalWishesReceived === 'number');

      // Verifikasi struktur rsvpSummary
      const { attendingCount, declinedCount, pendingCount, totalActualPax } =
        metrics.rsvpSummary;

      assert.ok(typeof attendingCount === 'number');
      assert.ok(typeof declinedCount === 'number');
      assert.ok(typeof pendingCount === 'number');
      assert.ok(typeof totalActualPax === 'number');

      // INVARIANT: Jumlah total tamu harus sama persis dengan attending + declined + pending
      assert.equal(
        attendingCount + declinedCount + pendingCount,
        metrics.totalGuestsInvited,
        'Invarian gagal: attending + declined + pending !== totalGuestsInvited'
      );

      // Verifikasi struktur sessionBreakdown
      assert.ok(Array.isArray(metrics.sessionBreakdown));
      for (const s of metrics.sessionBreakdown) {
        assert.ok(s.sessionId);
        assert.ok(s.sessionTitle);
        assert.ok(typeof s.allocatedPax === 'number');
        assert.ok(typeof s.confirmedPax === 'number');
        assert.ok(typeof s.declinedPax === 'number');
        assert.ok(typeof s.pendingPax === 'number');
      }
    });
  });

  // ============================================================================
  // 4. UJI HTTP ROUTER GUARDS (401 UNAUTHORIZED)
  // ============================================================================
  describe('4. HTTP Router Guards (/api/v1/manage/events/:id/*)', () => {
    it('menolak akses GET /wa-template tanpa autentikasi (401)', async () => {
      const res = await app.request(
        `/api/v1/manage/events/${testEventId || 'dummy'}/wa-template`
      );
      assert.equal(res.status, 401);
    });

    it('menolak akses PUT /wa-template tanpa autentikasi (401)', async () => {
      const res = await app.request(
        `/api/v1/manage/events/${testEventId || 'dummy'}/wa-template`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateText: 'Halo ini template baru' }),
        }
      );
      assert.equal(res.status, 401);
    });

    it('menolak akses GET /wishes/manage tanpa autentikasi (401)', async () => {
      const res = await app.request(
        `/api/v1/manage/events/${testEventId || 'dummy'}/wishes/manage`
      );
      assert.equal(res.status, 401);
    });

    it('menolak akses GET /metrics tanpa autentikasi (401)', async () => {
      const res = await app.request(
        `/api/v1/manage/events/${testEventId || 'dummy'}/metrics`
      );
      assert.equal(res.status, 401);
    });

    it('jika terautentikasi dengan Host cookie, endpoint mengembalikan respons 200', async (t) => {
      if (!isDbConnected || !testEventId || !authCookie) {
        t.skip('Cookie autentikasi tidak tersedia');
        return;
      }

      const resMetrics = await app.request(
        `/api/v1/manage/events/${testEventId}/metrics`,
        {
          headers: { Cookie: authCookie },
        }
      );
      assert.equal(resMetrics.status, 200);
      const metricsJson = await resMetrics.json();
      assert.equal(metricsJson.success, true);
      assert.ok(metricsJson.data);

      const resWa = await app.request(
        `/api/v1/manage/events/${testEventId}/wa-template`,
        {
          headers: { Cookie: authCookie },
        }
      );
      assert.equal(resWa.status, 200);
      const waJson = await resWa.json();
      assert.equal(waJson.success, true);
      assert.ok(waJson.data.templateText);
    });
  });
});
