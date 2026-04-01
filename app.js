/**
 * KAI - Aplicación de Panel Maria
 * Puente de entrada principal.
 */
import './src/js/logic.js';
import './src/js/share.js';
import './src/js/alarmas.js';
import { requestFCMToken, onForegroundMessage } from './src/js/firebase.js';

// Exponer alarms globalmente para los botones de snooze en HTML
import { alarms } from './src/js/alarmas.js';
window.alarms = alarms;

// Iniciar el sistema de alarmas
alarms.start();

const CACHE_VERSION = 'v10';

let hasReloaded = false;
let fcmInitialized = false;

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register(`./sw.js?cache=${CACHE_VERSION}`)
            .then(reg => {
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    newWorker.addEventListener('statechange', () => {
                        // Solo recargar si hay controlador anterior (es una actualización)
                        // y no hemos recargado en los últimos 10 segundos (safeguard)
                        const lastReload = sessionStorage.getItem('last_sw_reload');
                        const now = Date.now();
                        const recentlyReloaded = lastReload && (now - parseInt(lastReload) < 10000);

                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller && !recentlyReloaded) {
                            sessionStorage.setItem('last_sw_reload', now.toString());
                            window.location.reload();
                        }
                    });
                });
            })
            .catch(err => console.error('Error registering SW:', err));

        if ('PushManager' in window && !fcmInitialized) {
            fcmInitialized = true;
            // Quitamos la petición obligatoria al inicio (Bloqueado por iOS Safari)
            // requestFCMToken se llamará cuando el usuario intente crear una alarma explícitamente.
            setTimeout(() => {
                onForegroundMessage();
            }, 2000);
        }
    });
}

// 🔧 BOTONES DE DIAGNÓSTICO Y TEST (ya están en el HTML)
window.addEventListener('DOMContentLoaded', () => {
    // Botón Diagnóstico Push
    document.getElementById('btn-diagnostico')?.addEventListener('click', async () => {
        console.log('📱 DIAGNÓSTICO DE PUSH NOTIFICATIONS');
        console.log('=====================================');
        
        const perm = Notification.permission;
        console.log('🔍 Permiso:', perm);
        
        const regs = await navigator.serviceWorker.getRegistrations();
        const sw = regs.find(r => r.active?.scriptURL.includes('sw.js'));
        console.log('🔍 Service Worker:', sw ? '✅ OK' : '❌ NO');
        
        if (sw?.pushManager) {
            const sub = await sw.pushManager.getSubscription();
            console.log('🔍 Push:', sub ? '✅ OK' : '❌ NO');
        }
        
        const token = localStorage.getItem('fcmToken');
        console.log('🔍 FCM Token:', token ? `✅ (${token.length} chars)` : '❌ NO');
        
        const tokenTime = localStorage.getItem('fcmTokenTime');
        if (tokenTime) {
            const days = Math.round((Date.now() - parseInt(tokenTime)) / 1000 / 60 / 60 / 24);
            console.log('🔍 Token edad:', days, 'días');
        }
        
        if (token) {
            try {
                const res = await fetch('https://jiufptuxadjavjfbfwka.supabase.co/functions/v1/send-push', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({token, title: '🧪 Test Push', body: 'Notificación de prueba', test: true})
                });
                console.log('🔍 Edge:', res.status === 200 ? '✅ OK' : '❌ ' + res.status);
                alert(`Diagnóstico:\nPermiso: ${perm}\nSW: ${sw ? '✅' : '❌'}\nToken: ${token ? '✅' : '❌'}\nEdge: ${res.status === 200 ? '✅' : '❌'}`);
            } catch (e) {
                console.log('🔍 Edge:', e.message);
            }
        }
    });
    
    // Botón Test Alarma 30s
    document.getElementById('btn-test-alarma')?.addEventListener('click', async () => {
        const { alarms } = await import('./src/js/alarmas.js');
        const item = {
            id: 'test-' + Date.now(),
            content: '🧪 Alarma de prueba',
            deadline: Date.now() + 35000,
            tags: ['test'],
            meta: { priority: 'high' }
        };
        await alarms.schedulePushNotification(item, Date.now() + 30000, Date.now() + 35000);
        console.log('⏰ Alarma programada para 30 segundos');
        alert('⏰ Alarma creada! Sonará en 30 segundos');
    });

    // Manejo de URLs
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const type = urlParams.get('type');

    if (action === 'new' && type) {
        setTimeout(() => {
            const input = document.getElementById('item-input');
            const typeSelect = document.getElementById('item-type');
            if (input && typeSelect) {
                typeSelect.value = type;
                input.focus();
            }
        }, 500);
    }
});
