import { test, expect } from '@playwright/test';

const BASE_URL = process.env.E2E_URL || 'http://localhost:8030';

test('STRICT: login -> redirect to meals -> page renders', async ({ page }) => {
  const consoleErrors: string[] = [];
  const apiCalls: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message));
  page.on('response', (r) => {
    if (r.url().includes('/api/')) apiCalls.push(`${r.status()} ${r.request().method()} ${r.url()}`);
  });

  await page.goto(`${BASE_URL}/backoffice/login`);
  await expect(page.locator('form')).toBeVisible();

  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(4000);

  const url = page.url();
  const token = await page.evaluate(() => JSON.stringify(Object.entries(localStorage)));
  const bodyText = (await page.locator('body').innerText()).slice(0, 1200);

  console.log('--- FINAL URL:', url);
  console.log('--- LOCALSTORAGE:', token);
  console.log('--- API CALLS:\n' + apiCalls.join('\n'));
  console.log('--- CONSOLE ERRORS:\n' + consoleErrors.join('\n'));
  console.log('--- BODY:\n' + bodyText);

  expect(url, 'should redirect to /backoffice/meals').toContain('/backoffice/meals');
  expect(consoleErrors.join('|'), 'no estConnecte error').not.toContain('estConnecte');
  expect(apiCalls.filter((c) => /^5\d\d/.test(c)), 'no 5xx api calls').toEqual([]);
});
