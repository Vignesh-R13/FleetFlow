// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * FleetFlow Playwright configuration.
 *
 * Prerequisites to actually run these tests (see tests/README.md):
 *  - Backend running on http://localhost:5000 with MONGO_URI pointed at a
 *    reachable MongoDB, seeded via `npm run seed` in backend/.
 *  - Frontend dev server is started automatically by the `webServer` block
 *    below, so you don't need to run `npm run dev` yourself first.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /responsive\.spec\.js/,
    },
    {
      name: 'mobile-chrome',
      // Dedicated project for the responsive-navigation spec — narrow
      // viewport so the sidebar collapses into its drawer.
      use: { ...devices['Pixel 5'] },
      testMatch: /responsive\.spec\.js/,
    },
  ],

  /* Starts the Vite dev server automatically before the test run. The
   * backend + database are prerequisites this config does not start —
   * see tests/README.md for why (a live MongoDB can't be spun up here). */
  webServer: {
    command: 'npm run dev',
    cwd: './FleetFlow/frontend',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
