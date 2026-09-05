import { test, expect } from '@playwright/test';

const BASE_URL = process.env.E2E_URL || 'http://localhost:8030';

test('REAL login flow verification', async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const apiCalls: string[] = [];

  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('response', async (r) => {
    if (r.url().includes('/api/')) apiCalls.push(`${r.status()} ${r.request().method()} ${r.url()}`);
  });

  // 1. Form loads
  await page.goto(`${BASE_URL}/backoffice/login`);
  await expect(page.locator('form')).toBeVisible();
  console.log('STEP1_FORM_LOADS: PASS');

  // 2. Login POST
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');

  const [loginResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/auth/login'), { timeout: 15000 }).catch(() => null),
    page.click('button[type="submit"]'),
  ]);

  if (loginResp) {
    const body = await loginResp.text().catch(() => '');
    console.log('STEP2_LOGIN_STATUS:', loginResp.status());
    console.log('STEP2_HAS_JWT:', /"token"\s*:\s*"eyJ/.test(body));
    console.log('STEP2_BODY:', body.slice(0, 200));
  } else {
    console.log('STEP2_LOGIN_STATUS: NO_RESPONSE_CAPTURED');
  }

  // 3. Redirect
  await page.waitForTimeout(4000);
  const finalUrl = page.url();
  console.log('STEP3_FINAL_URL:', finalUrl);
  const token = await page.evaluate(() => localStorage.getItem('backoffice_token'));
  console.log('STEP3_TOKEN_STORED:', token ? 'YES' : 'NO');

  // 4. Meals page renders
  const bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 800);
  console.log('STEP4_PAGE_TEXT:', JSON.stringify(bodyText));

  console.log('CONSOLE_ERRORS:', JSON.stringify(consoleErrors));
  console.log('PAGE_ERRORS:', JSON.stringify(pageErrors));
  console.log('API_CALLS:', JSON.stringify(apiCalls));

  const estConnecte = [...consoleErrors, ...pageErrors, bodyText].some((s) =>
    s.includes('estConnecte')
  );
  console.log('STEP4_ESTCONNECTE_ERROR:', estConnecte);

  // Hard assertions
  expect(loginResp?.status(), 'login must return 200').toBe(200);
  expect(finalUrl, 'must redirect to meals').toContain('meals');
  expect(estConnecte, 'must have no estConnecte error').toBe(false);
  expect(pageErrors, 'no uncaught page errors').toEqual([]);
});
