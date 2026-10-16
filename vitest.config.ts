import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, '.'),
      '@engine': resolve(import.meta.dirname, 'packages/engine/src'),
    },
  },
  test: {
    environment: 'node',
  },
});
