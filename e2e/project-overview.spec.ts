import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Project overview', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('can open a project and see tabs', async ({ page }) => {
    await page.locator('a[href*="/project/"]').first().click();
    await expect(page).toHaveURL(/\/project\//);
    await expect(page.getByRole('tablist')).toBeVisible();
  });
});
