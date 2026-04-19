/**
 * Módulo de Sección HOY
 * =====================
 * Maneja: check-ins, ¿Qué hice hoy?
 * 
 * Lógica nueva:
 * - Las tareas se guardan en localStorage durante el día
 * - A las 11:59 PM (o al detectar nuevo día) se crea una card en la tabla items
 */

import { supabase } from './supabase.js';
import { data } from './data.js';
import { ui } from './ui.js';

class HoyManager {
    constructor() {
        this.currentDate = new Date().toISOString().split('T')[0];
        this.lastFinalizedDate = localStorage.getItem('hoy_finalized_date') || null;
        this.schedulerInterval = null;
        
        // Iniciar scheduler para 11:58 PM
        this.startScheduler();
    }

    // ==================== SCHEDULER DE 11:58 PM ====================
    
    startScheduler() {
        // Revisar cada minuto si es hora de crear la card
        this.schedulerInterval = setInterval(() => {
            this.checkSchedule();
        }, 60000); // Cada 60 segundos
        
        // También revisar inmediatamente al iniciar (con delay para que cargue todo)
        setTimeout(() => this.checkSchedule(), 3000);
        
        console.log('[HOY] Scheduler iniciado');
    }

    checkSchedule() {
        const now = new Date();
        const hora = now.getHours();
        const minutos = now.getMinutes();
        const horaActual = hora * 60 + minutos;
        
        // 11:58 PM = 23:58 = 1438 minutos
        const HORA_FINALIZACION = 23 * 60 + 58;
        
        console.log(`[HOY] checkSchedule: ${hora}:${minutos} (${horaActual}), lastFinalized: ${this.lastFinalizedDate}, hoy: ${this.currentDate}`);
        
        // Si ya pasaron las 11:58 PM Y ese día no se ha finalizado
        if (horaActual >= HORA_FINALIZACION && this.lastFinalizedDate !== this.currentDate) {
            console.log('[HOY] ⏰ ES HORA DE FINALIZAR!');
            
            // Ya usamos window.controller desde el getter, no necesitamos asignar
            this.finalizeDay(this.currentDate);
        } else if (this.lastFinalizedDate === this.currentDate) {
            console.log('[HOY] Día ya finalizado, sin acción');
        }
    }

    // Obtener referencia al controller
    get controller() {
        return window.controller;
    }

    // ==================== CHECK-INS ====================

