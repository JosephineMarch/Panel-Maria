/*
================================================================================
|       PANEL MARÍA - APLICACIÓN PRINCIPAL (VERSIÓN CORREGIDA Y ROBUSTA)     |
================================================================================
*/

// ==============================================================================
// CLASE REUTILIZABLE PARA CAMPOS DE ETIQUETAS (TAGS)
// ==============================================================================

/**
 * Formatea el texto de una etiqueta para visualización (primera letra en mayúscula).
 * @param {string} tag - La etiqueta a formatear.
 * @returns {string}
 */
function formatTagText(tag) {
    if (!tag) return '';
    return tag.charAt(0).toUpperCase() + tag.slice(1);
}

class TagInput {
    /**
     * @param {HTMLElement} container - El elemento contenedor del campo de etiquetas.
     * @param {Function} allTagsProvider - Una función que devuelve un Set de todas las etiquetas disponibles para sugerencias.
     */
    constructor(container, allTagsProvider) {
        this.container = container;
        this.input = this.container.querySelector('.tags-input-field');
        this.suggestionsContainer = this.container.parentElement.querySelector('.tag-suggestions');
        this.allTagsProvider = allTagsProvider;
        this.activeTags = new Set();

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.container.addEventListener('click', () => this.input.focus());

        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (this.input.value.trim()) this.addTag(this.input.value.trim());
            } else if (e.key === 'Backspace' && this.input.value === '') {
                this.removeTag(Array.from(this.activeTags).pop());
            }
        });

        this.input.addEventListener('input', () => this.renderSuggestions());

        this.suggestionsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('tag-suggestion')) {
                this.addTag(e.target.dataset.tag);
            }
        });

        // Listener para el botón de eliminar en cada píldora de etiqueta
        this.container.addEventListener('click', (e) => {
            const removeButton = e.target.closest('.tag-remove');
            if (removeButton) {
                e.stopPropagation();
                this.removeTag(removeButton.dataset.tag);
            }
        });
    }

    getTags() {
        return Array.from(this.activeTags);
    }

    setTags(tags = []) {
        this.activeTags = new Set(tags.map(t => t.toLowerCase()));
        this.render();
    }

    addTag(tag) {
        const normalizedTag = tag.toLowerCase().trim();
        if (normalizedTag && !this.activeTags.has(normalizedTag)) {
            this.activeTags.add(normalizedTag);
            this.input.value = '';
            this.render();
            this.renderSuggestions();
            this.input.focus();
        }
    }

    removeTag(tag) {
        if (!tag) return;
        this.activeTags.delete(tag.toLowerCase());
        this.render();
        this.renderSuggestions();
    }

    render() {
        // Limpiar píldoras existentes
        Array.from(this.container.querySelectorAll('.tag-pill')).forEach(pill => pill.remove());

        // Renderizar nuevas píldoras
        this.activeTags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'tag-pill';
            tagElement.innerHTML = `${formatTagText(tag)} <span class="tag-remove" data-tag="${tag}">&times;</span>`;
            this.container.insertBefore(tagElement, this.input);
        });
    }

    renderSuggestions() {
        this.suggestionsContainer.innerHTML = '';
        const allTags = this.allTagsProvider();
        const inputValue = this.input.value.toLowerCase();

        if (!inputValue) return; // No mostrar sugerencias si el campo está vacío

        const filteredSuggestions = Array.from(allTags).filter(tag =>
            tag.toLowerCase().includes(inputValue) && !this.activeTags.has(tag.toLowerCase())
        );

        filteredSuggestions.slice(0, 10).forEach(tag => {
            const suggestion = document.createElement('span');
            suggestion.className = 'tag-suggestion';
            suggestion.dataset.tag = tag;
            suggestion.textContent = formatTagText(tag);
            this.suggestionsContainer.appendChild(suggestion);
        });
    }
}

