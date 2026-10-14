import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import ExcelJS from 'exceljs';
import { app } from '../src/index.js';
import { db, events, guests } from '@inveeta/db';
import { eq } from 'drizzle-orm';
import { exportsService } from '../src/modules/exports/service.js';

describe('Milestone M3.3: Streaming Writer Ekspor Excel (.xlsx) & CSV (Jebakan 5)', () => {
  let isDbConnected = false;
  let testEventId = '';
  const testSlug = 'budi-dan-ani';
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

        // Login via Better Auth untuk pengujian guard HTTP
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
        '[Test Setup M3.3] DB belum siap atau belum di-seed:',
        err instanceof Error ? err.message : err
      );
      isDbConnected = false;
    }
  });

  // ============================================================================
  // 1. UJI SERVICE: getExportData()
  // ============================================================================
  describe('1. Service: getExportData()', () => {
    it('mengumpulkan data seluruh tamu dengan 12 kolom lengkap terformat', async (t) => {
      if (!isDbConnected || !testEventId) {
        t.skip('Database tidak terhubung');
        return;
      }

      const { event, rows } = await exportsService.getExportData(testEventId);

      assert.equal(event.id, testEventId);
      assert.equal(event.slug, testSlug);
      assert.ok(rows.length > 0, 'Data ekspor harus memiliki baris tamu');

      const firstRow = rows[0];
      assert.equal(firstRow.no, 1);
      assert.ok(firstRow.name);
      assert.ok(['VIP', 'Keluarga', 'Reguler'].includes(firstRow.category));
      assert.ok(typeof firstRow.phoneNumber === 'string');
      assert.ok(typeof firstRow.maxPax === 'number');
      assert.ok(typeof firstRow.allocatedSessions === 'string');
      assert.ok(
        ['Hadir', 'Tidak Hadir', 'Belum Respon'].includes(firstRow.rsvpStatus)
      );
      assert.ok(typeof firstRow.actualPax === 'number');
      assert.ok(typeof firstRow.notes === 'string');
      assert.ok(['Ya', 'Tidak'].includes(firstRow.isManualOverride));
      assert.ok(firstRow.invitationUrl.includes(`/${testSlug}/`));
      assert.ok(typeof firstRow.confirmedAt === 'string');
    });
  });

  // ============================================================================
  // 2. UJI SERVICE: exportToExcelStream() (Streaming Writer)
  // ============================================================================
  describe('2. Service: exportToExcelStream() (Anti Memory Heap Spike)', () => {
    it('menghasilkan file Excel (.xlsx) valid dengan header tema dan 12 kolom', async (t) => {
      if (!isDbConnected || !testEventId) {
        t.skip('Database tidak terhubung');
        return;
      }

      const passThrough = new PassThrough();
      const chunks: Buffer[] = [];
      passThrough.on('data', (chunk) => chunks.push(Buffer.from(chunk)));

      const streamPromise = new Promise<void>((resolve, reject) => {
        passThrough.on('end', resolve);
        passThrough.on('error', reject);
      });

      await exportsService.exportToExcelStream(testEventId, passThrough);
      await streamPromise;

      const excelBuffer = Buffer.concat(chunks);
      assert.ok(excelBuffer.length > 0, 'Buffer Excel tidak boleh kosong');

      // Verifikasi Zip Header ('PK') dari format OpenXML (.xlsx)
      assert.equal(
        excelBuffer.subarray(0, 2).toString(),
        'PK',
        'Header file harus berupa arsip ZIP/OpenXML (PK)'
      );

      // Muat ulang buffer ke ExcelJS Workbook untuk memvalidasi integritas dokumen
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(excelBuffer);

      const worksheet = workbook.getWorksheet('Rekap Tamu & RSVP');
      assert.ok(worksheet, 'Worksheet "Rekap Tamu & RSVP" harus ada');
      assert.equal(worksheet.columnCount, 12, 'Harus memiliki 12 kolom');

      // Verifikasi nama kolom header
      const headerValues = worksheet.getRow(1).values as string[];
      assert.ok(headerValues.includes('Nama Tamu'));
      assert.ok(headerValues.includes('Nomor WhatsApp'));
      assert.ok(headerValues.includes('Status Konfirmasi RSVP'));
      assert.ok(headerValues.includes('Jumlah Hadir Sebenarnya (Pax)'));
    });
  });

  // ============================================================================
  // 3. UJI SERVICE: exportToCsvStream() (UTF-8 BOM Injection)
  // ============================================================================
  describe('3. Service: exportToCsvStream() (UTF-8 BOM Injection)', () => {
    it('menghasilkan teks CSV yang diawali karakter UTF-8 BOM (\\uFEFF)', async (t) => {
      if (!isDbConnected || !testEventId) {
        t.skip('Database tidak terhubung');
        return;
      }

      let csvContent = '';
      await exportsService.exportToCsvStream(testEventId, (chunk) => {
        csvContent += chunk;
      });

      assert.ok(csvContent.length > 0, 'Konten CSV tidak boleh kosong');

      // Verifikasi karakter pertama adalah UTF-8 BOM (\uFEFF)
      assert.equal(
        csvContent.startsWith('\uFEFF'),
        true,
        'File CSV wajib diawali dengan karakter UTF-8 BOM (\\uFEFF)'
      );

      // Verifikasi baris header CSV
      const lines = csvContent.replace(/^\uFEFF/, '').trim().split('\r\n');
      assert.ok(lines.length >= 2, 'Harus ada baris header dan minimal 1 baris tamu');

      const headerLine = lines[0];
      assert.ok(headerLine.includes('Nama Tamu'));
      assert.ok(headerLine.includes('Nomor WhatsApp'));
      assert.ok(headerLine.includes('Status Konfirmasi RSVP'));
      assert.ok(headerLine.includes('Tautan Undangan Personal'));
    });
  });

  // ============================================================================
  // 4. UJI HTTP ROUTER: /api/v1/manage/events/:id/export/*
  // ============================================================================
  describe('4. HTTP Router: /api/v1/manage/events/:id/export/*', () => {
    it('menolak akses GET /export/xlsx tanpa autentikasi (401)', async () => {
      const res = await app.request(
        `/api/v1/manage/events/${testEventId || 'dummy'}/export/xlsx`
      );
      assert.equal(res.status, 401);
    });

    it('menolak akses GET /export/csv tanpa autentikasi (401)', async () => {
      const res = await app.request(
        `/api/v1/manage/events/${testEventId || 'dummy'}/export/csv`
      );
      assert.equal(res.status, 401);
    });

    it('mengembalikan 200 stream XLSX dengan header attachment jika terautentikasi', async (t) => {
      if (!isDbConnected || !testEventId || !authCookie) {
        t.skip('Cookie autentikasi tidak tersedia');
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
        res.headers
          .get('content-disposition')
          ?.includes(`rekap-tamu-${testSlug}.xlsx`)
      );

      const arrayBuf = await res.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      assert.ok(buf.length > 0);
      assert.equal(buf.subarray(0, 2).toString(), 'PK');
    });

    it('mengembalikan 200 stream CSV dengan UTF-8 BOM jika terautentikasi', async (t) => {
      if (!isDbConnected || !testEventId || !authCookie) {
        t.skip('Cookie autentikasi tidak tersedia');
        return;
      }

      const res = await app.request(
        `/api/v1/manage/events/${testEventId}/export/csv`,
        {
          headers: { Cookie: authCookie },
        }
      );

      assert.equal(res.status, 200);
      assert.equal(res.headers.get('content-type'), 'text/csv; charset=utf-8');
      assert.ok(
        res.headers
          .get('content-disposition')
          ?.includes(`rekap-tamu-${testSlug}.csv`)
      );

      const arrayBuf = await res.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      assert.equal(
        buf.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])),
        true,
        'Respons HTTP CSV harus diawali 3 byte UTF-8 BOM (0xEF, 0xBB, 0xBF)'
      );
      const text = buf.toString('utf-8');
      assert.ok(text.startsWith('\uFEFF'));
      assert.ok(text.includes('Nama Tamu'));
    });
  });
});
