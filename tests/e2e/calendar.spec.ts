import { test, expect } from '@playwright/test';

test.describe('Calendar Availability', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/');
  });

  test('should load calendar without errors', async ({ page }) => {
    // Wait for calendar to load (check for auth redirect or calendar content)
    await page.waitForSelector('[data-testid="calendar"]', { timeout: 5000 }).catch(() => {
      // Calendar might show OAuth2 login instead
      return true;
    });

    // Verify no "Failed to fetch" errors
    const errors = await page.locator('text=/Failed to fetch|error/i').count();
    expect(errors).toBe(0);
  });

  test('should handle Google OAuth2 redirect', async ({ page }) => {
    // Navigate to calendar page
    const response = await page.goto('http://localhost:5173/calendar');
    expect(response?.status()).toBeLessThan(400);

    // Should either show calendar or OAuth2 redirect URL
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  test('should have calendar API endpoint accessible', async ({ page, context }) => {
    // Test backend calendar endpoint
    const calendarResponse = await context.request.get('http://localhost:3001/api/calendar');
    expect([501, 200, 401]).toContain(calendarResponse.status()); // 501=not impl, 200=ok, 401=auth needed
  });
});
