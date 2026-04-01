/**
 * Módulo de Alarmas 2.0
 * =================
 * Maneja alarmas con polling local (cada 30s) para notificaciones con pestaña abierta.
 * También intenta enviar push notifications vía edge function (funciona con internet).
 * El servidor (pg_cron + check-alarms) maneja las push con app cerrada.
 */

import { data } from './data.js';
import { ui } from './ui.js';
import { supabase } from './supabase.js';

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

        // Polling local: funciona con pestaña abierta
        this.checkAlarms();
        this.checkInterval = setInterval(() => {
            this.checkAlarms();
        }, 30000);
    }

    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        this.snoozeTimers.forEach(timer => clearTimeout(timer));
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
            titulo: item.content || '',
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
        const content = item.content || 'Tienes algo pendiente';
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
            if (!('Notification' in window)) return;

            const items = await data.getItems({});
            if (!items || items.length === 0) return;

            const now = Date.now();
            const triggeredIds = JSON.parse(localStorage.getItem('triggeredAlarms') || '[]');
            const alarmTimestamps = JSON.parse(localStorage.getItem('alarmTimestamps') || '{}');

            // Limpiar triggeredIds viejos (más de 24h)
            const validTriggeredIds = [];
            for (const id of triggeredIds) {
                const lastTriggered = alarmTimestamps[id] || 0;
                if (now - lastTriggered < 24 * 60 * 60 * 1000) {
                    validTriggeredIds.push(id);
                }
            }

            for (const item of items) {
                if (!item.deadline) continue;

                let deadlineTime;
                if (typeof item.deadline === 'number') deadlineTime = item.deadline;
                else if (typeof item.deadline === 'string') deadlineTime = new Date(item.deadline).getTime();
                else continue;

                // Disparar cuando el deadline está a menos de 60s en el futuro o ya pasó (pero no hace más de 5min)
                const timeDiff = deadlineTime - now;
                if (timeDiff <= 60000 && timeDiff > -300000) {
                    if (!validTriggeredIds.includes(item.id)) {
                        console.log(`⏰ Alarma disparada: ${item.content} (deadline: ${new Date(deadlineTime).toLocaleString()})`);

                        // 1) Intentar push notification (con internet funciona)
                        await this.sendPushNow(item);

                        // 2) Notificación local (siempre funciona con pestaña abierta)
                        this.triggerAlarm(item);

                        // 3) Si es repetición, avanzar deadline al próximo ciclo
                        if (item.repeat) {
                            await this.advanceRepeatDeadline(item);
                        }

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

    async sendPushNow(item) {
        // Intenta enviar push notification INMEDIATAMENTE
        // Si no hay internet o la edge function falla, la notificación local igual funciona
        try {
            const { error } = await supabase.functions.invoke('check-alarms', {
                body: { force: true, itemId: item.id }
            });

            if (error) {
                console.warn('🔔 Push falló (offline o edge function error):', error.message);
            } else {
                console.log('✅ Push notification enviada');
            }
        } catch (err) {
            console.warn('🔔 Push falló (offline?):', err.message);
        }
    }

    triggerAlarm(item) {
        try {
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
                    <p class="font-bold text-lg">${item.content || 'Recordatorio'}</p>
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

        this.snoozeTimers.set(itemId, setTimeout(() => {
            this.snoozeTimers.delete(itemId);
            this.triggerAlarm(item);
        }, minutes * 60 * 1000));

        ui.showNotification(`⏱️ Te recuerdo en ${minutes} minutos`, 'success');
    }

    async advanceRepeatDeadline(item) {
        const currentDeadline = new Date(item.deadline).getTime();
        let nextDeadline;

        switch (item.repeat) {
            case 'daily':
                nextDeadline = currentDeadline + 24 * 60 * 60 * 1000;
                break;
            case 'weekly':
                nextDeadline = currentDeadline + 7 * 24 * 60 * 60 * 1000;
                break;
            case 'monthly':
                const d = new Date(item.deadline);
                d.setMonth(d.getMonth() + 1);
                nextDeadline = d.getTime();
                break;
            default:
                return;
        }

        await data.updateItem(item.id, { deadline: nextDeadline });

        // Limpiar de triggeredAlarms para que pueda dispararse de nuevo
        const triggeredIds = JSON.parse(localStorage.getItem('triggeredAlarms') || '[]');
        const newTriggeredIds = triggeredIds.filter(id => id !== item.id);
        localStorage.setItem('triggeredAlarms', JSON.stringify(newTriggeredIds));

        const alarmTimestamps = JSON.parse(localStorage.getItem('alarmTimestamps') || '{}');
        delete alarmTimestamps[item.id];
        localStorage.setItem('alarmTimestamps', JSON.stringify(alarmTimestamps));

        console.log(`🔄 Repetición ${item.repeat}: próximo deadline ${new Date(nextDeadline).toLocaleString()}`);
    }

    async setRepeat(itemId, repeatType) {
        console.log(`🔄 Repetición: ${repeatType} para ${itemId}`);
        
        await data.updateItem(itemId, { repeat: repeatType });
        
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
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2tleQQAKpzm');
            audio.volume = 0.5;
            audio.play().catch(() => {});
        } catch (e) {}
    }
}

export const alarms = new AlarmManager();
