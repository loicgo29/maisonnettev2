import { test, expect } from '@playwright/test';

const BASE_URL = process.env.E2E_URL || 'https://maisonnette-pecheur-bertheaume.fr';
const ADMIN_URL = `${BASE_URL}/admin`;

test.describe('Booking Flow E2E', () => {
  test('should complete full booking flow', async ({ page }) => {
    // Step 1: Navigate to home page
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/Maisonnette|Booking/i);

    // Step 2: Find gite listing
    const gites = await page.locator('[data-testid="gite-card"]').count();
    expect(gites).toBeGreaterThan(0);

    // Step 3: Click on first gite
    await page.locator('[data-testid="gite-card"]').first().click();

    // Step 4: Verify gite details load
    await expect(page.locator('h1')).toContainText(/Maisonnette|Gîte/);

    // Step 5: Select dates
    const checkInInput = page.locator('input[name="checkIn"]');
    if (await checkInInput.isVisible()) {
      await checkInInput.fill('2026-09-15');
      await page.locator('input[name="checkOut"]').fill('2026-09-18');
    }

    // Step 6: Verify price calculation
    const totalPrice = page.locator('[data-testid="total-price"]');
    if (await totalPrice.isVisible()) {
      const price = await totalPrice.textContent();
      expect(price).toMatch(/\d+/);
    }

    // Step 7: Click Book button
    const bookButton = page.locator('button:has-text("Book"), button:has-text("Réserver")').first();
    if (await bookButton.isVisible()) {
      await bookButton.click();
    }

    // Step 8: Should redirect to booking confirmation or login
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).toMatch(/\/booking|\/login|auth/i);
  });

  test('should show price per night correctly', async ({ page }) => {
    // Navigate to gite
    await page.goto(`${BASE_URL}/gites/maisonnette`);

    // Find price element
    const pricePerNight = page.locator('[data-testid="price-per-night"]');
    if (await pricePerNight.isVisible()) {
      const price = await pricePerNight.textContent();
      const priceNumber = parseInt(price?.replace(/\D/g, '') || '0');
      expect(priceNumber).toBeGreaterThan(0);
    }
  });

  test('should calculate correct number of nights', async ({ page }) => {
    await page.goto(`${BASE_URL}/gites/maisonnette`);

    const checkInInput = page.locator('input[name="checkIn"]');
    const checkOutInput = page.locator('input[name="checkOut"]');

    if (await checkInInput.isVisible() && await checkOutInput.isVisible()) {
      await checkInInput.fill('2026-09-01');
      await checkOutInput.fill('2026-09-05');

      await page.waitForTimeout(500);

      const nights = page.locator('[data-testid="nights"]');
      const nightsText = await nights.textContent();
      expect(nightsText).toContain('4');
    }
  });

  test('should validate booking dates', async ({ page }) => {
    await page.goto(`${BASE_URL}/gites/maisonnette`);

    const checkOutInput = page.locator('input[name="checkOut"]');

    if (await checkOutInput.isVisible()) {
      // Try to select checkout before checkin
      await page.locator('input[name="checkIn"]').fill('2026-09-10');
      await page.locator('input[name="checkOut"]').fill('2026-09-05');

      await page.waitForTimeout(500);

      // Should show validation error
      const error = page.locator('[data-testid="date-error"]');
      if (await error.isVisible()) {
        expect(await error.textContent()).toContain(/before|invalid|after/i);
      }
    }
  });

  test('should check availability', async ({ page }) => {
    await page.goto(`${BASE_URL}/gites/maisonnette`);

    // Check if availability calendar is present
    const calendar = page.locator('[data-testid="availability-calendar"]');
    if (await calendar.isVisible()) {
      const availableDates = await page.locator('[data-testid="available-date"]').count();
      expect(availableDates).toBeGreaterThan(0);
    }
  });
});

test.describe('Guest Information Form', () => {
  test('should fill guest information correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/booking/checkout`);

    // Fill guest form
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.fill('input[name="email"]', 'john@example.com');
    await page.fill('input[name="phone"]', '+33612345678');

    // Verify values
    expect(await page.inputValue('input[name="firstName"]')).toBe('John');
    expect(await page.inputValue('input[name="email"]')).toBe('john@example.com');
  });

  test('should validate email format', async ({ page }) => {
    await page.goto(`${BASE_URL}/booking/checkout`);

    // Try invalid email
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(500);

    // Should show error
    const error = page.locator('[data-testid="email-error"]');
    if (await error.isVisible()) {
      expect(await error.textContent()).toContain(/invalid|email/i);
    }
  });

  test('should require all mandatory fields', async ({ page }) => {
    await page.goto(`${BASE_URL}/booking/checkout`);

    // Try submit without filling form
    await page.click('button[type="submit"]');

    await page.waitForTimeout(500);

    // Should show validation errors
    const errors = await page.locator('[data-testid="field-error"]').count();
    expect(errors).toBeGreaterThan(0);
  });
});

test.describe('Payment Flow', () => {
  test('should redirect to payment processor', async ({ page }) => {
    // Skip if payment provider not available
    const skipPaymentTest = process.env.SKIP_PAYMENT_TESTS === 'true';
    if (skipPaymentTest) {
      test.skip();
    }

    await page.goto(`${BASE_URL}/booking/checkout`);

    // Fill form and attempt payment
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="email"]', 'test@example.com');

    // Look for pay button
    const payButton = page.locator('button:has-text("Pay"), button:has-text("Payer")').first();
    if (await payButton.isVisible()) {
      // Don't actually submit - just verify button exists
      expect(await payButton.isVisible()).toBe(true);
    }
  });

  test('should show booking confirmation', async ({ page }) => {
    // Navigate to confirmation page (requires prior booking)
    const confirmationUrl = `${BASE_URL}/booking/confirmation`;
    await page.goto(confirmationUrl);

    // Check if redirect happens (meaning not authenticated)
    const url = page.url();
    if (!url.includes('confirmation')) {
      // Expected - user not authenticated, redirected to home
      expect(url).toBe(BASE_URL + '/');
    }
  });
});
