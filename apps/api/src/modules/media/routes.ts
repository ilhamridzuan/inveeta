import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { presignMediaSchema, confirmMediaSchema } from '@inveeta/shared';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { mediaService } from './service.js';
import { BadRequestError } from '../../utils/errors.js';

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
  .post('/upload-direct', async (c) => {
    const user = c.get('user');
    const body = await c.req.parseBody();
    const file = body['file'];
    const eventId = body['eventId'] as string;
    const mediaType =
      (body['mediaType'] as 'photo' | 'audio' | 'qris' | 'og_image') || 'photo';
    const slotIdentifier = (body['slotIdentifier'] as string) || undefined;
    const sortOrder = body['sortOrder'] ? Number(body['sortOrder']) : 0;

    if (!file || !(file instanceof File)) {
      throw new BadRequestError(
        'INVALID_FILE',
        'File gambar atau audio wajib disertakan'
      );
    }
    if (!eventId) {
      throw new BadRequestError('INVALID_EVENT_ID', 'Event ID wajib disertakan');
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const result = await mediaService.uploadDirect(user.id, {
      eventId,
      fileName: file.name,
      mediaType,
      mimeType: file.type || 'image/webp',
      fileBuffer,
      slotIdentifier,
      sortOrder,
    });

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
