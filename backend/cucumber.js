export default {
  default: {
    require: ['features/step_definitions/**/*.ts'],
    requireModule: ['tsx'],
    format: ['progress-bar', 'html:test-results/cucumber-report.html'],
    formatOptions: { snippetInterface: 'async-await' },
    parallel: 2,
  },
};
