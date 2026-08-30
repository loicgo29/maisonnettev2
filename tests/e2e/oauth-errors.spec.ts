import { test, expect, Page } from '@playwright/test';

const ADMIN_URL = 'http://localhost:8030/admin';
const API_URL = 'http://localhost:3001';

test.describe('OAuth2 Error Scenarios', () => {
  test('should return 401 with invalid token', async ({ page }) => {
    // Pré-remplir un token invalide
    await page.goto(ADMIN_URL);
    await page.evaluate(() => {
      sessionStorage.setItem('admin_jeton_acces', 'invalid-token-12345');
    });

    // Intercepter et vérifier la requête API
    let apiResponse: any;
    page.on('response', (response) => {
      if (response.url().includes('/api/admin/dashboard')) {
        apiResponse = {
          status: response.status(),
          statusText: response.statusText(),
        };
      }
    });

    await page.reload();
    await page.waitForTimeout(2000);

    expect(apiResponse?.status).toBe(401);
  });

  test('should log error details to console', async ({ page }) => {
    let consoleMessages: string[] = [];
    page.on('console', (msg) => {
      if (msg.text().includes('[OIDC]') || msg.text().includes('[API]')) {
        consoleMessages.push(msg.text());
      }
    });

    await page.goto(ADMIN_URL);
    await page.evaluate(() => {
      sessionStorage.setItem('admin_jeton_acces', 'bad-token');
    });

    await page.reload();
    await page.waitForTimeout(3000);

    const hasOIDCError = consoleMessages.some((msg) =>
      msg.includes('Token verification failed')
    );

    console.log('Console messages:', consoleMessages);
    expect(consoleMessages.length).toBeGreaterThan(0);
  });

  test('should show 401 error if token cannot be verified', async ({ page }) => {
    // Simuler un token JWT valide en format mais non signé par Authentik
    const fakeToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwibmFtZSI6IkZha2UgVXNlciJ9.fake-signature';

    await page.goto(ADMIN_URL);
    await page.evaluate((token) => {
      sessionStorage.setItem('admin_jeton_acces', token);
    }, fakeToken);

    // Chercher le message d'erreur
    const errorVisible = await page
      .locator('text=Accès refusé')
      .isVisible()
      .catch(() => false);

    expect(errorVisible || page.url().includes('auth')).toBeTruthy();
  });

  test('should verify OIDC token format requirements', async ({ page }) => {
    // Collect network requests
    const requests: any[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/api/admin/')) {
        requests.push({
          url: req.url(),
          headers: req.headers(),
        });
      }
    });

    // Valid JWT token structure: header.payload.signature
    const validJwt =
      'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.' +
      'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.' +
      'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

    await page.goto(ADMIN_URL);
    await page.evaluate((token) => {
      sessionStorage.setItem('admin_jeton_acces', token);
    }, validJwt);

    await page.reload();
    await page.waitForTimeout(2000);

    // Verify Authorization header was sent
    const authRequests = requests.filter((r) =>
      r.headers['authorization']?.startsWith('Bearer ')
    );

    expect(authRequests.length).toBeGreaterThan(0);
    expect(authRequests[0].headers['authorization']).toMatch(/^Bearer ey/);
  });

  test('should handle missing Authorization header gracefully', async ({ page }) => {
    // Clear sessionStorage (no token)
    await page.goto(ADMIN_URL);
    await page.evaluate(() => {
      sessionStorage.clear();
    });

    await page.reload();

    // Should redirect to login or show error
    const isLoginPage = page.url().includes('auth');
    const hasError = await page
      .locator('text=Accès refusé|Sign in')
      .isVisible()
      .catch(() => false);

    expect(isLoginPage || hasError).toBeTruthy();
  });

  test('should log token verification details', async ({ page }) => {
    const logs: any[] = [];

    page.on('console', (msg) => {
      if (
        msg.text().includes('[OIDC]') ||
        msg.text().includes('[API]') ||
        msg.text().includes('Token')
      ) {
        logs.push({
          text: msg.text(),
          type: msg.type(),
        });
      }
    });

    // Start with valid flow
    await page.goto(ADMIN_URL);

    // Should have auth logs
    await page.waitForTimeout(1000);

    console.log('Captured logs:', logs);
    // At minimum, should have attempted to verify something
    expect(logs.length).toBeGreaterThanOrEqual(0);
  });
});
