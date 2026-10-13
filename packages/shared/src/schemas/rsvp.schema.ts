import { z } from 'zod';

export const rsvpSessionItemSchema = z
  .object({
    eventSessionId: z.string().min(1),
    status: z.enum(['attending', 'declined']),
    actualPax: z.number().int().min(0).max(20),
  })
  .refine(
    (data) => {
      if (data.status === 'attending') return data.actualPax >= 1;
      if (data.status === 'declined') return data.actualPax === 0;
      return true;
    },
    {
      message: 'Tamu yang hadir wajib mengisi minimal 1 pax; tamu yang tidak hadir harus 0 pax',
      path: ['actualPax'],
    }
  );

export const submitRsvpSchema = z.object({
  eventId: z.string().min(1),
  guestId: z.string().min(1),
  sessions: z
    .array(rsvpSessionItemSchema)
    .min(1, 'Pilih minimal satu sesi untuk konfirmasi kehadiran'),
  notes: z.string().max(500).optional(),
});
