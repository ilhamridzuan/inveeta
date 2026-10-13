import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';

export const globalErrorHandler = (err: Error, c: Context) => {
  // 1. Tangani Zod Validation Error dari zValidator
  if (err instanceof ZodError) {
    return c.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Format data masukan tidak valid',
          details: err.issues.map((issue) => ({
            field: issue.path.join('.'),
            issue: issue.message,
          })),
        },
      },
      400
    );
  }

  // 2. Tangani Custom Domain Application Errors
  if (err instanceof AppError) {
    return c.json(
      {
        success: false,
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      },
      err.statusCode as any
    );
  }

  // 3. Tangani HTTP Exceptions bawaan Hono
  if (err instanceof HTTPException) {
    return c.json(
      {
        success: false,
        error: {
          code: 'HTTP_EXCEPTION',
          message: err.message,
        },
      },
      err.status
    );
  }

  // 4. Fallback Internal Server Error
  console.error('[Unhandled Server Error]:', err);
  return c.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Terjadi kesalahan sistem internal pada server',
      },
    },
    500
  );
};
