import { test, expect } from '@playwright/test';

test.describe('Maisonnettev2 Validator — REAL Feature Tests', () => {
  test('HOME PAGE: Calendar component shows NO ERROR (critical)', async ({ page }) => {
    // Fresh navigation (no cache clearing needed - test detects what user sees)
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000); // Wait for async component

    // THIS IS THE REAL TEST: Does the error appear?
    const errorText = await page.locator('text=Erreur: Failed to fetch calendar').isVisible().catch(() => false);

    // If error shows, something is broken
    expect(errorText, '❌ CRITICAL BUG: "Erreur: Failed to fetch calendar" appears on page').toBe(false);

    // Should show calendar (either events or empty state, NOT an error)
    const hasCalendar = await page.locator('.public-calendar, .calendar-container').isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasCalendar, 'Should show calendar component').toBe(true);
  });

  test('CALENDAR PAGE: Component displays (no error)', async ({ page }) => {
    await page.goto('http://localhost:5173/calendar', { waitUntil: 'networkidle' });

    // WAIT for async component load
    await page.waitForTimeout(2000);

    // FAIL if error message appears
    const hasError = await page.locator('text=/Erreur|Failed to fetch/i').isVisible().catch(() => false);
    expect(hasError, '❌ Calendar shows error').toBe(false);

    // SHOULD show auth button or events
    const hasAuth = await page.locator('text=Se connecter avec Google').isVisible().catch(() => false);
    const hasEvents = await page.locator('.event').count().then(c => c > 0);

    expect(hasAuth || hasEvents, 'Should show auth button or events').toBe(true);
  });

  test('API /api/calendar endpoint works', async ({ page }) => {
    const response = await page.request.get('http://localhost:5173/api/calendar');

    expect(response.ok(), `API should return 200, got ${response.status()}`).toBe(true);

    const json = await response.json();
    expect(json.authUrl, 'Should have authUrl').toBeTruthy();
  });

  test('Backend /api/calendar endpoint works', async ({ page }) => {
    const response = await page.request.get('http://localhost:3001/api/calendar');

    expect(response.ok(), `Backend should return 200, got ${response.status()}`).toBe(true);

    const json = await response.json();
    expect(json.authUrl, 'Backend should have authUrl').toBeTruthy();
  });

  test('NO console errors during page load', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Filter for REAL errors (not development warnings)
    const realErrors = consoleErrors.filter(e =>
      /Failed to fetch|NetworkError|CORS|TypeError|Uncaught/.test(e)
    );

    expect(realErrors, `Console has errors: ${realErrors.join('; ')}`).toHaveLength(0);
  });

  test('Frontend responds (not 404/500)', async ({ page }) => {
    const response = await page.request.get('http://localhost:5173/');
    expect(response.status()).toBe(200);
  });
});
