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
  },
};
