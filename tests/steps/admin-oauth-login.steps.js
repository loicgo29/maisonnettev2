import { Given, When, Then, Before } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

let page;
let browser;

const ADMIN_URL = 'http://localhost:8030/admin';
const AUTH_URL = 'https://auth.maisonnette-pecheur-bertheaume.fr';

Before(async function() {
  // Playwright est initialisé dans setup.js
  page = this.page;
});

// Given steps
Given('the admin dashboard is available at the admin path', async function() {
  const response = await fetch(ADMIN_URL);
  expect([200, 302]).toContain(response.status); // 302 OK (redirect)
});

Given('Authentik is running at auth.maisonnette-pecheur-bertheaume.fr', async function() {
  const response = await fetch(AUTH_URL);
  expect(response.ok).toBeTruthy();
});

Given('I am on the Authentik login page', async function() {
  await page.goto(ADMIN_URL);
  await page.waitForURL(/auth\.maisonnette-pecheur-bertheaume\.fr/);
  await expect(page.locator('text=Sign in')).toBeVisible();
});

Given('I have an invalid token in sessionStorage', async function() {
  await page.goto(ADMIN_URL);
  await page.evaluate(() => {
    sessionStorage.setItem('admin_jeton_acces', 'invalid-token-xyz');
  });
});

Given('I am logged in with a valid token', async function() {
  await page.goto(ADMIN_URL);
  // Simuler un token valide (JWT mocké)
  const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20iLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsiYWRtaW4iXX0sImV4cCI6OTk5OTk5OTk5OX0.signature';
  await page.evaluate((token) => {
    sessionStorage.setItem('admin_jeton_acces', token);
  }, mockToken);
  await page.reload();
  // Attendre que le dashboard charge
  await page.waitForSelector('h1:has-text("Tableau de bord")', { timeout: 5000 }).catch(() => {});
});

Given('my token has expired', async function() {
  await page.goto(ADMIN_URL);
  // Token expiré (exp: 0)
  const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MH0.signature';
  await page.evaluate((token) => {
    sessionStorage.setItem('admin_jeton_acces', token);
  }, expiredToken);
});

// When steps
When('I navigate to the admin dashboard', async function() {
  await page.goto(ADMIN_URL);
});

When('I enter valid credentials', async function() {
  await page.fill('input[name="username"]', 'admin@test.com');
  await page.fill('input[name="password"]', 'test-password');
});

When('I submit the login form', async function() {
  await page.click('button:has-text("Sign In")');
});

When('I reload the page', async function() {
  await page.reload();
});

When('I click the {string} button', async function(buttonText) {
  await page.click(`button:has-text("${buttonText}")`);
});

When('I try to access the dashboard', async function() {
  await page.goto(ADMIN_URL);
});

// Then steps
Then('I should be redirected to Authentik login page', async function() {
  await page.waitForURL(/auth\.maisonnette-pecheur-bertheaume\.fr/);
  expect(page.url()).toMatch(/auth\.maisonnette-pecheur-bertheaume\.fr/);
});

Then('I should see the login form', async function() {
  await expect(page.locator('text=Sign in')).toBeVisible();
  await expect(page.locator('input[name="username"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
});

Then('I should be redirected to the admin callback page', async function() {
  await page.waitForURL(/\/admin\/callback/);
  expect(page.url()).toContain('/admin/callback');
});

Then('the auth token should be stored in sessionStorage', async function() {
  const token = await page.evaluate(() => {
    return sessionStorage.getItem('admin_jeton_acces');
  });
  expect(token).toBeTruthy();
  expect(token).toMatch(/^ey/); // JWT format
});

Then('the dashboard should load successfully', async function() {
  await expect(page.locator('h1:has-text("Tableau de bord")')).toBeVisible({ timeout: 5000 });
});

Then('I should see an {string} error', async function(errorText) {
  await expect(page.locator(`text=${errorText}`)).toBeVisible({ timeout: 5000 });
});

Then('I should be redirected to login', async function() {
  await page.waitForURL(/auth\.maisonnette-pecheur-bertheaume\.fr/, { timeout: 5000 });
});

Then('I should be redirected to Authentik logout', async function() {
  await page.waitForURL(/auth\.maisonnette-pecheur-bertheaume\.fr.*logout/, { timeout: 5000 });
});

Then('the sessionStorage token should be cleared', async function() {
  const token = await page.evaluate(() => {
    return sessionStorage.getItem('admin_jeton_acces');
  });
  expect(token).toBeNull();
});

Then('the token should still be in sessionStorage', async function() {
  const token = await page.evaluate(() => {
    return sessionStorage.getItem('admin_jeton_acces');
  });
  expect(token).toBeTruthy();
});

Then('a new authentication flow should begin', async function() {
  await expect(page.locator('text=Sign in')).toBeVisible({ timeout: 5000 });
});

