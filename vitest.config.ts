import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'packages/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/web'),
      '@paircode/shared': path.resolve(__dirname, './packages/shared/src/index.ts'),
    },
  },
});
