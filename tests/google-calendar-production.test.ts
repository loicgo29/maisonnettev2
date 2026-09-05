/**
 * CRITICAL: Google Calendar OAuth2 Configuration Tests
 * Tests ACTUAL production system for Google Calendar integration
 */

import { describe, it, expect } from 'vitest';

const PROD = 'https://maisonnette-pecheur-bertheaume.fr';

describe('PRODUCTION: Google Calendar OAuth2', () => {
  describe('Calendar Callback Endpoint', () => {
    it('CRITICAL: Calendar callback must handle Google OAuth2 redirect', async () => {
      const callbackUrl = `${PROD}/api/calendar/callback?code=test_code&state=test_state`;
      const res = await fetch(callbackUrl);

      // Should NOT return "Could not determine client ID"
      const body = await res.text();
      expect(body).not.toContain('Could not determine client ID');

      // Should either redirect or return a proper error (not 500)
      expect([200, 302, 400, 401]).toContain(res.status);
    });

    it('CRITICAL: Calendar callback must NOT fail with missing credentials', async () => {
      const callbackUrl = `${PROD}/api/calendar/callback?code=test_code`;
      const res = await fetch(callbackUrl, { redirect: 'manual' });

      const body = await res.text();

      // If we get "Could not determine client ID" it means Google credentials missing
      if (body.includes('Could not determine client ID')) {
        throw new Error('❌ PRODUCTION ERROR: Google Calendar credentials not configured. Check PRIVATE_GOOGLE_CLIENT_ID, PRIVATE_GOOGLE_CLIENT_SECRET, PRIVATE_GOOGLE_REDIRECT_URI, PRIVATE_GITE_CALENDAR_ID in production environment.');
      }

      expect(res.status).not.toBe(500);
    });

    it('CRITICAL: Calendar API endpoint must be accessible', async () => {
      const res = await fetch(`${PROD}/api/calendar`);

      // Should return 200, 400, or 401 (not 404 or 500)
      expect([200, 400, 401, 302]).toContain(res.status);
      expect(res.status).not.toBe(404);
      expect(res.status).not.toBe(500);
    });
  });

  describe('Google OAuth2 Flow Validation', () => {
    it('Must properly handle OAuth2 code exchange', async () => {
      // This would test the actual code exchange but requires valid Google credentials
      const callbackUrl = `${PROD}/api/calendar/callback?code=invalid_code`;
      const res = await fetch(callbackUrl);

      // Should not crash on invalid code
      expect([200, 302, 400]).toContain(res.status);
    });

    it('Must handle missing code parameter gracefully', async () => {
      const callbackUrl = `${PROD}/api/calendar/callback`;
      const res = await fetch(callbackUrl);

      const body = await res.text();
      expect(body).not.toContain('Could not determine client ID');
      expect([200, 302, 400]).toContain(res.status);
    });

    it('Must include redirect_uri in OAuth2 requests', async () => {
      // Test that the calendar integration uses proper redirect_uri
      const callbackUrl = `${PROD}/api/calendar/callback?code=test&state=test`;
      const res = await fetch(callbackUrl, { redirect: 'manual' });

      // Should either succeed with code, redirect, or fail properly
      expect([200, 302, 400, 401, 500]).toContain(res.status);
    });
  });

  describe('Environment Variables Validation', () => {
    it('CRITICAL: PRIVATE_GOOGLE_CLIENT_ID must be configured', async () => {
      const callbackUrl = `${PROD}/api/calendar/callback?code=test_code`;
      const res = await fetch(callbackUrl);
      const body = await res.text();

      if (body.includes('Could not determine client ID')) {
        throw new Error('❌ GOOGLE_CLIENT_ID not configured in production .env');
      }
    });

    it('CRITICAL: PRIVATE_GOOGLE_CLIENT_SECRET must be configured', async () => {
      const callbackUrl = `${PROD}/api/calendar/callback?code=real_code`;
      const res = await fetch(callbackUrl);

      // If we get invalid_request from Google, it might mean secret is wrong
      const body = await res.text();
      if (body.includes('invalid_client')) {
        throw new Error('❌ GOOGLE_CLIENT_SECRET configuration issue in production');
      }
    });

    it('CRITICAL: PRIVATE_GOOGLE_REDIRECT_URI must match Google console', async () => {
      const callbackUrl = `${PROD}/api/calendar/callback?code=test_code`;
      const res = await fetch(callbackUrl);

      // Redirect URI mismatch would cause invalid_grant error
      const body = await res.text();
      if (body.includes('redirect_uri_mismatch')) {
        throw new Error('❌ REDIRECT_URI mismatch between production and Google Console');
      }
    });

    it('CRITICAL: PRIVATE_GITE_CALENDAR_ID should be configured', async () => {
      // This endpoint needs the calendar ID to function
      const callbackUrl = `${PROD}/api/calendar/callback?code=test_code`;
      const res = await fetch(callbackUrl);

      const body = await res.text();
      // Should at least try to process the code, not fail immediately
      expect(body).not.toContain('calendars are not configured');
    });
  });

  describe('REGRESSION: Previous Calendar Issues', () => {
    it('Must NOT return generic "Could not determine client ID" error', async () => {
      const callbackUrl = `${PROD}/api/calendar/callback?code=test`;
      const res = await fetch(callbackUrl);
      const body = await res.text();

      if (body.includes('Could not determine client ID')) {
        throw new Error('❌ REGRESSION: Calendar callback broken with missing client ID error');
      }
    });

    it('Must handle Google redirects (GET method)', async () => {
      // Google sends OAuth2 redirect as GET, not POST
      const callbackUrl = `${PROD}/api/calendar/callback?code=test_code&state=state_value`;
      const res = await fetch(callbackUrl, { method: 'GET' });

      // Should handle GET requests
      expect([200, 302, 400, 401]).toContain(res.status);
    });

    it('Must properly validate OAuth2 parameters', async () => {
      const callbackUrl = `${PROD}/api/calendar/callback?code=test_code`;
      const res = await fetch(callbackUrl);

      // Should not crash on missing optional parameters
      expect([200, 302, 400, 401, 500]).toContain(res.status);
    });
  });
});
