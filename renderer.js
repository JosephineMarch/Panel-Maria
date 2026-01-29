export class Renderer {
    constructor(appContext) {
        this.app = appContext;
        this.containers = {
            grid: document.getElementById('itemsContainer'),
            tagTabs: document.getElementById('tagTabs'),
            kaiCard: document.getElementById('kaiCard')
        };
    }

    render(store, selectedItems) {
        const items = store.getFilteredItems();
        this.renderGrid(items, selectedItems);
        this.renderTagTabs(store.getAllTags(), store.filters.tag);
    }

    renderGrid(items, selectedItems) {
        if (!this.containers.grid) return;

        // Items Map
        this.containers.grid.innerHTML = items.map(item => this.createItemCard(item, selectedItems.has(item.id))).join('');
    }

    createItemCard(item, isSelected) {
        const date = new Date(item.fecha_creacion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        // Generate random color for avatar base on char code
        const colors = ['#FF9800', '#F44336', '#2196F3', '#4CAF50', '#9C27B0'];
        const color = colors[item.titulo.charCodeAt(0) % colors.length] || '#9E9E9E';

        return `
            <div class="card ${isSelected ? 'selected' : ''}" data-id="${item.id}" data-action="open-item">
                <div class="card__avatar" style="background-color: ${color}">
                    ${item.titulo.charAt(0).toUpperCase()}
                </div>
                <div class="card__content">
                    <div class="card__header">
                        <h3 class="card__title">${item.titulo || 'Sin Título'}</h3>
                        <span class="card__time">${date}</span>
                    </div>
                    <p class="card__preview">${item.descripcion || 'Sin contenido adicional...'}</p>
                </div>
            </div>`;
    }

    renderTagTabs(allTags, activeTag) {
        const tabsFn = (tag, label) => `
            <button class="tab-chip ${activeTag === tag ? 'active' : ''}" 
                data-action="filter-tag" data-tag="${tag || ''}">
                ${label}
            </button>`;

        let html = tabsFn(null, 'Todo'); // 'Todo' tab
        Array.from(allTags).forEach(tag => {
            html += tabsFn(tag, `#${tag}`);
        });

        if (this.containers.tagTabs) this.containers.tagTabs.innerHTML = html;
    }

    // UNIFIED VIEW TOGGLER (Mobile Slider Logic)
    toggleView(view, viewId = null) {
        // IDs: 'kai', 'workspace'
        const app = document.querySelector('.app-container');
        const chat = document.getElementById('mainChat');
        const ws = document.getElementById('workspacePanel');
        const kaiCard = document.getElementById('kaiCard');

        // Reset Card Selection Visuals
        document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
        if (view === 'kai') kaiCard.classList.add('selected');

        // Panel Visibility (Desktop & Mobile)
        if (view === 'kai') {
            chat.classList.remove('hidden');
            ws.classList.add('hidden');
        } else if (view === 'workspace') {
            chat.classList.add('hidden');
            ws.classList.remove('hidden');
        }

        // Mobile Slide Move
        if (view === 'list') {
            app.classList.remove('show-chat');
            app.classList.add('show-list');
        } else {
            app.classList.remove('show-list');
            app.classList.add('show-chat'); // 'show-chat' implies showing RIGHT panel
        }
    }

    // HELPERS & MODALS (Simplified)
    populateCategorySelector(select) {
        // Deprecated: No more category selection
        if (select) select.innerHTML = '';
    }

    renderCustomCategories(list) {
        // Deprecated
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
