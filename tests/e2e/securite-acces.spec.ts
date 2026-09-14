import { test, expect } from '@playwright/test';

/**
 * Contrôles d'accès aux API protégées par le backend.
 *
 * Chaque cas correspond à une recommandation de l'OWASP WSTG. Ils échouent si
 * un durcissement acquis est relâché — ce qui, sur ces sujets, ne se voit
 * jamais à l'usage : l'application continue de fonctionner exactement pareil.
 *
 * Retiré le 2026-09-14 : les tests portant sur le cookie de session
 * `backoffice_token` et sur la fermeture d'alo via forward_auth — les deux
 * mécanismes ont été supprimés (auth classique remplacée par Keycloak sur
 * /admin, alo servi sans garde sous /admin/alo). Voir shared/routing-caddy.md.
 */

const API = process.env.E2E_API_URL || 'http://localhost:3001';

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
