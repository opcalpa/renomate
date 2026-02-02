import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Auth page', () => {
  test('renders sign-in form', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.locator('#signin-email')).toBeVisible();
    await expect(page.locator('#signin-password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('valid login redirects to /projects', async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/projects/);
  });

  test('invalid credentials shows error', async ({ page }) => {
    await page.goto('/auth');
    await page.locator('#signin-email').fill('invalid@example.com');
    await page.locator('#signin-password').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText(/invalid|error/i)).toBeVisible({ timeout: 10000 });
  });
});
