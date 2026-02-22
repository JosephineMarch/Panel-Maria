import { CONFIG } from './supabase.js';

export const ui = {
    // Cache de elementos del DOM
    elements: {
        container: () => document.getElementById('items-container'),
        breadcrumb: () => document.getElementById('breadcrumb'),
        sidebar: () => document.getElementById('sidebar'),
        modalEdit: () => document.getElementById('modal-edit'),
        editForm: () => document.getElementById('edit-form'),
        inputMain: () => document.getElementById('item-input'),
        typeSelect: () => document.getElementById('item-type'),
        voiceOverlay: () => document.getElementById('voice-overlay'),
        tasksContainer: () => document.getElementById('edit-tasks-container'),
        userEmail: () => document.getElementById('user-email'),
        authForm: () => document.getElementById('auth-form'),
        userInfo: () => document.getElementById('user-info'),
        voiceBtn: () => document.getElementById('btn-voice-footer') || document.getElementById('btn-voice'),
        btnSubmit: () => document.getElementById('btn-submit'),
        kaiBubble: () => document.getElementById('kai-bubble'),
        kaiText: () => document.getElementById('kai-text'),
        kaiAvatar: () => document.getElementById('kai-avatar')
    },

    init() {
        // Asegurar que el contenedor existe
        if (!this.elements.container()) {
            const container = document.createElement('div');
            container.id = 'items-container';
            const app = document.getElementById('app');
            if (app) app.appendChild(container);
        }
    },

    // --- RENDERIZADO ---

    render(items = []) {
        const container = this.elements.container();
        if (!container) return;

        container.innerHTML = '';

        if (items.length === 0) {
            container.innerHTML = `
                <div class="col-span-full py-20 text-center opacity-50">
                    <span class="text-6xl">🏜️</span>
                    <p class="mt-4 font-bold text-ink">Bandeja vacía. ¡Suelta una idea!</p>
                </div>
            `;
            return;
        }

        items.forEach(item => {
            container.appendChild(this.createItemCard(item));
        });
    },

    createItemCard(item) {
        const isProject = item.type === 'proyecto' || item.type === 'project';
        const isAchievement = item.type === 'logro';
        const isReminder = item.type === 'reminder' || item.type === 'alarma';
        const id = item.id;

        const typeConfig = {
            proyecto: { color: 'sugar-pink', icon: '🎨', gradient: 'from-sugar-pink to-pink-200' },
            logro: { color: 'mint', icon: '✨' },
            idea: { color: 'lemon', icon: '💡' },
            directorio: { color: 'soft-blue', icon: '🔗' },
            reminder: { color: 'peach', icon: '⏰' },
            note: { color: 'lavender', icon: '📝' }
        };

        const config = typeConfig[item.type] || typeConfig['note'];
        const card = document.createElement('div');

        if (isProject) {
            card.className = "bg-white rounded-[2rem] shadow-sticker transition-all hover:shadow-lg overflow-hidden border border-gray-100 mb-6 w-full";

            let progressWidth = '0%';
            if (item.tareas && item.tareas.length > 0) {
                const completed = item.tareas.filter(t => t.completado).length;
                progressWidth = `${Math.round((completed / item.tareas.length) * 100)}%`;
            }

            card.innerHTML = `
                <div class="bg-gradient-to-r ${config.gradient || 'from-sugar-pink to-pink-200'} p-5 text-white cursor-pointer group">
                    <div class="flex justify-between items-start">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl bg-white/20 p-2 rounded-xl backdrop-blur-sm">${config.icon}</span>
                            <div>
                                <div class="flex gap-2 mb-1">
                                    <span class="text-[10px] font-bold bg-white/30 px-2 py-0.5 rounded-full uppercase">PROYECTO</span>
                                    ${item.anclado ? '<span class="text-[10px] font-bold bg-red-400/80 px-2 py-0.5 rounded-full">PIN</span>' : ''}
                                </div>
                                <h3 class="font-bold text-lg leading-tight group-hover:underline">${this.escapeHtml(item.content)}</h3>
                            </div>
                        </div>
                        <i class="fa-solid fa-chevron-right bg-white/20 p-2 rounded-full text-xs transition-transform group-hover:translate-x-1" data-id="${id}" data-action="open"></i>
                    </div>
                    <div class="mt-4 flex items-center gap-2 text-xs font-bold">
                        <div class="flex-1 bg-black/10 rounded-full h-2">
                            <div class="bg-white h-2 rounded-full shadow-sm transition-all duration-700" style="width: ${progressWidth}"></div>
                        </div>
                        <span>${progressWidth}</span>
                    </div>
                </div>
                <div class="p-5 bg-white space-y-4">
                    ${item.descripcion ? `<p class="text-sm text-gray-500 italic">${this.escapeHtml(item.descripcion)}</p>` : ''}
                    ${item.tareas && item.tareas.length > 0 ? `
                        <div class="space-y-2">
                            ${item.tareas.slice(0, 3).map(t => `
                                <label class="flex items-center gap-3 group cursor-pointer ${t.completado ? 'opacity-50' : ''}">
                                    <input type="checkbox" class="kawaii-checkbox" ${t.completado ? 'checked' : ''} disabled>
                                    <span class="text-sm ${t.completado ? 'line-through decoration-pink-300 text-gray-400' : 'font-bold text-gray-700'}">${this.escapeHtml(t.titulo)}</span>
                                </label>
                            `).join('')}
                        </div>
                    ` : ''}
                    <div class="flex gap-2 pt-2">
                        <button class="action-edit bg-gray-50 hover:bg-sugar-pink hover:text-white px-4 py-2 rounded-xl text-xs font-bold text-gray-500 transition border border-gray-100" data-id="${id}" data-focus="tasks">+ Tarea</button>
                        <button class="action-open bg-sugar-pink text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm" data-id="${id}">Ver Proyecto 📁</button>
                    </div>
                </div>
            `;
        } else {
            card.className = "bg-white rounded-[1.5rem] p-5 shadow-sticker border border-gray-100 flex gap-4 items-center group relative hover:z-10 transition-all mb-4 w-full";

            let deadlineHtml = '';
            if (item.deadline) {
                const date = new Date(item.deadline);
                const isPast = date < new Date();
                deadlineHtml = `
                    <p class="text-[10px] font-bold ${isPast ? 'text-red-400' : 'text-peach'} mt-1 flex items-center gap-1">
                        <i class="fa-solid fa-clock"></i> ${date.toLocaleString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                `;
            }

            card.innerHTML = `
                <div class="w-12 h-12 ${isReminder ? 'bg-peach/20 text-peach' : 'bg-lavender text-lavender-700'} rounded-2xl flex items-center justify-center shrink-0 border border-current/10">
                    <span class="text-2xl">${config.icon}</span>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-0.5">${item.type}</p>
                    <h3 class="text-sm font-bold text-ink truncate group-hover:text-brand transition-colors">${this.escapeHtml(item.content)}</h3>
                    ${deadlineHtml}
                    ${item.url ? `<a href="${item.url}" target="_blank" class="text-[10px] text-soft-blue hover:underline block truncate mt-1" onclick="event.stopPropagation()">${item.url.replace(/^https?:\/\//, '')}</a>` : ''}
                </div>
                <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="action-edit p-2 text-gray-300 hover:text-brand transition" data-id="${id}"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="action-finish p-2 text-gray-300 hover:text-success transition" data-id="${id}"><i class="fa-solid fa-check-circle"></i></button>
                </div>
                ${item.anclado ? `<span class="absolute top-2 right-2 text-xs">📌</span>` : ''}
            `;
        }

        return card;
    },

    renderBreadcrumb(path = []) {
        const bread = this.elements.breadcrumb();
        if (!bread) return;

        let html = '<a href="#" data-action="home" class="hover:text-brand transition">Inicio</a>';
        path.forEach(item => {
            html += ` <span class="mx-1 text-gray-300">/</span> <a href="#" data-id="${item.id}" data-action="navigate" class="hover:text-brand transition">${this.truncate(item.content, 20)}</a>`;
        });
        bread.innerHTML = html;
    },

    // --- GESTIÓN DE FORMULARIOS ---

    getMainInputData() {
        return {
            content: this.elements.inputMain().value.trim(),
            type: this.elements.typeSelect().value
        };
    },

    clearMainInput() {
        this.elements.inputMain().value = '';
    },

    getEditFormData() {
        const id = document.getElementById('edit-id').value;
        const content = document.getElementById('edit-content').value;
        const type = document.getElementById('edit-type').value;
        const descripcion = document.getElementById('edit-description').value;
        const url = document.getElementById('edit-url').value;
        const tagsStr = document.getElementById('edit-tags').value;

        const date = document.getElementById('edit-deadline-date').value;
        const time = document.getElementById('edit-deadline-time').value;
        const deadline = (date && time) ? `${date}T${time}` : (date || null);

        const tags = tagsStr.split(',').map(t => t.trim()).filter(t => t);

        const tareas = [];
        document.querySelectorAll('.task-item-input').forEach(input => {
            if (input.value.trim()) {
                tareas.push({
                    titulo: input.value.trim(),
                    completado: input.dataset.completado === 'true'
                });
            }
        });

        return { id, content, type, descripcion, url, tags, tareas, deadline };
    },

    fillEditModal(item, focus = null) {
        document.getElementById('edit-id').value = item.id;
        document.getElementById('edit-content').value = item.content || '';
        document.getElementById('edit-type').value = item.type || 'note';
        document.getElementById('edit-description').value = item.descripcion || '';
        document.getElementById('edit-url').value = item.url || '';
        document.getElementById('edit-tags').value = (item.tags || []).join(', ');

        if (item.deadline) {
            const dt = new Date(item.deadline);
            document.getElementById('edit-deadline-date').value = dt.toISOString().split('T')[0];
            document.getElementById('edit-deadline-time').value = dt.toTimeString().split(' ')[0].substring(0, 5);
        } else {
            document.getElementById('edit-deadline-date').value = '';
            document.getElementById('edit-deadline-time').value = '';
        }

        const container = this.elements.tasksContainer();
        if (container) {
            container.innerHTML = '';
            const tareas = item.tareas || [];
            tareas.forEach(task => this.addTaskToModal(task));
            if (tareas.length === 0 && focus === 'tasks') this.addTaskToModal();
        }

        setTimeout(() => {
            if (focus === 'tasks') {
                const firstTask = container.querySelector('input[type="text"]');
                if (firstTask) firstTask.focus();
            } else if (focus === 'description') {
                document.getElementById('edit-description').focus();
            } else if (focus === 'url') {
                document.getElementById('edit-url').focus();
            } else {
                document.getElementById('edit-content').focus();
            }
        }, 100);
    },

    addTaskToModal(task = { titulo: '', completado: false }) {
        const container = this.elements.tasksContainer();
        const div = document.createElement('div');
        div.className = 'flex items-center gap-3 bg-gray-50 p-3 rounded-xl border-2 border-transparent hover:border-brand/20 transition-all';
        div.innerHTML = `
            <input type="checkbox" class="kawaii-checkbox" ${task.completado ? 'checked' : ''} 
                   onchange="this.parentElement.querySelector('.task-item-input').dataset.completado = this.checked">
            <input type="text" class="task-item-input flex-1 bg-transparent border-none font-bold text-ink outline-none" 
                   value="${task.titulo}" data-completado="${task.completado}" placeholder="¿Cuál es el siguiente paso?">
            <button type="button" class="btn-remove-task text-urgent hover:scale-110 transition-transform text-xl">&times;</button>
        `;

        div.querySelector('.btn-remove-task').addEventListener('click', () => div.remove());
        container.appendChild(div);
    },

    // --- VISIBILIDAD & ESTADOS ---

    toggleSidebar() {
        this.elements.sidebar()?.classList.toggle('translate-x-full');
    },

    toggleModal(show = true) {
        const modal = this.elements.modalEdit();
        if (show) modal.classList.remove('hidden');
        else modal.classList.add('hidden');
    },

    toggleVoiceOverlay(show = true) {
        const overlay = this.elements.voiceOverlay();
        if (show) overlay.classList.remove('hidden');
        else overlay.classList.add('hidden');
    },

    updateUserInfo(user) {
        const { authForm, userInfo, userEmail } = this.elements;
        if (user) {
            authForm().classList.add('hidden');
            userInfo().classList.remove('hidden');
            userEmail().textContent = user.email;
        } else {
            authForm().classList.remove('hidden');
            userInfo().classList.add('hidden');
        }
    },

    showKaiResponse(text, emotion = 'happy') {
        const bubble = this.elements.kaiBubble();
        const textEl = this.elements.kaiText();
        const avatar = this.elements.kaiAvatar();

        if (!bubble || !textEl) return;

        textEl.textContent = text;
        bubble.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
        bubble.classList.add('opacity-100', 'translate-y-0');

        avatar.style.transform = emotion === 'thinking' ? 'rotate(10deg)' : 'scale(1.1)';

        setTimeout(() => {
            bubble.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
            bubble.classList.remove('opacity-100', 'translate-y-0');
            avatar.style.transform = 'none';
        }, 5000);
    },

    // --- HELPERS ---

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    truncate(text, length = 30) {
        return text.length > length ? text.substring(0, length) + '...' : text;
    },

    showNotification(message, type = 'info') {
        const toast = document.createElement('div');
        const colors = { success: 'bg-success', error: 'bg-urgent', info: 'bg-action', warning: 'bg-warning' };

        toast.className = `fixed top-10 left-1/2 -translate-x-1/2 ${colors[type] || 'bg-brand'} text-ink font-bold px-8 py-4 rounded-blob shadow-float z-[500] transform -translate-y-20 transition-all duration-300`;
        toast.textContent = message;

        document.body.appendChild(toast);
        setTimeout(() => toast.style.transform = 'translate(-50%, 40px)', 10);

        setTimeout(() => {
            toast.style.transform = 'translate(-50%, -100px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    renderLoading() {
        if (this.elements.container()) {
            this.elements.container().innerHTML = `
                <div class="col-span-full py-20 text-center animate-bounce-slow">
                    <span class="text-6xl">🧠</span>
                    <p class="mt-4 font-bold text-brand italic underline decoration-brand-dark decoration-4">KAI está conectando neuronas...</p>
                </div>
            `;
        }
    },

    renderError(message) {
        if (this.elements.container()) {
            this.elements.container().innerHTML = `
                <div class="col-span-full bg-urgent/10 p-12 rounded-blob text-center border-4 border-dashed border-urgent/30">
                    <span class="text-6xl">😵‍💫</span>
                    <p class="mt-4 font-bold text-ink text-xl">${message}</p>
                    <button onclick="location.reload()" class="mt-6 bg-white px-6 py-2 rounded-full shadow-sticker font-bold">Reintentar</button>
                </div>
            `;
        }
    }
};
