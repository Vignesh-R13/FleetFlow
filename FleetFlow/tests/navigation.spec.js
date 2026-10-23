import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.js';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test('loads KPI cards without an empty white page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Fleet Dashboard' })).toBeVisible();
    await expect(page.getByText('Total Vessels')).toBeVisible();
    await expect(page.getByText('Active Voyages')).toBeVisible();
  });

  test('sidebar navigates to Fleet', async ({ page }) => {
    await page.getByRole('link', { name: 'Fleet' }).click();
    await expect(page).toHaveURL(/\/fleet$/);
    await expect(page.getByRole('heading', { name: 'Fleet' })).toBeVisible();
  });
});

test.describe('Command Center', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.getByRole('link', { name: 'Command Center' }).click();
    await expect(page).toHaveURL(/\/command-center$/);
  });

  test('shows the live/reconnecting connection indicator', async ({ page }) => {
    await expect(page.getByText(/LIVE|RECONNECTING/)).toBeVisible({ timeout: 15_000 });
  });

  test('shows the KPI strip and Fleet Health panel', async ({ page }) => {
    await expect(page.getByText('Fleet Health')).toBeVisible();
    await expect(page.getByText('Vessel Health Ranking')).toBeVisible();
  });

  test('shows the Risk Intelligence and AI Command Advisor panels', async ({ page }) => {
    await expect(page.getByText('Risk Intelligence')).toBeVisible();
    await expect(page.getByText('AI Command Advisor')).toBeVisible();
  });

  test('refresh button re-fetches data without navigating away', async ({ page }) => {
    await page.getByRole('button', { name: 'Refresh Command Center data' }).click();
    await expect(page).toHaveURL(/\/command-center$/);
  });
});

test.describe('Dark mode', () => {
  test('toggles dark mode and persists it across a reload', async ({ page }) => {
    await loginAs(page);
    const html = page.locator('html');

    await expect(html).not.toHaveClass(/dark/);
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    await expect(html).toHaveClass(/dark/);

    await page.reload();
    await expect(html).toHaveClass(/dark/);

    // Restore to light mode so this test doesn't leak state into others.
    await page.getByRole('button', { name: 'Switch to light mode' }).click();
    await expect(html).not.toHaveClass(/dark/);
  });
});
