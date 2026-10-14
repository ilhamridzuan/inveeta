import { Hono } from 'hono';
import { mediaRoutes } from '../modules/media/routes.js';
import { manageEventsRoutes } from '../modules/events/routes.js';
import { manageGuestsRoutes } from '../modules/guests/routes.js';
import { manageWhatsAppRoutes } from '../modules/whatsapp/index.js';
import { manageWishesRoutes } from '../modules/wishes/index.js';
import { manageMetricsRoutes } from '../modules/metrics/index.js';
import { manageExportsRoutes } from '../modules/exports/index.js';

export const manageRoutes = new Hono()
  .get('/ping', (c) => {
    return c.json({ success: true, message: 'manage api ready' });
  })
  .route('/media', mediaRoutes)
  .route('/events', manageEventsRoutes)
  .route('/events', manageGuestsRoutes)
  .route('/events', manageWhatsAppRoutes)
  .route('/events', manageWishesRoutes)
  .route('/events', manageMetricsRoutes)
  .route('/events', manageExportsRoutes);
