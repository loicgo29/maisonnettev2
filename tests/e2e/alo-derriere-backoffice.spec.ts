import { test, expect } from '@playwright/test';

/**
 * alo servi derrière l'authentification du backoffice.
 *
 * alo n'a aucune authentification propre : c'est Tailscale qui lui tenait lieu
 * de serrure, et l'exposer sans rien d'autre publierait la comptabilité
 * familiale. Ces tests vérifient la seule chose qui l'en empêche désormais —
 * le contrôle `forward_auth` de Caddy — et échouent si elle cède.
 */

// `maisonnette.localhost` et non `localhost` : le partage du jeton entre le
// backoffice et alo repose sur un cookie de domaine, que les navigateurs
// refusent d'attacher à `localhost` — c'est un domaine de premier niveau. Un
// nom à deux niveaux, lui, l'accepte, et tout ce qui finit par `.localhost`
// résout en 127.0.0.1 sans configuration.
const BASE = process.env.E2E_URL || 'http://maisonnette.localhost:8030';
const ALO = process.env.E2E_ALO_URL || 'http://alo.maisonnette.localhost:8030';

async function seConnecter(page: import('@playwright/test').Page) {
  await page.goto(`${BASE}/backoffice/login`);
  await page.fill('#username', 'admin');
  await page.fill('#pwd', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/backoffice/meals', { timeout: 15000 });
}

test.describe('alo derrière le backoffice', () => {
  test('sans session, alo est inaccessible et renvoie vers la connexion', async ({ page }) => {
    await page.goto(ALO);
    expect(page.url()).toContain('/backoffice/login');

    // La page d'alo ne doit pas avoir été servie au passage.
    const corps = (await page.textContent('body')) ?? '';
    expect(corps).toContain('Backoffice Login');
  });

  test("sans session, l'API d'alo est fermée elle aussi", async ({ page }) => {
    // Le garde-fou porterait mal son nom s'il ne protégeait que les pages :
    // /api/periods et /api/expenses exposent directement les données.
    //
    // La requête passe par le navigateur et non par le client HTTP de
    // Playwright : ce dernier s'appuie sur le résolveur de Node, qui ignore la
    // convention *.localhost — seul Chromium la résout.
    // Ce test ne se connecte pas : son contexte est donc vierge de session.
    await page.goto(`${ALO}/api/periods`);

    expect(page.url(), "l'API d'alo répond sans authentification").toContain(
      '/backoffice/login'
    );

    const corps = (await page.textContent('body')) ?? '';
    expect(corps, 'des données d’alo ont fuité').not.toContain('start_date');
    expect(corps, 'des données d’alo ont fuité').not.toContain('total_amount');
  });

  test('avec session, alo se rend sans erreur', async ({ page }) => {
    const erreursConsole: string[] = [];
    const echecsReseau: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') erreursConsole.push(m.text());
    });
    page.on('pageerror', (e) => erreursConsole.push(`pageerror: ${e.message}`));
    page.on('response', (r) => {
      if (r.status() >= 400) echecsReseau.push(`${r.status()} ${r.url()}`);
    });

    await seConnecter(page);
    await page.goto(ALO, { waitUntil: 'networkidle' });

    // Une réponse 200 ne prouve rien sur une application React : le serveur
    // sert l'enveloppe, le reste se joue dans le navigateur. On vérifie donc
    // que le conteneur applicatif a bien été peuplé.
    const contenu = await page.locator('#root').innerHTML();
    expect(contenu.length, 'alo sert une page blanche').toBeGreaterThan(100);

    expect(echecsReseau, "requêtes en échec dans alo").toEqual([]);
    expect(erreursConsole, 'erreurs console dans alo').toEqual([]);
  });

  test('le backoffice propose un lien vers alo', async ({ page }) => {
    await seConnecter(page);
    const lien = page.locator('nav a', { hasText: 'alo' });
    await expect(lien).toBeVisible();
    expect(await lien.getAttribute('href')).toContain('alo.');
  });

  test('la déconnexion referme aussi alo', async ({ page }) => {
    await seConnecter(page);
    await page.goto(`${BASE}/backoffice/logout`);
    await page.waitForURL('**/backoffice/login', { timeout: 15000 });

    // Le cookie porte un attribut Domain : effacé sans ce même attribut, il
    // survivrait et la déconnexion ne déconnecterait rien.
    await page.goto(ALO);
    expect(page.url(), 'alo reste accessible après déconnexion').toContain('/backoffice/login');
  });
});
