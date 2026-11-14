import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure', screenshot: 'only-on-failure', serviceWorkers: 'block' },
  projects: [
    { name: 'chromium', testIgnore: '**/pwa.spec.js', use: { ...devices['Desktop Chrome'], channel: process.env.PLAYWRIGHT_CHANNEL || undefined } },
    { name: 'mobile', testIgnore: '**/pwa.spec.js', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', channel: process.env.PLAYWRIGHT_CHANNEL || undefined } },
    { name: 'firefox', testIgnore: '**/pwa.spec.js', use: { ...devices['Desktop Firefox'] } },
    { name: 'pwa', testMatch: '**/pwa.spec.js', use: { ...devices['Desktop Chrome'], channel: process.env.PLAYWRIGHT_CHANNEL || undefined, serviceWorkers: 'allow' } }
  ],
  webServer: process.env.PLAYWRIGHT_EXTERNAL_SERVER ? undefined : { command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI }
});
