import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.js';

// This file is matched by the `mobile-chrome` project in playwright.config.js
// (Pixel 5 viewport), so it always runs at a mobile width regardless of
// which project set is otherwise selected.
test.describe('Responsive navigation (mobile)', () => {
  test('sidebar is hidden by default and opens as a drawer', async ({ page }) => {
    await loginAs(page);

    // The desktop sidebar is rendered with `hidden md:flex`, so at a mobile
    // viewport it should not be visible, and no drawer should be open yet.
    await expect(page.getByRole('link', { name: 'Command Center' })).not.toBeVisible();

    await page.getByRole('button', { name: 'Toggle sidebar' }).click();
    await expect(page.getByRole('link', { name: 'Command Center' })).toBeVisible();
  });

  test('tapping a nav link in the drawer navigates and closes it', async ({ page }) => {
    await loginAs(page);
    await page.getByRole('button', { name: 'Toggle sidebar' }).click();

    await page.getByRole('link', { name: 'Fleet' }).click();
    await expect(page).toHaveURL(/\/fleet$/);

    // The drawer's backdrop should be gone after navigating.
    await expect(page.getByRole('link', { name: 'Command Center' })).not.toBeVisible();
  });

  test('tapping the backdrop closes the drawer without navigating', async ({ page }) => {
    await loginAs(page);
    await page.getByRole('button', { name: 'Toggle sidebar' }).click();
    await expect(page.getByRole('link', { name: 'Command Center' })).toBeVisible();

    // Click near the right edge of the screen, outside the drawer panel itself.
    await page.mouse.click(page.viewportSize().width - 10, 100);
    await expect(page.getByRole('link', { name: 'Command Center' })).not.toBeVisible();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('no horizontal overflow on the dashboard at mobile width', async ({ page }) => {
    await loginAs(page);
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize().width;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // +1 for sub-pixel rounding
  });
});
