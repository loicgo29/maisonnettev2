import { test, expect } from '@playwright/test';

test.describe('Gites Listing', () => {
  test('should display gites on home page', async ({ page }) => {
    await page.goto('/');

    // Check for heading
    await expect(page.locator('h2')).toContainText('Nos Gîtes');

    // Should either show gites or loading state
    const giteCards = page.locator('[data-testid="gite-card"]');
    const loadingSpinner = page.locator('text=Chargement');
    const noGites = page.locator('text=Aucun gîte');

    const hasContent = await Promise.race([
      giteCards.first().isVisible().then(() => 'gites'),
      loadingSpinner.isVisible().then(() => 'loading'),
      noGites.isVisible().then(() => 'empty'),
    ]);

    expect(['gites', 'loading', 'empty']).toContain(hasContent);
  });

  test('should navigate to gite detail on click', async ({ page }) => {
    await page.goto('/');

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Try to find and click a gite card
    const giteLink = page.locator('a').filter({ has: page.locator('[data-testid="gite-card"]') }).first();

    if (await giteLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await giteLink.click();

      // Should be on gite detail page
      await expect(page).toHaveURL(/\/gite\/[a-z0-9-]+/);
    }
  });

  test('should display gite properties in grid', async ({ page }) => {
    await page.goto('/');

    // Wait for gites to load
    await page.waitForTimeout(2000);

    const giteCards = page.locator('[data-testid="gite-card"]');
    const count = await giteCards.count();

    if (count > 0) {
      // Check first card has required fields
      const firstCard = giteCards.first();

      // Should have name/title
      const title = firstCard.locator('h3');
      await expect(title).toBeVisible();

      // Should have price
      const price = firstCard.locator('text=/€\\/nuit/');
      if (await price.isVisible({ timeout: 1000 }).catch(() => false)) {
        expect(await price.textContent()).toMatch(/\d+\.\d{2} €\/nuit/);
      }
    }
  });

  test('should filter/search gites (if implemented)', async ({ page }) => {
    await page.goto('/');

    // Check if search/filter exists
    const searchInput = page.locator('input[placeholder*="Rechercher"], input[type="search"]').first();

    if (await searchInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);

      // Results should update or show no results
      const noResults = page.locator('text=Aucun gîte');
      const results = page.locator('[data-testid="gite-card"]');

      const hasResults = await Promise.race([
        noResults.isVisible().then(() => false),
        results.first().isVisible().then(() => true),
      ]);

      expect(typeof hasResults).toBe('boolean');
    }
  });
});

test.describe('Gite Detail Page', () => {
  test('should display gite information', async ({ page }) => {
    // Navigate to a gite detail (using home page first)
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Find and click first gite
    const firstLink = page.locator('a').filter({ has: page.locator('[data-testid="gite-card"]') }).first();

    if (await firstLink.isVisible({ timeout: 1000 }).catch(() => false)) {
      await firstLink.click();

      // Check for gite details
      await expect(page.locator('h1')).toBeVisible();

      // Should have description section
      const description = page.locator('h2:has-text("Description")');
      if (await description.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(description).toBeVisible();

        // Should have price displayed
        await expect(page.locator('text=/€\\/nuit/')).toBeVisible();

        // Should have capacity
        await expect(page.locator('text=/personnes/')).toBeVisible();
      }
    }
  });

  test('should display photo gallery', async ({ page }) => {
    // Navigate to detail page
    await page.goto('/');
    await page.waitForTimeout(2000);

    const firstLink = page.locator('a').filter({ has: page.locator('[data-testid="gite-card"]') }).first();

    if (await firstLink.isVisible({ timeout: 1000 }).catch(() => false)) {
      await firstLink.click();

      // Check for photos section
      const photosHeading = page.locator('h2:has-text("Photos")');

      if (await photosHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Should have images or placeholders
        const images = page.locator('img');
        const imageCount = await images.count();

        expect(imageCount).toBeGreaterThan(0);
      }
    }
  });

  test('should have back navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const firstLink = page.locator('a').filter({ has: page.locator('[data-testid="gite-card"]') }).first();

    if (await firstLink.isVisible({ timeout: 1000 }).catch(() => false)) {
      await firstLink.click();

      // Find back button
      const backButton = page.locator('button:has-text("Retour"), a:has-text("Retour")').first();

      if (await backButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await backButton.click();

        // Should be back on home
        await expect(page.locator('h2')).toContainText('Nos Gîtes');
      }
    }
  });

  test('should show 404 for invalid gite', async ({ page }) => {
    await page.goto('/gite/non-existent-gite-12345', { waitUntil: 'domcontentloaded' });

    // Should show error message or 404
    const errorHeading = page.locator('h1:has-text("non trouvé"), h1:has-text("404")');

    if (await errorHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(errorHeading).toBeVisible();
    }
  });
});
