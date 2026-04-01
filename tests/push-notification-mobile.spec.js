/**
 * Diagnóstico de Push Notifications - MÓVIL Y MULTI-DISPOSITIVO
 * 
 * Este test verifica el sistema en múltiples dispositivos:
 * - Desktop Chrome (Windows)
 * - Mobile Chrome (Android)
 * 
 * Usage: 
 *   Desktop: npx playwright test tests/push-notification-mobile.spec.js
 *   Móvil:   npx playwright test tests/push-notification-mobile.spec.js --project="Pixel 7"
 */

import { test, expect, devices } from '@playwright/test';

// ============================================
// TEST 1: Desktop Chrome
// ============================================
test.describe('Push Notifications - Desktop', () => {
  
  test('Diagnóstico en Desktop Chrome', async ({ page }) => {
    console.log('\n🖥️  DIAGNÓSTICO EN DESKTOP CHROME');
    console.log('=====================================');
    
    const results = {
      device: 'Desktop Chrome',
      userAgent: '',
      errors: [],
      checks: []
    };

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Obtener user agent
    results.userAgent = await page.evaluate(() => navigator.userAgent);
    console.log('User Agent:', results.userAgent.substring(0, 80) + '...');

    // CHECK 1: Permiso
    const permissionStatus = await page.evaluate(() => Notification.permission);
    console.log('\n🔍 CHECK 1 - Permiso:', permissionStatus);
    results.checks.push(`Permiso: ${permissionStatus}`);
    if (permissionStatus !== 'granted') {
      results.errors.push(`PERMISO: ${permissionStatus}`);
    }

    // CHECK 2: Service Worker
    const swStatus = await page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const sw = registrations.find(r => r.active?.scriptURL.includes('sw.js'));
      return sw ? { registered: true, scope: sw.scope } : { registered: false };
    });
    console.log('🔍 CHECK 2 - Service Worker:', swStatus.registered ? '✅' : '❌');
    results.checks.push(`SW: ${swStatus.registered ? 'OK' : 'FALLO'}`);
    if (!swStatus.registered) results.errors.push('SW no registrado');

    // CHECK 3: Push Subscription
    const pushStatus = await page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const sw = registrations.find(r => r.active?.scriptURL.includes('sw.js'));
      if (!sw?.pushManager) return { subscribed: false };
      const sub = await sw.pushManager.getSubscription();
      return sub ? { subscribed: true, endpoint: sub.endpoint.substring(0, 50) + '...' } : { subscribed: false };
    });
    console.log('🔍 CHECK 3 - Push:', pushStatus.subscribed ? '✅' : '❌');
    results.checks.push(`Push: ${pushStatus.subscribed ? 'OK' : 'FALLO'}`);
    if (!pushStatus.subscribed) results.errors.push('No hay suscripción push');

    // CHECK 4: Token FCM
    const fcmToken = await page.evaluate(() => localStorage.getItem('fcmToken'));
    console.log('🔍 CHECK 4 - FCM Token:', fcmToken ? `✅ (${fcmToken.length} chars)` : '❌ FALLO');
    results.checks.push(`FCM: ${fcmToken ? 'OK' : 'FALLO'}`);
    if (!fcmToken) results.errors.push('No hay token FCM');

    // CHECK 5: Test de envío
    if (fcmToken) {
      const testResult = await page.evaluate(async (token) => {
        try {
          const res = await fetch('https://jiufptuxadjavjfbfwka.supabase.co/functions/v1/send-push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, title: '🧪 Test Desktop', body: 'Notificación de prueba', test: true })
          });
          return { status: res.status, ok: res.ok };
        } catch (e) {
          return { error: e.message };
        }
      }, fcmToken);
      console.log('🔍 CHECK 5 - Edge Function:', testResult.status || testResult.error);
      results.checks.push(`Edge: ${testResult.status || 'ERROR'}`);
      if (!testResult.ok) results.errors.push(`Edge Function: ${testResult.status}`);
    }

    // RESUMEN
    console.log('\n========== RESUMEN DESKTOP ==========');
    results.checks.forEach(c => console.log('  ✓', c));
    if (results.errors.length) {
      console.log('\n❌ ERRORES:');
      results.errors.forEach(e => console.log('  -', e));
    } else {
      console.log('\n✅ TODO OK - Desktop debería recibir notificaciones');
    }
  });
});

