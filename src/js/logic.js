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
 * SECCIÓN 3: CRUD de Items (lines 151-380)
 *   - crearItem(), editarItem(), borrarItem()
 *   - loadItems(), finishItem(), toggleAnclado
 *   - updateItemInline(), saveInlineEdit()
 * 
 * SECCIÓN 4: IA / Kai (lines 381-950)
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
import { salud } from './salud.js';
import { gatos } from './gatos.js';
import { utils } from './utils.js';

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
        this.currentCategory = 'tarea';
        this.currentTag = null;
        this.currentExcludeTag = null;
        this.breadcrumbPath = [];
        this.currentView = 'timeline'; // Default: Timeline
        this.expandedCardId = null; // ID de la card expandida (para persistencia)
        this.isAnimating = false; // Guard para animación de completado
        this.inicioFilter = null; // Filtro de Inicio: null=todas, 'pending'=pendientes, 'completed'=logradas
        this.init();
    }

    async init() {
        ui.init();
        this.bindEvents();
        // Las alarmas ahora las maneja alarms.js directamente
        this.setupRealtimeSubscription();

        try {
            this.currentUser = await auth.init();
            salud.init(this.currentUser);
            this.gatos = gatos;
            this.gatos.init(this.currentUser);
            if (this.currentUser) {
                ui.updateUserInfo(this.currentUser);
                // Restaurar estado persistido DESPUÉS de tener usuario
                this.restoreState();
                // Cargar según la vista actual
                if (this.currentView === 'hoy' || this.currentView === 'salud') {
                    await salud.loadHoySection();
                } else if (this.currentView === 'gatos') {
                    await this.gatos.loadGatosSection();
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

        // Configurar eventos de gestión de etiquetas
        this.setupTagManagerEvents();

        ai.init();
        salud.initCheckinSystem();
    }
    
    // === Persistencia de Estado ===
    saveState() {
        const state = {
            currentView: this.currentView,
            expandedCardId: this.expandedCardId,
            currentCategory: this.currentCategory,
            currentTag: this.currentTag,
            currentExcludeTag: this.currentExcludeTag
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
                this.currentCategory = state.currentCategory || 'tarea';
                this.currentTag = state.currentTag || null;
                this.currentExcludeTag = state.currentExcludeTag || null;
                
                // Aplicar la vista guardada (sin cargar datos - eso se hace en init())
                this.applyViewStateOnly();
            }
        } catch (e) {
            console.warn('No se pudo restaurar estado:', e);
        }
    }
    
    // Versión de applyViewState que NO carga datos (para restoreState)
    applyViewStateOnly() {
        // La navegación ahora la maneja switchView() en index.html.
        // applyViewStateOnly solo se ocupa de la UI en init(), sin cargar datos.
        // Delegamos al switchView unificado para vistas que no sean timeline.
        const sectionSalud = document.getElementById('section-salud');  // Antes "section-hoy"
        const sectionInicio = document.getElementById('section-inicio');
        const sectionBaul = document.getElementById('section-baul');
        const sectionHistorial = document.getElementById('section-historial');
        const sectionGatos = document.getElementById('section-gatos');
        const timelineContent = document.getElementById('timeline-content');
        const itemsContainer = document.getElementById('items-container');
        
        // Ocultar todo primero
        [sectionSalud, sectionInicio, sectionBaul, sectionHistorial, sectionGatos].forEach(s => {
            if (s) s.classList.add('hidden');
        });
        if (timelineContent) timelineContent.classList.add('hidden');
        if (itemsContainer) itemsContainer.classList.add('hidden');
        
        // Mostrar según la vista
        if (this.currentView === 'timeline') {
            if (sectionInicio) sectionInicio.classList.remove('hidden');
            // Inicio NO muestra timelineContent ni itemsContainer (solo la quick bar y su lista propia)
        } else if (this.currentView === 'salud') {
            if (sectionSalud) sectionSalud.classList.remove('hidden');
        } else if (this.currentView === 'historial') {
            if (sectionHistorial) sectionHistorial.classList.remove('hidden');
            if (timelineContent) timelineContent.classList.remove('hidden');
            if (itemsContainer) itemsContainer.classList.remove('hidden');
        } else if (this.currentView === 'baul') {
            if (sectionBaul) sectionBaul.classList.remove('hidden');
        } else if (this.currentView === 'dashboard') {
            if (itemsContainer) itemsContainer.classList.remove('hidden');
        } else if (this.currentView === 'gatos') {
            if (sectionGatos) sectionGatos.classList.remove('hidden');
        }
    }

    
    applyViewState() {
        // Igual que applyViewStateOnly - solo UI, delegar carga de datos al inline switchView
        this.applyViewStateOnly();
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
        
        // Si es SALUD, cargar datos de SALUD
        if (view === 'salud') {
            salud.loadHoySection();
        }
        
        // Si es GATOS, cargar datos de GATOS
        if (view === 'gatos') {
            this.gatos.loadGatosSection();
        }
    }
    
    // ==================== SECCIÓN SALUD (Delegada a salud.js) ====================

    async loadHoySection() {
        return salud.loadHoySection();
    }

    async saveWellness(wellnessData) {
        return salud.saveWellness(wellnessData);
    }

    async getTodayWellness() {
        return salud.getTodayWellness();
    }

    async loadWellnessHistory(days = 7) {
        return salud.loadWellnessHistory(days);
    }

    async testPushNotification() {
        return salud.testPushNotification();
    }

    async loadTodayWellness() {
        return salud.loadTodayWellness();
    }

    async bindSaludEvents() {
        return salud.bindSaludEvents();
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

    bindEvents() {
        // --- Navegación ---
        document.getElementById('btn-home')?.addEventListener('click', () => this.goHome());
        
        // --- Notificaciones ---
        this.initNotifications();

        
        // --- Datos (Import/Export) ---
        document.getElementById('btn-export')?.addEventListener('click', () => this.handleExport());
        document.getElementById('btn-import')?.addEventListener('click', () => {
            document.getElementById('import-file')?.click();
        });
        document.getElementById('import-file')?.addEventListener('change', (e) => this.handleImport(e));
        
        // --- Debug: Test Notificación ---
        document.getElementById('btn-test-notification')?.addEventListener('click', async () => {
            await salud.testPushNotification();
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
                this.handleCategoryClick(e.currentTarget);
            });
        });

        // --- Navegación & Tags ---
        document.querySelectorAll('.btn-tag').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleCategoryClick(e.currentTarget);
            });
        });

        // --- Tags en cards (clicables como filtro) ---
        document.addEventListener('click', (e) => {
            const tagBtn = e.target.closest('.tag-filter');
            if (tagBtn) {
                e.preventDefault();
                const tag = tagBtn.dataset.tag;
                if (tag) {
                    this.currentTag = tag;
                    this.currentCategory = null;
                    this.applyViewState();
                    this.saveState();
                    this.loadItems();
                }
            }
        });

        // Modals & Sidebar ---
        document.getElementById('btn-user')?.addEventListener('click', () => ui.toggleSidebar());
        document.getElementById('btn-close-sidebar')?.addEventListener('click', () => ui.closeSidebar());
        document.getElementById('sidebar-overlay')?.addEventListener('click', () => ui.closeSidebar());
        document.getElementById('btn-google')?.addEventListener('click', () => this.handleGoogleLogin());
        document.getElementById('btn-logout')?.addEventListener('click', () => this.handleLogout());
        document.getElementById('btn-add-task')?.addEventListener('click', () => ui.addTaskToModal());
        document.getElementById('btn-dashboard')?.addEventListener('click', () => {
            ui.closeSidebar();
            document.getElementById('section-inicio')?.classList.add('hidden');
            document.getElementById('timeline-content')?.classList.add('hidden');
            document.getElementById('items-container')?.classList.remove('hidden');
            this.showDashboard('total');
        });
        
        // Cards de filtro rápido en Inicio (solo tareas y proyectos)
        document.getElementById('card-pendientes')?.addEventListener('click', () => {
            this.currentTag = null;
            this.inicioFilter = 'pending';
            this.currentView = 'timeline';
            // Resaltar card activa
            document.getElementById('card-pendientes')?.classList.add('ring-2', 'ring-brand');
            document.getElementById('card-logradas')?.classList.remove('ring-2', 'ring-brand', 'ring-success');
            this.loadInicioTasks();
            this.updateFilterCounts();
            this.saveState();
        });
        document.getElementById('card-logradas')?.addEventListener('click', () => {
            this.currentTag = null;
            this.inicioFilter = 'completed';
            this.currentView = 'timeline';
            // Resaltar card activa
            document.getElementById('card-logradas')?.classList.add('ring-2', 'ring-success');
            document.getElementById('card-pendientes')?.classList.remove('ring-2', 'ring-brand', 'ring-success');
            this.loadInicioTasks();
            this.updateFilterCounts();
            this.saveState();
        });
        
        // Cambio de período en dashboard de estadísticas
        window.addEventListener('changeStatsPeriod', async (e) => {
            const periodo = e.detail?.periodo || 'total';
            await this.showDashboard(periodo);
        });
        
        // Cambio de período en dashboard de logros
        window.addEventListener('changeAchievementsPeriod', async (e) => {
            const periodo = e.detail?.periodo || 'total';
            const allItems = await data.getItems({});
            
            // Períodos calendario reales
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth();
            
            // Hallar inicio de semana actual (lunes)
            const dayOfWeek = now.getDay();
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            weekStart.setHours(0, 0, 0, 0);
            
            // Inicio de mes actual
            const monthStart = new Date(currentYear, currentMonth, 1);
            
            // Inicio de año actual
            const yearStart = new Date(currentYear, 0, 1);
            
            let startDate = null;
            const endDate = new Date(now);
            
            if (periodo === 'semana') {
                startDate = weekStart;
            } else if (periodo === 'mes') {
                startDate = monthStart;
            } else if (periodo === 'anio') {
                startDate = yearStart;
            }
            
            const filteredAchievements = allItems.filter(item => {
                const isLogro = item.type === 'logro' || (item.tags && item.tags.includes('logro'));
                if (!isLogro) return false;
                if (!startDate) return true;
                const itemDate = new Date(item.created_at);
                return itemDate >= startDate && itemDate <= endDate;
            });
            
            // Renderizar con el período seleccionado
            ui.renderAchievementsDashboard(filteredAchievements, periodo);
        });

        // Kai Sidebar Button
        document.getElementById('btn-kai-sidebar')?.addEventListener('click', () => {
            ui.closeSidebar();
            ui.toggleKaiChat();
        });

        // Tag suggestions (Modal Edit)
        document.querySelectorAll('.tag-suggestion').forEach(tag => {
            tag.addEventListener('click', () => {
                const input = document.getElementById('edit-tags');
                const current = input.value || '';
                const newTag = tag.dataset.tag;
                input.value = current && !current.endsWith(' ') ? current + ', ' + newTag : current + newTag;
            });
        });

        // Autocomplete de etiquetas en modal de edición
        const editTagsInput = document.getElementById('edit-tags');
        const tagAutocomplete = document.getElementById('tag-autocomplete');
        
        if (editTagsInput && tagAutocomplete) {
            editTagsInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase().trim();
                const lastTag = query.split(',').pop().trim();
                
                if (!lastTag) {
                    tagAutocomplete.classList.add('hidden');
                    return;
                }
                
                const allTags = this.getAllTags();
                const matches = allTags.filter(t => t.includes(lastTag));
                
                if (matches.length === 0) {
                    tagAutocomplete.classList.add('hidden');
                    return;
                }
                
                tagAutocomplete.innerHTML = matches.map(tag => 
                    `<div class="tag-option px-3 py-2 hover:bg-brand/10 cursor-pointer text-sm text-brand" data-tag="${tag}">#${tag}</div>`
                ).join('');
                
                tagAutocomplete.classList.remove('hidden');
                
                // Agregar tags al hacer click
                tagAutocomplete.querySelectorAll('.tag-option').forEach(opt => {
                    opt.addEventListener('click', () => {
                        const current = editTagsInput.value;
                        const parts = current.split(',');
                        parts.pop();
                        parts.push(opt.dataset.tag.trim());
                        editTagsInput.value = parts.join(', ') + ', ';
                        tagAutocomplete.classList.add('hidden');
                        editTagsInput.focus();
                    });
                });
            });
            
            // Ocultar autocomplete al hacer click fuera
            document.addEventListener('click', (e) => {
                if (!editTagsInput.contains(e.target) && !tagAutocomplete.contains(e.target)) {
                    tagAutocomplete.classList.add('hidden');
                }
            });
        }

        // Quick tags for inline addition (Footer Input)
        document.querySelectorAll('.quick-tag').forEach(tagBtn => {
            tagBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const input = ui.elements.inputMain();
                if (input) {
                    const tagValue = tagBtn.dataset.tag;
                    const currentValue = input.value.trim();
                    if (!currentValue.includes(tagValue)) {
                        input.value = currentValue ? `${currentValue} ${tagValue} ` : `${tagValue} `;
                    }
                    input.focus();
                }
            });
        });

        // Voz e Interfaz
        document.getElementById('btn-voice-footer')?.addEventListener('click', () => this.toggleVoiceInput());
        document.getElementById('btn-close-voice')?.addEventListener('click', () => this.stopVoiceInput());
        document.getElementById('btn-stop-voice')?.addEventListener('click', () => this.stopVoiceInput());

        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => ui.toggleModal(false));
        });

        // Modal de Alarmas
        document.getElementById('btn-alarms')?.addEventListener('click', () => this.showAlarmsModal());
        
        // Botón de prueba de notificaciones
        document.getElementById('btn-test-notif')?.addEventListener('click', async () => {
            const token = localStorage.getItem('fcmToken');
            if (!token) {
                alert('🔔 No hay token FCM. Permití notificaciones primero.');
                return;
            }
            
            try {
                const response = await fetch('https://jiufptuxadjavjfbfwka.supabase.co/functions/v1/send-push', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppdWZwdHV4YWRqYXZqZmJmd2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwODY0NzgsImV4cCI6MjA4NTY2MjQ3OH0.LCXYWsmD-ZM45O_HNVwFHu8dJFzxns3Zd_2BHusm2CY',
                        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppdWZwdHV4YWRqYXZqZmJmd2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwODY0NzgsImV4cCI6MjA4NTY2MjQ3OH0.LCXYWsmD-ZM45O_HNVwFHu8dJFzxns3Zd_2BHusm2CY'
                    },
                    body: JSON.stringify({
                        token: token,
                        title: '🧪 Notificación de prueba',
                        body: 'Si ves esto, las push notifications funcionan correctamente',
                        type: 'test',
                        priority: 'normal'
                    })
                });
                
                const result = await response.json();
                if (response.ok) {
                    alert('✅ Notificación enviada! Revisa si te llegó (puede tomar unos segundos)');
                } else {
                    alert('❌ Error: ' + JSON.stringify(result));
                }
            } catch (error) {
                alert('❌ Error: ' + error.message);
            }
        });
        
        document.querySelectorAll('.modal-alarms-close').forEach(btn => {
            btn.addEventListener('click', () => ui.toggleAlarmsModal(false));
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
                await salud.initCheckinSystem();
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

        // --- Inicio: Quick-add submit ---
        const quickInput = document.getElementById('inicio-quick-input');
        if (quickInput) {
            quickInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.quickAddInicio(quickInput.value);
                }
            });
        }

        const btnAdd = document.getElementById('btn-inicio-add');
        if (btnAdd) {
            btnAdd.addEventListener('click', () => {
                const input = document.getElementById('inicio-quick-input');
                if (input) {
                    this.quickAddInicio(input.value);
                }
            });
        }

        // --- Inicio: Points selector ---
        document.querySelectorAll('.points-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.points-btn').forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-pressed', 'false');
                });
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');
            });
        });

        // --- Inicio: Tag chip clicks (delegated) ---
        const tagFilterBar = document.getElementById('inicio-tag-filters');
        if (tagFilterBar) {
            tagFilterBar.addEventListener('click', (e) => {
                const chip = e.target.closest('.tag-chip');
                if (chip) {
                    const tag = chip.dataset.tag;
                    this.filterByTag(tag);
                }
            });
        }

        // --- Inicio: Task checkbox clicks & edit/delete (delegated) ---
        const taskList = document.getElementById('inicio-task-list');
        if (taskList) {
            // Checkbox toggle
            taskList.addEventListener('change', (e) => {
                if (e.target.classList.contains('task-checkbox')) {
                    const row = e.target.closest('.task-row');
                    if (row) {
                        this.toggleCompletado(row.dataset.itemId, row);
                    }
                }
            });

            // Inline edit on text click + delete action
            taskList.addEventListener('click', (e) => {
                const deleteBtn = e.target.closest('.action-delete');
                const taskText = e.target.closest('.task-text');

                if (deleteBtn) {
                    e.stopPropagation();
                    const id = deleteBtn.dataset.id;
                    if (confirm('¿Eliminar esta tarea?')) {
                        data.deleteItem(id).then(() => {
                            this.loadItems();
                            ui.showNotification('Tarea eliminada', 'info');
                        }).catch(err => {
                            console.error('Error deleting task:', err);
                            ui.showNotification('Error al eliminar', 'error');
                        });
                    }
                } else if (taskText && !taskText.isContentEditable) {
                    e.stopPropagation();
                    const id = taskText.dataset.id;
                    const original = taskText.textContent;

                    taskText.contentEditable = 'true';
                    taskText.classList.add('editing');
                    taskText.focus();

                    // Seleccionar todo el texto
                    const range = document.createRange();
                    range.selectNodeContents(taskText);
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);

                    const save = () => {
                        taskText.contentEditable = 'false';
                        taskText.classList.remove('editing');
                        const newText = taskText.textContent.trim();
                        if (newText && newText !== original) {
                            const sanitized = utils.sanitizeInput(newText);
                            taskText.textContent = sanitized;
                            data.updateItem(id, { content: sanitized }).catch(err => {
                                console.error('Error saving inline edit:', err);
                                taskText.textContent = original;
                                ui.showNotification('Error al guardar', 'error');
                            });
                        } else if (!newText) {
                            taskText.textContent = original;
                        } else {
                            taskText.textContent = original;
                        }
                    };

                    const onBlur = () => save();
                    const onKeydown = (ev) => {
                        if (ev.key === 'Enter') {
                            ev.preventDefault();
                            taskText.blur();
                        } else if (ev.key === 'Escape') {
                            taskText.textContent = original;
                            taskText.contentEditable = 'false';
                            taskText.classList.remove('editing');
                        }
                    };

                    taskText.addEventListener('blur', onBlur, { once: true });
                    taskText.addEventListener('keydown', onKeydown);
                    // Clean up keydown listener on blur
                    taskText.addEventListener('blur', () => {
                        taskText.removeEventListener('keydown', onKeydown);
                    }, { once: true });
                }

                // Eliminar etiqueta (click en la X)
                const removeTagBtn = e.target.closest('.remove-tag-btn');
                if (removeTagBtn) {
                    e.stopPropagation();
                    const itemId = removeTagBtn.closest('.task-row').dataset.itemId;
                    const tagToRemove = removeTagBtn.dataset.tag;
                    
                    const item = this.items.find(i => i.id === itemId);
                    if (item && item.tags) {
                        const newTags = item.tags.filter(t => t !== tagToRemove);
                        data.updateItem(itemId, { tags: newTags }).then(() => {
                            item.tags = newTags;
                            this.loadInicioTasks();
                            this.updateFilterCounts();
                            ui.showNotification('Etiqueta eliminada', 'info');
                        }).catch(err => {
                            console.error('Error removing tag:', err);
                            ui.showNotification('Error al eliminar etiqueta', 'error');
                        });
                    }
                }

                // Agregar etiqueta (click en + Tag) - Input con autocompletado
                const addTagBtn = e.target.closest('.add-tag-btn');
                if (addTagBtn) {
                    e.stopPropagation();
                    const itemId = addTagBtn.dataset.id;
                    const allTags = this.getAllTags();
                    const currentTags = this.items.find(i => i.id === itemId)?.tags || [];
                    
                    // Crear input inline con autocomplete
                    const existingInput = document.querySelector('.quick-tag-input');
                    if (existingInput) existingInput.remove();
                    
                    const wrapper = document.createElement('div');
                    wrapper.className = 'relative quick-tag-wrapper';
                    
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.className = 'text-xs border rounded-lg p-1 bg-white w-24';
                    input.placeholder = 'escribir...';
                    
                    const dropdown = document.createElement('div');
                    dropdown.className = 'absolute z-50 top-full left-0 mt-1 bg-white border rounded-lg shadow-lg hidden max-h-32 overflow-y-auto quick-tag-dropdown';
                    
                    wrapper.appendChild(input);
                    wrapper.appendChild(dropdown);
                    
                    // Insertar después del botón
                    addTagBtn.parentNode.insertBefore(wrapper, addTagBtn.nextSibling);
                    input.focus();
                    
                    // Autocomplete mientras escribe
                    input.addEventListener('input', (ev) => {
                        const query = ev.target.value.toLowerCase();
                        const available = allTags.filter(t => !currentTags.includes(t) && t.includes(query));
                        
                        if (available.length === 0 || !query) {
                            dropdown.classList.add('hidden');
                            return;
                        }
                        
                        dropdown.innerHTML = available.map(t => 
                            `<div class="tag-option px-2 py-1 hover:bg-brand/10 cursor-pointer text-xs text-brand" data-tag="${t}">#${t}</div>`
                        ).join('');
                        dropdown.classList.remove('hidden');
                        
                        dropdown.querySelectorAll('.tag-option').forEach(opt => {
                            opt.addEventListener('click', () => {
                                this.addTagToItem(itemId, opt.dataset.tag);
                                wrapper.remove();
                            });
                        });
                    });
                    
                    // Enter para confirmar nueva etiqueta
                    input.addEventListener('keydown', (ev) => {
                        if (ev.key === 'Enter') {
                            ev.preventDefault();
                            const val = input.value.trim();
                            if (val) {
                                this.addTagToItem(itemId, val.toLowerCase());
                            }
                            wrapper.remove();
                        } else if (ev.key === 'Escape') {
                            wrapper.remove();
                        }
                    });
                    
                    // Cerrar al hacer click fuera
                    setTimeout(() => {
                        document.addEventListener('click', function onDocClick(e) {
                            if (!wrapper.contains(e.target)) {
                                wrapper.remove();
                                document.removeEventListener('click', onDocClick);
                            }
                        });
                    }, 0);
                }
            });
        }
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
        if (text.includes('alarma') || text.includes('recordatorio') || text.includes('recordar') || text.includes('recordación')) tags.push('recordatorio');

        // Extraer hashtags explícitos (ej. #salud, #mi-mes)
        let cleanContent = content;
        const hashtags = content.match(/#[\w-]+/g);
        if (hashtags) {
            hashtags.forEach(tag => {
                const cleanTag = tag.substring(1).toLowerCase();
                if (!tags.includes(cleanTag)) {
                    tags.push(cleanTag);
                }
                // Remover el hashtag del texto limpio para título/descripción (opcional pero ayuda a mantener la interfaz limpia)
                cleanContent = cleanContent.replace(tag, '').replace(/\s{2,}/g, ' ').trim();
            });
        }

        // 5. Detectar alarmas/deadlines en el texto
        let deadline = null;
        let repeat = null;
        
        // Patrones de repetición
        if (text.includes('cada día') || text.includes('diario') || text.includes('todos los días')) {
            repeat = 'daily';
        } else if (text.includes('cada semana') || text.includes('semanal') || text.includes('todos los semanas')) {
            repeat = 'weekly';
        } else if (text.includes('cada mes') || text.includes('mensual') || text.includes('todos los meses')) {
            repeat = 'monthly';
        }
        
        // Detectar hora en el texto (formato: a las HH:MM, a las HHpm, a las HHam, a las HH)
        const horaMatch = text.match(/a las\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
        let hora = null;
        let minutos = 0;
        if (horaMatch) {
            hora = parseInt(horaMatch[1]);
            if (horaMatch[2]) minutos = parseInt(horaMatch[2]);
            const ampm = horaMatch[3]?.toLowerCase();
            if (ampm === 'pm' && hora < 12) hora += 12;
            if (ampm === 'am' && hora === 12) hora = 0;
        }
        
        // Detectar fecha (hoy, mañana, fecha)
        let fecha = null;
        if (text.includes('hoy')) {
            fecha = new Date();
        } else if (text.includes('mañana')) {
            fecha = new Date();
            fecha.setDate(fecha.getDate() + 1);
        } else {
            const fechaMatch = text.match(/el\s+(\d{1,2})\s+de\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[oa]?/i);
            if (fechaMatch) {
                fecha = new Date();
                const meses = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11 };
                fecha.setMonth(meses[fechaMatch[2].substring(0, 3)]);
                fecha.setDate(parseInt(fechaMatch[1]));
            }
        }
        
        if (hora !== null || fecha) {
            deadline = fecha || new Date();
            if (hora !== null) {
                deadline.setHours(hora, minutos, 0, 0);
            }
            // Si la hora ya pasó hoy, programar para mañana
            if (deadline.getTime() < Date.now() && !text.includes('mañana')) {
                deadline.setDate(deadline.getDate() + 1);
            }
        }

        return {
            type,
            content: cleanContent,
            descripcion: cleanContent.length > 50 ? cleanContent : '',
            tags,
            items: [],
            hasDeadline: !!deadline,
            deadline: deadline ? deadline.toISOString() : null,
            repeat,
            hasRecordatorio: !!deadline // Para detectar si es recordatorio automático
        };
    }

    async addItem(input) {
        try {
            await data.createItem({
                content: utils.sanitizeInput(input.contenido || ''),
                type: input.tipo || 'nota',
                tags: input.tags || [],
                parent_id: this.currentParentId
            });
            ui.showNotification('¡Anotado! ✨', 'success');
            await this.loadItems();
        } catch (error) {
            console.error('Error addItem:', error);
            ui.showNotification('No pude guardar. ¿Intentamos de nuevo?', 'error');
        }
    }

    async handleSubmit() {
        const { content, type } = ui.getMainInputData();
        if (!content) return;

        if (!this.currentUser) {
            ui.showNotification('¡Ups! Necesitas entrar para que Kai recuerde esto.', 'warning');
            ui.toggleSidebar();
            return;
        }

        // ========== ESPECIAL: atajo "hice:" para logros ==========
        const inputLower = content.toLowerCase().trim();
        if (inputLower.startsWith('hice:')) {
            await this.handleLogroInput(content);
            return;
        }
        // =========================================================

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
            let finalDeadline = offline.deadline;
            let finalRepeat = offline.repeat;

            // AGREGAR TAG AUTOMÁTICO: Si hay deadline pero no tiene "recordatorio", agregarlo
            if (finalDeadline && !finalTags.includes('recordatorio')) {
                finalTags.push('recordatorio');
            }

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
                    // PRIORIDAD: tags offline primero (hashtags explícitos) > tags IA
                    // Esto evita que la IA borre tags manuales como #mi-mes
                    const aiTags = aiData.tags || [];
                    finalTags = [...new Set([...finalTags, ...aiTags])];
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
                deadline: finalDeadline,
                repeat: finalRepeat
            });

            // 4. El trigger trg_sync_alarm_notification crea automáticamente
            //    un registro en alarm_notifications. El cron check-alarms lo procesa.
            //    No enviamos push aquí — el servidor lo maneja.

            ui.clearMainInput();
            ui.showNotification('¡Anotado con éxito! ✨', 'success');
            await this.loadItems();

        } catch (error) {
            console.error('Error al crear:', error);
            ui.showNotification('KAI no pudo guardar eso. ¿Intentamos de nuevo?', 'error');
        }
    }

    // ========== ESPECIAL: Atajo "hice:" para logros ==========
    async handleLogroInput(fullContent) {
        // Extraer el texto después de "hice:"
        const logroText = fullContent.substring(5).trim(); // "hice: " = 5 chars
        if (!logroText) {
            ui.showNotification('Escribí qué lograste hoy!', 'warning');
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const fecha = new Date(today + 'T12:00:00');
        const titlePattern = `Hice esto el ${diasSemana[fecha.getDay()]} ${fecha.getDate()} de ${meses[fecha.getMonth()]}`;

        console.log(`[LOGRO] Buscando card: "${titlePattern}"`);

        try {
            // Buscar si ya existe la card del día
            const allItems = await data.getItems({});
            let cardDelDia = allItems.find(item => 
                item.content === titlePattern && 
                item.tags && item.tags.includes('diario')
            );

            if (cardDelDia) {
                // Ya existe, agregar como subtarea
                console.log(`[LOGRO] Card encontrada: ${cardDelDia.id}`);
                
                const nuevasTareas = cardDelDia.tareas || [];
                nuevasTareas.push({ titulo: logroText, completado: false });
                
                await data.updateItem(cardDelDia.id, { tareas: nuevasTareas });
                ui.showNotification('¡Agregado a tu registro del día! 🎯', 'success');
            } else {
                // Crear nueva card
                console.log(`[LOGRO] Creando nueva card para hoy`);
                
                await data.createItem({
                    content: titlePattern,
                    type: 'tarea',
                    tareas: [{ titulo: logroText, completado: false }],
                    tags: ['diario', 'logro'],
                    meta: {
                        es_resumen_diario: true,
                        fecha_original: today
                    }
                });
                ui.showNotification('¡Primer logro del día registrado! 🌟', 'success');
            }

            ui.clearMainInput();
            await this.loadItems();

        } catch (error) {
            console.error('[LOGRO] Error:', error);
            ui.showNotification('No pude guardar el logro. ¿Reintentamos?', 'error');
        }
    }
    // =========================================================

    extractUrl(text) {
        const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
        return urlMatch ? urlMatch[1] : '';
    }

    async crearAlarma(alarmaData) {
        try {
            const contenidoAlarma = alarmaData.contenido || 'Recordatorio';
            const deadline = alarmaData.deadline;
            const repeat = alarmaData.repeat || null;

            let newItemId = null;
            if (this.currentUser) {
                const deadlineForDB = formatDeadlineForDB(deadline);
                const result = await data.createItem({
                    content: contenidoAlarma,
                    type: 'nota',
                    parent_id: this.currentParentId,
                    tags: ['alarma'],
                    deadline: deadlineForDB,
                    repeat: repeat
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

            const repeatText = repeat ? ` (${repeat === 'daily' ? 'diario' : repeat === 'weekly' ? 'semanal' : 'mensual'})` : '';
            const mensajesAlarma = [
                `¡Alarma configurada para ${hora}${repeatText}! ⏰`,
                `¡Te recuerdo a las ${hora}${repeatText}! ⏰✨`,
                `¡Listo! Te aviso a las ${hora}${repeatText} ⏰`
            ];
            const mensajeAleatorio = mensajesAlarma[Math.floor(Math.random() * mensajesAlarma.length)];
            ui.showNotification(mensajeAleatorio, 'success');

            // El trigger en la DB crea automáticamente alarm_notifications.
            // El cron del servidor (check-alarms) enviará la push en el momento correcto.
            // No enviamos push aquí para evitar notificaciones duplicadas.

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
        console.log(`[loadItems] silent=${silent}, view=${this.currentView}, category=${this.currentCategory}, tag=${this.currentTag}`);
        
        // Si estamos en el dashboard y no es un refresco silencioso, no hacemos nada
        if (this.currentView === 'dashboard' && !silent) {
            console.log('[loadItems] Skip: estamos en dashboard');
            return;
        }

        if (!silent) ui.renderLoading();
        try {
            console.log('[loadItems] Obteniendo datos de Supabase...');
            const filters = { parent_id: this.currentParentId };
            
            // Si la categoría es 'hoy', ignoramos el filtro de tipo y buscamos todo para filtrar por fecha localmente
            if (this.currentCategory === 'hoy') {
                const items = await data.getItems({ parent_id: this.currentParentId });
                const today = new Date().toISOString().split('T')[0];
                
                const filteredItems = items.filter(item => {
                    // Para cards de resumen diario, usar meta.fecha_original (el día real de las tareas)
                    // Para otros items, usar deadline o created_at
                    let d;
                    if (item.meta?.es_resumen_diario) {
                        d = item.meta.fecha_original;
                    } else {
                        d = item.deadline ? item.deadline.split('T')[0] : item.created_at.split('T')[0];
                    }
                    // Mostrar todos los items del día de HOY (sin importar status)
                    // Y también las cards de resumen diario (es_resumen_diario) de cualquier fecha
                    const esResumenDiario = item.meta?.es_resumen_diario === true;
                    return d === today || esResumenDiario;
                });

                this.items = filteredItems;
                if (this.currentView === 'timeline') {
                    this.loadInicioTasks();
                } else {
                    ui.render(filteredItems);
                }
            } else {
                if (this.currentCategory !== 'all') filters.type = this.currentCategory;
                const items = await data.getItems(filters);

                // Filtrar por tag si aplica
                let filteredItems = items;
                if (this.currentTag) {
                    filteredItems = items.filter(item => item.tags && item.tags.includes(this.currentTag));
                }

                // Filtrar por exclusión de tag (ej: pendientes = sin tag 'logro')
                if (this.currentExcludeTag) {
                    filteredItems = filteredItems.filter(item => !item.tags || !item.tags.includes(this.currentExcludeTag));
                }

                // Excluir items marcados como ocultos de la vista general
                if (this.currentView !== 'gatos') {
                    filteredItems = filteredItems.filter(item => !item.tags || !item.tags.includes('gato_oculto'));
                }

                console.log(`[loadItems] Obtenidos ${items.length} items, filtrados ${filteredItems.length}`);
                this.items = filteredItems;
                if (this.currentView === 'timeline') {
                    this.loadInicioTasks();
                } else {
                    ui.render(filteredItems);
                }
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
        this.currentCategory = 'tarea';
        this.currentTag = null;
        this.currentExcludeTag = null;
        
        // Resetear estilos de botones de categoría
        document.querySelectorAll('.btn-category').forEach(b => {
            b.classList.remove('active', 'border-brand', 'bg-white', 'shadow-sticker');
        });
        document.querySelectorAll('.btn-tag').forEach(b => {
            b.classList.remove('active', 'bg-link', 'text-purple-600', 'border-purple-200');
        });
        
        // Delegar al sistema de navegación unificado
        if (window.switchView) {
            window.switchView('timeline');
        } else {
            this.applyViewState();
            this.saveState();
            await this.loadItems();
        }
    }

    // ========== INICIO — SISTEMA DE TAREAS ==========

    /**
     * Quick-add desde la barra de Inicio
     * @param {string} text - Texto de la tarea
     */
    async quickAddInicio(text) {
        if (!text || !text.trim()) return;

        const sanitized = utils.sanitizeInput(text.trim());

        // Parse inline tags (#tag)
        const tags = [];
        const cleaned = sanitized.replace(/#(\w+)/g, (match, tag) => {
            if (!tags.includes(tag)) tags.push(tag);
            return '';
        }).trim();

        // Get selected points from the points selector
        let puntos = 10;
        const activePointsBtn = document.querySelector('.points-btn.active');
        if (activePointsBtn) {
            puntos = parseInt(activePointsBtn.dataset.points, 10) || 10;
        }

        try {
            await data.createItem({
                content: cleaned || sanitized,
                type: 'tarea',
                tags: tags,
                meta: { puntos }
            });

            const input = document.getElementById('inicio-quick-input');
            if (input) {
                input.value = '';
                input.focus();
            }

            ui.showNotification('✓ Tarea creada!', 'success');
            await this.loadItems();
        } catch (err) {
            console.error('Error creating task from quick-add:', err);
            ui.showNotification('Error al crear tarea', 'error');
        }
    }

    /**
     * Toggle completado de una tarea desde Inicio
     * @param {string} itemId
     * @param {HTMLElement} element - task-row DOM element
     */
    async toggleCompletado(itemId, element) {
        const item = this.items.find(i => i.id === itemId);
        if (!item || this.isAnimating) return;

        this.isAnimating = true;
        const isCompleted = item.status === 'completed';

        try {
            if (!isCompleted) {
                if (element) {
                    await ui.animateTaskComplete(element);
                }

                // Agregar tag "logro" automáticamente al completar
                const currentTags = item.tags || [];
                const newTags = currentTags.includes('logro') ? currentTags : [...currentTags, 'logro'];
                
                await data.updateItem(itemId, { 
                    status: 'completed',
                    tags: newTags
                });
                item.status = 'completed';
                item.tags = newTags;

                this.loadInicioTasks();
                this.updateFilterCounts();
                this.updatePointsAccumulator();
            } else {
                await data.updateItem(itemId, { status: 'inbox' });
                item.status = 'inbox';

                this.loadInicioTasks();
            }
        } catch (error) {
            console.error('Error toggling completado:', error);
            ui.showNotification('Error al completar tarea', 'error');
        } finally {
            this.isAnimating = false;
        }
    }

    /**
     * Carga y renderiza tareas para la vista Inicio
     */
    loadInicioTasks() {
        const items = this.items || [];

        // Filter: tareas y proyectos (no notas ni enlaces)
        let filtered = items.filter(item =>
            (item.type === 'tarea' || item.type === 'proyecto')
        );

        // Apply inicio filter (pendientes/logradas/todas)
        if (this.inicioFilter === 'pending') {
            filtered = filtered.filter(item => item.status !== 'completed');
        } else if (this.inicioFilter === 'completed') {
            filtered = filtered.filter(item => item.status === 'completed');
        } else {
            // Default: mostrar solo pendientes
            filtered = filtered.filter(item => item.status !== 'completed');
        }

        // Apply tag filter
        if (this.currentTag) {
            filtered = filtered.filter(item =>
                item.tags && item.tags.includes(this.currentTag)
            );
        }

        // Extract unique tags from all tareas/proyectos
        const allTags = [...new Set(
            items.filter(i => (i.type === 'tarea' || i.type === 'proyecto') && i.tags && i.tags.length > 0)
                .flatMap(i => i.tags)
        )];

        // Render tag chips
        const tagBar = document.getElementById('inicio-tag-filters');
        if (tagBar) {
            tagBar.innerHTML = ui.renderTagChips(allTags, this.currentTag);
        }

        // Render task list
        ui.renderInicioTasks(filtered);

        // Update points
        this.updatePointsAccumulator();

        // Update filter card counts
        this.updateFilterCounts();
    }

    /**
     * Actualiza los contadores de pendientes y logradas en los botones de filtro
     * Solo cuenta tareas y proyectos (no notas ni enlaces)
     */
    updateFilterCounts() {
        const items = this.items || [];
        
        // Contar pendientes (tareas y proyectos no completados)
        const pendientes = items.filter(i => 
            (i.type === 'tarea' || i.type === 'proyecto') && i.status !== 'completed'
        ).length;
        
        // Contar logradas (tareas y proyectos completados)
        const logradas = items.filter(i => 
            (i.type === 'tarea' || i.type === 'proyecto') && i.status === 'completed'
        ).length;

        const pendEl = document.getElementById('count-pendientes');
        const logrEl = document.getElementById('count-logradas');

        if (pendEl) pendEl.textContent = pendientes;
        if (logrEl) logrEl.textContent = logradas;
    }

    /**
     * Filtra tareas por tag
     * @param {string|null} tag - Tag a filtrar (null = todas)
     */
    filterByTag(tag) {
        if (this.currentTag === tag || !tag) {
            this.currentTag = null; // toggle off
        } else {
            this.currentTag = tag;
        }
        this.loadInicioTasks();
    }

    /**
     * Actualiza el acumulador de puntos en el header de Inicio
     */
    updatePointsAccumulator() {
        const items = this.items || [];
        const total = items
            .filter(i => i.type === 'tarea' && i.status === 'completed')
            .reduce((sum, i) => sum + (i.meta?.puntos || 10), 0);

        const pointsEl = document.getElementById('points-total');
        if (pointsEl) pointsEl.textContent = total;

        const totalPointsEl = document.getElementById('total-points');
        if (totalPointsEl) totalPointsEl.textContent = total + '⭐';
    }

    // ========== NOTIFICACIONES ==========

    async initNotifications() {
        // Botón campanita
        document.getElementById('btn-notifications')?.addEventListener('click', () => {
            ui.toggleNotificationDrawer(true);
            this.loadNotifications();
        });

        // Cerrar drawer
        document.getElementById('btn-close-notifications')?.addEventListener('click', () => {
            ui.toggleNotificationDrawer(false);
        });

        // Overlay cerrar
        document.getElementById('notification-overlay')?.addEventListener('click', () => {
            ui.toggleNotificationDrawer(false);
        });

        // Marcar todo como leído
        document.getElementById('btn-mark-all-read')?.addEventListener('click', async () => {
            await data.markAllRead();
            this.loadNotifications();
        });

        // Click en notificaciones (marcar como leído + navegar)
        document.getElementById('notifications-list')?.addEventListener('click', async (e) => {
            const item = e.target.closest('.notification-item');
            if (!item) return;

            const notifId = item.dataset.id;
            const relatedId = item.dataset.related;

            // Marcar como leído
            await data.markNotificationRead(notifId);
            
            // Si tiene related_item_id, navegar a esa card
            if (relatedId) {
                ui.toggleNotificationDrawer(false);
                // Buscar y expandir la card relacionada
                await this.navigateToItem(relatedId);
            } else {
                // Solo marcar, recargar lista
                this.loadNotifications();
            }
        });

        // Cargar badge al inicio
        await this.updateNotificationBadge();
    }

    async loadNotifications() {
        const notifications = await data.getNotifications();
        ui.renderNotificationDrawer(notifications);
    }

    async updateNotificationBadge() {
        const count = await data.getUnreadCount();
        ui.updateBellBadge(count);
    }

    async navigateToItem(itemId) {
        // Buscar el item y navegar a su vista
        const items = await data.getItems({ id: itemId });
        if (items && items.length > 0) {
            const item = items[0];
            // Si tiene padre, navegar al padre primero
            if (item.parent_id) {
                this.navigateTo(item.parent_id);
            }
            // Luego cargar y expandir
            await this.loadItems();
            // La card se expansará automáticamente si está visible
        }
    }

    async handleCategoryClick(button) {
        document.querySelectorAll('.btn-category').forEach(b => b.classList.remove('active', 'border-brand', 'bg-white', 'shadow-sticker'));
        document.querySelectorAll('.btn-tag').forEach(b => b.classList.remove('active', 'bg-link', 'text-purple-600', 'border-purple-200'));

        // Aplicar estilos activos según el tipo de botón
        if (button.classList.contains('btn-tag')) {
            button.classList.add('active', 'bg-link', 'text-purple-600', 'border-purple-200');
        } else {
            button.classList.add('active', 'border-brand', 'bg-white', 'shadow-sticker');
        }

        // Manejar tanto categorías como tags
        this.currentCategory = button.dataset.category || null;
        this.currentTag = button.dataset.tag || null;
        this.currentView = 'timeline';

        await this.loadItems();
    }

    async showDashboard(periodo = 'total') {
        try {
            // Mostrar loading inmediato para feedback visual
            const container = ui.elements.container();
            if (container) {
                container.innerHTML = `
                    <div class="text-center py-16">
                        <div class="text-6xl animate-bounce mb-4">📊</div>
                        <p class="text-gray-400 text-lg">Cargando tu dashboard...</p>
                    </div>
                `;
            }
            
            // Cargar todos los items para procesarlos
            const allItems = await data.getItems({});
            
            // Aplicar filtro de periodo si no es 'total' - Períodos calendario reales
            let filteredItems = allItems;
            if (periodo !== 'total') {
                const now = new Date();
                const currentYear = now.getFullYear();
                const currentMonth = now.getMonth();
                const dayOfWeek = now.getDay();
                
                // Inicio de semana actual (lunes)
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
                weekStart.setHours(0, 0, 0, 0);
                
                // Inicio de mes actual
                const monthStart = new Date(currentYear, currentMonth, 1);
                
                // Inicio de año actual
                const yearStart = new Date(currentYear, 0, 1);
                
                let startDate = null;
                if (periodo === 'semana') startDate = weekStart;
                if (periodo === 'mes') startDate = monthStart;
                if (periodo === 'anio') startDate = yearStart;
                
                if (startDate) {
                    filteredItems = allItems.filter(i => {
                        const itemDate = new Date(i.created_at);
                        return itemDate >= startDate && itemDate <= now;
                    });
                }
            }

            // Agrupamiento inteligente
            const grouped = {
                salud: filteredItems.filter(i => i.tags && (i.tags.includes('salud') || i.tags.includes('emocion'))),
                productividad: filteredItems.filter(i => 
                    (i.tags && i.tags.includes('logro')) || 
                    i.type === 'proyecto' || 
                    (i.type === 'tarea' && i.status !== 'completed')
                ),
                // Incluir tanto status 'completed' como tag 'logro' (para tarjetas de "¿Qué hice hoy?")
                hecho: filteredItems.filter(i => i.status === 'completed' || (i.tags && i.tags.includes('logro')))
            };

            // Cálculo de estadísticas
            const stats = this.calculateStats(filteredItems, allItems);

            // Get check-ins for emotions
            const checkins = await salud.getCheckinHistory(periodo === 'mes' ? 30 : 7);
            
            // Procesar emociones
            const emocionesCount = {};
            checkins.forEach(c => {
                const emo = c.meta?.emocion;
                if (emo) {
                    emocionesCount[emo] = (emocionesCount[emo] || 0) + 1;
                }
            });
            const emociones = Object.entries(emocionesCount).map(([emocion, count]) => ({ emocion, count }));

            // Cambiar vista en UI
            ui.renderDashboard(grouped, stats, periodo, emociones);

            // Actualizar estado interno
            this.currentView = 'dashboard';
        } catch (error) {
            console.error('Error al cargar dashboard:', error);
            ui.showNotification('No pude cargar tu estadísticas. 🧸🔌', 'error');
        }
    }

    calculateStats(items, allItems) {
        // tareas con checklist
        let totalTareas = 0;
        let tareasCompletas = 0;
        const tareasLista = [];
        
        items.forEach(item => {
            if (item.tareas && item.tareas.length > 0) {
                item.tareas.forEach(t => {
                    totalTareas++;
                    if (t.completado) {
                        tareasCompletas++;
                        tareasLista.push({ contenido: t.titulo, itemId: item.id, itemContent: item.content });
                    }
                });
            }
            // También contar items completos como "tareas completadas"
            if (item.status === 'completed') {
                tareasCompletas++;
            }
        });

        // Items pendientes (no completados)
        const pendientes = items.filter(i => i.status !== 'completed' && i.type === 'tarea');

        // Logros del periodo
        const logros = items.filter(i => i.status === 'completed' || (i.tags && i.tags.includes('logro')));

        // Racha
        const racha = this.calculateStreak(allItems);

        // Tags más usados
        const tagCount = {};
        items.forEach(item => {
            if (item.tags && Array.isArray(item.tags)) {
                item.tags.forEach(tag => {
                    tagCount[tag] = (tagCount[tag] || 0) + 1;
                });
            }
        });
        const topTags = Object.entries(tagCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(t => t[0]);

        return {
            tareasCompletas,
            totalTareas,
            tareasLista,
            pendientes,
            logros,
            racha,
            topTags,
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

    async showAlarmsModal() {
        try {
            const items = await data.getItems({});
            const alarms = items.filter(item => item.deadline && new Date(item.deadline).getTime() > Date.now());
            
            ui.showAlarmsModal(alarms);
        } catch (error) {
            console.error('Error loading alarms:', error);
            ui.showNotification('Error al cargar alarmas', 'error');
        }
    }

    async cancelAlarm(id) {
        try {
            await data.updateItem(id, { deadline: null, repeat: null });
            ui.showNotification('Alarma cancelada', 'success');
            await this.loadItems();
            ui.toggleAlarmsModal(false);
        } catch (error) {
            console.error('Error canceling alarm:', error);
            ui.showNotification('Error al cancelar alarma', 'error');
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

    // ========== GESTIÓN DE ETIQUETAS ==========

    /**
     * Obtiene todas las etiquetas únicas de tareas y proyectos
     */
    getAllTags() {
        const items = this.items || [];
        const tagSet = new Set();
        
        items.forEach(item => {
            if ((item.type === 'tarea' || item.type === 'proyecto') && item.tags && Array.isArray(item.tags)) {
                item.tags.forEach(tag => tagSet.add(tag));
            }
        });
        
        return Array.from(tagSet).sort();
    }

    /**
     * Renombra una etiqueta en TODAS las tareas/proyectos que la contain
     * @param {string} oldTag - Etiqueta actual
     * @param {string} newTag - Nueva etiqueta
     */
    async renameTag(oldTag, newTag) {
        if (!oldTag || !newTag || oldTag === newTag) {
            ui.showNotification('Los nombres de etiqueta deben ser diferentes', 'warning');
            return;
        }

        const items = this.items || [];
        const itemsToUpdate = items.filter(item => 
            (item.type === 'tarea' || item.type === 'proyecto') && 
            item.tags && 
            item.tags.includes(oldTag)
        );

        if (itemsToUpdate.length === 0) {
            ui.showNotification('No hay tareas con esa etiqueta', 'warning');
            return;
        }

        try {
            let updated = 0;
            for (const item of itemsToUpdate) {
                const newTags = item.tags.map(t => t === oldTag ? newTag : t);
                await data.updateItem(item.id, { tags: newTags });
                item.tags = newTags;
                updated++;
            }

            ui.showNotification(`✓ "${oldTag}" renombrada a "${newTag}" en ${updated} tareas`, 'success');
            
            this.loadInicioTasks();
            this.updateFilterCounts();
            this.loadItems();
        } catch (error) {
            console.error('Error renameTag:', error);
            ui.showNotification('Error al renombrar etiqueta', 'error');
        }
    }

    /**
     * Elimina una etiqueta de TODAS las tareas/proyectos
     * @param {string} tag - Etiqueta a eliminar
     */
    async deleteTag(tag) {
        if (!tag) return;

        const items = this.items || [];
        const itemsToUpdate = items.filter(item => 
            (item.type === 'tarea' || item.type === 'proyecto') && 
            item.tags && 
            item.tags.includes(tag)
        );

        if (itemsToUpdate.length === 0) {
            ui.showNotification('No hay tareas con esa etiqueta', 'warning');
            return;
        }

        if (!confirm(`¿Eliminar la etiqueta "${tag}" de ${itemsToUpdate.length} tareas?`)) {
            return;
        }

        try {
            for (const item of itemsToUpdate) {
                const newTags = item.tags.filter(t => t !== tag);
                await data.updateItem(item.id, { tags: newTags });
                item.tags = newTags;
            }

            ui.showNotification(`✓ Etiqueta "${tag}" eliminada de ${itemsToUpdate.length} tareas`, 'success');
            
            this.loadInicioTasks();
            this.updateFilterCounts();
            this.loadItems();
        } catch (error) {
            console.error('Error deleteTag:', error);
            ui.showNotification('Error al eliminar etiqueta', 'error');
        }
    }

    /**
     * Renderiza la sección de gestión de etiquetas
     */
    renderTagManager() {
        const tags = this.getAllTags();
        
        if (tags.length === 0) {
            return `
                <div class="bg-gray-50 border-2 border-gray-100 p-6 rounded-3xl">
                    <h3 class="text-lg font-bold text-ink mb-3">🏷️ Gestión de Etiquetas</h3>
                    <p class="text-gray-400 text-base">No hay etiquetas aún. Crea tareas con #etiqueta para comenzar.</p>
                </div>
            `;
        }

        const tagsHtml = tags.map(tag => `
            <div class="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0">
                <span class="bg-brand/10 text-brand border border-brand/30 px-3 py-1 rounded-full text-sm font-semibold">#${tag}</span>
                <button class="text-gray-400 hover:text-brand transition edit-tag-btn" data-tag="${tag}" title="Renombrar">
                    <i class="fas fa-pencil-alt"></i>
                </button>
                <button class="text-gray-400 hover:text-red-500 transition delete-tag-btn" data-tag="${tag}" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');

        return `
            <div class="bg-white border-2 border-brand/20 p-6 rounded-3xl">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold text-ink">🏷️ Gestión de Etiquetas</h3>
                    <span class="text-sm text-gray-400">${tags.length} etiqueta${tags.length !== 1 ? 's' : ''}</span>
                </div>
                <div class="space-y-1 max-h-64 overflow-y-auto">
                    ${tagsHtml}
                </div>
                <p class="text-xs text-gray-400 mt-3">✏️ Click en ✏️ para renombrar, 🗑️ para eliminar de todas las tareas</p>
            </div>
        `;
    }

    /**
     * Configura eventos para la gestión de etiquetas
     */
    setupTagManagerEvents() {
        document.addEventListener('click', async (e) => {
            const editBtn = e.target.closest('.edit-tag-btn');
            const deleteBtn = e.target.closest('.delete-tag-btn');

            if (editBtn) {
                const oldTag = editBtn.dataset.tag;
                const newTag = prompt(`Renombrar "${oldTag}" a:`, oldTag);
                if (newTag && newTag !== oldTag) {
                    await this.renameTag(oldTag, newTag.trim().toLowerCase());
                }
            }

            if (deleteBtn) {
                const tag = deleteBtn.dataset.tag;
                await this.deleteTag(tag);
            }
        });
    }

    /**
     * Agrega una etiqueta a una tarea
     */
    addTagToItem(itemId, tag) {
        const item = this.items.find(i => i.id === itemId);
        if (item && tag && tag.trim()) {
            const t = tag.trim().toLowerCase();
            const currTags = item.tags || [];
            if (!currTags.includes(t)) {
                data.updateItem(itemId, { tags: [...currTags, t] }).then(() => {
                    item.tags = [...currTags, t];
                    this.loadInicioTasks();
                    this.updateFilterCounts();
                    ui.showNotification('Etiqueta agregada', 'success');
                }).catch(err => {
                    console.error('Error adding tag:', err);
                    ui.showNotification('Error al agregar etiqueta', 'error');
                });
            }
        }
    }
}

// Inicialización global
window.addEventListener('DOMContentLoaded', () => {
    window.kai = new KaiController();
    window.controller = window.kai;
});

export default KaiController;
