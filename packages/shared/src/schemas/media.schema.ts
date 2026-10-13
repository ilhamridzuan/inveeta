import { z } from 'zod';
import { SYSTEM_LIMITS } from '../constants/limits.js';

export const presignMediaSchema = z
  .object({
    eventId: z.string().min(1),
    fileName: z.string().min(1).max(255),
    mediaType: z.enum(['photo', 'audio', 'qris', 'og_image']),
    mimeType: z.enum([
      'image/jpeg',
      'image/png',
      'image/webp',
      'audio/mpeg',
      'audio/mp4',
      'audio/x-m4a',
    ]),
    fileSize: z.number().int().positive(),
    slotIdentifier: z.string().max(50).optional(),
  })
  .refine(
    (data) => {
      if (
        data.mediaType === 'photo' ||
        data.mediaType === 'qris' ||
        data.mediaType === 'og_image'
      ) {
        return data.fileSize <= SYSTEM_LIMITS.MEDIA.MAX_PHOTO_SIZE_BYTES; // Maks 2 MB
      }
      if (data.mediaType === 'audio') {
        return data.fileSize <= SYSTEM_LIMITS.MEDIA.MAX_AUDIO_SIZE_BYTES; // Maks 10 MB
      }
      return false;
    },
    {
      message:
        'Ukuran file melebihi batas (Maks 2 MB untuk foto/QRIS/OG, 10 MB untuk audio musik)',
      path: ['fileSize'],
    }
  );

export const confirmMediaSchema = z.object({
  eventId: z.string().min(1),
  fileKey: z.string().min(1),
  mediaType: z.enum(['photo', 'audio', 'qris', 'og_image']),
  mimeType: z.string().min(1),
  fileSize: z.number().int().positive(),
  slotIdentifier: z.string().optional(),
  sortOrder: z.number().int().default(0),
});
