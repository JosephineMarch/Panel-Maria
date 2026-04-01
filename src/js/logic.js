/**
 * KAI - Lógica Principal del Controlador
 * ======================================
 * 
 * Este archivo contiene el controlador principal de la aplicación.
 * Organizado en las siguientes secciones:
 * 
 * SECCIÓN 1: Utilidades (lines 9-30)
 *   - formatDeadlineForDB()
 *   - formatDeadlineForDisplay()
 * 
 * SECCIÓN 2: KaiController - Inicialización (lines 31-120)
 *   - constructor(), init()
 * 
 * SECCIÓN 3: Alarmas (lines 151-380)
 *   - startAlarmChecker(), scheduleAllAlarms()
 *   - scheduleTriggerNotification(), checkAlarms()
 *   - showAlarmNotification(), playAlarmSound()
 * 
 * SECCIÓN 4: CRUD de Items (lines 381-800)
 *   - crearItem(), editarItem(), borrarItem()
 *   - loadItems(), finishItem(), toggleAnclado()
 *   - updateItemInline(), saveInlineEdit()
 * 
 * SECCIÓN 5: IA / Kai (lines 801-950)
 *   - processWithKai(), executeKaiAction()
 *   - crearAlarma(), detectarTagsYAlarmas()
 * 
 * SECCIÓN 6: Eventos y Handlers (lines 951-1100)
 *   - bindEvents(), handleNavigation()
 *   - setupShareTarget()
 * 
 * SECCIÓN 7: Utilidades de Vista (lines 1101-1123)
 *   - getItemActions(), renderQuickActions()
 * 
 * SECCIÓN 8: Check-ins de Bienestar (lines >1411)
 *   - initCheckinSystem(), checkPendingCheckin()
 *   - renderCheckinButton(), showCheckinModal()
 *   - saveCheckin(), getCheckinHistory()
 *   - calculateCheckinTrend(), requestNotificationPermission()
 */

import { supabase } from './supabase.js';
import { data } from './data.js';
import { ui } from './ui.js';
import { auth } from './auth.js';
import { ai } from './ai.js';
import { cerebras } from './cerebras.js';
import { requestFCMToken } from './firebase.js';
import { hoy } from './hoy.js';

function formatDeadlineForDB(deadline) {
    if (!deadline) return null;
    if (typeof deadline === 'number') {
        return new Date(deadline).toISOString();
    }
    if (typeof deadline === 'string') {
        const parsed = parseInt(deadline);
        if (!isNaN(parsed)) {
            return new Date(parsed).toISOString();
        }
        return deadline;
    }
    return null;
}

function formatDeadlineForDisplay(deadline) {
    if (!deadline) return null;
    const d = new Date(typeof deadline === 'number' ? deadline : deadline);
    if (isNaN(d.getTime())) return null;
    return d;
}

class KaiController {
    constructor() {
        this.currentUser = null;
        this.currentParentId = null;
        this.currentCategory = 'all';
        this.currentTag = null;
        this.breadcrumbPath = [];
        this.currentView = 'timeline'; // Default: Timeline
        this.expandedCardId = null; // ID de la card expandida (para persistencia)
        this.init();
    }

    async init() {
        ui.init();
        this.bindEvents();
        this.startAlarmChecker();
        this.setupRealtimeSubscription();

        try {
            this.currentUser = await auth.init();
            if (this.currentUser) {
                ui.updateUserInfo(this.currentUser);
                // Restaurar estado persistido DESPUÉS de tener usuario
                this.restoreState();
                // Cargar según la vista actual
                if (this.currentView === 'hoy') {
                    await this.loadHoySection();
                } else {
                    await this.loadItems();
                }
                // Restaurar card expandida si había una
                this.restoreExpandedCard();
            } else {
                // No cargar demo automáticamente - esperar a que usuario lo genere
                this.loadEmptyState();
            }
        } catch (error) {
            console.error('Error en inicialización:', error);
            this.loadEmptyState();
        }

        ai.init();
    }
    
    // === Persistencia de Estado ===
    saveState() {
        const state = {
            currentView: this.currentView,
            expandedCardId: this.expandedCardId,
            currentCategory: this.currentCategory,
            currentTag: this.currentTag
        };
        localStorage.setItem('kai_state', JSON.stringify(state));
    }
    
    restoreState() {
        try {
            const saved = localStorage.getItem('kai_state');
            if (saved) {
                const state = JSON.parse(saved);
                this.currentView = state.currentView || 'timeline';
                this.expandedCardId = state.expandedCardId || null;
                this.currentCategory = state.currentCategory || 'all';
                this.currentTag = state.currentTag || null;
                
                // Aplicar la vista guardada (sin cargar datos - eso se hace en init())
                this.applyViewStateOnly();
            }
        } catch (e) {
            console.warn('No se pudo restaurar estado:', e);
        }
    }
    
    // Versión de applyViewState que NO carga datos (para restoreState)
    applyViewStateOnly() {
        const btnHoy = document.getElementById('nav-hoy');
        const btnTimeline = document.getElementById('nav-timeline');
        
        if (btnHoy && btnTimeline) {
            if (this.currentView === 'hoy') {
                btnHoy.classList.add('bg-brand', 'text-white', 'shadow-sticker');
                btnHoy.classList.remove('text-gray-500', 'hover:bg-gray-100');
                btnTimeline.classList.remove('bg-brand', 'text-white', 'shadow-sticker');
                btnTimeline.classList.add('text-gray-500', 'hover:bg-gray-100');
            } else {
                btnTimeline.classList.add('bg-brand', 'text-white', 'shadow-sticker');
                btnTimeline.classList.remove('text-gray-500', 'hover:bg-gray-100');
                btnHoy.classList.remove('bg-brand', 'text-white', 'shadow-sticker');
                btnHoy.classList.add('text-gray-500', 'hover:bg-gray-100');
            }
        }
        
        const sectionHoy = document.getElementById('section-hoy');
        const timelineContent = document.getElementById('timeline-content');
        
        if (sectionHoy && timelineContent) {
            if (this.currentView === 'hoy') {
                sectionHoy.classList.remove('hidden');
                timelineContent.classList.add('hidden');
            } else {
                sectionHoy.classList.add('hidden');
                timelineContent.classList.remove('hidden');
            }
        }
    }
    
    applyViewState() {
        // Actualizar botones de navegación
        const btnHoy = document.getElementById('nav-hoy');
        const btnTimeline = document.getElementById('nav-timeline');
        
        if (btnHoy && btnTimeline) {
            if (this.currentView === 'hoy') {
                btnHoy.classList.add('bg-brand', 'text-white', 'shadow-sticker');
                btnHoy.classList.remove('text-gray-500', 'hover:bg-gray-100');
                btnTimeline.classList.remove('bg-brand', 'text-white', 'shadow-sticker');
                btnTimeline.classList.add('text-gray-500', 'hover:bg-gray-100');
            } else {
                btnTimeline.classList.add('bg-brand', 'text-white', 'shadow-sticker');
                btnTimeline.classList.remove('text-gray-500', 'hover:bg-gray-100');
                btnHoy.classList.remove('bg-brand', 'text-white', 'shadow-sticker');
                btnHoy.classList.add('text-gray-500', 'hover:bg-gray-100');
            }
        }
        
        // Mostrar/ocultar secciones
        const sectionHoy = document.getElementById('section-hoy');
        const timelineContent = document.getElementById('timeline-content');
        
        if (sectionHoy && timelineContent) {
            if (this.currentView === 'hoy') {
                sectionHoy.classList.remove('hidden');
                timelineContent.classList.add('hidden');
                // Cargar datos de HOY si hay usuario
                if (this.currentUser) {
                    this.loadHoySection();
                }
            } else {
                sectionHoy.classList.add('hidden');
                timelineContent.classList.remove('hidden');
            }
        }
    }
    
    switchView(view) {
        if (this.currentView === view) return;
        
        this.currentView = view;
        this.saveState();
        this.applyViewState();
        
        // Si es Timeline, recargar items
        if (view === 'timeline') {
            this.loadItems();
        }
        
        // Si es HOY, cargar datos de HOY
        if (view === 'hoy') {
            this.loadHoySection();
        }
    }
    
    // ==================== SECCIÓN HOY ====================
    
    async loadHoySection() {
        await this.updateHoyDate();
        await this.loadRoutines();
        await this.loadTodayTasks();
        this.initHoyEvents();
    }
    
