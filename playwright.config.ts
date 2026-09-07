import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'test-results/playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],
  use: {
    // E2E_URL permet de rejouer la même suite contre la production sans
    // toucher aux tests ; sans cela `page.goto('/…')` visait toujours la pile
    // locale, y compris quand on croyait valider le serveur distant.
    //
    // `maisonnette.localhost` et non `localhost` : le jeton de session est un
    // cookie de domaine, que les navigateurs refusent d'attacher à `localhost`
    // — c'est un domaine de premier niveau. Depuis `localhost`, la session ne
    // suivrait pas jusqu'à alo.
    baseURL: process.env.E2E_URL || 'http://maisonnette.localhost:8030',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.SKIP_WEBSERVER ? [] : [
    {
      command: 'npm run preview',
      url: 'http://localhost:8030',
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
});
