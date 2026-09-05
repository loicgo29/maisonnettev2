import { defineConfig } from 'vitest/config';
import { svelte } from 'vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '.svelte-kit/',
        'dist/',
      ],
    },
  },
  resolve: {
    alias: {
      $lib: '/frontend/src/lib',
      $app: '/node_modules/@sveltejs/kit/src/runtime/app',
    },
  },
});
