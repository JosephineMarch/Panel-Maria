/*
================================================================================
|       PANEL MARÍA - APLICACIÓN PRINCIPAL CON 4 MÓDULOS                        |
================================================================================
*/

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar la aplicación
    const app = new PanelMariaApp();
    app.init();
});

class PanelMariaApp {
    constructor() {
        this.currentModule = 'directorio';
        this.items = [];
        this.selectedItems = new Set();
        this.filters = { search: '', categoria: '' };
        this.settings = {};
        this.currentEditId = null;
        
        // Exponer métodos globales para eventos HTML
        window.appController = {
            openModal: (id = null) => this.openModal(id),
            togglePinned: (id) => this.togglePinned(id),
            confirmDelete: (id) => this.confirmDelete(id),
            handleCardClick: (event, id) => this.handleCardClick(event, id),
            toggleSelection: (id) => this.toggleSelection(id),
            convertToProject: (id) => this.convertIdeaToProject(id),
            convertToLogro: (id) => this.convertToLogro(id),
            toggleTask: (itemId, taskId) => this.toggleTask(itemId, taskId)
        };
    }
    
    async init() {
        await this.loadSettings();
        this.setupEventListeners();
        this.loadItems();
        this.renderAll();
        this.applyTheme();
    }
    
    async loadSettings() {
        try {
            this.settings = await storage.getSettings();
            voiceManager.setAutoSave(this.settings.autoSaveVoice || false);
        } catch (error) {
            console.error('Error loading settings:', error);
            this.settings = { autoSaveVoice: false, theme: 'default', lastModule: 'directorio' };
        }
    }
    
