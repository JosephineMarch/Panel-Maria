/**
 * KAI - Aplicación de Panel Maria
 * Puente de entrada principal.
 */
import './src/js/logic.js';
import './src/js/share.js';

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => {
                console.log('🧠 KAI: Service Worker registrado ✨');
                
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            if (confirm('¡Nueva versión disponible! ¿Recargar para actualizar?')) {
                                window.location.reload();
                            }
                        }
                    });
                });
            })
            .catch(err => console.error('Error registrando SW:', err));
    });
}

if (window.matchMedia('(display-mode: standalone)').matches) {
    document.body.classList.add('app-installed');
    console.log('📱 KAI: Ejecutando como app instalada');
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
