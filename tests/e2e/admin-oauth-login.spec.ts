import { test, expect, Page } from '@playwright/test';

const ADMIN_URL = 'http://localhost:8030/admin';
const AUTH_URL = 'https://auth.maisonnette-pecheur-bertheaume.fr';

test.describe('Admin OAuth2 Login Flow', () => {
  test('should redirect unauthenticated user to Authentik', async ({ page }) => {
    await page.goto(ADMIN_URL);

    // Vérifie que la page a redirigé vers Authentik
    await expect(page).toHaveURL(/auth\.maisonnette-pecheur-bertheaume\.fr/);
    await expect(page.locator('text=Sign in')).toBeVisible();
  });

  test('should store token in sessionStorage after successful login', async ({ page, context }) => {
    await page.goto(ADMIN_URL);

    // Simuler la soumission du formulaire de connexion Authentik
    await page.fill('input[name="username"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'test-password');
    await page.click('button:has-text("Sign In")');

    // Attendre la redirection du callback
    await page.waitForURL(/\/admin\/callback/);

    // Vérifier que le token est stocké en sessionStorage
    const token = await page.evaluate(() => {
      return sessionStorage.getItem('admin_jeton_acces');
    });
    expect(token).toBeTruthy();
    expect(token).toMatch(/^ey/); // JWT commence par "ey"
  });

  test('should access dashboard after login', async ({ page, context }) => {
    // Pré-remplir le token en sessionStorage
    await page.goto(ADMIN_URL);
    await page.evaluate(() => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkbWluIFVzZXIiLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsiYWRtaW4iXX19.signature';
      sessionStorage.setItem('admin_jeton_acces', mockToken);
    });

    await page.reload();

    // Vérifier que le dashboard charge
    await expect(page.locator('h1:has-text("Tableau de bord")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Accès refusé')).not.toBeVisible();
  });

  test('should display 401 if token is invalid', async ({ page }) => {
    await page.goto(ADMIN_URL);

    // Stocker un token invalide
    await page.evaluate(() => {
      sessionStorage.setItem('admin_jeton_acces', 'invalid-token');
    });

    await page.reload();

    // Doit afficher 401 ou rediriger vers connexion
    const hasError = await page.locator('text=Accès refusé').isVisible();
    const hasLoginRedirect = page.url().includes('auth.maisonnette-pecheur-bertheaume.fr');

    expect(hasError || hasLoginRedirect).toBeTruthy();
  });

  test('should clear sessionStorage on logout', async ({ page }) => {
    // Pré-login
    await page.goto(ADMIN_URL);
    await page.evaluate(() => {
      sessionStorage.setItem('admin_jeton_acces', 'test-token');
    });

    // Cliquer sur "Se déconnecter"
    await page.click('button:has-text("Se déconnecter")');

    // Attendre redirection vers Authentik logout
    await page.waitForURL(/auth\.maisonnette-pecheur-bertheaume\.fr.*logout/);

    // Vérifier que le token est supprimé
    const token = await page.evaluate(() => {
      return sessionStorage.getItem('admin_jeton_acces');
    });
    expect(token).toBeNull();
  });
});
