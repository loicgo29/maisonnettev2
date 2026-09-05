import { test, expect } from '@playwright/test';

const BASE_URL = process.env.E2E_URL || 'http://localhost:8030';

test('STRICT: login → JWT → redirect → meals renders', async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const badResponses: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('response', (res) => {
    if (res.url().includes('/api/') && res.status() >= 400) {
      badResponses.push(`${res.status()} ${res.url()}`);
    }
  });

  // STEP 1: form loads
  await page.goto(`${BASE_URL}/backoffice/login`);
  await expect(page.locator('form')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();

  // STEP 2: POST login → 200 + JWT
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');

  const [loginResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/backoffice/auth/login') && r.request().method() === 'POST'),
    page.click('button[type="submit"]'),
  ]);
  expect(loginResp.status(), 'login must return 200').toBe(200);
  const body = await loginResp.json();
  expect(body.token, 'response must carry a JWT').toBeTruthy();
  expect(String(body.token).split('.').length, 'token must be a 3-part JWT').toBe(3);

  // STEP 3: redirect to /backoffice/meals
  await page.waitForURL(/\/backoffice\/meals/, { timeout: 10000 });
  const cookies = await page.context().cookies();
  const tokenCookie = cookies.find((c) => c.name === 'backoffice_token');
  expect(tokenCookie?.value, 'token must be persisted in backoffice_token cookie').toBeTruthy();
  expect(String(tokenCookie!.value).split('.').length, 'cookie must hold a 3-part JWT').toBe(3);

  // STEP 4: meals page renders with data, no JS errors
  await page.waitForLoadState('networkidle');
  const bodyText = (await page.locator('body').innerText()).toLowerCase();
  expect(bodyText).not.toContain('failed to fetch');
  expect(bodyText).not.toContain('internal server error');
  expect(bodyText.length, 'meals page must render content').toBeGreaterThan(50);

  expect(pageErrors, `uncaught JS errors: ${pageErrors.join(' | ')}`).toHaveLength(0);
  expect(badResponses, `failing API calls: ${badResponses.join(' | ')}`).toHaveLength(0);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toHaveLength(0);
});
