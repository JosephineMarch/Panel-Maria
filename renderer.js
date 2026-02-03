export class Renderer {
    constructor(appContext) {
        this.app = appContext;
    }

    render(store) {
        this.renderAuth(store.user);
        this.renderTagFilters(store);
        this.renderGallery(store);
    }

    renderAuth(user) {
        const loginBtn = document.getElementById('loginBtn');
        const userProfile = document.getElementById('userProfile');
        const statusInfo = document.getElementById('statusInfo');

        if (user) {
            loginBtn.classList.add('hidden');
            userProfile.classList.remove('hidden');
            document.getElementById('userAvatar').src = user.photoURL || '';
            document.getElementById('userName').textContent = user.displayName?.split(' ')[0] || 'Usuario';
            statusInfo.textContent = 'ONLINE';
            statusInfo.style.background = 'var(--accent-green)';
            statusInfo.style.color = 'black';
        } else {
            loginBtn.classList.remove('hidden');
            userProfile.classList.add('hidden');
            statusInfo.textContent = 'OFFLINE';
            statusInfo.style.background = 'var(--black)';
            statusInfo.style.color = 'var(--white)';
        }
    }

    renderGallery(store) {
        const gallery = document.getElementById('gallery');
        if (!gallery) return;

        const items = store.getFilteredItems();
        gallery.innerHTML = '';

        if (items.length === 0) {
            gallery.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 60px; opacity: 0.5;">
                <p style="font-size: 1.5rem; margin-bottom: 10px;">✨ Tu cerebro está limpio ✨</p>
                <p>Cuéntale algo a Kai para empezar.</p>
            </div>`;
            return;
        }

        items.forEach(item => {
            const card = document.createElement('div');
            const stateClass = `state-${item.estado || 'planeacion'}`;
            const tipo = item.tipo || 'chispa';

            card.className = `bento-card ${stateClass}`;
            card.innerHTML = `
                <div class="card-top">
                    <span class="card-type">${tipo}</span>
                    ${item.anclado ? '<i data-lucide="pin" style="width:14px; height:14px;"></i>' : ''}
                </div>
                <h3 class="card-title">${item.titulo || 'Sin Título'}</h3>
                ${item.descripcion ? `<p class="card-desc">${item.descripcion}</p>` : ''}
                <div class="card-footer">
                    ${(item.etiquetas || []).map(t => `<span class="chip-tag">#${t}</span>`).join('')}
                </div>
            `;

            card.onclick = () => {
                const event = new CustomEvent('edit-item', { detail: { id: item.id } });
                window.dispatchEvent(event);
            };
            gallery.appendChild(card);
        });

        if (window.lucide) window.lucide.createIcons();
    }

    renderTagFilters(store) {
        const container = document.getElementById('tagFilters');
        if (!container) return;

        const tags = Array.from(store.getAllTags());
        const activeTag = store.filters.tag;

        container.innerHTML = `<button class="filter-chip ${!activeTag ? 'active' : ''}" data-tag="all">Todo</button>`;

        tags.forEach(tag => {
            const btn = document.createElement('button');
            btn.className = `filter-chip ${activeTag === tag ? 'active' : ''}`;
            btn.textContent = tag;
            btn.onclick = (e) => {
                e.stopPropagation();
                this.app.store.setTagFilter(tag);
            };
            container.appendChild(btn);
        });

        container.querySelector('[data-tag="all"]').onclick = (e) => {
            e.stopPropagation();
            this.app.store.setTagFilter(null);
        };
    }

    showView(viewId) {
        const views = ['kaiView', 'galleryView', 'editorView'];
        views.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.toggle('hidden', id !== viewId);
        });

        // Update nav buttons
        const navMap = {
            'kaiView': 'btnChatView',
            'galleryView': 'btnGalleryView'
        };

        const activeBtnId = navMap[viewId];
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.id === activeBtnId);
        });

        // Update title
        const titleMap = {
            'kaiView': 'KAI CHAT ⚡',
            'galleryView': 'MIS BLOQUES 🧠',
            'editorView': 'EDITANDO ✏️'
        };
        const titleEl = document.getElementById('viewTitle');
        if (titleEl) titleEl.textContent = titleMap[viewId] || 'PANEL-MARÍA';

        // Close sidebar on mobile
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        if (window.innerWidth < 900) {
            sidebar.classList.remove('show');
            overlay.classList.remove('active');
        }
    }

    renderChecklist(tasks) {
        const container = document.getElementById('checklistContainer');
        if (!container) return;
        container.innerHTML = (tasks || []).map((task, idx) => `
            <div class="checklist-item">
                <input type="checkbox" ${task.completado ? 'checked' : ''} data-index="${idx}" class="task-check">
                <input type="text" value="${task.titulo}" class="neo-input-flat task-title" data-index="${idx}">
            </div>
        `).join('');
    }
}