    async saveSettings() {
        try {
            await storage.saveSettings(this.settings);
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }
    
    setupEventListeners() {
        // Navegación de módulos
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchModule(tab.dataset.module);
            });
        });
        
        // Botones principales
        document.getElementById('addItemBtn').addEventListener('click', () => this.openModal());
        document.getElementById('voiceBtn').addEventListener('click', () => voiceManager.startListening());
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettingsModal());
        document.getElementById('emptyStateAddBtn').addEventListener('click', () => this.openModal());
        
        // Búsqueda y filtros
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filters.search = e.target.value.toLowerCase();
            this.applyFilters();
        });
        
        document.getElementById('categoryFilter').addEventListener('change', (e) => {
            this.filters.categoria = e.target.value;
            this.applyFilters();
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
        
        // URLs y tareas dinámicas
        document.getElementById('addUrlBtn').addEventListener('click', () => this.addUrlField());
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
            voiceManager.setAutoSave(e.target.checked);
            this.saveSettings();
        });
        document.getElementById('themeSelect').addEventListener('change', (e) => {
            this.settings.theme = e.target.value;
            this.applyTheme();
            this.saveSettings();
        });
        document.getElementById('exportDataBtn').addEventListener('click', () => storage.exportData());
        document.getElementById('importDataBtn').addEventListener('click', () => document.getElementById('importFile').click());
        document.getElementById('importFile').addEventListener('change', (e) => this.handleImportFile(e));
        
        // Atajos de teclado
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }
    
    async loadItems() {
        try {
            const data = await storage.loadAll();
            this.items = data.items || [];
        } catch (error) {
            console.error('Error loading items:', error);
            this.items = [];
        }
    }
    
    switchModule(module) {
        this.currentModule = module;
        this.settings.lastModule = module;
        this.saveSettings();
        
        // Actualizar navegación
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.module === module);
        });
        
        // Limpiar selección
        this.selectedItems.clear();
        this.updateSelectionUI();
        
        // Renderizar
        this.renderItems();
        this.updateCategoryFilter();
    }
    
    renderAll() {
        this.renderItems();
        this.updateCategoryFilter();
        this.updateSelectionUI();
        this.updateEmptyState();
    }
    
    renderItems() {
        const container = document.getElementById('itemsContainer');
        if (!container) return;
        
        const filteredItems = this.getFilteredItems();
        
        if (filteredItems.length === 0) {
            container.innerHTML = '';
            this.updateEmptyState();
            return;
        }
        
        container.innerHTML = filteredItems.map(item => this.createItemCard(item)).join('');
    }
    
    getFilteredItems() {
        let items = this.items.filter(item => item.modulo === this.currentModule);
        
        // Aplicar filtros
        if (this.filters.search) {
            const searchTerm = this.filters.search.toLowerCase();
            items = items.filter(item => 
                item.titulo.toLowerCase().includes(searchTerm) ||
                item.descripcion.toLowerCase().includes(searchTerm) ||
                item.categorias.some(cat => cat.toLowerCase().includes(searchTerm)) ||
                item.urls.some(url => url.toLowerCase().includes(searchTerm))
            );
        }
        
        if (this.filters.categoria) {
            items = items.filter(item => 
                item.categorias.some(cat => cat.toLowerCase().includes(this.filters.categoria.toLowerCase()))
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
        const date = new Date(item.fecha_creacion).toLocaleDateString('es-ES');
        
        let bodyContent = '';
        
        // Contenido específico por módulo
        switch (item.modulo) {
            case 'directorio':
                bodyContent = this.createDirectorioContent(item);
                break;
            case 'ideas':
                bodyContent = this.createIdeasContent(item);
                break;
            case 'proyectos':
                bodyContent = this.createProyectosContent(item);
                break;
            case 'logros':
                bodyContent = this.createLogrosContent(item);
                break;
        }
        
        return `
            <div class="card ${isSelected ? 'selected' : ''}" data-module="${item.modulo}" data-id="${item.id}">
                <input type="checkbox" class="card__checkbox" ${isSelected ? 'checked' : ''} 
                       onchange="appController.toggleSelection('${item.id}')">
                
                <div class="card__header">
                    <h3 class="card__title">${this.escapeHtml(item.titulo)}</h3>
                    <button class="card__pin ${item.anclado ? 'pinned' : ''}" 
                            onclick="appController.togglePinned('${item.id}')" title="Anclar">
                        <span class="material-symbols-outlined">push_pin</span>
                    </button>
                </div>
                
                <div class="card__body">
                    ${item.descripcion ? `<p class="card__description">${this.escapeHtml(item.descripcion)}</p>` : ''}
                    
                    ${item.categorias.length > 0 ? `
                        <div class="card__categories">
                            ${item.categorias.map(cat => `<span class="card__category">${this.escapeHtml(cat)}</span>`).join('')}
                        </div>
                    ` : ''}
                    
                    ${bodyContent}
                </div>
                
                <div class="card__footer">
                    <span class="card__date">${date}</span>
                    <div class="card__actions">
                        ${this.createCardActions(item)}
                    </div>
                </div>
            </div>
        `;
    }
    
    createDirectorioContent(item) {
        if (item.urls.length === 0) return '<p class="card__description">Sin URLs</p>';
        
        const firstUrl = item.urls[0];
        const remainingCount = item.urls.length - 1;
        
        return `
            <div class="card__urls">
                <a href="${firstUrl}" target="_blank" class="card__url">${this.escapeHtml(firstUrl)}</a>
                ${remainingCount > 0 ? `<span class="card__url-count">+${remainingCount} más</span>` : ''}
            </div>
        `;
    }
    
    createIdeasContent(item) {
        return `
            <div class="card__description">
                ${this.escapeHtml(item.descripcion || 'Sin descripción')}
            </div>
        `;
    }
    
    createProyectosContent(item) {
        if (item.tareas.length === 0) return '<p class="card__description">Sin tareas definidas</p>';
        
        const completedTasks = item.tareas.filter(task => task.completado).length;
        const totalTasks = item.tareas.length;
        
        return `
            <div class="card__tasks">
                <div class="card__task">
                    <span>Progreso: ${completedTasks}/${totalTasks} tareas</span>
                </div>
                ${item.tareas.slice(0, 3).map(task => `
                    <div class="card__task ${task.completado ? 'completed' : ''}">
                        <input type="checkbox" class="card__task-checkbox" 
                               ${task.completado ? 'checked' : ''}
                               onchange="appController.toggleTask('${item.id}', '${task.id}')">
                        <span>${this.escapeHtml(task.titulo)}</span>
                    </div>
                `).join('')}
                ${item.tareas.length > 3 ? `<div class="card__task">... y ${item.tareas.length - 3} más</div>` : ''}
            </div>
        `;
    }
    
    createLogrosContent(item) {
        const completionDate = item.fecha_finalizacion ? 
            new Date(item.fecha_finalizacion).toLocaleDateString('es-ES') : '';
        
        return `
            <div class="card__description">
                ${this.escapeHtml(item.descripcion || 'Logro completado')}
                ${completionDate ? `<br><small>Completado: ${completionDate}</small>` : ''}
            </div>
        `;
    }
    
    createCardActions(item) {
        const actions = [];
        
        // Botón editar/abrir
        actions.push(`
            <button class="btn btn--text" onclick="appController.openModal('${item.id}')" title="Editar">
                <span class="material-symbols-outlined">edit</span>
            </button>
        `);
        
        // Botones de conversión específicos
        if (item.modulo === 'idea') {
            actions.push(`
                <button class="btn btn--text" onclick="appController.convertToProject('${item.id}')" title="Convertir a proyecto">
                    <span class="material-symbols-outlined">assignment</span>
                </button>
                <button class="btn btn--text" onclick="appController.convertToLogro('${item.id}')" title="Convertir a logro">
                    <span class="material-symbols-outlined">emoji_events</span>
                </button>
            `);
        }
        
        // Botón eliminar
        actions.push(`
            <button class="btn btn--text" onclick="appController.confirmDelete('${item.id}')" title="Eliminar">
                <span class="material-symbols-outlined">delete</span>
            </button>
        `);
        
        return actions.join('');
    }
    
    updateCategoryFilter() {
        const select = document.getElementById('categoryFilter');
        if (!select) return;
        
        const categories = new Set();
        this.items.forEach(item => {
            item.categorias.forEach(cat => categories.add(cat));
        });
        
        const currentValue = select.value;
        select.innerHTML = '<option value="">Todas las categorías</option>';
        
        Array.from(categories).sort().forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            select.appendChild(option);
        });
        
        select.value = currentValue;
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
        
        // Actualizar estado del checkbox "seleccionar todo"
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
        
        const hasItems = this.getFilteredItems().length > 0;
        
        if (hasItems) {
            emptyState.classList.add('hidden');
        } else {
            emptyState.classList.remove('hidden');
            const moduleNames = {
                'directorio': 'recursos',
                'ideas': 'ideas',
                'proyectos': 'proyectos',
                'logros': 'logros'
            };
            emptyState.querySelector('.empty-state__title').textContent = 
                `No hay ${moduleNames[this.currentModule]} en este módulo`;
        }
    }
    
    applyFilters() {
        this.renderItems();
        this.updateSelectionUI();
        this.updateEmptyState();
    }
    
    // Gestión de modales
    openModal(id = null) {
        this.currentEditId = id;
        const modal = document.getElementById('itemModal');
        const modalTitle = document.getElementById('modalTitle');
        const currentModuleInput = document.getElementById('currentModule');
        
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
        
        currentModuleInput.value = this.currentModule;
        modal.classList.remove('hidden');
        
        // Mostrar/ocultar secciones según el módulo
        this.updateModalSections();
    }
    
    closeModal() {
        const modal = document.getElementById('itemModal');
        modal.classList.add('hidden');
        this.currentEditId = null;
    }
    
    populateModalForm(item) {
        document.getElementById('itemTitle').value = item.titulo;
        document.getElementById('itemDescription').value = item.descripcion || '';
        document.getElementById('itemCategories').value = item.categorias.join(', ');
        document.getElementById('itemPinned').checked = item.anclado;
        
        // URLs
        const urlsList = document.getElementById('urlsList');
        urlsList.innerHTML = '';
        if (item.urls.length > 0) {
            item.urls.forEach(url => this.addUrlField(url));
        } else {
            this.addUrlField();
        }
        
        // Tareas
        const tasksList = document.getElementById('tasksList');
        tasksList.innerHTML = '';
        if (item.tareas.length > 0) {
            item.tareas.forEach(task => this.addTaskField(task));
        } else {
            this.addTaskField();
        }
    }
    
    clearModalForm() {
        document.getElementById('itemForm').reset();
        document.getElementById('urlsList').innerHTML = '';
        document.getElementById('tasksList').innerHTML = '';
        this.addUrlField();
        this.addTaskField();
    }
    
    updateModalSections() {
        const urlsSection = document.getElementById('urlsSection');
        const tasksSection = document.getElementById('tasksSection');
        
        // Mostrar URLs solo para directorio
        urlsSection.classList.toggle('hidden', this.currentModule !== 'directorio');
        
        // Mostrar tareas solo para proyectos
        tasksSection.classList.toggle('hidden', this.currentModule !== 'proyectos');
    }
    
    addUrlField(url = '') {
        const urlsList = document.getElementById('urlsList');
        const urlItem = document.createElement('div');
        urlItem.className = 'url-item';
        urlItem.innerHTML = `
            <input type="url" class="input-field url-input" value="${url}" placeholder="https://ejemplo.com">
            <button type="button" class="btn btn--icon remove-url"><span class="material-symbols-outlined">remove</span></button>
        `;
        
        urlItem.querySelector('.remove-url').addEventListener('click', () => {
            if (urlsList.children.length > 1) {
                urlItem.remove();
            }
        });
        
        urlsList.appendChild(urlItem);
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
            }
        });
        
        tasksList.appendChild(taskItem);
    }
    
    async handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const itemData = {
            titulo: formData.get('itemTitle') || document.getElementById('itemTitle').value,
            descripcion: formData.get('itemDescription') || document.getElementById('itemDescription').value,
            categorias: (formData.get('itemCategories') || document.getElementById('itemCategories').value)
                .split(',').map(cat => cat.trim()).filter(cat => cat),
            anclado: formData.get('itemPinned') || document.getElementById('itemPinned').checked,
            modulo: this.currentModule
        };
        
        // URLs (solo para directorio)
        if (this.currentModule === 'directorio') {
            const urlInputs = document.querySelectorAll('.url-input');
            itemData.urls = Array.from(urlInputs).map(input => input.value.trim()).filter(url => url);
        }
        
        // Tareas (solo para proyectos)
        if (this.currentModule === 'proyectos') {
            const taskInputs = document.querySelectorAll('.task-input');
            const taskCheckboxes = document.querySelectorAll('.task-checkbox');
            itemData.tareas = Array.from(taskInputs).map((input, index) => ({
                id: Date.now().toString(36) + Math.random().toString(36).substr(2),
                titulo: input.value.trim(),
                completado: taskCheckboxes[index]?.checked || false
            })).filter(task => task.titulo);
        }
        
        try {
            if (this.currentEditId) {
                await storage.updateItem(this.currentEditId, itemData);
                this.showToast('Elemento actualizado correctamente', 'success');
            } else {
                await storage.addItem(itemData);
                this.showToast('Elemento creado correctamente', 'success');
            }
            
            this.closeModal();
            this.loadItems();
            this.renderAll();
        } catch (error) {
            console.error('Error saving item:', error);
            this.showToast('Error al guardar el elemento', 'error');
        }
    }
    
    // Gestión de selección
    toggleSelection(id) {
        if (this.selectedItems.has(id)) {
            this.selectedItems.delete(id);
        } else {
            this.selectedItems.add(id);
        }
        this.updateSelectionUI();
    }
    
    toggleSelectAll(checked) {
        const filteredItems = this.getFilteredItems();
        
        if (checked) {
            filteredItems.forEach(item => this.selectedItems.add(item.id));
        } else {
            filteredItems.forEach(item => this.selectedItems.delete(item.id));
        }
        
        this.updateSelectionUI();
        this.renderItems();
    }
    
    // Acciones en lote
    async bulkTogglePinned() {
        const pinned = !this.items.find(item => this.selectedItems.has(item.id))?.anclado;
        
        for (const id of this.selectedItems) {
            await storage.updateItem(id, { anclado: pinned });
        }
        
        this.selectedItems.clear();
        this.loadItems();
        this.renderAll();
        this.showToast(`${pinned ? 'Anclados' : 'Desanclados'} ${this.selectedItems.size} elementos`, 'success');
    }
    
    async handleBulkChangeCategory() {
        const newCategory = document.getElementById('bulkNewCategory').value.trim();
        if (!newCategory) return;
        
        for (const id of this.selectedItems) {
            const item = this.items.find(item => item.id === id);
            if (item) {
                const categorias = [...item.categorias];
                if (!categorias.includes(newCategory)) {
                    categorias.push(newCategory);
                    await storage.updateItem(id, { categorias });
                }
            }
        }
        
        this.selectedItems.clear();
        this.closeBulkCategoryModal();
        this.loadItems();
        this.renderAll();
        this.showToast(`Categoría agregada a ${this.selectedItems.size} elementos`, 'success');
    }
    
    confirmBulkDelete() {
        this.showConfirmModal(
            'Eliminar elementos',
            `¿Estás seguro de que quieres eliminar ${this.selectedItems.size} elementos?`,
            () => this.bulkDelete()
        );
    }
    
    async bulkDelete() {
        for (const id of this.selectedItems) {
            await storage.deleteItem(id);
        }
        
        this.selectedItems.clear();
        this.loadItems();
        this.renderAll();
        this.showToast(`${this.selectedItems.size} elementos eliminados`, 'success');
    }
    
    // Conversiones
    async convertIdeaToProject(id) {
        try {
            await storage.convertIdeaToProject(id);
            this.loadItems();
            this.renderAll();
            this.showToast('Idea convertida a proyecto', 'success');
        } catch (error) {
            console.error('Error converting idea to project:', error);
            this.showToast('Error al convertir la idea', 'error');
        }
    }
    
    async convertToLogro(id) {
        try {
            const item = this.items.find(item => item.id === id);
            if (item.modulo === 'idea') {
                await storage.convertIdeaToLogro(id);
            } else if (item.modulo === 'proyecto') {
                await storage.convertProjectToLogro(id);
            }
            
            this.loadItems();
            this.renderAll();
            this.showToast('Elemento convertido a logro', 'success');
        } catch (error) {
            console.error('Error converting to logro:', error);
            this.showToast('Error al convertir el elemento', 'error');
        }
    }
    
    async toggleTask(itemId, taskId) {
        try {
            const item = this.items.find(item => item.id === itemId);
            if (!item) return;
            
            const task = item.tareas.find(task => task.id === taskId);
            if (!task) return;
            
            task.completado = !task.completado;
            
            // Verificar si todas las tareas están completadas para conversión automática
            const allCompleted = item.tareas.every(task => task.completado);
            if (allCompleted && item.tareas.length > 0) {
                await storage.convertProjectToLogro(itemId);
                this.showToast('¡Proyecto completado! Convertido a logro', 'success');
            } else {
                await storage.updateItem(itemId, { tareas: item.tareas });
            }
            
            this.loadItems();
            this.renderAll();
        } catch (error) {
            console.error('Error toggling task:', error);
            this.showToast('Error al actualizar la tarea', 'error');
        }
    }
    
    // Gestión de modales de confirmación
    showConfirmModal(title, message, onConfirm) {
        const modal = document.getElementById('confirmModal');
        const titleEl = document.getElementById('confirmTitle');
        const messageEl = document.getElementById('confirmMessage');
        
        titleEl.textContent = title;
        messageEl.textContent = message;
        
        this.confirmAction = onConfirm;
        modal.classList.remove('hidden');
    }
    
    closeConfirmModal() {
        const modal = document.getElementById('confirmModal');
        modal.classList.add('hidden');
        this.confirmAction = null;
    }
    
    executeConfirmAction() {
        if (this.confirmAction) {
            this.confirmAction();
        }
        this.closeConfirmModal();
    }
    
    // Modales específicos
    openBulkCategoryModal() {
        const modal = document.getElementById('bulkCategoryModal');
        modal.classList.remove('hidden');
    }
    
    closeBulkCategoryModal() {
        const modal = document.getElementById('bulkCategoryModal');
        modal.classList.add('hidden');
        document.getElementById('bulkNewCategory').value = '';
    }
    
    openSettingsModal() {
        const modal = document.getElementById('settingsModal');
        const autoSaveCheckbox = document.getElementById('autoSaveVoice');
        const themeSelect = document.getElementById('themeSelect');
        
        autoSaveCheckbox.checked = this.settings.autoSaveVoice || false;
        themeSelect.value = this.settings.theme || 'default';
        
        modal.classList.remove('hidden');
    }
    
    closeSettingsModal() {
        const modal = document.getElementById('settingsModal');
        modal.classList.add('hidden');
    }
    
    // Utilidades
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
    }
    
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + N para nuevo elemento
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            this.openModal();
        }
        
        // Ctrl/Cmd + M para micrófono
        if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
            e.preventDefault();
            voiceManager.startListening();
        }
        
        // Escape para cerrar modales
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
            this.loadItems();
            this.renderAll();
            this.showToast('Datos importados correctamente', 'success');
        } catch (error) {
            console.error('Error importing file:', error);
            this.showToast('Error al importar el archivo', 'error');
        } finally {
            event.target.value = '';
        }
    }
    
    // Event handlers para cards
    handleCardClick(event, id) {
        // No abrir modal si se hace clic en checkbox o botones
        if (event.target.closest('.card__checkbox, .card__pin, .card__actions, .card__task-checkbox')) {
            return;
        }
        
        this.openModal(id);
    }
    
    togglePinned(id) {
        const item = this.items.find(item => item.id === id);
        if (item) {
            storage.updateItem(id, { anclado: !item.anclado });
            this.loadItems();
            this.renderAll();
        }
    }
    
    confirmDelete(id) {
        const item = this.items.find(item => item.id === id);
        if (item) {
            this.showConfirmModal(
                'Eliminar elemento',
                `¿Estás seguro de que quieres eliminar "${item.titulo}"?`,
                () => this.deleteItem(id)
            );
        }
    }
    
    async deleteItem(id) {
        try {
            await storage.deleteItem(id);
            this.loadItems();
            this.renderAll();
            this.showToast('Elemento eliminado correctamente', 'success');
        } catch (error) {
            console.error('Error deleting item:', error);
            this.showToast('Error al eliminar el elemento', 'error');
        }
    }
}
