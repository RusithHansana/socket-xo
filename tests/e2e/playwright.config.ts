import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  timeout: process.env.CI ? 90000 : 30000,
  testDir: '.',
  testMatch: '**/*.e2e.test.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI 
    ? [['github'], ['html', { outputFolder: 'playwright-report' }]] 
    : [['html', { outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run build && node server/dist/index.js',
    port: 3001,
    reuseExistingServer: !process.env.CI,
    cwd: '../../',
    env: {
      NODE_ENV: 'production',
      PORT: '3001',
      GRACE_PERIOD_MS: '15000',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
