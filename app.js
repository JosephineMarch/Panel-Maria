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
        
        // Exponer métodos globales para eventos HTML
        window.appController = {
            openModal: (id = null) => this.openModal(id),
            togglePinned: (id) => this.togglePinned(id),
            confirmDelete: (id) => this.confirmDelete(id),
            handleCardClick: (event, id) => this.handleCardClick(event, id),
            toggleSelection: (id) => this.toggleSelection(id),
            convertToLogro: (id) => this.convertToLogro(id),
            toggleTask: (itemId, taskId) => this.toggleTask(itemId, taskId)
        };
    }
    
    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.switchCategory(this.settings.lastCategory || 'todos'); // Cargar la última categoría visitada
        this.applyTheme();
    }
    
    async loadData() {
        try {
            const data = await storage.loadAll();
            this.items = data.items || [];
            this.settings = data.settings || { autoSaveVoice: false, theme: 'default', lastCategory: 'todos' };
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
        // Navegación de categorías
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchCategory(tab.dataset.category);
            });
        });
        
        // Botones principales
        document.getElementById('addItemBtn').addEventListener('click', () => this.openModal());
        // document.getElementById('voiceBtn').addEventListener('click', () => voiceManager.startListening());
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettingsModal());
        document.getElementById('emptyStateAddBtn').addEventListener('click', () => this.openModal());
        
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
        document.getElementById('bulkPinBtn').addEventListener('click', () => this.bulkTogglePinned());
        document.getElementById('bulkDeleteBtn').addEventListener('click', () => this.confirmBulkDelete());
        
        // Modal de elemento
        document.getElementById('closeModalBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('itemForm').addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        // Tareas dinámicas
        document.getElementById('addTaskBtn').addEventListener('click', () => this.addTaskField());
        
        // Modales de confirmación
        document.getElementById('confirmCancelBtn').addEventListener('click', () => this.closeConfirmModal());
        document.getElementById('confirmOkBtn').addEventListener('click', () => this.executeConfirmAction());
        
        // Modal de categoría en lote
        document.getElementById('bulkCategoryCancelBtn').addEventListener('click', () => this.closeBulkCategoryModal());
        document.getElementById('bulkCategoryOkBtn').addEventListener('click', () => this.handleBulkChangeCategory());
        
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
        document.getElementById('exportDataBtn').addEventListener('click', () => storage.exportData());
        document.getElementById('importDataBtn').addEventListener('click', () => document.getElementById('importFile').click());
        document.getElementById('importFile').addEventListener('change', (e) => this.handleImportFile(e));
        
        // Atajos de teclado
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
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
            items = items.filter(item => item.categoria === this.currentCategory);
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
                
                <div class="card__header">
                    <h3 class="card__title">${this.escapeHtml(item.titulo)}</h3>
                    <button class="card__pin ${item.anclado ? 'pinned' : ''}" onclick="event.stopPropagation(); appController.togglePinned('${item.id}')" title="Anclar">
                        <span class="material-symbols-outlined">push_pin</span>
                    </button>
                </div>
                
                <div class="card__body">
                    ${item.descripcion ? `<p class="card__description">${this.escapeHtml(item.descripcion)}</p>` : ''}
                    ${item.url ? `<div class="card__urls"><a href="${item.url}" target="_blank" class="card__url">${this.escapeHtml(item.url)}</a></div>` : ''}
                    ${item.tareas && item.tareas.length > 0 ? this.createTasksContent(item) : ''}
                    ${item.etiquetas && item.etiquetas.length > 0 ? `
                        <div class="card__tags">
                            ${item.etiquetas.map(tag => `<span class="card__tag">${this.escapeHtml(tag)}</span>`).join('')}
                        </div>
                    ` : ''}
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
        document.getElementById('itemTags').value = (item.etiquetas || []).join(', ');
        
        const tasksList = document.getElementById('tasksList');
        tasksList.innerHTML = '';
        if (item.tareas && item.tareas.length > 0) {
            item.tareas.forEach(task => this.addTaskField(task));
        } else {
            this.addTaskField();
        }
    }
    
    clearModalForm() {
        document.getElementById('itemForm').reset();
        document.getElementById('itemCategory').value = this.currentCategory === 'todos' ? 'directorio' : this.currentCategory;
        document.getElementById('tasksList').innerHTML = '';
        this.addTaskField();
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
        
        const itemData = {
            categoria: document.getElementById('itemCategory').value,
            titulo: document.getElementById('itemTitle').value.trim(),
            descripcion: document.getElementById('itemDescription').value.trim(),
            url: document.getElementById('itemUrl').value.trim(),
            etiquetas: document.getElementById('itemTags').value.split(',').map(t => t.trim()).filter(t => t),
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
            this.items = this.items.map(i => i.id === id ? updatedItem : i);
            this.renderAll();
            this.showToast('Elemento convertido a logro', 'success');
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
    
    confirmBulkDelete() {
        this.showConfirmModal(
            'Eliminar Elementos',
            `¿Estás seguro de que quieres eliminar ${this.selectedItems.size} elementos? Esta acción no se puede deshacer.`,
            () => this.bulkDelete()
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
    }
    
    executeConfirmAction() {
        this.confirmAction?.();
        this.closeConfirmModal();
    }
    
    openBulkCategoryModal() { document.getElementById('bulkCategoryModal').classList.remove('hidden'); }
    closeBulkCategoryModal() { document.getElementById('bulkCategoryModal').classList.add('hidden'); }
    openSettingsModal() { document.getElementById('settingsModal').classList.remove('hidden'); }
    closeSettingsModal() { document.getElementById('settingsModal').classList.add('hidden'); }

    // Utilidades
    escapeHtml(text) {
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
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