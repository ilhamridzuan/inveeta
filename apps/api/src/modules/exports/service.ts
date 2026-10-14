import {
  db,
  events,
  guests,
  guestSessionAllocations,
  eventSessions,
  rsvps,
} from '@inveeta/db';
import { eq, asc, inArray } from 'drizzle-orm';
import ExcelJS from 'exceljs';
import {
  formatEventDateTime,
  type IndonesiaTimeZone,
} from '@inveeta/shared';
import { toDtoCategory } from '../guests/service.js';
import { NotFoundError } from '../../utils/errors.js';
import type { Stream } from 'node:stream';

export interface GuestExportRow {
  no: number;
  name: string;
  category: string;
  phoneNumber: string;
  maxPax: number;
  allocatedSessions: string;
  rsvpStatus: 'Hadir' | 'Tidak Hadir' | 'Belum Respon';
  actualPax: number;
  notes: string;
  isManualOverride: 'Ya' | 'Tidak';
  invitationUrl: string;
  confirmedAt: string;
}

export interface ExportDataResult {
  event: {
    id: string;
    title: string;
    slug: string;
    timeZone: string;
  };
  rows: GuestExportRow[];
}

function escapeCsvCell(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (
    str.includes(',') ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

export class ExportsService {
  /**
   * Mengambil informasi dasar acara untuk penamaan file unduhan.
   */
  async getEventInfo(eventId: string): Promise<{ id: string; title: string; slug: string }> {
    const [event] = await db
      .select({
        id: events.id,
        title: events.title,
        slug: events.slug,
      })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (!event) {
      throw new NotFoundError('Acara tidak ditemukan');
    }

    return event;
  }

  /**
   * Mengumpulkan dan memformat data tamu untuk kebutuhan ekspor (TDD §5.2.B.7, §11.6).
   */
  async getExportData(eventId: string): Promise<ExportDataResult> {
    const [event] = await db
      .select({
        id: events.id,
        title: events.title,
        slug: events.slug,
        timeZone: events.timeZone,
      })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (!event) {
      throw new NotFoundError('Acara tidak ditemukan');
    }

    // 1. Ambil seluruh data tamu terurut waktu pembuatan
    const guestRows = await db
      .select({
        id: guests.id,
        name: guests.name,
        category: guests.category,
        phoneNumber: guests.phoneNumber,
        maxPax: guests.maxPax,
        token: guests.token,
        createdAt: guests.createdAt,
      })
      .from(guests)
      .where(eq(guests.eventId, eventId))
      .orderBy(asc(guests.createdAt));

    const guestIds = guestRows.map((g) => g.id);
    const baseUrl = process.env.INVITATION_APP_URL || 'https://inveeta.com';
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');

    if (guestIds.length === 0) {
      return {
        event,
        rows: [],
      };
    }

    // 2. Ambil seluruh alokasi sesi (Anti N+1)
    const allocationRows = await db
      .select({
        guestId: guestSessionAllocations.guestId,
        sessionTitle: eventSessions.title,
      })
      .from(guestSessionAllocations)
      .innerJoin(
        eventSessions,
        eq(guestSessionAllocations.eventSessionId, eventSessions.id)
      )
      .where(inArray(guestSessionAllocations.guestId, guestIds))
      .orderBy(asc(eventSessions.sortOrder));

    const allocationsMap = new Map<string, string[]>();
    for (const alloc of allocationRows) {
      const list = allocationsMap.get(alloc.guestId) ?? [];
      list.push(alloc.sessionTitle);
      allocationsMap.set(alloc.guestId, list);
    }

    // 3. Ambil seluruh data RSVP untuk tamu terpilih (Anti N+1)
    const rsvpRows = await db
      .select({
        guestId: rsvps.guestId,
        status: rsvps.status,
        actualPax: rsvps.actualPax,
        notes: rsvps.notes,
        isManualOverride: rsvps.isManualOverride,
        updatedAt: rsvps.updatedAt,
      })
      .from(rsvps)
      .where(eq(rsvps.eventId, eventId));

    const rsvpsMap = new Map<string, typeof rsvpRows>();
    for (const r of rsvpRows) {
      const list = rsvpsMap.get(r.guestId) ?? [];
      list.push(r);
      rsvpsMap.set(r.guestId, list);
    }

    // 4. Transformasi baris data tamu menjadi 12 kolom dokumen ekspor
    const rows: GuestExportRow[] = guestRows.map((guest, index) => {
      const guestAllocs = allocationsMap.get(guest.id) ?? [];
      const guestRsvps = rsvpsMap.get(guest.id) ?? [];

      const hasAttending = guestRsvps.some((r) => r.status === 'attending');
      const hasDeclined = guestRsvps.some((r) => r.status === 'declined');

      let rsvpStatus: 'Hadir' | 'Tidak Hadir' | 'Belum Respon' = 'Belum Respon';
      let actualPax = 0;

      if (hasAttending) {
        rsvpStatus = 'Hadir';
        const attendingList = guestRsvps.filter(
          (r) => r.status === 'attending'
        );
        actualPax = Math.max(
          ...attendingList.map((r) => r.actualPax),
          0
        );
      } else if (hasDeclined) {
        rsvpStatus = 'Tidak Hadir';
      }

      const notes =
        guestRsvps
          .map((r) => r.notes?.trim())
          .filter(Boolean)
          .join('; ') || '-';

      const isManualOverride: 'Ya' | 'Tidak' = guestRsvps.some(
        (r) => r.isManualOverride
      )
        ? 'Ya'
        : 'Tidak';

      const invitationUrl = `${cleanBaseUrl}/${event.slug}/${guest.token}`;

      let confirmedAt = '-';
      if (guestRsvps.length > 0) {
        const dates = guestRsvps.map((r) => r.updatedAt.getTime());
        const latestTime = Math.max(...dates);
        confirmedAt = formatEventDateTime(
          new Date(latestTime).toISOString(),
          (event.timeZone as IndonesiaTimeZone) || 'Asia/Jakarta',
          true
        );
      }

      return {
        no: index + 1,
        name: guest.name,
        category: toDtoCategory(guest.category),
        phoneNumber: guest.phoneNumber || '-',
        maxPax: guest.maxPax,
        allocatedSessions: guestAllocs.join(', ') || '-',
        rsvpStatus,
        actualPax,
        notes,
        isManualOverride,
        invitationUrl,
        confirmedAt,
      };
    });

    return {
      event,
      rows,
    };
  }

  /**
   * Mengekspor data tamu ke aliran byte Excel (.xlsx) menggunakan Streaming Writer (Jebakan 5 AGENTS.md).
   */
  async exportToExcelStream(
    eventId: string,
    outputStream: Stream
  ): Promise<void> {
    const { rows } = await this.getExportData(eventId);

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream: outputStream,
      useStyles: true,
      useSharedStrings: true,
    });

    const worksheet = workbook.addWorksheet('Rekap Tamu & RSVP');

    worksheet.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Nama Tamu', key: 'name', width: 28 },
      { header: 'Kategori', key: 'category', width: 14 },
      { header: 'Nomor WhatsApp', key: 'phoneNumber', width: 18 },
      { header: 'Kuota Maks Pax', key: 'maxPax', width: 16 },
      { header: 'Sesi Dialokasikan', key: 'allocatedSessions', width: 28 },
      { header: 'Status Konfirmasi RSVP', key: 'rsvpStatus', width: 24 },
      { header: 'Jumlah Hadir Sebenarnya (Pax)', key: 'actualPax', width: 28 },
      { header: 'Catatan Tamu', key: 'notes', width: 32 },
      { header: 'Diubah Manual oleh Host', key: 'isManualOverride', width: 24 },
      { header: 'Tautan Undangan Personal', key: 'invitationUrl', width: 45 },
      { header: 'Waktu Terakhir Konfirmasi', key: 'confirmedAt', width: 32 },
    ];

    // Format Baris Header: Font Bold, Tema Dark Slate, Rata Tengah
    const headerRow = worksheet.getRow(1);
    headerRow.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };
    headerRow.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    headerRow.height = 30;
    headerRow.commit();

    // Tulis baris data tamu dan commit per baris (Zero Heap Spike)
    for (const rowData of rows) {
      const row = worksheet.addRow({
        no: rowData.no,
        name: rowData.name,
        category: rowData.category,
        phoneNumber: rowData.phoneNumber,
        maxPax: rowData.maxPax,
        allocatedSessions: rowData.allocatedSessions,
        rsvpStatus: rowData.rsvpStatus,
        actualPax: rowData.actualPax,
        notes: rowData.notes,
        isManualOverride: rowData.isManualOverride,
        invitationUrl: rowData.invitationUrl,
        confirmedAt: rowData.confirmedAt,
      });

      row.font = { name: 'Calibri', size: 10 };
      row.getCell('no').alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell('name').alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell('category').alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell('phoneNumber').alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell('maxPax').alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell('allocatedSessions').alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell('rsvpStatus').alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell('actualPax').alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell('notes').alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell('isManualOverride').alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell('invitationUrl').alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell('confirmedAt').alignment = { vertical: 'middle', horizontal: 'center' };

      row.commit();
    }

    await worksheet.commit();
    await workbook.commit();
  }

  /**
   * Mengekspor data tamu ke aliran teks CSV dengan penyisipan karakter UTF-8 BOM (\uFEFF) (Jebakan 5 AGENTS.md).
   */
  async exportToCsvStream(
    eventId: string,
    writeChunk: (chunk: string) => Promise<void> | void
  ): Promise<void> {
    const { rows } = await this.getExportData(eventId);

    // 1. Tulis UTF-8 Byte Order Mark (BOM) agar rapi di Microsoft Excel Windows
    await writeChunk('\uFEFF');

    // 2. Tulis Header CSV
    const headers = [
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
    await writeChunk(headers.map(escapeCsvCell).join(',') + '\r\n');

    // 3. Tulis seluruh baris data tamu per commit stream
    for (const rowData of rows) {
      const line = [
        rowData.no,
        rowData.name,
        rowData.category,
        rowData.phoneNumber,
        rowData.maxPax,
        rowData.allocatedSessions,
        rowData.rsvpStatus,
        rowData.actualPax,
        rowData.notes,
        rowData.isManualOverride,
        rowData.invitationUrl,
        rowData.confirmedAt,
      ]
        .map(escapeCsvCell)
        .join(',');

      await writeChunk(line + '\r\n');
    }
  }
}

export const exportsService = new ExportsService();
