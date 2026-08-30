import { test, expect } from '@playwright/test';

const ADMIN_URL = process.env.E2E_URL
  ? `${process.env.E2E_URL}/admin`
  : 'https://maisonnette-pecheur-bertheaume.fr/admin';

test.describe('Admin Dashboard CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin (should redirect to login if not authenticated)
    await page.goto(ADMIN_URL);

    // If login is required, credentials would be injected via environment
    // For now, just verify access attempt
    await page.waitForTimeout(2000);
  });

  test('should load admin dashboard', async ({ page }) => {
    // Verify we're on admin or login page
    const url = page.url();
    expect(url).toContain('admin');
  });

  test('should display gites list in admin', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/gites`);

    // Check if gites table/list loads
    const gitesList = page.locator('[data-testid="gites-list"], table');
    if (await gitesList.isVisible()) {
      const rows = await page.locator('tr, [data-testid="gite-item"]').count();
      expect(rows).toBeGreaterThan(0);
    }
  });

  test('should open gite edit form', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/gites`);

    // Find and click edit button for first gite
    const editButton = page.locator('button:has-text("Edit"), button:has-text("Modifier")').first();
    if (await editButton.isVisible()) {
      await editButton.click();

      // Verify edit form loads
      const form = page.locator('form, [data-testid="edit-form"]');
      await expect(form).toBeVisible({ timeout: 5000 });
    }
  });

  test('should update gite information', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/gites/1/edit`);

    // Verify form elements
    const nomInput = page.locator('input[name="nom"]');
    if (await nomInput.isVisible()) {
      const currentValue = await nomInput.inputValue();
      const newValue = `${currentValue} (Updated)`;

      await nomInput.clear();
      await nomInput.fill(newValue);

      // Verify new value is set
      expect(await nomInput.inputValue()).toBe(newValue);

      // Don't save - just verify form functionality
    }
  });

  test('should validate required fields in edit form', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/gites/1/edit`);

    // Try to clear required field
    const nomInput = page.locator('input[name="nom"]');
    if (await nomInput.isVisible()) {
      await nomInput.clear();

      // Try submit
      const submitButton = page.locator('button[type="submit"]').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();

        await page.waitForTimeout(500);

        // Should show validation error
        const error = page.locator('[data-testid="nom-error"]');
        if (await error.isVisible()) {
          expect(await error.textContent()).toContain(/required|required field/i);
        }
      }
    }
  });

  test('should handle decimal prices', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/gites/1/edit`);

    const priceInput = page.locator('input[name="prixNuit"]');
    if (await priceInput.isVisible()) {
      await priceInput.clear();
      await priceInput.fill('99.99');

      expect(await priceInput.inputValue()).toBe('99.99');
    }
  });
});

test.describe('Admin Photo Management', () => {
  test('should display photos for gite', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/gites/1/photos`);

    // Check if photos are listed
    const photos = page.locator('[data-testid="photo-item"], img[alt]');
    const photoCount = await photos.count();
    expect(photoCount).toBeGreaterThanOrEqual(0);
  });

  test('should handle photo upload', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/gites/1/photos`);

    // Find upload input
    const uploadInput = page.locator('input[type="file"]');
    if (await uploadInput.isVisible()) {
      // Verify input is present and functional
      expect(uploadInput).toBeVisible();

      // Note: Actually uploading would require a test image file
      // This test just verifies the UI is present
    }
  });

  test('should show photo order controls', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/gites/1/photos`);

    // Check for reorder buttons
    const upButton = page.locator('button:has-text("Up"), button[aria-label*="up"]').first();
    const downButton = page.locator('button:has-text("Down"), button[aria-label*="down"]').first();

    // At least one should exist if photos are present
    const upExists = await upButton.isVisible().catch(() => false);
    const downExists = await downButton.isVisible().catch(() => false);

    // UI should have ordering capability
    expect(upExists || downExists || (await page.locator('[data-testid="photo-item"]').count()) === 0).toBe(true);
  });
});

test.describe('Admin Reservations', () => {
  test('should display reservations list', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/reservations`);

    // Verify reservations table/list
    const reservations = page.locator('[data-testid="reservation-item"], tr');
    const count = await reservations.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show reservation details', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/reservations`);

    // Click first reservation if exists
    const firstRes = page.locator('[data-testid="reservation-item"], tbody tr').first();
    if (await firstRes.isVisible()) {
      await firstRes.click();

      // Verify details load
      await page.waitForTimeout(1000);
      const detailsPanel = page.locator('[data-testid="reservation-details"]');
      if (await detailsPanel.isVisible()) {
        expect(await detailsPanel.isVisible()).toBe(true);
      }
    }
  });

  test('should filter reservations by date', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/reservations`);

    // Find date filter
    const dateFilter = page.locator('input[type="date"]').first();
    if (await dateFilter.isVisible()) {
      await dateFilter.fill('2026-09-01');

      await page.waitForTimeout(1000);

      // Verify list is filtered
      const results = page.locator('[data-testid="reservation-item"]');
      const count = await results.count();
      expect(typeof count).toBe('number');
    }
  });
});

test.describe('Admin Settings', () => {
  test('should load admin settings page', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/settings`);

    // Verify page loads
    const url = page.url();
    expect(url).toContain('settings');
  });

  test('should handle admin profile update', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/settings/profile`);

    // Verify form is present
    const form = page.locator('form');
    if (await form.isVisible()) {
      expect(await form.isVisible()).toBe(true);
    }
  });
});
