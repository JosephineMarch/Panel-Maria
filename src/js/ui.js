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
        kaiAvatar: () => document.getElementById('kai-avatar'),
        kaiAvatarContainer: () => document.getElementById('kai-avatar-container'),
        kaiChatWindow: () => document.getElementById('kai-chat-window'),
        kaiChatMessages: () => document.getElementById('kai-chat-messages'),
        kaiChatInput: () => document.getElementById('kai-chat-input'),
        kaiChatSend: () => document.getElementById('kai-chat-send'),
        kaiChatClose: () => document.getElementById('kai-chat-close'),
    },

    // Configuración de tipos (con color de header)
    typeConfig: {
        nota: { color: 'nota', icon: '📝', solid: 'theme-nota', label: 'NOTA' },
        tarea: { color: 'tarea', icon: '✅', solid: 'theme-tarea', label: 'TAREA' },
        proyecto: { color: 'proyecto', icon: '📁', solid: 'theme-proyecto', label: 'PROYECTO' },
        directorio: { color: 'directorio', icon: '🔗', solid: 'theme-directorio', label: 'ENLACE' },
    },

    // Configuración de etiquetas (diseño sutil, sin color de header)
    tagConfig: {
        logro: { bg: '', text: 'text-ink/70', border: 'border-brand' },
        salud: { bg: '', text: 'text-ink/70', border: 'border-brand' },
        emocion: { bg: '', text: 'text-ink/70', border: 'border-brand' },
        alarma: { bg: '', text: 'text-ink/70', border: 'border-brand' },
    },


    init() {
        // Asegurar que el contenedor existe
        if (!this.elements.container()) {
            const container = document.createElement('div');
            container.id = 'items-container';
            document.getElementById('app')?.appendChild(container);
        }
    },

    renderTags(tags) {
        if (!tags || tags.length === 0) return '';
        return tags.map(tag => {
            const config = this.tagConfig[tag];
            if (!config) return '';
            return `<span class="${config.text} ${config.border} border bg-transparent px-2 py-0.5 rounded-full text-[10px] font-semibold">${tag}</span>`;
        }).join('');
    },

    toggleKaiChat(show = null) {
        const window = this.elements.kaiChatWindow();
        if (!window) return;

        const isHidden = window.classList.contains('scale-0');
        const shouldShow = show !== null ? show : isHidden;

        if (shouldShow) {
            window.classList.remove('scale-0', 'opacity-0');
            window.classList.add('scale-100', 'opacity-100');
            this.elements.kaiChatInput()?.focus();
        } else {
            window.classList.remove('scale-100', 'opacity-100');
            window.classList.add('scale-0', 'opacity-0');
        }
    },

    addKaiMessage(text, isAi = true) {
        const container = this.elements.kaiChatMessages();
        if (!container) return;

        const msg = document.createElement('div');
        msg.className = isAi
            ? 'bg-brand/10 p-3 rounded-2xl rounded-bl-none text-ink font-medium max-w-[85%] animate-fadeIn'
            : 'bg-white border border-brand/10 p-3 rounded-2xl rounded-br-none text-ink font-bold max-w-[85%] ml-auto animate-fadeIn';

        msg.innerHTML = this.escapeHtml(text);
        container.appendChild(msg);
        container.scrollTop = container.scrollHeight;
    },

    showKaiThinking(show = true) {
        const container = this.elements.kaiChatMessages();
        if (!container) return;

        if (show) {
            const thinking = document.createElement('div');
            thinking.id = 'kai-thinking';
            thinking.className = 'bg-brand/5 p-2 rounded-xl text-[10px] text-ink/40 italic flex items-center gap-2 animate-pulse';
            thinking.innerHTML = '<span>🧸 Kai está pensando...</span>';
            container.appendChild(thinking);
            container.scrollTop = container.scrollHeight;
        } else {
            document.getElementById('kai-thinking')?.remove();
        }
    },

    // --- RENDERIZADO ---

    render(items = [], isDemo = false) {
        const container = this.elements.container();
        if (!container) return;

        container.innerHTML = '';

        if (isDemo) {
            container.innerHTML += `
                <div class="bg-lemon border-2 border-warning p-4 rounded-2xl mb-6 text-center flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <p class="font-bold text-ink">📺 Modo Demo</p>
                        <p class="text-xs text-ink/60">Inicia sesión para ver tu contenido real</p>
                    </div>
                    <button id="btn-regenerate-in-timeline" class="bg-white border-2 border-warning text-ink font-bold py-2 px-4 rounded-xl text-sm shadow-sticker hover:brightness-95 transition-all">
                        🔄 Regenerar Demo
                    </button>
                </div>
            `;
        }

        if (items.length === 0 && !isDemo) {
            container.innerHTML = `
                <div class="col-span-full py-20 text-center opacity-50">
                    <span class="text-6xl">🏜️</span>
                    <p class="mt-4 font-bold text-ink">Bandeja vacía. ¡Anota algo!</p>
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
        const card = document.createElement('div');
        card.dataset.id = id;
        card.dataset.expanded = 'false';

        this.updateCardContent(card, item, false);

        // Evento de expansión al hacer clic
        card.addEventListener('click', (e) => {
            // No expandir si se hizo clic en botones rápidos o elementos de entrada
            if (e.target.closest('button') || e.target.closest('a') || e.target.closest('input') || e.target.closest('textarea') || e.target.closest('select')) return;

            const isExpanded = card.dataset.expanded === 'true';
            if (!isExpanded) {
                this.expandCard(card, item);
            }
        });

        return card;
    },

    updateCardContent(card, item, expanded = false) {
        // Normalizar tipo — convierte tipos viejos en inglés a español
        const tipoNorm = CONFIG.migrarTipo(item.type);
        const itemNorm = { ...item, type: tipoNorm };

        const config = this.typeConfig[tipoNorm] || this.typeConfig['nota'];
        const isProject = tipoNorm === 'proyecto';

        if (expanded) {
            this.renderExpandedCard(card, itemNorm, config);
        } else {
            this.renderCollapsedCard(card, itemNorm, config, isProject);
        }
    },

    renderCollapsedCard(card, item, config, isProject) {
        const themeClass = `theme-${config.color}`;
        card.className = isProject
            ? `${themeClass} rounded-[2rem] shadow-sticker border-2 transition-all hover:shadow-lg overflow-hidden mb-4 w-full cursor-pointer group`
            : `${themeClass} rounded-[1.5rem] p-4 shadow-sticker border-2 flex gap-4 items-center group relative hover:z-10 transition-all mb-4 w-full cursor-pointer`;

        if (isProject) {
            let progressWidth = '0%';
            if (item.tareas && item.tareas.length > 0) {
                const completed = item.tareas.filter(t => t.completado).length;
                progressWidth = `${Math.round((completed / item.tareas.length) * 100)}%`;
            }

            card.className = `group item-card bg-white rounded-[2rem] shadow-sticker border-none overflow-hidden mb-8 transition-all duration-300`;
            card.dataset.expanded = 'false';

            const typeConfig = this.typeConfig[item.type] || this.typeConfig['nota'];
            const tagClass = `tag-type tag-${item.type}`;

            let deadlineHtml = '';
            if (item.deadline) {
                const date = new Date(item.deadline);
                deadlineHtml = `
                    <p class="txt-label text-peach mt-1 flex items-center gap-1">
                        <i class="fa-solid fa-clock"></i> ${date.toLocaleDateString()}
                    </p>
                `;
            }

            card.innerHTML = `
                <!-- Header Sólido -->
                <div class="${typeConfig.solid || 'bg-brand'} p-4 flex justify-between items-center">
                    <div class="flex items-center gap-3 min-w-0 flex-1">
                        <span class="text-xl bg-white/30 p-2 rounded-xl backdrop-blur-md">${typeConfig.icon}</span>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-0.5">
                                <span class="${tagClass} text-[9px] px-2 py-0.5 bg-white/20">${typeConfig.label}</span>
                                ${deadlineHtml ? `<span class="opacity-60">${deadlineHtml}</span>` : ''}
                            </div>
                            <h3 class="txt-title text-ink">${this.escapeHtml(item.content)}</h3>
                            <!-- Barra de Progreso en Header -->
                            ${item.tareas && item.tareas.length > 0 ? `
                                <div class="mt-2 flex items-center gap-2 bg-white/20 p-1 px-2 rounded-full">
                                    <div class="flex-1 bg-white/40 h-1 rounded-full overflow-hidden">
                                        <div class="bg-white h-full" style="width: ${progressWidth}"></div>
                                    </div>
                                    <span class="text-[9px] font-bold text-ink/60">${item.tareas.filter(t => t.completado).length}/${item.tareas.length}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                         <i class="fa-solid fa-expand bg-white/20 p-2 rounded-full text-xs transition-transform group-hover:scale-110 cursor-pointer action-expand" data-id="${item.id}"></i>
                    </div>
                </div>

                <!-- Body Minimalista -->
                <div class="card-body-soft p-4">
                    <!-- Previsualización de Descripción -->
                    ${item.descripcion ? (() => {
                        const descTruncada = item.descripcion.length > 120 ? item.descripcion.substring(0, 120) + '...' : item.descripcion;
                        return `<p class="text-sm text-ink/70 mb-3">${this.escapeHtml(descTruncada)}</p>`;
                    })() : ''}

                    <!-- Previsualización de Tareas (Interactiva) -->
                    ${item.tareas && item.tareas.length > 0 ? `
                        <div class="space-y-1 mb-2">
                            ${item.tareas.slice(0, 3).map((t, idx) => `
                                <div class="flex items-center gap-3 py-1.5">
                                    <input type="checkbox" class="kawaii-checkbox timeline-task-checkbox" 
                                           ${t.completado ? 'checked' : ''} 
                                           data-id="${item.id}" data-index="${idx}">
                                    <span class="text-sm text-ink ${t.completado ? 'line-through opacity-50' : 'font-medium'}">${this.escapeHtml(t.titulo)}</span>
                                </div>
                            `).join('')}
                            ${item.tareas.length > 3 ? `<p class="text-[10px] font-bold text-brand ml-7">+ ${item.tareas.length - 3} más...</p>` : ''}
                        </div>
                    ` : ''}
                    ${this.renderTags(item.tags) ? `<div class="flex gap-1.5 flex-wrap mt-3">${this.renderTags(item.tags)}</div>` : ''}
                </div>
            `;
        } else {
            let deadlineHtml = '';
            if (item.deadline) {
                const date = new Date(item.deadline);
                deadlineHtml = `
                    <span class="txt-label text-ink/30 flex items-center gap-1">
                        <i class="fa-solid fa-clock"></i> ${date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                    </span>
                `;
            }

            // Para notas y otros tipos, mostrar fecha de creación
            let fechaHtml = '';
            if ((item.type === 'nota' || item.type === 'idea' || item.type === 'note') && item.created_at) {
                const fecha = new Date(item.created_at);
                const hoy = new Date();
                const esHoy = fecha.toDateString() === hoy.toDateString();

                const fechaStr = esHoy
                    ? `Hoy ${fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
                    : fecha.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

                fechaHtml = `
                    <span class="txt-label text-gray-400 flex items-center gap-1">
                        <i class="fa-regular fa-clock"></i> ${fechaStr}
                    </span>
                `;
            }

            const typeConfig = this.typeConfig[item.type] || this.typeConfig.nota;
            const tagClass = `tag-type tag-${item.type}`;

            // Previsualización Rica de Contenido
            let previewHtml = '';

            // 1. Previsualización de Descripción (para Ideas, Notas, Proyectos)
            if (item.descripcion) {
                const descTruncada = item.descripcion.length > 120 ? item.descripcion.substring(0, 120) + '...' : item.descripcion;
                previewHtml += `<p class="text-sm text-ink/70 mt-2">${this.escapeHtml(descTruncada)}</p>`;
            }

            // 2. Previsualización de Tareas (Checklist)
            if (item.tareas && item.tareas.length > 0) {
                const maxPreviewTasks = 3;
                const tasksPreview = item.tareas.slice(0, maxPreviewTasks).map((t, idx) => `
                    <div class="flex items-center gap-3 py-1.5">
                        <input type="checkbox" class="kawaii-checkbox timeline-task-checkbox" 
                               ${t.completado ? 'checked' : ''} 
                               data-id="${item.id}" data-index="${idx}">
                        <span class="text-sm text-ink ${t.completado ? 'line-through opacity-50' : 'font-medium'}">${this.escapeHtml(t.titulo)}</span>
                    </div>
                `).join('');

                previewHtml += `
                    <div class="mt-2 space-y-0.5">
                        ${tasksPreview}
                        ${item.tareas.length > maxPreviewTasks ? `<p class="text-[10px] font-bold text-brand ml-6">+ ${item.tareas.length - maxPreviewTasks} más...</p>` : ''}
                    </div>
                `;
            }

            // 3. Previsualización de Enlace
            if (item.url && item.type === 'directorio') {
                const urlLabel = item.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
                previewHtml += `
                    <div class="mt-2 flex items-center gap-1 text-[10px] text-action font-bold">
                        <i class="fa-solid fa-link text-[8px]"></i>
                        <span class="truncate">${urlLabel}</span>
                    </div>
                `;
            }

            // 4. Barra de Progreso (Solo si hay tareas)
            let progressHtml = '';
            if (item.tareas && item.tareas.length > 0) {
                const completed = item.tareas.filter(t => t.completado).length;
                const progressWidth = `${Math.round((completed / item.tareas.length) * 100)}%`;
                progressHtml = `
                    <div class="mt-3 flex items-center gap-2">
                        <div class="flex-1 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div class="bg-brand h-full transition-all" style="width: ${progressWidth}"></div>
                        </div>
                        <span class="text-[10px] font-bold text-ink/60">${completed}/${item.tareas.length}</span>
                    </div>
                `;
            }

            card.className = `item-card bg-white rounded-2xl p-4 shadow-sticker border-none group relative hover:z-10 transition-all mb-4 w-full cursor-pointer`;
            card.dataset.expanded = 'false';

            // Renderizar etiquetas (tags)
            const tagsHtml = this.renderTags(item.tags);

            card.innerHTML = `
                <div class="flex gap-4 items-start">
                    <div class="w-12 h-12 bg-white text-ink rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-gray-50">
                        <span class="text-2xl">${typeConfig.icon}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1 flex-wrap">
                            <span class="${tagClass} text-[9px] px-2 py-0.5">${typeConfig.label}</span>
                            ${deadlineHtml}
                            ${fechaHtml}
                        </div>
                        <h3 class="text-sm text-ink font-bold leading-snug">${this.escapeHtml(this.truncate(item.content, 80))}</h3>
                        ${progressHtml}
                        ${previewHtml}
                        ${tagsHtml ? `<div class="flex gap-1.5 flex-wrap mt-2">${tagsHtml}</div>` : ''}
                    </div>
                    <div class="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button class="action-expand p-2 text-ink/20 hover:text-ink transition-colors" data-id="${item.id}" title="Expandir"><i class="fa-solid fa-expand"></i></button>
                        <button class="action-finish p-2 text-ink/20 hover:text-success transition-colors" data-id="${item.id}" title="Terminar"><i class="fa-solid fa-check-circle"></i></button>
                    </div>
                </div>
            `;
        }
    },

    renderExpandedCard(card, item, config) {
        const themeClass = `theme-${config.color}`;
        const typeConfig = this.typeConfig[item.type] || this.typeConfig.note;
        const tagClass = `tag-type tag-${item.type}`;

        card.className = `item-card bg-white rounded-[2rem] shadow-sticker border-none overflow-hidden mb-8 w-full transition-all duration-300 transform scale-[1.01]`;
        card.dataset.expanded = 'true';

        const tareasHtml = (item.tareas || []).map((t, idx) => `
            <div class="flex items-start gap-3 p-2 rounded-xl group/task border-b border-gray-100/50">
                <input type="checkbox" class="kawaii-checkbox mt-1" ${t.completado ? 'checked' : ''} data-index="${idx}">
                <textarea rows="1" 
                        class="flex-1 bg-transparent border-none font-bold text-sm text-ink outline-none focus:ring-0 inline-task-input resize-none" 
                        placeholder="¿Qué sigue?" data-index="${idx}">${this.escapeHtml(t.titulo)}</textarea>
                <button class="btn-remove-inline text-ink/20 hover:text-ink px-2 transition-colors mt-1" data-index="${idx}"><i class="fa-solid fa-xmark"></i></button>
            </div>
        `).join('');

        const hasDesc = !!item.descripcion;
        const hasTasks = (item.tareas || []).length > 0;
        const hasUrl = !!item.url;
        const hasAlarm = !!item.deadline;

        // Tags del item
        const tagsHtml = this.renderTags(item.tags);
        const hasTags = tagsHtml && tagsHtml.length > 0;

        card.innerHTML = `
            <!-- Header Sólido -->
            <div class="${typeConfig.solid || 'bg-brand'} p-6 text-ink flex justify-between items-center rounded-t-3xl">
                <div class="flex items-center gap-4 flex-1">
                    <span class="text-3xl bg-white/40 p-3 rounded-2xl backdrop-blur-md">${typeConfig.icon}</span>
                    <input type="text" id="inline-content-${item.id}" value="${this.escapeHtml(item.content)}" 
                           class="bg-white/30 border-none rounded-xl px-4 py-2 txt-display text-ink placeholder-ink/50 focus:ring-2 focus:ring-white/50 w-full outline-none" placeholder="Título...">
                </div>
                <button class="action-collapse bg-white/30 hover:bg-white/50 p-3 rounded-full transition-all ml-4">
                    <i class="fa-solid fa-compress"></i>
                </button>
            </div>
            
            <!-- Body Minimalista -->
            <div class="p-6 space-y-6 rounded-b-3xl card-body-soft">
                <!-- Secciones de Contenido (Dinámicas) -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-2">
                        <label class="txt-label ml-1">Tipo</label>
                        <select id="inline-type-${item.id}" class="w-full bg-white/40 border-none rounded-2xl px-4 py-3 txt-small text-ink focus:ring-2 focus:ring-white/50 outline-none">
                            <option value="nota" ${item.type === 'nota' || item.type === 'idea' || item.type === 'note' ? 'selected' : ''}>📝 Nota</option>
                            <option value="tarea" ${item.type === 'tarea' || item.type === 'task' ? 'selected' : ''}>✅ Tarea (Checklist)</option>
                            <option value="proyecto" ${item.type === 'proyecto' || item.type === 'project' ? 'selected' : ''}>📁 Proyecto</option>
                            <option value="directorio" ${item.type === 'directorio' || item.type === 'link' ? 'selected' : ''}>🔗 Enlace</option>
                        </select>
                    </div>
                    
                    ${hasTags ? `<div class="space-y-2"><label class="txt-label ml-1">Etiquetas</label><div class="flex gap-2 flex-wrap">${tagsHtml}</div></div>` : ''}
                    
                    ${(() => {
                        let deadlineDate = null;
                        const dl = item.deadline;
                        if (dl) {
                            // Si es número (timestamp)
                            if (typeof dl === 'number') {
                                deadlineDate = new Date(dl);
                            } 
                            // Si es string ISO (de Supabase)
                            else if (typeof dl === 'string' && dl.includes('T')) {
                                deadlineDate = new Date(dl);
                            }
                            // Si es string de fecha simple (YYYY-MM-DD)
                            else if (typeof dl === 'string') {
                                deadlineDate = new Date(dl);
                            }
                        }
                        const dateStr = deadlineDate && !isNaN(deadlineDate.getTime()) ? deadlineDate.toLocaleDateString('en-CA') : '';
                        const timeStr = deadlineDate && !isNaN(deadlineDate.getTime()) ? deadlineDate.toTimeString().substring(0, 5) : '';
                        return `
                    <div id="section-alarm-${item.id}" class="space-y-2 ${hasAlarm ? '' : 'hidden'}">
                        <label class="txt-label ml-1">⏰ Alarma</label>
                        <div class="flex gap-2">
                            <input type="date" id="inline-date-${item.id}" value="${dateStr}" 
                                   class="flex-1 bg-white/40 border-none rounded-2xl px-4 py-3 txt-small focus:ring-2 focus:ring-white/50 outline-none text-ink">
                            <input type="time" id="inline-time-${item.id}" value="${timeStr}" 
                                   class="flex-1 bg-white/40 border-none rounded-2xl px-4 py-3 txt-small focus:ring-2 focus:ring-white/50 outline-none text-ink">
                        </div>
                    </div>`;
                    })()}
                </div>

                <div id="section-desc-${item.id}" class="space-y-2 ${hasDesc ? '' : 'hidden'}">
                    <label class="txt-label ml-1">Descripción</label>
                    <textarea id="inline-desc-${item.id}" class="w-full bg-white/40 border-none rounded-2xl px-5 py-4 min-h-[60px] txt-body text-ink focus:ring-2 focus:ring-white/50 resize-none outline-none field-sizing-content" 
                              placeholder="Añade detalles, links o pensamientos adicionales...">${item.descripcion || ''}</textarea>
                </div>

                <div id="section-tasks-${item.id}" class="space-y-3 ${hasTasks ? '' : 'hidden'}">
                    <div class="flex justify-between items-center px-1">
                        <label class="txt-label">Tareas</label>
                        <button class="btn-add-inline-task txt-button text-ink hover:opacity-70 border-b border-current">+ Añadir tarea</button>
                    </div>
                    <div id="inline-tasks-list-${item.id}" class="space-y-2">
                        ${tareasHtml}
                    </div>
                </div>

                <div id="section-url-${item.id}" class="space-y-2 ${hasUrl ? '' : 'hidden'}">
                    <label class="txt-label ml-1">Enlace Principal</label>
                    <div class="relative">
                        <i class="fa-solid fa-link absolute left-4 top-1/2 -translate-y-1/2 text-ink/30"></i>
                        <input type="url" id="inline-url-${item.id}" value="${item.url || ''}" 
                               class="w-full bg-white/40 border-none rounded-2xl pl-10 pr-5 py-4 txt-small text-ink placeholder-ink/30 focus:ring-2 focus:ring-white/50 outline-none" 
                               placeholder="https://google.com/ejemplo">
                    </div>
                </div>

                <!-- Barra de Deseos (Wishbar) -->
                <div class="flex flex-wrap justify-center gap-2 py-4 border-t border-gray-50">
                    ${!hasTasks ? `<button data-reveal="tasks" class="wish-item px-4 py-2 rounded-full text-gray-400 hover:text-brand transition-all text-[10px] font-bold uppercase tracking-wider flex items-center gap-2"><i class="fa-solid fa-check-double"></i> + Tareas</button>` : ''}
                    ${!hasDesc ? `<button data-reveal="desc" class="wish-item px-4 py-2 rounded-full text-gray-400 hover:text-brand transition-all text-[10px] font-bold uppercase tracking-wider flex items-center gap-2"><i class="fa-solid fa-align-left"></i> + Notas</button>` : ''}
                    ${!hasAlarm ? `<button data-reveal="alarm" class="wish-item px-4 py-2 rounded-full text-gray-400 hover:text-brand transition-all text-[10px] font-bold uppercase tracking-wider flex items-center gap-2"><i class="fa-solid fa-bell"></i> + Alarma</button>` : ''}
                    ${!hasUrl ? `<button data-reveal="url" class="wish-item px-4 py-2 rounded-full text-gray-400 hover:text-brand transition-all text-[10px] font-bold uppercase tracking-wider flex items-center gap-2"><i class="fa-solid fa-link"></i> + Link</button>` : ''}
                </div>

                <div class="flex gap-4 pt-6 border-t border-gray-100">
                    <button class="action-save-inline flex-[2] bg-brand text-white txt-button py-2 rounded-2xl shadow-sticker hover:bg-brand-dark transform active:scale-[0.98] transition-all">
                        Guardar
                    </button>
                    <button class="action-collapse flex-1 bg-gray-50 text-gray-400 txt-button py-2 rounded-2xl hover:bg-gray-100 transition-all">
                        Cerrar
                    </button>
                    <button class="action-delete-inline flex-none bg-red-50 text-red-300 hover:text-red-500 p-4 rounded-2xl transition-all" title="Eliminar definitivamente">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
        `;

        this.bindInlineEvents(card, item);
    },

    expandCard(card, item) {
        let hadExpanded = false;
        document.querySelectorAll('[data-expanded="true"]').forEach(c => {
            if (c !== card) {
                c.dataset.expanded = 'false';
                hadExpanded = true;
            }
        });
        // Recargar una sola vez si había otra tarjeta expandida
        if (hadExpanded && window.kai) window.kai.loadItems();

        this.updateCardContent(card, item, true);
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    bindInlineEvents(card, item) {
        const id = item.id;

        card.querySelectorAll('.action-collapse').forEach(btn => {

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                card.dataset.expanded = 'false';
                this.updateCardContent(card, item, false);
            });
        });

        // Barra de Deseos (Revelar secciones)
        card.querySelectorAll('.wish-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const type = btn.dataset.reveal;
                const section = card.querySelector(`#section-${type}-${id}`);
                if (section) {
                    section.classList.remove('hidden');
                    section.classList.add('animate-fadeIn');
                    btn.classList.add('hidden'); // Ocultar el botón de la wishbar una vez usado

                    // Foco especial según el tipo
                    if (type === 'desc') section.querySelector('textarea')?.focus();
                    if (type === 'url') section.querySelector('input')?.focus();
                    if (type === 'alarm') section.querySelector('input[type="date"]')?.focus();
                    if (type === 'tasks') {
                        // Si no hay tareas, añadimos la primera automáticamente
                        const list = section.querySelector(`#inline-tasks-list-${id}`);
                        if (list && list.children.length === 0) {
                            this.addInlineTask(id);
                        }
                    }
                }
            });
        });

        card.querySelector('.action-save-inline')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleInlineSave(card, item);
        });

        card.querySelector('.action-delete-inline')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (confirm('¿Seguro que quieres borrar este recuerdo para siempre?')) {
                if (window.kai) window.kai.deleteItem(id);
            }
        });

        card.querySelector('.btn-add-inline-task')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.addInlineTask(id);
        });

        card.querySelectorAll('.btn-remove-inline').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                btn.closest('.group\\/task').remove();
            });
        });
    },

    addInlineTask(id) {
        const list = document.getElementById(`inline-tasks-list-${id}`);
        if (!list) return;
        const div = document.createElement('div');
        div.className = 'flex items-start gap-3 p-2 rounded-xl group/task animate-fadeIn border-b border-gray-100/50';
        div.innerHTML = `
            < input type = "checkbox" class="kawaii-checkbox mt-1" >
            <textarea rows="1" class="flex-1 bg-transparent border-none font-bold text-sm text-ink outline-none focus:ring-0 inline-task-input resize-none" placeholder="¿Qué sigue?"></textarea>
            <button class="btn-remove-inline text-ink/20 hover:text-ink px-2 transition-colors mt-1"><i class="fa-solid fa-xmark"></i></button>
        `;
        div.querySelector('.btn-remove-inline').addEventListener('click', () => div.remove());
        list.appendChild(div);
        div.querySelector('textarea').focus();
    },

    async handleInlineSave(card, item) {
        const id = item.id;
        const content = document.getElementById(`inline-content-${id}`).value;
        const type = document.getElementById(`inline-type-${id}`).value;
        const descripcion = document.getElementById(`inline-desc-${id}`)?.value || '';
        const url = document.getElementById(`inline-url-${id}`)?.value || '';
        const date = document.getElementById(`inline-date-${id}`)?.value || '';
        const time = document.getElementById(`inline-time-${id}`)?.value || '';
        
        let deadline = null;
        if (date && time) {
            // Crear fecha local y convertir a ISO string
            const [year, month, day] = date.split('-').map(Number);
            const [hour, minute] = time.split(':').map(Number);
            const d = new Date(year, month - 1, day, hour, minute, 0, 0);
            deadline = d.toISOString();
        } else if (date) {
            // Solo fecha, sin hora - crear a medianoche UTC
            deadline = date + 'T00:00:00.000Z';
        } else {
            // No hay deadline
            deadline = null;
        }

        const tareas = [];
        card.querySelectorAll('#inline-tasks-list-' + id + ' .group\\/task').forEach(row => {
            const titulo = row.querySelector('.inline-task-input').value.trim();
            if (titulo) {
                tareas.push({
                    titulo,
                    completado: row.querySelector('.kawaii-checkbox').checked
                });
            }
        });

        const updates = { id, content, type, descripcion, url, tareas, deadline };

        if (window.kai) {
            await window.kai.dataUpdateInline(id, updates);
            card.dataset.expanded = 'false';
            await window.kai.loadItems();
        }
    },

    renderBreadcrumb(path = []) {
        const bread = this.elements.breadcrumb();
        if (!bread) return;

        let html = '<a href="#" data-action="home" class="hover:text-brand transition">Inicio</a>';
        path.forEach(item => {
            html += ` < span class="mx-1 text-gray-300" > /</span > <a href="#" data-id="${item.id}" data-action="navigate" class="hover:text-brand transition">${this.truncate(item.content, 20)}</a>`;
        });
        bread.innerHTML = html;

        // Bind breadcrumb events
        bread.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const id = link.dataset.id;
                const action = link.dataset.action;
                if (action === 'home') {
                    if (window.kai) window.kai.goHome();
                } else if (action === 'navigate') {
                    if (window.kai) window.kai.navigateTo(id);
                }
            });
        });
    },

    // --- FORMULARIOS & ENTRADAS ---

    getMainInputData() {
        const input = this.elements.inputMain();
        const type = this.elements.typeSelect();
        return {
            content: input ? input.value.trim() : '',
            type: type ? type.value : 'note'
        };
    },

    clearMainInput() {
        const input = this.elements.inputMain();
        if (input) input.value = '';
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
        const deadline = (date && time) ? `${date}T${time} ` : (date || null);

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

        const typeSelect = document.getElementById('edit-type');
        const itemType = item.type || 'nota';
        if (typeSelect.querySelector(`option[value = "${itemType}"]`)) {
            typeSelect.value = itemType;
        } else {
            typeSelect.value = 'nota';
        }

        document.getElementById('edit-description').value = item.descripcion || '';
        document.getElementById('edit-url').value = item.url || '';
        document.getElementById('edit-tags').value = (item.tags || []).join(', ');

        if (item.deadline) {
            let dt = null;
            const dl = item.deadline;
            if (typeof dl === 'number') {
                dt = new Date(dl);
            } else if (typeof dl === 'string') {
                dt = new Date(dl);
            }
            if (dt && !isNaN(dt.getTime())) {
                document.getElementById('edit-deadline-date').value = dt.toLocaleDateString('en-CA');
                document.getElementById('edit-deadline-time').value = dt.toTimeString().substring(0, 5);
            } else {
                document.getElementById('edit-deadline-date').value = '';
                document.getElementById('edit-deadline-time').value = '';
            }
        } else {
            document.getElementById('edit-deadline-date').value = '';
            document.getElementById('edit-deadline-time').value = '';
        }

        const container = this.elements.tasksContainer();
        if (container) {
            container.innerHTML = '';
            const tareas = item.tareas || [];
            tareas.forEach(task => this.addTaskToModal(task));

            if (tareas.length === 0 && focus === 'tasks') {
                this.addTaskToModal();
            }
        }

        setTimeout(() => {
            if (focus === 'tasks') {
                const firstTask = container?.querySelector('input[type="text"]');
                if (firstTask) firstTask.focus();
            } else if (focus === 'description') {
                document.getElementById('edit-description').focus();
            } else {
                document.getElementById('edit-content').focus();
            }
        }, 100);
    },

    addTaskToModal(task = { titulo: '', completado: false }) {
        const container = this.elements.tasksContainer();
        if (!container) return;
        const div = document.createElement('div');
        div.className = 'flex items-start gap-3 bg-gray-50 p-3 rounded-xl border-2 border-transparent hover:border-brand/20 transition-all';
        div.innerHTML = `
            < input type = "checkbox" class="kawaii-checkbox mt-1" ${task.completado ? 'checked' : ''}
        onchange = "this.parentElement.querySelector('.task-item-input').dataset.completado = this.checked" >
            <textarea rows="1" class="task-item-input flex-1 bg-transparent border-none font-bold text-ink outline-none resize-none" 
                   data-completado="${task.completado}" placeholder="¿Cuál es el siguiente paso?">${this.escapeHtml(task.titulo)}</textarea>
            <button type="button" class="btn-remove-task text-ink/30 hover:text-urgent transition-colors mt-1"><i class="fa-solid fa-xmark"></i></button>
        `;

        div.querySelector('.btn-remove-task').addEventListener('click', () => div.remove());
        container.appendChild(div);
    },

    // --- VISIBILIDAD & ESTADOS (LEGACY MODAL SUPPORT) ---

    toggleSidebar() {
        this.elements.sidebar()?.classList.toggle('-translate-x-full');
    },

    // El modal ya no se usa para editar, pero lo mantenemos por si acaso para otros fines
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

        toast.className = `fixed top - 10 left - 1 / 2 - translate - x - 1 / 2 ${colors[type] || 'bg-brand'} text - ink font - bold px - 8 py - 4 rounded - blob shadow - float z - [500] transform - translate - y - 20 transition - all duration - 300`;
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
            < div class="col-span-full py-20 text-center animate-bounce-slow" >
                    <span class="text-6xl">🧠</span>
                    <p class="mt-4 font-bold text-brand italic underline decoration-brand-dark decoration-4">KAI está conectando neuronas...</p>
                </div >
    `;
        }
    },

    renderError(message) {
        if (this.elements.container()) {
            this.elements.container().innerHTML = `
    < div class="col-span-full bg-urgent/10 p-12 rounded-blob text-center border-4 border-dashed border-urgent/30" >
                    <span class="text-6xl">😵‍💫</span>
                    <p class="mt-4 font-bold text-ink text-xl">${message}</p>
                    <button onclick="location.reload()" class="mt-6 bg-white px-6 py-2 rounded-full shadow-sticker font-bold">Reintentar</button>
                </div >
    `;
        }
    }
};
