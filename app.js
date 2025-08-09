/*
================================================================================
|       PANEL MARÍA - APLICACIÓN PRINCIPAL (REFACTORIZADO)                      |
================================================================================
*/

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar la aplicación
    const app = new PanelMariaApp();
    app.init();
});

class PanelMariaApp {
    constructor() {
        this.currentCategory = 'todos'; // Categoría por defecto
        this.items = [];
        this.selectedItems = new Set();
        this.filters = { search: '' };
        this.settings = {};
        this.currentEditId = null;
        this.currentEditId = null;
        
        // Exponer métodos globales para eventos HTML
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
        await this.loadData();
        this.renderNavigationTabs(); // Render navigation tabs dynamically
        this.populateCategorySelector(); // Populate category selector dynamically
        this.setupEventListeners();
        this.switchCategory(this.settings.lastCategory || 'todos'); // Cargar la última categoría visitada
        this.applyTheme();
    }
    
    async loadData() {
        try {
            const data = await storage.loadAll();
            this.items = data.items || [];
            this.settings = data.settings || { autoSaveVoice: false, theme: 'default', lastCategory: 'todos', customCategories: [], allTags: [] };
            // voiceManager.setAutoSave(this.settings.autoSaveVoice || false);
        } catch (error) {
            console.error('Error loading data:', error);
            this.items = [];
            this.settings = { autoSaveVoice: false, theme: 'default', lastCategory: 'todos' };
        }
    }
    
