import { test, expect } from '@playwright/test';

test.describe('Maisonnettev2 Validator — E2E Feature Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Enable console logging
    page.on('console', msg => console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.error(`[BROWSER ERROR] ${err.message}`));
  });

  test('Calendar page loads without JS errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('http://localhost:5173/calendar', { waitUntil: 'networkidle' });

    // Should NOT have 404 or 500
    expect(page.url()).toContain('/calendar');

    // Should NOT have JS errors about Failed to fetch
    const failedFetch = errors.filter(e => e.includes('Failed to fetch'));
    expect(failedFetch, `Should not have "Failed to fetch" errors, got: ${failedFetch.join(', ')}`).toHaveLength(0);

    // Page should have content
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText).toContain('Calendrier');
  });

  test('Calendar component renders (auth or events)', async ({ page }) => {
    await page.goto('http://localhost:5173/calendar', { waitUntil: 'networkidle' });

    // Should show either:
    // 1. Loading state
    // 2. Auth required
    // 3. Events list

    const hasLoading = await page.locator('text=/Chargement|Loading/i').isVisible().catch(() => false);
    const hasAuth = await page.locator('text=/Se connecter|Google/i').isVisible().catch(() => false);
    const hasEvents = await page.locator('text=/Événement|Event/i').isVisible().catch(() => false);

    expect(hasLoading || hasAuth || hasEvents, 'Calendar should show loading, auth, or events').toBe(true);
  });

  test('API calendar endpoint returns valid response', async ({ page }) => {
    const response = await page.request.get('http://localhost:3001/api/calendar');

    expect(response.ok() || response.status() === 400, 'Calendar endpoint should respond 200 or 400').toBe(true);

    const json = await response.json();
    expect(json, 'Should have authUrl or error field').toHaveProperty(/authUrl|error/);
  });

  test('Booking calendar loads on home page', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

    expect(page.url()).toBe('http://localhost:5173/');

    // Should have calendar or booking content
    const bodyText = await page.textContent('body');
    expect(bodyText).toContain('Calendrier');

    // No fetch errors
    const failedFetch = errors.filter(e => e.includes('Failed to fetch'));
    expect(failedFetch).toHaveLength(0);
  });

  test('No CORS or network errors in console', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('http://localhost:5173/calendar', { waitUntil: 'networkidle' });

    // Filter for network/CORS errors only (not general JS errors)
    const networkErrors = consoleErrors.filter(e =>
      /CORS|Failed to fetch|NetworkError|ERR_|blocked/.test(e)
    );

    expect(networkErrors, `Should have no network errors, got: ${networkErrors.join('; ')}`).toHaveLength(0);
  });

  test('Backend health endpoint is accessible', async ({ page }) => {
    const response = await page.request.get('http://localhost:3001/health');
    expect(response.status()).toBe(200);
  });

  test('Frontend responds with HTML', async ({ page }) => {
    const response = await page.request.get('http://localhost:5173/');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/html');
  });
});
