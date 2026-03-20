import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'server/src/**/*.test.ts',
      'shared/src/**/*.test.ts',
      'client/src/**/*.test.tsx',
      'client/src/**/*.test.ts',
      'tests/integration/**/*.test.ts',
    ],
    exclude: [...configDefaults.exclude, '**/dist/**', 'tests/e2e/**'],
  },
});
