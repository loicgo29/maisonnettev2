import { test, expect } from '@playwright/test';

const PROD_URL = 'https://maisonnette-pecheur-bertheaume.fr';
const ADMIN_URL = `${PROD_URL}/admin`;
const KEYCLOAK_URL = 'https://auth.maisonnette-pecheur-bertheaume.fr';

test.describe('Admin Login Flow (E2E)', () => {
  test('Admin page redirects to Keycloak login', async ({ page }) => {
    // Navigate to admin
    await page.goto(ADMIN_URL);

    // Should redirect to Keycloak
    await expect(page).toHaveURL(/auth\.maisonnette-pecheur-bertheaume\.fr/);

    // Keycloak login form should load
    await expect(page.locator('text=Sign in to your account')).toBeVisible({ timeout: 10000 });
  });

  test('Keycloak login page loads correctly', async ({ page }) => {
    // Navigate to Keycloak auth endpoint
    const authUrl = `${KEYCLOAK_URL}/realms/maisonnettev2/protocol/openid-connect/auth?client_id=maisonnettev2-frontend&response_type=code&scope=openid+email+profile&redirect_uri=${encodeURIComponent(`${ADMIN_URL}/callback`)}&code_challenge=test&code_challenge_method=S256`;

    await page.goto(authUrl);

    // Should NOT see "Client not found"
    const clientNotFound = await page.locator('text=Client not found').isVisible().catch(() => false);
    expect(clientNotFound).toBeFalsy();

    // Should see login form or error details
    const pageText = await page.textContent('body');
    console.log('Page text:', pageText?.substring(0, 200));

    // Should have proper Keycloak styling
    await expect(page).toHaveTitle(/[Kk]eycloak|[Ll]ogin/);
  });

  test('OAuth2 authorization endpoint accessible', async ({ page }) => {
    const authUrl = `${KEYCLOAK_URL}/realms/maisonnettev2/protocol/openid-connect/auth?client_id=maisonnettev2-frontend&response_type=code`;

    const response = await page.goto(authUrl);

    // Should not be 404
    expect(response?.status()).not.toBe(404);
    expect(response?.status()).not.toBe(400);
  });

  test('Admin dashboard loads after authentication (if credentials available)', async ({ page }) => {
    // Skip if no credentials
    const username = process.env.KEYCLOAK_TEST_USER;
    const password = process.env.KEYCLOAK_TEST_PASSWORD;

    if (!username || !password) {
      test.skip();
    }

    // Navigate to admin
    await page.goto(ADMIN_URL);

    // Should redirect to Keycloak
    await expect(page).toHaveURL(/auth\.maisonnette-pecheur-bertheaume\.fr/);

    // Fill login form
    await page.fill('input[name="username"]', username!);
    await page.fill('input[name="password"]', password!);
    await page.click('button:has-text("Sign In")');

    // Should redirect back to admin callback
    await expect(page).toHaveURL(/admin\/callback/);

    // Admin dashboard should load
    await expect(page.locator('text=Tableau de bord|Dashboard|Admin')).toBeVisible({ timeout: 10000 });
  });
});
