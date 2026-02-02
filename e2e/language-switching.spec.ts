import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Language switching', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('can switch to English and Swedish', async ({ page }) => {
    // Open language dropdown (Globe icon button)
    await page.getByRole('button', { name: /language|globe|språk/i }).click();

    // Switch to English
    await page.getByText('English').click();
    await expect(page.getByText(/projects/i)).toBeVisible();

    // Open dropdown again
    await page.getByRole('button', { name: /language|globe|språk/i }).click();

    // Switch to Swedish
    await page.getByText('Svenska').click();
    await expect(page.getByText(/projekt/i)).toBeVisible();
  });
});
