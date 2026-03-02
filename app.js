/**
 * KAI - Aplicación de Panel Maria
 * Puente de entrada principal.
 */
import './src/js/logic.js';
import './src/js/share.js';
import { requestFCMToken, onForegroundMessage } from './src/js/firebase.js';

const CACHE_VERSION = 'v7';

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register(`./sw.js?cache=${CACHE_VERSION}`)
            .then(reg => {
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            window.location.reload();
                        }
                    });
                });
            })
            .catch(err => console.error('Error registering SW:', err));
        
        if ('PushManager' in window) {
            setTimeout(() => {
                requestFCMToken().then(() => {
                    onForegroundMessage();
                });
            }, 1000);
        }
    });
}
                    });
                });
            })
            .catch(err => console.error('Error registrando SW:', err));
        
        if ('PushManager' in window) {
            navigator.serviceWorker.register('./firebase-messaging-sw.js')
                .then(reg => {
                    console.log('Firebase Messaging SW registrado');
                    requestFCMToken();
                    onForegroundMessage();
                })
                .catch(err => console.error('Error registrando Firebase Messaging SW:', err));
        }
    });
}

if (window.matchMedia('(display-mode: standalone)').matches) {
    document.body.classList.add('app-installed');
    // console.log('📱 KAI: Ejecutando como app instalada');
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
