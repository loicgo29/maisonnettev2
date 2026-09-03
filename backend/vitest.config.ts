import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts', '**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.config.ts',
      ],
      lines: 70,
      functions: 70,
      branches: 70,
      statements: 70,
    },
    testTimeout: 30000,
    // src/middleware/oidc.ts throws at import time when KEYCLOAK_REALM_URL is
    // missing, which made reservations.test.ts fail before a single test ran.
    // A dummy realm is enough: unit tests mock the auth middleware and never
    // reach Keycloak. A real value in the environment still takes precedence.
    env: {
      KEYCLOAK_REALM_URL:
        process.env.KEYCLOAK_REALM_URL ?? 'http://localhost:8080/realms/test',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
