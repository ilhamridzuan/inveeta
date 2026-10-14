import { Hono } from 'hono';
import { zValidator } from '../../utils/validator.js';
import { updateWaTemplateSchema } from '@inveeta/shared';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireEventOwner } from '../../middlewares/requireEventOwner.js';
import { whatsAppService } from './service.js';

/**
 * Sub-router Hono Modul WhatsApp Template dan Deep-Link Generator (TDD §5.2.B.4 & §11.5).
 */
export const manageWhatsAppRoutes = new Hono()
  /**
   * GET /api/v1/manage/events/:id/wa-template
   * Mengambil template pesan WhatsApp acara atau fallback default
   */
  .get(
    '/:id/wa-template',
    requireAuth,
    requireEventOwner('id'),
    async (c) => {
      const eventId = c.req.param('id');
      const data = await whatsAppService.getTemplate(eventId);
      return c.json({
        success: true,
        data,
      });
    }
  )

  /**
   * PUT /api/v1/manage/events/:id/wa-template
   * Menyimpan template pesan WhatsApp kustom Host
   */
  .put(
    '/:id/wa-template',
    requireAuth,
    requireEventOwner('id'),
    zValidator('json', updateWaTemplateSchema),
    async (c) => {
      const eventId = c.req.param('id');
      const { templateText } = c.req.valid('json');
      const data = await whatsAppService.updateTemplate(eventId, templateText);
      return c.json({
        success: true,
        data,
      });
    }
  )

  /**
   * GET /api/v1/manage/events/:id/guests/:guestId/wa-link
   * Menghasilkan URL wa.me dengan pesan terisi dan variabel dinamis tersubstitusi
   */
  .get(
    '/:id/guests/:guestId/wa-link',
    requireAuth,
    requireEventOwner('id'),
    async (c) => {
      const eventId = c.req.param('id');
      const guestId = c.req.param('guestId');
      const data = await whatsAppService.generateWhatsAppLink(eventId, guestId);
      return c.json({
        success: true,
        data,
      });
    }
  );
