/*
================================================================================
|       PANEL MARÍA - APLICACIÓN PRINCIPAL (CON NUEVO SISTEMA DE ETIQUETAS)    |
================================================================================
*/

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
        
        // --- Propiedades para el modal de etiquetas ---
        this.modalActiveTags = new Set(); // Almacena las etiquetas del item en el modal

        // --- Context Menu Properties ---
        this.contextMenu = null;
        this.contextMenuAction = null;
        this.longPressTimer = null;

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
        await this.migrateToCategorySpecificTags();
        this.renderNavigationTabs();
        this.populateCategorySelector();
        this.setupEventListeners();
        this.switchCategory(this.settings.lastCategory || 'todos');
        this.applyTheme();
    }
    
    async loadData() {
        try {
            const data = await storage.loadAll();
            this.items = data.items || [];
            this.settings = data.settings || { autoSaveVoice: false, theme: 'default', lastCategory: 'todos', customCategories: [], allTags: [] };
            if (!this.settings.allTags) this.settings.allTags = []; // Asegurar que exista
        } catch (error) {
            console.error('Error loading data:', error);
            this.items = [];
            this.settings = { autoSaveVoice: false, theme: 'default', lastCategory: 'todos', customCategories: [], allTags: [] };
        }
    }

    async saveData() {
        try {
            await storage.saveAll({ items: this.items, settings: this.settings });
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }

    async migrateToCategorySpecificTags() {
        if (this.settings.categoryTags) {
            // Migration already done
            return;
        }

        console.log("Running migration to category-specific tags...");

        this.settings.categoryTags = {};
        this.items.forEach(item => {
            const category = item.categoria;
            if (!this.settings.categoryTags[category]) {
                this.settings.categoryTags[category] = [];
            }
            if (item.etiquetas) {
                item.etiquetas.forEach(tag => {
                    if (!this.settings.categoryTags[category].includes(tag)) {
                        this.settings.categoryTags[category].push(tag);
                    }
                });
            }
        });

        delete this.settings.allTags; // Remove old global tags
        await this.saveData();
        console.log("Migration complete.");
    }
    
    setupEventListeners() {
        // Botones principales
        document.getElementById('addItemBtn').addEventListener('click', () => this.openModal());
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
        document.getElementById('bulkChangeTagsBtn').addEventListener('click', () => this.openBulkTagsModal());
        document.getElementById('bulkPinBtn').addEventListener('click', () => this.bulkTogglePinned());
        document.getElementById('bulkDeleteBtn').addEventListener('click', () => this.confirmBulkDelete());
        
        // Modal de elemento
        document.getElementById('closeModalBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('itemForm').addEventListener('submit', (e) => this.handleFormSubmit(e));
        document.getElementById('itemCategory').addEventListener('change', (e) => this.handleCategoryChange(e));

        // --- Nuevos listeners para el componente de etiquetas ---
        const tagsWrapper = document.getElementById('itemTagsWrapper');
        const tagsInput = document.getElementById('itemTagsInput');
        
        tagsWrapper.addEventListener('click', () => tagsInput.focus());

        tagsInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const newTag = e.target.value.trim();
                if (newTag) {
                    this.addModalTag(newTag);
                }
            } else if (e.key === 'Backspace' && e.target.value === '') {
                // Eliminar la última etiqueta si se presiona backspace en un campo vacío
                const lastTag = Array.from(this.modalActiveTags).pop();
                if (lastTag) {
                    this.removeModalTag(lastTag);
                }
            }
        });
        
        tagsInput.addEventListener('input', (e) => {
            this.renderTagSuggestions(e.target.value);
        });

        document.getElementById('tagSuggestions').addEventListener('click', (e) => {
            if (e.target.classList.contains('tag-suggestion')) {
                this.addModalTag(e.target.dataset.tag);
            }
        });
        
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
        
        // New Category Modal Listeners
        document.getElementById('newCategoryCloseBtn').addEventListener('click', () => this.closeNewCategoryModal());
        document.getElementById('newCategoryCancelBtn').addEventListener('click', () => this.closeNewCategoryModal());
        document.getElementById('newCategoryCreateBtn').addEventListener('click', () => {
            const newCategoryName = document.getElementById('newCategoryNameInput').value;
            this.addCustomCategory(newCategoryName);
        });

        // Atajos de teclado
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));

        // Sincronización entre pestañas
        window.addEventListener('storage', (e) => this.handleStorageChange(e));

        // --- Context Menu Listeners ---
        document.addEventListener('click', () => this.hideContextMenu());
        document.getElementById('contextMenuDelete').addEventListener('click', () => {
            if (typeof this.contextMenuAction === 'function') {
                this.contextMenuAction();
            }
            this.hideContextMenu();
        });

        const tagFiltersContainer = document.getElementById('tagFilters');
        tagFiltersContainer.addEventListener('contextmenu', (e) => {
            const target = e.target.closest('.tag-filter');
            if (target && target.dataset.tag) {
                e.preventDefault();
                const tag = target.dataset.tag;
                const categoryContext = this.currentCategory; // Get the current category
                this.showContextMenu(e.clientX, e.clientY, () => {
                    this.showConfirmModal(
                        'Eliminar Etiqueta',
                        `¿Estás seguro de que quieres eliminar la etiqueta "${this.formatTagText(tag)}" de la categoría "${this.formatCategoryName(categoryContext)}"? Se quitará de los elementos de esta categoría.`,
                        () => this.removeTag(tag)
                    );
                });
            }
        });

        // Long-press for mobile
        let longPressTimer;
        tagFiltersContainer.addEventListener('touchstart', (e) => {
            const target = e.target.closest('.tag-filter');
            if (target && target.dataset.tag) {
                longPressTimer = setTimeout(() => {
                    e.preventDefault();
                    const tag = target.dataset.tag;
                    const categoryContext = this.currentCategory; // Get the current category
                    this.showContextMenu(e.touches[0].clientX, e.touches[0].clientY, () => {
                        this.showConfirmModal(
                            'Eliminar Etiqueta',
                            `¿Estás seguro de que quieres eliminar la etiqueta "${this.formatTagText(tag)}" de la categoría "${this.formatCategoryName(categoryContext)}"? Se quitará de los elementos de esta categoría.`,
                            () => this.removeTag(tag)
                        );
                    });
                }, 500);
            }
        });

        tagFiltersContainer.addEventListener('touchend', () => clearTimeout(longPressTimer));
        tagFiltersContainer.addEventListener('touchmove', () => clearTimeout(longPressTimer));
    }

    handleStorageChange(e) {
        if (e.key === storage.adapter.storageKey && e.newValue !== e.oldValue) {
            this.loadData().then(() => {
                this.renderAll();
                this.showToast('Datos actualizados desde otra pestaña', 'info');
            });
        }
    }

    filterByTag(tag) {
        if (this.filters.tag === tag || tag === null) {
            this.filters.tag = null;
            if (tag) { // only show toast if a tag was provided
                this.showToast(`Filtro por etiqueta '${tag}' eliminado`, 'info');
            }
        } else {
            this.filters.tag = tag;
            this.showToast(`Filtrando por etiqueta: ${tag}`, 'info');
        }
        this.renderAll();
    }
    
    switchCategory(category) {
        this.currentCategory = category;
        this.settings.lastCategory = category;
        this.saveData();
        
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === category);
        });
        
        this.selectedItems.clear();
        this.filters.tag = null; // Reset tag filter on category change
        this.renderAll();
    }
    
    renderAll() {
        this.renderItems();
        this.updateSelectionUI();
        this.updateEmptyState();
        this.renderTagFilters();
    }

    renderNavigationTabs() {
        console.log("renderNavigationTabs called");
        const navContainer = document.querySelector('.nav-tabs');
        const predefinedCategories = ['directorio', 'ideas', 'proyectos', 'logros'];
        const allCategories = [...predefinedCategories, ...(this.settings.customCategories || [])];

        let tabsHtml = allCategories.map(category => `
            <button class="nav-tab" data-category="${category}">
                <span class="material-symbols-outlined">${this.getCategoryIcon(category)}</span>
                ${this.formatCategoryName(category)}
            </button>
        `).join('');
        
        tabsHtml += `
            <button class="nav-tab" data-category="todos">
                <span class="material-symbols-outlined">select_all</span>
                Todos
            </button>
        `;
        
        tabsHtml += `
            <button id="newCategoryNavBtn" class="btn btn--text">
                <span class="material-symbols-outlined">add</span> Nueva Categoría
            </button>
        `;

        navContainer.innerHTML = `<div class="container"><div class="nav-tabs__inner">${tabsHtml}</div></div>`;

        navContainer.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchCategory(tab.dataset.category);
            });
        });

        navContainer.addEventListener('contextmenu', (e) => {
            console.log("contextmenu event triggered on navContainer");
            const target = e.target.closest('.nav-tab');
            console.log("target:", target);
            if (target && target.dataset.category && !['directorio', 'ideas', 'proyectos', 'logros', 'todos'].includes(target.dataset.category)) {
                console.log("Custom category found:", target.dataset.category);
                e.preventDefault();
                const category = target.dataset.category;
                this.showContextMenu(e.clientX, e.clientY, () => {
                    this.showConfirmModal(
                        'Eliminar Categoría',
                        `¿Estás seguro de que quieres eliminar la categoría "${this.formatCategoryName(category)}"? Todos los elementos se moverán a "Directorio".`,
                        () => this.removeCustomCategory(category)
                    );
                });
            }
        });

        let longPressTimer;
        navContainer.addEventListener('touchstart', (e) => {
            const target = e.target.closest('.nav-tab');
            if (target && target.dataset.category && !['directorio', 'ideas', 'proyectos', 'logros', 'todos'].includes(target.dataset.category)) {
                longPressTimer = setTimeout(() => {
                    e.preventDefault();
                    const category = target.dataset.category;
                    this.showContextMenu(e.touches[0].clientX, e.touches[0].clientY, () => {
                        this.showConfirmModal(
                            'Eliminar Categoría',
                            `¿Estás seguro de que quieres eliminar la categoría "${this.formatCategoryName(category)}"? Todos los elementos se moverán a "Directorio".`,
                            () => this.removeCustomCategory(category)
                        );
                    });
                }, 500);
            }
        });

        navContainer.addEventListener('touchend', () => clearTimeout(longPressTimer));
        navContainer.addEventListener('touchmove', () => clearTimeout(longPressTimer));

        document.getElementById('newCategoryNavBtn').addEventListener('click', () => this.openNewCategoryModal());
        
        navContainer.querySelector(`[data-category="${this.currentCategory}"]`)?.classList.add('active');
    }

    renderTagFilters() {
        const container = document.getElementById('tagFilters');
        if (!container) return;

        const tagsForCategory = (this.settings.categoryTags && this.settings.categoryTags[this.currentCategory]) || [];
        
        if (tagsForCategory.length === 0) {
            container.innerHTML = '';
            return;
        }

        let tagsHtml = `
            <span class="tag-filter-label">Etiquetas:</span>
            ${tagsForCategory.map(tag => `
                <span class="tag-filter ${this.filters.tag === tag ? 'active' : ''}" data-tag="${this.escapeHtml(tag)}">
                    ${this.formatTagText(this.escapeHtml(tag))}
                </span>
            `).join('')}
        `;

        if (this.filters.tag) {
            tagsHtml += `<button class="btn btn--text" id="clearTagFilterBtn">&times; Limpiar</button>`;
        }

        container.innerHTML = tagsHtml;

        container.querySelectorAll('.tag-filter').forEach(tagEl => {
            tagEl.addEventListener('click', (e) => {
                const tag = e.target.dataset.tag;
                this.filterByTag(tag);
            });
        });

        if (this.filters.tag) {
            document.getElementById('clearTagFilterBtn').addEventListener('click', () => {
                this.filterByTag(null);
            });
        }
    }

    populateCategorySelector() {
        const selector = document.getElementById('itemCategory');
        const predefinedCategories = ['directorio', 'ideas', 'proyectos', 'logros'];
        const allCategories = [...predefinedCategories, ...(this.settings.customCategories || [])];

        selector.innerHTML = allCategories.map(category => `
            <option value="${category}">${this.formatCategoryName(category)}</option>
        `).join('');

        selector.innerHTML += `<option value="__new_category__">Crear nueva categoría...</option>`;
    }

    getCategoryIcon(category) {
        switch (category) {
            case 'directorio': return 'bookmarks';
            case 'ideas': return 'lightbulb';
            case 'proyectos': return 'assignment';
            case 'logros': return 'emoji_events';
            default: return 'label';
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
        
        if (this.currentCategory !== 'todos') {
            items = items.filter(item => item.categoria.toLowerCase() === this.currentCategory.toLowerCase());
        }

        if (this.filters.search) {
            const searchTerm = this.filters.search;
            items = items.filter(item => 
                item.titulo.toLowerCase().includes(searchTerm) ||
                (item.descripcion && item.descripcion.toLowerCase().includes(searchTerm)) ||
                (item.etiquetas && item.etiquetas.some(tag => tag.toLowerCase().includes(searchTerm))) ||
                (item.url && item.url.toLowerCase().includes(searchTerm))
            );
        }

        if (this.filters.tag) {
            const tagFilter = this.filters.tag.toLowerCase();
            items = items.filter(item => item.etiquetas && item.etiquetas.some(tag => tag.toLowerCase() === tagFilter));
        }
        
        items.sort((a, b) => {
            if (a.anclado !== b.anclado) return a.anclado ? -1 : 1;
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
                    ${item.url ? `<div class="card__urls"><a href="${this.escapeHtml(item.url)}" target="_blank" class="card__url" onclick="event.stopPropagation()">${this.escapeHtml(this.truncateUrl(item.url))}</a></div>` : ''}
                    ${item.tareas && item.tareas.length > 0 ? this.createTasksContent(item) : ''}
                    ${item.tareas && item.tareas.length > 0 ? this.createProgressBar(item) : ''}
                </div>
                
                 ${item.etiquetas && item.etiquetas.length > 0 ? `
                    <div class="card__tags">
                        ${item.etiquetas.map(tag => `<span class="card__tag" onclick="event.stopPropagation(); appController.filterByTag('${this.escapeHtml(tag)}')">${this.formatTagText(this.escapeHtml(tag))}</span>`).join('')}
                    </div>
                ` : ''}
                
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

    createProgressBar(item) {
        const completedTasks = item.tareas.filter(task => task.completado).length;
        const totalTasks = item.tareas.length;
        const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
        const isProyecto = item.categoria === 'proyectos'; // Check if it's a project

        return `
            <div class="progress-bar ${isProyecto ? 'progress-bar--proyecto' : ''}">
                <div class="progress-bar__fill" style="width: ${progress}%;"></div>
            </div>
        `;
    }
    
    createCardActions(item) {
        let actions = [];
        actions.push(`<button class="btn btn--text" onclick="event.stopPropagation(); appController.openModal('${item.id}')" title="Editar"><span class="material-symbols-outlined">edit</span></button>`);
        if (item.categoria !== 'logros') {
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
        const itemsContainer = document.getElementById('itemsContainer');
        if (!emptyState || !itemsContainer) return;
        
        const hasItems = itemsContainer.children.length > 0;
        emptyState.classList.toggle('hidden', hasItems);
        
        if (!hasItems) {
            const categoryName = this.formatCategoryName(this.currentCategory);
            emptyState.querySelector('.empty-state__title').textContent = `No hay elementos en "${categoryName}"`;
        }
    }

    // --- LÓGICA DEL NUEVO COMPONENTE DE ETIQUETAS ---

    addModalTag(tag) {
        const cleanedTag = tag.trim().toLowerCase();
        if (cleanedTag && !this.modalActiveTags.has(cleanedTag)) {
            this.modalActiveTags.add(cleanedTag);
            this.renderModalTags();
        }
        const tagsInput = document.getElementById('itemTagsInput');
        tagsInput.value = '';
        tagsInput.focus();
        this.renderTagSuggestions(''); // Limpiar sugerencias
    }

    removeModalTag(tag) {
        this.modalActiveTags.delete(tag);
        this.renderModalTags();
    }

    renderModalTags() {
        const tagsWrapper = document.getElementById('itemTagsWrapper');
        const tagsInput = document.getElementById('itemTagsInput');
        
        // Eliminar píldoras antiguas
        tagsWrapper.querySelectorAll('.tag-pill').forEach(pill => pill.remove());

        // Añadir nuevas píldoras
        this.modalActiveTags.forEach(tag => {
            const pill = document.createElement('span');
            pill.className = 'tag-pill';
            pill.innerHTML = `
                ${this.escapeHtml(this.formatTagText(tag))}
                <span class="tag-pill__remove" data-tag="${this.escapeHtml(tag)}">&times;</span>
            `;
            // Añadir listener para eliminar la píldora
            pill.querySelector('.tag-pill__remove').addEventListener('click', (e) => {
                e.stopPropagation(); // Evitar que el wrapper reciba el click
                this.removeModalTag(e.target.dataset.tag);
            });
            tagsWrapper.insertBefore(pill, tagsInput);
        });
    }

    renderTagSuggestions(filterText = '') {
        const suggestionsContainer = document.getElementById('tagSuggestions');
        const currentItemCategory = document.getElementById('itemCategory').value; // Get selected category
        const tagsForCategory = (this.settings.categoryTags && this.settings.categoryTags[currentItemCategory]) || [];
        const lowerFilter = filterText.trim().toLowerCase();

        if (!lowerFilter) {
            suggestionsContainer.innerHTML = '';
            return;
        }

        const filteredTags = tagsForCategory.filter(tag => 
            tag.toLowerCase().includes(lowerFilter) && !this.modalActiveTags.has(tag)
        );

        suggestionsContainer.innerHTML = filteredTags.slice(0, 10).map(tag => `
            <span class="tag-suggestion" data-tag="${this.escapeHtml(tag)}">
                ${this.escapeHtml(this.formatTagText(tag))}
            </span>
        `).join('');
    }

    // --- FIN DE LA LÓGICA DEL COMPONENTE DE ETIQUETAS ---

    // --- Context Menu Logic ---
    showContextMenu(x, y, action) {
        this.contextMenu = document.getElementById('contextMenu');
        this.contextMenu.style.top = `${y}px`;
        this.contextMenu.style.left = `${x}px`;
        this.contextMenu.classList.remove('hidden');
        this.contextMenuAction = action;
    }

    hideContextMenu() {
        if (this.contextMenu) {
            this.contextMenu.classList.add('hidden');
            this.contextMenuAction = null;
        }
    }
    
    openModal(id = null) {
        this.currentEditId = id;
        const modal = document.getElementById('itemModal');
        const modalTitle = document.getElementById('modalTitle');
        
        // Limpiar estado del modal anterior
        this.modalActiveTags.clear();
        
        if (id) {
            const item = this.items.find(item => item.id === id);
            if (item) {
                modalTitle.textContent = 'Editar Elemento';
                this.populateModalForm(item);
                // Cargar etiquetas del item
                (item.etiquetas || []).forEach(tag => this.modalActiveTags.add(tag));
            }
        } else {
            modalTitle.textContent = 'Agregar Nuevo Elemento';
            this.clearModalForm();
            this.populateModalForm(null);
        }
        
        // Renderizar etiquetas y sugerencias
        this.renderModalTags();
        this.renderTagSuggestions('');

        modal.classList.remove('hidden');
        document.getElementById('itemTitle').focus();
    }
    
    closeModal() {
        document.getElementById('itemModal').classList.add('hidden');
        this.currentEditId = null;
        this.modalActiveTags.clear(); // Limpiar etiquetas activas al cerrar
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
        if (item?.tareas && item.tareas.length > 0) {
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
        // Limpiar el input de etiquetas explícitamente
        document.getElementById('itemTagsInput').value = '';
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
        
        // --- Nueva forma de obtener las etiquetas ---
        const finalTags = Array.from(this.modalActiveTags);

        // Añadir las nuevas etiquetas a la lista de la categoría correspondiente
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
            this.renderNavigationTabs();
            this.populateCategorySelector();
            this.switchCategory(itemData.categoria);
        } catch (error) {
            console.error('Error saving item:', error);
            this.showToast('Error al guardar el elemento', 'error');
        }
    }
    
    async togglePinned(id) {
        const item = this.items.find(item => item.id === id);
        if (item) {
            item.anclado = !item.anclado;
            await storage.updateItem(id, { anclado: item.anclado });
            this.renderAll();
        }
    }

    async convertToLogro(id) {
        try {
            const updatedItem = await storage.convertToLogro(id);
            this.items = this.items.map(i => i.id === id ? updatedItem : i); 
            this.switchCategory('logros');
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
            this.renderItems();
        } catch (error) {
            console.error('Error updating task:', error);
            task.completado = !task.completado; // Revert on error
            this.showToast('Error al actualizar la tarea', 'error');
        }
    }

    async deleteItem(id) {
        try {
            await storage.deleteItem(id);
            this.items = this.items.filter(i => i.id !== id);
            this.renderAll();
            this.showToast('Elemento eliminado', 'success');
        } catch (error) {
            console.error('Error deleting item:', error);
            this.showToast('Error al eliminar', 'error');
        }
    }

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
        const filteredItemIds = this.getFilteredItems().map(item => item.id);
        if (checked) {
            filteredItemIds.forEach(id => this.selectedItems.add(id));
        } else {
            filteredItemIds.forEach(id => this.selectedItems.delete(id));
        }
        this.renderItems();
        this.updateSelectionUI();
    }
    
    async bulkTogglePinned() {
        const updates = [];
        const firstSelectedIsPinned = this.items.find(item => this.selectedItems.has(item.id))?.anclado;
        const targetState = !firstSelectedIsPinned;

        for (const id of this.selectedItems) {
             updates.push(storage.updateItem(id, { anclado: targetState }));
        }
        await Promise.all(updates);
        await this.loadData();
        this.selectedItems.clear();
        this.renderAll();
    }
    
    async handleBulkChangeCategory() {
        const newCategory = document.getElementById('bulkNewCategory').value;
        if (!newCategory) return;
        
        const updates = Array.from(this.selectedItems).map(id => storage.updateItem(id, { categoria: newCategory }));
        await Promise.all(updates);

        await this.loadData();
        this.selectedItems.clear();
        this.closeBulkCategoryModal();
        this.renderAll();
    }

    async handleBulkChangeTags() {
        const newTagsInput = document.getElementById('bulkNewTags').value;
        const newTags = newTagsInput.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag);

        if (newTags.length === 0) return;

        const updates = [];
        for (const id of this.selectedItems) {
            const item = this.items.find(i => i.id === id);
            if (item) {
                const updatedTags = [...new Set([...(item.etiquetas || []), ...newTags])];
                updates.push(storage.updateItem(id, { etiquetas: updatedTags }));
            }
        }
        await Promise.all(updates);
        
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
        this.showConfirmModal(
            'Eliminar Elemento',
            '¿Estás seguro de que quieres eliminar este elemento? Esta acción no se puede deshacer.',
            () => this.deleteItem(id)
        );
    }
    
    async bulkDelete() {
        const deletions = Array.from(this.selectedItems).map(id => storage.deleteItem(id));
        await Promise.all(deletions);
        
        this.items = this.items.filter(i => !this.selectedItems.has(i.id));
        this.selectedItems.clear();
        this.renderAll();
    }

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
        if (typeof this.confirmAction === 'function') {
            this.confirmAction();
        }
        this.closeConfirmModal();
    }
    
    openBulkCategoryModal() { document.getElementById('bulkCategoryModal').classList.remove('hidden'); }
    closeBulkCategoryModal() { document.getElementById('bulkCategoryModal').classList.add('hidden'); }
    openBulkTagsModal() { document.getElementById('bulkTagsModal').classList.remove('hidden'); }
    closeBulkTagsModal() { document.getElementById('bulkTagsModal').classList.add('hidden'); }
    
    openSettingsModal() {
        document.getElementById('settingsModal').classList.remove('hidden');
        document.getElementById('autoSaveVoice').checked = this.settings.autoSaveVoice;
        document.getElementById('themeSelect').value = this.settings.theme;
    }
    closeSettingsModal() {
        document.getElementById('settingsModal').classList.add('hidden');
    }

    openNewCategoryModal() {
        document.getElementById('newCategoryModal').classList.remove('hidden');
        document.getElementById('newCategoryNameInput').focus();
    }

    closeNewCategoryModal() {
        document.getElementById('newCategoryModal').classList.add('hidden');
        document.getElementById('newCategoryNameInput').value = '';
    }

    async addCustomCategory(newCategory) {
        const categoryName = newCategory.trim().toLowerCase();
        if (categoryName && !(this.settings.customCategories || []).includes(categoryName)) {
            this.settings.customCategories.push(categoryName);
            await this.saveData();
            this.renderNavigationTabs();
            this.populateCategorySelector();
            this.closeNewCategoryModal();
            this.showToast(`Categoría '${this.formatCategoryName(categoryName)}' añadida.`, 'success');
        } else if (categoryName) {
            this.showToast(`La categoría '${this.formatCategoryName(categoryName)}' ya existe.`, 'error');
        }
    }

    async removeCustomCategory(categoryToRemove) {
        // Re-categorize items to 'directorio'
        this.items.forEach(item => {
            if (item.categoria === categoryToRemove) {
                item.categoria = 'directorio';
            }
        });

        this.settings.customCategories = (this.settings.customCategories || []).filter(cat => cat !== categoryToRemove);
        await this.saveData();
        
        if (this.currentCategory === categoryToRemove) {
            this.switchCategory('todos');
        } else {
            this.renderAll();
        }

        this.renderNavigationTabs();
        this.populateCategorySelector();
        this.showToast(`Categoría '${this.formatCategoryName(categoryToRemove)}' eliminada.`, 'success');
    }

    async removeTag(tagToRemove, categoryContext) {
        // Remove from category-specific list
        if (this.settings.categoryTags && this.settings.categoryTags[categoryContext]) {
            this.settings.categoryTags[categoryContext] = this.settings.categoryTags[categoryContext].filter(tag => tag !== tagToRemove);
        }

        // Remove from all items (only those in the specified category)
        this.items.forEach(item => {
            if (item.categoria === categoryContext && item.etiquetas && item.etiquetas.includes(tagToRemove)) {
                item.etiquetas = item.etiquetas.filter(tag => tag !== tagToRemove);
            }
        });

        await this.saveData();
        this.renderAll(); // Re-render main view to reflect changes
        this.showToast(`Etiqueta '${this.formatTagText(tagToRemove)}' eliminada de la categoría '${this.formatCategoryName(categoryContext)}'.`, 'success');
    }

    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    truncateUrl(url, maxLength = 50) {
        if (url.length <= maxLength) return url;
        const cleanedUrl = url.replace(/^(https?:\/\/)/, '');
        if (cleanedUrl.length <= maxLength) return cleanedUrl;
        return cleanedUrl.substring(0, maxLength - 3) + '...';
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
        const modalOpen = !document.getElementById('itemModal').classList.contains('hidden');
        if (e.key === 'Escape') {
            this.closeModal();
            this.closeConfirmModal();
            this.closeBulkCategoryModal();
            this.closeSettingsModal();
        }
        if (!modalOpen && (e.ctrlKey || e.metaKey) && (e.key === 'n' || e.key === 'N')) {
            e.preventDefault();
            this.openModal();
        }
    }
    
    async handleImportFile(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            await storage.importData(file);
            await this.loadData();
            this.renderNavigationTabs();
            this.populateCategorySelector();
            this.renderAll();
            this.showToast('Datos importados correctamente', 'success');
        } catch (error) {
            this.showToast(`Error al importar: ${error.message}`, 'error');
        } finally {
            event.target.value = '';
        }
    }
    
    handleCardClick(event, id) {
        if (event.target.closest('button, input, a, .card__tag')) {
            return;
        }
        this.openModal(id);
    }
}