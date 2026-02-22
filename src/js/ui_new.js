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
            document.getElementById('app').appendChild(container);
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
        const id = item.id;
        const isProject = item.type === 'proyecto' || item.type === 'project';
        const isAchievement = item.type === 'logro';
        const isReminder = item.type === 'reminder' || item.type === 'alarma';

        const typeConfig = {
            proyecto: { color: 'sugar-pink', icon: '🎨', gradient: 'from-sugar-pink to-pink-200' },
            logro: { color: 'mint', icon: '✨', iconClass: 'fa-sun' },
            idea: { color: 'lemon', icon: '💡', iconClass: 'fa-lightbulb' },
            directorio: { color: 'soft-blue', icon: '🔗', iconClass: 'fa-link' },
            reminder: { color: 'peach', icon: '⏰', iconClass: 'fa-bell' },
            note: { color: 'lavender', icon: '📝', iconClass: 'fa-note-sticky' }
        };

        const config = typeConfig[item.type] || typeConfig['note'];
        const card = document.createElement('div');
        card.dataset.id = id;
        card.dataset.expanded = 'false';

        // El contenido variará dinámicamente al expandir
        this.updateCardContent(card, item, false);

        // Evento de expansión al hacer clic
        card.addEventListener('click', (e) => {
            // No expandir si se hizo clic en botones rápidos o enlaces
            if (e.target.closest('button') || e.target.closest('a') || e.target.closest('input')) return;

            const isExpanded = card.dataset.expanded === 'true';
            if (!isExpanded) {
                this.expandCard(card, item);
            }
        });

        return card;
    },

    updateCardContent(card, item, expanded = false) {
        const isProject = item.type === 'proyecto' || item.type === 'project';
        const isReminder = item.type === 'reminder' || item.type === 'alarma';
        const isAchievement = item.type === 'logro';
        const id = item.id;

        const typeConfig = {
            proyecto: { color: 'sugar-pink', icon: '🎨', gradient: 'from-sugar-pink to-pink-200' },
            logro: { color: 'mint', icon: '✨', iconClass: 'fa-sun' },
            idea: { color: 'lemon', icon: '💡', iconClass: 'fa-lightbulb' },
            directorio: { color: 'soft-blue', icon: '🔗', iconClass: 'fa-link' },
            reminder: { color: 'peach', icon: '⏰', iconClass: 'fa-bell' },
            note: { color: 'lavender', icon: '📝', iconClass: 'fa-note-sticky' }
        };
        const config = typeConfig[item.type] || typeConfig['note'];

        if (expanded) {
            this.renderExpandedCard(card, item, config);
        } else {
            this.renderCollapsedCard(card, item, config, isProject, isReminder, isAchievement);
        }
    },

    renderCollapsedCard(card, item, config, isProject, isReminder, isAchievement) {
        const id = item.id;
        card.className = isProject
            ? `bg-white rounded-[2rem] shadow-sticker transition-all hover:shadow-lg overflow-hidden border border-gray-100 mb-4 w-full cursor-pointer group`
            : `bg-white rounded-[1.5rem] p-4 shadow-sticker border border-gray-100 flex gap-4 items-center group relative hover:z-10 transition-all mb-4 w-full cursor-pointer`;

        if (isProject) {
            let progressWidth = '0%';
            if (item.tareas && item.tareas.length > 0) {
                const completed = item.tareas.filter(t => t.completado).length;
                progressWidth = `${Math.round((completed / item.tareas.length) * 100)}%`;
            }

            card.innerHTML = `
                <div class="bg-gradient-to-r ${config.gradient || 'from-sugar-pink to-pink-200'} p-5 text-white">
                    <div class="flex justify-between items-start">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl bg-white/20 p-2 rounded-xl backdrop-blur-sm">${config.icon}</span>
                            <div>
                                <div class="flex gap-2 mb-1">
                                    <span class="text-[10px] font-bold bg-white/30 px-2 py-0.5 rounded-full uppercase">PROYECTO</span>
                                    ${item.anclado ? '<span class="text-[10px] font-bold bg-red-400/80 px-2 py-0.5 rounded-full"><i class="fa-solid fa-thumbtack"></i> PIN</span>' : ''}
                                </div>
                                <h3 class="font-bold text-lg leading-tight">${this.escapeHtml(item.content)}</h3>
                            </div>
                        </div>
                        <i class="fa-solid fa-expand bg-white/20 p-2 rounded-full text-xs transition-transform group-hover:scale-110"></i>
                    </div>
                </div>
                ${item.tareas && item.tareas.length > 0 ? `
                    <div class="p-4 bg-white border-t border-gray-50 flex justify-between items-center text-xs text-gray-400 font-bold">
                        <span>${item.tareas.filter(t => t.completado).length} / ${item.tareas.length} tareas completadas</span>
                        <div class="w-24 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div class="bg-mint h-full" style="width: ${progressWidth}"></div>
                        </div>
                    </div>
                ` : ''}
            `;
        } else {
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
                </div>
                <div class="flex gap-1">
                    <button class="action-edit p-2 text-gray-400 hover:text-brand transition-colors" data-id="${item.id}"><i class="fa-solid fa-expand"></i></button>
                    ${!isAchievement ? `<button class="action-finish p-2 text-gray-400 hover:text-success transition-colors" data-id="${item.id}"><i class="fa-solid fa-check-circle"></i></button>` : ''}
                </div>
            `;
        }
    },

    renderExpandedCard(card, item, config) {
        card.className = `bg-white rounded-[2rem] shadow-float border-2 border-brand overflow-hidden mb-8 w-full transition-all duration-300 transform scale-[1.02]`;
        card.dataset.expanded = 'true';

        const tareasHtml = (item.tareas || []).map((t, idx) => `
            <div class="flex items-center gap-3 bg-gray-50 p-2 rounded-xl group/task">
                <input type="checkbox" class="kawaii-checkbox" ${t.completado ? 'checked' : ''} data-index="${idx}">
                <input type="text" value="${this.escapeHtml(t.titulo)}" 
                       class="flex-1 bg-transparent border-none font-bold text-sm text-ink outline-none focus:ring-0 inline-task-input" 
                       placeholder="¿Qué sigue?" data-index="${idx}">
                <button class="btn-remove-inline text-gray-300 hover:text-urgent px-2 text-lg" data-index="${idx}">&times;</button>
            </div>
        `).join('');

        card.innerHTML = `
            <div class="bg-gradient-to-r ${config.gradient || 'from-brand to-brand-dark'} p-6 text-white flex justify-between items-center">
                <div class="flex items-center gap-4">
                    <span class="text-3xl bg-white/20 p-3 rounded-2xl backdrop-blur-md">${config.icon}</span>
                    <input type="text" id="inline-content-${item.id}" value="${this.escapeHtml(item.content)}" 
                           class="bg-white/10 border-none rounded-xl px-4 py-2 font-black text-xl text-white placeholder-white/50 focus:ring-2 focus:ring-white/50 w-full max-w-md outline-none" placeholder="Título...">
                </div>
                <button class="action-collapse bg-white/20 hover:bg-white/40 p-3 rounded-full transition-all">
                    <i class="fa-solid fa-compress"></i>
                </button>
            </div>
            
            <div class="p-6 space-y-6">
                <!-- Meta Info Row -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-2">
                        <label class="font-bold text-[10px] text-gray-400 uppercase tracking-widest ml-1">Categoría</label>
                        <select id="inline-type-${item.id}" class="w-full bg-input-bg border-none rounded-2xl px-4 py-3 font-bold text-ink focus:ring-2 focus:ring-brand">
                            <option value="note" ${item.type === 'note' ? 'selected' : ''}>📝 Nota</option>
                            <option value="proyecto" ${item.type === 'proyecto' ? 'selected' : ''}>🏗️ Proyecto</option>
                            <option value="idea" ${item.type === 'idea' ? 'selected' : ''}>💡 Idea</option>
                            <option value="directorio" ${item.type === 'directorio' ? 'selected' : ''}>🔗 Directorio</option>
                            <option value="reminder" ${item.type === 'reminder' || item.type === 'alarma' ? 'selected' : ''}>⏰ Alarma</option>
                            <option value="logro" ${item.type === 'logro' ? 'selected' : ''}>🏆 Logro</option>
                        </select>
                    </div>
                    <div class="space-y-2">
                        <label class="font-bold text-[10px] text-gray-400 uppercase tracking-widest ml-1">⏰ Alarma</label>
                        <div class="flex gap-2">
                            <input type="date" id="inline-date-${item.id}" value="${item.deadline ? item.deadline.split('T')[0] : ''}" 
                                   class="flex-1 bg-input-bg border-none rounded-2xl px-4 py-3 font-bold focus:ring-2 focus:ring-brand">
                            <input type="time" id="inline-time-${item.id}" value="${item.deadline && item.deadline.includes('T') ? item.deadline.split('T')[1].substring(0, 5) : ''}" 
                                   class="flex-1 bg-input-bg border-none rounded-2xl px-4 py-3 font-bold focus:ring-2 focus:ring-brand">
                        </div>
                    </div>
                </div>

                <!-- Descripción -->
                <div class="space-y-2">
                    <label class="font-bold text-[10px] text-gray-400 uppercase tracking-widest ml-1">Descripción</label>
                    <textarea id="inline-desc-${item.id}" class="w-full bg-input-bg border-none rounded-2xl px-5 py-4 min-h-[120px] font-medium text-gray-600 focus:ring-2 focus:ring-brand resize-none" 
                              placeholder="Añade detalles, links o pensamientos adicionales...">${item.descripcion || ''}</textarea>
                </div>

                <!-- Tareas (Checklist Estandarizado) -->
                <div class="space-y-3">
                    <div class="flex justify-between items-center px-1">
                        <label class="font-bold text-[10px] text-gray-400 uppercase tracking-widest">Tareas</label>
                        <button class="btn-add-inline-task text-brand font-black text-[10px] uppercase hover:underline">+ Añadir tarea</button>
                    </div>
                    <div id="inline-tasks-list-${item.id}" class="space-y-2">
                        ${tareasHtml}
                    </div>
                </div>

                <!-- URL -->
                <div class="space-y-2">
                    <label class="font-bold text-[10px] text-gray-400 uppercase tracking-widest ml-1">Enlace Principal</label>
                    <div class="relative">
                        <i class="fa-solid fa-link absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"></i>
                        <input type="url" id="inline-url-${item.id}" value="${item.url || ''}" 
                               class="w-full bg-input-bg border-none rounded-2xl pl-10 pr-5 py-4 font-medium text-action placeholder-gray-300 focus:ring-2 focus:ring-brand outline-none" 
                               placeholder="https://google.com/ejemplo">
                    </div>
                </div>

                <!-- Acciones Finales -->
                <div class="flex gap-4 pt-4 border-t border-gray-100">
                    <button class="action-save-inline flex-[2] bg-brand text-white font-black uppercase tracking-wider py-4 rounded-2xl shadow-sticker hover:bg-brand-dark transform active:scale-[0.98] transition-all">
                        Guardar Cambios ✨
                    </button>
                    <button class="action-collapse flex-1 bg-gray-50 text-gray-400 font-black uppercase tracking-wider py-4 rounded-2xl hover:bg-gray-100 transition-all">
                        Cerrar
                    </button>
                    <button class="action-delete flex-none bg-red-50 text-red-300 hover:text-red-500 p-4 rounded-2xl transition-all" title="Eliminar definitivamente">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
        `;

        // Bind events for expanded card
        this.bindInlineEvents(card, item);
    },

    expandCard(card, item) {
        // Colapsar cualquier otra tarjeta expandida primero
        document.querySelectorAll('[data-expanded="true"]').forEach(c => {
            const otherId = c.dataset.id;
            // Aquí idealemente deberíamos disparar un evento para que el controlador descarte cambios o pida confirmación
            // Por simplicidad, solo las colapsamos
            c.dataset.expanded = 'false';
            // Necesitaríamos los datos originales del item para esta otra tarjeta...
            // Por ahora, renderizaremos de nuevo toda la lista o buscaremos el item en el controlador global
            if (window.kai) window.kai.loadItems();
        });

        this.updateCardContent(card, item, true);
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    bindInlineEvents(card, item) {
        const id = item.id;

        // Colapsar
        card.querySelectorAll('.action-collapse').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                card.dataset.expanded = 'false';
                this.updateCardContent(card, item, false);
            });
        });

        // Guardar
        card.querySelector('.action-save-inline')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleInlineSave(card, item);
        });

        // Eliminar
        card.querySelector('.action-delete')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('¿Seguro que quieres borrar este recuerdo para siempre?')) {
                if (window.kai) window.kai.deleteItem(id);
            }
        });

        // Añadir tarea inline
        card.querySelector('.btn-add-inline-task')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const list = document.getElementById(`inline-tasks-list-${id}`);
            const div = document.createElement('div');
            div.className = 'flex items-center gap-3 bg-gray-50 p-2 rounded-xl group/task animate-fadeIn';
            div.innerHTML = `
                <input type="checkbox" class="kawaii-checkbox">
                <input type="text" class="flex-1 bg-transparent border-none font-bold text-sm text-ink outline-none focus:ring-0 inline-task-input" placeholder="¿Qué sigue?">
                <button class="btn-remove-inline text-gray-300 hover:text-urgent px-2 text-lg">&times;</button>
            `;
            div.querySelector('.btn-remove-inline').addEventListener('click', () => div.remove());
            list.appendChild(div);
            div.querySelector('input[type="text"]').focus();
        });

        // Eliminar tarea existente
        card.querySelectorAll('.btn-remove-inline').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                btn.closest('.group\\/task').remove();
            });
        });
    },

    async handleInlineSave(card, item) {
        const id = item.id;
        const content = document.getElementById(`inline-content-${id}`).value;
        const type = document.getElementById(`inline-type-${id}`).value;
        const descripcion = document.getElementById(`inline-desc-${id}`).value;
        const url = document.getElementById(`inline-url-${id}`).value;
        const date = document.getElementById(`inline-date-${id}`).value;
        const time = document.getElementById(`inline-time-${id}`).value;
        const deadline = (date && time) ? `${date}T${time}` : (date || null);

        const tareas = [];
        card.querySelectorAll('#inline-tasks-list-' + id + ' .group\\/task').forEach(row => {
            const titulo = row.querySelector('input[type="text"]').value.trim();
            if (titulo) {
                tareas.push({
                    titulo,
                    completado: row.querySelector('input[type='checkbox']').checked
                });
            }
        });

        const updates = { id, content, type, descripcion, url, tareas, deadline };

        if (window.kai) {
            await window.kai.dataUpdateInline(id, updates);
            card.dataset.expanded = 'false';
            // Refrescar para ver cambios o actualizar localmente
            window.kai.loadItems();
        }
    },

    // --- VISIBILIDAD & ESTADOS (LEGACY MODAL SUPPORT) ---

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
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    truncate(text, length = 30) {
        if (!text) return '';
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
