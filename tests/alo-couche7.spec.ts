import { test, expect } from '@playwright/test';

// Vérification de la couche applicative, pas du transport.
//
// Un `curl` renvoyant 200 ne prouve rien sur une application React : le serveur
// sert l'enveloppe HTML, et tout le reste — appels d'API, rendu, données —
// se produit dans le navigateur. Après la bascule d'alo de SQLite vers
// PostgreSQL (2026-08-29), toutes les URL répondaient 200 alors que
// l'application était signalée en panne.

const BASE = process.env.ALO_URL || 'http://localhost:8022';

test.describe('alo — couche applicative', () => {
  test("la page se rend et n'émet aucune erreur", async ({ page }) => {
    const erreursConsole: string[] = [];
    const requetesEchouees: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') erreursConsole.push(msg.text());
    });
    page.on('pageerror', (err) => erreursConsole.push(`pageerror: ${err.message}`));
    page.on('response', (res) => {
      if (res.status() >= 400) requetesEchouees.push(`${res.status()} ${res.url()}`);
    });

    await page.goto(BASE, { waitUntil: 'networkidle' });

    // Le conteneur React doit contenir quelque chose : une page blanche est le
    // symptôme classique d'un plantage au montage, invisible en HTTP.
    const contenu = await page.locator('#root').innerHTML();
    expect(contenu.length, 'le conteneur #root est vide — rendu React échoué').toBeGreaterThan(100);

    expect(requetesEchouees, 'requêtes en échec').toEqual([]);
    expect(erreursConsole, 'erreurs console').toEqual([]);
  });

  test('les données remontent depuis PostgreSQL', async ({ page }) => {
    const apiOk: string[] = [];
    page.on('response', (res) => {
      if (res.url().includes('/api/') && res.status() === 200) {
        apiOk.push(new URL(res.url()).pathname);
      }
    });

    await page.goto(BASE, { waitUntil: 'networkidle' });

    // L'accueil interroge /api/periods et /api/reequilibrage — pas
    // /api/expenses, qui n'est appelé que sur la page dédiée.
    expect(apiOk, "aucun appel d'API n'a abouti").not.toEqual([]);

    // Le rééquilibrage affiche des montants calculés à partir des dépenses :
    // leur présence prouve que la chaîne complète fonctionne, du schéma
    // PostgreSQL jusqu'au rendu.
    const texte = await page.locator('body').innerText();
    expect(texte, 'aucun montant affiché — données absentes').toMatch(/\d+[.,]\d{2}\s*€/);
  });

  test('la navigation principale répond', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });

    // La navigation d'alo utilise des boutons, pas des liens.
    const boutons = page.getByRole('button');
    expect(await boutons.count(), 'aucun bouton de navigation').toBeGreaterThan(0);

    for (const libelle of ['Dépenses', 'Périodes', 'Rééquilibrage']) {
      await expect(
        page.getByRole('button', { name: new RegExp(libelle) }),
        `onglet « ${libelle} » absent`
      ).toBeVisible();
    }
  });
});
