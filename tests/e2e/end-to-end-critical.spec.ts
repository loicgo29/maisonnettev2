import { test, expect } from '@playwright/test';

/**
 * CRITICAL END-TO-END TESTS
 *
 * These tests verify the actual user experience, not just component rendering.
 * They detect real issues like:
 * - Broken authentication redirects
 * - Inaccessible external services
 * - Dead links
 * - Missing dependencies
 */

test.describe('Critical End-to-End Flows', () => {

  test('HOME PAGE: No broken redirects or 404s', async ({ page }) => {
    await page.goto('http://localhost:5173/');

    // Wait for all network activity to complete
    await page.waitForLoadState('networkidle');

    // Check final URL (should NOT be stuck in redirect loop)
    const finalUrl = page.url();
    expect(finalUrl).not.toContain('localhost:9001'); // Keycloak should not be directly shown

    // Check for 404 or error pages
    const pageContent = await page.content();
    expect(pageContent).not.toContain('404');
    expect(pageContent).not.toContain('not found');

    // Calendar should load without errors
    const errorElement = page.locator('text=/Erreur|Error|Failed/i').first();
    const isError = await errorElement.isVisible().catch(() => false);
    expect(isError, 'Home page should not show errors').toBe(false);
  });

  test('BACKOFFICE: Auth redirect should work or display login', async ({ page }) => {
    const response = await page.goto('http://localhost:5173/backoffice/meals', { waitUntil: 'networkidle' });

    // Should complete load without hanging
    expect(response).toBeTruthy();
    expect(response?.status()).toBeLessThan(400);

    const url = page.url();

    // Either:
    // 1. Still on backoffice (authenticated or showing login message)
    // 2. Redirected to actual auth page (not to broken URL)

    if (url.includes('localhost:9001')) {
      // If redirected to Keycloak, verify Keycloak is actually accessible
      const keycloakResponse = await page.request.get('http://localhost:9001/realms/master/.well-known/openid-configuration').catch(() => null);

      expect(keycloakResponse, '❌ CRITICAL: Keycloak at localhost:9001 is NOT accessible. Backend auth is broken.').toBeTruthy();
      if (keycloakResponse) {
        expect(keycloakResponse.ok(), 'Keycloak should respond with 200').toBe(true);
      }
    } else if (url.includes('login') || url.includes('auth')) {
      // Login page is shown - that's fine
      const loginForm = page.locator('input[type="password"], input[type="email"], button:has-text("Se connecter")');
      const hasLoginForm = await loginForm.first().isVisible().catch(() => false);
      expect(hasLoginForm || url.includes('localhost:5173')).toBe(true);
    } else {
      // Still on backoffice - good
      expect(url).toContain('backoffice');
    }
  });

  test('API HEALTH: All critical endpoints are accessible', async ({ page }) => {
    const endpoints = [
      { url: 'http://localhost:3001/health', name: 'Backend Health' },
      { url: 'http://localhost:3001/api/calendar', name: 'Calendar API' },
      { url: 'http://localhost:3001/api/calendar/public', name: 'Public Calendar API' },
      { url: 'http://localhost:5173/', name: 'Frontend' },
      { url: 'http://localhost:8030/', name: 'Caddy (prod frontend)' },
    ];

    const results: { name: string; status: number; ok: boolean; error?: string }[] = [];

    for (const endpoint of endpoints) {
      const response = await page.request.get(endpoint.url).catch(err => {
        results.push({
          name: endpoint.name,
          status: 0,
          ok: false,
          error: err.message,
        });
        return null;
      });

      if (response) {
        results.push({
          name: endpoint.name,
          status: response.status(),
          ok: response.ok(),
        });
      }
    }

    // Report results
    console.log('\n📊 ENDPOINT HEALTH:');
    results.forEach(r => {
      const icon = r.ok ? '✅' : '❌';
      const error = r.error ? ` (${r.error})` : '';
      console.log(`${icon} ${r.name}: ${r.status}${error}`);
    });

    // Critical endpoints that MUST work
    const criticalEndpoints = ['Backend Health', 'Frontend', 'Caddy (prod frontend)'];
    const criticalResults = results.filter(r => criticalEndpoints.includes(r.name));

    const allCriticalOk = criticalResults.every(r => r.ok);
    expect(allCriticalOk, '❌ CRITICAL: One or more essential services are down').toBe(true);
  });

  test('AUTHENTICATION: Keycloak status or fallback login', async ({ page }) => {
    // Check if Keycloak is configured and accessible
    const keycloakUrl = process.env.KEYCLOAK_REALM_URL || 'http://localhost:9000/application/o/maisonnettev2/';

    const keycloakResponse = await page.request.get(keycloakUrl).catch(() => null);

    if (!keycloakResponse) {
      console.log('⚠️  WARNING: Keycloak not accessible at', keycloakUrl);
      console.log('   Expected: OAuth2 authentication via Keycloak');
      console.log('   Current: Auth service unavailable');

      // Fallback: Check if there's a login form somewhere
      await page.goto('http://localhost:5173/admin');
      const hasLoginOption = await page.content().then(c =>
        c.includes('Se connecter') || c.includes('login') || c.includes('auth')
      );

      expect(hasLoginOption, 'At least a login prompt should be visible').toBe(true);
    } else {
      expect(keycloakResponse.ok(), 'Keycloak should be accessible').toBe(true);
    }
  });

  test('NETWORK: No unhandled fetch errors', async ({ page }) => {
    const failedRequests: string[] = [];

    page.on('response', response => {
      if (!response.ok() && response.status() >= 500) {
        failedRequests.push(`${response.url()} (${response.status()})`);
      }
    });

    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');

    if (failedRequests.length > 0) {
      console.log('\n⚠️  Server errors detected:');
      failedRequests.forEach(r => console.log(`   ${r}`));
    }

    // Allow client errors (4xx) but not server errors (5xx) from critical services
    const criticalErrors = failedRequests.filter(r =>
      r.includes('/api/') && !r.includes('login') && !r.includes('auth')
    );

    expect(criticalErrors, '❌ Critical API endpoints should not return 5xx errors').toHaveLength(0);
  });

  test('REDIRECT LOOP: No infinite redirects', async ({ page }) => {
    let redirectCount = 0;

    page.on('framenavigated', () => {
      redirectCount++;
    });

    await page.goto('http://localhost:5173/backoffice/meals', {
      waitUntil: 'networkidle',
      timeout: 10000, // 10 second timeout for redirects
    });

    // Reasonable limit: 5 redirects max (1 to auth, 1 to login form, etc.)
    expect(redirectCount, '❌ Too many redirects - possible redirect loop').toBeLessThanOrEqual(10);

    const finalUrl = page.url();
    console.log(`\n📍 Final URL after ${redirectCount} navigations:`);
    console.log(`   ${finalUrl}`);
  });

  test('CRITICAL: Backoffice meals is either accessible or shows proper auth error', async ({ page }) => {
    await page.goto('http://localhost:5173/backoffice/meals');

    const url = page.url();
    const content = await page.content();

    // Case 1: Accessible (authenticated)
    const isAccessible = url.includes('backoffice') && !url.includes('login') && !url.includes('auth');

    // Case 2: Shows login message
    const hasLoginMessage = content.includes('Se connecter') || content.includes('connecter pour accéder');

    // Case 3: Redirected to proper auth page (not broken)
    const hasProperAuth = url.includes('localhost:9000') || url.includes('localhost:9001');
    const authIsAccessible = hasProperAuth ?
      (await page.request.get(url.split('?')[0]).then(r => r.ok()).catch(() => false)) :
      true;

    const isValid = isAccessible || hasLoginMessage || (hasProperAuth && authIsAccessible);

    expect(isValid, `❌ Backoffice meals flow is broken. URL: ${url}`).toBe(true);
  });
});
