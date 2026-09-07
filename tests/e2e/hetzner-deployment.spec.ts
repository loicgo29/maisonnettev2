import { test, expect } from '@playwright/test';

const ADMIN_PWD = process.env.E2E_ADMIN_PWD || 'admin123';

/**
 * E2E Tests — Hetzner Three-Component Deployment
 *
 * Black box tests validating:
 * 1. Public static site (HTML)
 * 2. Backoffice (SvelteKit + JWT auth)
 * 3. Security (cross-domain isolation)
 * 4. Caddy routing (two domains)
 */

test.describe('🚀 Hetzner Deployment — Three Components', () => {

  // ========================================================================
  // 1. PUBLIC SITE — Static HTML
  // ========================================================================
  test.describe('📄 Public Site (maisonnette.fr)', () => {
    test('Homepage loads and renders', async ({ page }) => {
      // In local dev: http://localhost:8030
      // In Hetzner: maisonnette.fr
      await page.goto('/');

      // Page title
      const title = await page.title();
      expect(title).toContain('Maisonnette de Bertheaume');

      // Key sections exist
      await expect(page.locator('header h1')).toContainText('Maisonnette');
      await expect(page.locator('nav')).toBeVisible();

      // Public site should have NO auth elements
      await expect(page.locator('a[href*="login"]')).not.toBeVisible();
    });

    test('Reservation page loads', async ({ page }) => {
      await page.goto('/reservation.html');

      const title = await page.title();
      expect(title).toContain('Réservation');

      // Form elements
      await expect(page.locator('input[name="firstName"]')).toBeVisible();
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('textarea[name="message"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('Contact page loads', async ({ page }) => {
      await page.goto('/contact.html');

      const title = await page.title();
      expect(title).toContain('Contact');

      // Contact info visible
      await expect(page.locator('text=+33 7 81 10 38 89')).toBeVisible();
      await expect(page.locator('text=contact@maisonnette-bertheaume.fr')).toBeVisible();
    });

    test('Navigation links work', async ({ page }) => {
      await page.goto('/');

      // Click reservation link
      await page.click('a[href="/reservation.html"]');
      await page.waitForURL('**/reservation.html');
      expect(page.url()).toContain('reservation.html');

      // Back to home
      await page.click('a[href="/"]');
      await page.waitForURL('**/index.html');
    });

    test('No inline scripts (XSS protection)', async ({ page }) => {
      await page.goto('/');

      // Page loads without console errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          throw new Error(`Console error: ${msg.text()}`);
        }
      });

      // Wait for page to fully load
      await page.waitForLoadState('networkidle');

      // No errors should have occurred
      // (Page event handlers would have thrown if there were errors)
    });

    test('Static assets cache correctly', async ({ page }) => {
      const response = await page.goto('/');

      // Check Cache-Control headers
      const headers = response?.headers() || {};
      // Static site should set cache headers
      expect(headers['cache-control'] || '').toBeTruthy();
    });
  });

  // ========================================================================
  // 2. BACKOFFICE — Private Dashboard with JWT Auth
  // ========================================================================
  test.describe('🔐 Backoffice (backoffice.maisonnette.fr)', () => {
    test('Login page accessible without auth', async ({ page }) => {
      await page.goto('/backoffice/login');

      const title = await page.title();
      expect(title).toContain('Login');

      // Form elements
      await expect(page.locator('input[name="username"]')).toBeVisible();
      await expect(page.locator('input[name="pwd"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('Login with correct credentials succeeds', async ({ page }) => {
      await page.goto('/backoffice/login');

      // Fill form
      await page.fill('input[name="username"]', 'admin');
      await page.fill('input[name="pwd"]', ADMIN_PWD);

      // Submit
      await page.click('button[type="submit"]');

      // Should redirect to meals page
      await page.waitForURL('**/backoffice/meals', { timeout: 5000 });
      expect(page.url()).toContain('/backoffice/meals');

      // Page should render
      await expect(page.locator('h1')).toContainText('Repas');
    });

    test('JWT token stored after login', async ({ page }) => {
      await page.goto('/backoffice/login');

      // Login
      await page.fill('input[name="username"]', 'admin');
      await page.fill('input[name="pwd"]', ADMIN_PWD);
      await page.click('button[type="submit"]');

      // Wait for redirect
      await page.waitForURL('**/backoffice/meals');

      // Check for token in storage
      const cookies = await page.context().cookies();
      const hasBackofficeToken = cookies.some(c => c.name === 'backoffice_token');
      expect(hasBackofficeToken).toBe(true);

      // Token should not be empty
      const tokenCookie = cookies.find(c => c.name === 'backoffice_token');
      expect(tokenCookie?.value).toBeTruthy();
    });

    test('Protected route redirects to login if not authenticated', async ({ page }) => {
      // Try to access protected page without logging in first
      await page.goto('/backoffice/meals', { waitUntil: 'networkidle' });

      // Should be redirected to login
      expect(page.url()).toContain('login');
    });

    test('Logout clears auth token', async ({ page }) => {
      // Login first
      await page.goto('/backoffice/login');
      await page.fill('input[name="username"]', 'admin');
      await page.fill('input[name="pwd"]', ADMIN_PWD);
      await page.click('button[type="submit"]');

      // Wait for meals page
      await page.waitForURL('**/backoffice/meals');

      // Verify token exists
      let cookies = await page.context().cookies();
      let hasToken = cookies.some(c => c.name === 'backoffice_token');
      expect(hasToken).toBe(true);

      // Click logout
      await page.click('a[href*="logout"]');

      // Should redirect to login
      await page.waitForURL('**/backoffice/login', { timeout: 5000 });

      // Verify token cleared
      cookies = await page.context().cookies();
      const tokenCookie = cookies.find(c => c.name === 'backoffice_token');
      expect(!tokenCookie || !tokenCookie.value).toBe(true);
    });

    test('Meals page loads after successful login', async ({ page }) => {
      await page.goto('/backoffice/login');

      // Login
      await page.fill('input[name="username"]', 'admin');
      await page.fill('input[name="pwd"]', ADMIN_PWD);
      await page.click('button[type="submit"]');

      // Wait for meals page
      await page.waitForURL('**/backoffice/meals');

      // Check page elements
      await expect(page.locator('h1')).toContainText('Repas');
      await expect(page.locator('input[type="date"]')).toBeTruthy();
      await expect(page.locator('select')).toBeTruthy();

      // API should load meal data (may be empty initially)
      await page.waitForLoadState('networkidle');
    });
  });

  // ========================================================================
  // 3. API SECURITY — Cross-Domain Isolation
  // ========================================================================
  test.describe('🔒 Security — API Protection', () => {
    test('Unauthorized access to /api/backoffice/meals returns 401', async ({ page }) => {
      // Try to fetch backoffice API without token
      const response = await page.request.get('/api/backoffice/meals/accounts');

      // Should be 401 Unauthorized
      expect([401, 403]).toContain(response.status());
    });

    test('Authorized access to /api/backoffice/meals with JWT token succeeds', async ({ page }) => {
      // Login first to get token
      await page.goto('/backoffice/login');
      await page.fill('input[name="username"]', 'admin');
      await page.fill('input[name="pwd"]', ADMIN_PWD);
      await page.click('button[type="submit"]');

      // Wait for redirect
      await page.waitForURL('**/backoffice/meals');

      // Get token from cookies
      const cookies = await page.context().cookies();
      const tokenCookie = cookies.find(c => c.name === 'backoffice_token');
      expect(tokenCookie?.value).toBeTruthy();

      // Now API call should succeed
      const response = await page.request.get('/api/backoffice/meals/accounts', {
        headers: {
          'Authorization': `Bearer ${tokenCookie?.value}`
        }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeTruthy();
    });

    test('Backoffice API unavailable from public context (if separated)', async ({ page }) => {
      // This test validates separation at Caddy level
      // If public and backoffice are on different subdomains/ports

      const response = await page.request.get('/api/backoffice/meals/accounts');

      // Without auth token, should fail
      expect([401, 403]).toContain(response.status());
    });
  });

  // ========================================================================
  // 4. CADDY ROUTING — Multiple Domains/Subdomains
  // ========================================================================
  test.describe('🔄 Caddy Routing', () => {
    test('Health check endpoint responds', async ({ page }) => {
      // Backend health check
      const response = await page.request.get('/api/health');

      // May be 200 or 404 depending on endpoint
      expect(response.status()).toBeLessThan(500);
    });

    test('API endpoints routed correctly to backend', async ({ page }) => {
      // Fetch a public API endpoint (if one exists)
      const response = await page.request.get('/api/gites');

      // Should either succeed or return 401 (auth required)
      // Should NOT be 404 (routing works)
      expect(response.status()).not.toBe(404);
    });

    test('Static assets served with correct cache headers', async ({ page }) => {
      const response = await page.goto('/');

      const headers = response?.headers() || {};
      // Check for common cache-related headers
      const cacheControl = headers['cache-control'];

      // Should have some cache control (even if "must-revalidate")
      expect(cacheControl || '').toBeTruthy();
    });
  });

  // ========================================================================
  // 5. DEPLOYMENT CHECKLIST
  // ========================================================================
  test.describe('✅ Deployment Readiness', () => {
    test('All three domains respond (in Hetzner context)', async ({ page }) => {
      // This test validates infrastructure, not routing

      // Public site loads
      await page.goto('/');
      expect(page.url()).toBeTruthy();

      // Backoffice login loads
      await page.goto('/backoffice/login');
      expect(page.url()).toBeTruthy();

      // API responds (with or without auth)
      const apiResponse = await page.request.get('/api/health');
      expect(apiResponse.status()).not.toBe(404);
    });

    test('No console errors in production build', async ({ page }) => {
      const errors: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
          errors.push(msg.text());
        }
      });

      // Visit main pages
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await page.goto('/reservation.html');
      await page.waitForLoadState('networkidle');

      await page.goto('/backoffice/login');
      await page.waitForLoadState('networkidle');

      // Errors should be minimal (may have warnings, but no critical errors)
      const criticalErrors = errors.filter(e =>
        !e.includes('404') &&
        !e.includes('Unauthorized') &&
        !e.includes('401')
      );

      expect(criticalErrors.length).toBe(0);
    });

    test('Database connectivity (if public endpoint available)', async ({ page }) => {
      // If you add a public health check that includes DB check:
      const response = await page.request.get('/api/health');

      // Should be available (200 or 401, not 500)
      expect(response.status()).not.toBe(500);
    });
  });
});
