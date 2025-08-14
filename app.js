/*
================================================================================
|       PANEL MARÍA - APLICACIÓN PRINCIPAL (VERSIÓN CORREGIDA Y ROBUSTA)     |
================================================================================
*/

import { auth, onAuthStateChanged, signInWithGoogle, signOutUser } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    const app = new PanelMariaApp();
    app.init();
});

class PanelMariaApp {
    constructor() {
        this.currentCategory = 'todos';
        this.items = [];
        this.selectedItems = new Set();
        this.filters = { search: '', tag: null };
        this.settings = {};
        this.currentEditId = null;
        this.user = null;
        this.bookmarkletData = null;
        this.modalActiveTags = new Set();
        this.bulkActiveTags = new Set();

        window.appController = {
            openModal: (id = null) => this.openModal(id),
            togglePinned: (id) => this.togglePinned(id),
            confirmDelete: (id) => this.confirmDeleteItem(id),
            handleCardClick: (event, id) => this.handleCardClick(event, id),
            toggleSelection: (id) => this.toggleSelection(id),
            convertToLogro: (id) => this.convertToLogro(id),
            toggleTask: (itemId, taskId) => this.toggleTask(itemId, taskId),
            filterByTag: (tag) => this.filterByTag(tag),
            // CORRECCIÓN: Función para que módulos externos como voice.js puedan recargar la UI.
            requestDataRefresh: async () => {
                await this.loadData();
                this.renderAll();
            }
        };
    }

    async init() {
        this.checkForBookmarkletData();
        this.setupEventListeners();
        this.setupAuthListener();
    }

    // --- LÓGICA DE DATOS ---

    async loadData() {
        try {
            const data = await window.storage.loadAll();
            this.items = data.items || [];
            this.settings = data.settings || { autoSaveVoice: false, theme: 'default', lastCategory: 'todos', customCategories: [], categoryTags: {} };
            if (!this.settings.categoryTags) this.settings.categoryTags = {};
        } catch (error) {
            console.error('Error loading data:', error);
            this.items = [];
            this.settings = { autoSaveVoice: false, theme: 'default', lastCategory: 'todos', customCategories: [], categoryTags: {} };
        }
    }

    async saveDataSettings() {
        try {
            await window.storage.saveAll({ settings: this.settings });
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showToast('Error al guardar la configuración', 'error');
        }
    }

