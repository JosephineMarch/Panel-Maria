/**
 * KAI - Aplicación de Panel Maria
 * Puente de entrada principal.
 */
import './src/js/logic.js';
import './src/js/share.js';
import './src/js/alarmas.js';
import { requestFCMToken, refreshFCMTokenIfNeeded, onForegroundMessage, startTokenRefreshListener, getStoredFCMToken } from './src/js/firebase.js';

// Exponer alarms globalmente para los botones de snooze en HTML
import { alarms } from './src/js/alarmas.js';
window.alarms = alarms;

// Iniciar el sistema de alarmas
alarms.start();

const CACHE_VERSION = 'v16';

let hasReloaded = false;
let fcmInitialized = false;

/**
 * Envía una notificación de bienvenida usando la edge function de Supabase
 * @param {string} token - Token FCM del dispositivo
 */
async function sendWelcomeNotification(token) {
    try {
        const SUPABASE_URL = 'https://jiufptuxadjavjfbfwka.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppdWZwdHV4YWRqYXZqZmJmd2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwODY0NzgsImV4cCI6MjA4NTY2MjQ3OH0.LCXYWsmD-ZM45O_HNVwFHu8dJFzxns3Zd_2BHusm2CY';

        const response = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({
                token: token,
                title: '🎉 Bienvenido a KAI',
                body: 'Tu segundo cerebro para organizar tu vida con TDAH. ¡Explora y descubre cómo KAI puede ayudarte!',
                type: 'welcome',
                priority: 'normal'
            })
        });

        const result = await response.json();
        if (response.ok) {
            console.log('✅ Notificación de bienvenida enviada:', result);
        } else {
            console.error('❌ Error enviando notificación de bienvenida:', result);
        }
    } catch (error) {
        console.error('❌ Error en sendWelcomeNotification:', error);
    }
}

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
            onForegroundMessage();
            startTokenRefreshListener();

            // Token refresh automático: compara token actual con guardado y actualiza si cambió
            refreshFCMTokenIfNeeded().then(async (token) => {
                if (token) {
                    console.log('✅ FCM token listo (existente o refrescado)');
                    
                    // Verificar si es la primera instalación
                    const hasSeenWelcome = localStorage.getItem('kai_welcome_shown');
                    if (!hasSeenWelcome) {
                        console.log('🎉 Primera instalación detectada, enviando notificación de bienvenida...');
                        await sendWelcomeNotification(token);
                        localStorage.setItem('kai_welcome_shown', 'true');
                        console.log('✅ Marca de bienvenida establecida');
                    } else {
                        console.log('ℹ️ Ya se mostró la notificación de bienvenida anteriormente');
                    }
                }
            });

            if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
                const requestTokenOnInteraction = () => {
                    document.removeEventListener('click', requestTokenOnInteraction);
                    document.removeEventListener('touchstart', requestTokenOnInteraction);
                    requestFCMToken().then(token => {
                        if (token) console.log('✅ FCM token obtenido tras interacción');
                    });
                };
                document.addEventListener('click', requestTokenOnInteraction, { once: true });
                document.addEventListener('touchstart', requestTokenOnInteraction, { once: true });
            }

            // Escuchar mensajes del Service Worker (Snooze, Checkins, etc.)
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'ALARM_SNOOZE') {
                    if (window.alarms && window.alarms.snooze) {
                        window.alarms.snooze(event.data.itemId, event.data.minutes);
                    }
                } else if (event.data && event.data.type === 'OPEN_CHECKIN') {
                    if (window.controller && window.controller.showCheckinModal) {
                        window.controller.showCheckinModal(event.data.momento);
                    }
                } else if (event.data && event.data.type === 'FCM_SW_LOG') {
                    console.log('🚨 MISTERIO RESUELTO: El Push SÍ LLEGÓ, pero Firebase lo mandó al ServiceWorker (Background) porque no tenías el foco en la página (Estabas en DevTools):', event.data.data);
                }
            });
        }
    });
}

// Manejo de URLs
window.addEventListener('DOMContentLoaded', () => {
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
    } else if (action === 'checkin') {
        const momento = urlParams.get('momento');
        setTimeout(() => {
            if (window.controller && window.controller.showCheckinModal) {
                window.controller.showCheckinModal(momento);
            }
        }, 1000);
    }
});
