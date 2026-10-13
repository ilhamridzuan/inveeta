import { z } from 'zod';
import { presignMediaSchema, confirmMediaSchema } from '../schemas/media.schema.js';

export type PresignMediaInput = z.infer<typeof presignMediaSchema>;
export type ConfirmMediaInput = z.infer<typeof confirmMediaSchema>;

export interface PresignMediaResponseDTO {
  uploadUrl: string;
  fileKey: string;
  mimeType: string;
  expiresInSeconds: number;
}

export interface ConfirmedMediaResponseDTO {
  id: string;
  eventId: string;
  fileKey: string;
  fileUrl: string;
  mediaType: string;
  mimeType: string;
  fileSize: number;
  slotIdentifier: string | null;
  sortOrder: number;
}
