/**
 * Módulo de Check-ins de Bienestar
 * ================================
 * Maneja el sistema de check-ins emocionales y de energía
 */

import { data } from './data.js';
import { ui } from './ui.js';

class CheckinManager {
    constructor() {
        this.checkInterval = null;
    }

    // Obtener referencia al controller
    get controller() {
        return window.controller;
    }

    getConfig() {
        return {
            momentos: [
                { id: 'mañana', label: 'Mañana', hora: 10, icono: '🌅', pregunta: '¿Cómo amaneciste?' },
                { id: 'tarde', label: 'Tarde', hora: 15, icono: '🌞', pregunta: '¿Cómo va tu día?' },
                { id: 'noche', label: 'Noche', hora: 21, icono: '🌙', pregunta: '¿Cómo te sientes?' }
            ],
            opcionesEnergia: [
                { valor: 10, label: 'A tope', icono: '🔥' },
                { valor: 9, label: 'Explosiva', icono: '⚡' },
                { valor: 8, label: 'Activa', icono: '💪' },
                { valor: 7, label: 'Bien', icono: '🙂' },
                { valor: 6, label: 'Normal', icono: '😐' },
                { valor: 5, label: 'Regular', icono: '😌' },
                { valor: 4, label: 'Cansada', icono: '😔' },
                { valor: 3, label: 'Agotada', icono: '😴' },
                { valor: 2, label: 'Sin ganas', icono: '😞' },
                { valor: 1, label: 'Sin energía', icono: '💀' },
                { valor: 0, label: 'Ausente', icono: '⬛' }
            ],
            opcionesEmocion: [
                { valor: 'feliz', label: 'Feliz', icono: '😊' },
                { valor: 'contenta', label: 'Contenta', icono: '😄' },
                { valor: 'bien', label: 'Bien', icono: '🙂' },
                { valor: 'tranquila', label: 'Tranquila', icono: '😌' },
                { valor: 'neutral', label: 'Neutral', icono: '😐' },
                { valor: 'ansiosa', label: 'Ansiosa', icono: '😰' },
                { valor: 'triste', label: 'Triste', icono: '😢' },
                { valor: 'molesta', label: 'Molesta', icono: '😠' },
                { valor: 'frustrada', label: 'Frustrada', icono: '😤' },
                { valor: 'abrumada', label: 'Abrumada', icono: '😵' }
            ]
        };
    }

    async init() {
        try {
            await this.requestNotificationPermission();
            this.checkPendingCheckin();
            this.startChecker();
            console.log('✓ Sistema de check-in inicializado');
        } catch (error) {
            console.error('Error initCheckinSystem:', error);
        }
    }

    async requestNotificationPermission() {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'granted') return;
        if (Notification.permission === 'denied') return;
        
