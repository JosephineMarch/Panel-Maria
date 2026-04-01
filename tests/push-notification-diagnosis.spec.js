/**
 * Diagnóstico de Notificaciones Push - Panel Maria
 * 
 * Este test verifica el flujo completo de push notifications:
 * 1. Frontend: Permiso, Service Worker, VAPID, Token FCM
 * 2. Backend: Edge Function, credenciales, comunicación con FCM
 * 3. Base de datos: Tabla fcm_tokens
 * 
 * Usage: npx playwright test push-notification-diagnosis.spec.js
 */

import { test, expect } from '@playwright/test';

test.describe('Push Notifications Diagnosis', () => {
  
  test('1. Diagnóstico completo del sistema de push notifications', async ({ page }) => {
    const results = {
      url: page.url(),
      errors: [] as string[],
      checks: [] as string[]
    };

    // ============================================
    // CHECK 1: Permiso de notificaciones
    // ============================================
    console.log('\n🔍 CHECK 1: Permiso de notificaciones');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verificar estado del permiso
    const permissionStatus = await page.evaluate(() => Notification.permission);
    console.log(`   Estado del permiso: ${permissionStatus}`);
    results.checks.push(`Permiso: ${permissionStatus}`);
    
    if (permissionStatus === 'default') {
      results.errors.push('PERMISO NO CONCEDIDO - El usuario debe dar permiso manualmente');
    } else if (permissionStatus === 'denied') {
      results.errors.push('PERMISO DENEGADO - Bloqueado en navegador. Necesita habilitarse manualmente');
    }

    // ============================================
    // CHECK 2: Service Worker
    // ============================================
    console.log('\n🔍 CHECK 2: Service Worker');
    
    const swStatus = await page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const sw = registrations.find(r => r.active?.scriptURL.includes('sw.js'));
      
      if (!sw) return { registered: false, error: 'No hay SW registrado' };
      
      return {
        registered: true,
        scope: sw.scope,
        activeScript: sw.active?.scriptURL,
        pushManager: !!sw.pushManager
      };
    });
    
    console.log('   SW registrado:', swStatus);
    results.checks.push(`Service Worker: ${swStatus.registered ? 'OK' : 'FALLO'}`);
    
    if (!swStatus.registered) {
      results.errors.push('SERVICE WORKER NO REGISTRADO - sw.js no está funcionando');
    }

    // ============================================
    // CHECK 3: Suscripción Push
    // ============================================
    console.log('\n🔍 CHECK 3: Suscripción Push Manager');
    
    const pushStatus = await page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const sw = registrations.find(r => r.active?.scriptURL.includes('sw.js'));
      
      if (!sw?.pushManager) return { subscribed: false, error: 'No hay pushManager' };
      
      const subscription = await sw.pushManager.getSubscription();
      
      if (!subscription) return { subscribed: false, error: 'No hay suscripción activa' };
      
      return {
        subscribed: true,
        endpoint: subscription.endpoint,
        keys: Object.keys(subscription.keys)
      };
    });
    
    console.log('   Push Manager:', pushStatus);
    results.checks.push(`Push subscription: ${pushStatus.subscribed ? 'OK' : 'FALLO'}`);
    
    if (!pushStatus.subscribed) {
      results.errors.push('NO HAY SUSCRIPCIÓN PUSH - Necesita subscribe al PushManager');
    }

    // ============================================
    // CHECK 4: Token FCM
    // ============================================
    console.log('\n🔍 CHECK 4: Token FCM');
    
    const fcmToken = await page.evaluate(() => localStorage.getItem('fcmToken'));
    const fcmTokenTime = await page.evaluate(() => localStorage.getItem('fcmTokenTime'));
    
    console.log('   Token guardado:', !!fcmToken);
    console.log('   Token largo:', fcmToken?.length || 0);
    
    if (fcmTokenTime) {
      const age = Date.now() - parseInt(fcmTokenTime);
      console.log(`   Token edad: ${Math.round(age / 1000 / 60)} minutos`);
    }
    
    results.checks.push(`FCM Token: ${fcmToken ? 'OK (' + fcmToken.length + ' chars)' : 'FALLO'}`);
    
    if (!fcmToken) {
      results.errors.push('NO HAY TOKEN FCM - requestFCMToken() falló o no se ejecutó');
    }

    // ============================================
    // CHECK 5: Verificar tabla fcm_tokens en Supabase
    // ============================================
    console.log('\n🔍 CHECK 5: Tabla fcm_tokens en Supabase');
    
    // Obtener información de Supabase desde el frontend
    const supabaseInfo = await page.evaluate(() => {
      // Buscar la configuración de Supabase en el código
      const scripts = Array.from(document.querySelectorAll('script[type="module"]'));
      return scripts.map(s => s.src).filter(s => s?.includes('supabase'));
    });
    
    console.log('   Scripts Supabase:', supabaseInfo);
    results.checks.push('Supabase: Verificar manualmente en dashboard');
    
    // ============================================
    // CHECK 6: Test de la Edge Function
    // ============================================
    console.log('\n🔍 CHECK 6: Edge Function send-push');
    
    // Test directo a la Edge Function
    if (fcmToken) {
      try {
        const edgeResponse = await fetch(
          'https://jiufptuxadjavjfbfwka.supabase.co/functions/v1/send-push',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: fcmToken,
              title: '🧪 Test Diagnóstico',
              body: 'Si ves esto, las notificaciones funcionan',
              test: true
            })
          }
        );
        
        const responseText = await edgeResponse.text();
        console.log('   Edge Function response:', edgeResponse.status);
        console.log('   Response:', responseText.substring(0, 500));
        
        results.checks.push(`Edge Function: ${edgeResponse.status}`);
        
        if (edgeResponse.status !== 200) {
          results.errors.push(`EDGE FUNCTION FALLO (${edgeResponse.status}): ${responseText.substring(0, 200)}`);
        }
      } catch (e) {
        console.log('   Error calling edge function:', e.message || e);
        results.errors.push('EDGE FUNCTION: No se pudo llamar - ' + (e.message || e));
      }
    } else {
      results.checks.push('Edge Function: SKIP (sin token)');
    }

    // ============================================
    // CHECK 7: Revisar console errors
    // ============================================
    console.log('\n🔍 CHECK 7: Errores en consola');
    
    // Capturar errores de red
    const networkErrors: string[] = [];
    page.on('requestfailed', (request) => {
      networkErrors.push(`${request.url()} - ${request.failure()?.errorText}`);
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    console.log('   Errores de red:', networkErrors.length);
    if (networkErrors.length > 0) {
      results.errors.push('ERRORES DE RED: ' + networkErrors.join(', '));
    }

    // ============================================
    // RESUMEN
    // ============================================
    console.log('\n========== RESUMEN ==========');
    console.log('Checks realizados:');
    results.checks.forEach(c => console.log('  ✓ ' + c));
    
    if (results.errors.length > 0) {
      console.log('\nERRORES ENCONTRADOS:');
      results.errors.forEach(e => console.log('  ✗ ' + e));
    } else {
      console.log('\n✅ TODO OK - Las notificaciones deberían funcionar');
    }
    
    // Guardar resultados en localStorage para verlos después
    await page.evaluate((r) => {
      localStorage.setItem('pushDiagnosisResults', JSON.stringify(r, null, 2));
    }, results);
  });

  test('2. Test de integración completo (requiere token)', async ({ page }) => {
    // Este test solo corre si hay un token válido
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const fcmToken = await page.evaluate(() => localStorage.getItem('fcmToken'));
    
    if (!fcmToken) {
      console.log('⏭️  SKIP: No hay token FCM. Ejecutar primero el diagnóstico.');
      return;
    }
    
    console.log('Token encontrado, ejecutando test de integración...');
    
    // Simular envío de notificación desde la consola
    const result = await page.evaluate(async (token) => {
      // Llamar directamente a la Edge Function
      const response = await fetch('https://jiufptuxadjavjfbfwka.supabase.co/functions/v1/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          title: '🧪 Playwright Test',
          body: 'Notificación de prueba',
          test: true
        })
      });
      
      return {
        status: response.status,
        body: await response.text()
      };
    }, fcmToken);
    
    console.log('Resultado:', result);
    
    expect(result.status).toBe(200);
  });
});