    async getTodayCheckin() {
        if (!this.controller?.currentUser) return null;

        const { data: checkinData, error } = await supabase
            .from('daily_checkins')
            .select('*')
            .eq('user_id', this.controller.currentUser.id)
            .eq('date', this.currentDate)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error getting checkin:', error);
        }
        return checkinData || null;
    }

    async saveCheckin(emotionalState, physical, note) {
        if (!this.controller?.currentUser) {
            this.saveCheckinLocal(emotionalState, physical, note);
            return;
        }

        const { data: checkinData, error } = await supabase
            .from('daily_checkins')
            .upsert({
                user_id: this.controller.currentUser.id,
                date: this.currentDate,
                emotional_state: emotionalState,
                physical: physical,
                note: note
            }, { onConflict: 'user_id,date' })
            .select()
            .single();

        if (error) {
            console.error('Error saving checkin:', error);
            return false;
        }
        return checkinData;
    }

    saveCheckinLocal(emotionalState, physical, note) {
        const localCheckins = JSON.parse(localStorage.getItem('daily_checkins_local') || '[]');
        const existingIndex = localCheckins.findIndex(c => c.date === this.currentDate);
        
        const checkin = {
            date: this.currentDate,
            emotional_state: emotionalState,
            physical: physical,
            note: note,
            created_at: new Date().toISOString()
        };

        if (existingIndex >= 0) {
            localCheckins[existingIndex] = checkin;
        } else {
            localCheckins.push(checkin);
        }

        localStorage.setItem('daily_checkins_local', JSON.stringify(localCheckins));
    }

    // ==================== QUÉ HICE HOY (localStorage) ====================

    /**
     * Obtiene las tareas del día desde localStorage
     * (antes se usaba Supabase, ahora solo localStorage)
     */
    getTodayTasks() {
        const all = JSON.parse(localStorage.getItem('hoy_tareas') || '[]');
        return all.filter(t => t.date === this.currentDate);
    }

    /**
     * Agrega una tarea (solo localStorage)
     */
    addTask(content) {
        const all = JSON.parse(localStorage.getItem('hoy_tareas') || '[]');
        all.push({
            id: 'local-' + Date.now(),
            content: content,
            date: this.currentDate,
            completed: false,
            created_at: new Date().toISOString()
        });
        localStorage.setItem('hoy_tareas', JSON.stringify(all));
    }

    /**
     * Toggle de completado (solo localStorage)
     */
    toggleTaskCompletion(taskId, completed) {
        const all = JSON.parse(localStorage.getItem('hoy_tareas') || '[]');
        const task = all.find(t => t.id === taskId);
        if (task) {
            task.completed = completed;
            task.completed_at = completed ? new Date().toISOString() : null;
        }
        localStorage.setItem('hoy_tareas', JSON.stringify(all));
    }

    /**
     * Elimina una tarea (solo localStorage)
     */
    deleteTask(taskId) {
        const all = JSON.parse(localStorage.getItem('hoy_tareas') || '[]');
        const filtered = all.filter(t => t.id !== taskId);
        localStorage.setItem('hoy_tareas', JSON.stringify(filtered));
    }

    // ==================== FINALIZAR DÍA ====================

    /**
     * Verifica si hay un nuevo día y crea la card de resumen
     * Se llama automáticamente al inicializar
     */
    checkAndFinalizeDay() {
        const hoy = new Date().toISOString().split('T')[0];
        
        // Si el último día finalizado no es hoy Y ya pasaron las 11:59 o es un nuevo día
        if (this.lastFinalizedDate && this.lastFinalizedDate !== hoy) {
            // Hay un día anterior sin finalizar
            this.finalizeDay(this.lastFinalizedDate);
        }
    }

    /**
     * Genera el título para la card: "Hice esto el viernes 10 de abril"
     */
    generateDayTitle(dateStr) {
        const fecha = new Date(dateStr + 'T12:00:00');
        const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        
        return `Hice esto el ${diasSemana[fecha.getDay()]} ${fecha.getDate()} de ${meses[fecha.getMonth()]}`;
    }

    /**
     * Crea una card de tipo "tarea" en la tabla items con las tareas completadas del día
     */
    async finalizeDay(dateStr) {
        // Obtener las tareas de ese día
        const all = JSON.parse(localStorage.getItem('hoy_tareas') || '[]');
        const dayTasks = all.filter(t => t.date === dateStr && t.completed);
        
        if (dayTasks.length === 0) {
            console.log(`No hay tareas completadas para ${dateStr}, no se crea card`);
            this.lastFinalizedDate = dateStr;
            localStorage.setItem('hoy_finalized_date', dateStr);
            return;
        }

        // Limpiar las tareas de ese día del localStorage (ya están guardadas en la card)
        const remainingTasks = all.filter(t => t.date !== dateStr);
        localStorage.setItem('hoy_tareas', JSON.stringify(remainingTasks));

        // Crear la card en la tabla items
        const title = this.generateDayTitle(dateStr);
        const tareasJson = dayTasks.map(t => ({
            content: t.content,
            completed_at: t.completed_at
        }));

        let nuevaCard = null;
        
        try {
            if (this.controller?.currentUser) {
                nuevaCard = await data.createItem({
                    user_id: this.controller.currentUser.id,
                    content: title,
                    type: 'tarea',
                    // No usamos status: 'completed' para evitar filtros
                    // Usamos tags: 'diario' + 'logro' para identificarlas
                    tareas: tareasJson,
                    tags: ['diario', 'logro'],
                    meta: {
                        es_resumen_diario: true,
                        fecha_original: dateStr
                    }
                });
                
                console.log(`Card creada para el día ${dateStr} con ${dayTasks.length} tareas`);
            } else {
                console.log('No hay usuario logueado, no se puede crear la card');
            }
        } catch (error) {
            console.error('Error al crear card de resumen diario:', error);
        }

        // Actualizar el último día finalizado
        this.lastFinalizedDate = dateStr;
        localStorage.setItem('hoy_finalized_date', dateStr);
        
        // Recargar el timeline para mostrar la nueva card
        this.refreshTimeline();
    }

    // Recarga el timeline desde cualquier contexto
    refreshTimeline() {
        console.log('[HOY] Refresh timeline llamado');
        
        // Intentar desde window.controller (más seguro para scheduler)
        const controller = this.controller || window.controller;
        
        if (!controller) {
            console.log('[HOY] No hay controller disponible');
            // Fallback: recargar la página
            window.location.reload();
            return;
        }
        
        // Guardar estado actual para restaurar
        const vistaAnterior = controller.currentView;
        const categoriaAnterior = controller.currentCategory;
        
        // Forzar modo timeline
        controller.currentView = 'timeline';
        controller.currentCategory = 'all';
        controller.currentTag = null;
        
        // Forzar recarga SIN loading
        try {
            controller.loadItems();
        } catch (e) {
            console.error('[HOY] Error loadItems:', e);
        }
        
        ui.showNotification('🎉 ¡Resumen del día creado!', 'success');
        console.log('[HOY] Timeline recargado');
    }

    /**
     * Fuerza la creación de la card (útil para testing o botón manual)
     */
    async forceFinalizeToday() {
        await this.finalizeDay(this.currentDate);
    }
}

export const hoy = new HoyManager();