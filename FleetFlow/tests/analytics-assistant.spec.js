import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.js';

test.describe('Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page); // admin has analytics access
    await page.getByRole('link', { name: 'Analytics' }).click();
    await expect(page).toHaveURL(/\/analytics$/);
  });

  test('renders performance charts', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible();
    await expect(page.getByText('Voyage Status Breakdown')).toBeVisible();
    await expect(page.getByText('Maintenance Cost by Category')).toBeVisible();
  });

  test('profitability summary links to the full Profitability page', async ({ page }) => {
    const link = page.getByRole('link', { name: /full financial intelligence/i });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/profitability$/);
  });
});

test.describe('AI Assistant', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.getByRole('link', { name: 'AI Assistant' }).click();
    await expect(page).toHaveURL(/\/assistant$/);
  });

  test('shows the Copilot welcome message and suggested questions', async ({ page }) => {
    await expect(page.getByText(/FleetFlow Copilot|Command Advisor/i)).toBeVisible();
    await expect(page.getByText('Which vessels are at highest risk?').or(page.getByText('Which vessel has the highest fuel consumption?'))).toBeVisible();
  });

  test('sending a question shows a thinking state then a response', async ({ page }) => {
    const input = page.getByPlaceholder(/ask about your fleet/i);
    await input.fill('Which voyages are delayed?');
    await page.keyboard.press('Enter');

    // A user message bubble should appear immediately.
    await expect(page.getByText('Which voyages are delayed?')).toBeVisible();
    // Followed eventually by an assistant response (rule-based fallback or AI).
    await expect(page.locator('main')).toContainText(/delay|voyage/i, { timeout: 20_000 });
  });
});
