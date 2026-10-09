// Playwright config. The site has no build step; these tests only serve it as-is and drive it in Chromium.
import { defineConfig, devices } from '@playwright/test';

// PORT lets several checkouts run their tests side by side.
const PORT = Number(process.env.PORT || 4173);

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.js$/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  use: {
    baseURL: `http://localhost:${PORT}/kotoba-web/`,
    trace: 'retain-on-failure',
    // Most tests run without the service worker so every run sees the files on disk; the offline test turns it on.
    serviceWorkers: 'block',
    // A fake microphone (a steady tone) so Rhythm and the mic check can run without hardware or a permission prompt.
    launchOptions: {
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
      ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}),
    },
  },
  projects: [
    { name: 'phone', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: `node tests/server.mjs ${PORT}`,
    url: `http://localhost:${PORT}/kotoba-web/`,
    reuseExistingServer: !process.env.CI,
  },
});
