import { z } from 'zod';
import {
  createGuestSchema,
  updateGuestSchema,
  manualOverrideRsvpSchema,
} from '../schemas/guest.schema.js';
import type { GuestCategory, RsvpStatus } from '../constants/categories.js';

export type CreateGuestInput = z.infer<typeof createGuestSchema>;
export type UpdateGuestInput = z.infer<typeof updateGuestSchema>;
export type ManualOverrideRsvpInput = z.infer<typeof manualOverrideRsvpSchema>;

export interface CurrentRsvpDTO {
  status: RsvpStatus;
  actualPax: number;
  notes: string | null;
  isManualOverride: boolean;
  updatedAt: string;
}

export interface AllocatedSessionDTO {
  sessionId: string;
  sessionTitle: string;
  startTime: string;
  endTime: string;
  locationName: string;
  address: string;
  googleMapsUrl: string | null;
  currentRsvp: CurrentRsvpDTO | null;
}

export interface PersonalizedGuestContextDTO {
  guest: {
    id: string;
    name: string;
    category: GuestCategory;
    maxPax: number;
    token: string;
  };
  allocatedSessions: AllocatedSessionDTO[];
  isRsvpLocked: boolean;
  lockReason: 'DEADLINE_PASSED' | 'HOST_OVERRIDE' | null;
}

export interface GuestItemDTO {
  id: string;
  eventId: string;
  name: string;
  phoneNumber: string | null;
  category: GuestCategory;
  maxPax: number;
  token: string;
  invitationUrl: string;
  allocatedSessionIds: string[];
  checkedInAt?: string | null;
  checkInSessionId?: string | null;
  createdAt: string;
}

export interface WhatsAppLinkDTO {
  phoneNumber: string;
  rawMessage: string;
  encodedUrl: string;
}
