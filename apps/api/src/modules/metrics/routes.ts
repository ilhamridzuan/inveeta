import { Hono } from 'hono';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireEventOwner } from '../../middlewares/requireEventOwner.js';
import { metricsService } from './service.js';

/**
 * Sub-router Hono Agregasi Metrik Dashboard Host (TDD §5.2.B.8).
 */
export const manageMetricsRoutes = new Hono()
  /**
   * GET /api/v1/manage/events/:id/metrics
   * Mengambil agregasi KPI acara: total tamu, kuota pax, status RSVP, rincian per sesi, dan total ucapan
   */
  .get(
    '/:id/metrics',
    requireAuth,
    requireEventOwner('id'),
    async (c) => {
      const eventId = c.req.param('id');
      const data = await metricsService.getEventMetrics(eventId);
      return c.json({
        success: true,
        data,
      });
    }
  );
