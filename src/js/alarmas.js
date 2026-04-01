/**
 * Módulo de Alarmas 2.0
 * =================
 * Maneja la programación y verificación de alarmas/notificaciones
 * con soporte para repetición, snooze y enrichment
 */

import { data } from './data.js';

class AlarmManager {
    constructor() {
        this.checkInterval = null;
        this.snoozeTimers = new Map();
    }

    get controller() {
        return window.controller;
    }

    start() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        this.scheduleAllAlarms();
        this.checkAlarms();

        this.checkInterval = setInterval(() => {
            this.scheduleAllAlarms();
            this.checkAlarms();
        }, 30000);
    }

    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        this.snoozeTimers.forEach(timer => clearTimeout(timer));
    }

    async scheduleAllAlarms() {
        try {
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

                const reminderTime = deadlineTime - 60000;

                if (deadlineTime > now && deadlineTime - now < 7 * 24 * 60 * 60 * 1000) {
                    await this.schedulePushNotification(item, reminderTime, deadlineTime);
                    scheduledIds.push(item.id);
                }
            }

            localStorage.setItem('scheduledAlarms', JSON.stringify(scheduledIds));
        } catch (error) {
            console.error('Error scheduling alarms:', error);
        }
    }

    async schedulePushNotification(item, reminderTime, deadlineTime) {
        try {
            const { data: tokensData } = await supabase
                .from('fcm_tokens')
                .select('token');
            
            const tokens = tokensData?.map(t => t.token) || [];
            if (tokens.length === 0) {
                console.warn('🔔 No hay FCM tokens, saltando notificación');
                return;
            }

            const extraData = this.buildEnrichmentData(item);

            const { data: response, error } = await supabase.functions.invoke('send-push', {
                body: {
                    token: tokens[0],
                    title: this.formatTitle(item),
                    body: this.formatBody(item),
                    timestamp: deadlineTime - 60000,
                    itemId: item.id,
                    repeat: item.repeat || null,
                    data: extraData
                }
            });

            if (error) {
                console.error('🔔 Error enviando notificación:', error);
            } else {
                console.log(`🔔 Notificación programada para ${new Date(deadlineTime - 60000).toLocaleString()}`);
                if (item.repeat) {
                    console.log(`🔄 Repetición: ${item.repeat}`);
                }
            }
        } catch (err) {
            console.error('🔔 Error en schedulePushNotification:', err);
        }
    }

    buildEnrichmentData(item) {
        const tags = item.tags || [];
        const hasUrgente = tags.includes('urgente') || tags.includes('importante');
        
        return {
            type: 'alarm',
            priority: hasUrgente ? 'high' : 'normal',
            category: tags.includes('salud') ? 'salud' : 
                      tags.includes('trabajo') ? 'trabajo' : 
                      tags.includes('personal') ? 'personal' : 'general',
            repeat: item.repeat || null,
            hasSnooze: true,
            titulo: item.content || item.titulo || '',
            deadline: item.deadline
        };
    }

    formatTitle(item) {
        const tags = item.tags || [];
        if (tags.includes('urgente') || tags.includes('importante')) {
            return '⚠️ URGENTE - KAI';
        }
        if (tags.includes('salud')) {
            return '💊 KAI - Salud';
        }
        if (tags.includes('trabajo')) {
            return '💼 KAI - Trabajo';
        }
        return '⏰ KAI - Recordatorio';
    }

    formatBody(item) {
        const content = item.content || item.titulo || 'Tienes algo pendiente';
        const repeat = item.repeat;
        
        if (repeat === 'daily') {
            return `${content} (diario)`;
        }
        if (repeat === 'weekly') {
            return `${content} (semanal)`;
        }
        if (repeat === 'monthly') {
            return `${content} (mensual)`;
        }
        return content;
    }

    async checkAlarms() {
        try {
            const controller = this.controller;
            if (!controller || !controller.currentUser) {
                return;
            }

            const items = await data.getItems({});
            const now = Date.now();
            const triggeredIds = JSON.parse(localStorage.getItem('triggeredAlarms') || '[]');
            const alarmTimestamps = JSON.parse(localStorage.getItem('alarmTimestamps') || '{}');

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
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(this.formatTitle(item), {
                    body: this.formatBody(item),
                    icon: '/icon-192.png',
                    tag: item.id,
                    requireInteraction: true,
                    vibrate: [200, 100, 200, 100, 200]
                });
            }

            this.playAlarmSound();
            this.showAlarmNotification(item);
        } catch (error) {
            console.error('Error triggering alarm:', error);
        }
    }

    showAlarmNotification(item) {
        const notification = document.createElement('div');
        notification.id = `alarm-notification-${item.id}`;
        notification.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-gradient-to-r from-rose-500 to-pink-500 text-white px-6 py-4 rounded-xl shadow-2xl flex flex-col gap-3 animate-pulse';
        notification.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="text-3xl">⏰</span>
                <div class="flex-1">
                    <p class="font-bold text-lg">${item.content || item.titulo || 'Recordatorio'}</p>
                    <p class="text-sm opacity-90">${this.formatDeadline(item.deadline)}</p>
                </div>
                <button onclick="this.closest('.alarm-notification').remove()" class="text-white hover:text-gray-200 text-xl">✕</button>
            </div>
            <div class="flex gap-2 mt-2">
                <button onclick="window.alarms.snooze('${item.id}', 5)" class="flex-1 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition">
                    ⏱️ 5 min
                </button>
                <button onclick="window.alarms.snooze('${item.id}', 10)" class="flex-1 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition">
                    ⏱️ 10 min
                </button>
                <button onclick="window.alarms.snooze('${item.id}', 30)" class="flex-1 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition">
                    ⏱️ 30 min
                </button>
            </div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 60000);
    }

    async snooze(itemId, minutes = 10) {
        console.log(`💤 Snooze: ${minutes} minutos para ${itemId}`);
        
        const notificationEl = document.getElementById(`alarm-notification-${itemId}`);
        if (notificationEl) {
            notificationEl.remove();
        }

        const items = await data.getItems({});
        const item = items.find(i => i.id === itemId);
        
        if (!item) return;

        const snoozeTime = Date.now() + (minutes * 60 * 1000);

        const { data: tokensData } = await supabase
            .from('fcm_tokens')
            .select('token');
        
        const tokens = tokensData?.map(t => t.token) || [];
        
        if (tokens.length > 0) {
            const extraData = this.buildEnrichmentData(item);
            extraData.snooze = true;
            extraData.snoozeMinutes = minutes;

            await supabase.functions.invoke('send-push', {
                body: {
                    token: tokens[0],
                    title: `⏰ KAI - Recordatorio (${minutes}min)`,
                    body: item.content || item.titulo || 'Recordatorio',
                    timestamp: snoozeTime,
                    itemId: item.id,
                    snooze: true,
                    data: extraData
                }
            });
        }

        this.snoozeTimers.set(itemId, setTimeout(() => {
            this.triggerAlarm(item);
        }, minutes * 60 * 1000));

        ui.showNotification(`⏱️ Te recuerdo en ${minutes} minutos`, 'success');
    }

    async setRepeat(itemId, repeatType) {
        console.log(`🔄设置 repetition: ${repeatType} para ${itemId}`);
        
        await data.updateItem(itemId, { repeat: repeatType });
        
        const scheduledIds = JSON.parse(localStorage.getItem('scheduledAlarms') || '[]');
        const newScheduledIds = scheduledIds.filter(id => id !== itemId);
        localStorage.setItem('scheduledAlarms', JSON.stringify(newScheduledIds));
        
        await this.scheduleAllAlarms();
        
        const repeatNames = {
            daily: 'diario',
            weekly: 'semanal', 
            monthly: 'mensual'
        };
        
        ui.showNotification(`🔄 Repetición ${repeatNames[repeatType] || repeatType} activada`, 'success');
    }

    async cancelAlarm(itemId) {
        console.log(`🗑️ Cancelando alarma: ${itemId}`);
        
        await data.updateItem(itemId, { deadline: null, repeat: null });
        
        const scheduledIds = JSON.parse(localStorage.getItem('scheduledAlarms') || '[]');
        const newScheduledIds = scheduledIds.filter(id => id !== itemId);
        localStorage.setItem('scheduledAlarms', JSON.stringify(newScheduledIds));
        
        ui.showNotification('🗑️ Alarma cancelada', 'success');
    }

    async getActiveAlarms() {
        const items = await data.getItems({});
        return items.filter(item => item.deadline && new Date(item.deadline).getTime() > Date.now());
    }

    formatDeadline(deadline) {
        if (!deadline) return '';
        
        const deadlineTime = typeof deadline === 'number' ? deadline : new Date(deadline).getTime();
        const date = new Date(deadlineTime);
        
        const now = new Date();
        const diff = deadlineTime - now.getTime();
        
        if (diff < 0) return 'Vencida';
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 60) return `en ${minutes} min`;
        if (hours < 24) return `en ${hours} horas`;
        return `el ${date.toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    }

    playAlarmSound() {
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQQAKpzm');
            audio.volume = 0.5;
            audio.play().catch(() => {});
        } catch (e) {}
    }
}

export const alarms = new AlarmManager();
