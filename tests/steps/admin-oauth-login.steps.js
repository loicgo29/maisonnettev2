import { Given, When, Then, Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium, expect } from '@playwright/test';

// Défaut Cucumber (5000ms) trop court pour un vrai aller-retour navigateur.
// `setDefaultTimeout` est global à tout le run (l'API Cucumber ne permet pas
// de le scoper par tag), mais ne fait que relever le plafond : les steps déjà
// rapides des autres suites ne sont pas ralentis.
setDefaultTimeout(20000);

let page;
let browser;

const ADMIN_URL = 'http://localhost:8030/admin';
// Keycloak de test éphémère (docker-compose.test.yml), jamais la production —
// voir infra/keycloak/realm-test.json. Port 8081 : celui publié pour que le
// navigateur (Playwright ou réel) atteigne Keycloak directement, distinct du
// nom de service Docker interne qu'utilise le backend pour le JWKS.
const AUTH_URL = 'http://localhost:8081';
const AUTH_HOST_PATTERN = /localhost:8081/;

// Compte technique du realm de test (voir infra/keycloak/realm-test.json) —
// jamais un compte personnel. Ce realm est entièrement éphémère et recréé à
// chaque `docker compose up`, ce mot de passe n'a donc aucune valeur à
// protéger : il n'existe qu'à l'intérieur d'un conteneur jetable.
const KC_USER = 'ci-tests';
const KC_PASSWORD = 'CiTestsMaisonnette2026';

// Ce projet n'a pas de World Cucumber partagé qui fournirait `this.page` :
// la suite reste indépendante des autres fichiers *.steps.js en gérant son
// propre navigateur, taggé @oauth-admin pour ne lancer Chromium que sur ce
// feature et laisser les autres suites (health-check, gallery, …) intactes.
Before({ tags: '@oauth-admin' }, async function () {
  browser = await chromium.launch();
  page = await browser.newPage();
});

After({ tags: '@oauth-admin' }, async function () {
  await browser?.close();
});

async function seLogSurKeycloak() {
  await page.fill('input[name="username"]', KC_USER);
  await page.fill('input[name="password"]', KC_PASSWORD);
  await page.click('button:has-text("Sign In"), input[type="submit"]');
}

// Given steps
Given('the admin dashboard is available at the admin path', async function () {
  const response = await fetch(ADMIN_URL);
  expect([200, 302]).toContain(response.status); // 302 OK (redirect)
});

Given('the test Keycloak is running', async function () {
  const response = await fetch(AUTH_URL);
  expect(response.ok).toBeTruthy();
});

Given('I am on the Keycloak login page', async function () {
  await page.goto(ADMIN_URL);
  await page.waitForURL(AUTH_HOST_PATTERN);
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
});

Given('I have an invalid token in sessionStorage', async function () {
  await page.goto(ADMIN_URL);
  await page.evaluate(() => {
    sessionStorage.setItem('admin_jeton_acces', 'invalid-token-xyz');
  });
});

Given('I am logged in with a valid token', async function () {
  await page.goto(ADMIN_URL);
  await page.waitForURL(AUTH_HOST_PATTERN);
  await seLogSurKeycloak();
  await page.waitForURL(/\/admin(\/callback)?/, { timeout: 15000 });
  await page.waitForSelector('h1:has-text("Tableau de bord")', { timeout: 8000 }).catch(() => {});
});

Given('my token has expired', async function () {
  await page.goto(ADMIN_URL);
  // Token expiré (exp: 0)
  const expiredToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MH0.signature';
  await page.evaluate((token) => {
    sessionStorage.setItem('admin_jeton_acces', token);
  }, expiredToken);
});

// When steps
When('I navigate to the admin dashboard', async function () {
  await page.goto(ADMIN_URL);
});

When('I enter valid credentials', async function () {
  await page.fill('input[name="username"]', KC_USER);
  await page.fill('input[name="password"]', KC_PASSWORD);
});

When('I submit the login form', async function () {
  await page.click('button:has-text("Sign In"), input[type="submit"]');
});

When('I reload the page', async function () {
  await page.reload();
});

When('I click the {string} button', async function (buttonText) {
  await page.click(`button:has-text("${buttonText}")`);
});

When('I try to access the dashboard', async function () {
  await page.goto(ADMIN_URL);
});

// Then steps
Then('I should be redirected to Keycloak login page', async function () {
  await page.waitForURL(AUTH_HOST_PATTERN);
  expect(page.url()).toMatch(AUTH_HOST_PATTERN);
});

Then('I should see the login form', async function () {
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  await expect(page.locator('input[name="username"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
});

Then('I should be redirected to the admin callback page', async function () {
  // /admin/callback échange le code contre un jeton de façon asynchrone
  // (terminerConnexion) avant de revenir sur /admin — un simple test d'URL
  // juste après la redirection Keycloak capture parfois l'état transitoire,
  // avant que le jeton n'ait été écrit en sessionStorage. Attendre le retour
  // effectif sur /admin garantit que l'échange a réussi.
  await page.waitForURL((url) => url.pathname === '/admin', { timeout: 10000 });
});

Then('the auth token should be stored in sessionStorage', async function () {
  const token = await page.evaluate(() => sessionStorage.getItem('admin_jeton_acces'));
  expect(token).toBeTruthy();
  expect(token).toMatch(/^ey/); // JWT format
});

Then('the dashboard should load successfully', async function () {
  await expect(page.locator('h1:has-text("Tableau de bord")')).toBeVisible({ timeout: 5000 });
});

Then('I should be redirected to login', async function () {
  await page.waitForURL(AUTH_HOST_PATTERN, { timeout: 5000 });
});

Then('I should be redirected to Keycloak logout', async function () {
  await page.waitForURL(new RegExp(`localhost:8081.*logout`), { timeout: 5000 });
});

Then('the sessionStorage token should be cleared', async function () {
  const token = await page.evaluate(() => sessionStorage.getItem('admin_jeton_acces'));
  expect(token).toBeNull();
});

Then('the token should still be in sessionStorage', async function () {
  const token = await page.evaluate(() => sessionStorage.getItem('admin_jeton_acces'));
  expect(token).toBeTruthy();
});

Then('the dashboard should load without re-authentication', async function () {
  expect(page.url()).not.toMatch(AUTH_HOST_PATTERN);
  await expect(page.locator('h1:has-text("Tableau de bord")')).toBeVisible({ timeout: 5000 });
});

Then('a new authentication flow should begin', async function () {
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible({ timeout: 5000 });
});
