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

if (window.matchMedia('(display-mode: standalone)').matches) {
    document.body.classList.add('app-installed');
}

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
    }
});
