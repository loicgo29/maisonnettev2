import { test, expect, APIRequestContext } from '@playwright/test';

// Migré depuis alo/app/tests/test_api_bdd.py (pytest, requests, accès direct sans auth).
//
// Différences avec l'original :
// - alo est désormais servi derrière l'authentification du backoffice de
//   maisonnettev2 (voir tests/e2e/alo-derriere-backoffice.spec.ts) : on se
//   connecte d'abord au backoffice pour obtenir le cookie, puis on l'attache
//   à chaque requête vers alo.
// - La taxonomie de `category` a changé depuis l'écriture des tests
//   originaux : ce n'est plus alimentation/logement/transport/... mais le
//   mode de partage de la dépense — quotepart|50/50|dette|brico|virement|
//   trop_plein|regule_periode|divers (vérifié sur /openapi.json de l'image
//   en cours). Les tests d'origine testaient donc une API qui n'existe plus.
// - alo n'est pas déployé sur Hetzner (production) : la suite est skippée
//   proprement si le login backoffice ou la connexion à alo échouent, pour
//   ne jamais faire échouer la CI de prod.
//
// Non migré (voir rapport) : test_healthcheck.py (script manuel redondant),
// test_telegram_parser.py (composant non exposé par cette intégration),
// test_ui*.py (ciblent l'ancienne UI HTML statique, remplacée par le
// frontend React actuel — voir tests/alo-couche7.spec.ts pour le smoke test
// de la vraie UI).

const MAISONNETTE_URL = process.env.E2E_URL || 'http://maisonnette.localhost:8030';
const ALO_URL = process.env.E2E_ALO_URL || 'http://alo.maisonnette.localhost:8030';
const ADMIN_PWD = process.env.E2E_ADMIN_PWD || 'admin123';

// Node (contrairement à Chromium) ne résout pas *.localhost : on tape
// directement 127.0.0.1 et on fixe le Host attendu par Caddy pour router
// correctement. Les vraies URL de prod (https://...) passent inchangées.
function resolveLocal(rawUrl: string): { origin: string; host: string } {
  const u = new URL(rawUrl);
  if (u.hostname === 'localhost' || u.hostname.endsWith('.localhost')) {
    return { origin: `${u.protocol}//127.0.0.1:${u.port}`, host: u.host };
  }
  return { origin: u.origin, host: u.host };
}

const maisonnette = resolveLocal(MAISONNETTE_URL);
const aloTarget = resolveLocal(ALO_URL);

let cookieHeader: string | null = null;
let alojoignable = true;

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext();
  try {
    const loginResp = await request.post(`${maisonnette.origin}/api/backoffice/auth/login`, {
      headers: { Host: maisonnette.host },
      data: { username: 'admin', pwd: ADMIN_PWD },
      timeout: 10000,
    });
    if (!loginResp.ok()) {
      alojoignable = false;
      return;
    }
    const setCookie = loginResp.headers()['set-cookie'] || '';
    cookieHeader = setCookie.split(';')[0];

    const probe = await request.get(`${aloTarget.origin}/api/health`, {
      headers: { Host: aloTarget.host, Cookie: cookieHeader },
      timeout: 10000,
    });
    alojoignable = probe.ok();
  } catch {
    alojoignable = false;
  } finally {
    await request.dispose();
  }
});

