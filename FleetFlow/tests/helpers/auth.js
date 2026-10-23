// Shared helper for logging into FleetFlow with a seeded demo account before
// each protected-route test. Requires the backend to be running with a
// database that has been seeded via `npm run seed` (see backend/seed/seed.js
// for the DEMO_PASSWORD and the account list).
export const DEMO_ACCOUNTS = {
  admin: { email: 'admin@fleetflow.com', role: 'ADMIN' },
  fleetManager: { email: 'manager@fleetflow.com', role: 'FLEET_MANAGER' },
  maintenanceManager: { email: 'maintenance@fleetflow.com', role: 'MAINTENANCE_MANAGER' },
  captain: { email: 'captain@fleetflow.com', role: 'CAPTAIN' },
};

export const DEMO_PASSWORD = 'Password123!';

/**
 * Logs in as the given demo account and waits for the redirect to /dashboard.
 * @param {import('@playwright/test').Page} page
 * @param {{email: string}} account - one of DEMO_ACCOUNTS' values
 */
export async function loginAs(page, account = DEMO_ACCOUNTS.admin) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Password').fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');
}
