import { z } from 'zod';
import { INDONESIA_TIMEZONES } from '../constants/categories.js';

export const dateTimeSchema = z.string().datetime({ offset: true });

export const visualCustomizationSchema = z.object({
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6})$/, 'Format kode warna HEX tidak valid'),
  secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{6})$/, 'Format kode warna HEX tidak valid'),
  fontFamily: z.enum(['playfair-inter', 'cormorant-montserrat', 'cinzel-lato']),
  coverLayout: z.enum(['fullscreen-image', 'split-card', 'minimal-typography']),
  sectionsOrder: z.array(z.string()).min(3),
  hiddenSections: z.array(z.string()).default([]),
});

export const createDraftEventSchema = z.object({
  title: z.string().min(3, 'Nama acara minimal 3 karakter').max(100),
  slug: z
    .string()
    .min(3, 'Slug minimal 3 karakter')
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug hanya boleh huruf kecil, angka, dan tanda hubung (-)'),
  eventType: z.literal('wedding').default('wedding'),
  timeZone: z.enum(INDONESIA_TIMEZONES).default('Asia/Jakarta'),
  templateId: z.string().min(1, 'Template wajib dipilih'),
});

export const updateWizardStepSchema = z.object({
  step: z.number().int().min(1).max(5),
  data: z.record(z.unknown()), // Divalidasi secara dinamis sesuai nomor step
});

export const publishEventSchema = z.object({
  eventId: z.string().min(1),
});

export const updatePublishedEventSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  eventDate: dateTimeSchema.optional(),
  rsvpDeadline: dateTimeSchema.optional(),
  timeZone: z.enum(INDONESIA_TIMEZONES).optional(),
  visualCustomization: visualCustomizationSchema.optional(),
  groomName: z.string().max(100).nullable().optional(),
  groomNickname: z.string().max(50).nullable().optional(),
  groomParents: z.string().max(200).nullable().optional(),
  brideName: z.string().max(100).nullable().optional(),
  brideNickname: z.string().max(50).nullable().optional(),
  brideParents: z.string().max(200).nullable().optional(),
  quoteText: z.string().max(500).nullable().optional(),
  quoteSource: z.string().max(100).nullable().optional(),
  loveStory: z
    .array(
      z.object({
        year: z.string(),
        story: z.string(),
        photoUrl: z.string().optional(),
      })
    )
    .optional(),
});
