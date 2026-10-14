import { Hono } from 'hono';
import { zValidator } from '../../utils/validator.js';
import {
  updateWishVisibilitySchema,
  getManageWishesQuerySchema,
} from '@inveeta/shared';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireEventOwner } from '../../middlewares/requireEventOwner.js';
import { wishesManageService } from './manage.service.js';

/**
 * Sub-router Hono Moderasi Buku Ucapan Host (TDD §5.2.B.5, §11.4).
 */
export const manageWishesRoutes = new Hono()
  /**
   * GET /api/v1/manage/events/:id/wishes/manage
   * Mengambil daftar ucapan terpaginasi untuk Host dengan filter status visibilitas
   */
  .get(
    '/:id/wishes/manage',
    requireAuth,
    requireEventOwner('id'),
    zValidator('query', getManageWishesQuerySchema),
    async (c) => {
      const eventId = c.req.param('id');
      const query = c.req.valid('query');
      const data = await wishesManageService.getManageWishes(eventId, query);
      return c.json({
        success: true,
        data,
      });
    }
  )

  /**
   * PATCH /api/v1/manage/events/:id/wishes/:wishId/visibility
   * Toggle isHidden ucapan (Soft Moderation) & broadcast wish.moderated
   */
  .patch(
    '/:id/wishes/:wishId/visibility',
    requireAuth,
    requireEventOwner('id'),
    zValidator('json', updateWishVisibilitySchema),
    async (c) => {
      const eventId = c.req.param('id');
      const wishId = c.req.param('wishId');
      const { isHidden } = c.req.valid('json');
      const data = await wishesManageService.toggleWishVisibility(
        eventId,
        wishId,
        isHidden
      );
      return c.json({
        success: true,
        data,
      });
    }
  )

  /**
   * DELETE /api/v1/manage/events/:id/wishes/:wishId
   * Hapus permanen ucapan dari database (Hard Delete) & broadcast wish.deleted
   */
  .delete(
    '/:id/wishes/:wishId',
    requireAuth,
    requireEventOwner('id'),
    async (c) => {
      const eventId = c.req.param('id');
      const wishId = c.req.param('wishId');
      const data = await wishesManageService.deleteWish(eventId, wishId);
      return c.json({
        success: true,
        data,
      });
    }
  );
