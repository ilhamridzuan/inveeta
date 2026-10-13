import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { presignMediaSchema, confirmMediaSchema } from '@inveeta/shared';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { mediaService } from './service.js';

export const mediaRoutes = new Hono()
  .use('*', requireAuth)
  .post('/presign', zValidator('json', presignMediaSchema), async (c) => {
    const user = c.get('user');
    const input = c.req.valid('json');
    const result = await mediaService.generatePresignedPutUrl(user.id, input);
    return c.json({
      success: true,
      data: result,
    });
  })
  .post('/confirm', zValidator('json', confirmMediaSchema), async (c) => {
    const user = c.get('user');
    const input = c.req.valid('json');
    const result = await mediaService.confirmMediaUpload(user.id, input);
    return c.json(
      {
        success: true,
        data: result,
      },
      201
    );
  })
  .delete('/:mediaId', async (c) => {
    const user = c.get('user');
    const mediaId = c.req.param('mediaId');
    const result = await mediaService.deleteMedia(user.id, mediaId);
    return c.json({
      success: true,
      data: result,
    });
  });
