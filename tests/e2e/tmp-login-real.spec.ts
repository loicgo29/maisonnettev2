import { test } from '@playwright/test';
const BASE_URL = 'http://localhost:8030';
test('capture nav failure', async ({ page }) => {
  page.on('requestfailed', r => console.log('REQFAILED ' + r.url() + ' :: ' + r.failure()?.errorText));
  await page.goto(`${BASE_URL}/backoffice/login`);
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  try { await page.goto(`${BASE_URL}/backoffice/meals`); } catch (e:any) { console.log('GOTO ERR: ' + e.message.split('\n')[0]); }
});
