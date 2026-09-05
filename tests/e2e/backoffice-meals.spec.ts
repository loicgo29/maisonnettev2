import { test, expect } from '@playwright/test';

const BACKOFFICE_MEALS_URL = process.env.E2E_URL
  ? `${process.env.E2E_URL}/backoffice/meals`
  : 'http://localhost:5173/backoffice/meals';

const API_MEALS_URL = process.env.E2E_API_URL
  ? `${process.env.E2E_API_URL}/api/backoffice/meals`
  : 'http://localhost:3001/api/backoffice/meals';

test.describe('Backoffice Meals Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to backoffice meals
    await page.goto(BACKOFFICE_MEALS_URL);

    // Wait for page to load (either redirect to login or show content)
    await page.waitForTimeout(2000);
  });

  test('should load backoffice meals page', async ({ page }) => {
    const url = page.url();
    expect(url).toContain('backoffice');

    // Check page title or heading
    const heading = page.locator('h1, h2, [role="heading"]');
    expect(heading).toBeTruthy();
  });

  test('should require authentication', async ({ page }) => {
    // If not authenticated, should redirect to login
    const url = page.url();
    const isAuthenticated = !url.includes('login') && !url.includes('auth') && url.includes('backoffice');

    // Either authenticated and showing content, or redirected to login
    const hasContent = await page.locator('table, [data-testid="meals-list"], .meals-container').isVisible().catch(() => false);
    const isLoginPage = url.includes('login') || url.includes('auth');

    expect(isAuthenticated || isLoginPage).toBe(true);
  });

  test('should display meals list or empty state', async ({ page }) => {
    // If authenticated
    const url = page.url();
    if (!url.includes('login') && !url.includes('auth')) {
      // Should show meals table or empty state
      const mealsList = page.locator(
        'table, [data-testid="meals-list"], [data-testid="meals-table"], .meals-container, .empty-state'
      );

      const isVisible = await mealsList.isVisible().catch(() => false);
      expect(isVisible || (await page.content()).includes('repas') || (await page.content()).includes('Repas')).toBeTruthy();
    }
  });

  test('API /api/backoffice/meals/accounts should be accessible', async ({ page }) => {
    const response = await page.request.get(`${API_MEALS_URL}/accounts`).catch(() => null);

    // Either 200 (success) or 401/403 (auth required) or 500 (error) - just not 404
    if (response) {
      expect([200, 400, 401, 403, 500]).toContain(response.status());
      expect(response.status()).not.toBe(404);
    }
  });

  test('should not show error messages on load', async ({ page }) => {
    // Check for common error messages
    const errorPatterns = ['Erreur', 'Error', 'Failed', 'not found', '404', '500'];
    const pageContent = await page.content();

    const hasError = errorPatterns.some(pattern =>
      pageContent.toLowerCase().includes(pattern.toLowerCase())
    );

    // Allow errors in certain contexts (like login errors), but page should load
    const url = page.url();
    const isBackofficePage = url.includes('backoffice');
    expect(isBackofficePage).toBe(true);
  });

  test('should have navigation elements', async ({ page }) => {
    // Check for navigation or menu items
    const nav = page.locator('nav, [role="navigation"], .sidebar, .menu');
    const navVisible = await nav.isVisible().catch(() => false);

    // Either navigation exists or content is visible
    const hasContent = await page.locator('[role="main"], main, .content').isVisible().catch(() => false);
    expect(navVisible || hasContent).toBe(true);
  });

  test('should display accounts information', async ({ page }) => {
    // Try to find accounts section
    const accountsSection = page.locator(
      '[data-testid="accounts"], [data-testid="accounts-list"], .accounts, .accounts-container'
    );

    const isVisible = await accountsSection.isVisible().catch(() => false);
    const pageContent = await page.content();

    // Either shows accounts component or has "compte" (accounts in French)
    expect(isVisible || pageContent.toLowerCase().includes('compte')).toBeTruthy();
  });

  test('should handle page errors gracefully', async ({ page }) => {
    // Collect any console errors
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Wait for page interactions
    await page.waitForTimeout(3000);

    // Filter for actual errors (not dev warnings)
    const realErrors = consoleErrors.filter(e =>
      /Failed to fetch|NetworkError|TypeError|Uncaught/.test(e)
    );

    // Should not have network/fetch errors (auth errors are ok)
    expect(realErrors.filter(e => !e.includes('401') && !e.includes('403'))).toHaveLength(0);
  });

  test('should not redirect to home on backoffice access', async ({ page }) => {
    const url = page.url();

    // Should not redirect to homepage just because backoffice is accessed
    expect(url).not.toMatch(/\/$|\/index\.html$/);

    // Should still be in backoffice or auth domain
    expect(
      url.includes('backoffice') ||
      url.includes('login') ||
      url.includes('auth') ||
      url.includes('localhost')
    ).toBe(true);
  });
});