    updateHoyDate() {
        const fechaEl = document.getElementById('hoy-fecha');
        const saludoEl = document.getElementById('hoy-saludo');
        if (!fechaEl || !saludoEl) return;
        
        const hoy = new Date();
        const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        
        fechaEl.textContent = `${diasSemana[hoy.getDay()]} ${hoy.getDate()} de ${meses[hoy.getMonth()]}`;
        
        const hora = hoy.getHours();
        if (hora < 12) {
            saludoEl.textContent = 'Buenos días ☀️';
        } else if (hora < 18) {
            saludoEl.textContent = 'Buenas tardes 🌤️';
        } else {
            saludoEl.textContent = 'Buenas noches 🌙';
        }
    }
    
    async loadRoutines() {
        const container = document.getElementById('rutinas-list');
        if (!container) return;
        
        try {
            const routines = await hoy.getRoutines();
            const completions = await hoy.getRoutineCompletions();
            const completedIds = completions.map(c => c.routine_id || c.id);
            
            container.innerHTML = routines.map(r => `
                <div class="flex items-center gap-3 p-3 rounded-xl bg-brand/5 border border-brand/10 group hover:bg-brand/10 transition">
                    <input type="checkbox" 
                           class="routine-checkbox w-6 h-6 rounded border-2 border-brand text-brand focus:ring-brand accent-brand cursor-pointer"
                           data-routine-id="${r.id}"
                           ${completedIds.includes(r.id) ? 'checked' : ''}>
                    <span class="text-2xl">${r.emoji || '📌'}</span>
                    <span class="flex-1 font-medium text-ink ${completedIds.includes(r.id) ? 'line-through opacity-50' : ''}">${r.name}</span>
                    ${r.is_default ? '<span class="text-[10px] text-brand font-bold">DEFAULT</span>' : ''}
                </div>
            `).join('');
            
            // Bind eventos de checkboxes
            container.querySelectorAll('.routine-checkbox').forEach(cb => {
                cb.addEventListener('change', async (e) => {
                    const routineId = e.target.dataset.routineId;
                    const completed = e.target.checked;
                    await hoy.toggleRoutineCompletion(routineId, completed);
                    
                    // Actualizar UI
                    const row = e.target.closest('.flex');
                    const text = row.querySelector('span:nth-child(3)');
                    if (text) {
                        if (completed) {
                            text.classList.add('line-through', 'opacity-50');
                        } else {
                            text.classList.remove('line-through', 'opacity-50');
                        }
                    }
                });
            });
        } catch (error) {
            console.error('Error loading routines:', error);
            container.innerHTML = '<p class="text-center text-gray-400 py-4">Error al cargar rutinas</p>';
        }
    }
    
