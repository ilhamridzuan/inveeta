import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/index.js';
import { sanitizeWishText } from '../src/modules/public/wishes.routes.js';

describe('Public Endpoints & Business Logic (Task M2.2)', () => {
  it('GET /api/v1/public/ping returns 200 ready', async () => {
    const res = await app.request('/api/v1/public/ping');
    assert.equal(res.status, 200);
    const body = (await res.json()) as { success: boolean; message: string };
    assert.equal(body.success, true);
    assert.equal(body.message, 'public api ready');
  });

  it('sanitizeWishText strips HTML tags and scripts properly (Anti-XSS)', () => {
    const maliciousInput =
      '<script>alert("XSS")</script><b>Selamat</b> atas pernikahannya! <a href="http://evil.com">Klik</a>';
    const sanitized = sanitizeWishText(maliciousInput);
    assert.equal(sanitized, 'Selamat atas pernikahannya! Klik');
  });

  it('POST /api/v1/public/rsvp returns 400 for empty sessions input', async () => {
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
    const body = (await res.json()) as {
      success: boolean;
      error: { code: string; message: string };
    };
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
    const body = (await res.json()) as {
      success: boolean;
      error: { code: string; message: string };
    };
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  it('POST /api/v1/public/rsvp returns 400 if declined pax is greater than 0', async () => {
    const res = await app.request('/api/v1/public/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: 'evt_1',
        guestId: 'gst_1',
        sessions: [
          {
            eventSessionId: 'ses_1',
            status: 'declined',
            actualPax: 2, // Inconsistent: declined with 2 pax
          },
        ],
      }),
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as {
      success: boolean;
      error: { code: string; message: string };
    };
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
    const body = (await res.json()) as {
      success: boolean;
      error: { code: string; message: string };
    };
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  it('POST /api/v1/public/wishes returns 400 for excessively long message', async () => {
    const res = await app.request('/api/v1/public/wishes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: 'evt_1',
        senderName: 'Budi',
        message: 'A'.repeat(501), // Too long (> 500)
      }),
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as {
      success: boolean;
      error: { code: string; message: string };
    };
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });
});
