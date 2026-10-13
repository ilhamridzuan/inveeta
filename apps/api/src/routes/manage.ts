import { Hono } from 'hono';
import { mediaRoutes } from '../modules/media/routes.js';

export const manageRoutes = new Hono()
  .get('/ping', (c) => {
    return c.json({ success: true, message: 'manage api ready' });
  })
  .route('/media', mediaRoutes);
