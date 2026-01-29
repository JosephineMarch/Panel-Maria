
/*
================================================================================
|       PANEL MARÍA - RENDERER (Gestión Visual y DOM)                          |
================================================================================
*/

export class Renderer {
    constructor(appContext) {
        this.app = appContext; // Reference to main app for callbacks
        this.containers = {
            grid: document.getElementById('itemsContainer'),
            navTabs: document.querySelectorAll('.filter-chip'),
            emptyState: document.getElementById('emptyState'),
            selectionCount: document.getElementById('selectionCount'),
            bulkActions: document.getElementById('bulkActions'),
            selectAll: document.getElementById('selectAllCheckbox')
        };
    }

    /**
     * Main Render Loop
     * @param {import('./store.js').Store} store 
     * @param {Set} selectedItems 
     */
    render(store, selectedItems) {
        const items = store.getFilteredItems();

        // 1. Render Grid
        this.renderGrid(items, selectedItems);

        // 2. Update Selection UI
        this.updateSelectionUI(selectedItems, items);

        // 3. Update Empty State
        this.updateEmptyState(items.length, store.filters.category);

        // 4. Update Filter Tabs State
        this.updateNavTabs(store.filters.category);
    }

    renderGrid(items, selectedItems) {
        if (!this.containers.grid) return;

        if (items.length === 0) {
            this.containers.grid.innerHTML = '';
            return;
        }

        // Optimization: In a real VirtualDOM we would diff. 
        // Here we just rebuild string for simplicity but it's fast enough for <1000 items.
        // We use event delegation in App, so we don't need to attach listeners to cards.
        this.containers.grid.innerHTML = items.map(item => this.createItemCard(item, selectedItems.has(item.id))).join('');
    }

