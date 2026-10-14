import { Hono } from 'hono';
import { mediaRoutes } from '../modules/media/routes.js';
import { manageEventsRoutes } from '../modules/events/routes.js';
import { manageGuestsRoutes } from '../modules/guests/routes.js';

export const manageRoutes = new Hono()
  .get('/ping', (c) => {
    return c.json({ success: true, message: 'manage api ready' });
  })
  .route('/media', mediaRoutes)
  .route('/events', manageEventsRoutes)
  .route('/events', manageGuestsRoutes);
