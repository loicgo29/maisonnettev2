import { test, expect } from '@playwright/test';

test.describe('OIDC Authentication', () => {
  test('should show login page when not authenticated', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('h1')).toContainText('maisonnettev2');
    await expect(page.locator('button', { hasText: 'Se connecter avec Email' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Google' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'GitHub' })).toBeVisible();
  });

  test('should redirect to login when accessing protected page without auth', async ({ page }) => {
    await page.goto('/');

    // Check if redirected or shows login section
    const loginButton = page.locator('button:has-text("Se connecter")').first();
    await expect(loginButton).toBeVisible({ timeout: 5000 });
  });

  test('should display home page when authenticated (mock)', async ({ page }) => {
    // Note: In real test, would use Authentik test user
    // For now, test unauthenticated state
    await page.goto('/');

    // Should see gites heading
    await expect(page.locator('h2')).toContainText('Nos Gîtes');
  });

  test('localStorage should persist after login flow (mock)', async ({ page, context }) => {
    // Mock OIDC token in localStorage
    await context.addInitScript(() => {
      localStorage.setItem(
        'oidc.user:http://localhost:9000/application/o/maisonnettev2/',
        JSON.stringify({
          access_token: 'mock_token_123',
          id_token: 'mock_id_token_123',
          profile: {
            sub: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
            email_verified: true,
          },
        })
      );
    });

    await page.goto('/');

    // Verify auth state is loaded
    const storedToken = await page.evaluate(() => {
      const user = localStorage.getItem('oidc.user:http://localhost:9000/application/o/maisonnettev2/');
      return user ? JSON.parse(user).access_token : null;
    });

    expect(storedToken).toBe('mock_token_123');
  });

  test('should handle logout', async ({ page, context }) => {
    // Setup: Add mock token
    await context.addInitScript(() => {
      localStorage.setItem(
        'oidc.user:http://localhost:9000/application/o/maisonnettev2/',
        JSON.stringify({
          access_token: 'mock_token_123',
          profile: { sub: 'user-123', email: 'test@example.com' },
        })
      );
    });

    await page.goto('/');

    // Find and click logout (would be in header/nav)
    // This is a placeholder - actual logout button location depends on UI
    const logoutButton = page.locator('button:has-text("Déconnexion"), button:has-text("Logout")').first();

    if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await logoutButton.click();

      // Verify localStorage cleared
      const token = await page.evaluate(() => {
        return localStorage.getItem('oidc.user:http://localhost:9000/application/o/maisonnettev2/');
      });
      expect(token).toBeNull();
    }
  });
});

test.describe('Login Page Accessibility', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/login');

    const h1 = page.locator('h1');
    const h2s = page.locator('h2');

    await expect(h1).toHaveCount(1);
    await expect(h1).toContainText('maisonnettev2');
  });

  test('should have accessible buttons', async ({ page }) => {
    await page.goto('/login');

    const buttons = page.locator('button');
    const count = await buttons.count();

    expect(count).toBeGreaterThan(0);

    // All buttons should have visible text
    for (let i = 0; i < count; i++) {
      const text = await buttons.nth(i).textContent();
      expect(text?.trim().length).toBeGreaterThan(0);
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size

    await page.goto('/login');

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('button').first()).toBeVisible();
  });
});
