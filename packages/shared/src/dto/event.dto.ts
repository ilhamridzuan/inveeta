import { z } from 'zod';
import {
  createDraftEventSchema,
  updateWizardStepSchema,
  publishEventSchema,
  updatePublishedEventSchema,
  visualCustomizationSchema,
} from '../schemas/event.schema.js';
import type { IndonesiaTimeZone, TemplateTier } from '../constants/categories.js';

export type CreateDraftEventInput = z.infer<typeof createDraftEventSchema>;
export type UpdateWizardStepInput = z.infer<typeof updateWizardStepSchema>;
export type PublishEventInput = z.infer<typeof publishEventSchema>;
export type UpdatePublishedEventInput = z.infer<typeof updatePublishedEventSchema>;
export type VisualCustomization = z.infer<typeof visualCustomizationSchema>;

export interface LoveStoryItem {
  year: string;
  story: string;
  photoUrl?: string;
}

export interface BankAccountItem {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface EventGiftDetails {
  qrisImageUrl: string | null;
  giftAddress: string | null;
  giftRecipientName: string | null;
  bankAccounts: BankAccountItem[];
}

export interface EventMediaItem {
  id: string;
  mediaType: 'photo' | 'audio' | 'qris' | 'og_image';
  fileUrl: string;
  slotIdentifier: string | null;
  sortOrder: number;
}

export interface PublicSessionItem {
  id: string;
  title: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  locationName: string;
  address: string;
  googleMapsUrl: string | null;
  wazeUrl: string | null;
  isPublic: boolean;
}

export interface PublicEventDTO {
  id: string;
  slug: string;
  title: string;
  eventType: 'wedding';
  templateId: string;
  templateTier: TemplateTier;
  visualCustomization: VisualCustomization;
  eventDate: string;
  timeZone: IndonesiaTimeZone;
  rsvpDeadline: string;
  isPublished: boolean;
  ogImageUrl: string | null;
  groomName: string | null;
  groomNickname: string | null;
  groomParents: string | null;
  brideName: string | null;
  brideNickname: string | null;
  brideParents: string | null;
  quoteText: string | null;
  quoteSource: string | null;
  loveStory: LoveStoryItem[];
  giftDetails: EventGiftDetails | null;
  media: EventMediaItem[];
  sessions: PublicSessionItem[];
}

export interface SlugAvailabilityDTO {
  slug: string;
  isAvailable: boolean;
  reason?: 'ALREADY_TAKEN' | 'RESERVED_KEYWORD' | 'INVALID_FORMAT';
}

export interface PublishedEventResponseDTO {
  id: string;
  slug: string;
  isPublished: boolean;
  publishedAt: string;
  invitationUrl: string;
}