// ============================================
// TEST 2: Mobile Chrome (Android)
// Configurado en playwright.config.js como proyecto "Pixel 7"
// ============================================
test.describe('Push Notifications - Mobile', () => {
  
  test('Diagnóstico en Mobile Chrome (Android)', async ({ page, isMobile }) => {
    console.log('\n📱 DIAGNÓSTICO EN MÓVIL ANDROID');
    console.log('===================================');
    
    const results = {
      device: 'Mobile Android (Pixel 7)',
      userAgent: '',
      errors: [],
      checks: []
    };

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    results.userAgent = await page.evaluate(() => navigator.userAgent);
    console.log('User Agent:', results.userAgent.substring(0, 80) + '...');

    // CHECK 1: Permiso
    const permissionStatus = await page.evaluate(() => Notification.permission);
    console.log('\n🔍 CHECK 1 - Permiso:', permissionStatus);
    results.checks.push(`Permiso: ${permissionStatus}`);
    if (permissionStatus !== 'granted') {
      results.errors.push(`PERMISO: ${permissionStatus} - necesita concederse manualmente`);
    }

    // CHECK 2: Service Worker
    const swStatus = await page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const sw = registrations.find(r => r.active?.scriptURL.includes('sw.js'));
      return sw ? { registered: true, scope: sw.scope } : { registered: false };
    });
    console.log('🔍 CHECK 2 - Service Worker:', swStatus.registered ? '✅' : '❌ (PROBLEMA COMÚN EN MÓVIL)');
    results.checks.push(`SW: ${swStatus.registered ? 'OK' : 'FALLO'}`);
    if (!swStatus.registered) {
      results.errors.push('SW no registrado - En móvil el SW puede expirar cuando la app no se usa');
    }

    // CHECK 3: Push Subscription
    const pushStatus = await page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const sw = registrations.find(r => r.active?.scriptURL.includes('sw.js'));
      if (!sw?.pushManager) return { subscribed: false, reason: 'No pushManager' };
      try {
        const sub = await sw.pushManager.getSubscription();
        return sub ? { subscribed: true } : { subscribed: false, reason: 'Sin suscripción activa' };
      } catch (e) {
        return { subscribed: false, reason: e.message };
      }
    });
    console.log('🔍 CHECK 3 - Push:', pushStatus.subscribed ? '✅' : '❌ (' + (pushStatus.reason || 'falló') + ')');
    results.checks.push(`Push: ${pushStatus.subscribed ? 'OK' : 'FALLO'}`);
    if (!pushStatus.subscribed) results.errors.push(`Push: ${pushStatus.reason || 'Sin suscripción'}`);

    // CHECK 4: Token FCM
    const fcmToken = await page.evaluate(() => localStorage.getItem('fcmToken'));
    const fcmTokenTime = await page.evaluate(() => localStorage.getItem('fcmTokenTime'));
    
    let tokenAge = 'N/A';
    if (fcmTokenTime) {
      tokenAge = Math.round((Date.now() - parseInt(fcmTokenTime)) / 1000 / 60) + ' min';
    }
    
    console.log('🔍 CHECK 4 - FCM Token:', fcmToken ? `✅ (${fcmToken.length} chars, edad: ${tokenAge})` : '❌ FALLO');
    results.checks.push(`FCM: ${fcmToken ? 'OK' : 'FALLO'}`);
    if (!fcmToken) {
      results.errors.push('No hay token FCM - necesita solicitarse con requestFCMToken()');
    } else if (fcmTokenTime && Date.now() - parseInt(fcmTokenTime) > 7 * 24 * 60 * 60 * 1000) {
      results.errors.push('Token expirado (7+ días) - solicitar token nuevo');
    }

    // CHECK 5: Test de envío
    if (fcmToken) {
      const testResult = await page.evaluate(async (token) => {
        try {
          const res = await fetch('https://jiufptuxadjavjfbfwka.supabase.co/functions/v1/send-push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, title: '🧪 Test Móvil', body: 'Notificación de prueba', test: true })
          });
          const body = await res.text();
          return { status: res.status, ok: res.ok, body: body.substring(0, 100) };
        } catch (e) {
          return { error: e.message };
        }
      }, fcmToken);
      
      console.log('🔍 CHECK 5 - Edge Function:', testResult.status || testResult.error);
      results.checks.push(`Edge: ${testResult.status || 'ERROR'}`);
      if (!testResult.ok) {
        results.errors.push(`Edge: ${testResult.status} - ${testResult.body}`);
      }
    }

    // RESUMEN
    console.log('\n========== RESUMEN MÓVIL ==========');
    results.checks.forEach(c => console.log('  ✓', c));
    if (results.errors.length) {
      console.log('\n❌ PROBLEMAS DETECTADOS:');
      results.errors.forEach(e => console.log('  -', e));
      console.log('\n💡 SOLUCIONES RECOMENDADAS:');
      console.log('  1. Cerrar y abrir la app completamente en el móvil');
      console.log('  2. Ir a Configuración > Apps > Panel-Maria > Notificaciones');
      console.log('  3. Verificar que el permiso esté en "Permitido"');
      console.log('  4. Si sigue sin funcionar,Forzar actualización del token FCM');
    } else {
      console.log('\n✅ TODO OK - El móvil debería recibir notificaciones');
    }
  });
});

// ============================================
// TEST 3: Comparación de tokens en Supabase
// ============================================
test.describe('Push Notifications - Comparación DB', () => {
  
  test('Comparar tokens de todos los dispositivos', async ({ page }) => {
    console.log('\n🔍 COMPARACIÓN DE TOKENS EN BASE DE DATOS');
    console.log('=============================================');
    console.log('ℹ️  Este test verifica los tokens en Supabase');
    console.log('ℹ️  Ejecutar manualmente en Supabase SQL:');
    console.log('');
    console.log('SELECT');
    console.log("  CASE");
    console.log("    WHEN device_name LIKE '%Android%' THEN '📱 Móvil'");
    console.log("    WHEN device_name LIKE '%Windows%' THEN '🖥️ Desktop'");
    console.log("    ELSE '❓ Otro'");
    console.log('  END AS dispositivo,');
    console.log('  COUNT(*) as cantidad,');
    console.log('  MAX(created_at) as ultimo_registro');
    console.log('FROM fcm_tokens');
    console.log('GROUP BY 1');
    console.log('ORDER BY 2 DESC;');
    console.log('');
    console.log('ℹ️  Si hay muchos tokens viejos (>7 días) de móvil, esos dispositivos');
    console.log('    ya no reciben notificaciones - necesitan actualizar el token.');
  });
});