import { test, expect } from '@playwright/test';

test('STRICT: login then meals loads data', async ({ page }) => {
  const api: string[] = [];
  page.on('response', r => {
    if (r.url().includes('/api/')) api.push(`${r.status()} ${r.request().method()} ${r.url()}`);
  });
  page.on('request', r => {
    if (r.url().includes('/api/meals') || r.url().includes('/api/backoffice')) {
      console.log('REQ', r.method(), r.url(), 'auth=', r.headers()['authorization'] ?? 'NONE', 'cookie=', (r.headers()['cookie'] ?? 'NONE').slice(0,40));
    }
  });

  await page.goto('/backoffice/login');
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL(/meals/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');

  const body = await page.locator('body').innerText();
  console.log('--- API CALLS:', JSON.stringify(api, null, 1));
  console.log('--- BODY:', body.slice(0, 400));

  expect(body, 'meals page must not show a load error').not.toMatch(/Erreur chargement|401|Failed to fetch/i);
});