    async saveData() {
        try {
            await storage.saveAll({ items: this.items, settings: this.settings });
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }
    
    setupEventListeners() {
        // Botones principales
        document.getElementById('addItemBtn').addEventListener('click', () => this.openModal());
        // document.getElementById('voiceBtn').addEventListener('click', () => voiceManager.startListening());
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettingsModal());
        document.getElementById('emptyStateAddBtn').addEventListener('click', () => this.openModal());
        setTimeout(() => {
            document.getElementById('newCategoryNavBtn').addEventListener('click', () => this.openNewCategoryInput());
        }, 0);
        
        // Búsqueda
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filters.search = e.target.value.toLowerCase();
            this.renderAll();
        });
        
        // Selección múltiple
        document.getElementById('selectAllCheckbox').addEventListener('change', (e) => {
            this.toggleSelectAll(e.target.checked);
        });
        
        // Acciones en lote
        document.getElementById('bulkChangeCategoryBtn').addEventListener('click', () => this.openBulkCategoryModal());
        document.getElementById('bulkChangeTagsBtn').addEventListener('click', () => this.openBulkTagsModal());
        document.getElementById('bulkPinBtn').addEventListener('click', () => this.bulkTogglePinned());
        document.getElementById('bulkDeleteBtn').addEventListener('click', () => this.confirmBulkDelete());
        
        // Modal de elemento
        document.getElementById('closeModalBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('itemForm').addEventListener('submit', (e) => this.handleFormSubmit(e));
        document.getElementById('itemCategory').addEventListener('change', (e) => this.handleCategoryChange(e));
        document.getElementById('itemTags').addEventListener('change', (e) => this.handleTagChange(e));
        
        // Tareas dinámicas
        document.getElementById('addTaskBtn').addEventListener('click', () => this.addTaskField());
        
        // Modales de confirmación
        document.getElementById('confirmCancelBtn').addEventListener('click', () => this.closeConfirmModal());
        document.getElementById('confirmOkBtn').addEventListener('click', () => this.executeConfirmAction());
        
        // Modal de categoría en lote
        document.getElementById('bulkCategoryCancelBtn').addEventListener('click', () => this.closeBulkCategoryModal());
        document.getElementById('bulkCategoryOkBtn').addEventListener('click', () => this.handleBulkChangeCategory());
        
        // Modal de etiquetas en lote
        document.getElementById('bulkTagsCancelBtn').addEventListener('click', () => this.closeBulkTagsModal());
        document.getElementById('bulkTagsOkBtn').addEventListener('click', () => this.handleBulkChangeTags());
        
        // Modal de configuración
        document.getElementById('settingsCloseBtn').addEventListener('click', () => this.closeSettingsModal());
        document.getElementById('autoSaveVoice').addEventListener('change', (e) => {
            this.settings.autoSaveVoice = e.target.checked;
            // voiceManager.setAutoSave(e.target.checked);
            this.saveData();
        });
        document.getElementById('themeSelect').addEventListener('change', (e) => {
            this.settings.theme = e.target.value;
            this.applyTheme();
            this.saveData();
        });

        // Custom Categories Management
        document.getElementById('addCustomCategoryBtn').addEventListener('click', () => this.addCustomCategory());
        document.getElementById('customCategoriesList').addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-tag')) {
                this.removeCustomCategory(e.target.dataset.category);
            }
        });

        document.getElementById('exportDataBtn').addEventListener('click', () => storage.exportData());
        document.getElementById('importDataBtn').addEventListener('click', () => document.getElementById('importFile').click());
        document.getElementById('importFile').addEventListener('change', (e) => this.handleImportFile(e));
        
        // Atajos de teclado
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));

        // Sincronización entre pestañas
        window.addEventListener('storage', (e) => this.handleStorageChange(e));
    }

    handleStorageChange(e) {
        if (e.key === storage.adapter.storageKey && e.newValue !== e.oldValue) {
            // Data changed in another tab, reload and re-render
            this.loadData().then(() => {
                this.renderAll();
                this.showToast('Datos actualizados desde otra pestaña', 'info');
            });
        }
    }

    filterByTag(tag) {
        this.filters.tag = tag;
        this.renderAll();
        this.showToast(`Filtrando por etiqueta: ${tag}`, 'info');
    }
    
    switchCategory(category) {
        this.currentCategory = category;
        this.settings.lastCategory = category;
        this.saveData();
        
        // Actualizar navegación
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === category);
        });
        
        this.selectedItems.clear();
        this.renderAll();
    }
    
    renderAll() {
        this.renderItems();
        this.updateSelectionUI();
        this.updateEmptyState();
    }

    renderNavigationTabs() {
        const navTabsContainer = document.querySelector('.nav-tabs__inner');
        const predefinedCategories = ['directorio', 'ideas', 'proyectos', 'logros'];
        const allCategories = [...predefinedCategories, ...(this.settings.customCategories || [])];

        let tabsHtml = allCategories.map(category => `
            <button class="nav-tab" data-category="${category}">
                <span class="material-symbols-outlined">${this.getCategoryIcon(category)}</span>
                ${this.formatCategoryName(category)}
            </button>
        `).join('');

        // Add 'Todos' tab
        tabsHtml += `
            <button class="nav-tab" data-category="todos">
                <span class="material-symbols-outlined">select_all</span>
                Todos
            </button>
        `;

        navTabsContainer.innerHTML = tabsHtml; // Set innerHTML once

        // Re-attach event listeners for dynamically created tabs
        navTabsContainer.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchCategory(tab.dataset.category);
            });
        });
        // Set active tab
        navTabsContainer.querySelector(`[data-category="${this.currentCategory}"]`)?.classList.add('active');
    }

    populateCategorySelector() {
        const selector = document.getElementById('itemCategory');
        const predefinedCategories = ['directorio', 'ideas', 'proyectos', 'logros'];
        const allCategories = [...predefinedCategories, ...(this.settings.customCategories || [])];

        selector.innerHTML = allCategories.map(category => `
            <option value="${category}">${this.formatCategoryName(category)}</option>
        `).join('');

        selector.innerHTML += `<option value="__new_category__">Crear nueva categoría...</option>`;

        // Set selected category
        selector.value = this.currentCategory === 'todos' ? 'directorio' : this.currentCategory;
    }

    getCategoryIcon(category) {
        switch (category) {
            case 'directorio': return 'bookmarks';
            case 'ideas': return 'lightbulb';
            case 'proyectos': return 'assignment';
            case 'logros': return 'emoji_events';
            default: return 'category'; // Default icon for custom categories
        }
    }

    formatCategoryName(category) {
        return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
    }
    
    renderItems() {
        const container = document.getElementById('itemsContainer');
        if (!container) return;
        
        const filteredItems = this.getFilteredItems();
        
        container.innerHTML = filteredItems.map(item => this.createItemCard(item)).join('');
    }
    
    getFilteredItems() {
        let items = [...this.items];
        
        // Filtrar por categoría
        if (this.currentCategory !== 'todos') {
            items = items.filter(item => item.categoria.toLowerCase() === this.currentCategory.toLowerCase());
        }

        // Aplicar filtro de búsqueda
        if (this.filters.search) {
            const searchTerm = this.filters.search;
            items = items.filter(item => 
                item.titulo.toLowerCase().includes(searchTerm) ||
                (item.descripcion && item.descripcion.toLowerCase().includes(searchTerm)) ||
                (item.etiquetas && item.etiquetas.some(tag => tag.toLowerCase().includes(searchTerm))) ||
                (item.url && item.url.toLowerCase().includes(searchTerm))
            );
        }

        // Aplicar filtro por etiqueta
        if (this.filters.tag) {
            const tagFilter = this.filters.tag.toLowerCase();
            items = items.filter(item => item.etiquetas && item.etiquetas.some(tag => tag.toLowerCase() === tagFilter));
        }
        
        // Ordenar: anclados primero, luego por fecha
        items.sort((a, b) => {
            if (a.anclado && !b.anclado) return -1;
            if (!a.anclado && b.anclado) return 1;
            return new Date(b.fecha_creacion) - new Date(a.fecha_creacion);
        });
        
        return items;
    }
    
    createItemCard(item) {
        const isSelected = this.selectedItems.has(item.id);
        const date = new Date(item.fecha_creacion).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
        
        return `
            <div class="card ${isSelected ? 'selected' : ''}" data-id="${item.id}" onclick="appController.handleCardClick(event, '${item.id}')">
                <input type="checkbox" class="card__checkbox" ${isSelected ? 'checked' : ''} onchange="appController.toggleSelection('${item.id}')">
                ${item.etiquetas && item.etiquetas.length > 0 ? `
                    <div class="card__tags card__tags--top">
                        ${item.etiquetas.map(tag => `<span class="card__tag" onclick="event.stopPropagation(); appController.filterByTag('${this.escapeHtml(tag)}')">${this.formatTagText(this.escapeHtml(tag))}</span>`).join('')}
                    </div>
                ` : ''}
                
                <div class="card__header">
                    <h3 class="card__title">${this.escapeHtml(item.titulo)}</h3>
                    <button class="card__pin ${item.anclado ? 'pinned' : ''}" onclick="event.stopPropagation(); appController.togglePinned('${item.id}')" title="Anclar">
                        <span class="material-symbols-outlined">push_pin</span>
                    </button>
                </div>
                
                <div class="card__body">
                    ${item.descripcion ? `<p class="card__description">${this.escapeHtml(item.descripcion)}</p>` : ''}
                    ${item.url ? `<div class="card__urls"><a href="${item.url}" target="_blank" class="card__url">${this.escapeHtml(this.truncateUrl(item.url))}</a></div>` : ''}
                    ${item.tareas && item.tareas.length > 0 ? this.createTasksContent(item) : ''}
                </div>
                
                <div class="card__footer">
                    <span class="card__date">${date} ${item.fecha_finalizacion ? ` (Completado)`: ''}</span>
                    <div class="card__actions">
                        ${this.createCardActions(item)}
                    </div>
                </div>
            </div>
        `;
    }

    createTasksContent(item) {
        const completedTasks = item.tareas.filter(task => task.completado).length;
        const totalTasks = item.tareas.length;
        
        return `
            <div class="card__tasks">
                <div class="card__task">
                    <span>Progreso: ${completedTasks}/${totalTasks} tareas</span>
                </div>
                ${item.tareas.slice(0, 3).map(task => `
                    <div class="card__task ${task.completado ? 'completed' : ''}" onclick="event.stopPropagation();">
                        <input type="checkbox" class="checkbox-field task-checkbox" ${task.completado ? 'checked' : ''} onchange="appController.toggleTask('${item.id}', '${task.id}')">
                        <span>${this.escapeHtml(task.titulo)}</span>
                    </div>
                `).join('')}
                ${item.tareas.length > 3 ? `<div class="card__task">... y ${item.tareas.length - 3} más</div>` : ''}
            </div>
        `;
    }
    
    createCardActions(item) {
        const actions = [];
        
        actions.push(`<button class="btn btn--text" onclick="event.stopPropagation(); appController.openModal('${item.id}')" title="Editar"><span class="material-symbols-outlined">edit</span></button>`);
        
        if (item.categoria !== 'logro') {
            actions.push(`<button class="btn btn--text" onclick="event.stopPropagation(); appController.convertToLogro('${item.id}')" title="Convertir a logro"><span class="material-symbols-outlined">emoji_events</span></button>`);
        }
        
        actions.push(`<button class="btn btn--text" onclick="event.stopPropagation(); appController.confirmDelete('${item.id}')" title="Eliminar"><span class="material-symbols-outlined">delete</span></button>`);
        
        return actions.join('');
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
        const selectedFilteredItems = filteredItems.filter(item => this.selectedItems.has(item.id));
        
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = selectedFilteredItems.length === filteredItems.length && filteredItems.length > 0;
            selectAllCheckbox.indeterminate = selectedFilteredItems.length > 0 && selectedFilteredItems.length < filteredItems.length;
        }
    }
    
    updateEmptyState() {
        const emptyState = document.getElementById('emptyState');
        const itemsContainer = document.getElementById('itemsContainer');
        if (!emptyState || !itemsContainer) return;
        
        const hasItems = itemsContainer.children.length > 0;
        
        emptyState.classList.toggle('hidden', hasItems);
        
        if (!hasItems) {
            const categoryNames = { 'todos': 'elementos', 'directorio': 'recursos', 'ideas': 'ideas', 'proyectos': 'proyectos', 'logros': 'logros' };
            emptyState.querySelector('.empty-state__title').textContent = `No hay ${categoryNames[this.currentCategory]}`;
        }
    }
    
    // Gestión de modales
    openModal(id = null) {
        this.currentEditId = id;
        const modal = document.getElementById('itemModal');
        const modalTitle = document.getElementById('modalTitle');
        
        if (id) {
            const item = this.items.find(item => item.id === id);
            if (item) {
                this.populateModalForm(item);
                modalTitle.textContent = 'Editar Elemento';
            }
        } else {
            this.clearModalForm();
            modalTitle.textContent = 'Agregar Nuevo Elemento';
        }
        
        modal.classList.remove('hidden');
        document.getElementById('itemTitle').focus();
    }
    
    closeModal() {
        document.getElementById('itemModal').classList.add('hidden');
        this.currentEditId = null;
    }
    
    populateModalForm(item) {
        document.getElementById('itemCategory').value = item.categoria;
        document.getElementById('itemTitle').value = item.titulo;
        document.getElementById('itemDescription').value = item.descripcion || '';
        document.getElementById('itemUrl').value = item.url || '';
        
        // Populate tags multi-select
        const tagsSelector = document.getElementById('itemTags');
        const allExistingTags = [...new Set([...this.settings.allTags, ...(item.etiquetas || [])])]; // Combine global tags with item's tags
        tagsSelector.innerHTML = allExistingTags.map(tag => `
            <option value="${tag}">${this.formatTagText(tag)}</option>
        `).join('');

        tagsSelector.innerHTML += `<option value="__new_tag__">Crear nueva etiqueta...</option>`;

        // Select existing tags
        Array.from(tagsSelector.options).forEach(option => {
            option.selected = (item.etiquetas || []).includes(option.value);
        });

        const tasksList = document.getElementById('tasksList');
        tasksList.innerHTML = '';
        if (item.tareas && item.tareas.length > 0) {
            item.tareas.forEach(task => this.addTaskField(task));
        } else {
            this.addTaskField();
        }
        // Trigger change to show/hide new category input
        this.handleCategoryChange({ target: document.getElementById('itemCategory') });
    }
    
    clearModalForm() {
        document.getElementById('itemForm').reset();
        document.getElementById('itemCategory').value = this.currentCategory === 'todos' ? 'directorio' : this.currentCategory;
        document.getElementById('tasksList').innerHTML = '';
        this.addTaskField();
        // Clear tags multi-select
        const tagsSelector = document.getElementById('itemTags');
        Array.from(tagsSelector.options).forEach(option => option.selected = false);
        // Hide new category input on clear
        document.getElementById('newCategoryInputGroup').style.display = 'none';
    }

    handleCategoryChange(event) {
        const newCategoryInputGroup = document.getElementById('newCategoryInputGroup');
        if (event.target.value === '__new_category__') {
            newCategoryInputGroup.style.display = 'block';
            document.getElementById('newItemCategory').focus();
        } else {
            newCategoryInputGroup.style.display = 'none';
        }
    }
    
    addTagToItemModal() {
        const input = document.getElementById('newItemTagInput');
        const newTag = input.value.trim();
        if (newTag) {
            const currentItem = this.items.find(item => item.id === this.currentEditId);
            const tags = currentItem ? [...currentItem.etiquetas] : [];
            if (!tags.includes(newTag)) {
                tags.push(newTag);
                if (currentItem) {
                    currentItem.etiquetas = tags;
                } else {
                    // For new items, store in a temporary array
                    this.tempNewItemTags = tags;
                }
                this.renderItemTagsInModal(tags);
                input.value = '';
            } else {
                this.showToast(`La etiqueta '${newTag}' ya existe.`, 'error');
            }
        }
    }

    toggleTagInItemModal(tag) {
        const currentItem = this.items.find(item => item.id === this.currentEditId);
        let tags = currentItem ? [...currentItem.etiquetas] : (this.tempNewItemTags || []);

        if (tags.includes(tag)) {
            tags = tags.filter(t => t !== tag);
        } else {
            tags.push(tag);
        }

        if (currentItem) {
            currentItem.etiquetas = tags;
        } else {
            this.tempNewItemTags = tags;
        }
        this.renderItemTagsInModal(tags);
    }

    renderItemTagsInModal(selectedTags) {
        const container = document.getElementById('itemTagsContainer');
        const allTags = [...new Set([...this.getAllExistingTags(), ...selectedTags])];

        container.innerHTML = allTags.map(tag => `
            <span class="card__tag ${selectedTags.includes(tag) ? 'selected' : ''}" data-tag="${this.escapeHtml(tag)}">
                ${this.formatTagText(this.escapeHtml(tag))}
            </span>
        `).join('');
    }

    getAllExistingTags() {
        const tags = new Set();
        this.items.forEach(item => {
            item.etiquetas.forEach(tag => tags.add(tag));
        });
        return Array.from(tags);
    }
    
    addTaskField(task = null) {
        const tasksList = document.getElementById('tasksList');
        const taskItem = document.createElement('div');
        taskItem.className = 'task-item';
        taskItem.innerHTML = `
            <input type="checkbox" class="checkbox-field task-checkbox" ${task?.completado ? 'checked' : ''}>
            <input type="text" class="input-field task-input" value="${task?.titulo || ''}" placeholder="Nueva tarea">
            <button type="button" class="btn btn--icon remove-task"><span class="material-symbols-outlined">remove</span></button>
        `;
        
        taskItem.querySelector('.remove-task').addEventListener('click', () => {
            if (tasksList.children.length > 1) {
                taskItem.remove();
            } else {
                taskItem.querySelector('.task-input').value = '';
                taskItem.querySelector('.task-checkbox').checked = false;
            }
        });
        
        tasksList.appendChild(taskItem);
    }
    
    async handleFormSubmit(e) {
        e.preventDefault();
        
        const selectedCategory = document.getElementById('itemCategory').value;
        let finalCategory = selectedCategory;

        if (selectedCategory === '__new_category__') {
            const newCustomCategory = document.getElementById('newItemCategory').value.trim();
            if (!newCustomCategory) {
                this.showToast('El nombre de la nueva categoría es obligatorio.', 'error');
                return;
            }
            finalCategory = newCustomCategory;
            if (!this.settings.customCategories.includes(newCustomCategory)) {
                this.settings.customCategories.push(newCustomCategory);
                await this.saveData(); // Save settings immediately
                this.renderNavigationTabs();
                this.populateCategorySelector();
            }
        }

        const itemData = {
            categoria: finalCategory,
            titulo: document.getElementById('itemTitle').value.trim(),
            descripcion: document.getElementById('itemDescription').value.trim(),
            url: document.getElementById('itemUrl').value.trim(),
            etiquetas: Array.from(document.getElementById('itemTags').selectedOptions).map(option => option.value), // Get tags from multi-select
            tareas: Array.from(document.querySelectorAll('#tasksList .task-item')).map(item => ({
                id: this.generateId(),
                titulo: item.querySelector('.task-input').value.trim(),
                completado: item.querySelector('.task-checkbox').checked
            })).filter(t => t.titulo)
        };

        if (!itemData.titulo || !itemData.categoria) {
            this.showToast('El título y la categoría son obligatorios.', 'error');
            return;
        }
        
        try {
            if (this.currentEditId) {
                const updatedItem = await storage.updateItem(this.currentEditId, itemData);
                this.items = this.items.map(i => i.id === this.currentEditId ? updatedItem : i);
                this.showToast('Elemento actualizado', 'success');
            } else {
                const newItem = await storage.addItem(itemData);
                this.items.push(newItem);
                this.showToast('Elemento creado', 'success');
            }
            
            this.closeModal();
            this.switchCategory(itemData.categoria); // Switch to the item's category after saving
        } catch (error) {
            console.error('Error saving item:', error);
            this.showToast('Error al guardar el elemento', 'error');
        }
    }
    
    // Acciones
    async togglePinned(id) {
        const item = this.items.find(item => item.id === id);
        if (item) {
            const updatedItem = await storage.updateItem(id, { anclado: !item.anclado });
            item.anclado = updatedItem.anclado;
            this.renderAll();
        }
    }

    async convertToLogro(id) {
        try {
            const updatedItem = await storage.convertToLogro(id);
            // Update the local items array immediately
            this.items = this.items.map(i => i.id === id ? updatedItem : i); 
            this.switchCategory('logros'); // Switch to the 'logros' category to show the converted item
            this.showToast('Elemento convertido a logro', 'success');
            // Ensure items are re-rendered after category switch
            this.renderItems(); // Explicitly re-render items
        } catch (error) {
            console.error('Error converting to logro:', error);
            this.showToast('Error al convertir el elemento', 'error');
        }
    }

    async toggleTask(itemId, taskId) {
        const item = this.items.find(i => i.id === itemId);
        if (!item) return;

        const task = item.tareas.find(t => t.id === taskId);
        if (!task) return;
        task.completado = !task.completado;

        try {
            await storage.updateItem(itemId, { tareas: item.tareas });
            this.renderItems(); // Solo re-renderizar items, no todo
        } catch (error) {
            console.error('Error updating task:', error);
            task.completado = !task.completado; // Revert on error
            this.showToast('Error al actualizar la tarea', 'error');
        }
    }

    async deleteItem(id) {
        console.log('deleteItem function started for id:', id);
        try {
            await storage.deleteItem(id);
            this.items = this.items.filter(i => i.id !== id);
            this.renderAll();
            this.showToast('Elemento eliminado', 'success');
            console.log('Item deleted successfully:', id);
        } catch (error) {
            console.error('Error deleting item:', error);
            this.showToast('Error al eliminar', 'error');
        }
    }

    // Gestión de selección y acciones en lote
    toggleSelection(id) {
        if (this.selectedItems.has(id)) {
            this.selectedItems.delete(id);
        } else {
            this.selectedItems.add(id);
        }
        this.renderItems();
        this.updateSelectionUI();
    }
    
    toggleSelectAll(checked) {
        const filteredItems = this.getFilteredItems();
        if (checked) {
            filteredItems.forEach(item => this.selectedItems.add(item.id));
        } else {
            this.selectedItems.clear();
        }
        this.renderItems();
        this.updateSelectionUI();
    }
    
    async bulkTogglePinned() {
        const isPinned = this.items.find(item => this.selectedItems.has(item.id))?.anclado;
        for (const id of this.selectedItems) {
            await storage.updateItem(id, { anclado: !isPinned });
        }
        await this.loadData();
        this.selectedItems.clear();
        this.renderAll();
    }
    
    async handleBulkChangeCategory() {
        const newCategory = document.getElementById('bulkNewCategory').value;
        if (!newCategory) return;
        
        for (const id of this.selectedItems) {
            await storage.updateItem(id, { categoria: newCategory });
        }
        await this.loadData();
        this.selectedItems.clear();
        this.closeBulkCategoryModal();
        this.renderAll();
    }

    async handleBulkChangeTags() {
        const newTagsInput = document.getElementById('bulkNewTags').value;
        const newTags = newTagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);

        if (newTags.length === 0) {
            this.showToast('Por favor, introduce al menos una etiqueta.', 'error');
            return;
        }

        for (const id of this.selectedItems) {
            const item = this.items.find(i => i.id === id);
            if (item) {
                // Combine existing tags with new tags, remove duplicates
                const updatedTags = [...new Set([...item.etiquetas, ...newTags])];
                await storage.updateItem(id, { etiquetas: updatedTags });
            }
        }
        await this.loadData();
        this.selectedItems.clear();
        this.closeBulkTagsModal();
        this.renderAll();
        this.showToast('Etiquetas actualizadas en lote', 'success');
    }
    
    confirmBulkDelete() {
        this.showConfirmModal(
            'Eliminar Elementos',
            `¿Estás seguro de que quieres eliminar ${this.selectedItems.size} elementos? Esta acción no se puede deshacer.`,
            () => this.bulkDelete()
        );
    }

    confirmDeleteItem(id) {
        this.pendingConfirmId = id; // Store the ID for individual delete
        this.showConfirmModal(
            'Eliminar Elemento',
            '¿Estás seguro de que quieres eliminar este elemento? Esta acción no se puede deshacer.',
            () => this.deleteItem(this.pendingConfirmId)
        );
    }
    
    async bulkDelete() {
        for (const id of this.selectedItems) {
            await storage.deleteItem(id);
        }
        this.items = this.items.filter(i => !this.selectedItems.has(i.id));
        this.selectedItems.clear();
        this.renderAll();
    }

    // Modales de confirmación y otros
    showConfirmModal(title, message, onConfirm) {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        this.confirmAction = onConfirm;
        document.getElementById('confirmModal').classList.remove('hidden');
    }
    
    closeConfirmModal() {
        document.getElementById('confirmModal').classList.add('hidden');
        this.confirmAction = null;
        this.pendingConfirmId = null; // Clear the stored ID on close
    }
    
    executeConfirmAction() {
        this.confirmAction?.();
        this.closeConfirmModal();
        this.pendingConfirmId = null; // Clear the stored ID after execution
    }
    
    openBulkCategoryModal() { document.getElementById('bulkCategoryModal').classList.remove('hidden'); }
    closeBulkCategoryModal() { document.getElementById('bulkCategoryModal').classList.add('hidden'); }
    openBulkTagsModal() { document.getElementById('bulkTagsModal').classList.remove('hidden'); }
    closeBulkTagsModal() { document.getElementById('bulkTagsModal').classList.add('hidden'); }
    openSettingsModal() {
        document.getElementById('settingsModal').classList.remove('hidden');
        this.renderCustomCategories();
    }
    closeSettingsModal() {
        document.getElementById('settingsModal').classList.add('hidden');
    }

    openNewCategoryInput() {
        this.openSettingsModal();
        // Focus on the new category input after a short delay to ensure modal is open
        setTimeout(() => {
            document.getElementById('newCustomCategoryInput').focus();
        }, 100);
    }

    addCustomCategory() {
        const input = document.getElementById('newCustomCategoryInput');
        const newCategory = input.value.trim();
        if (newCategory && !this.settings.customCategories.includes(newCategory)) {
            this.settings.customCategories.push(newCategory);
            this.saveData();
            this.renderCustomCategories();
            this.renderNavigationTabs(); // Update navigation tabs
            this.populateCategorySelector(); // Update category selector
            input.value = '';
            this.showToast(`Categoría '${newCategory}' añadida.`, 'success');
        } else if (newCategory) {
            this.showToast(`La categoría '${newCategory}' ya existe.`, 'error');
        }
    }

    removeCustomCategory(category) {
        this.settings.customCategories = this.settings.customCategories.filter(cat => cat !== category);
        this.saveData();
        this.renderCustomCategories();
        this.renderNavigationTabs(); // Update navigation tabs
        this.populateCategorySelector(); // Update category selector
        this.showToast(`Categoría '${category}' eliminada.`, 'success');
    }

    renderCustomCategories() {
        const list = document.getElementById('customCategoriesList');
        list.innerHTML = this.settings.customCategories.map(category => `
            <span class="card__tag">
                ${this.escapeHtml(category)}
                <button class="btn btn--icon remove-tag" data-category="${this.escapeHtml(category)}">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </span>
        `).join('');
    }

    // Utilidades
    escapeHtml(text) {
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    truncateUrl(url, maxLength = 50) {
        if (url.length <= maxLength) {
            return url;
        }
        const protocolEnd = url.indexOf('://');
        let displayUrl = url;
        if (protocolEnd !== -1) {
            displayUrl = url.substring(protocolEnd + 3);
        }
        if (displayUrl.length <= maxLength) {
            return displayUrl;
        }
        return displayUrl.substring(0, maxLength - 3) + '...';
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }
    
    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.settings.theme || 'default');
    }
    
    showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    }

    formatTagText(text) {
        if (!text) return '';
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }
    
    handleKeyboardShortcuts(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            this.openModal();
        }
        if (e.key === 'Escape') {
            this.closeModal();
            this.closeConfirmModal();
            this.closeBulkCategoryModal();
            this.closeSettingsModal();
        }
    }
    
    async handleImportFile(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            await storage.importData(file);
            await this.loadData();
            this.renderAll();
            this.showToast('Datos importados correctamente', 'success');
        } catch (error) {
            this.showToast(`Error al importar: ${error.message}`, 'error');
        } finally {
            event.target.value = '';
        }
    }
    
    handleCardClick(event, id) {
        // Previene abrir el modal si el click fue en un elemento interactivo
        if (event.target.closest('button, input, a, .card__task-checkbox')) {
            return;
        }
        this.openModal(id);
    }
}