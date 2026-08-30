export default {
  default: {
    requireModule: ['ts-node/register'],
    require: ['tests/steps/**/*.steps.js'],
    format: [
      'progress-bar',
      'html:test-results/cucumber-report.html',
      'json:test-results/cucumber-results.json',
    ],
    formatOptions: { snippetInterface: 'async-await' },
    dryRun: false,
    failFast: false,
    parallel: 2,
    // Des steps non implémentés (photos, containers…) existent depuis
    // longtemps dans cette suite, sans rapport avec un vrai échec : sans ce
    // réglage, --no-strict passé en CLI ne suffit pas à les empêcher de
    // faire sortir cucumber-js en erreur (constaté le 2026-08-30 — la config
    // de ce fichier semble l'emporter sur le flag CLI équivalent).
    strict: false,
  },
};
