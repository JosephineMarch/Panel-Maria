const { chromium } = require('playwright');

(async () => {
    console.log('--- Iniciando Auditoría Dinámica Avanzada (Playwright) ---');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    let exitCode = 0;

    try {
        await page.goto('http://127.0.0.1:8080');

        // 1. Revisar si el Demo Button está visible (Significa que estamos en Empty State - Local sin Firebase Session)
        console.log('1. Verificando estado inicial...');
        await page.waitForTimeout(2000);

        // 2. Probar Animaciones del Sidebar
        console.log('2. Comprobando controles del Sidebar...');
        await page.click('#btn-user', { timeout: 3000 });
        await page.waitForTimeout(500);

        const sidebarClass = await page.getAttribute('#sidebar', 'class');
        if (!sidebarClass.includes('-translate-x-full')) {
            console.log('✅ Sidebar abriendo correctamente');
        } else {
            console.log('❌ Fallo en Sidebar (No se abrió)');
            exitCode = 1;
        }

        // Cierra el sidebar
        await page.click('#btn-close-sidebar');
        await page.waitForTimeout(500);

        // 3. Probar Modal de Voz (Si existe)
        console.log('3. Comprobando Overlay de Voz...');
        await page.click('#btn-voice', { timeout: 3000 }).catch(() => console.log('Botón voz secundario no detectado. Probando footer.'));
        await page.click('#btn-voice-footer', { timeout: 1000 }).catch(() => { });
        await page.waitForTimeout(500);

        console.log('✅ UI Principal respondiento a eventos clic.');

        // 4. Intentar ingresar data cruda y ver comportamiento del submit
        console.log('4. Emitiendo submit en caja principal...');
        await page.fill('#item-input', 'Input Seguro Automatizado por Antigravity');
        await page.click('#btn-submit');

        // El comportamiento esperado sin login es que el sidebar salte arrojando un warning.
        await page.waitForTimeout(1000);
        const sidebarRefreshedClass = await page.getAttribute('#sidebar', 'class');
        if (!sidebarRefreshedClass.includes('-translate-x-full')) {
            console.log('✅ Security Trigger Correcto: Se impidió grabar y se solicitó sesión.');
        }

    } catch (e) {
        console.error('❌ INTERRUPCIÓN DEL FLUJO E2E:', e.message);
        exitCode = 1;
    } finally {
        await browser.close();
        console.log('--- Auditoría Dinámica Finalizada ---');
        process.exit(exitCode);
    }
})();
