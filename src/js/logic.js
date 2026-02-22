import { supabase } from './supabase.js';
import { data } from './data.js';
import { ui } from './ui.js';
import { auth } from './auth.js';
import { ai } from './ai.js';
import { cerebras } from './cerebras.js';

class KaiController {
    constructor() {
        this.currentUser = null;
        this.currentParentId = null;
        this.currentCategory = 'all';
        this.breadcrumbPath = [];
        this.init();
    }

    async init() {
        console.log('🧠 KAI: Controlador iniciado.');
        ui.init();
        this.bindEvents();

        try {
            this.currentUser = await auth.init();
            if (this.currentUser) {
                ui.updateUserInfo(this.currentUser);
                await this.loadItems();
            } else {
                ui.render([]);
                // Podríamos mostrar un mensaje de bienvenida aquí
            }
        } catch (error) {
            console.error('Error en inicialización:', error);
            ui.renderError('Vaya, KAI se ha distraído. ¿Recargamos?');
        }

        ai.init();
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

        // --- Navegación & Categorías ---
        document.querySelectorAll('.btn-category').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleCategoryClick(e.target);
            });
        });

        // La gestión de breadcrumbs ahora está centralizada en ui.renderBreadcrumb
        // por lo que eliminamos el listener manual de aquí para evitar recargas.

        // --- Modals & Sidebar ---
        document.getElementById('btn-voice')?.addEventListener('click', () => this.toggleVoiceInput());
        document.getElementById('btn-user')?.addEventListener('click', () => ui.toggleSidebar());
        document.getElementById('btn-close-sidebar')?.addEventListener('click', () => ui.toggleSidebar());
        document.getElementById('btn-google')?.addEventListener('click', () => this.handleGoogleLogin());
        document.getElementById('btn-logout')?.addEventListener('click', () => this.handleLogout());
        document.getElementById('btn-add-task')?.addEventListener('click', () => ui.addTaskToModal());

        // El botón de voz central en el footer
        document.getElementById('btn-voice-footer')?.addEventListener('click', () => this.toggleVoiceInput());
        // Compatibilidad con el del header (si existe)
        document.getElementById('btn-voice')?.addEventListener('click', () => this.toggleVoiceInput());

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

        if (!this.currentUser) {
            ui.showNotification('¡Ups! Necesitas entrar para que Kai recuerde esto.', 'warning');
            ui.toggleSidebar();
            return;
        }

        try {
            const parsed = ai.parseIntent(content);
            const finalType = type !== 'note' ? type : parsed.type;

            await data.createItem({
                content,
                type: finalType,
                parent_id: this.currentParentId,
                tags: parsed.tags,
                deadline: parsed.deadline
            });

            ui.clearMainInput();
            ui.showNotification('¡Anotado con éxito!', 'success');
            await this.loadItems();
        } catch (error) {
            console.error('Error al crear:', error);
            ui.showNotification('KAI no pudo guardar eso. ¿Intentamos de nuevo?', 'error');
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
            await data.updateItem(id, updates);
            ui.showNotification('¡Bloque actualizado! ✨', 'success');
            // Nota: El refresco lo maneja el UI o el controlador después de llamar a esto
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

    async loadItems() {
        ui.renderLoading();
        try {
            const filters = { parent_id: this.currentParentId };
            if (this.currentCategory !== 'all') filters.type = this.currentCategory;

            const items = await data.getItems(filters);
            ui.render(items);
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
            // Lógica optimista o directa
            const items = await data.getItems({ id }); // Simplificación
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
                // No mostramos notificación para no saturar, el feedback visual es el checkbox
                await this.loadItems();
            }
        } catch (error) {
            console.error('Error toggle timeline task:', error);
        }
    }

    async finishItem(id) {
        try {
            await data.updateItem(id, { type: 'logro', status: 'completed' });
            ui.showNotification('¡Felicidades por tu logro! 🏆', 'success');
            ui.showKaiResponse('¡Lo hiciste genial! Estoy orgulloso de ti. 🎉');
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

            this.breadcrumbPath.push({ id, content: project.content });
            this.currentParentId = id;
            await this.loadItems();
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
        document.querySelectorAll('.btn-category').forEach(b => b.classList.remove('active', 'border-brand'));
        button.classList.add('active', 'border-brand');
        this.currentCategory = button.dataset.category;
        await this.loadItems();
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
}

// Inicialización global
window.addEventListener('DOMContentLoaded', () => {
    window.kai = new KaiController();
});

// listeners de auth
window.addEventListener('auth-signIn', async () => {
    if (window.kai) {
        window.kai.currentUser = await auth.getUser();
        ui.updateUserInfo(window.kai.currentUser);
        await window.kai.loadItems();
    }
});

export default KaiController;
