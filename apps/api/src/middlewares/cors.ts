import { cors } from 'hono/cors';

export const corsMiddleware = cors({
  origin: (origin) => {
    const allowedOrigins = [
      'https://inveeta.com',
      'https://app.inveeta.com',
    ];

    if (process.env.NODE_ENV !== 'production') {
      allowedOrigins.push(
        'http://localhost:3000',
        'http://localhost:4000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:4000',
        'http://127.0.0.1:5173'
      );
    }

    if (!origin || allowedOrigins.includes(origin)) {
      return origin;
    }
    return null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'x-request-id',
    'x-revalidate-secret',
  ],
  exposeHeaders: ['Content-Length', 'x-request-id'],
  credentials: true,
  maxAge: 86400,
});
