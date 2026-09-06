import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8030';

async function login(page) {
  await page.goto(`${BASE_URL}/backoffice/login`);
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL(/meals/, { timeout: 10000 });
}

test.describe('Validator: backoffice auth fixes', () => {
  test('1. login with admin/admin123 succeeds (JWT_SECRET from env)', async ({ page }) => {
    await login(page);
    expect(page.url()).toContain('/backoffice/meals');
  });

  test('2. token NOT exposed in console logs', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', (m) => logs.push(m.text()));
    await login(page);
    await page.waitForTimeout(1500);
    const leaked = logs.filter(
      (l) => l.includes('admin123') || l.includes('eyJ') || l.includes('Bearer ')
    );
    expect(leaked, `Leaked console lines: ${JSON.stringify(leaked)}`).toHaveLength(0);
  });

  test('3. meals page loads with token', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await login(page);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toContainText('Failed to fetch');
    const fatal = errors.filter((e) => /Failed to fetch|NetworkError|500|502/i.test(e));
    expect(fatal, `Console errors: ${JSON.stringify(fatal)}`).toHaveLength(0);
  });

  test('4. /backoffice/logout clears auth state', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/backoffice/logout`);
    await page.waitForURL(/login/, { timeout: 10000 });

    const cookies = await page.context().cookies();
    const tokenCookie = cookies.find((c) => c.name === 'backoffice_token');
    expect(tokenCookie?.value || '', 'cookie should be cleared').toBe('');

    const ls = await page.evaluate(() => localStorage.getItem('backoffice_token'));
    expect(ls).toBeNull();
  });

  test('5. after logout, /backoffice/meals redirects to login', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/backoffice/logout`);
    await page.waitForURL(/login/, { timeout: 10000 });

    await page.goto(`${BASE_URL}/backoffice/meals`);
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/backoffice/login');
  });

  test('6. /api/backoffice/meals/accounts requires auth (401 without token)', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/backoffice/meals/accounts`);
    expect(res.status()).toBe(401);
  });

  test('6b. accounts accessible WITH valid token', async ({ request }) => {
    const loginRes = await request.post(`${BASE_URL}/api/backoffice/auth/login`, {
      data: { username: 'admin', pwd: 'admin123' },
    });
    expect(loginRes.status()).toBe(200);
    const { token } = await loginRes.json();
    const res = await request.get(`${BASE_URL}/api/backoffice/meals/accounts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
  });

  test('8. cookie has SameSite=Strict flag', async ({ page }) => {
    await login(page);
    const cookies = await page.context().cookies();
    const tokenCookie = cookies.find((c) => c.name === 'backoffice_token');
    expect(tokenCookie, 'backoffice_token cookie must exist').toBeTruthy();
    expect(tokenCookie!.sameSite).toBe('Strict');
    expect(tokenCookie!.path).toBe('/');
  });
});
