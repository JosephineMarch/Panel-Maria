/**
 * Módulo de Alarmas
 * =================
 * Maneja la programación y verificación de alarmas/notificaciones
 */

import { data } from './data.js';

class AlarmManager {
    constructor() {
        this.checkInterval = null;
    }

    // Obtener referencia al controller
    get controller() {
        return window.controller;
    }

    start() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        this.scheduleAllAlarms();
        this.checkAlarms();

        // Verificar cada 30 segundos
        this.checkInterval = setInterval(() => {
            this.scheduleAllAlarms();
            this.checkAlarms();
        }, 30000);
    }

    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
    }

    async scheduleAllAlarms() {
        try {
            // Solo funcionan con usuario logueado
            const controller = this.controller;
            if (!controller || !controller.currentUser) {
                return;
            }

            const items = await data.getItems({});

            const scheduledIds = JSON.parse(localStorage.getItem('scheduledAlarms') || '[]');
            const now = Date.now();

            for (const item of items) {
                if (!item.deadline || scheduledIds.includes(item.id)) continue;

                let deadlineTime;
                if (typeof item.deadline === 'number') {
                    deadlineTime = item.deadline;
                } else if (typeof item.deadline === 'string') {
                    deadlineTime = new Date(item.deadline).getTime();
                } else {
                    continue;
                }

                const reminderTime = deadlineTime - 60000; // 1 minuto antes

                if (deadlineTime > now && deadlineTime - now < 7 * 24 * 60 * 60 * 1000) {
                    await this.scheduleTriggerNotification(item, reminderTime, deadlineTime);
                    scheduledIds.push(item.id);
                }
            }

            localStorage.setItem('scheduledAlarms', JSON.stringify(scheduledIds));
        } catch (error) {
            console.error('Error scheduling alarms:', error);
        }
    }

    async scheduleTriggerNotification(item, reminderTime, deadlineTime) {
        try {
            const fcmToken = localStorage.getItem('fcmToken');
            if (!fcmToken) {
                console.warn('🔔 No hay FCM token, saltando notificación');
                return;
            }

            const { data, error } = await supabase.functions.invoke('send-push', {
                body: {
                    token: fcmToken,
                    title: '⏰ KAI - Recordatorio',
                    body: item.content || item.titulo || 'Tienes una tarea pendiente',
                    timestamp: deadlineTime - 60000,
                    itemId: item.id
                }
            });

            if (error) {
                console.error('🔔 Error enviando notificación:', error);
            } else {
                console.log(`🔔 Notificación programada para ${new Date(deadlineTime - 60000).toLocaleString()}`);
            }
        } catch (err) {
            console.error('🔔 Error en scheduleTriggerNotification:', err);
        }
    }

    async checkAlarms() {
        try {
            // Solo funcionan con usuario logueado
            const controller = this.controller;
            if (!controller || !controller.currentUser) {
                return;
            }

            const items = await data.getItems({});

            const now = Date.now();
            const triggeredIds = JSON.parse(localStorage.getItem('triggeredAlarms') || '[]');
            const alarmTimestamps = JSON.parse(localStorage.getItem('alarmTimestamps') || '{}');

            // Limpiar alarmas de más de 24 horas
            const validTriggeredIds = [];
            for (const id of triggeredIds) {
                const lastTriggered = alarmTimestamps[id] || 0;
                if (now - lastTriggered < 24 * 60 * 60 * 1000) {
                    validTriggeredIds.push(id);
                }
            }
            localStorage.setItem('triggeredAlarms', JSON.stringify(validTriggeredIds));

            for (const item of items) {
                if (!item.deadline) continue;

                let deadlineTime;
                if (typeof item.deadline === 'number') {
                    deadlineTime = item.deadline;
                } else if (typeof item.deadline === 'string') {
                    deadlineTime = new Date(item.deadline).getTime();
                } else {
                    continue;
                }

                // Trigger 1 minuto antes
                if (deadlineTime - now <= 60000 && deadlineTime - now > 0) {
                    if (!validTriggeredIds.includes(item.id)) {
                        await this.triggerAlarm(item);
                        validTriggeredIds.push(item.id);
                        alarmTimestamps[item.id] = now;
                    }
                }
            }

            localStorage.setItem('triggeredAlarms', JSON.stringify(validTriggeredIds));
            localStorage.setItem('alarmTimestamps', JSON.stringify(alarmTimestamps));
        } catch (error) {
            console.error('Error checking alarms:', error);
        }
    }

    async triggerAlarm(item) {
        try {
            // Mostrar notificación del sistema
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('⏰ KAI - Recordatorio', {
                    body: item.content || 'Tienes una tarea pendiente',
                    icon: '/icon-192.png',
                    tag: item.id,
                    requireInteraction: true
                });
            }

            // Reproducir sonido
            this.playAlarmSound();

            // Mostrar en la UI
            this.showAlarmNotification(item);
        } catch (error) {
            console.error('Error triggering alarm:', error);
        }
    }

    showAlarmNotification(item) {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-pulse';
        notification.innerHTML = `
            <span class="text-2xl">⏰</span>
            <div>
                <p class="font-bold">Recordatorio</p>
                <p>${item.content || item.titulo || 'Tarea pendiente'}</p>
            </div>
            <button onclick="this.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">✕</button>
        `;
        document.body.appendChild(notification);

        // Auto-remover después de 30 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 30000);
    }

    playAlarmSound() {
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQQAKpzm');
            audio.volume = 0.5;
            audio.play().catch(() => {}); // Silenciar errores
        } catch (e) {
            // Ignorar errores de audio
        }
    }
}

export const alarms = new AlarmManager();
