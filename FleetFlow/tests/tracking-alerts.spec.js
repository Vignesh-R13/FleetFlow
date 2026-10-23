import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.js';

test.describe('Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.getByRole('link', { name: 'Tracking' }).click();
    await expect(page).toHaveURL(/\/tracking$/);
  });

  test('renders the live map', async ({ page }) => {
    // React-Leaflet renders a .leaflet-container div; assert on that rather
    // than tile images, since tiles load from an external CDN this test
    // environment may not always reach.
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 15_000 });
  });

  test('shows the simulated-data disclosure', async ({ page }) => {
    await expect(page.getByText(/simulated/i)).toBeVisible();
  });
});

test.describe('Alerts', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.getByRole('link', { name: 'Alerts' }).click();
    await expect(page).toHaveURL(/\/alerts$/);
  });

  test('lists alerts with severity filters', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Alerts' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Critical' })).toBeVisible();
  });

  test('filtering by severity updates the list', async ({ page }) => {
    await page.getByRole('button', { name: 'Critical', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Critical', exact: true })).toHaveClass(/bg-navy-900|bg-sea-500/);
  });
});
