import { type Page, expect } from '@playwright/test';

export async function login(
  page: Page,
  email = process.env.E2E_USER_EMAIL ?? '',
  password = process.env.E2E_USER_PASSWORD ?? ''
) {
  await page.goto('/auth');
  await page.locator('#signin-email').fill(email);
  await page.locator('#signin-password').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/projects/, { timeout: 10000 });
}
