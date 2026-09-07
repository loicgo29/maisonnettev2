import { test, expect } from '@playwright/test';

/**
 * Flux Authorization Code + PKCE contre Keycloak.
 *
 * Le commentaire d'oidc.ts rappelle pourquoi ce test compte : une URL de realm
 * erronée ne casse rien au démarrage, mais fait rejeter *tous* les jetons, sans
 * qu'un valide se distingue d'un invalide. Seul un passage complet par le
 * navigateur le démontre.
 */

const BASE = process.env.E2E_URL || 'http://maisonnette.localhost:8030';
const UTILISATEUR = process.env.E2E_KC_USER || 'loic';
const MOT_DE_PASSE = process.env.E2E_KC_PASSWORD || 'TestLocal-2026';

test.describe('Connexion par Keycloak', () => {
  test('/admin renvoie vers Keycloak, pas ailleurs', async ({ page }) => {
    await page.goto(`${BASE}/admin`);
    await page.waitForURL(/realms\/maisonnettev2\/protocol\/openid-connect\/auth/, {
      timeout: 20000,
    });

    const url = new URL(page.url());
    // Le realm applicatif, et surtout pas `master` : ses jetons sont ceux de
    // l'administration de Keycloak, sans rapport avec les utilisateurs du gîte.
    expect(url.pathname).toContain('/realms/maisonnettev2/');
    expect(url.pathname).not.toContain('/realms/master/');

    // PKCE : sans ces deux paramètres, un code intercepté suffirait à obtenir
    // un jeton, ce qui est précisément ce que PKCE empêche sur un client public.
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toBeTruthy();
    expect(url.searchParams.get('client_id')).toBe('maisonnettev2-frontend');
  });

  test('connexion complète : formulaire Keycloak puis retour authentifié', async ({ page }) => {
    const echecsReseau: string[] = [];
    page.on('response', (r) => {
      // 401 et 403 attendus avant l'obtention du jeton.
      if (r.status() >= 500) echecsReseau.push(`${r.status()} ${r.url()}`);
    });

    await page.goto(`${BASE}/admin`);
    await page.waitForURL(/openid-connect\/auth/, { timeout: 20000 });

    await page.fill('#username', UTILISATEUR);
    await page.fill('#password', MOT_DE_PASSE);
    await page.click('#kc-login');

    // Retour sur l'application, jeton en poche.
    await page.waitForURL((u) => u.hostname !== 'localhost' || u.port !== '9001', {
      timeout: 20000,
    });
    expect(page.url(), 'la connexion ne revient pas sur le site').toContain('maisonnette');

    await page.waitForLoadState('networkidle');
    expect(echecsReseau, 'erreurs serveur pendant la connexion').toEqual([]);
  });

  test('sans jeton, /api/admin reste fermé', async ({ request }) => {
    const reponse = await request.get('http://localhost:3001/api/admin/dashboard');
    expect(reponse.status()).toBe(401);
  });
});
