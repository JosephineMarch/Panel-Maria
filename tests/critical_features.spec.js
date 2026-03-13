import { test, expect } from '@playwright/test';

// Datos de prueba para inyectar en LocalStorage
const demoItems = [
    {
        id: 'test-1',
        content: 'Nota de Bienvenida #test',
        type: 'nota',
        descripcion: 'Esta es una nota creada por el sistema de pruebas.',
        tareas: [],
        tags: ['test'],
        deadline: null,
        anclado: true,
        created_at: new Date().toISOString()
    },
    {
        id: 'test-2',
        content: 'Tarea Crítica',
        type: 'tarea',
        descripcion: '',
        tareas: [{ titulo: 'Subtarea 1', completado: false }],
        tags: [],
        deadline: null,
        anclado: false,
        created_at: new Date().toISOString()
    }
];

async function setupEnvironment(page) {
    await page.addInitScript((items) => {
        // Forzamos el modo desarrollo para que la app cargue controles demo
        // Aunque Playwright en 127.0.0.1 ya debería detectarlo
        localStorage.setItem('kaiDemoItems', JSON.stringify(items));
        // Evitamos que intente conectar a Supabase si no es necesario
        localStorage.setItem('kai_use_supabase', 'false');
    }, demoItems);
}

test.describe('EVALUACIÓN DE FUNCIONES CRÍTICAS (KAI)', () => {
    
    test.beforeEach(async ({ page }) => {
        await setupEnvironment(page);
        await page.goto('/');
        
        // Esperamos a que la UI termine de cargar
        await page.waitForSelector('#items-container');
    });

    test('F01: Creación y Visualización de Notas', async ({ page }) => {
        const input = page.locator('#item-input');
        await input.fill('Nota de prueba automatizada');
        await page.click('#btn-submit');
        
        // Al ser LocalStorage, la recarga debería ser instantánea
        const newCard = page.locator('.item-card', { hasText: 'Nota de prueba automatizada' });
        await expect(newCard).toBeVisible({ timeout: 5000 });
        await expect(newCard).toHaveAttribute('data-type', 'nota');
    });

    test('F02: Identificación de Tareas mediante Keywords', async ({ page }) => {
        await page.fill('#item-input', 'Hacer la compra de la semana');
        await page.click('#btn-submit');
        
        const taskCard = page.locator('.item-card', { hasText: 'Hacer la compra de la semana' });
        await expect(taskCard).toBeVisible();
        // La lógica de la app debería haber asignado 'tarea' por la palabra 'Hacer'
        await expect(taskCard).toHaveAttribute('data-type', 'tarea');
    });

    test('F06: Edición Inline y Persistencia Local', async ({ page }) => {
        const firstCard = page.locator('.item-card').first();
        await firstCard.click(); // Abrir edición inline
        
        const textarea = firstCard.locator('textarea').first();
        await textarea.fill('Descripción editada por el robot');
        
        // Buscamos el botón de guardar dentro de la card expandida
        const saveBtn = firstCard.locator('button:has-text("Guardar")');
        if (await saveBtn.isVisible()) {
            await saveBtn.click();
            await expect(firstCard).toHaveAttribute('data-expanded', 'false');
            await expect(firstCard).toContainText('editada por el robot');
        }
    });

    test('F13: Sistema de Filtros por Categoría', async ({ page }) => {
        // En el header hay botones con data-category
        await page.click('.btn-category[data-category="tarea"]');
        
        // Solo debería haber 1 item (el test-2 que inyectamos)
        const visibleCards = page.locator('.item-card:visible');
        await expect(visibleCards).toHaveCount(1);
        await expect(visibleCards.first()).toContainText('Tarea Crítica');
    });

    test('F12: Seguridad y Exportación de Datos', async ({ page }) => {
        await page.click('#btn-user'); // Abrir sidebar
        await expect(page.locator('#sidebar')).not.toHaveClass(/-translate-x-full/);
        
        const [ download ] = await Promise.all([
            page.waitForEvent('download'),
            page.click('#btn-export')
        ]);
        
        expect(download.suggestedFilename()).toContain('.json');
    });
});