        const permission = await Notification.requestPermission();
        console.log('Permiso de notificaciones:', permission);
    }

    getCurrentMoment() {
        const hora = new Date().getHours();
        if (hora >= 5 && hora < 12) return 'mañana';
        if (hora >= 12 && hora < 18) return 'tarde';
        return 'noche';
    }

    getNextMoment() {
        const hora = new Date().getHours();
        if (hora < 10) return 'mañana';
        if (hora < 15) return 'tarde';
        return 'noche';
    }

    getCheckinId(momento, fecha) {
        const fechaStr = fecha || new Date().toISOString().split('T')[0];
        return `checkin_${momento}_${fechaStr}`;
    }

    async checkPendingCheckin() {
        if (!this.controller.currentUser) return;
        
        const momento = this.getCurrentMoment();
        const checkinId = this.getCheckinId(momento);
        
        try {
            const items = await data.getItems({ type: 'checkin' });
            const yaRespondio = items.some(item => item.meta?.checkin_id === checkinId);
            
            ui.toggleCheckinButton(!yaRespondio, momento);
            
            if (!yaRespondio) {
                this.scheduleNotification(momento);
            }
        } catch (error) {
            console.error('Error checkPendingCheckin:', error);
        }
    }

    async showModal(momento = null) {
        const momentoActual = momento || this.getCurrentMoment();
        const momentoConfig = this.getConfig().momentos.find(m => m.id === momentoActual);
        const ahora = new Date();
        
        const checkinData = {
            momento: momentoConfig,
            energia: this.getConfig().opcionesEnergia,
            emocion: this.getConfig().opcionesEmocion,
            timestamp: ahora.toISOString()
        };
        
        ui.showCheckinModal(checkinData);
    }

    async save(momento, energia, emocion, hora = null) {
        const fecha = new Date().toISOString().split('T')[0];
        const checkinId = this.getCheckinId(momento, fecha);
        
        const momentoConfig = this.getConfig().momentos.find(m => m.id === momento);
        const momentoLabel = momentoConfig ? momentoConfig.label : momento;
        
        let horaDespertar = null;
        let horaDormir = null;
        if (momento === 'mañana' && hora) {
            horaDespertar = hora;
        } else if (momento === 'noche' && hora) {
            horaDormir = hora;
        }

        const itemData = {
            content: `Check-in ${momentoLabel} - ${fecha}`,
            type: 'checkin',
            tags: ['salud', 'emocion', momento],
            meta: {
                energia: parseInt(energia),
                emocion: emocion,
                momento: momento,
                checkin_id: checkinId,
                horaDespertar: horaDespertar,
                horaDormir: horaDormir,
                timestamp: new Date().toISOString()
            }
        };

        if (!this.controller.currentUser) {
            const localCheckins = JSON.parse(localStorage.getItem('checkins_local') || '[]');
            localCheckins.push(itemData);
            localStorage.setItem('checkins_local', JSON.stringify(localCheckins));
            ui.showNotification('Check-in guardado localmente (inicia sesión para sincronizar)', 'success');
            return true;
        }

        try {
            await data.createItem(itemData);
            ui.showNotification('¡Check-in guardado! 💚', 'success');
            ui.toggleCheckinButton(false);
            return true;
        } catch (error) {
            console.error('Error saveCheckin:', error);
            ui.showNotification('Error al guardar check-in.', 'error');
            return false;
        }
    }

    async getHistory(dias = 7) {
        try {
            const items = await data.getItems({ type: 'checkin' });
            const limite = new Date();
            limite.setDate(limite.getDate() - dias);
            
            return items.filter(item => 
                new Date(item.created_at) >= limite &&
                item.meta?.energia !== undefined
            );
        } catch (error) {
            console.error('Error getCheckinHistory:', error);
            return [];
        }
    }

    calculateTrend(checkins, periodo = 'semana') {
        if (!checkins || checkins.length === 0) return { energia: [], emocion: [] };
        
        const grouped = { energia: {}, emocion: {} };
        
        checkins.forEach(checkin => {
            const momento = checkin.meta?.momento;
            if (!momento) return;
            
            if (!grouped.energia[momento]) {
                grouped.energia[momento] = { suma: 0, count: 0 };
            }
            grouped.energia[momento].suma += parseInt(checkin.meta.energia) || 0;
            grouped.energia[momento].count++;
            
            if (checkin.meta?.emocion) {
                if (!grouped.emocion[momento]) {
                    grouped.emocion[momento] = {};
                }
                const emo = checkin.meta.emocion;
                grouped.emocion[momento][emo] = (grouped.emocion[momento][emo] || 0) + 1;
            }
        });
        
        const energiaTrend = Object.entries(grouped.energia).map(([momento, data]) => ({
            momento,
            promedio: Math.round((data.suma / data.count) * 10) / 10,
            count: data.count
        }));
        
        const emocionTrend = Object.entries(grouped.emocion).map(([momento, emociones]) => ({
            momento,
            dominante: Object.entries(emociones).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral'
        }));
        
        return { energia: energiaTrend, emocion: emocionTrend };
    }

    scheduleNotification(momento) {
        const momentoConfig = this.getConfig().momentos.find(m => m.id === momento);
        if (!momentoConfig) return;
        
        const ahora = new Date();
        const horaObjetivo = momentoConfig.hora;
        
        let horaNotificacion = new Date(ahora);
        horaNotificacion.setHours(horaObjetivo, 0, 0, 0);
        
        if (horaNotificacion <= ahora) {
            horaNotificacion.setDate(horaNotificacion.getDate() + 1);
        }
        
        const tiempoEspera = horaNotificacion - ahora;
        
        setTimeout(() => {
            this.showNotification(momento);
        }, tiempoEspera);
        
        console.log(`Notificación de check-in programada para ${horaNotificacion.toLocaleString()}`);
    }

    showNotification(momento) {
        const momentoConfig = this.getConfig().momentos.find(m => m.id === momento);
        if (!momentoConfig) return;
        
        if (Notification.permission === 'granted') {
            const notification = new Notification('💭 Check-in de Bienestar', {
                body: momentoConfig.pregunta,
                icon: './src/assets/icon-192.png',
                tag: 'checkin',
                requireInteraction: true
            });
            
            notification.onclick = () => {
                window.focus();
                this.showModal(momento);
                notification.close();
            };
        }
        
        this.scheduleNotification(momento);
    }

    startChecker() {
        this.checkInterval = setInterval(() => {
            this.checkPendingCheckin();
        }, 60000);
    }

    stopChecker() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
    }
}

export const checkins = new CheckinManager();
