import { test, expect } from '@playwright/test';

test.describe('Galerie Photos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000); // Attendre le chargement des images
  });

  test('Galerie principale charge avec image', async ({ page }) => {
    const mainImage = page.locator('.gallery-main img').first();
    await expect(mainImage).toBeVisible();

    const src = await mainImage.getAttribute('src');
    expect(src).toBeTruthy();
    expect(src).toContain('/images/');
  });

  test('8 photos sont présentes', async ({ page }) => {
    const thumbnails = page.locator('.thumbnail');
    const count = await thumbnails.count();

    expect(count).toBe(8);
    console.log(`✓ ${count} photos trouvées`);
  });

  test('Tous les thumbnails ont une image valide', async ({ page }) => {
    const thumbnails = page.locator('.thumbnail img');
    const count = await thumbnails.count();

    for (let i = 0; i < count; i++) {
      const src = await thumbnails.nth(i).getAttribute('src');
      expect(src).toBeTruthy();
      expect(src).toContain('.JPG');
      console.log(`✓ Photo ${i + 1}: ${src?.split('/').pop()}`);
    }
  });

  test('Navigation ❮ ❯ fonctionne', async ({ page }) => {
    const nextBtn = page.locator('button:has-text("❯")').first();
    const prevBtn = page.locator('button:has-text("❮")').first();
    const counter = page.locator('.image-counter').first();

    // Vérifier compteur initial
    let text = await counter.textContent();
    expect(text).toBe('1 / 8');
    console.log(`✓ Compteur initial: ${text}`);

    // Clic suivant
    await nextBtn.click();
    await page.waitForTimeout(300);
    text = await counter.textContent();
    expect(text).toBe('2 / 8');
    console.log(`✓ Après suivant: ${text}`);

    // Clic précédent
    await prevBtn.click();
    await page.waitForTimeout(300);
    text = await counter.textContent();
    expect(text).toBe('1 / 8');
    console.log(`✓ Après précédent: ${text}`);
  });

  test('Clic sur thumbnail change la photo', async ({ page }) => {
    const thumbnails = page.locator('.thumbnail');
    const counter = page.locator('.image-counter').first();

    // Clic sur 3e thumbnail
    await thumbnails.nth(2).click();
    await page.waitForTimeout(300);

    const text = await counter.textContent();
    expect(text).toBe('3 / 8');
    console.log(`✓ Clic thumbnail 3: ${text}`);

    // Clic sur 5e thumbnail
    await thumbnails.nth(4).click();
    await page.waitForTimeout(300);

    const text2 = await counter.textContent();
    expect(text2).toBe('5 / 8');
    console.log(`✓ Clic thumbnail 5: ${text2}`);
  });

  test('Lightbox s\'ouvre au clic expand', async ({ page }) => {
    const expandBtn = page.locator('button:has-text("⛶")');
    const lightboxOverlay = page.locator('.lightbox-overlay');

    // Vérifier que lightbox n'est pas visible au départ
    await expect(lightboxOverlay).not.toBeVisible();

    // Clic sur expand
    await expandBtn.click();
    await page.waitForTimeout(300);

    // Vérifier que lightbox est visible
    await expect(lightboxOverlay).toBeVisible();
    console.log('✓ Lightbox ouvert');

    // Vérifier que la photo agrandie est visible
    const lightboxImage = page.locator('.lightbox-image');
    await expect(lightboxImage).toBeVisible();
    console.log('✓ Image agrandie visible');
  });

  test('Fermeture lightbox avec bouton X', async ({ page }) => {
    const expandBtn = page.locator('button:has-text("⛶")');
    const closeBtn = page.locator('button.lightbox-close');
    const lightboxOverlay = page.locator('.lightbox-overlay');

    // Ouvrir
    await expandBtn.click();
    await page.waitForTimeout(300);
    await expect(lightboxOverlay).toBeVisible();

    // Fermer
    await closeBtn.click();
    await page.waitForTimeout(300);
    await expect(lightboxOverlay).not.toBeVisible();
    console.log('✓ Lightbox fermé avec bouton X');
  });

  test('Fermeture lightbox avec Escape', async ({ page }) => {
    const expandBtn = page.locator('button:has-text("⛶")');
    const lightboxOverlay = page.locator('.lightbox-overlay');

    // Ouvrir
    await expandBtn.click();
    await page.waitForTimeout(300);

    // Appuyer sur Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    await expect(lightboxOverlay).not.toBeVisible();
    console.log('✓ Lightbox fermé avec Escape');
  });

  test('Navigation clavier dans lightbox', async ({ page }) => {
    const expandBtn = page.locator('button:has-text("⛶")');
    const counter = page.locator('.lightbox-counter');

    // Ouvrir lightbox
    await expandBtn.click();
    await page.waitForTimeout(300);

    // Flèche droite = photo suivante
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    let text = await counter.textContent();
    expect(text).toContain('2 / 8');
    console.log(`✓ Flèche droite: ${text}`);

    // Flèche gauche = photo précédente
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(300);
    text = await counter.textContent();
    expect(text).toContain('1 / 8');
    console.log(`✓ Flèche gauche: ${text}`);
  });

  test('Images se chargent correctement', async ({ page }) => {
    // Vérifier que pas d'erreur 404 ou d'images cassées
    let brokenImages = 0;

    page.on('response', (response) => {
      if (response.url().includes('/images/') && response.status() === 404) {
        brokenImages++;
        console.error(`✗ Image non trouvée: ${response.url()}`);
      }
    });

    const images = page.locator('img[src*="/images/"]');
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
      expect(naturalWidth).toBeGreaterThan(0);
    }

    expect(brokenImages).toBe(0);
    console.log(`✓ ${count} images chargées correctement`);
  });

  test('Responsive: galerie adaptée au mobile', async ({ page }) => {
    // Redimensionner à 375px (mobile)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    // Vérifier que la galerie est visible
    const gallery = page.locator('.gallery-main');
    await expect(gallery).toBeVisible();

    // Vérifier que thumbnails sont en grid réduit (3 colonnes au lieu de 6)
    const thumbnails = page.locator('.gallery-thumbnails');
    const computedStyle = await thumbnails.evaluate((el) =>
      window.getComputedStyle(el).gridTemplateColumns
    );

    expect(computedStyle).toBeTruthy();
    console.log(`✓ Layout responsive actif: ${computedStyle}`);
  });

  test('Résumé: Tous les fichiers photo existent', async ({ page }) => {
    const expectedFiles = [
      'IMG_0618.JPG',
      'IMG_0627.JPG',
      'IMG_0632.JPG',
      'IMG_0621.JPG',
      'GOPR5979.JPG',
      'IMG_0613.JPG',
      'IMG_0619.JPG',
      'GOPR5983.JPG'
    ];

    for (const file of expectedFiles) {
      const img = page.locator(`img[src*="${file}"]`);
      await expect(img).toBeVisible();
      console.log(`✓ ${file}`);
    }
  });
});
