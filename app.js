/**
 * KAI - Aplicación de Panel Maria
 * Puente de entrada principal.
 */
import './src/js/logic.js';
import './src/js/share.js';
import { requestFCMToken, onForegroundMessage } from './src/js/firebase.js';

const CACHE_VERSION = 'v8';

let hasReloaded = false;
let fcmInitialized = false;

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register(`./sw.js?cache=${CACHE_VERSION}`)
            .then(reg => {
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller && !hasReloaded) {
                            hasReloaded = true;
                            window.location.reload();
                        }
                    });
                });
            })
            .catch(err => console.error('Error registering SW:', err));
        
        if ('PushManager' in window && !fcmInitialized) {
            fcmInitialized = true;
            setTimeout(() => {
                requestFCMToken().then(() => {
                    onForegroundMessage();
                }).catch(err => console.error('FCM init error:', err));
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
