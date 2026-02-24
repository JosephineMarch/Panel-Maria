import { supabase } from './supabase.js';
import { data } from './data.js';
import { ui } from './ui.js';
import { auth } from './auth.js';
import { ai } from './ai.js';
import { cerebras } from './cerebras.js';
import { generarDemoData, regenerarDemoItems } from './demo-data.js';

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
        this.init();
    }

    async init() {
        console.log('🧠 KAI: Controlador iniciado.');

        // Detectar si estamos en desarrollo (localhost)
        this.isDevMode = this.esDesarrollo();

        ui.init();
        this.bindEvents();
        this.startAlarmChecker();

        // En desarrollo, mostrar botón para generar demo
        // En producción, nunca mostrar demo
        if (this.isDevMode) {
            this.mostrarControlesDemo(true);
        } else {
            this.mostrarControlesDemo(false);
        }

        try {
            this.currentUser = await auth.init();
            console.log('Usuario:', this.currentUser);
            if (this.currentUser) {
                ui.updateUserInfo(this.currentUser);
                await this.loadItems();
            } else {
                // No cargar demo automáticamente - esperar a que usuario lo genere
                console.log('Sin sesión - esperando generación de demo...');
                this.loadEmptyState();
            }
        } catch (error) {
            console.error('Error en inicialización:', error);
            this.loadEmptyState();
        }

        ai.init();
    }

    loadEmptyState() {
        // Mostrar estado vacío con opción de generar demo
        ui.render([], false);
        const container = ui.elements.container();
        if (container) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <div class="text-6xl mb-4">🧠</div>
                    <h2 class="text-2xl font-bold text-ink mb-2">Bienvenido a KAI</h2>
                    <p class="text-ink/60 mb-6">Tu segundo cerebro está listo para usar</p>
                    <button id="btn-generate-demo" class="bg-brand text-white font-bold py-3 px-8 rounded-blob shadow-sticker hover:bg-brand-dark transition-all">
                        ✨ Probar con datos de ejemplo
                    </button>
                </div>
            `;
            document.getElementById('btn-generate-demo')?.addEventListener('click', () => {
                regenerarDemoItems();
                this.isDemoMode = true;
                this.loadItems();
            });
        }
    }

    esDesarrollo() {
        const hostname = window.location.hostname;
        return hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname === '0.0.0.0' ||
            hostname.includes('localhost') ||
            window.location.href.includes('localhost') ||
            window.location.href.includes('127.0.0.1');
    }

    mostrarControlesDemo(mostrar) {
        const controls = document.getElementById('demo-controls');
        if (controls) {
            controls.style.display = mostrar ? 'block' : 'none';
        }
    }

    loadDemoItems() {
        console.log('loadDemoItems llamado');

        let demoItems = JSON.parse(localStorage.getItem('kaiDemoItems'));

        if (!demoItems) {
            // Usar generador automático de demo data
            demoItems = generarDemoData();
            localStorage.setItem('kaiDemoItems', JSON.stringify(demoItems));
        }

        this.isDemoMode = true;

        ui.render(demoItems, true);
    }

    isDemoMode = false;

    async demoUpdateItem(id, updates) {
        let items = JSON.parse(localStorage.getItem('kaiDemoItems')) || [];
        const index = items.findIndex(i => i.id === id);
        if (index !== -1) {
            items[index] = { ...items[index], ...updates };
            localStorage.setItem('kaiDemoItems', JSON.stringify(items));
        }
    }

    async demoDeleteItem(id) {
        let items = JSON.parse(localStorage.getItem('kaiDemoItems')) || [];
        items = items.filter(i => i.id !== id);
        localStorage.setItem('kaiDemoItems', JSON.stringify(items));
    }

    startAlarmChecker() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Verificar inmediatamente al abrir
        setTimeout(() => this.checkAlarms(), 2000);

        // Luego verificar cada 30 segundos
        setInterval(() => {
            this.checkAlarms();
        }, 30000);
    }

    async checkAlarms() {
        console.log('🔔 Verificando alarmas... isDemoMode:', this.isDemoMode);

        try {
            let items;

            if (this.isDemoMode) {
                items = JSON.parse(localStorage.getItem('kaiDemoItems')) || [];
            } else if (this.currentUser) {
                items = await data.getItems({});
            } else {
                return;
            }

            const now = new Date();
            const localTime = new Date(now);

            const triggeredIds = JSON.parse(localStorage.getItem('triggeredAlarms') || '[]');

            for (const item of items) {
                if (item.deadline && !triggeredIds.includes(item.id)) {
                    const deadline = new Date(parseInt(item.deadline));
                    const timeDiff = deadline.getTime() - localTime.getTime();

                    if (timeDiff > -60000 && timeDiff <= 60000) {
                        triggeredIds.push(item.id);
                        localStorage.setItem('triggeredAlarms', JSON.stringify(triggeredIds));

                        this.triggerAlarm(item);
                    }
                }
            }
        } catch (error) {
            console.error('Error checking alarms:', error);
        }
    }

    async triggerAlarm(item) {
        if (Notification.permission === 'granted') {
            new Notification('⏰ ¡KAI Te Recuerdas!', {
                body: item.content,
                icon: 'src/assets/icon-192.png',
                tag: item.id
            });
        }

        ui.showNotification(`⏰ ¡Hora de: ${item.content}!`, 'warning');

        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleR4GOKjm');
        audio.volume = 0.5;
        audio.play().catch((err) => {
            console.warn('🔇 No se pudo reproducir audio de alarma:', err.message);
        });
    }

    bindEvents() {
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

        // --- Share Target Event ---
        window.addEventListener('kai:add-item', async (e) => {
            const { type, content, url } = e.detail;
            try {
                await data.createItem({
                    type: type,
                    content: content,
                    url: url || ''
                });
                ui.showNotification(`¡Guardado como ${type}! ✨`, 'success');
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

        // La gestión de breadcrumbs ahora está centralizada en ui.renderBreadcrumb
        // por lo que eliminamos el listener manual de aquí para evitar recargas.

        // --- Modals & Sidebar ---
        document.getElementById('btn-user')?.addEventListener('click', () => ui.toggleSidebar());
        document.getElementById('btn-close-sidebar')?.addEventListener('click', () => ui.toggleSidebar());
        document.getElementById('btn-google')?.addEventListener('click', () => this.handleGoogleLogin());
        document.getElementById('btn-logout')?.addEventListener('click', () => this.handleLogout());
        document.getElementById('btn-add-task')?.addEventListener('click', () => ui.addTaskToModal());
        document.getElementById('btn-regenerate-demo')?.addEventListener('click', () => {
            regenerarDemoItems();
            location.reload();
        });

        // Tag suggestions - agregar tags al input
        document.querySelectorAll('.tag-suggestion').forEach(tag => {
            tag.addEventListener('click', () => {
                const input = document.getElementById('edit-tags');
                const current = input.value || '';
                const newTag = tag.dataset.tag;
                if (current) {
                    input.value = current + ', ' + newTag;
                } else {
                    input.value = newTag;
                }
            });
        });

        // El botón de voz central en el footer
        document.getElementById('btn-voice-footer')?.addEventListener('click', () => this.toggleVoiceInput());

        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => ui.toggleModal(false));
        });

        // --- Kai Chat Events ---
        ui.elements.kaiAvatarContainer()?.addEventListener('click', () => ui.toggleKaiChat());
        ui.elements.kaiChatClose()?.addEventListener('click', () => ui.toggleKaiChat(false));
        ui.elements.kaiChatSend()?.addEventListener('click', () => this.handleKaiChat());
        ui.elements.kaiChatInput()?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleKaiChat();
        });

        // --- Demo Regenerate Button ---
        document.addEventListener('click', (e) => {
            const regenerateBtn = e.target.closest('#btn-regenerate-in-timeline');
            if (regenerateBtn) {
                regenerarDemoItems();
                this.isDemoMode = true;
                this.loadItems();
            }
        });

        // --- Delegación de Items (Stickers) ---
        ui.elements.container()?.addEventListener('click', async (e) => {
            const finishBtn = e.target.closest('.action-finish');
            const openBtn = e.target.closest('.action-open');
            const pinBtn = e.target.closest('.btn-pin');
            const taskCheckbox = e.target.closest('.timeline-task-checkbox');

            if (taskCheckbox) {
                e.stopPropagation();
                await this.toggleTimelineTask(taskCheckbox.dataset.id, parseInt(taskCheckbox.dataset.index), taskCheckbox.checked);
            } else if (finishBtn) {
                e.stopPropagation();
                await this.finishItem(finishBtn.dataset.id);
            } else if (openBtn) {
                e.stopPropagation();
                this.openProject(openBtn.dataset.id);
            } else if (pinBtn) {
                e.stopPropagation();
                await this.togglePin(pinBtn.dataset.id);
            }
        });

        // --- Eventos Globales ---
        window.addEventListener('voice-result', (e) => {
            const input = ui.elements.inputMain();
            if (input) input.value = e.detail.transcript;
            this.stopVoiceInput();
        });
    }

    // --- LÓGICA DE NEGOCIO ---

    async handleSubmit() {
        const { content, type } = ui.getMainInputData();
        if (!content) return;

        // 1. Detectar alarmas (comando en cualquier parte)
        const alarmaData = ai.detectarAlarmas(content);
        console.log('🔔 Detección alarma:', content, '->', alarmaData);

        if (alarmaData.esAlarma) {
            await this.crearAlarma(alarmaData);
            return;
        }

        // 2. Detectar tags (salud, emocion)
        const detectedTags = ai.detectarTags(content);
        console.log('🏷️ Detección tags:', content, '->', detectedTags);

        if (!this.currentUser && !this.isDemoMode) {
            ui.showNotification('¡Ups! Necesitas entrar para que Kai recuerde esto.', 'warning');
            ui.toggleSidebar();
            return;
        }

        try {
            const parsed = ai.parseIntent(content);
            const finalType = type !== 'note' ? type : parsed.type;

            // Combinar tags detectados automáticamente con los parsed
            const finalTags = [...(parsed.tags || []), ...detectedTags];

            if (this.isDemoMode) {
                const newItem = {
                    id: 'demo-' + Date.now(),
                    content,
                    type: finalType,
                    parent_id: this.currentParentId,
                    tags: finalTags,
                    descripcion: '',
                    url: '',
                    tareas: [],
                    deadline: parsed.deadline || null,
                    anclado: false,
                    created_at: new Date().toISOString()
                };
                let items = JSON.parse(localStorage.getItem('kaiDemoItems')) || [];
                items.unshift(newItem);
                localStorage.setItem('kaiDemoItems', JSON.stringify(items));
            } else {
                const deadlineValue = parsed.deadline ? formatDeadlineForDB(parsed.deadline) : null;
                await data.createItem({
                    content,
                    type: finalType,
                    parent_id: this.currentParentId,
                    tags: finalTags,
                    deadline: deadlineValue
                });
            }

            ui.clearMainInput();
            ui.showNotification('¡Anotado con éxito!', 'success');
            await this.loadItems();
        } catch (error) {
            console.error('Error al crear:', error);
            ui.showNotification('KAI no pudo guardar eso. ¿Intentamos de nuevo?', 'error');
        }
    }

    async crearAlarma(alarmaData) {
        console.log('crearAlarma - alarmaData:', alarmaData);
        try {
            const contenidoAlarma = alarmaData.contenido || 'Recordatorio';
            const deadline = alarmaData.deadline;
            console.log('crearAlarma - deadline antes de format:', deadline, 'tipo:', typeof deadline);

            if (this.isDemoMode) {
                const newItem = {
                    id: 'demo-' + Date.now(),
                    content: contenidoAlarma,
                    type: 'nota', // Mantener como nota, deadline hace la magia
                    parent_id: this.currentParentId,
                    tags: ['alarma'],
                    descripcion: '',
                    url: '',
                    tareas: [],
                    deadline: deadline,
                    anclado: false,
                    created_at: new Date().toISOString()
                };
                let items = JSON.parse(localStorage.getItem('kaiDemoItems')) || [];
                items.unshift(newItem);
                localStorage.setItem('kaiDemoItems', JSON.stringify(items));
            } else if (this.currentUser) {
                const deadlineForDB = formatDeadlineForDB(deadline);
                console.log('crearAlarma - deadline para Supabase:', deadlineForDB);
                await data.createItem({
                    content: contenidoAlarma,
                    type: 'nota',
                    parent_id: this.currentParentId,
                    tags: ['alarma'],
                    deadline: deadlineForDB
                });
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

            await this.loadItems();
        } catch (error) {
            console.error('Error al crear alarma:', error);
            ui.showNotification('No pude crear la alarma. ¿Reintentamos?', 'error');
        }
    }

    async handleEdit() {
        const updates = ui.getEditFormData();
        try {
            if (this.isDemoMode) {
                await this.demoUpdateItem(updates.id, updates);
            } else {
                await data.updateItem(updates.id, updates);
            }
            ui.toggleModal(false);
            ui.showNotification('¡Cambios guardados con amor!', 'success');
            await this.loadItems();
        } catch (error) {
            console.error('Error al editar:', error);
            ui.showNotification('Hubo un problema al guardar los cambios.', 'error');
        }
    }

    async dataUpdateInline(id, updates) {
        console.log('dataUpdateInline - isDemoMode:', this.isDemoMode, 'id:', id, 'updates:', updates);
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
            
            if (this.isDemoMode) {
                await this.demoUpdateItem(id, updates);
                ui.showNotification('¡Bloque actualizado! ✨', 'success');
                await this.loadItems();
            } else {
                await data.updateItem(id, updates);
                ui.showNotification('¡Bloque actualizado! ✨', 'success');
                await this.loadItems();
            }
        } catch (error) {
            console.error('Error al actualizar inline:', error);
            ui.showNotification('No pude guardar los cambios del bloque.', 'error');
        }
    }

    async deleteItem(id) {
        try {
            if (this.isDemoMode) {
                await this.demoDeleteItem(id);
                ui.showNotification('Recuerdo borrado con éxito. 🗑️', 'info');
                await this.loadItems(); // ← corregido: recargar UI en modo demo
            } else {
                await data.deleteItem(id);
                ui.showNotification('Recuerdo borrado con éxito. 🗑️', 'info');
                await this.loadItems();
            }
        } catch (error) {
            console.error('Error al borrar:', error);
            ui.showNotification('No pude borrar eso. ¿Reintentamos?', 'error');
        }
    }

    async loadItems() {
        // Verificar si hay demo items en localStorage
        const demoItems = JSON.parse(localStorage.getItem('kaiDemoItems') || 'null');

        if (this.isDemoMode || demoItems) {
            this.isDemoMode = true;
            let items = demoItems || [];

            // Filtrar por categoría o tag
            if (this.currentTag) {
                // Filtrar por tag
                items = items.filter(item => item.tags && item.tags.includes(this.currentTag));
            } else if (this.currentCategory && this.currentCategory !== 'all') {
                // Filtrar por tipo
                items = items.filter(item => item.type === this.currentCategory);
            }

            ui.render(items, true);
            return;
        }

        ui.renderLoading();
        try {
            const filters = { parent_id: this.currentParentId };
            if (this.currentCategory !== 'all') filters.type = this.currentCategory;

            const items = await data.getItems(filters);

            // Filtrar por tag si aplica
            let filteredItems = items;
            if (this.currentTag) {
                filteredItems = items.filter(item => item.tags && item.tags.includes(this.currentTag));
            }

            ui.render(filteredItems);
            this.updateBreadcrumb();
        } catch (error) {
            console.error('Error al cargar:', error);
            ui.renderError('No pudimos cargar tus pensamientos. ¿Reintentamos?');
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
        console.log('🤖 Kai ejecutando acción:', action);
        try {
            const actionData = action.data || {};
            const id = actionData.id;

            switch (action.type) {
                case 'CREATE_ITEM':
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
            if (this.isDemoMode) {
                let items = JSON.parse(localStorage.getItem('kaiDemoItems')) || [];
                const item = items.find(i => i.id === id);
                if (item) {
                    item.anclado = !item.anclado;
                    localStorage.setItem('kaiDemoItems', JSON.stringify(items));
                    ui.showNotification(item.anclado ? '📌 Anclado al panel' : '📍 Desanclado', 'success');
                    await this.loadItems();
                }
            } else {
                const items = await data.getItems({ id });
                const item = Array.isArray(items) ? items[0] : items;
                const newPinned = !item.anclado;
                await data.updateItem(id, { anclado: newPinned });
                ui.showNotification(newPinned ? '📌 Anclado al panel' : '📍 Desanclado', 'success');
                await this.loadItems();
            }
        } catch (error) {
            console.error('Error pin:', error);
        }
    }

    async toggleTimelineTask(id, taskIndex, isCompleted) {
        try {
            if (this.isDemoMode) {
                let items = JSON.parse(localStorage.getItem('kaiDemoItems')) || [];
                const item = items.find(i => i.id === id);
                if (item && item.tareas && item.tareas[taskIndex]) {
                    item.tareas[taskIndex].completado = isCompleted;
                    localStorage.setItem('kaiDemoItems', JSON.stringify(items));
                    await this.loadItems();
                }
            } else {
                const items = await data.getItems({ id });
                const item = Array.isArray(items) ? items.find(i => i.id === id) : items;
                if (item && item.tareas && item.tareas[taskIndex]) {
                    item.tareas[taskIndex].completado = isCompleted;
                    await data.updateItem(id, { tareas: item.tareas });
                    await this.loadItems();
                }
            }
        } catch (error) {
            console.error('Error toggle timeline task:', error);
        }
    }

    async finishItem(id) {
        try {
            if (this.isDemoMode) {
                let items = JSON.parse(localStorage.getItem('kaiDemoItems')) || [];
                const item = items.find(i => i.id === id);
                if (item) {
                    item.tags = item.tags || [];
                    if (!item.tags.includes('logro')) item.tags.push('logro');
                    item.status = 'completed';
                    localStorage.setItem('kaiDemoItems', JSON.stringify(items));
                    ui.showNotification('¡Felicidades por tu logro! 🏆', 'success');
                    await this.loadItems();
                }
            } else {
                const items = await data.getItems({ id });
                const item = Array.isArray(items) ? items.find(i => i.id === id) : items;
                const currentTags = item.tags || [];
                const newTags = currentTags.includes('logro') ? currentTags : [...currentTags, 'logro'];
                await data.updateItem(id, { tags: newTags, status: 'completed' });
                ui.showNotification('¡Felicidades por tu logro! 🏆', 'success');
                await this.loadItems();
            }
        } catch (error) {
            console.error('Error finish:', error);
        }
    }

    // --- NAVEGACIÓN ---

    async openProject(id) {
        try {
            let project;
            if (this.isDemoMode) {
                const items = JSON.parse(localStorage.getItem('kaiDemoItems')) || [];
                project = items.find(i => i.id === id);
            } else {
                const items = await data.getItems({ id });
                project = Array.isArray(items) ? items.find(i => i.id === id) : items;
            }

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

        await this.loadItems();
    }

    async openEditModal(id, focus = null) {
        try {
            let item;
            if (this.isDemoMode) {
                const items = JSON.parse(localStorage.getItem('kaiDemoItems')) || [];
                item = items.find(i => i.id === id);
            } else {
                const items = await data.getItems({ id });
                item = Array.isArray(items) ? items.find(i => i.id === id) : items;
            }
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
}



// Inicialización global
window.addEventListener('DOMContentLoaded', () => {
    window.kai = new KaiController();
});

// listeners de auth — Supabase emite 'SIGNED_IN' (mayúsculas)
window.addEventListener('auth-SIGNED_IN', async () => {
    if (window.kai) {
        window.kai.currentUser = await auth.getUser();
        ui.updateUserInfo(window.kai.currentUser);
        await window.kai.loadItems();
    }
});

export default KaiController;
