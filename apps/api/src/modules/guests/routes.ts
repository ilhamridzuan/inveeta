import { Hono } from 'hono';
import { zValidator } from '../../utils/validator.js';
import {
  createGuestSchema,
  updateGuestSchema,
  manualOverrideRsvpSchema,
  getGuestsQuerySchema,
} from '@inveeta/shared';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireEventOwner } from '../../middlewares/requireEventOwner.js';
import { guestsService } from './service.js';

/**
 * Sub-router Hono Manajemen Tamu, Alokasi Sesi, dan Manual Override (TDD §5.2.B.3, §11.3).
 * Seluruh endpoint terproteksi autentikasi Host dan verifikasi kepemilikan acara.
 */
export const manageGuestsRoutes = new Hono()
  /**
   * GET /api/v1/manage/events/:id/guests
   * Daftar tamu terpaginasi dengan filter pencarian, kategori, dan status RSVP
   */
  .get(
    '/:id/guests',
    requireAuth,
    requireEventOwner('id'),
    zValidator('query', getGuestsQuerySchema),
    async (c) => {
      const eventId = c.req.param('id');
      const query = c.req.valid('query');
      const data = await guestsService.getGuestsByEvent(eventId, query);
      return c.json({
        success: true,
        data,
      });
    }
  )

  /**
   * POST /api/v1/manage/events/:id/guests
   * Tambah tamu baru beserta alokasi sesi acara
   */
  .post(
    '/:id/guests',
    requireAuth,
    requireEventOwner('id'),
    zValidator('json', createGuestSchema),
    async (c) => {
      const eventId = c.req.param('id');
      const input = c.req.valid('json');
      const data = await guestsService.createGuest(eventId, input);
      return c.json(
        {
          success: true,
          data,
        },
        201
      );
    }
  )

  /**
   * PUT /api/v1/manage/events/:id/guests/:guestId
   * Perbarui profil tamu, kuota maxPax, dan alokasi sesi acara
   */
  .put(
    '/:id/guests/:guestId',
    requireAuth,
    requireEventOwner('id'),
    zValidator('json', updateGuestSchema),
    async (c) => {
      const eventId = c.req.param('id');
      const guestId = c.req.param('guestId');
      const input = c.req.valid('json');
      const data = await guestsService.updateGuest(guestId, eventId, input);
      return c.json({
        success: true,
        data,
      });
    }
  )

  /**
   * DELETE /api/v1/manage/events/:id/guests/:guestId
   * Hapus tamu dari acara (Cascade otomatis ke alokasi dan rsvps)
   */
  .delete(
    '/:id/guests/:guestId',
    requireAuth,
    requireEventOwner('id'),
    async (c) => {
      const eventId = c.req.param('id');
      const guestId = c.req.param('guestId');
      const data = await guestsService.deleteGuest(guestId, eventId);
      return c.json({
        success: true,
        data,
      });
    }
  )

  /**
   * PATCH /api/v1/manage/events/:id/guests/:guestId/override
   * Manual override RSVP oleh Host (isManualOverride = true & lock form)
   */
  .patch(
    '/:id/guests/:guestId/override',
    requireAuth,
    requireEventOwner('id'),
    zValidator('json', manualOverrideRsvpSchema),
    async (c) => {
      const eventId = c.req.param('id');
      const guestId = c.req.param('guestId');
      const input = c.req.valid('json');
      const data = await guestsService.manualOverrideRsvp(
        guestId,
        eventId,
        input
      );
      return c.json({
        success: true,
        data,
      });
    }
  );
