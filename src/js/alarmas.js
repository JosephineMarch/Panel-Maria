/**
 * Módulo de Alarmas 2.0 (Server-side Cron)
 * =================
 * Maneja notificaciones locales y snooze.
 * Las push notifications con app cerrada las maneja el cron del servidor (pg_cron + check-alarms edge function).
 */

import { data } from './data.js';
import { ui } from './ui.js';

class AlarmManager {
    constructor() {
        this.snoozeTimers = new Map();
    }

    get controller() {
        return window.controller;
    }

    start() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
        // Server-side cron handles push notifications.
        // Local notifications only work with tab open.
    }

    stop() {
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

    async triggerAlarm(item) {
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

        this.snoozeTimers.set(itemId, setTimeout(() => {
            this.snoozeTimers.delete(itemId);
            this.triggerAlarm(item);
        }, minutes * 60 * 1000));

        ui.showNotification(`⏱️ Te recuerdo en ${minutes} minutos`, 'success');
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
