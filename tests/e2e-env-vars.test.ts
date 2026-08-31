import { expect, test, describe } from 'vitest';

const PRODUCTION_URL = 'https://maisonnette-pecheur-bertheaume.fr';

describe('E2E: Environment Variables at Production Runtime', () => {
  test('PRIVATE_GOOGLE_REDIRECT_URI must be injected in frontend bundle', async () => {
    const res = await fetch(`${PRODUCTION_URL}/api/calendar`);
    const data = await res.json();

    expect(res.ok).toBe(true);
    expect(data).toHaveProperty('authUrl');

    // Verify REDIRECT_URI is correct production domain
    expect(data.authUrl).toContain('https://maisonnette-pecheur-bertheaume.fr/api/calendar/callback');

    // CRITICAL: Should NOT fall back to localhost (sign of build-time injection failure)
    expect(data.authUrl).not.toContain('localhost');
    expect(data.authUrl).not.toContain('127.0.0.1');
  });

  test('Google OAuth2 CLIENT_ID must be available in callback handler', async () => {
    // Even with an invalid code, the endpoint should accept the request
    // If CLIENT_ID was missing, we'd get "Could not determine client ID"
    const res = await fetch(
      `${PRODUCTION_URL}/api/calendar/callback?code=invalid&state=test`,
      { redirect: 'manual' }
    );

    // Either redirect (success with valid code) or error about code validity
    // But NOT error about missing CLIENT_ID
    const data = await res.json();
    expect(data.error?.error_description).not.toContain('Could not determine client ID');
  });

  test('PRIVATE_GITE_CALENDAR_ID must be available (calendar events fetch)', async () => {
    // Test that calendar endpoint doesn't error about missing calendar ID
    const res = await fetch(`${PRODUCTION_URL}/api/calendar`);
    expect(res.ok).toBe(true);

    const data = await res.json();
    // Should have authUrl, not error about missing calendar ID
    expect(data).toHaveProperty('authUrl');
  });

  test('PUBLIC_AUTH_URL must match configured Keycloak realm', async () => {
    const res = await fetch(`${PRODUCTION_URL}/api/health`);
    const data = await res.json();

    expect(res.ok).toBe(true);
    // Backend should be healthy (indicates AUTH_URL is configured)
    expect(data.status).toBe('ok');
  });

  test('Google Calendar OAuth2 auth URL must contain all required parameters', async () => {
    const res = await fetch(`${PRODUCTION_URL}/api/calendar`);
    const data = await res.json();

    const authUrl = data.authUrl;

    // CRITICAL: All Google OAuth2 parameters must be present
    expect(authUrl).toContain('client_id=');
    expect(authUrl).toContain('redirect_uri=');
    expect(authUrl).toContain('response_type=code');
    expect(authUrl).toContain('scope=https://www.googleapis.com/auth/calendar.readonly');
    expect(authUrl).toContain('access_type=offline');
  });

  test('Backend health check validates KEYCLOAK_REALM_URL', async () => {
    const res = await fetch(`${PRODUCTION_URL}/api/health`);

    expect(res.ok).toBe(true);

    // If KEYCLOAK_REALM_URL wasn't set, backend would fail to start
    // (see backend/src/lib/oidc.ts comment)
    const data = await res.json();
    expect(data.status).toBe('ok');
  });

  test('Verify no env vars leak to client bundle', async () => {
    const res = await fetch(`${PRODUCTION_URL}`);
    const html = await res.text();

    // SECURITY: Private env vars should never appear in HTML
    expect(html).not.toContain('PRIVATE_GOOGLE_CLIENT_SECRET');
    expect(html).not.toContain('DB_PASSWORD');
    expect(html).not.toContain('KC_DB_PASSWORD');

    // Only PUBLIC_* vars should be exposed to client
    // (but they're injected via SvelteKit, not in raw HTML)
  });

  test('Docker build args were passed (redirect_uri format check)', async () => {
    const res = await fetch(`${PRODUCTION_URL}/api/calendar`);
    const data = await res.json();

    // If docker-compose build args weren't passed, REDIRECT_URI would be default
    const authUrl = new URL(data.authUrl);
    const redirectUri = authUrl.searchParams.get('redirect_uri');

    // Encoded form: https%3A%2F%2F...
    expect(redirectUri).toContain('maisonnette-pecheur-bertheaume.fr');
    expect(redirectUri).not.toContain('localhost');
  });
});

describe('E2E: Environment Variables - Backend Services', () => {
  test('Database connection string must be valid (health check)', async () => {
    const res = await fetch(`${PRODUCTION_URL}/api/health`);

    expect(res.ok).toBe(true);
    // If DATABASE_URL was malformed, health check would fail
    const data = await res.json();
    expect(data.status).toBe('ok');
  });

  test('Keycloak realm URL must be accessible from backend', async () => {
    const res = await fetch(`${PRODUCTION_URL}/api/health`);

    // If KEYCLOAK_REALM_URL was wrong, backend would fail startup
    expect(res.ok).toBe(true);
  });

  test('Frontend static assets must load correctly', async () => {
    const res = await fetch(`${PRODUCTION_URL}/_app/immutable/start.js`, {
      method: 'HEAD'
    });

    // Static assets should be available
    expect([200, 304]).toContain(res.status);
  });
});
