export class Renderer {
    constructor(appContext) {
        this.app = appContext;
        this.containers = {
            grid: document.getElementById('itemsContainer'),
            tagBar: document.getElementById('tagFilterBar'),
            navTabs: document.querySelectorAll('.filter-chip'),
            emptyState: document.getElementById('emptyState'),
            selectionCount: document.getElementById('selectionCount'),
            bulkActions: document.getElementById('bulkActions'),
            selectAll: document.getElementById('selectAllCheckbox')
        };
    }

    render(store, selectedItems) {
        const items = store.getFilteredItems();
        this.renderGrid(items, selectedItems);
        this.updateSelectionUI(selectedItems, items);
        this.updateEmptyState(items.length, store.filters.category);
        this.updateNavTabs(store.filters.category);
        this.renderTagFilterBar(store.getAllTags(), store.filters.tag);
    }

    renderGrid(items, selectedItems) {
        if (!this.containers.grid) return;
        if (items.length === 0) {
            this.containers.grid.innerHTML = '';
            return;
        }

        this.containers.grid.innerHTML = items.map(item => this.createItemCard(item, selectedItems.has(item.id))).join('');
    }

    createItemCard(item, isSelected) {
        const date = new Date(item.fecha_creacion).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        const cleanTitle = (item.titulo || '').replace(/"/g, '&quot;');
        const cleanDesc = (item.descripcion || item.url || 'Sin descripción').replace(/</g, '&lt;');

        return `
            <div class="card ${isSelected ? 'selected' : ''}" data-id="${item.id}" data-action="handle-card-click">
                <span class="card__cat-icon material-symbols-outlined">${this.getCategoryIcon(item.categoria)}</span>
                <h3 class="card__title">${cleanTitle}</h3>
                <span class="card__date">${date}</span>
                <p class="card__snippet">${cleanDesc}</p>
                <div class="card__tags">
                    ${(item.etiquetas || []).slice(0, 3).map(t => `<span class="card__tag" data-tag="${t}">#${t}</span>`).join('')}
                </div>
                ${item.anclado ? '<span class="card__pin pinned material-symbols-outlined" style="grid-area:date; justify-self:end; color:orange;">push_pin</span>' : ''}
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
        if (selectAll && visibleItems.length > 0) {
            selectAll.checked = visibleItems.every(i => selectedItems.has(i.id));
        }
    }

    updateEmptyState(count, category) {
        const { emptyState } = this.containers;
        if (emptyState) {
            emptyState.classList.toggle('hidden', count > 0);
            if (count === 0) emptyState.querySelector('p').textContent = `Nada en ${category}...`;
        }
    }

    updateNavTabs(category) {
        this.containers.navTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === category);
        });
    }

    renderTagFilterBar(allTags, activeTag) {
        const { tagBar } = this.containers;
        if (!tagBar) return;

        if (allTags.size === 0) {
            tagBar.style.display = 'none';
            return;
        }
        tagBar.style.display = 'flex';
        const tags = Array.from(allTags).sort();
        tagBar.innerHTML = tags.map(tag =>
            `<span class="tag-chip ${tag === activeTag ? 'active' : ''}" data-action="filter-by-tag-bar" data-tag="${tag}">#${tag}</span>`
        ).join('');
    }

    // MAIN VIEW TOGGLER (Mobile Master-Detail)
    toggleMainView(viewName) {
        const app = document.querySelector('.app-container');
        const chat = document.getElementById('mainChat');
        const ws = document.getElementById('workspacePanel');

        // Reset visibility classes
        chat.classList.remove('visible');
        ws.classList.remove('visible');

        if (viewName === 'sidebar') {
            app.classList.remove('view-content');
            // Desktop: default to chat if going back?
            if (window.innerWidth > 768) {
                chat.classList.add('visible'); // Show placeholder
            }
        } else {
            app.classList.add('view-content');
            if (viewName === 'chat') chat.classList.add('visible');
            if (viewName === 'workspace') ws.classList.add('visible');
        }
    }

    // HELPERS
    getCategoryIcon(c) {
        const map = { directorio: 'folder', ideas: 'lightbulb', proyectos: 'work', logros: 'emoji_events', todos: 'select_all' };
        return map[c] || 'category';
    }

    // MODAL HELPERS
    populateCategorySelector(select, includeNew = false) {
        if (!select) return;
        select.innerHTML = '';
        const defs = ['directorio', 'ideas', 'proyectos', 'logros'];
        const customs = this.app.store.settings.customCategories || [];
        [...defs, ...customs].forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c.charAt(0).toUpperCase() + c.slice(1);
            select.appendChild(opt);
        });
        if (includeNew) {
            const opt = document.createElement('option');
            opt.value = '__new_category__';
            opt.textContent = '+ Nueva...';
            select.appendChild(opt);
        }
    }

    renderCustomCategories(list) {
        const container = document.getElementById('customCategoriesList');
        if (!container) return;
        container.innerHTML = list.map(c =>
            `<div class="custom-category-item"><span>${c}</span> <button class="btn btn--icon btn--danger" onclick="window.app.confirmDeleteCategory('${c}')">×</button></div>`
        ).join('');
    }

    renderGlobalTags(set) {
        const container = document.getElementById('globalTagsList');
        if (!container) return;
        container.innerHTML = Array.from(set).map(t =>
            `<div class="custom-category-item"><span>#${t}</span> <button class="btn btn--icon btn--danger" onclick="window.app.confirmDeleteTag('${t}')">×</button></div>`
        ).join('');
    }

    showConfirmModal(title, msg, onConfirm) {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = msg;
        const btn = document.getElementById('confirmOkBtn');
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.onclick = () => { onConfirm(); document.getElementById('confirmModal').classList.add('hidden'); };
        document.getElementById('confirmModal').classList.remove('hidden');
    }
}
