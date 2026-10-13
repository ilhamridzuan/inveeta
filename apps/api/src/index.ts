import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { sql } from 'drizzle-orm';
import { db } from '@inveeta/db';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { auth } from './lib/auth.js';
import {
  corsMiddleware,
  securityHeadersMiddleware,
  globalErrorHandler,
} from './middlewares/index.js';
import { publicRoutes } from './routes/public.js';
import { manageRoutes } from './routes/manage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const app = new Hono()
  .use('*', logger())
  .use('*', corsMiddleware)
  .use('*', securityHeadersMiddleware)
  .onError(globalErrorHandler)
  // 1. Better Auth handler
  .on(['POST', 'GET'], '/api/auth/**', (c) => {
    return auth.handler(c.req.raw);
  })
  // 2. Health check endpoint (Liveness & Readiness probe)
  .get('/health', async (c) => {
    try {
      await db.execute(sql`SELECT 1`);
      return c.json({ status: 'healthy', database: 'connected' }, 200);
    } catch (error) {
      console.error('[Health Check DB Error]:', error);
      return c.json(
        {
          status: 'degraded',
          database: 'disconnected',
          error: error instanceof Error ? error.message : 'Unknown database error',
        },
        500
      );
    }
  })
  // 3. Mount sub-routes with method chaining
  .route('/api/v1/public', publicRoutes)
  .route('/api/v1/manage', manageRoutes);

export type AppType = typeof app;

const port = Number(process.env.PORT) || 3000;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  serve(
    {
      fetch: app.fetch,
      port,
    },
    (info) => {
      console.log(`Inveeta API server is running on http://localhost:${info.port}`);
    }
  );
}

export default app;
