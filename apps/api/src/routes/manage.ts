import { Hono } from 'hono';

export const manageRoutes = new Hono()
  .get('/ping', (c) => {
    return c.json({ success: true, message: 'manage api ready' });
  });
