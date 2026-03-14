/**
 * Módulo de Sección HOY
 * =====================
 * Maneja: check-ins, rutinas diarias, tareas de hoy
 */

import { supabase } from './supabase.js';

class HoyManager {
    constructor() {
        this.currentDate = new Date().toISOString().split('T')[0];
    }

    // Obtener referencia al controller
    get controller() {
        return window.controller;
    }

    // ==================== CHECK-INS ====================

    async getTodayCheckin() {
        if (!this.controller?.currentUser) return null;

        const { data, error } = await supabase
            .from('daily_checkins')
            .select('*')
            .eq('user_id', this.controller.currentUser.id)
            .eq('date', this.currentDate)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error getting checkin:', error);
        }
        return data || null;
    }

    async saveCheckin(emotionalState, physical, note) {
        if (!this.controller?.currentUser) {
            // Guardar localmente si no hay sesión
            this.saveCheckinLocal(emotionalState, physical, note);
            return;
        }

        const { data, error } = await supabase
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
        return data;
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

    // ==================== RUTINAS ====================

    async getRoutines() {
        if (!this.controller?.currentUser) return this.getDefaultRoutines();

        const { data, error } = await supabase
            .from('daily_routines')
            .select('*')
            .eq('user_id', this.controller.currentUser.id)
            .eq('is_active', true)
            .order('sort_order', { ascending: true });

        if (error) {
            console.error('Error getting routines:', error);
            return this.getDefaultRoutines();
        }

        // Si no tiene rutinas personalizadas, devolver las defaults
        if (!data || data.length === 0) return this.getDefaultRoutines();
        
        return data;
    }

    getDefaultRoutines() {
        // Rutinas por defecto cuando no hay sesión
        return [
            { id: 'default-1', name: 'Tomar medicación', emoji: '💊', is_default: true }
        ];
    }

    async getRoutineCompletions(date = null) {
        const targetDate = date || this.currentDate;
        
        if (!this.controller?.currentUser) {
            return this.getLocalRoutineCompletions(targetDate);
        }

        const { data, error } = await supabase
            .from('daily_routine_completions')
            .select('*')
            .eq('user_id', this.controller.currentUser.id)
            .eq('date', targetDate);

        if (error) {
            console.error('Error getting completions:', error);
            return [];
        }

        return data || [];
    }

    getLocalRoutineCompletions(date) {
        const local = JSON.parse(localStorage.getItem('routine_completions_local') || '{}');
        return local[date] || [];
    }

    async toggleRoutineCompletion(routineId, completed) {
        if (!this.controller?.currentUser) {
            this.toggleRoutineLocal(routineId, completed);
            return;
        }

        if (completed) {
            await supabase
                .from('daily_routine_completions')
                .upsert({
                    routine_id: routineId,
                    user_id: this.controller.currentUser.id,
                    date: this.currentDate,
                    completed: true,
                    completed_at: new Date().toISOString()
                }, { onConflict: 'routine_id,date' });
        } else {
            await supabase
                .from('daily_routine_completions')
                .delete()
                .eq('routine_id', routineId)
                .eq('user_id', this.controller.currentUser.id)
                .eq('date', this.currentDate);
        }
    }

    toggleRoutineLocal(routineId, completed) {
        const local = JSON.parse(localStorage.getItem('routine_completions_local') || '{}');
        if (!local[this.currentDate]) local[this.currentDate] = [];
        
        if (completed) {
            if (!local[this.currentDate].includes(routineId)) {
                local[this.currentDate].push(routineId);
            }
        } else {
            local[this.currentDate] = local[this.currentDate].filter(id => id !== routineId);
        }
        
        localStorage.setItem('routine_completions_local', JSON.stringify(local));
    }

    async addRoutine(name, emoji = '📌', isDefault = false) {
        if (!this.controller?.currentUser) return;

        // Obtener el último sort_order
        const { data: existing } = await supabase
            .from('daily_routines')
            .select('sort_order')
            .eq('user_id', this.controller.currentUser.id)
            .order('sort_order', { ascending: false })
            .limit(1);

        const newOrder = existing && existing[0] ? existing[0].sort_order + 1 : 1;

        await supabase
            .from('daily_routines')
            .insert({
                user_id: this.controller.currentUser.id,
                name: name,
                emoji: emoji,
                is_default: isDefault,
                sort_order: newOrder
            });
    }

    async deleteRoutine(routineId) {
        if (!this.controller?.currentUser) return;

        await supabase
            .from('daily_routines')
            .delete()
            .eq('id', routineId)
            .eq('user_id', this.controller.currentUser.id);
    }

    // ==================== TAREAS DE HOY ====================

    async getTodayTasks() {
        if (!this.controller?.currentUser) return [];

        const { data, error } = await supabase
            .from('daily_tasks')
            .select('*')
            .eq('user_id', this.controller.currentUser.id)
            .eq('date', this.currentDate)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error getting tasks:', error);
            return [];
        }

        return data || [];
    }

    getLocalTodayTasks() {
        const all = JSON.parse(localStorage.getItem('daily_tasks_local') || '[]');
        return all.filter(t => t.date === this.currentDate);
    }

    async addTask(content) {
        if (!this.controller?.currentUser) {
            this.addTaskLocal(content);
            return;
        }

        await supabase
            .from('daily_tasks')
            .insert({
                user_id: this.controller.currentUser.id,
                content: content,
                date: this.currentDate,
                completed: false
            });
    }

    addTaskLocal(content) {
        const all = JSON.parse(localStorage.getItem('daily_tasks_local') || '[]');
        all.push({
            id: 'local-' + Date.now(),
            content: content,
            date: this.currentDate,
            completed: false,
            created_at: new Date().toISOString()
        });
        localStorage.setItem('daily_tasks_local', JSON.stringify(all));
    }

    async toggleTaskCompletion(taskId, completed) {
        if (!this.controller?.currentUser) {
            this.toggleTaskLocal(taskId, completed);
            return;
        }

        if (completed) {
            await supabase
                .from('daily_tasks')
                .update({ 
                    completed: true, 
                    completed_at: new Date().toISOString() 
                })
                .eq('id', taskId)
                .eq('user_id', this.controller.currentUser.id);
        } else {
            await supabase
                .from('daily_tasks')
                .update({ 
                    completed: false, 
                    completed_at: null 
                })
                .eq('id', taskId)
                .eq('user_id', this.controller.currentUser.id);
        }
    }

    toggleTaskLocal(taskId, completed) {
        const all = JSON.parse(localStorage.getItem('daily_tasks_local') || '[]');
        const task = all.find(t => t.id === taskId);
        if (task) {
            task.completed = completed;
            task.completed_at = completed ? new Date().toISOString() : null;
        }
        localStorage.setItem('daily_tasks_local', JSON.stringify(all));
    }

    async deleteTask(taskId) {
        if (!this.controller?.currentUser) {
            this.deleteTaskLocal(taskId);
            return;
        }

        await supabase
            .from('daily_tasks')
            .delete()
            .eq('id', taskId)
            .eq('user_id', this.controller.currentUser.id);
    }

    deleteTaskLocal(taskId) {
        const all = JSON.parse(localStorage.getItem('daily_tasks_local') || '[]');
        const filtered = all.filter(t => t.id !== taskId);
        localStorage.setItem('daily_tasks_local', JSON.stringify(filtered));
    }
}

export const hoy = new HoyManager();
