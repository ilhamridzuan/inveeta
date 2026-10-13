import { z } from 'zod';
import { INDONESIA_TIMEZONES } from '../constants/categories.js';

export const dateTimeSchema = z.string().datetime({ offset: true });

export const visualCustomizationSchema = z.object({
  primaryColor: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6})$/, 'Format kode warna HEX tidak valid'),
  secondaryColor: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6})$/, 'Format kode warna HEX tidak valid'),
  fontFamily: z.enum([
    'playfair-inter',
    'cormorant-montserrat',
    'cinzel-lato',
  ]),
  coverLayout: z.enum([
    'fullscreen-image',
    'split-card',
    'minimal-typography',
  ]),
  sectionsOrder: z.array(z.string()).min(3),
  hiddenSections: z.array(z.string()).default([]),
});

export const createDraftEventSchema = z.object({
  title: z.string().min(3, 'Nama acara minimal 3 karakter').max(100),
  slug: z
    .string()
    .min(3, 'Slug minimal 3 karakter')
    .max(50)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug hanya boleh huruf kecil, angka, dan tanda hubung (-)'
    ),
  eventType: z.literal('wedding').default('wedding'),
  timeZone: z.enum(INDONESIA_TIMEZONES).default('Asia/Jakarta'),
  templateId: z.string().min(1, 'Template wajib dipilih'),
});

// Step 1: Info Dasar Acara & Usulan Slug
export const wizardStep1Schema = z.object({
  title: z.string().min(3, 'Nama acara minimal 3 karakter').max(100),
  slug: z
    .string()
    .min(3, 'Slug minimal 3 karakter')
    .max(50)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug hanya boleh huruf kecil, angka, dan tanda hubung (-)'
    ),
  timeZone: z.enum(INDONESIA_TIMEZONES).default('Asia/Jakarta'),
  eventDate: dateTimeSchema.optional().nullable(),
  rsvpDeadline: dateTimeSchema.optional().nullable(),
});

// Step 2: Manajemen Sesi Acara (Akad, Resepsi, dll)
export const wizardSessionItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2, 'Nama sesi minimal 2 karakter').max(100),
  startTime: dateTimeSchema,
  endTime: dateTimeSchema,
  locationName: z.string().min(2, 'Nama lokasi minimal 2 karakter').max(200),
  address: z.string().min(5, 'Alamat minimal 5 karakter').max(500),
  googleMapsUrl: z
    .string()
    .url('URL Google Maps tidak valid')
    .optional()
    .nullable(),
  wazeUrl: z.string().url('URL Waze tidak valid').optional().nullable(),
  isPublic: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
});

export const wizardStep2Schema = z.object({
  sessions: z
    .array(wizardSessionItemSchema)
    .min(1, 'Minimal satu sesi acara wajib diisi'),
});

// Step 3: Biodata Pengantin & Linimasa Kisah Cinta
export const wizardLoveStoryItemSchema = z.object({
  year: z.string().min(1, 'Tahun wajib diisi'),
  story: z.string().min(1, 'Cerita wajib diisi'),
  photoUrl: z.string().url().optional().nullable(),
});

export const wizardStep3Schema = z.object({
  brideName: z.string().min(1, 'Nama mempelai wanita wajib diisi').max(100),
  brideNickname: z
    .string()
    .min(1, 'Panggilan mempelai wanita wajib diisi')
    .max(50),
  brideParents: z.string().max(200).optional().nullable(),
  groomName: z.string().min(1, 'Nama mempelai pria wajib diisi').max(100),
  groomNickname: z
    .string()
    .min(1, 'Panggilan mempelai pria wajib diisi')
    .max(50),
  groomParents: z.string().max(200).optional().nullable(),
  quoteText: z.string().max(500).optional().nullable(),
  quoteSource: z.string().max(100).optional().nullable(),
  loveStory: z.array(wizardLoveStoryItemSchema).optional().default([]),
});

// Step 4: Rekening Amplop Digital, QRIS & Galeri Foto
export const wizardBankAccountItemSchema = z.object({
  id: z.string().optional(),
  bankName: z.string().min(2, 'Nama bank minimal 2 karakter'),
  accountNumber: z.string().min(3, 'Nomor rekening minimal 3 digit'),
  accountHolder: z.string().min(2, 'Nama pemilik rekening minimal 2 karakter'),
  sortOrder: z.number().int().default(0),
});

export const wizardGalleryPhotoItemSchema = z.object({
  fileUrl: z.string().url('URL foto galeri tidak valid'),
  slotIdentifier: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
});

export const wizardStep4Schema = z.object({
  bankAccounts: z.array(wizardBankAccountItemSchema).optional().default([]),
  qrisImageUrl: z.string().url('URL QRIS tidak valid').optional().nullable(),
  giftAddress: z.string().max(500).optional().nullable(),
  giftRecipientName: z.string().max(100).optional().nullable(),
  coverPhotoUrl: z
    .string()
    .url('URL cover foto tidak valid')
    .optional()
    .nullable(),
  bgMusicUrl: z.string().url('URL musik latar tidak valid').optional().nullable(),
  galleryPhotos: z
    .array(wizardGalleryPhotoItemSchema)
    .optional()
    .default([]),
});

// Step 5: Pemilihan Template, Palet Warna & Review
export const wizardStep5Schema = z.object({
  templateId: z.string().min(1, 'Template wajib dipilih'),
  visualCustomization: visualCustomizationSchema,
});

export const updateWizardStepSchema = z.discriminatedUnion('step', [
  z.object({ step: z.literal(1), data: wizardStep1Schema }),
  z.object({ step: z.literal(2), data: wizardStep2Schema }),
  z.object({ step: z.literal(3), data: wizardStep3Schema }),
  z.object({ step: z.literal(4), data: wizardStep4Schema }),
  z.object({ step: z.literal(5), data: wizardStep5Schema }),
]);

export const publishEventSchema = z.object({
  eventId: z.string().min(1, 'Event ID wajib diisi'),
});

export const updatePublishedEventSchema = z.object({
  title: z
    .string()
    .min(3, 'Nama acara minimal 3 karakter')
    .max(100)
    .optional(),
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
  loveStory: z.array(wizardLoveStoryItemSchema).optional(),
  coverPhotoUrl: z.string().url().nullable().optional(),
  bgMusicUrl: z.string().url().nullable().optional(),
  ogImageUrl: z.string().url().nullable().optional(),
});
