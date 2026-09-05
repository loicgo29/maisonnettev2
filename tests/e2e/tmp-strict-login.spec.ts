import { test, expect } from '@playwright/test';

const BASE_URL = process.env.E2E_URL || 'http://localhost:8030';

test('STRICT: login redirects to meals and renders content', async ({ page }) => {
  const consoleErrors: string[] = [];
  const badResponses: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push('PAGEERROR: ' + err.message));
  page.on('response', res => {
    if (res.status() >= 500) badResponses.push(`${res.status()} ${res.url()}`);
  });

  await page.goto(`${BASE_URL}/backoffice/login`);
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');

  await page.waitForURL(/\/backoffice\/meals/, { timeout: 15000 });

  const cookies = await page.context().cookies();
  const tokenCookie = cookies.find(c => c.name === 'backoffice_token');
  expect(tokenCookie?.value, 'JWT cookie must be set').toBeTruthy();

  await page.waitForLoadState('networkidle');
  const body = (await page.locator('body').innerText()).toLowerCase();

  console.log('FINAL URL:', page.url());
  console.log('BODY SNIPPET:', body.slice(0, 400));
  console.log('CONSOLE ERRORS:', JSON.stringify(consoleErrors));
  console.log('5xx:', JSON.stringify(badResponses));

  expect(body).not.toContain('keycloak');
  expect(body).not.toContain('failed to fetch');
  expect(body.length).toBeGreaterThan(50);
  expect(badResponses, '5xx responses').toEqual([]);
  const realErrors = consoleErrors.filter(e => !/favicon|Download the (React|Svelte)/i.test(e));
  expect(realErrors, 'console errors').toEqual([]);
});