    async loadTodayTasks() {
        const container = document.getElementById('tareas-list');
        if (!container) return;
        
        try {
            let tasks = [];
            
            if (this.currentUser) {
                tasks = await hoy.getTodayTasks();
            } else {
                tasks = hoy.getLocalTodayTasks();
            }
            
            if (tasks.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-6 text-gray-400">
                        <span class="text-4xl">📋</span>
                        <p class="mt-2 text-sm">No hay tareas para hoy. ¡Agrega una!</p>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = tasks.map(t => `
                <div class="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 hover:border-brand/20 transition group" data-task-id="${t.id}">
                    <input type="checkbox"
                           class="hoy-task-checkbox w-5 h-5 rounded border-2 border-gray-200 text-brand focus:ring-brand accent-brand cursor-pointer"
                           data-task-id="${t.id}"
                           ${t.completed ? 'checked' : ''}>
                    <span class="flex-1 text-ink ${t.completed ? 'line-through opacity-50' : 'font-medium'}">${t.content}</span>
                    <button class="hoy-task-delete opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition p-1" data-task-id="${t.id}">
                        <i class="fa-solid fa-xmark text-sm"></i>
                    </button>
                </div>
            `).join('');
            
            // Bind eventos de checkboxes
            container.querySelectorAll('.hoy-task-checkbox').forEach(cb => {
                cb.addEventListener('change', async (e) => {
                    const taskId = e.target.dataset.taskId;
                    const completed = e.target.checked;
                    await hoy.toggleTaskCompletion(taskId, completed);
                    
                    // Actualizar UI
                    const row = e.target.closest('.flex');
                    const text = row.querySelector('span:nth-child(2)');
                    if (text) {
                        if (completed) {
                            text.classList.add('line-through', 'opacity-50');
                        } else {
                            text.classList.remove('line-through', 'opacity-50');
                        }
                    }
                });
            });
            
            // Bind eventos de eliminar
            container.querySelectorAll('.hoy-task-delete').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const taskId = btn.dataset.taskId;
                    if (confirm('¿Eliminar esta tarea?')) {
                        await hoy.deleteTask(taskId);
                        await this.loadTodayTasks();
                    }
                });
            });
        } catch (error) {
            console.error('Error loading tasks:', error);
            container.innerHTML = '<p class="text-center text-gray-400 py-4">Error al cargar tareas</p>';
        }
    }
    
    initHoyEvents() {
        // Botón agregar tarea
        const btnAddTask = document.getElementById('btn-add-task-hoy');
        const addTaskForm = document.getElementById('add-task-form');
        const newTaskInput = document.getElementById('new-task-input');
        const btnConfirmTask = document.getElementById('btn-confirm-task');
        
        btnAddTask?.addEventListener('click', () => {
            addTaskForm?.classList.toggle('hidden');
            if (!addTaskForm?.classList.contains('hidden')) {
                newTaskInput?.focus();
            }
        });
        
        btnConfirmTask?.addEventListener('click', async () => {
            const content = newTaskInput?.value.trim();
            if (content) {
                await hoy.addTask(content);
                newTaskInput.value = '';
                addTaskForm?.classList.add('hidden');
                await this.loadTodayTasks();
            }
        });
        
        newTaskInput?.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                btnConfirmTask?.click();
            }
        });
        
        // Botón cancelar en formulario de tarea
        newTaskInput?.closest('.flex')?.querySelector('button:first-child')?.addEventListener('click', () => {
            addTaskForm?.classList.add('hidden');
            newTaskInput.value = '';
        });
        
        // Botón guardar check-in
        document.getElementById('btn-save-checkin')?.addEventListener('click', async () => {
            const emotionalState = document.querySelector('.emoji-btn.selected')?.dataset.emoji || null;
            const physical = document.getElementById('checkin-physical')?.value.trim() || '';
            const note = document.getElementById('checkin-note')?.value.trim() || '';
            
            if (!emotionalState) {
                ui.showNotification('Selecciona cómo te sientes 😊', 'warning');
                return;
            }
            
            await hoy.saveCheckin(emotionalState, physical, note);
            ui.showNotification('¡Check-in guardado! 💚', 'success');
        });
        
        // Selector de emoji (para marcar selección)
        document.querySelectorAll('.emoji-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected', 'border-brand', 'bg-brand/10'));
                btn.classList.add('selected', 'border-brand', 'bg-brand/10');
            });
        });
        
        // Botón agregar rutina
        const btnAddRoutine = document.getElementById('btn-add-routine');
        const addRoutineForm = document.getElementById('add-routine-form');
        const newRoutineInput = document.getElementById('new-routine-input');
        const btnConfirmRoutine = document.getElementById('btn-confirm-routine');
        const btnCancelRoutine = document.getElementById('btn-cancel-routine');
        
        btnAddRoutine?.addEventListener('click', () => {
            addRoutineForm?.classList.toggle('hidden');
            if (!addRoutineForm?.classList.contains('hidden')) {
                newRoutineInput?.focus();
            }
        });
        
        btnCancelRoutine?.addEventListener('click', () => {
            addRoutineForm?.classList.add('hidden');
            newRoutineInput.value = '';
        });
        
        btnConfirmRoutine?.addEventListener('click', async () => {
            const name = newRoutineInput?.value.trim();
            const isDefault = document.getElementById('set-as-default')?.checked || false;
            
            if (name) {
                await hoy.addRoutine(name, '📌', isDefault);
                newRoutineInput.value = '';
                document.getElementById('set-as-default').checked = false;
                addRoutineForm?.classList.add('hidden');
                await this.loadRoutines();
            }
        });
    }
    
    setExpandedCard(cardId) {
        this.expandedCardId = cardId;
        this.saveState();
    }
    
    clearExpandedCard() {
        this.expandedCardId = null;
        this.saveState();
    }
    
    restoreExpandedCard() {
        if (!this.expandedCardId) return;
        
        // Buscar la card y expandirla
        setTimeout(() => {
            const card = document.querySelector(`[data-id="${this.expandedCardId}"]`);
            if (card && card.dataset.expanded === 'false') {
                // Necesitamos el item para expandir
                this.loadItems().then(() => {
                    const expandedCard = document.querySelector(`[data-id="${this.expandedCardId}"]`);
                    if (expandedCard) {
                        // Simular click para expandir
                        // Pero primero necesitamos el item data
                        data.getItems({}).then(items => {
                            const item = items.find(i => i.id === this.expandedCardId);
                            if (item) {
                                ui.expandCard(expandedCard, item);
                            }
                        });
                    }
                });
            }
        }, 100);
    }

    loadEmptyState() {
        // Mostrar estado vacío
        ui.render([], false);
        const container = ui.elements.container();
        if (container) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <div class="text-6xl mb-4">🧠</div>
                    <h2 class="text-2xl font-bold text-ink mb-2">Bienvenido a KAI</h2>
                    <p class="text-ink/60 mb-6">Tu segundo cerebro está listo para usar. Inicia sesión para guardar tus pensamientos.</p>
                </div>
            `;
        }
    }

    startAlarmChecker() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        this.scheduleAllAlarms();
        this.checkAlarms();

        setInterval(() => {
            this.scheduleAllAlarms();
            this.checkAlarms();
        }, 30000);
    }

    async scheduleAllAlarms() {
        try {
            let items;

            if (this.isDemoMode) {
                items = JSON.parse(localStorage.getItem('kaiDemoItems')) || [];
            } else if (this.currentUser) {
                items = await data.getItems({});
            } else {
                return;
            }

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

            const supabase = window.supabase;
            const { error } = await supabase.functions.invoke('send-push', {
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
            let items;

            if (this.isDemoMode) {
                items = JSON.parse(localStorage.getItem('kaiDemoItems')) || [];
            } else if (this.currentUser) {
                items = await data.getItems({});
            } else {
                return;
            }

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

                if (deadlineTime <= now - 60000) {
                    continue;
                }

                if (!validTriggeredIds.includes(item.id)) {
                    const timeDiff = deadlineTime - now;

                    if (timeDiff <= 0) {
                        validTriggeredIds.push(item.id);
                        alarmTimestamps[item.id] = now;
                        localStorage.setItem('alarmTimestamps', JSON.stringify(alarmTimestamps));
                        localStorage.setItem('triggeredAlarms', JSON.stringify(validTriggeredIds));

                        this.triggerAlarm(item);
                    }
                }
            }
        } catch (error) {
            console.error('Error checking alarms:', error);
        }
    }

    setupRealtimeSubscription() {
        if (this.isDemoMode) return;

        let refreshTimeout;
        supabase
            .channel('public:items')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => {
                console.log('🔄 Cambio detectado en DB, programando recarga silenciosa...');
                clearTimeout(refreshTimeout);
                refreshTimeout = setTimeout(() => this.loadItems(true), 1000); // Recarga silenciosa con debounce
            })
            .subscribe();
    }

    triggerAlarm(item) {
        console.log(`⏰ Ejecutando alarma para: ${item.content}`);
        ui.showNotification(`⏰ ¡Hora de: ${item.content}!`, 'warning');

        try {
            // Sonido de campana suave
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.volume = 0.7;
            audio.play().catch(e => {
                console.warn('Audio play bloqueado. Se requiere interacción previa.', e);
                // Fallback: vibración si está disponible
                if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
            });
        } catch (err) {
            console.error('Error al reproducir audio:', err);
        }

        if (Notification.permission === 'granted') {
            new Notification('⏰ KAI: Tienes un pendiente', {
                body: item.content,
                icon: './src/assets/icon-192.png',
                tag: item.id,
                requireInteraction: true
            });
        }
    }

    bindEvents() {
        // --- Navegación HOY / TIMELINE ---
        document.getElementById('nav-hoy')?.addEventListener('click', () => this.switchView('hoy'));
        document.getElementById('nav-timeline')?.addEventListener('click', () => this.switchView('timeline'));
        
        // --- Datos (Import/Export) ---
        document.getElementById('btn-export')?.addEventListener('click', () => this.handleExport());
        document.getElementById('btn-import')?.addEventListener('click', () => {
            document.getElementById('import-file')?.click();
        });
        document.getElementById('import-file')?.addEventListener('change', (e) => this.handleImport(e));
        
        // --- Debug: Test Notificación ---
        document.getElementById('btn-test-notification')?.addEventListener('click', async () => {
            await this.testPushNotification();
        });

        // --- Entradas Principales ---
        ui.elements.editForm()?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEdit();
        });

        document.getElementById('btn-submit')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        ui.elements.inputMain()?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleSubmit();
            }
        });

        // --- Búsqueda ---
        const searchInput = document.getElementById('search-input');
        const clearSearchBtn = document.getElementById('btn-clear-search');
        
        searchInput?.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                await this.handleSearch(searchInput.value.trim());
            }
        });

        searchInput?.addEventListener('input', (e) => {
            // Mostrar/ocultar botón de limpiar
            if (e.target.value.length > 0) {
                clearSearchBtn?.classList.remove('hidden');
            } else {
                clearSearchBtn?.classList.add('hidden');
            }
        });

        clearSearchBtn?.addEventListener('click', async () => {
            searchInput.value = '';
            clearSearchBtn.classList.add('hidden');
            searchInput.focus();
            // Restaurar vista normal (cargar todos los items)
            await this.loadItems();
        });

        // --- Share Target Event ---
        window.addEventListener('kai:add-item', async (e) => {
            const { type, content, url, parent_id } = e.detail;
            try {
                await data.createItem({
                    type: type,
                    content: content,
                    url: url || '',
                    parent_id: parent_id || null
                });
                ui.showNotification(`¡Guardado en ${parent_id ? 'el proyecto' : type}! ✨`, 'success');
                await this.loadItems();
            } catch (error) {
                console.error('Error adding shared item:', error);
                ui.showNotification('No pude guardar el elemento compartido.', 'error');
            }
        });

        // --- Navegación & Categorías (Tipos) ---
        document.querySelectorAll('.btn-category').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleCategoryClick(e.target);
            });
        });

        // --- Navegación & Tags ---
        document.querySelectorAll('.btn-tag').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleCategoryClick(e.target);
            });
        });

        // --- Modals & Sidebar ---
        document.getElementById('btn-user')?.addEventListener('click', () => ui.toggleSidebar());
        document.getElementById('btn-close-sidebar')?.addEventListener('click', () => ui.closeSidebar());
        document.getElementById('sidebar-overlay')?.addEventListener('click', () => ui.closeSidebar());
        document.getElementById('btn-google')?.addEventListener('click', () => this.handleGoogleLogin());
        document.getElementById('btn-logout')?.addEventListener('click', () => this.handleLogout());
        document.getElementById('btn-add-task')?.addEventListener('click', () => ui.addTaskToModal());
        document.getElementById('btn-dashboard')?.addEventListener('click', () => {
            ui.closeSidebar();
            this.showDashboard();
        });

        // Kai Sidebar Button
        document.getElementById('btn-kai-sidebar')?.addEventListener('click', () => {
            ui.closeSidebar();
            ui.toggleKaiChat();
        });

        // Tag suggestions
        document.querySelectorAll('.tag-suggestion').forEach(tag => {
            tag.addEventListener('click', () => {
                const input = document.getElementById('edit-tags');
                const current = input.value || '';
                const newTag = tag.dataset.tag;
                input.value = current ? current + ', ' + newTag : newTag;
            });
        });

        // Voz e Interfaz
        document.getElementById('btn-voice-footer')?.addEventListener('click', () => this.toggleVoiceInput());
        document.getElementById('btn-close-voice')?.addEventListener('click', () => this.stopVoiceInput());
        document.getElementById('btn-stop-voice')?.addEventListener('click', () => this.stopVoiceInput());

        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => ui.toggleModal(false));
        });

        // Kai Chat
        ui.elements.kaiAvatarContainer()?.addEventListener('click', () => ui.toggleKaiChat());
        document.getElementById('kai-chat-back')?.addEventListener('click', () => ui.toggleKaiChat(false));
        document.getElementById('kai-chat-minimize')?.addEventListener('click', () => ui.toggleKaiChat(false));
        ui.elements.kaiChatSend()?.addEventListener('click', () => this.handleKaiChat());
        ui.elements.kaiChatInput()?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleKaiChat();
        });

        // --- Delegación de Items (Stickers) ---
        ui.elements.container()?.addEventListener('click', async (e) => {
            const finishBtn = e.target.closest('.action-finish');
            const deleteBtn = e.target.closest('.action-delete');
            const openBtn = e.target.closest('.action-open');
            const pinBtn = e.target.closest('.btn-pin');
            const editBtn = e.target.closest('.action-edit');
            const taskCheckbox = e.target.closest('.timeline-task-checkbox');

            if (taskCheckbox) {
                e.stopPropagation();
                await this.toggleTimelineTask(taskCheckbox.dataset.id, parseInt(taskCheckbox.dataset.index), taskCheckbox.checked);
            } else if (finishBtn) {
                e.stopPropagation();
                this.finishItem(finishBtn.dataset.id);
            } else if (deleteBtn) {
                e.stopPropagation();
                if (confirm('¿Borrar este recuerdo?')) this.deleteItem(deleteBtn.dataset.id);
            } else if (openBtn) {
                e.stopPropagation();
                this.openProject(openBtn.dataset.id);
            } else if (pinBtn) {
                e.stopPropagation();
                this.togglePin(pinBtn.dataset.id);
            } else if (editBtn) {
                e.stopPropagation();
                this.openEditModal(editBtn.dataset.id);
            }
        });

        // --- Auth Listeners ---
        window.addEventListener('auth-SIGNED_IN', async () => {
            this.currentUser = await auth.getUser();
            if (this.currentUser) {
                ui.updateUserInfo(this.currentUser);
                await this.loadItems();
                await this.initCheckinSystem();
            }
        });

        window.addEventListener('auth-SIGNED_OUT', () => {
            this.currentUser = null;
            ui.updateUserInfo(null);
            ui.toggleCheckinButton(false);
            this.goHome();
        });

        window.addEventListener('voice-result', (e) => {
            const input = ui.elements.inputMain();
            if (input) input.value = e.detail.transcript;
            this.stopVoiceInput();
        });
    }

    async handleExport() {
        try {
            const items = await data.getItems({});
            
            const exportData = {
                app: 'Panel-Maria-KAI',
                version: '1.0.0',
                date: new Date().toISOString(),
                items: items
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `kai-backup-${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            ui.showNotification('✅ Exportación completada', 'success');
        } catch (e) {
            console.error('Export error:', e);
            ui.showNotification('❌ Error al exportar', 'error');
        }
    }

    async handleImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                if (importedData.app !== 'Panel-Maria-KAI' || !Array.isArray(importedData.items)) {
                    throw new Error('Formato de archivo inválido');
                }

                if (confirm(`Se importarán ${importedData.items.length} elementos. ¿Deseas continuar?`)) {
                    // En producción, esto debería insertar en Supabase uno por uno o en lote
                    for (const item of importedData.items) {
                        delete item.id; // Evitar conflictos de UUID
                        delete item.created_at;
                        await data.createItem(item);
                    }
                    ui.showNotification('✅ Importación exitosa!', 'success');
                    this.loadItems();
                }
            } catch (err) {
                console.error('Import error:', err);
                ui.showNotification('❌ El archivo no es un backup válido de KAI', 'error');
            }
        };
        reader.readAsText(file);
    }

    // --- LÓGICA DE NEGOCIO ---

    async parseIntentWithAI(content) {
        try {
            const prompt = `Analiza este texto y determina qué tipo de elemento crear y qué tags agregar.

Texto: "${content}"

Responde SOLO con JSON, sin otro texto:
{
  "type": "nota" | "tarea" | "proyecto" | "directorio",
  "tags": ["salud"] | ["emocion"] | ["logro"] | [],
  "reason": "explicación corta de por qué elegiste ese tipo"
}

REGLAS:
- type: "tarea" si dice "tengo que", "necesito", "pendiente", "no olvidar", verbos en futuro
- type: "proyecto" si dice "proyecto", "iniciar", "vamos a hacer algo grande"
- type: "directorio" si menciona videos, enlaces, links, youtube, etc
- type: "nota" para todo lo demás
- tags: incluye "salud" si menciona dolor, enfermedad, síntoma, médico, etc
- tags: incluye "emocion" si menciona cómo se siente (triste, feliz, ansiosa, etc)
- tags: incluye "logro" si menciona que logró, terminó, completó, etc
- tags puede estar vacío si no aplica`;

            const { cerebras } = await import('./cerebras.js');
            const response = await cerebras.ask(prompt);

            let parsed = { type: 'nota', tags: [] };

            if (response.response) {
                try {
                    const jsonMatch = response.response.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        parsed = JSON.parse(jsonMatch[0]);
                    }
                } catch (e) {
                    console.log('Error parsing AI response, using default');
                }
            }

            return {
                type: parsed.type || 'nota',
                tags: parsed.tags || []
            };
        } catch (error) {
            console.error('Error parsing with AI:', error);
            return { type: 'nota', tags: [] };
        }
    }

    // --- ANÁLISIS OFFLINE (sin IA) ---
    parseInputOffline(content) {
        const text = content.toLowerCase().trim();
        let type = 'nota';
        let tareas = [];
        let tags = [];

        // 1. Detección de URLs (prioridad alta)
        const isUrl = content.match(/^(https?:\/\/[^\s]+)/i);
        if (isUrl) {
            return {
                type: 'directorio',
                content: '', // El título lo pondrá Kai o quedará vacío
                descripcion: content,
                url: isUrl[1],
                tags: [],
                items: [],
                hasDeadline: false
            };
        }

        // 2. Detección de Checklist (formato item1, item2, item3)
        // Si contiene al menos dos comas y no parece una frase larga, o si empieza por "tarea"
        const commaCount = (content.match(/,/g) || []).length;
        const isList = commaCount >= 2 && content.length < 150;
        
        if (text.startsWith('tarea') || isList) {
            let taskText = content.replace(/^tarea\s*/i, '').trim();
            let titulo = '';
            let itemsPart = taskText;

            // Formato: "Título: item1, item2" o "Título item1, item2"
            const splitMatch = taskText.match(/^(.+?)(?::|,|\s+item\s+)(.+)$/i);
            if (splitMatch) {
                titulo = splitMatch[1].trim();
                itemsPart = splitMatch[2];
            }

            tareas = itemsPart.split(',').map(s => s.trim()).filter(s => s.length > 0);
            if (tareas.length > 1 || text.startsWith('tarea')) {
                return {
                    type: 'tarea',
                    content: titulo,
                    descripcion: '',
                    tags: [],
                    items: tareas.map(t => ({ titulo: t, completado: false })),
                    hasDeadline: false
                };
            }
        }

        // 3. Detección de Proyectos y Enlaces por palabras clave
        if (text.startsWith('proyecto') || text.includes('proyecto')) type = 'proyecto';
        if (text.startsWith('enlace') || text.includes('enlace') || text.startsWith('link')) type = 'directorio';

        // 4. Tags por palabras clave
        if (text.includes('logro') || text.includes('logré') || text.includes('terminé')) tags.push('logro');
        if (text.includes('salud') || text.includes('dolor') || text.includes('médico')) tags.push('salud');
        if (text.includes('emocion') || text.includes('triste') || text.includes('feliz')) tags.push('emocion');

        return {
            type,
            content: content,
            descripcion: content.length > 50 ? content : '',
            tags,
            items: [],
            hasDeadline: text.includes('alarma') || text.includes('recordatorio')
        };
    }

    async handleSubmit() {
        const { content, type } = ui.getMainInputData();
        if (!content) return;

        if (!this.currentUser) {
            ui.showNotification('¡Ups! Necesitas entrar para que Kai recuerde esto.', 'warning');
            ui.toggleSidebar();
            return;
        }

        ui.showNotification('Kai está pensando... 🧠', 'info');

        try {
            // 1. Análisis base (Offline)
            const offline = this.parseInputOffline(content);
            let finalType = type !== 'nota' ? type : offline.type;
            let finalContent = offline.content;
            let finalDesc = offline.descripcion;
            let finalUrl = offline.url || (finalType === 'directorio' ? this.extractUrl(content) : '');
            let finalItems = offline.items || [];
            let finalTags = offline.tags || [];

            // 2. Mejora con IA
            try {
                const prompt = `Analiza esta entrada de Maria y genera los campos adecuados para su panel.
Maria tiene TDHA, así que a veces escribe rollos largos que son descripciones sin título, o listas de tareas sin decir que son tareas.

Entrada: "${content}"
Contexto Sugerido: Tipo=${finalType}, Tags=[${finalTags.join(', ')}]

REGLAS:
1. Si el texto es largo, genera un TÍTULO creativo y corto (máximo 5 palabras) para "titulo" y pon el texto original en "descripcion".
2. Si es un ENLACE, pon la URL del link en "url", y en "titulo" pon un título descriptivo (puedes dejarlo vacío si no sabes qué es).
3. Si es una TAREA, extrae los elementos de la lista en "tareas" (array de strings).
4. El "tipo" debe ser uno de: nota, tarea, proyecto, directorio.

Responde SOLO JSON con esta estructura:
{
  "tipo": "...",
  "titulo": "...",
  "descripcion": "...",
  "url": "...",
  "tareas": ["item1", "item2"],
  "tags": ["..."]
}`;

                const response = await cerebras.ask(prompt);
                // Si la respuesta tiene una acción de IA estructurada o JSON
                let aiData = null;
                if (response.response) {
                    const jsonMatch = response.response.match(/\{[\s\S]*\}/);
                    if (jsonMatch) aiData = JSON.parse(jsonMatch[0]);
                }

                if (aiData) {
                    finalType = aiData.tipo || finalType;
                    finalContent = aiData.titulo || (content.length > 50 ? 'Nota de Maria' : content);
                    finalDesc = aiData.descripcion || content;
                    finalUrl = aiData.url || finalUrl;
                    if (aiData.tareas && aiData.tareas.length > 0) {
                        finalItems = aiData.tareas.map(t => ({ titulo: t, completado: false }));
                    }
                    finalTags = [...new Set([...finalTags, ...(aiData.tags || [])])];
                }
            } catch (aiError) {
                console.warn('IA falló en handleSubmit, usando offline:', aiError);
            }

            // 3. Guardar en DB
            await data.createItem({
                content: finalContent,
                descripcion: finalDesc,
                type: finalType,
                parent_id: this.currentParentId,
                tags: finalTags,
                url: finalUrl,
                tareas: finalItems,
                deadline: null // Las alarmas se manejan aparte por ahora
            });

            ui.clearMainInput();
            ui.showNotification('¡Anotado con éxito! ✨', 'success');
            await this.loadItems();

        } catch (error) {
            console.error('Error al crear:', error);
            ui.showNotification('KAI no pudo guardar eso. ¿Intentamos de nuevo?', 'error');
        }
    }

    extractUrl(text) {
        const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
        return urlMatch ? urlMatch[1] : '';
    }

    async sendPushNotification(token, title, body, deadlineTimestamp, itemId) {
        try {
            console.log('📲 Enviando push notification...', { token: token?.substring(0, 20) + '...', title, body, deadlineTimestamp });

            const { data, error } = await supabase.functions.invoke('send-push', {
                body: {
                    token: token,
                    title: title,
                    body: body,
                    timestamp: deadlineTimestamp,
                    itemId: itemId
                }
            });

            if (error) throw error;

            console.log('Push notification sent:', data);
            return data;
        } catch (error) {
            console.error('Error sending push notification:', error);
        }
    }

    async crearAlarma(alarmaData) {
        try {
            const contenidoAlarma = alarmaData.contenido || 'Recordatorio';
            const deadline = alarmaData.deadline;

            let newItemId = null;
            if (this.currentUser) {
                const deadlineForDB = formatDeadlineForDB(deadline);
                const result = await data.createItem({
                    content: contenidoAlarma,
                    type: 'nota',
                    parent_id: this.currentParentId,
                    tags: ['alarma'],
                    deadline: deadlineForDB
                });
                newItemId = result[0]?.id || result?.id || null;
            }

            ui.clearMainInput();

            const deadlineDate = formatDeadlineForDisplay(deadline);
            const hora = deadlineDate ? deadlineDate.toLocaleString('es-ES', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : '';

            const mensajesAlarma = [
                `¡Alarmas configurada para ${hora}! ⏰`,
                `¡Te recuerdo a las ${hora}! ⏰✨`,
                `¡Listo! Te aviso a las ${hora} ⏰`
            ];
            const mensajeAleatorio = mensajesAlarma[Math.floor(Math.random() * mensajesAlarma.length)];
            ui.showNotification(mensajeAleatorio, 'success');

            // --- CORRECCIÓN PWA MÓVIL (iOS/Android): Solicitar token on-click ---
            let fcmToken = localStorage.getItem('fcmToken');
            if (deadline) {
                const deadlineTimestamp = new Date(deadline).getTime();

                const { data: tokens } = await supabase
                    .from('fcm_tokens')
                    .select('token');

                const allTokens = tokens?.map(t => t.token) || [];
                console.log('📱 Tokens encontrados para el usuario:', allTokens.length);

                if (allTokens.length === 0 && fcmToken) {
                    allTokens.push(fcmToken);
                }

                if (allTokens.length > 0) {
                    for (const token of allTokens) {
                        await this.sendPushNotification(
                            token,
                            '⏰ KAI - Recordatorio',
                            contenidoAlarma,
                            deadlineTimestamp,
                            newItemId
                        );
                    }
                    alert(`📲 Push programada para ${allTokens.length} dispositivo(s)`);
                } else {
                    alert('⚠️ No hay dispositivos registrados. Permite notificaciones.');
                }
            }

            await this.loadItems();
        } catch (error) {
            console.error('Error al crear alarma:', error);
            ui.showNotification('No pude crear la alarma. ¿Reintentamos?', 'error');
        }
    }

    async handleEdit() {
        const updates = ui.getEditFormData();
        try {
            await data.updateItem(updates.id, updates);
            ui.toggleModal(false);
            ui.showNotification('¡Cambios guardados con amor!', 'success');
            await this.loadItems();
        } catch (error) {
            console.error('Error al editar:', error);
            ui.showNotification('Hubo un problema al guardar los cambios.', 'error');
        }
    }

    async dataUpdateInline(id, updates) {
        try {
            // Convertir deadline a formato ISO si es necesario
            if (updates.deadline) {
                if (typeof updates.deadline === 'number') {
                    // Es un timestamp
                    updates.deadline = new Date(updates.deadline).toISOString();
                } else if (typeof updates.deadline === 'string' && updates.deadline.includes('T')) {
                    // Ya es ISO string, verificar que sea válido
                    const d = new Date(updates.deadline);
                    if (isNaN(d.getTime())) {
                        updates.deadline = null;
                    }
                } else if (typeof updates.deadline === 'string' && !updates.deadline.includes('T')) {
                    // Es una fecha sin hora (YYYY-MM-DD)
                    updates.deadline = updates.deadline + 'T00:00:00.000Z';
                }
            } else {
                updates.deadline = null;
            }

            await data.updateItem(id, updates);
            ui.showNotification('¡Bloque actualizado! ✨', 'success');
            await this.loadItems();
        } catch (error) {
            console.error('Error al actualizar inline:', error);
            ui.showNotification('No pude guardar los cambios del bloque.', 'error');
        }
    }

    async deleteItem(id) {
        try {
            await data.deleteItem(id);
            ui.showNotification('Recuerdo borrado con éxito. 🗑️', 'info');
            await this.loadItems();
        } catch (error) {
            console.error('Error al borrar:', error);
            ui.showNotification('No pude borrar eso. ¿Reintentamos?', 'error');
        }
    }

    async loadItems(silent = false) {
        // Si estamos en el dashboard y no es un refresco silencioso, no hacemos nada
        // o podríamos refrescar el dashboard. Por ahora, permitimos que las categorías/tags rompan el modo dashboard.
        if (this.currentView === 'dashboard' && !silent) return;

        if (!silent) ui.renderLoading();
        try {
            const filters = { parent_id: this.currentParentId };
            
            // Si la categoría es 'hoy', ignoramos el filtro de tipo y buscamos todo para filtrar por fecha localmente
            if (this.currentCategory === 'hoy') {
                const items = await data.getItems({ parent_id: this.currentParentId });
                const today = new Date().toISOString().split('T')[0];
                
                const filteredItems = items.filter(item => {
                    const d = item.deadline ? item.deadline.split('T')[0] : item.created_at.split('T')[0];
                    return d === today && item.status !== 'completed';
                });

                ui.render(filteredItems);
            } else {
                if (this.currentCategory !== 'all') filters.type = this.currentCategory;
                const items = await data.getItems(filters);

                // Filtrar por tag si aplica
                let filteredItems = items;
                if (this.currentTag) {
                    filteredItems = items.filter(item => item.tags && item.tags.includes(this.currentTag));
                }

                ui.render(filteredItems);
            }
            
            this.updateBreadcrumb();
        } catch (error) {
            console.error('Error al cargar:', error);
            if (!silent) ui.renderError('No pudimos cargar tus pensamientos. ¿Reintentamos?');
        }
    }

    /**
     * Maneja la búsqueda desde la barra de búsqueda
     */
    async handleSearch(query) {
        if (!query) {
            await this.loadItems();
            return;
        }

        ui.showNotification(`Buscando "${query}"... 🔍`, 'info');
        const searchResults = await data.getItems({ search: query, limit: 50 });
        
        if (searchResults.length > 0) {
            ui.render(searchResults);
            ui.showNotification(`Encontré ${searchResults.length} resultados para "${query}"`, 'success');
        } else {
            ui.showNotification(`No encontré nada para "${query}"`, 'warning');
        }
    }

    async updateBreadcrumb() {
        ui.renderBreadcrumb(this.breadcrumbPath, (id) => this.navigateTo(id));
    }

    // --- Gestión de Chat de Kai con IA ---
    async handleKaiChat() {
        const input = ui.elements.kaiChatInput();
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        ui.addKaiMessage(text, false); // Mensaje del usuario
        ui.showKaiThinking(true);

        try {
            const { response, action } = await cerebras.ask(text);
            ui.showKaiThinking(false);
            ui.addKaiMessage(response, true); // Respuesta de Kai

            if (action) {
                await this.executeKaiAction(action);
            }
        } catch (error) {
            ui.showKaiThinking(false);
            ui.addKaiMessage("Perdona Maria, algo falló en mi conexión. ¿Podemos intentar de nuevo? 🧸🔌");
        }
    }

    async executeKaiAction(action) {
        // console.log('🤖 Kai ejecutando acción:', action);
        try {
            const actionData = action.data || {};
            const id = actionData.id;

            switch (action.type) {
                case 'CREATE_ITEM':
                    if (!this.currentUser) {
                        ui.showNotification('¡Ups! Necesitas entrar para guardar.', 'warning');
                        ui.toggleSidebar();
                        return;
                    }
                    await data.createItem(actionData);
                    await this.loadItems();
                    ui.showNotification('¡Creado con éxito! ✨', 'success');
                    break;

                case 'UPDATE_ITEM':
                    if (!id) throw new Error('ID no proporcionado para actualizar');
                    await data.updateItem(id, actionData.updates || actionData);
                    await this.loadItems();
                    ui.showNotification('¡Actualizado! 📁', 'success');
                    break;

                case 'DELETE_ITEM':
                    if (!id) throw new Error('ID no proporcionado para borrar');
                    if (confirm('¿Estás segura de querer borrar esto? Kai dice que es definitivo.')) {
                        await data.deleteItem(id);
                        await this.loadItems();
                        ui.showNotification('¡Borrado! 🗑️', 'info');
                    }
                    break;

                case 'TOGGLE_TASK':
                    if (!id || actionData.taskIndex === undefined) {
                        ui.showNotification('Faltan datos para completar la tarea.', 'warning');
                        break;
                    }
                    await this.toggleTimelineTask(id, actionData.taskIndex, actionData.completed);
                    ui.showNotification(actionData.completed ? '¡Tarea completada! ✅' : 'Tarea desmarcada', 'success');
                    break;

                case 'TOGGLE_PIN':
                    if (!id) throw new Error('ID no proporcionado para anclado');
                    await this.togglePin(id);
                    break;

                case 'OPEN_PROJECT':
                    if (!id) throw new Error('ID no proporcionado para abrir proyecto');
                    await this.openProject(id);
                    ui.showNotification('Abriendo proyecto... 📁', 'info');
                    break;

                case 'OPEN_EDIT':
                    if (!id) throw new Error('ID no proporcionado para editar');
                    await this.openEditModal(id, actionData.focus);
                    break;

                case 'SEARCH':
                    const query = action.query || actionData.query;
                    if (!query) {
                        ui.showNotification('¿Qué quieres que busque Maria? 🔍', 'info');
                        break;
                    }
                    ui.showNotification(`Buscando "${query}"... 🔍`, 'info');
                    const searchResults = await data.getItems({ search: query });
                    if (searchResults.length > 0) {
                        ui.render(searchResults);
                        ui.addKaiMessage(`¡Aquí tienes lo que encontré sobre "${query}"! ✨(${searchResults.length} resultados)`);
                    } else {
                        ui.addKaiMessage(`Vaya Maria, busqué por todo el panel y no encontré nada sobre "${query}". 🧐`);
                    }
                    break;

                case 'FILTER_CATEGORY':
                    this.currentCategory = actionData.category || 'all';
                    await this.loadItems();
                    ui.showNotification(`Mostrando: ${actionData.category || 'todos'}`, 'info');
                    break;

                case 'NO_ACTION':
                    ui.showNotification('Kai entiende pero no actúa.', 'info');
                    break;

                default:
                    console.warn('Acción de Kai no reconocida:', action.type);
                    ui.showNotification('Kai intentó hacer algo, pero no lo entendí.', 'warning');
            }
        } catch (error) {
            console.error('Error al ejecutar acción de Kai:', error);
            ui.addKaiMessage(`Tuve problemas para completar esa acción: ${error.message}. 😔`);
            ui.showNotification('Error al ejecutar la acción de Kai.', 'error');
        }
    }

    async togglePin(id) {
        try {
            const items = await data.getItems({ id });
            const item = Array.isArray(items) ? items[0] : items;
            const newPinned = !item.anclado;
            await data.updateItem(id, { anclado: newPinned });
            ui.showNotification(newPinned ? '📌 Anclado al panel' : '📍 Desanclado', 'success');
            await this.loadItems();
        } catch (error) {
            console.error('Error pin:', error);
        }
    }

    async toggleTimelineTask(id, taskIndex, isCompleted) {
        try {
            const items = await data.getItems({ id });
            const item = Array.isArray(items) ? items.find(i => i.id === id) : items;
            if (item && item.tareas && item.tareas[taskIndex]) {
                item.tareas[taskIndex].completado = isCompleted;
                await data.updateItem(id, { tareas: item.tareas });
                await this.loadItems();
            }
        } catch (error) {
            console.error('Error toggle timeline task:', error);
        }
    }

    async finishItem(id) {
        try {
            const items = await data.getItems({ id });
            const item = Array.isArray(items) ? items.find(i => i.id === id) : items;
            const currentTags = item.tags || [];
            const newTags = currentTags.includes('logro') ? currentTags : [...currentTags, 'logro'];
            await data.updateItem(id, { tags: newTags, status: 'completed' });
            ui.showNotification('¡Felicidades por tu logro! 🏆', 'success');
            await this.loadItems();
        } catch (error) {
            console.error('Error finish:', error);
        }
    }

    // --- NAVEGACIÓN ---

    async openProject(id) {
        try {
            const items = await data.getItems({ id });
            const project = Array.isArray(items) ? items.find(i => i.id === id) : items;

            if (project) {
                this.breadcrumbPath.push({ id, content: project.content });
                this.currentParentId = id;
                await this.loadItems();
            }
        } catch (error) {
            console.error('Error abrir proyecto:', error);
        }
    }

    async navigateTo(id) {
        const index = this.breadcrumbPath.findIndex(item => item.id === id);
        if (index === -1) return;

        this.breadcrumbPath = this.breadcrumbPath.slice(0, index + 1);
        this.currentParentId = id;
        await this.loadItems();
    }

    async goHome() {
        this.breadcrumbPath = [];
        this.currentParentId = null;
        this.currentView = 'feed';
        await this.loadItems();
    }

    async handleCategoryClick(button) {
        document.querySelectorAll('.btn-category').forEach(b => b.classList.remove('active', 'border-brand', 'bg-white', 'shadow-sticker'));
        document.querySelectorAll('.btn-tag').forEach(b => b.classList.remove('active', 'bg-lavender', 'text-purple-600', 'border-purple-200'));

        // Aplicar estilos activos según el tipo de botón
        if (button.classList.contains('btn-tag')) {
            button.classList.add('active', 'bg-lavender', 'text-purple-600', 'border-purple-200');
        } else {
            button.classList.add('active', 'border-brand', 'bg-white', 'shadow-sticker');
        }

        // Manejar tanto categorías como tags
        this.currentCategory = button.dataset.category || null;
        this.currentTag = button.dataset.tag || null;
        this.currentView = 'feed'; // Al hacer clic en un filtro, volvemos al feed normal

        await this.loadItems();
    }

    async showDashboard(periodo = 'total') {
        try {
            // Cargar todos los items para procesarlos
            const allItems = await data.getItems({});
            
            // Aplicar filtro de periodo si no es 'total'
            let filteredItems = allItems;
            if (periodo !== 'total') {
                const now = new Date();
                const limitDate = new Date();
                if (periodo === 'semana') limitDate.setDate(now.getDate() - 7);
                if (periodo === 'mes') limitDate.setMonth(now.getMonth() - 1);
                
                filteredItems = allItems.filter(i => new Date(i.created_at) >= limitDate);
            }

            // Agrupamiento inteligente
            const grouped = {
                salud: filteredItems.filter(i => i.tags && (i.tags.includes('salud') || i.tags.includes('emocion'))),
                productividad: filteredItems.filter(i => 
                    (i.tags && i.tags.includes('logro')) || 
                    i.type === 'proyecto' || 
                    (i.type === 'tarea' && i.status !== 'completed')
                ),
                hecho: filteredItems.filter(i => i.status === 'completed')
            };

            // Cálculo de estadísticas
            const stats = this.calculateStats(filteredItems, allItems);

            // Cambiar vista en UI inicialmente con lo cuantitativo
            ui.renderDashboard(grouped, stats, periodo);
            
            // Tendencia de Energía (Para el gráfico) - ahora incluye check-ins
            const checkins = await this.getCheckinHistory(periodo === 'mes' ? 30 : 7);
            const energyTrend = this.calculateEnergyTrend(grouped.salud, periodo, checkins);
            ui.renderEnergyChart(energyTrend);

            // Manejo de Informes de Bienestar (Auto para semana/mes, manual para diario/total)
            if (grouped.salud.length > 0 || checkins.length > 0) {
                this.handleWellbeingReporting(grouped.salud, periodo);
            }

            // Actualizar estado interno
            this.currentView = 'dashboard';
        } catch (error) {
            console.error('Error al cargar dashboard:', error);
            ui.showNotification('No pude cargar tu estadísticas. 🧸🔌', 'error');
        }
    }

    calculateStats(items, allItems) {
        // Tareas totales vs completadas en el periodo
        let totalTareas = 0;
        let tareasCompletas = 0;
        
        items.forEach(item => {
            if (item.tareas && item.tareas.length > 0) {
                totalTareas += item.tareas.length;
                tareasCompletas += item.tareas.filter(t => t.completado).length;
            }
        });

        const progresoTareas = totalTareas > 0 ? Math.round((tareasCompletas / totalTareas) * 100) : 0;

        // Logros (items completados)
        const totalLogros = items.filter(i => i.status === 'completed' || (i.tags && i.tags.includes('logro'))).length;

        // Racha (basada en todos los items para consistencia)
        const racha = this.calculateStreak(allItems);

        return {
            progresoTareas,
            totalLogros,
            racha,
            totalItems: items.length
        };
    }

    calculateStreak(items) {
        if (!items || items.length === 0) return 0;
        
        const dates = [...new Set(items.map(i => i.created_at.split('T')[0]))].sort().reverse();
        let streak = 0;
        let today = new Date().toISOString().split('T')[0];
        let yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday = yesterday.toISOString().split('T')[0];

        // Si no hay actividad hoy ni ayer, la racha es 0
        if (dates[0] !== today && dates[0] !== yesterday) return 0;

        for (let i = 0; i < dates.length; i++) {
            const current = new Date(dates[i]);
            const next = dates[i+1] ? new Date(dates[i+1]) : null;
            
            streak++;
            
            if (next) {
                const diff = (current - next) / (1000 * 60 * 60 * 24);
                if (diff > 1) break; // Hueco en la racha
            }
        }
        return streak;
    }

    calculateEnergyTrend(items, periodo, checkins = []) {
        const groupedEnergy = {};
        
        // Procesar items de salud existentes
        if (items && items.length > 0) {
            items.forEach(item => {
                if (item.meta && item.meta.energia) {
                    const energia = parseInt(item.meta.energia);
                    if (!isNaN(energia) && energia >= 0 && energia <= 10) {
                        const dateKey = new Date(item.created_at).toLocaleDateString();
                        if (!groupedEnergy[dateKey]) {
                            groupedEnergy[dateKey] = { sum: 0, count: 0 };
                        }
                        groupedEnergy[dateKey].sum += energia;
                        groupedEnergy[dateKey].count++;
                    }
                }
            });
        }
        
        // Procesar check-ins (tienen prioridad porque son más precisos)
        if (checkins && checkins.length > 0) {
            checkins.forEach(checkin => {
                if (checkin.meta?.energia !== undefined) {
                    const energia = parseInt(checkin.meta.energia);
                    if (!isNaN(energia) && energia >= 0 && energia <= 10) {
                        const dateKey = new Date(checkin.created_at).toLocaleDateString();
                        const momento = checkin.meta.momento;
                        
                        if (!groupedEnergy[dateKey]) {
                            groupedEnergy[dateKey] = { sum: 0, count: 0, momentos: {} };
                        }
                        if (!groupedEnergy[dateKey].momentos) {
                            groupedEnergy[dateKey].momentos = {};
                        }
                        
                        // Agregar por momento del día
                        groupedEnergy[dateKey].momentos[momento] = energia;
                        groupedEnergy[dateKey].sum += energia;
                        groupedEnergy[dateKey].count++;
                    }
                }
            });
        }

        if (Object.keys(groupedEnergy).length === 0) return [];

        // Convertir a lista de puntos [ { label, value } ]
        return Object.entries(groupedEnergy)
            .map(([date, data]) => ({
                label: date.split('/')[0] + '/' + date.split('/')[1], // Solo día/mes
                value: Math.round(data.sum / data.count),
                momentos: data.momentos || {},
                timestamp: new Date(date).getTime()
            }))
            .sort((a, b) => a.timestamp - b.timestamp)
            .slice(-7); // Limitar a las últimas 7 entradas para el gráfico
    }

    async handleWellbeingReporting(items, periodo) {
        try {
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];
            
            // 1. Buscar si ya existe un reporte para este periodo hoy
            // Buscamos items de tipo 'reporte' creados hoy
            const recentReports = await data.getItems({ type: 'reporte' });
            const existingReport = recentReports.find(r => 
                r.meta?.periodo === periodo && 
                r.created_at.startsWith(todayStr)
            );

            if (existingReport) {
                console.log(`Cargando reporte persistido para ${periodo}`);
                ui.renderWellbeingReport(existingReport.content);
                return;
            }

            // 2. Si no existe, verificar si es "hora de reporte"
            let shouldGenerate = false;
            if (periodo === 'total') shouldGenerate = true; // El total siempre genera si no hay
            if (periodo === 'semana' && now.getDay() === 0 && now.getHours() >= 12) shouldGenerate = true; // Domingo mediodía
            if (periodo === 'mes') {
                const isLastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() === now.getDate();
                if (isLastDay && now.getHours() >= 18) shouldGenerate = true;
            }
            
            // Reporte Total siempre genera si no hay
            if (periodo === 'total') shouldGenerate = true;

            if (shouldGenerate) {
                await this.generateAndSaveWellbeingReport(items, periodo);
            } else {
                // Si es periodo 'semana' pero no es domingo, permitimos disparo manual ( Diario )
                if (periodo === 'semana' || periodo === 'total') {
                    ui.renderWellbeingReportTrigger();
                } else {
                    ui.renderWellbeingReport("Kai te tendrá listo tu informe consolidado al final del periodo. ¡Sigue cuidándote! 🌸🏠");
                }
            }
        } catch (error) {
            console.error('Error en manejo de reportes:', error);
        }
    }

    async triggerManualReport() {
        try {
            // Obtener items de salud para el reporte
            const allItems = await data.getItems({});
            const limitDate = new Date();
            limitDate.setDate(limitDate.getDate() - 7); // Última semana para el diario
            
            const healthItems = allItems.filter(i => 
                (i.tags && (i.tags.includes('salud') || i.tags.includes('emocion'))) &&
                new Date(i.created_at) >= limitDate
            );

            if (healthItems.length > 0) {
                await this.generateAndSaveWellbeingReport(healthItems, 'diario');
            } else {
                ui.showNotification('No hay suficientes registros hoy para un informe. 🧸', 'info');
            }
        } catch (error) {
            console.error('Error en trigger manual:', error);
        }
    }

    async generateAndSaveWellbeingReport(items, periodo) {
        try {
            ui.renderWellbeingReportLoading();

            const dataForKai = items.map(i => ({
                fecha: new Date(i.created_at).toLocaleDateString(),
                contenido: i.content,
                energia: i.meta?.energia || 'Texto libre (infiere tú)',
                descripcion: i.descripcion || ''
            }));

            const prompt = `Actúa como Kai, el asistente empático de Maria. 
            Analiza estos registros de bienestar y energía (${periodo}):
            ${JSON.stringify(dataForKai)}

            INSTRUCCIONES CRÍTICAS:
            1. Si el campo "energia" dice "Texto libre", analiza el texto (ej: "cansada", "sin ganas", "a tope") para inferir su nivel de energía.
            2. Escribe un informe de 3-4 párrafos que sea muy motivador y use su nombre "Maria".
            3. Identifica patrones entre lo que come/duerme/hace y cómo se siente.
            4. Tono amoroso, cercano y sin juicios.
            
            Solo devuelve el texto plano del informe. No incluyas JSON ni bloques de acción.`;

            const response = await cerebras.ask(prompt);
            const reportText = response.response || "Hoy mis pensamientos están en calma. Sigue brillando, Maria. ✨";

            // Guardar en DB para no repetir - CORREGIDO: data.createItem
            await data.createItem({
                content: reportText,
                type: 'reporte',
                meta: { periodo, energyAverage: 0 },
                tags: ['kai', 'bienestar'],
                created_at: new Date().toISOString()
            });

            ui.renderWellbeingReport(reportText);
        } catch (error) {
            console.error('Error generando/guardando reporte:', error);
            ui.renderWellbeingReport("Kai tuvo un problema guardando tus pensamientos: " + error.message);
        }
    }

    async openEditModal(id, focus = null) {
        try {
            const items = await data.getItems({ id });
            const item = Array.isArray(items) ? items.find(i => i.id === id) : items;
            if (item) {
                ui.fillEditModal(item, focus);
                ui.toggleModal(true);
            }
        } catch (error) {
            ui.showNotification('Error al cargar datos del elemento.', 'error');
        }
    }

    // --- AUTH & VOICE ---

    async handleGoogleLogin() {
        try { await auth.signInWithGoogle(); }
        catch (error) { ui.showNotification('Error al conectar con Google.', 'error'); }
    }

    async handleLogout() {
        try {
            await auth.signOut();
            this.currentUser = null;
            ui.updateUserInfo(null);
            ui.toggleSidebar();
            this.goHome();
        } catch (error) {
            ui.showNotification('Error al cerrar sesión.', 'error');
        }
    }

    toggleVoiceInput() {
        if (ai.isRecording) this.stopVoiceInput();
        else {
            ui.toggleVoiceOverlay(true);
            ai.startVoice();
        }
    }

    stopVoiceInput() {
        ai.stopVoice();
        ui.toggleVoiceOverlay(false);
    }

    // =====================================
    // SECCIÓN 8: CHECK-INS DE BIENESTAR
    // =====================================

    getCheckinConfig() {
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

    async initCheckinSystem() {
        try {
            await this.requestNotificationPermission();
            
            // Obtener token FCM para notificaciones push
            try {
                const { requestFCMToken, onForegroundMessage } = await import('./firebase.js');
                await requestFCMToken();
                await onForegroundMessage();
                console.log('✓ Token FCM configurado');
            } catch (fcmError) {
                console.warn('FCM no disponible:', fcmError);
            }
            
            this.checkPendingCheckin();
            this.startCheckinChecker();
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
        if (!this.currentUser) return;
        
        const momento = this.getCurrentMoment();
        const checkinId = this.getCheckinId(momento);
        
        try {
            const items = await data.getItems({ type: 'checkin' });
            const yaRespondio = items.some(item => item.meta?.checkin_id === checkinId);
            
            ui.toggleCheckinButton(!yaRespondio, momento);
            
            if (!yaRespondio) {
                this.scheduleCheckinNotification(momento);
            }
        } catch (error) {
            console.error('Error checkPendingCheckin:', error);
        }
    }

    renderCheckinButton() {
        ui.renderCheckinButton(this.getCheckinConfig().momentos);
    }

    async showCheckinModal(momento = null) {
        const momentoActual = momento || this.getCurrentMoment();
        const momentoConfig = this.getCheckinConfig().momentos.find(m => m.id === momentoActual);
        const ahora = new Date();
        
        const checkinData = {
            momento: momentoConfig,
            energia: this.getCheckinConfig().opcionesEnergia,
            emocion: this.getCheckinConfig().opcionesEmocion,
            timestamp: ahora.toISOString()
        };
        
        ui.showCheckinModal(checkinData);
    }

    async saveCheckin(momento, energia, emocion, hora = null) {
        const fecha = new Date().toISOString().split('T')[0];
        const checkinId = this.getCheckinId(momento, fecha);
        
        const momentoConfig = this.getCheckinConfig().momentos.find(m => m.id === momento);
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

        if (!this.currentUser) {
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
            await this.loadItems();
            return true;
        } catch (error) {
            console.error('Error saveCheckin:', error);
            ui.showNotification('Error al guardar check-in.', 'error');
            return false;
        }
    }

    async getCheckinHistory(dias = 7) {
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

    calculateCheckinTrend(checkins, periodo = 'semana') {
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

    scheduleCheckinNotification(momento) {
        const momentoConfig = this.getCheckinConfig().momentos.find(m => m.id === momento);
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
            this.showCheckinNotification(momento);
        }, tiempoEspera);
        
        console.log(`Notificación de check-in programada para ${horaNotificacion.toLocaleString()}`);
    }

    showCheckinNotification(momento) {
        const momentoConfig = this.getCheckinConfig().momentos.find(m => m.id === momento);
        if (!momentoConfig) return;
        
        if (Notification.permission === 'granted') {
            const notification = new Notification('💭 Check-in de Bienestar', {
                body: momentoConfig.pregunta,
                icon: '/icon.png',
                tag: 'checkin',
                requireInteraction: true
            });
            
            notification.onclick = () => {
                window.focus();
                this.showCheckinModal(momento);
                notification.close();
            };
        }
        
        this.scheduleCheckinNotification(momento);
    }

    startCheckinChecker() {
        setInterval(() => {
            this.checkPendingCheckin();
        }, 60000);
    }

    // === Debug: Test de Notificaciones Push ===
    async testPushNotification() {
        try {
            ui.showNotification('🔔 Iniciando test...', 'info');
            
            // Obtener token fresco del dispositivo actual
            const firebase = await import('./firebase.js');
            const token = await firebase.requestFCMToken();
            
            if (!token) {
                ui.showNotification('🔔 ERROR: No se pudo obtener token FCM', 'error');
                return;
            }
            
            console.log('Token FCM:', token.substring(0, 30) + '...');
            
            // Enviar notificación de prueba - NO pas token, la función lo busca automáticamente
            const { supabase } = await import('./supabase.js');
            
            const { data, error } = await supabase.functions.invoke('send-push', {
                body: {
                    title: '🔔 Test de KAI',
                    body: 'Si ves esto, las notificaciones push funcionan! 🎉',
                    timestamp: Date.now()
                }
            });

            if (error) {
                console.error('Error enviando push:', error);
                ui.showNotification('❌ Error: ' + (error.message || JSON.stringify(error)), 'error');
            } else {
                console.log('Push enviado:', data);
                ui.showNotification(`✅ ${data.message || 'Notificación enviada!'}`, 'success');
            }
        } catch (error) {
            console.error('Test push error:', error);
            ui.showNotification('❌ Error: ' + error.message, 'error');
        }
    }
}



// Inicialización global
window.addEventListener('DOMContentLoaded', () => {
    window.kai = new KaiController();
    window.controller = window.kai; // Compatibilidad con módulos que buscan window.controller
});

export default KaiController;
