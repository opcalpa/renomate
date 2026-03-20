import { test, expect } from '@playwright/test';
import { login, requireAuth } from './helpers/auth';

test.describe('Project overview', () => {
  test.beforeEach(async ({ page }) => {
    requireAuth();
    await login(page);
  });

  test('can open a project and see tabs', async ({ page }) => {
    // Project links use /projects/{id} (plural)
    await page.locator('tr[class*="cursor"], a[href*="/projects/"]').first().click();
    await expect(page).toHaveURL(/\/projects\//, { timeout: 10000 });
    // Project page has tabs or tab-like navigation
    await expect(page.getByText(/Översikt|Arbeten|Budget|Overview/i).first()).toBeVisible({ timeout: 5000 });
  });
});
