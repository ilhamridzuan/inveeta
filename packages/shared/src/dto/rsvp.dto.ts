import { z } from 'zod';
import { rsvpSessionItemSchema, submitRsvpSchema } from '../schemas/rsvp.schema.js';

export type RsvpSessionItem = z.infer<typeof rsvpSessionItemSchema>;
export type SubmitRsvpInput = z.infer<typeof submitRsvpSchema>;

export interface RsvpSubmittedSession {
  id: string;
  eventSessionId: string;
  status: 'attending' | 'declined';
  actualPax: number;
  updatedAt: string;
}

export interface RsvpResponseDTO {
  guestId: string;
  sessions: RsvpSubmittedSession[];
  notes: string | null;
}
