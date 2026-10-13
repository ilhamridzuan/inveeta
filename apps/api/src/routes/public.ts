import { Hono } from 'hono';
import {
  publicEventsRoutes,
  publicRsvpRoutes,
  publicWishesRoutes,
} from '../modules/public/index.js';

export const publicRoutes = new Hono()
  .get('/ping', (c) => {
    return c.json({ success: true, message: 'public api ready' });
  })
  .route('/events', publicEventsRoutes)
  .route('/rsvp', publicRsvpRoutes)
  .route('/wishes', publicWishesRoutes);
