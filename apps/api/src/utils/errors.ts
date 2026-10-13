export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?:
      | Record<string, unknown>
      | Array<{ field: string; issue: string }>
      | unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource tidak ditemukan', details?: unknown) {
    super(404, 'NOT_FOUND', message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(
    message = 'Akses tidak diizinkan. Silakan login terlebih dahulu.',
    details?: unknown
  ) {
    super(401, 'UNAUTHORIZED', message, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(
    message = 'Anda tidak memiliki hak akses ke resource ini.',
    details?: unknown
  ) {
    super(403, 'FORBIDDEN', message, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource mengalami konflik', details?: unknown) {
    super(409, 'CONFLICT', message, details);
  }
}

export class BadRequestError extends AppError {
  constructor(
    code = 'VALIDATION_ERROR',
    message = 'Format data masukan tidak valid',
    details?: unknown
  ) {
    super(400, code, message, details);
  }
}
