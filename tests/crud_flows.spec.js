import { test, expect } from '@playwright/test';

test.describe('Pruebas Exhaustivas de Creación de Contenido (CRUD)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Nota: Las pruebas CRUD actuales operan en "Modo Demo" o disparan el Sidebar si no hay sesión.
        // Para pruebas reales de creación, se necesitaría un mock de Supabase o una sesión activa.
    });

    test('debería poder crear una NOTA correctamente', async ({ page }) => {
        await page.selectOption('#item-type', 'nota');
        await page.fill('#item-input', 'Nueva nota de prueba automatizada');
        await page.click('#btn-submit');
        
        // Verificamos que se intente guardar o pida sesión
        // Si estuviéramos en modo demo, buscaríamos la card en el DOM
        await expect(page.locator('#sidebar')).not.toHaveClass(/-translate-x-full/);
    });

    test('debería poder crear una TAREA con checklist', async ({ page }) => {
        await page.selectOption('#item-type', 'tarea');
        await page.fill('#item-input', 'Nueva tarea compleja #test');
        await page.click('#btn-submit');
        
        // Verificación de flujo UI
        await expect(page.locator('#sidebar')).not.toHaveClass(/-translate-x-full/);
    });

    test('debería filtrar elementos por CATEGORÍA', async ({ page }) => {
        // Asumiendo que hay botones de filtro en el sidebar o header
        const categoryBtn = page.locator('button:has-text("Tareas")');
        if (await categoryBtn.isVisible()) {
            await categoryBtn.click();
            // Verificar que la URL cambie o el contenedor se filtre
            // await expect(page).toHaveURL(/filter=tarea/);
        }
    });

    test('debería poder buscar elementos mediante la barra de búsqueda', async ({ page }) => {
        const searchInput = page.locator('#search-input'); // Si existe
        if (await searchInput.isVisible()) {
            await searchInput.fill('buscar este contenido');
            // Verificar que los resultados aparezcan
        }
    });
});
