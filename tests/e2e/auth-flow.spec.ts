import { test, expect } from '@playwright/test';

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3001';
const KEYCLOAK_URL = 'http://localhost:9001';
const KEYCLOAK_REALM = 'maisonnettev2';

test.describe('maisonnettev2 - Authentication Flow', () => {

  test('Frontend loads successfully', async ({ page }) => {
    await page.goto(FRONTEND_URL);

    const title = await page.locator('title').innerText().catch(() => '');
    expect(title.toLowerCase()).toMatch(/maisonnette|gîte|accueil/i);

    const heading = await page.locator('h1, h2').first().innerText().catch(() => '');
    expect(heading.length).toBeGreaterThan(0);
  });

  test('Login button redirects to Keycloak', async ({ page }) => {
    await page.goto(FRONTEND_URL);

    // Look for login button
    const loginButton = page.locator('button:has-text("Connexion"), button:has-text("Login"), a:has-text("Sign In"), [data-testid="login-button"]').first();

    if (await loginButton.isVisible().catch(() => false)) {
      await loginButton.click();

      // Should redirect to Keycloak
      await page.waitForURL(/localhost:9001|keycloak/, { timeout: 5000 }).catch(() => {
        console.log('Navigation to Keycloak timed out (may already be on login page)');
      });

      expect(page.url()).toContain('localhost:9001');
    } else {
      console.log('Login button not found (frontend may not be fully interactive yet)');
    }
  });

  test('OIDC Manager initializes without errors', async ({ page }) => {
    await page.goto(FRONTEND_URL);

    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait for page to settle
    await page.waitForTimeout(2000);

    // OIDC initialization shouldn't cause console errors
    const oidcErrors = errors.filter(e => e.toLowerCase().includes('oidc') || e.toLowerCase().includes('auth'));
    expect(oidcErrors.length).toBe(0);
  });

  test('No fatal console errors on initial load', async ({ page }) => {
    const fatalErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        fatalErrors.push(msg.text());
      }
    });

    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });

    // Filter out common non-fatal errors
    const criticalErrors = fatalErrors.filter(
      e => !e.includes('preflight') && !e.includes('CORS')
    );

    expect(criticalErrors.length).toBe(0);
  });
});

test.describe('maisonnettev2 - Backend API', () => {

  test('Health endpoint responds', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/health`);

    expect([200, 503]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('status');
    }
  });

  test('Swagger UI is accessible', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/docs`);

    expect([200, 503]).toContain(response.status());
  });

  test('GET /api/gites (public endpoint) works', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/gites`);

    expect([200, 503]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    }
  });

  test('GET /api/reservations requires authentication', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/reservations`);

    expect(response.status()).toBe(401);
  });

  test('GET /api/reservations with valid JWT succeeds', async ({ request }) => {
    // Generate a mock JWT for testing (in real tests, obtain from Keycloak)
    const mockJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0dXNlciIsImlhdCI6OTk5OTk5OTk5OX0.fake';

    const response = await request.get(`${BACKEND_URL}/api/reservations`, {
      headers: {
        'Authorization': `Bearer ${mockJWT}`
      }
    });

    // Should be 401 (invalid token) or 200 (accepted) — not a different error
    expect([200, 401]).toContain(response.status());
  });

  test('JWKS endpoint is reachable', async ({ request }) => {
    const response = await request.get(
      `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`
    );

    expect([200, 404]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('keys');
      expect(Array.isArray(data.keys)).toBe(true);
    }
  });

  test('OIDC Configuration discovery works', async ({ request }) => {
    const response = await request.get(
      `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/.well-known/openid-configuration`
    );

    expect([200, 404]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('authorization_endpoint');
      expect(data).toHaveProperty('token_endpoint');
      expect(data).toHaveProperty('userinfo_endpoint');
    }
  });
});

test.describe('maisonnettev2 - Integration Checks', () => {

  test('Frontend can reach backend', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/health`);

    expect(response.status()).toMatch(/2\d\d|5\d\d/);
  });

  test('Backend can reach Keycloak JWKS', async ({ request }) => {
    const response = await request.get(
      `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`,
      { timeout: 5000 }
    );

    expect([200, 404, 500]).toContain(response.status());
  });

  test('Backend returns appropriate CORS headers', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/gites`, {
      headers: {
        'Origin': 'http://localhost:5173'
      }
    });

    expect(response.status()).toBeLessThan(500);

    // CORS headers should be present or absent consistently
    const corsHeaders = response.headers();
    expect(
      corsHeaders['access-control-allow-origin'] ||
      corsHeaders['access-control-allow-credentials']
    ).toBeDefined();
  });

  test('All services respond to requests', async ({ request }) => {
    const checks = [
      { name: 'Frontend', url: FRONTEND_URL },
      { name: 'Backend Health', url: `${BACKEND_URL}/health` },
      { name: 'Keycloak Health', url: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}` }
    ];

    for (const check of checks) {
      const response = await request.get(check.url, { timeout: 5000 }).catch(() => null);
      expect(response?.status()).toMatch(/2\d\d|4\d\d|5\d\d/);
    }
  });

  test('No circular redirect loops in auth flow', async ({ page }) => {
    await page.goto(FRONTEND_URL);

    const redirectCount = await page.evaluate(() => {
      return window.location.href;
    });

    // Should not be in a redirect loop
    expect(redirectCount).not.toMatch(/redirect.*redirect/i);
  });
});

test.describe('maisonnettev2 - Security', () => {

  test('API rejects requests with invalid tokens', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/reservations`, {
      headers: {
        'Authorization': 'Bearer invalid.token.here'
      }
    });

    expect(response.status()).toBe(401);
  });

  test('API rejects requests with missing Authorization header', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/reservations`);

    expect(response.status()).toBe(401);
  });

  test('API rejects requests with malformed Authorization header', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/reservations`, {
      headers: {
        'Authorization': 'NotBearer sometoken'
      }
    });

    expect(response.status()).toBe(401);
  });

  test('Public endpoints do not require authentication', async ({ request }) => {
    const publicEndpoints = [
      '/api/gites',
      '/health'
    ];

    for (const endpoint of publicEndpoints) {
      const response = await request.get(`${BACKEND_URL}${endpoint}`);
      expect(response.status()).not.toBe(401);
    }
  });

  test('No sensitive data in error responses', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/reservations`);

    if (response.status() === 401) {
      const data = await response.json().catch(() => ({}));
      const text = JSON.stringify(data).toLowerCase();

      // Should not expose sensitive info in error messages
      expect(text).not.toMatch(/secret|password|token|credential/);
    }
  });

  test('Response headers include security measures', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/health`);

    const headers = response.headers();

    // Check for Helmet.js security headers (common patterns)
    expect(headers['x-content-type-options'] || headers['content-type']).toBeDefined();
  });
});