    createItemCard(item, isSelected) {
        const date = new Date(item.fecha_creacion).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        const categoryIcon = this.getCategoryIcon(item.categoria);
        const escape = (text) => (text || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

        return `
            <div class="card ${isSelected ? 'selected' : ''}" data-id="${item.id}" data-action="handle-card-click">
                <div class="card__header">
                    <span class="card__cat-icon material-symbols-outlined">${categoryIcon}</span>
                    <button class="card__pin ${item.anclado ? 'pinned' : ''}" data-action="toggle-pinned" title="Anclar">
                        <span class="material-symbols-outlined">push_pin</span>
                    </button>
                </div>
                <h3 class="card__title">${escape(item.titulo)}</h3>
                <p class="card__snippet">
                    ${escape(item.descripcion || item.url || 'Sin descripción')}
                </p>
                
                ${item.etiquetas && item.etiquetas.length > 0 ? `
                <div class="card__tags">
                    ${item.etiquetas.slice(0, 3).map(tag => `<span class="card__tag" data-action="filter-by-tag" data-tag="${tag}">#${tag}</span>`).join('')}
                    ${item.etiquetas.length > 3 ? `<span class="card__tag">+${item.etiquetas.length - 3}</span>` : ''}
                </div>
                ` : ''}

                <div class="card__footer">
                    <span class="card__date">${date}</span>
                    ${item.url ? '<span class="material-symbols-outlined" style="font-size: 1rem; color: var(--accent-blue);">link</span>' : ''}
                </div>
            </div>`;
    }

    updateSelectionUI(selectedItems, visibleItems) {
        const { bulkActions, selectionCount, selectAll } = this.containers;

        if (bulkActions && selectionCount) {
            if (selectedItems.size > 0) {
                bulkActions.classList.remove('hidden');
                selectionCount.textContent = selectedItems.size;
            } else {
                bulkActions.classList.add('hidden');
            }
        }

        if (selectAll) {
            if (visibleItems.length > 0) {
                const allVisibleSelected = visibleItems.every(item => selectedItems.has(item.id));
                selectAll.checked = allVisibleSelected;
                selectAll.indeterminate = !allVisibleSelected && visibleItems.some(item => selectedItems.has(item.id));
            } else {
                selectAll.checked = false;
                selectAll.indeterminate = false;
            }
        }
    }

    updateEmptyState(count, category) {
        if (!this.containers.emptyState) return;
        this.containers.emptyState.classList.toggle('hidden', count > 0);
        if (count === 0) {
            const textElement = this.containers.emptyState.querySelector('.empty-state__text');
            if (textElement) textElement.textContent = `No hay elementos en "${this.formatCategoryName(category)}"`;
        }
    }

    updateNavTabs(currentCategory) {
        this.containers.navTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === currentCategory);
        });
    }

    renderTagFilterBar(allTags, activeTag) {
        const container = document.getElementById('tagFilterBar');
        if (!container) return;

        if (allTags.size === 0) {
            container.innerHTML = '';
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';
        // Convert to array and sort
        const tags = Array.from(allTags).sort();

        container.innerHTML = tags.map(tag => {
            const isActive = tag === activeTag;
            return `<span class="tag-chip ${isActive ? 'active' : ''}" data-action="filter-by-tag-bar" data-tag="${tag}">#${tag}</span>`;
        }).join('');
    }

    toggleMainView(view) {
        const chatPanel = document.getElementById('chat-messages'); // chat messages area
        const inputBar = document.querySelector('.chat-input-bar'); // chat input
        const wsPanel = document.getElementById('workspacePanel');

        if (view === 'workspace') {
            chatPanel.classList.add('hidden');
            inputBar.classList.add('hidden');
            wsPanel.classList.remove('hidden');
        } else {
            chatPanel.classList.remove('hidden');
            inputBar.classList.remove('hidden');
            wsPanel.classList.add('hidden');
        }
    }

    // --- Helpers ---
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

    formatCategoryName(name) {
        return name.charAt(0).toUpperCase() + name.slice(1);
    }

    // --- Modal Populations ---

    // --- Actions Proxy Helper ---
    bindAction(element, event, handler) {
        if (element) element.addEventListener(event, handler);
    }

    // --- Modal Populations ---

    populateItemModal(item) {
        document.getElementById('itemId').value = item.id;
        document.getElementById('itemTitle').value = item.titulo || '';
        document.getElementById('itemDescription').value = item.descripcion || '';
        document.getElementById('itemUrl').value = item.url || '';
        document.getElementById('itemPinned').checked = item.anclado || false;

        // Populate Categories (Dynamic)
        this.populateCategorySelector(document.getElementById('itemCategory'), true);
        document.getElementById('itemCategory').value = item.categoria;
        this.toggleNewCategoryInput(item.categoria);

        // Tasks
        const tasksList = document.getElementById('tasksList');
        tasksList.innerHTML = '';
        if (item.tareas && item.tareas.length > 0) {
            item.tareas.forEach(task => this.addTaskField(task));
        } else {
            this.addTaskField(); // Always show one empty field
        }
    }

    clearItemModal() {
        document.getElementById('itemId').value = '';
        document.getElementById('itemForm').reset();
        document.getElementById('tasksList').innerHTML = '';
        this.populateCategorySelector(document.getElementById('itemCategory'), true);
        this.addTaskField();
        this.toggleNewCategoryInput('');
    }

    populateCategorySelector(selector, includeNewOption = false) {
        if (!selector) return;
        selector.innerHTML = '';

        // Default categories
        const predefinedCategories = ['directorio', 'ideas', 'proyectos', 'logros'];

        // Get custom from Store (via App or direct if we passed store settings to render)
        // Renderer doesn't persist settings, so we need to ask App or Store.
        // We will assume App passes the list or we access via this.app.store.settings
        const customCategories = this.app?.store?.settings?.customCategories || [];

        const allCategories = [...new Set([...predefinedCategories, ...customCategories])];

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

    toggleNewCategoryInput(value) {
        const group = document.getElementById('newCategoryInputGroup');
        if (group) group.style.display = value === '__new_category__' ? 'block' : 'none';
    }

    addTaskField(task = null) {
        const tasksList = document.getElementById('tasksList');
        const div = document.createElement('div');
        div.className = 'task-item';
        // Escape HTML for safety
        const title = (task?.titulo || '').replace(/"/g, '&quot;');

        div.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${task && task.completado ? 'checked' : ''}>
            <input type="text" class="task-input input-field" placeholder="Tarea..." value="${title}">
            <button type="button" class="btn btn--icon btn--text btn--danger remove-task-btn"><span class="material-symbols-outlined">delete</span></button>
        `;
        div.querySelector('.remove-task-btn').addEventListener('click', () => {
            if (tasksList.children.length > 1) div.remove();
            else { div.querySelector('.task-input').value = ''; div.querySelector('.task-checkbox').checked = false; }
        });
        tasksList.appendChild(div);
    }

    // --- Confirmation Modal ---

    showConfirmModal(title, message, onConfirm) {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;

        const modal = document.getElementById('confirmModal');
        modal.classList.remove('hidden');

        // Remove old listeners to avoid stacking
        const okBtn = document.getElementById('confirmOkBtn');
        const newOkBtn = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);

        newOkBtn.addEventListener('click', () => {
            if (onConfirm) onConfirm();
            modal.classList.add('hidden');
        });

        // Cancel/Close is handled by App's setupEventListeners (static) or we can re-bind here if needed.
        // App's static listener calls closeConfirmModal just fine.
    }

    closeConfirmModal() {
        document.getElementById('confirmModal').classList.add('hidden');
    }

    // --- Settings UI ---

    renderCustomCategories(categories) {
        const container = document.getElementById('customCategoriesList');
        if (!container) return;
        container.innerHTML = '';

        if (!categories || categories.length === 0) {
            container.innerHTML = '<p>No hay categorías personalizadas.</p>';
            return;
        }

        categories.forEach(category => {
            const div = document.createElement('div');
            div.className = 'custom-category-item';
            div.innerHTML = `
                <span>${this.formatCategoryName(category)}</span>
                <button class="btn btn--icon btn--danger delete-category-btn" data-category="${category}">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            `;
            // Bind delete with callback to App
            div.querySelector('.delete-category-btn').addEventListener('click', () => {
                this.app.confirmDeleteCategory(category);
            });
            container.appendChild(div);
        });
    }

    renderGlobalTags(allTags) {
        const container = document.getElementById('globalTagsList');
        if (!container) return;
        container.innerHTML = '';

        if (allTags.size === 0) {
            container.innerHTML = '<p>No hay etiquetas globales.</p>';
            return;
        }

        Array.from(allTags).sort().forEach(tag => {
            const div = document.createElement('div');
            div.className = 'custom-category-item';
            // Format tag helper
            const formatTag = t => t.charAt(0).toUpperCase() + t.slice(1);
            div.innerHTML = `
                <span>${formatTag(tag)}</span>
                <button class="btn btn--icon btn--danger delete-tag-btn" data-tag="${tag}">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            `;
            div.querySelector('.delete-tag-btn').addEventListener('click', () => {
                this.app.confirmDeleteTag(tag);
            });
            container.appendChild(div);
        });
    }

    applyTheme(theme) {
        document.body.className = '';
        if (theme !== 'default') document.body.classList.add(`theme-${theme}`);
    }
}
