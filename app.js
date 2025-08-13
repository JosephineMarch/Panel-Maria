/*
================================================================================
|       PANEL MARÍA - APLICACIÓN PRINCIPAL (VERSIÓN OPTIMIZADA)              |
================================================================================
*/

import { auth, onAuthStateChanged, signInWithGoogle, signOutUser } from './auth.js';
import { FirebaseAdapter } from './storage.js';

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
        this.contextMenu = null;
        this.contextMenuAction = null;
        this.longPressTimer = null;
        this.bulkActiveTags = new Set();

        window.appController = {
            openModal: (id = null) => this.openModal(id),
            togglePinned: (id) => this.togglePinned(id),
            confirmDelete: (id) => this.confirmDeleteItem(id),
            handleCardClick: (event, id) => this.handleCardClick(event, id),
            toggleSelection: (id) => this.toggleSelection(id),
            convertToLogro: (id) => this.convertToLogro(id),
            toggleTask: (itemId, taskId) => this.toggleTask(itemId, taskId),
            filterByTag: (tag) => this.filterByTag(tag)
        };
    }

    async init() {
        this.checkForBookmarkletData();
        this.setupEventListeners();
        this.setupAuthListener();
    }

    // =============================================================================
    // --- LÓGICA DE DATOS (OPTIMIZADA) ---
    // =============================================================================

    async loadData() {
        try {
            const data = await window.storage.loadAll();
            this.items = data.items || [];

            // --- Saneamiento de Datos ---
            // Repara items que puedan no tener un ID por errores pasados.
            let dataWasChanged = false;
            this.items.forEach(item => {
                if (!item.id) {
                    console.warn('Found item with missing ID. Assigning a new one:', item);
                    item.id = window.storage.generateId();
                    dataWasChanged = true;
                }
            });

            if (dataWasChanged) {
                console.log('Saving data after fixing missing IDs...');
                await this.saveData(); // Guarda los items corregidos
            }
            // --- Fin del Saneamiento ---

            this.settings = data.settings || { autoSaveVoice: false, theme: 'default', lastCategory: 'todos', customCategories: [], categoryTags: {} };
        } catch (error) {
            console.error('Error loading data:', error);
            this.items = [];
            this.settings = { autoSaveVoice: false, theme: 'default', lastCategory: 'todos', customCategories: [], categoryTags: {} };
        }
    }

    async saveData() {
        try {
            await window.storage.saveAll({ items: this.items, settings: this.settings });
        } catch (error) {
            console.error('Error saving data:', error);
            this.showToast('Error al guardar los datos', 'error');
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
        
        if (this.currentEditId) {
            // --- Lógica de Actualización (en memoria) ---
            const itemIndex = this.items.findIndex(i => i.id === this.currentEditId);
            if (itemIndex > -1) {
                this.items[itemIndex] = { ...this.items[itemIndex], ...itemData };
                this.showToast('Elemento actualizado', 'success');
            }
        } else {
            // --- Lógica de Creación (en memoria) ---
            const newItem = {
                ...itemData,
                id: window.storage.generateId(),
                fecha_creacion: new Date().toISOString(),
                fecha_finalizacion: null,
                meta: {}
            };
            this.items.push(newItem);
            this.showToast('Elemento creado', 'success');
        }
        
        await this.saveData(); // --- Guardado único al final ---
        this.closeModal();
        this.renderNavigationTabs();
        this.populateCategorySelector();
        this.switchCategory(itemData.categoria);
    }

    async deleteItem(id) {
        this.items = this.items.filter(i => i.id !== id);
        await this.saveData();
        this.renderAll();
        this.showToast('Elemento eliminado', 'success');
    }

    async togglePinned(id) {
        const item = this.items.find(item => item.id === id);
        if (item) {
            item.anclado = !item.anclado;
            await this.saveData();
            this.renderAll();
        }
    }

    async convertToLogro(id) {
        const item = this.items.find(item => item.id === id);
        if (item) {
            item.categoria = 'logros';
            item.fecha_finalizacion = new Date().toISOString();
            await this.saveData();
            this.switchCategory('logros');
            this.showToast('Elemento convertido a logro', 'success');
        }
    }

    async toggleTask(itemId, taskId) {
        const item = this.items.find(i => i.id === itemId);
        if (item) {
            const task = item.tareas.find(t => t.id === taskId);
            if (task) {
                task.completado = !task.completado;
                await this.saveData();
                this.renderItems(); // Solo re-renderiza los items, no todo
            }
        }
    }

    // --- Métodos de Acciones en Lote (Corregidos y Optimizados) ---
    async performBulkUpdate(operations) {
        if (window.storage.adapter.type === 'firebase') {
            await window.storage.performBatchUpdate(operations);
            await this.loadData(); // Recargar desde Firebase después del lote
        } else {
            // Para LocalStorage, la lógica ahora está en el adaptador
            const newItems = await window.storage.performBatchUpdate(operations, this.items);
            this.items = newItems;
            await this.saveData(); // Guardar el nuevo estado de items
        }
        this.selectedItems.clear();
        this.renderAll();
    }

    async bulkTogglePinned() {
        const firstSelectedIsPinned = this.items.find(item => this.selectedItems.has(item.id))?.anclado;
        const targetState = !firstSelectedIsPinned;
        const operations = Array.from(this.selectedItems).map(id => ({ type: 'update', id, data: { anclado: targetState } }));
        await this.performBulkUpdate(operations);
        this.showToast('Elementos anclados/desanclados', 'success');
    }

    async handleBulkChangeCategory() {
        const newCategory = document.getElementById('bulkCategorySelector').value;
        if (!newCategory) return;
        const operations = Array.from(this.selectedItems).map(id => ({ type: 'update', id, data: { categoria: newCategory } }));
        await this.performBulkUpdate(operations);
        this.closeBulkCategoryModal();
        this.showToast('Categoría cambiada', 'success');
    }

    async handleBulkChangeTags() {
        const newTags = Array.from(this.bulkActiveTags);
        const operations = Array.from(this.selectedItems).map(id => ({ type: 'update', id, data: { etiquetas: newTags } }));
        await this.performBulkUpdate(operations);
        this.closeBulkTagsModal();
        this.showToast('Etiquetas actualizadas', 'success');
    }

    async bulkDelete() {
        const operations = Array.from(this.selectedItems).map(id => ({ type: 'delete', id }));
        await this.performBulkUpdate(operations);
        this.showToast('Elementos eliminados', 'success');
    }

    // =============================================================================
    // --- RESTO DE LA LÓGICA (UI, EVENTOS, ETC.) - SIN CAMBIOS MAYORES ---
    // =============================================================================

    setupApplication() {
        this.renderNavigationTabs();
        this.populateCategorySelector(document.getElementById('itemCategory'), true);
        this.switchCategory(this.settings.lastCategory || 'todos');
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

            if (user) {
                authSection.classList.add('hidden');
                appContent.classList.remove('hidden');
                logoutBtn.classList.remove('hidden');
                addItemBtn.classList.remove('hidden');
                window.storage.setAdapter('firebase', user.uid);
            } else {
                authSection.classList.remove('hidden');
                appContent.classList.add('hidden');
                logoutBtn.classList.add('hidden');
                addItemBtn.classList.add('hidden');
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
            const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
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
            console.error('Error durante el inicio de sesión:', error);
            this.showToast(`Error al iniciar sesión: ${error.message}`, 'error');
        }
    }

    async logout() {
        try {
            await signOutUser();
            this.showToast('Sesión cerrada', 'info');
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            this.showToast(`Error al cerrar sesión: ${error.message}`, 'error');
        }
    }

    setupEventListeners() {
        document.getElementById('loginBtn').addEventListener('click', () => this.loginWithGoogle());
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
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
                const lastTag = Array.from(this.modalActiveTags).pop();
                if (lastTag) this.removeModalTag(lastTag);
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
                const lastTag = Array.from(this.bulkActiveTags).pop();
                if (lastTag) this.removeBulkTag(lastTag);
            }
        });
        bulkTagsInput.addEventListener('input', (e) => this.renderBulkTagSuggestions(e.target.value));
        document.getElementById('bulkTagSuggestions').addEventListener('click', (e) => {
            if (e.target.classList.contains('tag-suggestion')) this.addBulkTag(e.target.dataset.tag);
        });
        
        document.getElementById('settingsCloseBtn').addEventListener('click', () => this.closeSettingsModal());
        document.getElementById('autoSaveVoice').addEventListener('change', (e) => { this.settings.autoSaveVoice = e.target.checked; this.saveData(); });
        document.getElementById('themeSelect').addEventListener('change', (e) => { this.settings.theme = e.target.value; this.applyTheme(); this.saveData(); });
        document.getElementById('exportDataBtn').addEventListener('click', () => window.storage.exportData());
        document.getElementById('importDataBtn').addEventListener('click', () => document.getElementById('importFile').click());
        document.getElementById('importFile').addEventListener('change', (e) => this.handleImportFile(e));
        
        document.getElementById('newCategoryCloseBtn').addEventListener('click', () => this.closeNewCategoryModal());
        document.getElementById('newCategoryCancelBtn').addEventListener('click', () => this.closeNewCategoryModal());
        document.getElementById('newCategoryCreateBtn').addEventListener('click', () => this.addCustomCategory(document.getElementById('newCategoryNameInput').value));

        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        window.addEventListener('storage', (e) => this.handleStorageChange(e));
        document.addEventListener('click', () => this.hideContextMenu());
        document.getElementById('contextMenuDelete').addEventListener('click', () => { if (this.contextMenuAction) this.contextMenuAction(); this.hideContextMenu(); });
    }

    handleStorageChange(e) {
        if (e.key === window.storage.adapter.storageKey) {
            this.loadData().then(() => {
                this.renderAll();
                this.showToast('Datos actualizados desde otra pestaña', 'info');
            });
        }
    }

    filterByTag(tag) {
        this.filters.tag = this.filters.tag === tag ? null : tag;
        this.renderAll();
    }
    
    switchCategory(category) {
        this.currentCategory = category;
        this.settings.lastCategory = category;
        this.saveData(); // Guardar el último estado de la categoría es una operación rápida ahora
        
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
        const allCategories = [...predefinedCategories, ...(this.settings.customCategories || [])];

        // Clear existing tabs except for the 'add category' button
        navContainer.innerHTML = '';

        let tabsHtml = allCategories.map(category => `
            <button class="nav-tab" data-category="${category}">
                <span class="material-symbols-outlined">${this.getCategoryIcon(category)}</span>
                ${this.formatCategoryName(category)}
            </button>
        `).join('');
        
        tabsHtml += `<button class="nav-tab" data-category="todos"><span class="material-symbols-outlined">select_all</span>Todos</button>`;
        tabsHtml += `<button id="newCategoryNavBtn" class="btn btn--text"><span class="material-symbols-outlined">add</span> Nueva Categoría</button>`;

        navContainer.innerHTML = tabsHtml;

        navContainer.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchCategory(tab.dataset.category));
        });
        document.getElementById('newCategoryNavBtn').addEventListener('click', () => this.openNewCategoryModal());
        navContainer.querySelector(`[data-category="${this.currentCategory}"]`)?.classList.add('active');
    }

    renderTagFilters() {
        const container = document.getElementById('tagFilters');
        const tagsForCategory = (this.settings.categoryTags && this.settings.categoryTags[this.currentCategory]) || [];
        if (tagsForCategory.length === 0) {
            container.innerHTML = '';
            return;
        }
        let tagsHtml = `<span class="tag-filter-label">Etiquetas:</span>` +
            tagsForCategory.map(tag => `<span class="tag-filter ${this.filters.tag === tag ? 'active' : ''}" data-tag="${this.escapeHtml(tag)}">${this.formatTagText(this.escapeHtml(tag))}</span>`).join('');
        if (this.filters.tag) {
            tagsHtml += `<button class="btn btn--text" id="clearTagFilterBtn">&times; Limpiar</button>`;
        }
        container.innerHTML = tagsHtml;
        container.querySelectorAll('.tag-filter').forEach(el => el.addEventListener('click', (e) => this.filterByTag(e.target.dataset.tag)));
        if (this.filters.tag) {
            document.getElementById('clearTagFilterBtn').addEventListener('click', () => this.filterByTag(null));
        }
    }

    populateCategorySelector(selectorElement, includeNewOption = false) {
        const predefinedCategories = ['directorio', 'ideas', 'proyectos', 'logros'];
        const allCategories = [...predefinedCategories, ...(this.settings.customCategories || [])];
        let optionsHtml = allCategories.map(cat => `<option value="${cat}">${this.formatCategoryName(cat)}</option>`).join('');
        if (includeNewOption) {
            optionsHtml += `<option value="__new_category__">Crear nueva categoría...</option>`;
        }
        selectorElement.innerHTML = optionsHtml;
    }

    getFilteredItems() {
        let items = this.items;
        if (this.currentCategory !== 'todos') {
            items = items.filter(item => item.categoria.toLowerCase() === this.currentCategory.toLowerCase());
        }
        if (this.filters.search) {
            const term = this.filters.search;
            items = items.filter(item => 
                item.titulo.toLowerCase().includes(term) ||
                (item.descripcion && item.descripcion.toLowerCase().includes(term)) ||
                (item.etiquetas && item.etiquetas.some(tag => tag.toLowerCase().includes(term))) ||
                (item.url && item.url.toLowerCase().includes(term))
            );
        }
        if (this.filters.tag) {
            items = items.filter(item => item.etiquetas && item.etiquetas.some(tag => tag.toLowerCase() === this.filters.tag.toLowerCase()));
        }
        return items.sort((a, b) => (a.anclado !== b.anclado) ? (a.anclado ? -1 : 1) : (new Date(b.fecha_creacion) - new Date(a.fecha_creacion)));
    }

    renderItems() {
        const container = document.getElementById('itemsContainer');
        const filteredItems = this.getFilteredItems();
        if (filteredItems.length === 0) {
            container.innerHTML = '';
        } else {
            container.innerHTML = filteredItems.map(item => this.createItemCard(item)).join('');
        }
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

    createTasksContent(item) {
        const completed = item.tareas.filter(t => t.completado).length;
        return `<div class="card__tasks"><span>Progreso: ${completed}/${item.tareas.length} tareas</span></div>`;
    }

    createProgressBar(item) {
        const progress = (item.tareas.filter(t => t.completado).length / item.tareas.length) * 100;
        return `<div class="progress-bar"><div class="progress-bar__fill" style="width: ${progress}%;"></div></div>`;
    }

    updateSelectionUI() {
        const bulkActions = document.getElementById('bulkActions');
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        const selectionCount = document.getElementById('selectionCount');
        if (this.selectedItems.size > 0) {
            bulkActions.classList.remove('hidden');
            selectionCount.textContent = this.selectedItems.size;
        } else {
            bulkActions.classList.add('hidden');
        }
        const filteredItems = this.getFilteredItems();
        if (filteredItems.length > 0) {
            const allVisibleSelected = filteredItems.every(item => this.selectedItems.has(item.id));
            selectAllCheckbox.checked = allVisibleSelected;
            selectAllCheckbox.indeterminate = !allVisibleSelected && filteredItems.some(item => this.selectedItems.has(item.id));
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        }
    }

    updateEmptyState() {
        const emptyState = document.getElementById('emptyState');
        const hasItems = document.getElementById('itemsContainer').children.length > 0;
        emptyState.classList.toggle('hidden', hasItems);
        if (!hasItems) {
            emptyState.querySelector('.empty-state__title').textContent = `No hay elementos en "${this.formatCategoryName(this.currentCategory)}"`;
        }
    }

    addModalTag(tag) {
        const cleaned = tag.trim().toLowerCase();
        if (cleaned) this.modalActiveTags.add(cleaned);
        this.renderModalTags();
        const input = document.getElementById('itemTagsInput');
        input.value = '';
        input.focus();
        this.renderTagSuggestions('');
    }

    removeModalTag(tag) {
        this.modalActiveTags.delete(tag);
        this.renderModalTags();
    }

    renderModalTags() {
        const wrapper = document.getElementById('itemTagsWrapper');
        const input = document.getElementById('itemTagsInput');
        wrapper.querySelectorAll('.tag-pill').forEach(p => p.remove());
        this.modalActiveTags.forEach(tag => {
            const pill = document.createElement('span');
            pill.className = 'tag-pill';
            pill.innerHTML = `${this.escapeHtml(this.formatTagText(tag))}<span class="tag-pill__remove" data-tag="${this.escapeHtml(tag)}">&times;</span>`;
            pill.querySelector('.tag-pill__remove').addEventListener('click', (e) => this.removeModalTag(e.target.dataset.tag));
            wrapper.insertBefore(pill, input);
        });
    }

    renderTagSuggestions(filterText = '') {
        const container = document.getElementById('tagSuggestions');
        const category = document.getElementById('itemCategory').value;
        const tagsForCategory = (this.settings.categoryTags && this.settings.categoryTags[category]) || [];
        const lowerFilter = filterText.trim().toLowerCase();
        if (!lowerFilter) {
            container.innerHTML = '';
            return;
        }
        const filtered = tagsForCategory.filter(t => t.toLowerCase().includes(lowerFilter) && !this.modalActiveTags.has(t));
        container.innerHTML = filtered.slice(0, 10).map(t => `<span class="tag-suggestion" data-tag="${this.escapeHtml(t)}">${this.escapeHtml(this.formatTagText(t))}</span>`).join('');
    }

    addBulkTag(tag) {
        const cleaned = tag.trim().toLowerCase();
        if (cleaned) this.bulkActiveTags.add(cleaned);
        this.renderBulkTags();
        const input = document.getElementById('bulkTagsInput');
        input.value = '';
        input.focus();
        this.renderBulkTagSuggestions('');
    }

    removeBulkTag(tag) {
        this.bulkActiveTags.delete(tag);
        this.renderBulkTags();
    }

    renderBulkTags() {
        const wrapper = document.getElementById('bulkTagsWrapper');
        const input = document.getElementById('bulkTagsInput');
        wrapper.querySelectorAll('.tag-pill').forEach(p => p.remove());
        this.bulkActiveTags.forEach(tag => {
            const pill = document.createElement('span');
            pill.className = 'tag-pill';
            pill.innerHTML = `${this.escapeHtml(this.formatTagText(tag))}<span class="tag-pill__remove" data-tag="${this.escapeHtml(tag)}">&times;</span>`;
            pill.querySelector('.tag-pill__remove').addEventListener('click', (e) => this.removeBulkTag(e.target.dataset.tag));
            wrapper.insertBefore(pill, input);
        });
    }

    renderBulkTagSuggestions(filterText = '') {
        const container = document.getElementById('bulkTagSuggestions');
        const allTags = [...new Set(this.items.flatMap(i => i.etiquetas || []))];
        const lowerFilter = filterText.trim().toLowerCase();
        if (!lowerFilter) {
            container.innerHTML = '';
            return;
        }
        const filtered = allTags.filter(t => t.toLowerCase().includes(lowerFilter) && !this.bulkActiveTags.has(t));
        container.innerHTML = filtered.slice(0, 10).map(t => `<span class="tag-suggestion" data-tag="${this.escapeHtml(t)}">${this.escapeHtml(this.formatTagText(t))}</span>`).join('');
    }

    showContextMenu(x, y, action) {
        this.contextMenu = document.getElementById('contextMenu');
        this.contextMenu.style.top = `${y}px`;
        this.contextMenu.style.left = `${x}px`;
        this.contextMenu.classList.remove('hidden');
        this.contextMenuAction = action;
    }

    hideContextMenu() {
        if (this.contextMenu) this.contextMenu.classList.add('hidden');
    }
    
    openModal(id = null) {
        this.currentEditId = id;
        const modal = document.getElementById('itemModal');
        const title = document.getElementById('modalTitle');
        this.modalActiveTags.clear();
        if (id) {
            const item = this.items.find(i => i.id === id);
            if (item) {
                title.textContent = 'Editar Elemento';
                this.populateModalForm(item);
                (item.etiquetas || []).forEach(tag => this.modalActiveTags.add(tag));
            }
        } else {
            title.textContent = 'Agregar Nuevo Elemento';
            this.clearModalForm();
        }
        this.renderModalTags();
        this.renderTagSuggestions('');
        modal.classList.remove('hidden');
        document.getElementById('itemTitle').focus();
    }
    
    closeModal() {
        document.getElementById('itemModal').classList.add('hidden');
    }
    
    populateModalForm(item) {
        document.getElementById('itemTitle').value = item?.titulo || '';
        document.getElementById('itemDescription').value = item?.descripcion || '';
        document.getElementById('itemUrl').value = item?.url || '';
        document.getElementById('itemPinned').checked = item?.anclado || false;
        const categorySelector = document.getElementById('itemCategory');
        categorySelector.value = item?.categoria || (this.currentCategory === 'todos' ? 'directorio' : this.currentCategory);
        this.handleCategoryChange({ target: categorySelector });
        const tasksList = document.getElementById('tasksList');
        tasksList.innerHTML = '';
        if (item?.tareas?.length) {
            item.tareas.forEach(task => this.addTaskField(task));
        } else {
            this.addTaskField();
        }
    }
    
    clearModalForm() {
        document.getElementById('itemForm').reset();
        document.getElementById('tasksList').innerHTML = '';
        this.addTaskField();
        document.getElementById('newCategoryInputGroup').style.display = 'none';
        document.getElementById('itemTagsInput').value = '';
    }

    handleCategoryChange(event) {
        document.getElementById('newCategoryInputGroup').style.display = event.target.value === '__new_category__' ? 'block' : 'none';
    }
    
    addTaskField(task = null) {
        const list = document.getElementById('tasksList');
        const item = document.createElement('div');
        item.className = 'task-item';
        item.innerHTML = `<input type="checkbox" class="checkbox-field task-checkbox" ${task?.completado ? 'checked' : ''}><input type="text" class="input-field task-input" value="${task?.titulo || ''}" placeholder="Nueva tarea"><button type="button" class="btn btn--icon remove-task"><span class="material-symbols-outlined">remove</span></button>`;
        item.querySelector('.remove-task').addEventListener('click', () => { if (list.children.length > 1) item.remove(); else { item.querySelector('input[type=text]').value = ''; item.querySelector('input[type=checkbox]').checked = false; } });
        list.appendChild(item);
    }
    
    confirmBulkDelete() {
        this.showConfirmModal('Eliminar Elementos', `¿Estás seguro de que quieres eliminar ${this.selectedItems.size} elementos?`, () => this.bulkDelete());
    }

    confirmDeleteItem(id) {
        this.showConfirmModal('Eliminar Elemento', '¿Estás seguro de que quieres eliminar este elemento?', () => this.deleteItem(id));
    }
    
    showConfirmModal(title, message, onConfirm) {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        this.confirmAction = onConfirm;
        document.getElementById('confirmModal').classList.remove('hidden');
    }
    
    closeConfirmModal() {
        document.getElementById('confirmModal').classList.add('hidden');
    }
    
    executeConfirmAction() {
        if (this.confirmAction) this.confirmAction();
        this.closeConfirmModal();
    }
    
    openBulkCategoryModal() {
        const selector = document.getElementById('bulkCategorySelector');
        this.populateCategorySelector(selector);
        selector.value = '';
        document.getElementById('bulkCategoryModal').classList.remove('hidden');
    }
    closeBulkCategoryModal() { document.getElementById('bulkCategoryModal').classList.add('hidden'); }
    openBulkTagsModal() { document.getElementById('bulkTagsModal').classList.remove('hidden'); }
    closeBulkTagsModal() { document.getElementById('bulkTagsModal').classList.add('hidden'); }
    openSettingsModal() { document.getElementById('settingsModal').classList.remove('hidden'); }
    closeSettingsModal() { document.getElementById('settingsModal').classList.add('hidden'); }
    openNewCategoryModal() { document.getElementById('newCategoryModal').classList.remove('hidden'); }
    closeNewCategoryModal() { document.getElementById('newCategoryModal').classList.add('hidden'); }

    async addCustomCategory(name) {
        const newCategory = name.trim().toLowerCase();
        if (newCategory && !(this.settings.customCategories || []).includes(newCategory)) {
            this.settings.customCategories.push(newCategory);
            await this.saveData();
            this.renderNavigationTabs();
            this.populateCategorySelector(document.getElementById('itemCategory'), true);
            this.populateCategorySelector(document.getElementById('bulkCategorySelector'));
            this.closeNewCategoryModal();
        }
    }

    escapeHtml(text) {
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    truncateUrl(url, len = 50) { return url.length > len ? url.substring(0, len - 3) + '...' : url; }
    applyTheme() { document.documentElement.setAttribute('data-theme', this.settings.theme || 'default'); }
    showToast(message, type = 'success') { const el = document.createElement('div'); el.className = `toast ${type}`; el.textContent = message; document.getElementById('toastContainer').appendChild(el); setTimeout(() => el.remove(), 5000); }
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
        tagsInput.value = '';
    }

    addModalTag(tag) {
        const normalizedTag = tag.toLowerCase();
        if (!this.modalActiveTags.has(normalizedTag)) {
            this.modalActiveTags.add(normalizedTag);
            this.renderModalTags();
            this.renderTagSuggestions('');
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
        document.getElementById('bulkTagsInput').focus();
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
        toast.className = `toast toast--${type}`;n        toast.textContent = message;
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
            }n        };
        reader.readAsText(file);
    }
} // Closing brace for PanelMariaApp classperCase() + name.slice(1).toLowerCase(); }
    formatTagText(text) { return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase(); }
    getCategoryIcon(cat) { const icons = {'directorio':'bookmarks','ideas':'lightbulb','proyectos':'assignment','logros':'emoji_events'}; return icons[cat] || 'label'; }
    
    handleKeyboardShortcuts(e) { if (e.key === 'Escape') { this.closeModal(); this.closeConfirmModal(); } }
    async handleImportFile(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const result = await window.storage.importData(file);
            await this.loadData();
            this.renderAll();
            this.showToast(`${result.importedCount} elementos importados`, 'success');
        } catch (error) {
            this.showToast(`Error al importar: ${error.message}`, 'error');
        } finally {
            e.target.value = '';
        }
    }
    handleCardClick(e, id) { if (!e.target.closest('button, input, a, .card__tag')) this.openModal(id); }
    toggleSelectAll(checked) {
        const filteredIds = this.getFilteredItems().map(item => item.id);
        if (checked) filteredIds.forEach(id => this.selectedItems.add(id));
        else filteredIds.forEach(id => this.selectedItems.delete(id));
        this.renderItems();
        this.updateSelectionUI();
    }
    toggleSelection(id) {
        if (this.selectedItems.has(id)) this.selectedItems.delete(id);
        else this.selectedItems.add(id);
        this.renderItems();
        this.updateSelectionUI();
    }
}