    async performItemUpdates(operations) {
        try {
            if (window.storage.adapter.type === 'local') {
                const newItems = await window.storage.performBatchUpdate(operations, this.items);
                this.items = newItems;
                await window.storage.saveAll({ items: this.items, settings: this.settings });
            } else {
                // CORRECCIÓN: Lógica simplificada para Firebase sin compilador.
                // Envía los cambios y luego recarga todo para asegurar la consistencia.
                // Es menos eficiente pero más robusto en este contexto.
                await window.storage.performBatchUpdate(operations);
                await this.loadData();
            }
            this.selectedItems.clear();
            this.renderAll();
        } catch (error) {
            console.error("Error performing item updates:", error);
            this.showToast("Error al actualizar los datos.", "error");
            await this.loadData(); // Recargar si hay un error
            this.renderAll();
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        let finalCategory = document.getElementById('itemCategory').value;
        if (finalCategory === '__new_category__') {
            const newCustomCategory = document.getElementById('newItemCategory').value.trim();
            if (!newCustomCategory) {
                this.showToast('El nombre de la nueva categoría es obligatorio.', 'error');
                return;
            }
            finalCategory = newCustomCategory.toLowerCase();
            if (!(this.settings.customCategories || []).includes(finalCategory)) {
                this.settings.customCategories.push(finalCategory);
                await this.saveDataSettings();
            }
        }
        
        const finalTags = Array.from(this.modalActiveTags);
        if (!this.settings.categoryTags[finalCategory]) {
            this.settings.categoryTags[finalCategory] = [];
        }
        finalTags.forEach(tag => {
            if (!this.settings.categoryTags[finalCategory].includes(tag)) {
                this.settings.categoryTags[finalCategory].push(tag);
            }
        });

        const itemData = {
            categoria: finalCategory,
            titulo: document.getElementById('itemTitle').value.trim(),
            descripcion: document.getElementById('itemDescription').value.trim(),
            url: document.getElementById('itemUrl').value.trim(),
            anclado: document.getElementById('itemPinned').checked,
            etiquetas: finalTags,
            tareas: Array.from(document.querySelectorAll('#tasksList .task-item')).map(item => ({
                id: window.storage.generateId(),
                titulo: item.querySelector('.task-input').value.trim(),
                completado: item.querySelector('.task-checkbox').checked
            })).filter(t => t.titulo)
        };

        if (!itemData.titulo || !itemData.categoria) {
            this.showToast('El título y la categoría son obligatorios.', 'error');
            return;
        }
        
        let operation;
        if (this.currentEditId) {
            operation = { type: 'update', id: this.currentEditId, data: itemData };
            this.showToast('Elemento actualizado', 'success');
        } else {
            const newItem = {
                ...itemData,
                fecha_creacion: new Date().toISOString(),
                fecha_finalizacion: null,
                meta: {}
            };
            operation = { type: 'add', data: newItem };
            this.showToast('Elemento creado', 'success');
        }
        
        await this.performItemUpdates([operation]);
        
        this.closeModal();
        this.renderNavigationTabs();
        this.populateCategorySelector(document.getElementById('itemCategory'), true);
        this.populateCategorySelector(document.getElementById('bulkCategorySelector'));
        this.switchCategory(itemData.categoria);
    }

    async deleteItem(id) {
        await this.performItemUpdates([{ type: 'delete', id }]);
        this.showToast('Elemento eliminado', 'success');
    }

    async togglePinned(id) {
        const item = this.items.find(item => item.id === id);
        if (item) {
            await this.performItemUpdates([{ type: 'update', id, data: { anclado: !item.anclado } }]);
        }
    }

    async convertToLogro(id) {
        await this.performItemUpdates([{ type: 'update', id, data: { categoria: 'logros', fecha_finalizacion: new Date().toISOString() } }]);
        this.showToast('Elemento convertido a logro', 'success');
        this.switchCategory('logros');
    }

    async toggleTask(itemId, taskId) {
        const item = this.items.find(i => i.id === itemId);
        if (item) {
            const newTasks = item.tareas.map(t => 
                t.id === taskId ? { ...t, completado: !t.completado } : t
            );
            await this.performItemUpdates([{ type: 'update', id: itemId, data: { tareas: newTasks } }]);
        }
    }

    async bulkTogglePinned() {
        const firstSelectedIsPinned = this.items.find(item => this.selectedItems.has(item.id))?.anclado;
        const targetState = !firstSelectedIsPinned;
        const operations = Array.from(this.selectedItems).map(id => ({ type: 'update', id, data: { anclado: targetState } }));
        await this.performItemUpdates(operations);
        this.showToast('Elementos anclados/desanclados', 'success');
    }

    async handleBulkChangeCategory() {
        const newCategory = document.getElementById('bulkCategorySelector').value;
        if (!newCategory) return;
        const operations = Array.from(this.selectedItems).map(id => ({ type: 'update', id, data: { categoria: newCategory } }));
        await this.performItemUpdates(operations);
        this.closeBulkCategoryModal();
        this.showToast('Categoría cambiada', 'success');
    }

    async handleBulkChangeTags() {
        const newTags = Array.from(this.bulkActiveTags);
        const operations = Array.from(this.selectedItems).map(id => ({ type: 'update', id, data: { etiquetas: newTags } }));
        await this.performItemUpdates(operations);
        this.closeBulkTagsModal();
        this.showToast('Etiquetas actualizadas', 'success');
    }

    async bulkDelete() {
        const operations = Array.from(this.selectedItems).map(id => ({ type: 'delete', id }));
        await this.performItemUpdates(operations);
        this.showToast('Elementos eliminados', 'success');
    }

    // --- LÓGICA DE UI Y EVENTOS ---
    
    setupApplication() {
        this.renderNavigationTabs();
        this.populateCategorySelector(document.getElementById('itemCategory'), true);
        this.switchCategory(this.settings.lastCategory || 'directorio');
        this.applyTheme();
        this.processBookmarkletData();
    }

    setupAuthListener() {
        onAuthStateChanged(auth, (user) => {
            this.user = user;
            const authSection = document.getElementById('auth-section');
            const appContent = document.getElementById('app-content');
            const logoutBtn = document.getElementById('logoutBtn');
            const addItemBtn = document.getElementById('addItemBtn');
            const voiceBtn = document.getElementById('voiceBtn');

            if (user) {
                authSection.classList.add('hidden');
                appContent.classList.remove('hidden');
                logoutBtn.classList.remove('hidden');
                addItemBtn.classList.remove('hidden');
                voiceBtn.classList.remove('hidden');
                window.storage.setAdapter('firebase', user.uid);
            } else {
                authSection.classList.remove('hidden');
                appContent.classList.add('hidden');
                logoutBtn.classList.add('hidden');
                addItemBtn.classList.add('hidden');
                voiceBtn.classList.add('hidden');
                window.storage.setAdapter('local');
            }

            this.loadData().then(() => {
                this.setupApplication();
            });
        });
    }

    checkForBookmarkletData() {
        const params = new URLSearchParams(window.location.search);
        if (params.get('action') === 'add') {
            this.bookmarkletData = {
                title: params.get('title') || '',
                url: params.get('url') || '',
                category: params.get('category') || 'directorio'
            };
            const cleanUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    }

    processBookmarkletData() {
        if (this.bookmarkletData) {
            this.openModal(); 
            document.getElementById('itemTitle').value = this.bookmarkletData.title;
            document.getElementById('itemUrl').value = this.bookmarkletData.url;
            const categorySelector = document.getElementById('itemCategory');
            const categoryExists = [...categorySelector.options].some(opt => opt.value === this.bookmarkletData.category);
            categorySelector.value = categoryExists ? this.bookmarkletData.category : 'directorio';
            this.bookmarkletData = null; 
        }
    }

    async loginWithGoogle() {
        try {
            await signInWithGoogle();
            this.showToast('Inicio de sesión exitoso', 'success');
        } catch (error) {
            this.showToast(`Error al iniciar sesión: ${error.message}`, 'error');
        }
    }

    async logout() {
        try {
            await signOutUser();
            this.showToast('Sesión cerrada', 'info');
        } catch (error) {
            this.showToast(`Error al cerrar sesión: ${error.message}`, 'error');
        }
    }
    
    setupEventListeners() {
        document.getElementById('loginBtn').addEventListener('click', () => this.loginWithGoogle());
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('voiceBtn').addEventListener('click', () => {
            if (window.voiceManager) {
                window.voiceManager.setAutoSave(this.settings.autoSaveVoice);
                window.voiceManager.startListening();
            } else {
                this.showToast('El módulo de voz no está cargado.', 'error');
            }
        });
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettingsModal());
        document.getElementById('addItemBtn').addEventListener('click', () => this.openModal());
        document.getElementById('emptyStateAddBtn').addEventListener('click', () => this.openModal());
        
        let searchTimeout;
        document.getElementById('searchInput').addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.filters.search = e.target.value.toLowerCase();
                this.renderAll();
            }, 300);
        });
        
        document.getElementById('selectAllCheckbox').addEventListener('change', (e) => this.toggleSelectAll(e.target.checked));
        document.getElementById('bulkChangeCategoryBtn').addEventListener('click', () => this.openBulkCategoryModal());
        document.getElementById('bulkChangeTagsBtn').addEventListener('click', () => this.openBulkTagsModal());
        document.getElementById('bulkPinBtn').addEventListener('click', () => this.bulkTogglePinned());
        document.getElementById('bulkDeleteBtn').addEventListener('click', () => this.confirmBulkDelete());
        
        document.getElementById('closeModalBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('itemForm').addEventListener('submit', (e) => this.handleFormSubmit(e));
        document.getElementById('itemCategory').addEventListener('change', (e) => this.handleCategoryChange(e));

        const tagsWrapper = document.getElementById('itemTagsWrapper');
        const tagsInput = document.getElementById('itemTagsInput');
        tagsWrapper.addEventListener('click', () => tagsInput.focus());
        tagsInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (e.target.value.trim()) this.addModalTag(e.target.value.trim());
            } else if (e.key === 'Backspace' && e.target.value === '') {
                this.removeModalTag(Array.from(this.modalActiveTags).pop());
            }
        });
        tagsInput.addEventListener('input', (e) => this.renderTagSuggestions(e.target.value));
        document.getElementById('tagSuggestions').addEventListener('click', (e) => {
            if (e.target.classList.contains('tag-suggestion')) this.addModalTag(e.target.dataset.tag);
        });
        
        document.getElementById('addTaskBtn').addEventListener('click', () => this.addTaskField());
        document.getElementById('confirmCancelBtn').addEventListener('click', () => this.closeConfirmModal());
        document.getElementById('confirmOkBtn').addEventListener('click', () => this.executeConfirmAction());
        document.getElementById('bulkCategoryCancelBtn').addEventListener('click', () => this.closeBulkCategoryModal());
        document.getElementById('bulkCategoryOkBtn').addEventListener('click', () => this.handleBulkChangeCategory());
        document.getElementById('bulkTagsCancelBtn').addEventListener('click', () => this.closeBulkTagsModal());
        document.getElementById('bulkTagsOkBtn').addEventListener('click', () => this.handleBulkChangeTags());

        const bulkTagsWrapper = document.getElementById('bulkTagsWrapper');
        const bulkTagsInput = document.getElementById('bulkTagsInput');
        bulkTagsWrapper.addEventListener('click', () => bulkTagsInput.focus());
        bulkTagsInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (e.target.value.trim()) this.addBulkTag(e.target.value.trim());
            } else if (e.key === 'Backspace' && e.target.value === '') {
                this.removeBulkTag(Array.from(this.bulkActiveTags).pop());
            }
        });
        bulkTagsInput.addEventListener('input', (e) => this.renderBulkTagSuggestions(e.target.value));
        document.getElementById('bulkTagSuggestions').addEventListener('click', (e) => {
            if (e.target.classList.contains('tag-suggestion')) this.addBulkTag(e.target.dataset.tag);
        });
        
        document.getElementById('settingsCloseBtn').addEventListener('click', () => this.closeSettingsModal());
        document.getElementById('autoSaveVoice').addEventListener('change', (e) => { this.settings.autoSaveVoice = e.target.checked; this.saveDataSettings(); });
        document.getElementById('themeSelect').addEventListener('change', (e) => { this.settings.theme = e.target.value; this.applyTheme(); this.saveDataSettings(); });
        document.getElementById('exportDataBtn').addEventListener('click', () => window.storage.exportData());
        document.getElementById('importDataBtn').addEventListener('click', () => document.getElementById('importFile').click());
        document.getElementById('importFile').addEventListener('change', (e) => this.handleImportFile(e));
        
        document.getElementById('newCategoryCloseBtn').addEventListener('click', () => this.closeNewCategoryModal());
        document.getElementById('newCategoryCancelBtn').addEventListener('click', () => this.closeNewCategoryModal());
        document.getElementById('newCategoryCreateBtn').addEventListener('click', () => this.addCustomCategory(document.getElementById('newCategoryNameInput').value));
    }
    
    // --- MÉTODOS DE RENDERIZADO ---
    
    switchCategory(category) {
        this.currentCategory = category;
        this.settings.lastCategory = category;
        this.saveDataSettings();
        document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.category === category));
        this.selectedItems.clear();
        this.filters.tag = null;
        this.renderAll();
    }
    
    renderAll() {
        this.renderItems();
        this.updateSelectionUI();
        this.updateEmptyState();
        this.renderTagFilters();
    }

    renderNavigationTabs() {
        const navContainer = document.querySelector('.nav-tabs .nav-tabs__inner');
        const predefinedCategories = ['directorio', 'ideas', 'proyectos', 'logros'];
        const allCategories = [...new Set([...predefinedCategories, ...(this.settings.customCategories || [])])];

        navContainer.innerHTML = `
            ${allCategories.map(category => `
                <button class="nav-tab" data-category="${category}">
                    <span class="material-symbols-outlined">${this.getCategoryIcon(category)}</span>
                    ${this.formatCategoryName(category)}
                </button>
            `).join('')}
            <button id="newCategoryNavBtn" class="btn btn--text"><span class="material-symbols-outlined">add</span> Nueva</button>
        `;

        navContainer.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchCategory(tab.dataset.category));
        });
        document.getElementById('newCategoryNavBtn').addEventListener('click', () => this.openNewCategoryModal());
        navContainer.querySelector(`[data-category="${this.currentCategory}"]`)?.classList.add('active');
    }
    
    createItemCard(item) {
        const isSelected = this.selectedItems.has(item.id);
        const date = new Date(item.fecha_creacion).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
        const progress = (item.tareas && item.tareas.length > 0) ? this.createProgressBar(item) : '';
        return `
            <div class="card ${isSelected ? 'selected' : ''}" data-id="${item.id}" onclick="appController.handleCardClick(event, '${item.id}')">
                <input type="checkbox" class="card__checkbox" ${isSelected ? 'checked' : ''} onchange="appController.toggleSelection('${item.id}')">
                <div class="card__header">
                    <h3 class="card__title">${this.escapeHtml(item.titulo)}</h3>
                    <button class="card__pin ${item.anclado ? 'pinned' : ''}" onclick="event.stopPropagation(); appController.togglePinned('${item.id}')" title="Anclar"><span class="material-symbols-outlined">push_pin</span></button>
                </div>
                <div class="card__body">
                    ${item.descripcion ? `<p class="card__description">${this.escapeHtml(item.descripcion)}</p>` : ''}
                    ${item.url ? `<div class="card__urls"><a href="${this.escapeHtml(item.url)}" target="_blank" class="card__url" onclick="event.stopPropagation()">${this.escapeHtml(this.truncateUrl(item.url))}</a></div>` : ''}
                    ${item.tareas && item.tareas.length > 0 ? this.createTasksContent(item) : ''}
                    ${progress}
                </div>
                ${item.etiquetas && item.etiquetas.length > 0 ? `<div class="card__tags">${item.etiquetas.map(tag => `<span class="card__tag" onclick="event.stopPropagation(); appController.filterByTag('${this.escapeHtml(tag)}')">${this.formatTagText(this.escapeHtml(tag))}</span>`).join('')}</div>` : ''}
                <div class="card__footer">
                    <span class="card__date">${date} ${item.fecha_finalizacion ? ` (Completado)`: ''}</span>
                    <div class="card__actions">
                        <button class="btn btn--text" onclick="event.stopPropagation(); appController.openModal('${item.id}')" title="Editar"><span class="material-symbols-outlined">edit</span></button>
                        ${item.categoria !== 'logros' ? `<button class="btn btn--text" onclick="event.stopPropagation(); appController.convertToLogro('${item.id}')" title="Convertir a logro"><span class="material-symbols-outlined">emoji_events</span></button>` : ''}
                        <button class="btn btn--text" onclick="event.stopPropagation(); appController.confirmDelete('${item.id}')" title="Eliminar"><span class="material-symbols-outlined">delete</span></button>
                    </div>
                </div>
            </div>`;
    }

    // (El resto de funciones de renderizado, modales, helpers, etc. no requieren cambios críticos
    // y se omiten por brevedad, pero se incluirían en el archivo final)
    
    // --- Resto de las funciones (sin cambios importantes) ---
    filterByTag(tag) { this.filters.tag = this.filters.tag === tag ? null : tag; this.renderAll(); }
    renderItems() { const container = document.getElementById('itemsContainer'); const filteredItems = this.getFilteredItems(); container.innerHTML = filteredItems.length > 0 ? filteredItems.map(item => this.createItemCard(item)).join('') : ''; }
    getFilteredItems() { let items = this.items; if (this.currentCategory !== 'todos') { items = items.filter(item => item.categoria.toLowerCase() === this.currentCategory.toLowerCase()); } if (this.filters.search) { const term = this.filters.search; items = items.filter(item => item.titulo.toLowerCase().includes(term) || (item.descripcion && item.descripcion.toLowerCase().includes(term)) || (item.etiquetas && item.etiquetas.some(tag => tag.toLowerCase().includes(term))) || (item.url && item.url.toLowerCase().includes(term))); } if (this.filters.tag) { items = items.filter(item => item.etiquetas && item.etiquetas.some(tag => tag.toLowerCase() === this.filters.tag.toLowerCase())); } return items.sort((a, b) => (a.anclado === b.anclado) ? (new Date(b.fecha_creacion) - new Date(a.fecha_creacion)) : (a.anclado ? -1 : 1)); }
    updateSelectionUI() { const bulkActions = document.getElementById('bulkActions'); const selectAllCheckbox = document.getElementById('selectAllCheckbox'); const selectionCount = document.getElementById('selectionCount'); if (this.selectedItems.size > 0) { bulkActions.classList.remove('hidden'); selectionCount.textContent = this.selectedItems.size; } else { bulkActions.classList.add('hidden'); } const filteredItems = this.getFilteredItems(); if (filteredItems.length > 0) { const allVisibleSelected = filteredItems.every(item => this.selectedItems.has(item.id)); selectAllCheckbox.checked = allVisibleSelected; selectAllCheckbox.indeterminate = !allVisibleSelected && filteredItems.some(item => this.selectedItems.has(item.id)); } else { selectAllCheckbox.checked = false; selectAllCheckbox.indeterminate = false; } }
    updateEmptyState() { const emptyState = document.getElementById('emptyState'); const hasItems = document.getElementById('itemsContainer').children.length > 0; emptyState.classList.toggle('hidden', !hasItems); if (!hasItems) { emptyState.querySelector('.empty-state__title').textContent = `No hay elementos en "${this.formatCategoryName(this.currentCategory)}"`; } }
    openModal(id = null) { this.currentEditId = id; const modal = document.getElementById('itemModal'); this.modalActiveTags.clear(); if (id) { const item = this.items.find(i => i.id === id); if (item) { document.getElementById('modalTitle').textContent = 'Editar Elemento'; this.populateModalForm(item); (item.etiquetas || []).forEach(tag => this.modalActiveTags.add(tag)); } } else { document.getElementById('modalTitle').textContent = 'Agregar Nuevo Elemento'; this.clearModalForm(); }         modal.classList.remove('hidden'); this.renderModalTags(); document.getElementById('itemTitle').focus(); }
    closeModal() { document.getElementById('itemModal').classList.add('hidden'); }
    populateModalForm(item) { document.getElementById('itemTitle').value = item?.titulo || ''; document.getElementById('itemDescription').value = item?.descripcion || ''; document.getElementById('itemUrl').value = item?.url || ''; document.getElementById('itemPinned').checked = item?.anclado || false; const categorySelector = document.getElementById('itemCategory'); categorySelector.value = item?.categoria || this.currentCategory || 'directorio'; this.handleCategoryChange({ target: categorySelector }); document.getElementById('tasksList').innerHTML = ''; if (item?.tareas?.length) { item.tareas.forEach(task => this.addTaskField(task)); } else { this.addTaskField(); } }
    clearModalForm() { document.getElementById('itemForm').reset(); document.getElementById('tasksList').innerHTML = ''; this.addTaskField(); document.getElementById('newCategoryInputGroup').style.display = 'none'; }
    handleCategoryChange(event) { document.getElementById('newCategoryInputGroup').style.display = event.target.value === '__new_category__' ? 'block' : 'none'; }
    addTaskField(task = null) { const list = document.getElementById('tasksList'); const item = document.createElement('div'); item.className = 'task-item'; item.innerHTML = `<input type="checkbox" class="checkbox-field task-checkbox" ${task?.completado ? 'checked' : ''}><input type="text" class="input-field task-input" value="${this.escapeHtml(task?.titulo || '')}" placeholder="Nueva tarea"><button type="button" class="btn btn--icon remove-task"><span class="material-symbols-outlined">remove</span></button>`; item.querySelector('.remove-task').addEventListener('click', () => { if (list.children.length > 1) item.remove(); else { item.querySelector('.task-input').value = ''; item.querySelector('.task-checkbox').checked = false; } }); list.appendChild(item); }
    confirmBulkDelete() { this.showConfirmModal(`Eliminar ${this.selectedItems.size} elementos`, '¿Estás seguro? Esta acción no se puede deshacer.', () => this.bulkDelete()); }
    confirmDeleteItem(id) { this.showConfirmModal('Eliminar Elemento', '¿Estás seguro de que quieres eliminar este elemento?', () => this.deleteItem(id)); }
    showConfirmModal(title, message, onConfirm) { document.getElementById('confirmTitle').textContent = title; document.getElementById('confirmMessage').textContent = message; this.confirmAction = onConfirm; document.getElementById('confirmModal').classList.remove('hidden'); }
    closeConfirmModal() { document.getElementById('confirmModal').classList.add('hidden'); }
    executeConfirmAction() { if (this.confirmAction) this.confirmAction(); this.closeConfirmModal(); }
    escapeHtml(text) { if (typeof text !== 'string') return ''; return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
    formatCategoryName(name) {
        return name.charAt(0).toUpperCase() + name.slice(1);
    }

    getCategoryIcon(category) {
        switch (category) {
            case 'directorio': return 'folder';
            case 'ideas': return 'lightbulb';
            case 'proyectos': return 'work';
            case 'logros': return 'emoji_events';
            case 'todos': return 'select_all';
            default: return 'category';
        }
    }

    truncateUrl(url) {
        const maxLength = 30;
        if (url.length <= maxLength) return url;
        const domain = new URL(url).hostname;
        if (domain.length <= maxLength) return domain;
        return `${domain.substring(0, maxLength - 3)}...`;
    }

    createProgressBar(item) {
        const totalTasks = item.tareas.length;
        const completedTasks = item.tareas.filter(task => task.completado).length;
        const percentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
        return `
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: ${percentage}%;"></div>
                <span class="progress-text">${completedTasks}/${totalTasks} tareas (${percentage}%)</span>
            </div>
        `;
    }

    createTasksContent(item) {
        return `
            <div class="card__tasks">
                ${item.tareas.map(task => `
                    <div class="task-item-card">
                        <input type="checkbox" class="task-checkbox-card" ${task.completado ? 'checked' : ''} onchange="appController.toggleTask('${item.id}', '${task.id}')">
                        <span class="task-title-card ${task.completado ? 'completed' : ''}">${this.escapeHtml(task.titulo)}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderModalTags() {
        const tagsWrapper = document.getElementById('itemTagsWrapper');
        const tagsInput = document.getElementById('itemTagsInput');
        tagsWrapper.innerHTML = '';
        Array.from(this.modalActiveTags).forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'tag-pill';
            tagElement.innerHTML = `${this.formatTagText(this.escapeHtml(tag))} <span class="tag-remove" data-tag="${this.escapeHtml(tag)}">&times;</span>`;
            tagElement.querySelector('.tag-remove').addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeModalTag(e.target.dataset.tag);
            });
            tagsWrapper.insertBefore(tagElement, tagsInput);
        });
        if (tagsInput) { // Add null check here
            // tagsInput.value = ''; // Moved to addModalTag
        }
    }

    addModalTag(tag) {
        const normalizedTag = tag.toLowerCase();
        if (!this.modalActiveTags.has(normalizedTag)) {
            this.modalActiveTags.add(normalizedTag);
            this.renderModalTags();
            this.renderTagSuggestions('');
            document.getElementById('itemTagsInput').value = '';
        }
    }

    removeModalTag(tag) {
        this.modalActiveTags.delete(tag);
        this.renderModalTags();
        this.renderTagSuggestions('');
    }

    renderTagSuggestions(input) {
        const suggestionsContainer = document.getElementById('tagSuggestions');
        suggestionsContainer.innerHTML = '';
        const allTags = new Set();
        this.items.forEach(item => (item.etiquetas || []).forEach(tag => allTags.add(tag)));
        this.settings.customCategories.forEach(cat => (this.settings.categoryTags[cat] || []).forEach(tag => allTags.add(tag)));

        const filteredSuggestions = Array.from(allTags).filter(tag => tag.includes(input.toLowerCase()) && !this.modalActiveTags.has(tag));

        filteredSuggestions.slice(0, 10).forEach(tag => {
            const suggestion = document.createElement('span');
            suggestion.className = 'tag-suggestion';
            suggestion.dataset.tag = tag;
            suggestion.textContent = this.formatTagText(tag);
            suggestionsContainer.appendChild(suggestion);
        });
    }

    renderBulkTags() {
        const tagsWrapper = document.getElementById('bulkTagsWrapper');
        const tagsInput = document.getElementById('bulkTagsInput');
        tagsWrapper.innerHTML = '';
        Array.from(this.bulkActiveTags).forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'tag-pill';
            tagElement.innerHTML = `${this.formatTagText(this.escapeHtml(tag))} <span class="tag-remove" data-tag="${this.escapeHtml(tag)}">&times;</span>`;
            tagElement.querySelector('.tag-remove').addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeBulkTag(e.target.dataset.tag);
            });
            tagsWrapper.insertBefore(tagElement, tagsInput);
        });
        tagsInput.value = '';
    }

    addBulkTag(tag) {
        const normalizedTag = tag.toLowerCase();
        if (!this.bulkActiveTags.has(normalizedTag)) {
            this.bulkActiveTags.add(normalizedTag);
            this.renderBulkTags();
            this.renderBulkTagSuggestions('');
        }
    }

    removeBulkTag(tag) {
        this.bulkActiveTags.delete(tag);
        this.renderBulkTags();
        this.renderBulkTagSuggestions('');
    }

    renderBulkTagSuggestions(input) {
        const suggestionsContainer = document.getElementById('bulkTagSuggestions');
        suggestionsContainer.innerHTML = '';
        const allTags = new Set();
        this.items.forEach(item => (item.etiquetas || []).forEach(tag => allTags.add(tag)));
        this.settings.customCategories.forEach(cat => (this.settings.categoryTags[cat] || []).forEach(tag => allTags.add(tag)));

        const filteredSuggestions = Array.from(allTags).filter(tag => tag.includes(input.toLowerCase()) && !this.bulkActiveTags.has(tag));

        filteredSuggestions.slice(0, 10).forEach(tag => {
            const suggestion = document.createElement('span');
            suggestion.className = 'tag-suggestion';
            suggestion.dataset.tag = tag;
            suggestion.textContent = this.formatTagText(tag);
            suggestionsContainer.appendChild(suggestion);
        });
    }

    populateCategorySelector(selector, includeNewOption = false) {
        selector.innerHTML = '';
        const predefinedCategories = ['directorio', 'ideas', 'proyectos', 'logros'];
        const allCategories = [...new Set([...predefinedCategories, ...(this.settings.customCategories || [])])];

        allCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = this.formatCategoryName(category);
            selector.appendChild(option);
        });

        if (includeNewOption) {
            const newOption = document.createElement('option');
            newOption.value = '__new_category__';
            newOption.textContent = 'Crear nueva categoría...';
            selector.appendChild(newOption);
        }
    }

    addCustomCategory(categoryName) {
        const normalizedName = categoryName.trim().toLowerCase();
        if (!normalizedName) {
            this.showToast('El nombre de la categoría no puede estar vacío.', 'error');
            return;
        }
        if (this.settings.customCategories.includes(normalizedName)) {
            this.showToast('Esa categoría ya existe.', 'info');
            return;
        }
        this.settings.customCategories.push(normalizedName);
        this.saveDataSettings();
        this.populateCategorySelector(document.getElementById('itemCategory'), true);
        this.populateCategorySelector(document.getElementById('bulkCategorySelector'));
        this.showToast('Categoría creada.', 'success');
        this.closeNewCategoryModal();
    }

    openNewCategoryModal() {
        document.getElementById('newCategoryModal').classList.remove('hidden');
        document.getElementById('newCategoryNameInput').value = '';
        document.getElementById('newCategoryNameInput').focus();
    }

    closeNewCategoryModal() {
        document.getElementById('newCategoryModal').classList.add('hidden');
    }

    openBulkCategoryModal() {
        this.populateCategorySelector(document.getElementById('bulkCategorySelector'));
        document.getElementById('bulkCategoryModal').classList.remove('hidden');
    }

    closeBulkCategoryModal() {
        document.getElementById('bulkCategoryModal').classList.add('hidden');
    }

    openBulkTagsModal() {
        this.bulkActiveTags.clear();
        this.renderBulkTags();
        document.getElementById('bulkTagsModal').classList.remove('hidden');
        // CORRECCIÓN: Añadir un pequeño retraso para asegurar que el elemento esté renderizado y enfocable.
        setTimeout(() => {
            document.getElementById('bulkTagsInput').focus();
        }, 50); // 50ms de retraso
    }

    closeBulkTagsModal() {
        document.getElementById('bulkTagsModal').classList.add('hidden');
    }

    openSettingsModal() {
        document.getElementById('autoSaveVoice').checked = this.settings.autoSaveVoice;
        document.getElementById('themeSelect').value = this.settings.theme;
        document.getElementById('settingsModal').classList.remove('hidden');
    }

    closeSettingsModal() {
        document.getElementById('settingsModal').classList.add('hidden');
    }

    applyTheme() {
        document.body.className = ''; // Clear existing themes
        document.body.classList.add(`theme-${this.settings.theme}`);
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    toggleSelectAll(checked) {
        const filteredItems = this.getFilteredItems();
        this.selectedItems.clear();
        if (checked) {
            filteredItems.forEach(item => this.selectedItems.add(item.id));
        }
        this.renderItems(); // Re-render to update checkboxes
        this.updateSelectionUI();
    }

    toggleSelection(id) {
        if (this.selectedItems.has(id)) {
            this.selectedItems.delete(id);
        } else {
            this.selectedItems.add(id);
        }
        this.renderItems(); // Re-render to update checkboxes
        this.updateSelectionUI();
    }

    handleCardClick(event, id) {
        // If the click was on a checkbox or a button, let those handlers manage it
        if (event.target.closest('input[type="checkbox"]') || event.target.closest('button')) {
            return;
        }
        // Otherwise, open the modal for editing
        this.openModal(id);
    }

    formatTagText(tag) {
        return tag.charAt(0).toUpperCase() + tag.slice(1);
    }

    renderTagFilters() {
        const tagFiltersContainer = document.getElementById('tagFilters');
        tagFiltersContainer.innerHTML = '';
        const allTags = new Set();
        this.getFilteredItems().forEach(item => (item.etiquetas || []).forEach(tag => allTags.add(tag)));

        Array.from(allTags).sort().forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = `tag-filter ${this.filters.tag === tag ? 'active' : ''}`;
            tagElement.textContent = this.formatTagText(tag);
            tagElement.addEventListener('click', () => this.filterByTag(tag));
            tagFiltersContainer.appendChild(tagElement);
        });
    }

    handleImportFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target.result;
                let importedData;

                if (file.name.endsWith('.json')) {
                    importedData = JSON.parse(content);
                } else if (file.name.endsWith('.html')) {
                    // Basic HTML bookmark import (Google Chrome export format)
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(content, 'text/html');
                    const links = doc.querySelectorAll('a');
                    importedData = Array.from(links).map(link => ({
                        id: window.storage.generateId(),
                        categoria: 'directorio', // Default category for imported bookmarks
                        titulo: link.textContent.trim(),
                        url: link.href,
                        fecha_creacion: new Date().toISOString(),
                        etiquetas: [],
                        tareas: [],
                        anclado: false,
                        fecha_finalizacion: null,
                        meta: {}
                    }));
                } else {
                    this.showToast('Formato de archivo no soportado.', 'error');
                    return;
                }

                if (Array.isArray(importedData)) {
                    // Merge with existing items, avoiding duplicates by URL if it's a directory item
                    const newItems = [];
                    for (const importedItem of importedData) {
                        const existingItem = this.items.find(item => item.url && item.url === importedItem.url);
                        if (!existingItem) {
                            newItems.push(importedItem);
                        }
                    }
                    if (newItems.length > 0) {
                        await window.storage.performBatchUpdate(newItems.map(item => ({ type: 'add', data: item })));
                        await this.loadData();
                        this.renderAll();
                        this.showToast(`Importados ${newItems.length} elementos.`, 'success');
                    } else {
                        this.showToast('No se encontraron nuevos elementos para importar o ya existen.', 'info');
                    }
                } else if (importedData.items && Array.isArray(importedData.items)) {
                    // Full backup import
                    await window.storage.saveAll(importedData);
                    await this.loadData();
                    this.renderAll();
                    this.showToast('Datos importados exitosamente.', 'success');
                } else {
                    this.showToast('Formato de datos importados inválido.', 'error');
                }
            } catch (parseError) {
                console.error('Error parsing imported file:', parseError);
                this.showToast('Error al procesar el archivo importado.', 'error');
            }
        };
        reader.readAsText(file);
    }
} // Closing brace for PanelMariaApp class