test.describe('alo — workflow API (derrière le backoffice)', () => {
  test.beforeEach(() => {
    test.skip(!alojoignable, 'alo non joignable (login backoffice échoué, ou alo pas déployé ici)');
  });

  async function alo(request: APIRequestContext, method: 'get' | 'post' | 'put' | 'delete', path: string, data?: unknown) {
    return request[method](`${aloTarget.origin}${path}`, {
      headers: { Host: aloTarget.host, Cookie: cookieHeader! },
      data,
    });
  }

  test('health check', async ({ request }) => {
    const resp = await alo(request, 'get', '/api/health');
    expect(resp.status()).toBe(200);
    expect((await resp.json()).status).toBe('ok');
  });

  test('créer puis lister une dépense', async ({ request }) => {
    const create = await alo(request, 'post', '/api/expenses', {
      date: new Date().toISOString().slice(0, 10),
      label: 'Carrefour — test migration',
      amount: '32.50',
      category: 'divers',
    });
    expect(create.status()).toBe(201);
    const created = await create.json();
    expect(created.label).toBe('Carrefour — test migration');
    expect(created.status).toBe('draft');

    const list = await alo(request, 'get', '/api/expenses');
    expect(list.status()).toBe(200);
    const expenses = await list.json();
    expect(Array.isArray(expenses)).toBe(true);
    expect(expenses.length).toBeGreaterThan(0);
  });

  test('récupérer une dépense par id', async ({ request }) => {
    const create = await alo(request, 'post', '/api/expenses', {
      date: new Date().toISOString().slice(0, 10),
      label: 'Lidl — test migration',
      amount: '47.30',
      category: 'divers',
    });
    const { id } = await create.json();

    const get = await alo(request, 'get', `/api/expenses/${id}`);
    expect(get.status()).toBe(200);
    expect((await get.json()).id).toBe(id);
  });

  test('modifier une dépense en brouillon', async ({ request }) => {
    const create = await alo(request, 'post', '/api/expenses', {
      date: new Date().toISOString().slice(0, 10),
      label: 'Original — test migration',
      amount: '10.00',
      category: 'divers',
    });
    const { id } = await create.json();

    const update = await alo(request, 'put', `/api/expenses/${id}`, { label: 'Updated label' });
    expect(update.status()).toBe(200);
    expect((await update.json()).label).toBe('Updated label');
  });

  test('créer puis lister une période', async ({ request }) => {
    const create = await alo(request, 'post', '/api/periods', {
      name: 'Test migration — liste',
      start_date: '2026-05-01',
      end_date: '2026-05-31',
      notes: 'Créé par la suite migrée',
    });
    expect(create.status()).toBe(201);
    const period = await create.json();
    expect(period.status).toBe('draft');
    expect(period.name).toBe('Test migration — liste');

    const list = await alo(request, 'get', '/api/periods');
    expect(list.status()).toBe(200);
    expect(Array.isArray(await list.json())).toBe(true);
  });

  test('ajouter une dépense à une période et consulter le résumé', async ({ request }) => {
    const exp = await alo(request, 'post', '/api/expenses', {
      date: new Date().toISOString().slice(0, 10),
      label: 'Dépense pour période — test migration',
      amount: '25.00',
      category: 'divers',
    });
    const { id: expenseId } = await exp.json();

    const period = await alo(request, 'post', '/api/periods', {
      name: 'Test migration — résumé',
      start_date: '2026-05-01',
      end_date: '2026-05-31',
    });
    const { id: periodId } = await period.json();

    const add = await alo(request, 'post', `/api/periods/${periodId}/add-expense/${expenseId}`);
    expect(add.status()).toBe(200);

    const summary = await alo(request, 'get', `/api/periods/${periodId}/summary`);
    expect(summary.status()).toBe(200);
    const data = await summary.json();
    expect(data.id).toBe(periodId);
    expect(data).toHaveProperty('total_amount');
    expect(data).toHaveProperty('adulte1_total');
    expect(data).toHaveProperty('adulte2_total');
  });

  test('geler une période la rend immuable', async ({ request }) => {
    const exp = await alo(request, 'post', '/api/expenses', {
      date: new Date().toISOString().slice(0, 10),
      label: 'Dépense gelable — test migration',
      amount: '15.00',
      category: 'divers',
    });
    const { id: expenseId } = await exp.json();

    const period = await alo(request, 'post', '/api/periods', {
      name: 'Test migration — gel',
      start_date: '2026-05-01',
      end_date: '2026-05-31',
    });
    const { id: periodId } = await period.json();

    await alo(request, 'post', `/api/periods/${periodId}/add-expense/${expenseId}`);

    const freeze = await alo(request, 'post', `/api/periods/${periodId}/freeze`);
    expect(freeze.status()).toBe(200);
    expect((await freeze.json()).status).toBe('frozen');

    // Une dépense d'une période gelée ne doit plus être modifiable.
    const update = await alo(request, 'put', `/api/expenses/${expenseId}`, { label: 'Changed' });
    expect(update.status()).toBe(409);

    // Ni la période elle-même supprimable.
    const del = await alo(request, 'delete', `/api/periods/${periodId}`);
    expect(del.status()).toBe(409);
  });

  test('exporter une période gelée en Excel', async ({ request }) => {
    const exp = await alo(request, 'post', '/api/expenses', {
      date: new Date().toISOString().slice(0, 10),
      label: 'Export test migration',
      amount: '30.00',
      category: 'divers',
    });
    const { id: expenseId } = await exp.json();

    const period = await alo(request, 'post', '/api/periods', {
      name: 'Test migration — export',
      start_date: '2026-05-01',
      end_date: '2026-05-31',
    });
    const { id: periodId } = await period.json();

    await alo(request, 'post', `/api/periods/${periodId}/add-expense/${expenseId}`);
    await alo(request, 'post', `/api/periods/${periodId}/freeze`);

    const exportResp = await alo(request, 'get', `/api/exports/excel/${periodId}`);
    expect(exportResp.status()).toBe(200);
    expect(exportResp.headers()['content-type']).toContain('spreadsheetml');
  });

  test('recalculer la répartition d’une dépense', async ({ request }) => {
    const create = await alo(request, 'post', '/api/expenses', {
      date: new Date().toISOString().slice(0, 10),
      label: 'Recalc test migration',
      amount: '60.00',
      category: 'divers',
    });
    const { id } = await create.json();

    const recalc = await alo(request, 'post', `/api/expenses/${id}/recalculate`);
    expect(recalc.status()).toBe(200);
  });

  test('supprimer une dépense en brouillon', async ({ request }) => {
    const create = await alo(request, 'post', '/api/expenses', {
      date: new Date().toISOString().slice(0, 10),
      label: 'Deletable — test migration',
      amount: '5.00',
      category: 'divers',
    });
    const { id } = await create.json();

    const del = await alo(request, 'delete', `/api/expenses/${id}`);
    expect(del.status()).toBe(204);
  });

  test('supprimer une période vide en brouillon', async ({ request }) => {
    const create = await alo(request, 'post', '/api/periods', {
      name: 'Deletable — test migration',
      start_date: '2026-05-01',
      end_date: '2026-05-31',
    });
    const { id } = await create.json();

    const del = await alo(request, 'delete', `/api/periods/${id}`);
    expect(del.status()).toBe(204);
  });

  test('workflow complet : créer → ajouter → geler → exporter', async ({ request }) => {
    const ids: number[] = [];
    for (const [label, amount] of [
      ['Carrefour — workflow', '50.00'],
      ['Essence — workflow', '40.00'],
    ] as const) {
      const resp = await alo(request, 'post', '/api/expenses', {
        date: new Date().toISOString().slice(0, 10),
        label,
        amount,
        category: 'divers',
      });
      ids.push((await resp.json()).id);
    }

    const period = await alo(request, 'post', '/api/periods', {
      name: 'Workflow complet — test migration',
      start_date: '2026-05-01',
      end_date: '2026-05-31',
    });
    const { id: periodId } = await period.json();

    for (const expenseId of ids) {
      await alo(request, 'post', `/api/periods/${periodId}/add-expense/${expenseId}`);
    }

    const summary = await (await alo(request, 'get', `/api/periods/${periodId}/summary`)).json();
    expect(Number(summary.total_amount)).toBeGreaterThanOrEqual(90);

    const freeze = await alo(request, 'post', `/api/periods/${periodId}/freeze`);
    expect((await freeze.json()).status).toBe('frozen');

    const exportResp = await alo(request, 'get', `/api/exports/excel/${periodId}`);
    expect(exportResp.status()).toBe(200);
  });
});
