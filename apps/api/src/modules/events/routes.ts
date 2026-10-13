import { Hono } from 'hono';
import { zValidator } from '../../utils/validator.js';
import {
  createDraftEventSchema,
  updateWizardStepSchema,
} from '@inveeta/shared';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireEventOwner } from '../../middlewares/requireEventOwner.js';
import { eventsService } from './service.js';

export { publicEventsRoutes } from '../public/events.routes.js';

/**
 * Rute Manajemen Acara Host (/api/v1/manage/events/*)
 */
export const manageEventsRoutes = new Hono()
  .use('*', requireAuth)
  .post('/draft', zValidator('json', createDraftEventSchema), async (c) => {
    const user = c.get('user');
    const input = c.req.valid('json');
    const result = await eventsService.createDraftEvent(user.id, input);
    return c.json(
      {
        success: true,
        data: result,
      },
      201
    );
  })
  .get('/mine', async (c) => {
    const user = c.get('user');
    const result = await eventsService.getHostEvents(user.id);
    return c.json({
      success: true,
      data: result,
    });
  })
  .get('/:id', requireEventOwner('id'), async (c) => {
    const user = c.get('user');
    const eventId = c.req.param('id');
    const result = await eventsService.getEventById(user.id, eventId);
    return c.json({
      success: true,
      data: result,
    });
  })
  .put(
    '/:id/wizard-step',
    requireEventOwner('id'),
    zValidator('json', updateWizardStepSchema),
    async (c) => {
      const user = c.get('user');
      const eventId = c.req.param('id');
      const input = c.req.valid('json');
      const result = await eventsService.updateWizardStep(
        user.id,
        eventId,
        input
      );
      return c.json({
        success: true,
        data: result,
      });
    }
  )
  .post('/:id/publish', requireEventOwner('id'), async (c) => {
    const user = c.get('user');
    const eventId = c.req.param('id');
    const result = await eventsService.publishEvent(user.id, eventId);
    return c.json({
      success: true,
      data: result,
    });
  });
