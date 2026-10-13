import { z } from 'zod';
import { SYSTEM_LIMITS } from '../constants/limits.js';

export const createWishSchema = z.object({
  eventId: z.string().min(1),
  guestId: z.string().optional(),
  senderName: z
    .string()
    .min(SYSTEM_LIMITS.WISHES.MIN_NAME_LENGTH, `Nama pengirim minimal ${SYSTEM_LIMITS.WISHES.MIN_NAME_LENGTH} karakter`)
    .max(SYSTEM_LIMITS.WISHES.MAX_NAME_LENGTH, `Nama pengirim maksimal ${SYSTEM_LIMITS.WISHES.MAX_NAME_LENGTH} karakter`),
  message: z
    .string()
    .min(SYSTEM_LIMITS.WISHES.MIN_MESSAGE_LENGTH, `Ucapan minimal ${SYSTEM_LIMITS.WISHES.MIN_MESSAGE_LENGTH} karakter`)
    .max(SYSTEM_LIMITS.WISHES.MAX_MESSAGE_LENGTH, `Ucapan maksimal ${SYSTEM_LIMITS.WISHES.MAX_MESSAGE_LENGTH} karakter`),
  senderRelation: z.string().max(50).optional(),
});

export const getWishesQuerySchema = z.object({
  limit: z.string().optional(),
  cursor: z.string().optional(),
});

export type GetWishesQuery = z.infer<typeof getWishesQuerySchema>;
