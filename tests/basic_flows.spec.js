import { test, expect } from '@playwright/test';

test.describe('Flujos Básicos de Panel-Maria', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('debería cargar la página principal correctamente', async ({ page }) => {
    await expect(page).toHaveTitle(/KAI/);
    await expect(page.locator('#item-input')).toBeVisible();
  });

  test('debería abrir y cerrar el sidebar', async ({ page }) => {
    await page.click('#btn-user');
    await expect(page.locator('#sidebar')).not.toHaveClass(/-translate-x-full/);
    
    await page.click('#btn-close-sidebar');
    await expect(page.locator('#sidebar')).toHaveClass(/-translate-x-full/);
  });

  test('debería mostrar el overlay de voz', async ({ page }) => {
    // Probamos el botón del footer o el principal si existe
    const voiceBtn = page.locator('#btn-voice-footer, #btn-voice');
    await voiceBtn.first().click();
    await expect(page.locator('#voice-overlay')).not.toHaveClass(/hidden/);
  });

  test('debería impedir guardar sin sesión y abrir el sidebar', async ({ page }) => {
    await page.fill('#item-input', 'Prueba de regresión automatizada');
    await page.click('#btn-submit');
    
    // Esperamos que se abra el sidebar para invitar al login
    await expect(page.locator('#sidebar')).not.toHaveClass(/-translate-x-full/);
  });
});
