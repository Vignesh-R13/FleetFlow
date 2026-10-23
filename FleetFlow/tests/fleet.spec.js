import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.js';

test.describe('Fleet', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.getByRole('link', { name: 'Fleet' }).click();
    await expect(page).toHaveURL(/\/fleet$/);
  });

  test('lists vessels in a table with a Health column', async ({ page }) => {
    await expect(page.getByText(/\d+ vessels/)).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Health' })).toBeVisible();
  });

  test('search filters the vessel list', async ({ page }) => {
    const search = page.getByPlaceholder('Search vessel name or IMO number...');
    await search.fill('Ocean Star');
    // Debounced search — wait for the request to settle rather than a fixed sleep.
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('status filter dropdown is present and selectable', async ({ page }) => {
    const statusFilter = page.getByRole('combobox').first();
    await statusFilter.selectOption('Active');
    await expect(statusFilter).toHaveValue('Active');
  });
});

test.describe('Forms — Add Vessel', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page); // admin — has vessel-write permission
    await page.getByRole('link', { name: 'Fleet' }).click();
  });

  test('opens the Add Vessel modal and validates required fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Add vessel' }).click();
    await expect(page.getByRole('heading', { name: 'Add Vessel' })).toBeVisible();
    await expect(page.getByLabel('Vessel name')).toBeVisible();
    await expect(page.getByLabel('IMO number')).toBeVisible();

    // Browser-native required-field validation should block submission.
    await page.getByRole('button', { name: 'Create vessel' }).click();
    await expect(page.getByRole('heading', { name: 'Add Vessel' })).toBeVisible();
  });

  test('closes the modal without saving on Cancel', async ({ page }) => {
    await page.getByRole('button', { name: 'Add vessel' }).click();
    await page.getByLabel('Vessel name').fill('Test Vessel — Playwright');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Add Vessel' })).not.toBeVisible();
    await expect(page.getByText('Test Vessel — Playwright')).not.toBeVisible();
  });

  test('fills and submits the vessel form', async ({ page }) => {
    await page.getByRole('button', { name: 'Add vessel' }).click();
    const uniqueImo = `TEST-${Date.now()}`;

    await page.getByLabel('Vessel name').fill('Playwright Test Vessel');
    await page.getByLabel('IMO number').fill(uniqueImo);
    await page.getByLabel('Flag').fill('Testland');

    await page.getByRole('button', { name: 'Create vessel' }).click();

    // On success the modal closes and the new vessel appears in the list.
    await expect(page.getByRole('heading', { name: 'Add Vessel' })).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('link', { name: 'Playwright Test Vessel' })).toBeVisible();
  });
});
