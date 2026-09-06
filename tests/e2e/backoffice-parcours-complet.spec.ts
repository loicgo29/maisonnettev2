import { test, expect } from '@playwright/test';

/**
 * Parcours navigateur réel : login → meals → saisie → logout.
 * Les tests curl valident l'API ; celui-ci valide ce que l'utilisateur vit.
 */
test.describe('Parcours backoffice complet', () => {
  test('login → redirection meals → contenu chargé', async ({ page }) => {
    const erreursConsole: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') erreursConsole.push(m.text());
    });
    const echecsReseau: string[] = [];
    page.on('response', (r) => {
      if (r.status() >= 400) echecsReseau.push(`${r.status()} ${r.url()}`);
    });

    await page.goto('/backoffice/login');
    await expect(page.locator('h1')).toContainText('Backoffice Login');

    await page.fill('#username', 'admin');
    await page.fill('#pwd', 'admin123');
    await page.click('button[type="submit"]');

    // Le login doit mener à /backoffice/meals, pas rester sur le formulaire.
    await page.waitForURL('**/backoffice/meals', { timeout: 15000 });

    // Aucun message d'erreur affiché à l'écran.
    const erreurVisible = await page
      .locator('.error-message')
      .isVisible()
      .catch(() => false);
    expect(erreurVisible, 'un message d’erreur est affiché après login').toBe(false);

    // La page meals a effectivement du contenu.
    await page.waitForLoadState('networkidle');
    const texte = (await page.textContent('body')) ?? '';
    expect(texte.length, 'page meals vide').toBeGreaterThan(100);

    console.log('--- Erreurs console:', JSON.stringify(erreursConsole));
    console.log('--- Réponses >=400:', JSON.stringify(echecsReseau));
    console.log('--- Extrait page meals:', texte.replace(/\s+/g, ' ').slice(0, 300));

    expect(echecsReseau, 'requêtes en échec pendant le parcours').toEqual([]);
  });

  test('le cookie de session est bien posé', async ({ page, context }) => {
    await page.goto('/backoffice/login');
    await page.fill('#username', 'admin');
    await page.fill('#pwd', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/backoffice/meals', { timeout: 15000 });

    const cookies = await context.cookies();
    const jeton = cookies.find((c) => c.name === 'backoffice_token');
    expect(jeton, 'cookie backoffice_token absent').toBeTruthy();
    expect(jeton!.value.startsWith('eyJ'), 'le cookie ne contient pas un JWT').toBe(true);
  });

  test('mauvais identifiants : message d’erreur, pas de redirection', async ({ page }) => {
    await page.goto('/backoffice/login');
    await page.fill('#username', 'admin');
    await page.fill('#pwd', 'mauvaispwd');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error-message')).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain('/backoffice/login');
  });
});
