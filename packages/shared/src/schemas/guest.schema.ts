import { z } from 'zod';

export const guestCategoryEnum = z.enum([
  'VIP',
  'Keluarga',
  'Reguler',
  'vip',
  'family',
  'regular',
]);

export const createGuestSchema = z.object({
  name: z.string().min(2, 'Nama tamu minimal 2 karakter').max(100),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^(?:\+62|62|08)\d{8,13}$/, 'Format nomor WhatsApp tidak valid')
    .optional()
    .nullable()
    .or(z.literal('')),
  category: guestCategoryEnum.default('Reguler'),
  maxPax: z
    .number()
    .int()
    .min(1, 'Kuota minimal 1')
    .max(20, 'Kuota maksimal 20 pax')
    .default(2),
  allocatedSessionIds: z
    .array(z.string())
    .min(1, 'Pilih minimal satu sesi acara untuk tamu ini'),
});

export const updateGuestSchema = z.object({
  name: z.string().min(2, 'Nama tamu minimal 2 karakter').max(100).optional(),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^(?:\+62|62|08)\d{8,13}$/, 'Format nomor WhatsApp tidak valid')
    .optional()
    .nullable()
    .or(z.literal('')),
  category: guestCategoryEnum.optional(),
  maxPax: z.number().int().min(1).max(20).optional(),
  allocatedSessionIds: z.array(z.string()).min(1).optional(),
});

export const manualOverrideRsvpSchema = z.object({
  sessionId: z.string().min(1, 'Sesi acara wajib dipilih'),
  status: z.enum(['attending', 'declined', 'pending']),
  actualPax: z.number().int().min(0).max(20),
  notes: z.string().max(300).optional(),
  lockGuestForm: z.boolean().default(true),
});

export const getGuestsQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  rsvpStatus: z.enum(['attending', 'declined', 'pending']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
