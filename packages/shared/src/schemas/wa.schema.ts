import { z } from 'zod';

export const updateWaTemplateSchema = z.object({
  templateText: z
    .string()
    .min(10, 'Template pesan WhatsApp minimal 10 karakter')
    .max(2000, 'Template pesan WhatsApp maksimal 2000 karakter'),
});

export type UpdateWaTemplateInput = z.infer<typeof updateWaTemplateSchema>;