// ==============================================================================
// CLASE PRINCIPAL DE LA APLICACIÓN
// ==============================================================================

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
        this.loaderElement = document.getElementById('loader');

        window.appController = {
             requestDataRefresh: async () => {
                await this.loadData();
                this.renderAll();
            }
        };

        this.modalTagInput = null;
        this.bulkTagInput = null;
    }

    getAllTags() {
        const allTags = new Set();
        this.items.forEach(item => (item.etiquetas || []).forEach(tag => allTags.add(tag)));
        Object.values(this.settings.categoryTags || {}).forEach(tags => tags.forEach(tag => allTags.add(tag)));
        return allTags;
    }

    async init() {
        this.checkForBookmarkletData();
        this.setupEventListeners();
        
        this.modalTagInput = new TagInput(
            document.getElementById('itemTagsWrapper'),
            () => this.getAllTags()
        );
        this.bulkTagInput = new TagInput(
            document.getElementById('bulkTagsWrapper'),
            () => this.getAllTags()
        );

        this.setupAuthListener();
    }

    showLoader() {
        if (this.loaderElement) this.loaderElement.classList.remove('hidden');
    }

    hideLoader() {
        if (this.loaderElement) this.loaderElement.classList.add('hidden');
    }

    // --- LÓGICA DE DATOS ---

    async loadData() {
        this.showLoader();
        try {
            const data = await window.storage.loadAll();
            this.items = data.items || [];
            this.settings = data.settings || { autoSaveVoice: false, theme: 'default', lastCategory: 'todos', customCategories: [], categoryTags: {} };
            if (!this.settings.categoryTags) this.settings.categoryTags = {};
        } catch (error) {
            console.error('Error loading data:', error);
            this.items = [];
            this.settings = { autoSaveVoice: false, theme: 'default', lastCategory: 'todos', customCategories: [], categoryTags: {} };
        } finally {
            this.hideLoader();
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
        this.showLoader();
        try {
            if (window.storage.adapter.type === 'local') {
                const newItems = await window.storage.performBatchUpdate(operations, this.items);
                this.items = newItems;
                await window.storage.saveAll({ items: this.items, settings: this.settings });
            } else {
                await window.storage.performBatchUpdate(operations);
                await this.loadData();
            }
            this.selectedItems.clear();
            this.renderAll();
        } catch (error) {
            console.error("Error performing item updates:", error);
            this.showToast("Error al actualizar los datos.", "error");
            await this.loadData();
            this.renderAll();
        } finally {
            this.hideLoader();
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
        
        const finalTags = this.modalTagInput.getTags();
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
        const newTags = this.bulkTagInput.getTags();
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
        this.showLoader();
        try {
            await signInWithGoogle();
            this.showToast('Inicio de sesión exitoso', 'success');
        } catch (error) {
            this.showToast(`Error al iniciar sesión: ${error.message}`, 'error');
        } finally {
            this.hideLoader();
        }
    }

    async logout() {
        this.showLoader();
        try {
            await signOutUser();
            this.showToast('Sesión cerrada', 'info');
        } catch (error) {
            this.showToast(`Error al cerrar sesión: ${error.message}`, 'error');
        } finally {
            this.hideLoader();
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

        document.getElementById('addTaskBtn').addEventListener('click', () => this.addTaskField());
        document.getElementById('confirmCancelBtn').addEventListener('click', () => this.closeConfirmModal());
        document.getElementById('confirmOkBtn').addEventListener('click', () => this.executeConfirmAction());
        document.getElementById('bulkCategoryCancelBtn').addEventListener('click', () => this.closeBulkCategoryModal());
        document.getElementById('bulkCategoryOkBtn').addEventListener('click', () => this.handleBulkChangeCategory());
        document.getElementById('bulkTagsCancelBtn').addEventListener('click', () => this.closeBulkTagsModal());
        document.getElementById('bulkTagsOkBtn').addEventListener('click', () => this.handleBulkChangeTags());

        document.getElementById('settingsCloseBtn').addEventListener('click', () => this.closeSettingsModal());
        document.getElementById('autoSaveVoice').addEventListener('change', (e) => { this.settings.autoSaveVoice = e.target.checked; this.saveDataSettings(); });
        document.getElementById('themeSelect').addEventListener('change', (e) => { this.settings.theme = e.target.value; this.applyTheme(); this.saveDataSettings(); });
        document.getElementById('exportDataBtn').addEventListener('click', () => window.storage.exportData());
        document.getElementById('importDataBtn').addEventListener('click', () => document.getElementById('importFile').click());
        document.getElementById('importFile').addEventListener('change', (e) => this.handleImportFile(e));
        
        document.getElementById('newCategoryCloseBtn').addEventListener('click', () => this.closeNewCategoryModal());
        document.getElementById('newCategoryCancelBtn').addEventListener('click', () => this.closeNewCategoryModal());
        document.getElementById('newCategoryCreateBtn').addEventListener('click', () => this.addCustomCategory(document.getElementById('newCategoryNameInput').value));

        const itemsContainer = document.getElementById('itemsContainer');
        itemsContainer.addEventListener('click', (event) => {
            const target = event.target;
            const actionElement = target.closest('[data-action]');

            if (!actionElement) return;

            const action = actionElement.dataset.action;
            const card = actionElement.closest('.card');
            
            if (!card && action !== 'filter-by-tag') return; 

            const id = card ? card.dataset.id : null;

            if (action !== 'handle-card-click') {
                event.stopPropagation();
            }

            switch (action) {
                case 'handle-card-click':
                    if (target.closest('a, button, input[type="checkbox"], .card__tag')) return;
                    this.openModal(id);
                    break;
                case 'toggle-selection':
                    this.toggleSelection(id);
                    break;
                case 'toggle-pinned':
                    this.togglePinned(id);
                    break;
                case 'open-link':
                    break;
                case 'filter-by-tag':
                    this.filterByTag(actionElement.dataset.tag);
                    break;
                case 'open-modal':
                    this.openModal(id);
                    break;
                case 'convert-to-logro':
                    this.convertToLogro(id);
                    break;
                case 'confirm-delete':
                    this.confirmDeleteItem(id);
                    break;
                case 'toggle-task':
                    const taskId = actionElement.dataset.taskId;
                    if (id && taskId) {
                        this.toggleTask(id, taskId);
                    }
                    break;
            }
        });
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
            <div class="card ${isSelected ? 'selected' : ''}" data-id="${item.id}" data-action="handle-card-click">
                <input type="checkbox" class="card__checkbox" data-action="toggle-selection" ${isSelected ? 'checked' : ''}>
                <div class="card__header">
                    <h3 class="card__title">${this.escapeHtml(item.titulo)}</h3>
                    <button class="card__pin ${item.anclado ? 'pinned' : ''}" data-action="toggle-pinned" title="Anclar"><span class="material-symbols-outlined">push_pin</span></button>
                </div>
                <div class="card__body">
                    ${item.descripcion ? `<p class="card__description">${this.escapeHtml(item.descripcion)}</p>` : ''}
                    ${item.url ? `<div class="card__urls"><a href="${this.escapeHtml(item.url)}" target="_blank" class="card__url" data-action="open-link">${this.escapeHtml(this.truncateUrl(item.url))}</a></div>` : ''}
                    ${item.tareas && item.tareas.length > 0 ? this.createTasksContent(item) : ''}
                    ${progress}
                </div>
                ${item.etiquetas && item.etiquetas.length > 0 ? `<div class="card__tags">${item.etiquetas.map(tag => `<span class="card__tag" data-action="filter-by-tag" data-tag="${this.escapeHtml(tag)}">${formatTagText(this.escapeHtml(tag))}</span>`).join('')}</div>` : ''}
                <div class="card__footer">
                    <span class="card__date">${date} ${item.fecha_finalizacion ? ` (Completado)`: ''}</span>
                    <div class="card__actions">
                        <button class="btn btn--text" data-action="open-modal" title="Editar"><span class="material-symbols-outlined">edit</span></button>
                        ${item.categoria !== 'logros' ? `<button class="btn btn--text" data-action="convert-to-logro" title="Convertir a logro"><span class="material-symbols-outlined">emoji_events</span></button>` : ''}
                        <button class="btn btn--text" data-action="confirm-delete" title="Eliminar"><span class="material-symbols-outlined">delete</span></button>
                    </div>
                </div>
            </div>`;
    }

    filterByTag(tag) { this.filters.tag = this.filters.tag === tag ? null : tag; this.renderAll(); }
    renderItems() { const container = document.getElementById('itemsContainer'); const filteredItems = this.getFilteredItems(); container.innerHTML = filteredItems.length > 0 ? filteredItems.map(item => this.createItemCard(item)).join('') : ''; }
    getFilteredItems() { let items = this.items; if (this.currentCategory !== 'todos') { items = items.filter(item => item.categoria.toLowerCase() === this.currentCategory.toLowerCase()); } if (this.filters.search) { const term = this.filters.search; items = items.filter(item => item.titulo.toLowerCase().includes(term) || (item.descripcion && item.descripcion.toLowerCase().includes(term)) || (item.etiquetas && item.etiquetas.some(tag => tag.toLowerCase().includes(term))) || (item.url && item.url.toLowerCase().includes(term))); } if (this.filters.tag) { items = items.filter(item => item.etiquetas && item.etiquetas.some(tag => tag.toLowerCase() === this.filters.tag.toLowerCase())); } return items.sort((a, b) => (a.anclado === b.anclado) ? (new Date(b.fecha_creacion) - new Date(b.fecha_creacion)) : (a.anclado ? -1 : 1)); }
    updateSelectionUI() { const bulkActions = document.getElementById('bulkActions'); const selectAllCheckbox = document.getElementById('selectAllCheckbox'); const selectionCount = document.getElementById('selectionCount'); if (this.selectedItems.size > 0) { bulkActions.classList.remove('hidden'); selectionCount.textContent = this.selectedItems.size; } else { bulkActions.classList.add('hidden'); } const filteredItems = this.getFilteredItems(); if (filteredItems.length > 0) { const allVisibleSelected = filteredItems.every(item => this.selectedItems.has(item.id)); selectAllCheckbox.checked = allVisibleSelected; selectAllCheckbox.indeterminate = !allVisibleSelected && filteredItems.some(item => this.selectedItems.has(item.id)); } else { selectAllCheckbox.checked = false; selectAllCheckbox.indeterminate = false; } }
    updateEmptyState() { const emptyState = document.getElementById('emptyState'); const hasItems = document.getElementById('itemsContainer').children.length > 0; emptyState.classList.toggle('hidden', !hasItems); if (!hasItems) { emptyState.querySelector('.empty-state__title').textContent = `No hay elementos en "${this.formatCategoryName(this.currentCategory)}"`; } }
    
    openModal(id = null) {
        this.currentEditId = id;
        const modal = document.getElementById('itemModal');
        if (id) {
            const item = this.items.find(i => i.id === id);
            if (item) {
                document.getElementById('modalTitle').textContent = 'Editar Elemento';
                this.populateModalForm(item);
                this.modalTagInput.setTags(item.etiquetas || []);
            }
        } else {
            document.getElementById('modalTitle').textContent = 'Agregar Nuevo Elemento';
            this.clearModalForm();
            this.modalTagInput.setTags([]);
        }
        modal.classList.remove('hidden');
        document.getElementById('itemTitle').focus();
    }

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
    formatCategoryName(name) { return name.charAt(0).toUpperCase() + name.slice(1); }
    getCategoryIcon(category) { switch (category) { case 'directorio': return 'folder'; case 'ideas': return 'lightbulb'; case 'proyectos': return 'work'; case 'logros': return 'emoji_events'; case 'todos': return 'select_all'; default: return 'category'; } }
    truncateUrl(url) { const maxLength = 30; if (url.length <= maxLength) return url;
 const domain = new URL(url).hostname;
 if (domain.length <= maxLength) return domain;
 return `${domain.substring(0, maxLength - 3)}...`; }
    createProgressBar(item) { const totalTasks = item.tareas.length;
 const completedTasks = item.tareas.filter(task => task.completado).length;
 const percentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
 return `
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: ${percentage}%;"></div>
                <span class="progress-text">${completedTasks}/${totalTasks} tareas (${percentage}%)</span>
            </div>
        `; }
    createTasksContent(item) { return `
            <div class="card__tasks">
                ${item.tareas.map(task => `
                    <div class="task-item-card">
                        <input type="checkbox" class="task-checkbox-card" data-action="toggle-task" data-task-id="${task.id}" ${task.completado ? 'checked' : ''}>
                        <span class="task-title-card ${task.completado ? 'completed' : ''}">${this.escapeHtml(task.titulo)}</span>
                    </div>
                `).join('')}
            </div>
        `; }

    populateCategorySelector(selector, includeNewOption = false) { selector.innerHTML = ''; const predefinedCategories = ['directorio', 'ideas', 'proyectos', 'logros']; const allCategories = [...new Set([...predefinedCategories, ...(this.settings.customCategories || [])])]; allCategories.forEach(category => { const option = document.createElement('option'); option.value = category; option.textContent = this.formatCategoryName(category); selector.appendChild(option); }); if (includeNewOption) { const newOption = document.createElement('option'); newOption.value = '__new_category__'; newOption.textContent = 'Crear nueva categoría...'; selector.appendChild(newOption); } }
    addCustomCategory(categoryName) { const normalizedName = categoryName.trim().toLowerCase(); if (!normalizedName) { this.showToast('El nombre de la categoría no puede estar vacío.', 'error'); return; } if (this.settings.customCategories.includes(normalizedName)) { this.showToast('Esa categoría ya existe.', 'info'); return; } this.settings.customCategories.push(normalizedName); this.saveDataSettings(); this.populateCategorySelector(document.getElementById('itemCategory'), true); this.populateCategorySelector(document.getElementById('bulkCategorySelector')); this.showToast('Categoría creada.', 'success'); this.closeNewCategoryModal(); }
    openNewCategoryModal() { document.getElementById('newCategoryModal').classList.remove('hidden'); document.getElementById('newCategoryNameInput').value = ''; document.getElementById('newCategoryNameInput').focus(); }
    closeNewCategoryModal() { document.getElementById('newCategoryModal').classList.add('hidden'); }
    openBulkCategoryModal() { this.populateCategorySelector(document.getElementById('bulkCategorySelector')); document.getElementById('bulkCategoryModal').classList.remove('hidden'); }
    closeBulkCategoryModal() { document.getElementById('bulkCategoryModal').classList.add('hidden'); }
    openBulkTagsModal() { this.bulkTagInput.setTags([]); setTimeout(() => { document.getElementById('bulkTagsInput').focus(); }, 50); }
    closeBulkTagsModal() { document.getElementById('bulkTagsModal').classList.add('hidden'); }
    openSettingsModal() { document.getElementById('autoSaveVoice').checked = this.settings.autoSaveVoice; document.getElementById('themeSelect').value = this.settings.theme; this.renderCustomCategoriesInSettings(); this.renderGlobalTagsInSettings(); document.getElementById('settingsModal').classList.remove('hidden'); }
    closeSettingsModal() { document.getElementById('settingsModal').classList.add('hidden'); }
    applyTheme() { document.body.className = ''; document.body.classList.add(`theme-${this.settings.theme}`); }
    showToast(message, type = 'info') { const toastContainer = document.getElementById('toastContainer'); const toast = document.createElement('div'); toast.className = `toast toast--${type}`; toast.textContent = message; toastContainer.appendChild(toast); setTimeout(() => { toast.remove(); }, 3000); }
    toggleSelectAll(checked) { const filteredItems = this.getFilteredItems(); this.selectedItems.clear(); if (checked) { filteredItems.forEach(item => this.selectedItems.add(item.id)); } this.renderItems(); this.updateSelectionUI(); }
    toggleSelection(id) { if (this.selectedItems.has(id)) { this.selectedItems.delete(id); } else { this.selectedItems.add(id); } this.renderItems(); this.updateSelectionUI(); }

    renderTagFilters() {
        const tagFiltersContainer = document.getElementById('tagFilters');
        tagFiltersContainer.innerHTML = '';
        const allTags = new Set();
        this.getFilteredItems().forEach(item => (item.etiquetas || []).forEach(tag => allTags.add(tag)));

        Array.from(allTags).sort().forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = `tag-filter ${this.filters.tag === tag ? 'active' : ''}`;
            tagElement.textContent = formatTagText(tag);
            tagElement.addEventListener('click', () => this.filterByTag(tag));
            tagFiltersContainer.appendChild(tagElement);
        });
    }

    handleImportFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.showLoader();
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target.result;
                let importedData;

                if (file.name.endsWith('.json')) {
                    importedData = JSON.parse(content);
                } else if (file.name.endsWith('.html')) {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(content, 'text/html');
                    const bookmarks = [];
                    
                    const traverseBookmarks = (node, currentTags = []) => {
                        if (node.nodeName === 'DT') {
                            const h3 = node.querySelector('H3');
                            const link = node.querySelector('A');
                            const dl = node.querySelector('DL');

                            if (h3) {
                                const folderName = h3.textContent.trim();
                                if (dl) {
                                    Array.from(dl.children).forEach(child => {
                                        traverseBookmarks(child, [...currentTags, folderName]);
                                    });
                                }
                            } else if (link) {
                                bookmarks.push({
                                    id: window.storage.generateId(),
                                    categoria: 'directorio',
                                    titulo: link.textContent.trim(),
                                    url: link.href,
                                    fecha_creacion: new Date().toISOString(),
                                    etiquetas: [...new Set(currentTags)],
                                    tareas: [],
                                    anclado: false,
                                    fecha_finalizacion: null,
                                    meta: {}
                                });
                            }
                        } else if (node.nodeName === 'A') {
                             bookmarks.push({
                                id: window.storage.generateId(),
                                categoria: 'directorio',
                                titulo: node.textContent.trim(),
                                url: node.href,
                                fecha_creacion: new Date().toISOString(),
                                etiquetas: [...new Set(currentTags)],
                                tareas: [],
                                anclado: false,
                                fecha_finalizacion: null,
                                meta: {}
                            });
                        }
                    };

                    const rootDl = doc.querySelector('DL');
                    if (rootDl) {
                        Array.from(rootDl.children).forEach(child => traverseBookmarks(child));
                    }
                    
                    importedData = bookmarks;

                } else {
                    this.showToast('Formato de archivo no soportado.', 'error');
                    return;
                }

                if (Array.isArray(importedData)) {
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
            } finally {
                this.hideLoader();
            }
        };
        reader.readAsText(file);
    }
    renderCustomCategoriesInSettings() {
        const container = document.getElementById('customCategoriesList');
        if (!container) return;

        container.innerHTML = '';

        const customCategories = this.settings.customCategories || [];

        if (customCategories.length === 0) {
            container.innerHTML = '<p>No hay categorías personalizadas.</p>';
            return;
        }

        customCategories.forEach(category => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'custom-category-item';
            categoryDiv.innerHTML = `
                <span>${this.formatCategoryName(category)}</span>
                <button class="btn btn--icon btn--danger delete-category-btn" data-category="${category}" title="Eliminar categoría">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            `;
            container.appendChild(categoryDiv);
        });

        container.querySelectorAll('.delete-category-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const categoryToDelete = e.currentTarget.dataset.category;
                this.confirmDeleteItem('Eliminar Categoría', `¿Estás seguro de que quieres eliminar la categoría "${this.formatCategoryName(categoryToDelete)}"? Todos los elementos en esta categoría se moverán a "Directorio".`, () => this.deleteCustomCategory(categoryToDelete));
            });
        });
    }

    async deleteCustomCategory(categoryName) {
        console.log('deleteCustomCategory: Before modification, settings:', JSON.parse(JSON.stringify(this.settings)));
        this.settings.customCategories = this.settings.customCategories.filter(cat => cat !== categoryName);

        if (this.settings.categoryTags && this.settings.categoryTags[categoryName]) {
            delete this.settings.categoryTags[categoryName];
        }
        console.log('deleteCustomCategory: After modification, settings:', JSON.parse(JSON.stringify(this.settings)));

        const operations = [];
        this.items.forEach(item => {
            if (item.categoria === categoryName) {
                operations.push({ type: 'update', id: item.id, data: { categoria: 'directorio' } });
            }
        });

        if (operations.length > 0) {
            console.log('deleteCustomCategory: Calling performItemUpdates with operations:', operations);
            await this.performItemUpdates(operations);
        } else {
            console.log('deleteCustomCategory: No item operations, saving all data directly.');
            await window.storage.saveAll({ items: this.items, settings: this.settings });
            console.log('deleteCustomCategory: Data saved directly. Loading and rendering all.');
            await this.loadData();
            this.renderAll();
            console.log('deleteCustomCategory: After direct save and reload, settings:', JSON.parse(JSON.stringify(this.settings)));
        }

        this.renderNavigationTabs();
        this.populateCategorySelector(document.getElementById('itemCategory'), true);
        this.populateCategorySelector(document.getElementById('bulkCategorySelector'));
        this.renderCustomCategoriesInSettings();
        this.showToast(`Categoría "${this.formatCategoryName(categoryName)}" eliminada.`, 'success');
    }

    renderGlobalTagsInSettings() {
        const container = document.getElementById('globalTagsList');
        if (!container) return;

        container.innerHTML = '';

        const allTags = new Set();
        this.items.forEach(item => (item.etiquetas || []).forEach(tag => allTags.add(tag)));

        if (allTags.size === 0) {
            container.innerHTML = '<p>No hay etiquetas globales.</p>';
            return;
        }

        Array.from(allTags).sort().forEach(tag => {
            const tagDiv = document.createElement('div');
            tagDiv.className = 'custom-category-item';
            tagDiv.innerHTML = `
                <span>${formatTagText(tag)}</span>
                <button class="btn btn--icon btn--danger delete-tag-btn" data-tag="${tag}" title="Eliminar etiqueta">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            `;
            container.appendChild(tagDiv);
        });

        container.querySelectorAll('.delete-tag-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const tagToDelete = e.currentTarget.dataset.tag;
                this.confirmDeleteItem('Eliminar Etiqueta', `¿Estás seguro de que quieres eliminar la etiqueta "${formatTagText(tagToDelete)}"? Se eliminará de todos los elementos.`, () => this.deleteGlobalTag(tagToDelete));
            });
        });
    }

    async deleteGlobalTag(tagName) {
        console.log('deleteGlobalTag: Before modification, settings:', JSON.parse(JSON.stringify(this.settings)));
        const operations = [];
        this.items.forEach(item => {
            if (item.etiquetas && item.etiquetas.includes(tagName)) {
                const newTags = item.etiquetas.filter(tag => tag !== tagName);
                operations.push({ type: 'update', id: item.id, data: { etiquetas: newTags } });
            }
        });

        // Remove the tag from categoryTags in settings if it exists there
        for (const category in this.settings.categoryTags) {
            if (Array.isArray(this.settings.categoryTags[category])) { // Ensure it's an array before filtering
                this.settings.categoryTags[category] = this.settings.categoryTags[category].filter(tag => tag !== tagName);
            }
        }
        console.log('deleteGlobalTag: After modification, settings:', JSON.parse(JSON.stringify(this.settings)));

        if (operations.length > 0) {
            console.log('deleteGlobalTag: Calling performItemUpdates with operations:', operations);
            await this.performItemUpdates(operations);
        } else {
            console.log('deleteGlobalTag: No item operations, saving all data directly.');
            await window.storage.saveAll({ items: this.items, settings: this.settings });
            console.log('deleteGlobalTag: Data saved directly. Loading and rendering all.');
            await this.loadData();
            this.renderAll();
            console.log('deleteGlobalTag: After direct save and reload, settings:', JSON.parse(JSON.stringify(this.settings)));
        }

        this.showToast(`Etiqueta "${formatTagText(tagName)}" eliminada de todos los elementos.`, 'success');
        this.renderGlobalTagsInSettings();
    }
}
