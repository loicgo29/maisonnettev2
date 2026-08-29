import { defineConfig } from '@playwright/test';

// Config distincte de playwright.config.ts : celle-ci ne démarre aucun serveur.
// alo tourne déjà en conteneur (localhost:8022) ; la config principale lance un
// `npm run dev` destiné au frontend de maisonnettev2, inutile et absent ici.
//
// Ces tests vivent dans maisonnettev2 en prévision de la fusion des fronts.
//
// Usage :
//   npm run test:alo
//   ALO_URL=https://alo.logo-solutions.fr npm run test:alo
export default defineConfig({
  testDir: './tests',
  testMatch: 'alo-*.spec.ts',
  timeout: 30000,
  reporter: 'list',
  use: {
    baseURL: process.env.ALO_URL || 'http://localhost:8022',
    trace: 'retain-on-failure',
    // Le domaine public est servi par le Caddy interne du NAS avec un
    // certificat de chaîne privée : sans cela, les tests visant
    // alo.logo-solutions.fr échouent sur la validation TLS.
    ignoreHTTPSErrors: true,
  },
});
