import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { app } from '../src/index.js';
import { db, events, guests, wishes, eventSessions } from '@inveeta/db';
import { eq } from 'drizzle-orm';

describe('Milestone M3.6: Pengujian Alur Lengkap Host & Verifikasi Milestone M3', () => {
  let isDbConnected = false;
  let testEventId = '';
  const testSlug = 'budi-dan-ani';
  let authCookie = '';
  let sessionIds: string[] = [];
  const createdGuestIds: string[] = [];
  let testWishId = '';

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
          .where(eq(eventSessions.eventId, event.id));
        sessionIds = sessions.map((s) => s.id);

        // Login via Better Auth untuk mendapatkan Cookie Host
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
        '[Test Setup M3.6] DB belum siap atau belum di-seed:',
        err instanceof Error ? err.message : err
      );
      isDbConnected = false;
    }
  });

  after(async () => {
    // Cleanup data tamu dan wish yang dibuat khusus untuk tes ini
    if (isDbConnected) {
      try {
        for (const guestId of createdGuestIds) {
          await db.delete(guests).where(eq(guests.id, guestId));
        }
        if (testWishId) {
          await db.delete(wishes).where(eq(wishes.id, testWishId));
        }
      } catch (err) {
        console.warn('[Test Cleanup M3.6 Error]:', err);
      }
    }
  });

  // ============================================================================
  // 1. TAMBAH 3 TAMU DENGAN KATEGORI BERBEDA (VIP, KELUARGA, REGULER)
  // ============================================================================
  describe('1. Tambah 3 Tamu dengan Kategori Berbeda', () => {
    it('berhasil mendaftarkan tamu VIP dengan alokasi sesi', async (t) => {
      if (!isDbConnected || !authCookie) {
        t.skip('Database atau auth tidak siap');
        return;
      }

      const res = await app.request(`/api/v1/manage/events/${testEventId}/guests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          name: 'Bpk. Ir. Rahmat Hidayat (VIP)',
          phoneNumber: '081234567891',
          category: 'VIP',
          maxPax: 2,
          allocatedSessionIds: [sessionIds[0]],
        }),
      });

      assert.equal(res.status, 201);
      const json = (await res.json()) as { success: boolean; data: { id: string; name: string; category: string } };
      assert.equal(json.success, true);
      assert.equal(json.data.name, 'Bpk. Ir. Rahmat Hidayat (VIP)');
      assert.equal(json.data.category, 'VIP');

      createdGuestIds.push(json.data.id);
    });

    it('berhasil mendaftarkan tamu Kategori Keluarga', async (t) => {
      if (!isDbConnected || !authCookie) {
        t.skip('Database atau auth tidak siap');
        return;
      }

      const res = await app.request(`/api/v1/manage/events/${testEventId}/guests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          name: 'Keluarga Besar Bpk. Ahmad Dahlan',
          phoneNumber: '081234567892',
          category: 'Keluarga',
          maxPax: 4,
          allocatedSessionIds: sessionIds,
        }),
      });

      assert.equal(res.status, 201);
      const json = (await res.json()) as { success: boolean; data: { id: string; name: string; category: string } };
      assert.equal(json.success, true);
      assert.equal(json.data.category, 'Keluarga');

      createdGuestIds.push(json.data.id);
    });

    it('berhasil mendaftarkan tamu Kategori Reguler', async (t) => {
      if (!isDbConnected || !authCookie) {
        t.skip('Database atau auth tidak siap');
        return;
      }

      const res = await app.request(`/api/v1/manage/events/${testEventId}/guests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          name: 'Siti Rahmawati & Rekan',
          phoneNumber: '081234567893',
          category: 'Reguler',
          maxPax: 2,
          allocatedSessionIds: [sessionIds[0]],
        }),
      });

      assert.equal(res.status, 201);
      const json = (await res.json()) as { success: boolean; data: { id: string; name: string; category: string } };
      assert.equal(json.success, true);
      assert.equal(json.data.category, 'Reguler');

      createdGuestIds.push(json.data.id);
    });
  });

  // ============================================================================
  // 2. UBAH STATUS RSVP SECARA MANUAL VIA MODAL OVERRIDE
  // ============================================================================
  describe('2. Manual Override Status RSVP oleh Host', () => {
    it('mengubah status kehadiran menjadi attending, mengunci form tamu, dan mencatat catatan override', async (t) => {
      if (!isDbConnected || !authCookie || createdGuestIds.length === 0) {
        t.skip('Database atau tamu belum siap');
        return;
      }

      const guestId = createdGuestIds[0];
      const targetSessionId = sessionIds[0];

      const res = await app.request(
        `/api/v1/manage/events/${testEventId}/guests/${guestId}/override`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: authCookie,
          },
          body: JSON.stringify({
            sessionId: targetSessionId,
            status: 'attending',
            actualPax: 2,
            notes: 'Dikonfirmasi langsung via WhatsApp Host',
            lockGuestForm: true,
          }),
        }
      );

      assert.equal(res.status, 200);
      const json = (await res.json()) as { success: boolean; data: { isManualOverride: boolean; status: string; actualPax: number } };
      assert.equal(json.success, true);
      assert.equal(json.data.isManualOverride, true);
      assert.equal(json.data.status, 'attending');
      assert.equal(json.data.actualPax, 2);

      // Verifikasi saat tamu membuka tautan undangan personal, form terkunci (read-only)
      const [guest] = await db.select().from(guests).where(eq(guests.id, guestId));
      assert.ok(guest);

      const publicContextRes = await app.request(
        `/api/v1/public/events/${testSlug}/guests/${guest.token}`
      );
      assert.equal(publicContextRes.status, 200);
      const publicJson = (await publicContextRes.json()) as {
        success: boolean;
        data: { isRsvpLocked: boolean; lockReason: string | null };
      };
      assert.equal(publicJson.success, true);
      assert.equal(publicJson.data.isRsvpLocked, true);
      assert.equal(publicJson.data.lockReason, 'HOST_OVERRIDE');
    });
  });

  // ============================================================================
  // 3. SEMBUNYIKAN SALAH SATU UCAPAN DI PANEL MODERASI (SOFT MODERATION)
  // ============================================================================
  describe('3. Moderasi Ucapan Tamu (Soft Moderation)', () => {
    it('membuat ucapan baru dan menyembunyikannya dari tampilan publik', async (t) => {
      if (!isDbConnected || !authCookie) {
        t.skip('Database atau auth belum siap');
        return;
      }

      // 1. Tamu mengirim ucapan baru via endpoint publik
      const createWishRes = await app.request('/api/v1/public/wishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: testEventId,
          senderName: 'Tamu Uji Coba Moderasi',
          message: 'Pesan ini akan disembunyikan oleh Host untuk pengujian moderasi.',
          senderRelation: 'Teman',
        }),
      });

      assert.equal(createWishRes.status, 201);
      const wishJson = (await createWishRes.json()) as { success: boolean; data: { id: string } };
      testWishId = wishJson.data.id;

      // 2. Host menyembunyikan ucapan via PATCH /visibility
      const hideRes = await app.request(
        `/api/v1/manage/events/${testEventId}/wishes/${testWishId}/visibility`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Cookie: authCookie,
          },
          body: JSON.stringify({
            isHidden: true,
          }),
        }
      );

      assert.equal(hideRes.status, 200);
      const hideJson = (await hideRes.json()) as { success: boolean; data: { isHidden: boolean } };
      assert.equal(hideJson.success, true);
      assert.equal(hideJson.data.isHidden, true);

      // 3. Verifikasi ucapan TIDAK muncul di endpoint publik GET /api/v1/public/wishes/:eventId
      const publicWishesRes = await app.request(
        `/api/v1/public/wishes/${testEventId}?limit=50`
      );
      assert.equal(publicWishesRes.status, 200);
      const publicWishesJson = (await publicWishesRes.json()) as {
        success: boolean;
        data: { wishes: Array<{ id: string }> };
      };
      const foundInPublic = publicWishesJson.data.wishes.some(
        (w) => w.id === testWishId
      );
      assert.equal(foundInPublic, false, 'Ucapan yang disembunyikan tidak boleh muncul di publik');

      // 4. Verifikasi ucapan tetap muncul di endpoint manage Host dengan isHidden = true
      const manageWishesRes = await app.request(
        `/api/v1/manage/events/${testEventId}/wishes/manage?status=hidden`,
        {
          headers: { Cookie: authCookie },
        }
      );
      assert.equal(manageWishesRes.status, 200);
      const manageWishesJson = (await manageWishesRes.json()) as {
        success: boolean;
        data: { items: Array<{ id: string; isHidden: boolean }> };
      };
      const foundInManage = manageWishesJson.data.items.some(
        (w) => w.id === testWishId && w.isHidden === true
      );
      assert.equal(foundInManage, true, 'Ucapan tersembunyi harus muncul di panel Host');
    });
  });

  // ============================================================================
  // 4. UNDUH REKAP EXCEL DAN VERIFIKASI 12 KOLOM LENGKAP
  // ============================================================================
  describe('4. Unduh Rekap Excel Streaming (.xlsx)', () => {
    it('mengunduh file .xlsx dan memvalidasi ke-12 kolom sesuai spesifikasi TDD', async (t) => {
      if (!isDbConnected || !authCookie) {
        t.skip('Database atau auth belum siap');
        return;
      }

      const res = await app.request(
        `/api/v1/manage/events/${testEventId}/export/xlsx`,
        {
          headers: { Cookie: authCookie },
        }
      );

      assert.equal(res.status, 200);
      assert.equal(
        res.headers.get('content-type'),
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      assert.ok(
        res.headers.get('content-disposition')?.includes('rekap-tamu-budi-dan-ani.xlsx')
      );

      const arrayBuffer = await res.arrayBuffer();
      assert.ok(arrayBuffer.byteLength > 0, 'Buffer Excel tidak boleh kosong');

      // Parse Workbook via ExcelJS
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(Buffer.from(arrayBuffer));

      const worksheet = workbook.getWorksheet('Rekap Tamu & RSVP');
      assert.ok(worksheet, 'Worksheet Rekap Tamu & RSVP harus ada');

      // Verifikasi 12 Kolom Header Lengkap
      const headerRow = worksheet.getRow(1);
      const expectedHeaders = [
        'No',
        'Nama Tamu',
        'Kategori',
        'Nomor WhatsApp',
        'Kuota Maks Pax',
        'Sesi Dialokasikan',
        'Status Konfirmasi RSVP',
        'Jumlah Hadir Sebenarnya (Pax)',
        'Catatan Tamu',
        'Diubah Manual oleh Host',
        'Tautan Undangan Personal',
        'Waktu Terakhir Konfirmasi',
      ];

      for (let i = 0; i < expectedHeaders.length; i++) {
        const cellValue = headerRow.getCell(i + 1).value;
        assert.equal(
          cellValue,
          expectedHeaders[i],
          `Header kolom ${i + 1} harus '${expectedHeaders[i]}', didapat '${cellValue}'`
        );
      }

      // Pastikan ada baris data tamu
      assert.ok(worksheet.rowCount > 1, 'File Excel harus memiliki minimal satu baris data');
    });
  });
});
