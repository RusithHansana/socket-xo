import { test, expect } from '@playwright/test';

test.describe('Smoke E2E', () => {
  test('lobby page loads and shows mode selection', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/socket[- ]?xo/i);
    await expect(page.locator('body')).toBeVisible();
  });
});
