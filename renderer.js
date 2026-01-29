export class Renderer {
    constructor(appContext) {
        this.app = appContext;
        this.containers = {
            grid: document.getElementById('gallery'), // New ID
            tagTabs: document.getElementById('tagFilters'), // New ID
            kaiCard: null // Kai Card is now dynamic in render
        };
    }

    render(store, selectedItems) {
        const items = store.getFilteredItems();
        const activeTag = store.filters.tag || 'all';

        this.renderSidebarContent(items, activeTag, store.items.length === 0, selectedItems);
        this.renderTagTabs(store.getAllTags(), activeTag);

        // Update Auth Visuals
        const user = store.user;
        const authSection = document.getElementById('authSection');
        if (user) {
            document.getElementById('loginBtn').classList.add('hidden');
            document.getElementById('userProfile').classList.remove('hidden');
            document.getElementById('userAvatar').src = user.photoURL;
            document.getElementById('userName').textContent = user.displayName.split(' ')[0];
            document.getElementById('statusInfo').textContent = 'ONLINE';
            document.getElementById('statusInfo').style.background = '#00FF00';
            document.getElementById('statusInfo').style.color = '#000';
        } else {
            document.getElementById('loginBtn').classList.remove('hidden');
            document.getElementById('userProfile').classList.add('hidden');
            document.getElementById('statusInfo').textContent = 'OFFLINE';
            document.getElementById('statusInfo').style.background = '#000';
            document.getElementById('statusInfo').style.color = '#FFF';
        }
    }

    renderSidebarContent(items, activeTag, isEmpty, selectedItems) {
        if (!this.containers.grid) return;

        let html = '';

        // 1. KAI CARD (Always First)
        // Check if we are in "Kai View" (no specific item selected)
        const isKaiActive = this.app.currentId === null;

        // Logic: Show Kai if current filter is 'all' or specific search
        if (activeTag === 'all') {
            html += `
            <div class="neo-card kai-card ${isKaiActive ? 'active-card' : ''}" data-action="open-kai">
                <span class="card-tag">#ASISTENTE</span>
                <div class="card-title">KAI CHAT ⚡</div>
            </div>`;
        }

        // 2. ITEMS
        html += items.map(item => this.createItemCard(item, selectedItems.has(item.id))).join('');

        this.containers.grid.innerHTML = html;
    }

    createItemCard(item, isSelected) {
        // Tag Logic: Take first tag or 'General'
        const tag = (item.etiquetas && item.etiquetas.length > 0) ? item.etiquetas[0] : 'NOTA';

        return `
            <div class="neo-card ${isSelected ? 'active-card' : ''}" data-id="${item.id}" data-action="open-item">
                <span class="card-tag">#${tag.toUpperCase()}</span>
                <div class="card-title">${item.titulo || 'Sin Título'}</div>
                <div style="font-size: 0.8rem; margin-top:5px; opacity:0.8;">${item.descripcion ? item.descripcion.substring(0, 50) + '...' : ''}</div>
            </div>`;
    }

    renderTagTabs(allTags, activeTag) {
        if (!this.containers.tagTabs) return;

        let html = `<button class="filter-chip ${!activeTag || activeTag === 'all' ? 'active' : ''}" data-action="filter-tag" data-tag="all">Todo</button>`;

        Array.from(allTags).sort().forEach(tag => {
            html += `<button class="filter-chip ${activeTag === tag ? 'active' : ''}" data-action="filter-tag" data-tag="${tag}">#${tag.toUpperCase().substring(0, 5)}</button>`;
        });

        this.containers.tagTabs.innerHTML = html;
    }

    // VIEW TOGGLER
    toggleView(view) {
        const kaiView = document.getElementById('kaiView');
        const editorView = document.getElementById('editorView');
        const headerTitle = document.getElementById('headerTitle');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');

        if (view === 'kai') {
            kaiView.classList.remove('hidden');
            editorView.classList.add('hidden');
            headerTitle.textContent = "KAI CHAT";
        } else if (view === 'editor') {
            kaiView.classList.add('hidden');
            editorView.classList.remove('hidden');
            // Title updated by openWorkspace
        }

        // Mobile Sidebar Close
        sidebar.classList.remove('show');
        overlay.classList.remove('active');

        // Re-render to update active card state
        this.app.store.notify();
    }

    // TASKS RENDERER (Checklist)
    renderChecklist(tasks) {
        const container = document.getElementById('checklistContainer');
        if (!container) return;
        container.innerHTML = (tasks || []).map((task, idx) => `
            <div class="checklist-item">
                <input type="checkbox" ${task.completado ? 'checked' : ''} data-index="${idx}" data-action="toggle-task">
                <input type="text" value="${task.titulo}" class="neo-input-flat" data-index="${idx}" data-action="edit-task" style="border-bottom: 1px dotted #ccc;">
            </div>
        `).join('');
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
