import { z } from 'zod';
import { GUEST_CATEGORIES } from '../constants/categories.js';

export const createGuestSchema = z.object({
  name: z.string().min(2, 'Nama tamu minimal 2 karakter').max(100),
  phoneNumber: z
    .string()
    .min(9, 'Nomor WhatsApp minimal 9 digit')
    .max(16)
    .regex(/^(?:\+62|62|08)\d{8,13}$/, 'Format nomor WhatsApp tidak valid'),
  category: z.enum(GUEST_CATEGORIES).default('Reguler'),
  maxPax: z.number().int().min(1, 'Kuota minimal 1').max(20, 'Kuota maksimal 20 pax').default(2),
  allocatedSessionIds: z.array(z.string()).min(1, 'Pilih minimal satu sesi acara untuk tamu ini'),
});

export const updateGuestSchema = z.object({
  name: z.string().min(2, 'Nama tamu minimal 2 karakter').max(100).optional(),
  phoneNumber: z
    .string()
    .min(9, 'Nomor WhatsApp minimal 9 digit')
    .max(16)
    .regex(/^(?:\+62|62|08)\d{8,13}$/, 'Format nomor WhatsApp tidak valid')
    .optional(),
  category: z.enum(GUEST_CATEGORIES).optional(),
  maxPax: z.number().int().min(1).max(20).optional(),
  allocatedSessionIds: z.array(z.string()).min(1).optional(),
});

export const manualOverrideRsvpSchema = z.object({
  sessionId: z.string().min(1),
  status: z.enum(['attending', 'declined', 'pending']),
  actualPax: z.number().int().min(0).max(20),
  notes: z.string().max(300).optional(),
  lockGuestForm: z.boolean().default(true),
});
