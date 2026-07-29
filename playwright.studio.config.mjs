import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'studio.spec.mjs',
  timeout: 45_000,
  workers: 1,
  reporter: [['line']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'node studio/server.mjs',
    url: 'http://127.0.0.1:4173/api/content',
    reuseExistingServer: false,
    timeout: 120_000
  }
});
