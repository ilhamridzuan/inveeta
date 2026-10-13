export const GUEST_CATEGORIES = ['VIP', 'Keluarga', 'Reguler'] as const;
export type GuestCategory = (typeof GUEST_CATEGORIES)[number];

export const RSVP_STATUSES = ['attending', 'declined', 'pending'] as const;
export type RsvpStatus = (typeof RSVP_STATUSES)[number];

export const TEMPLATE_TIERS = ['free', 'premium', 'exclusive'] as const;
export type TemplateTier = (typeof TEMPLATE_TIERS)[number];

export const INDONESIA_TIMEZONES = [
  'Asia/Jakarta',
  'Asia/Makassar',
  'Asia/Jayapura',
] as const;
export type IndonesiaTimeZone = (typeof INDONESIA_TIMEZONES)[number];

export const MEDIA_TYPES = ['photo', 'audio', 'qris', 'og_image'] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];
