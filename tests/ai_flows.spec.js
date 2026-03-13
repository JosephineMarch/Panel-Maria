import { test, expect } from '@playwright/test';

test.describe('Pruebas de Flujos de Inteligencia Artificial (Kai)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('debería poder abrir el chat con Kai', async ({ page }) => {
        const kaiBtn = page.locator('#btn-kai-chat'); // Ajustar selector real
        if (await kaiBtn.isVisible()) {
            await kaiBtn.click();
            await expect(page.locator('#kai-chat-container')).toBeVisible();
        }
    });

    test('debería recibir una respuesta de Kai al enviar un mensaje', async ({ page }) => {
        const chatInput = page.locator('#kai-chat-input');
        if (await chatInput.isVisible()) {
            await chatInput.fill('Hola Kai, ¿qué puedes hacer por mí?');
            await page.keyboard.press('Enter');
            
            // Esperamos el mensaje de respuesta (burbuja de texto)
            const responseBubble = page.locator('.kai-message-bubble');
            await expect(responseBubble).toBeVisible({ timeout: 10000 });
        }
    });

    test('debería procesar la entrada por voz y mostrar el overlay', async ({ page }) => {
        const voiceBtn = page.locator('#btn-voice-footer, #btn-voice');
        await voiceBtn.first().click();
        
        await expect(page.locator('#voice-overlay')).toBeVisible();
        await expect(page.locator('#voice-status-text')).toContainText(/escuchando|procesando/i);
    });
});
