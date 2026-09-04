import { defineConfig } from 'vitest/config';
import path from 'path';

// E2E tests: require frontend and backend running. Use `npm run test:e2e` to run separately.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/e2e-*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
    },
    testTimeout: 30000,
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
