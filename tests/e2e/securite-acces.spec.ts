import { test, expect } from '@playwright/test';

/**
 * Contrôles d'accès et durcissement de la session.
 *
 * Chaque cas correspond à une recommandation de l'OWASP WSTG ou du guide
 * Keycloak, appliquée à cette architecture. Ils échouent si un durcissement
 * acquis est relâché — ce qui, sur ces sujets, ne se voit jamais à l'usage :
 * l'application continue de fonctionner exactement pareil.
 */

const BASE = process.env.E2E_URL || 'http://maisonnette.localhost:8030';
const API = process.env.E2E_API_URL || 'http://localhost:3001';
const ALO = process.env.E2E_ALO_URL || 'http://alo.maisonnette.localhost:8030';
const ADMIN_PWD = process.env.E2E_ADMIN_PWD || 'admin123';

async function seConnecter(page: import('@playwright/test').Page) {
  await page.goto(`${BASE}/backoffice/login`);
  await page.fill('#username', 'admin');
  await page.fill('#pwd', ADMIN_PWD);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.endsWith('/backoffice/login'), { timeout: 15000 });
}

test.describe('Session du backoffice', () => {
  test('le cookie est HttpOnly, SameSite=Strict, et porte le domaine', async ({
    page,
    context,
  }) => {
    await seConnecter(page);
    const cookie = (await context.cookies()).find((c) => c.name === 'backoffice_token');

    expect(cookie, 'cookie de session absent').toBeTruthy();

    // HttpOnly : posé en JavaScript, il serait lisible en JavaScript, et une
    // faille XSS suffirait à emporter la session.
    expect(cookie!.httpOnly, 'le cookie est lisible par les scripts de la page').toBe(true);

    // Strict : le cookie ne part pas sur une navigation venue d'un autre site.
    expect(cookie!.sameSite, 'SameSite trop permissif').toBe('Strict');

    // Le point initial marque un cookie de domaine, celui qui atteint alo.
    expect(cookie!.domain.startsWith('.'), 'cookie host-only : il n’atteindra pas alo').toBe(
      true
    );
  });

  test('le jeton ne circule pas dans le stockage du navigateur', async ({ page }) => {
    await seConnecter(page);
    const stockage = await page.evaluate(() => ({
      local: Object.entries(localStorage).map(([k, v]) => `${k}=${v}`).join('|'),
      session: Object.entries(sessionStorage).map(([k, v]) => `${k}=${v}`).join('|'),
    }));

    // Le profil affiché peut y figurer ; un JWT, non — il y serait à la portée
    // du moindre script tiers.
    for (const [ou, contenu] of Object.entries(stockage)) {
      expect(contenu, `un jeton JWT traîne dans ${ou}Storage`).not.toMatch(/eyJ[\w-]+\./);
    }
  });

  test('la déconnexion invalide réellement la session', async ({ page, context }) => {
    await seConnecter(page);
    await page.goto(`${BASE}/backoffice/logout`);
    await page.waitForURL('**/backoffice/login', { timeout: 15000 });

    expect(
      (await context.cookies()).find((c) => c.name === 'backoffice_token'),
      'le cookie survit à la déconnexion'
    ).toBeFalsy();

    await page.goto(`${ALO}/api/periods`);
    expect(page.url(), 'alo reste ouvert après déconnexion').toContain('/backoffice/login');
  });
});

test.describe('Contrôle d’accès aux API', () => {
  const routesProtegees = [
    '/api/backoffice/meals/accounts',
    '/api/backoffice/meals/range?startDate=2026-09-01&endDate=2026-09-30&account=gourmich',
    '/api/admin/dashboard',
  ];

  for (const route of routesProtegees) {
    test(`sans jeton : ${route.split('?')[0]} refuse`, async ({ request }) => {
      const r = await request.get(`${API}${route}`);
      expect([401, 403], `route ouverte sans authentification`).toContain(r.status());
    });

    test(`jeton forgé : ${route.split('?')[0]} refuse`, async ({ request }) => {
      // Signé avec un secret arbitraire : la signature doit être vérifiée, et
      // pas seulement la présence d'un jeton de forme plausible.
      const faux =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
        'eyJ1c2VySWQiOiJ4Iiwicm9sZSI6ImFkbWluIiwiZXhwIjo5OTk5OTk5OTk5fQ.' +
        'signature-inventee';
      const r = await request.get(`${API}${route}`, {
        headers: { Authorization: `Bearer ${faux}` },
      });
      expect([401, 403], 'un jeton forgé est accepté').toContain(r.status());
    });
  }

  test('un jeton expiré est refusé', async ({ request }) => {
    // exp dans le passé, signature invalide : dans les deux cas, refus attendu.
    const expire =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
      'eyJ1c2VySWQiOiJ4IiwiZXhwIjoxMDAwMDAwMDAwfQ.' +
      'peu-importe';
    const r = await request.get(`${API}/api/backoffice/meals/accounts`, {
      headers: { Authorization: `Bearer ${expire}` },
    });
    expect([401, 403]).toContain(r.status());
  });
});

test.describe('En-têtes de sécurité', () => {
  test('les pages du backoffice portent les en-têtes attendus', async ({ page }) => {
    // Par le navigateur : le client HTTP de Playwright s'appuie sur le
    // résolveur de Node, qui ignore la convention *.localhost.
    const reponse = await page.goto(`${BASE}/backoffice/login`);
    const h = reponse!.headers();

    expect(h['x-content-type-options'], 'sniffing de type MIME non bloqué').toBe('nosniff');
    expect(h['x-frame-options'], 'la page peut être encadrée').toBeTruthy();
    expect(h['referrer-policy'], 'politique de référent absente').toBeTruthy();
    // Le serveur ne doit pas annoncer sa nature : c'est une aide gratuite à qui
    // cherche une version vulnérable.
    expect(h['server'], 'le serveur s’identifie').toBeFalsy();
  });
});
