import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/index.js';
import { sanitizeWishText } from '../src/modules/public/wishes.routes.js';

describe('Public Endpoints (Task M2.2)', () => {
  it('sanitizeWishText strips HTML tags and scripts properly', () => {
    const maliciousInput = '<script>alert("XSS")</script><b>Selamat</b> atas pernikahannya! <a href="http://evil.com">Klik</a>';
    const sanitized = sanitizeWishText(maliciousInput);
    assert.equal(sanitized, 'Selamat atas pernikahannya! Klik');
  });

  it('GET /api/v1/public/events/:slug returns 404 for non-existent event', async () => {
    const res = await app.request('/api/v1/public/events/non-existent-wedding-12345');
    assert.equal(res.status, 404);
    const body = await res.json() as { success: boolean; error: { code: string; message: string } };
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'NOT_FOUND');
  });

  it('GET /api/v1/public/events/:slug/guests/:token returns 404 for non-existent event or invalid token', async () => {
    const res = await app.request('/api/v1/public/events/non-existent-slug/guests/invalidtoken123');
    assert.equal(res.status, 404);
    const body = await res.json() as { success: boolean; error: { code: string; message: string } };
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'NOT_FOUND');
  });

  it('POST /api/v1/public/rsvp returns 400 for empty or invalid sessions input', async () => {
    const res = await app.request('/api/v1/public/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: 'evt_1',
        guestId: 'gst_1',
        sessions: [], // Empty sessions fails min(1) validation
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json() as { success: boolean; error: { code: string } };
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  it('POST /api/v1/public/rsvp returns 400 if attending pax is 0', async () => {
    const res = await app.request('/api/v1/public/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: 'evt_1',
        guestId: 'gst_1',
        sessions: [
          {
            eventSessionId: 'ses_1',
            status: 'attending',
            actualPax: 0, // Inconsistent: attending with 0 pax
          },
        ],
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json() as { success: boolean; error: { code: string } };
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  it('POST /api/v1/public/wishes returns 400 for short message or name', async () => {
    const res = await app.request('/api/v1/public/wishes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: 'evt_1',
        senderName: 'A', // Too short (< 2)
        message: 'Hi', // Too short (< 5)
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json() as { success: boolean; error: { code: string } };
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });
});
