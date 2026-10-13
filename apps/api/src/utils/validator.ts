import { zValidator as baseZValidator } from '@hono/zod-validator';
import type { ZodSchema } from 'zod';

/**
 * Wrapper zValidator yang memastikan seluruh kegagalan validasi
 * menghasilkan format respons standar Inveeta (AGENTS.md Bagian 4.3).
 */
export const zValidator = <
  T extends ZodSchema,
  Target extends 'json' | 'query' | 'param',
>(
  target: Target,
  schema: T
) =>
  baseZValidator(target, schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Format data masukan tidak valid',
            details: result.error.issues.map((issue) => ({
              field: issue.path.join('.'),
              issue: issue.message,
            })),
          },
        },
        400
      );
    }
  });
