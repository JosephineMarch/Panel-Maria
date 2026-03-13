import { test, expect } from '@playwright/test';

test('Smoke Test: La app carga el título correctamente', async ({ page }) => {
    await page.goto('http://127.0.0.1:8080');
    await expect(page).toHaveTitle(/KAI/);
});
