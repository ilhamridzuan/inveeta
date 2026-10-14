import { Hono } from 'hono';
import { streamText } from 'hono/streaming';
import { PassThrough, Readable } from 'node:stream';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireEventOwner } from '../../middlewares/requireEventOwner.js';
import { exportsService } from './service.js';

/**
 * Sub-router Hono Ekspor Data Rekap Tamu & RSVP (TDD §5.2.B.7, §11.6 & Jebakan 5 AGENTS.md).
 */
export const manageExportsRoutes = new Hono()
  /**
   * GET /api/v1/manage/events/:id/export/xlsx
   * Ekspor spreadsheet Excel (.xlsx) dengan mode Streaming Writer (Zero Heap Spike)
   */
  .get(
    '/:id/export/xlsx',
    requireAuth,
    requireEventOwner('id'),
    async (c) => {
      const eventId = c.req.param('id');
      const event = await exportsService.getEventInfo(eventId);
      const passThrough = new PassThrough();

      // Mulai proses penulisan streaming ke PassThrough stream
      exportsService.exportToExcelStream(eventId, passThrough).catch((err) => {
        passThrough.destroy(
          err instanceof Error ? err : new Error(String(err))
        );
      });

      c.header(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      c.header(
        'Content-Disposition',
        `attachment; filename="rekap-tamu-${event.slug}.xlsx"`
      );
      c.header('Cache-Control', 'no-cache');

      // Mengalirkan Readable Web Stream langsung ke respons HTTP Hono
      return c.body(Readable.toWeb(passThrough) as unknown as ReadableStream);
    }
  )

  /**
   * GET /api/v1/manage/events/:id/export/csv
   * Ekspor teks CSV dengan streamText() dan penyisipan UTF-8 BOM (\uFEFF)
   */
  .get(
    '/:id/export/csv',
    requireAuth,
    requireEventOwner('id'),
    async (c) => {
      const eventId = c.req.param('id');
      const event = await exportsService.getEventInfo(eventId);

      return streamText(c, async (stream) => {
        c.header('Content-Type', 'text/csv; charset=utf-8');
        c.header(
          'Content-Disposition',
          `attachment; filename="rekap-tamu-${event.slug}.csv"`
        );
        c.header('Cache-Control', 'no-cache');

        await exportsService.exportToCsvStream(eventId, async (chunk) => {
          await stream.write(chunk);
        });
      });
    }
  );
