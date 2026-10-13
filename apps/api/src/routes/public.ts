import { Hono } from 'hono';

export const publicRoutes = new Hono()
  .get('/ping', (c) => {
    return c.json({ success: true, message: 'public api ready' });
  });
