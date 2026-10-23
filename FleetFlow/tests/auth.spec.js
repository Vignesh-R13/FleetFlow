import { test, expect } from '@playwright/test';
import { loginAs, DEMO_ACCOUNTS, DEMO_PASSWORD } from './helpers/auth.js';

test.describe('Login', () => {
  test('renders the sign-in form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('shows a validation message when submitted empty', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toContainText('Enter your email and password');
  });

  test('shows an error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('nobody@fleetflow.com');
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 });
  });

  test('toggles password visibility', async ({ page }) => {
    await page.goto('/login');
    const passwordInput = page.getByLabel('Password');
    await passwordInput.fill('some-password');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
  });

  test('logs in successfully and redirects to the dashboard', async ({ page }) => {
    await loginAs(page, DEMO_ACCOUNTS.admin);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Fleet Dashboard' })).toBeVisible();
  });

  test('logs out and returns to the login page', async ({ page }) => {
    await loginAs(page, DEMO_ACCOUNTS.admin);
    await page.getByRole('button', { expanded: false, name: /Alex Morgan/i }).click();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
