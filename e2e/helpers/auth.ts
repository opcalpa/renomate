import { type Page, expect, test } from '@playwright/test';

export const E2E_EMAIL = process.env.E2E_USER_EMAIL ?? '';
export const E2E_PASSWORD = process.env.E2E_USER_PASSWORD ?? '';
export const hasCredentials = E2E_EMAIL.length > 0 && E2E_PASSWORD.length > 0;

/** Skip test if E2E credentials are not configured */
export function requireAuth() {
  test.skip(!hasCredentials, 'E2E_USER_EMAIL / E2E_USER_PASSWORD not set');
}

export async function login(
  page: Page,
  email = E2E_EMAIL,
  password = E2E_PASSWORD,
) {
  await page.goto('/auth');
  await page.locator('#signin-email').fill(email);
  await page.locator('#signin-password').fill(password);
  await page.locator('button[type="submit"]').click();
  // Auth redirects to /start (project list page)
  await expect(page).toHaveURL(/\/(start|projects)/, { timeout: 15000 });
}
