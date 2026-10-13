import { Hono } from 'hono';
import { publicEventsRoutes } from '../modules/events/routes.js';

export const publicRoutes = new Hono()
  .get('/ping', (c) => {
    return c.json({ success: true, message: 'public api ready' });
  })
  .route('/events', publicEventsRoutes);
