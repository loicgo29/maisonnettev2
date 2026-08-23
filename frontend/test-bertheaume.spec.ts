import { test, expect } from '@playwright/test';

test('Bertheaume gite page loads with photos', async ({ page }) => {
  await page.goto('http://localhost:1234/gite/bertheaume');

  // Attendre le chargement du contenu
  await page.waitForLoadState('networkidle');

  // Vérifier le titre
  const title = page.locator('h1');
  await expect(title).toContainText('Maisonnette de Bertheaume');

  // Vérifier l'adresse
  await expect(page.locator('text=Bretagne')).toBeVisible();

  // Vérifier qu'il y a des photos
  const images = page.locator('img[src*="/uploads/gites/bertheaume/"]');
  const count = await images.count();
  console.log(`✅ Photos trouvées: ${count}`);
  expect(count).toBeGreaterThan(0);

  // Vérifier le prix
  await expect(page.locator('text=€/nuit')).toBeVisible();

  console.log('✅ Page complète et fonctionnelle');
});
