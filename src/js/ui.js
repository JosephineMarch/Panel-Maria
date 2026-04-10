import { CONFIG } from './supabase.js';
import { data } from './data.js';

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
        kaiAvatarContainer: () => document.getElementById('kai-avatar-container'),
        kaiChatWindow: () => document.getElementById('kai-chat-overlay'),
        kaiChatMessages: () => document.getElementById('kai-chat-messages'),
        kaiChatInput: () => document.getElementById('kai-chat-input'),
        kaiChatSend: () => document.getElementById('kai-chat-send'),
        kaiChatClose: () => document.getElementById('kai-chat-back'),
    },

    // Configuración de etiquetas (tags: solo texto brand, tipos: bg brand)
    tagConfig: {
        logro: { bg: 'bg-transparent', text: 'text-brand', border: 'border-brand' },
        salud: { bg: 'bg-transparent', text: 'text-brand', border: 'border-brand' },
        emocion: { bg: 'bg-transparent', text: 'text-brand', border: 'border-brand' },
        alarma: { bg: 'bg-transparent', text: 'text-brand', border: 'border-brand' },
    },

    // Configuración de tipos (para las cards)
    // Solo el header tiene color cuando está desplegado (proyectos)
    typeConfig: {
        nota: {
            color: 'nota',
            icon: '📝',
            bg: 'bg-lemon',
            text: 'text-ink',
            headerBg: null,  // Sin header de color
            label: 'NOTA'
        },
        tarea: {
            color: 'tarea',
            icon: '✅',
            bg: 'bg-soft-blue',
            text: 'text-ink',
            headerBg: null,
            label: 'TAREA'
        },
        proyecto: {
            color: 'proyecto',
            icon: '📁',
            bg: 'bg-brand',
            text: 'text-white',
            headerBg: 'bg-brand',  // Header sólido para proyectos
            label: 'PROYECTO'
        },
        directorio: {
            color: 'directorio',
            icon: '🔗',
            bg: 'bg-lavender',
            text: 'text-ink',
            headerBg: null,
            label: 'ENLACE'
        },
        logro: {
            color: 'logro',
            icon: '🏆',
            bg: 'bg-success',
            text: 'text-white',
            headerBg: null,
            label: 'LOGRO'
        },
    },


    init() {
        // Asegurar que el contenedor existe
        if (!this.elements.container()) {
            const container = document.createElement('div');
            container.id = 'items-container';
            document.getElementById('app')?.appendChild(container);
        }
        // Inicializar overlay para cards pinned expandidas
        this.initPinnedOverlay();
    },

    renderTags(tags) {
        if (!tags || tags.length === 0) return '';
        return tags.map(tag => {
            const config = this.tagConfig[tag];
            if (!config) return '';
            return `<span class="${config.bg} ${config.text} ${config.border} border px-2 py-0.5 rounded-full text-[10px] font-semibold">${tag}</span>`;
        }).join('');
    },

    // Previsualización de URLs clicables (consistente en todas las cards)
    renderUrlPreviews(item, maxVisible = 2) {
        const urls = Array.isArray(item.urls) ? item.urls : (item.url ? [item.url] : []);
        if (urls.length === 0) return '';
        
        const validUrls = urls.filter(u => u);
        if (validUrls.length === 0) return '';
        
        const linksHtml = validUrls.slice(0, maxVisible).map(u => {
            const urlLabel = u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
            return `<a href="${encodeURI(u)}" target="_blank" rel="noopener noreferrer" 
                        class="flex items-center gap-1.5 text-sm text-action hover:text-action/70 hover:underline underline-offset-2 transition-colors">
                        <i class="fa-solid fa-link text-[9px] shrink-0"></i>
                        <span class="truncate">${urlLabel}</span>
                    </a>`;
        }).join('');
        
        const hiddenCount = validUrls.length - maxVisible;
        const moreText = hiddenCount > 0 ? `<p class="text-[10px] font-bold text-brand">+ ${hiddenCount} enlace${hiddenCount > 1 ? 's' : ''}...</p>` : '';
        
        return `<div class="mt-2 space-y-1">${linksHtml}${moreText}</div>`;
    },

    toggleKaiChat(show = null) {
        const chatOverlay = this.elements.kaiChatWindow();
        if (!chatOverlay) return;

        const isHidden = chatOverlay.classList.contains('hidden');
        const shouldShow = show !== null ? show : isHidden;

        if (shouldShow) {
            chatOverlay.classList.remove('hidden');
            this.elements.kaiChatInput()?.focus();
        } else {
            chatOverlay.classList.add('hidden');
        }
    },

    addKaiMessage(text, isAi = true) {
        const container = this.elements.kaiChatMessages();
        if (!container) return;

        const msg = document.createElement('div');
        msg.className = isAi
            ? 'bg-white p-4 rounded-2xl rounded-bl-none shadow-sm max-w-[85%] animate-fadeIn break-words'
            : 'bg-brand p-4 rounded-2xl rounded-br-none text-white font-medium max-w-[85%] ml-auto animate-fadeIn break-words';

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
            thinking.className = 'bg-gray-100 px-4 py-2 rounded-full text-xs text-gray-500 flex items-center gap-2';
            thinking.innerHTML = '<span class="text-sm">...</span>';
            container.appendChild(thinking);
            container.scrollTop = container.scrollHeight;
        } else {
            document.getElementById('kai-thinking')?.remove();
        }
    },

    renderAchievementsDashboard(items) {
        const achievements = items.filter(item => item.type === 'logro' || (item.tags && item.tags.includes('logro')));
        const container = this.elements.container();

        container.innerHTML = `
            <div class="space-y-8 animate-fadeIn">
                <div class="text-center py-6">
                    <div class="inline-block bg-success/10 p-4 rounded-blob mb-4 scale-125">
                        <span class="text-5xl">🏆</span>
                    </div>
                    <h1 class="text-2xl font-black text-ink">Mis Logros</h1>
                    <p class="text-base text-ink/50 mt-2 font-medium">Llevas ${achievements.length} hitos alcanzados. ¡Sigue así!</p>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    ${achievements.length > 0 ? achievements.map(item => `
                        <div class="bg-white border-2 border-success/20 p-5 rounded-[2rem] shadow-sticker hover:scale-[1.02] transition-all group relative overflow-hidden">
                            <div class="absolute -right-4 -top-4 text-success/5 text-8xl grayscale opacity-20 group-hover:grayscale-0 group-hover:opacity-10 transition-all">🏆</div>
                            <div class="flex items-start gap-4">
                                <span class="text-3xl bg-success/10 p-3 rounded-2xl">✨</span>
                                <div class="flex-1 min-w-0">
                                    <h3 class="text-base font-bold text-ink leading-tight">${this.escapeHtml(item.content)}</h3>
                                    <p class="text-sm text-ink/60 mt-1">${item.descripcion ? this.escapeHtml(this.truncate(item.descripcion, 60)) : 'Sin descripción'}</p>
                                    <div class="mt-3 text-[10px] font-bold text-success flex items-center gap-1 uppercase tracking-wider">
                                        <i class="fa-solid fa-calendar"></i>
                                        ${new Date(item.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('') : `
                        <div class="col-span-full py-20 text-center opacity-30">
                            <p class="text-xl font-bold italic text-ink">Aún no hay logros aquí... ¡Pero pronto los habrá! 😉</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    },

    // --- CARD RENDERERS ---

    render(items = [], isDemo = false) {
        const container = this.elements.container();
        if (!container) return;

        container.innerHTML = '';

        const currentFilter = document.querySelector('.nav-btn.active')?.dataset.filter || 'todos';

        // Dashboard de Logros (Si el filtro es logros)
        if (currentFilter === 'logro' || currentFilter === 'logros') {
            this.renderAchievementsDashboard(items);
            return;
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

        // Separar items anclados y no anclados
        const pinnedItems = items.filter(item => item.anclado);
        const unpinnedItems = items.filter(item => !item.anclado);

        // Mostrar primero los items anclados como slider horizontal
        if (pinnedItems.length > 0) {
            const pinnedSection = document.createElement('div');
            pinnedSection.className = 'pinned-section my-6';

            const separatorHtml = `
                <div class="flex items-center gap-4 mb-3">
                    <div class="h-px flex-1 bg-brand/30"></div>
                    <span class="text-xs font-bold text-brand uppercase tracking-widest px-2">📌 Fijados</span>
                    <div class="h-px flex-1 bg-brand/30"></div>
                </div>
            `;

            const sliderWrapper = document.createElement('div');
            sliderWrapper.className = 'pinned-slider-wrapper relative';

            const arrowLeft = document.createElement('button');
            arrowLeft.className = 'pinned-slider-arrow pinned-slider-arrow--left';
            arrowLeft.id = 'pinned-arrow-left';
            arrowLeft.setAttribute('aria-label', 'Desplazar izquierda');
            arrowLeft.textContent = '◀';

            const slider = document.createElement('div');
            slider.className = 'pinned-slider';
            slider.id = 'pinned-slider';

            pinnedItems.forEach(item => {
                const card = this.createItemCard(item, true);
                slider.appendChild(card);
            });

            const arrowRight = document.createElement('button');
            arrowRight.className = 'pinned-slider-arrow pinned-slider-arrow--right';
            arrowRight.id = 'pinned-arrow-right';
            arrowRight.setAttribute('aria-label', 'Desplazar derecha');
            arrowRight.textContent = '▶';

            sliderWrapper.appendChild(arrowLeft);
            sliderWrapper.appendChild(slider);
            sliderWrapper.appendChild(arrowRight);

            const dotsContainer = document.createElement('div');
            dotsContainer.className = 'pinned-slider-dots';
            dotsContainer.id = 'pinned-dots';

            pinnedSection.innerHTML = separatorHtml;
            pinnedSection.appendChild(sliderWrapper);
            pinnedSection.appendChild(dotsContainer);
            container.appendChild(pinnedSection);

            // Inicializar slider después de renderizar
            requestAnimationFrame(() => this.initPinnedSlider(pinnedItems.length));
        }

        // Luego mostrar los no anclados agrupados por fecha
        if (unpinnedItems.length > 0) {
            const grouped = this.groupItemsByDate(unpinnedItems);

            Object.keys(grouped).forEach(dateLabel => {
                const dateSeparator = document.createElement('div');
                dateSeparator.className = 'flex items-center gap-4 my-6';
                dateSeparator.innerHTML = `
                    <div class="h-px flex-1 bg-gray-200"></div>
                    <span class="text-xs font-bold text-gray-400 uppercase tracking-widest px-2">${dateLabel}</span>
                    <div class="h-px flex-1 bg-gray-200"></div>
                `;
                container.appendChild(dateSeparator);

                grouped[dateLabel].forEach(item => {
                    container.appendChild(this.createItemCard(item));
                });
            });
        }
    },

    groupItemsByDate(items) {
        const groups = {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const last7Days = new Date(today);
        last7Days.setDate(last7Days.getDate() - 7);

        items.forEach(item => {
            const itemDate = new Date(item.created_at);
            itemDate.setHours(0, 0, 0, 0);

            let label;
            if (itemDate.getTime() === today.getTime()) {
                label = 'Hoy';
            } else if (itemDate.getTime() === yesterday.getTime()) {
                label = 'Ayer';
            } else if (itemDate >= last7Days) {
                label = itemDate.toLocaleDateString('es-ES', { weekday: 'long', month: 'short', day: 'numeric' });
            } else {
                label = itemDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
            }

            if (!groups[label]) groups[label] = [];
            groups[label].push(item);
        });

        return groups;
    },

    createItemCard(item, isPinned = false) {
        const id = item.id;
        const card = document.createElement('div');
        card.dataset.id = id;
        card.dataset.expanded = 'false';

        this.updateCardContent(card, item, false, isPinned);

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

    updateCardContent(card, item, expanded = false, isPinned = false) {
        // Normalizar tipo — convierte tipos viejos en inglés a español
        const tipoNorm = CONFIG.migrarTipo(item.type);
        const itemNorm = { ...item, type: tipoNorm };

        const config = this.typeConfig[tipoNorm] || this.typeConfig['nota'];
        const isProject = tipoNorm === 'proyecto';

        if (expanded) {
            this.renderExpandedCard(card, itemNorm, config, isPinned);
        } else {
            this.renderCollapsedCard(card, itemNorm, config, isProject, isPinned);
        }
    },

    renderCollapsedCard(card, item, config, isProject, isPinned = false) {
        const themeClass = `theme-${config.color}`;

        if (isProject) {
            let progressWidth = '0%';
            if (item.tareas && item.tareas.length > 0) {
                const completed = item.tareas.filter(t => t.completado).length;
                progressWidth = `${Math.round((completed / item.tareas.length) * 100)}%`;
            }

            const pinnedClass = isPinned ? 'pinned-card' : '';
            card.className = `group item-card bg-white rounded-[2rem] shadow-sticker border-2 border-gray-100 overflow-hidden mb-8 transition-all duration-300 ${pinnedClass}`;
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
                <!-- Header Sólido para Proyectos -->
                <div class="${typeConfig.headerBg || typeConfig.bg} p-4 flex justify-between items-center">
                    <div class="flex items-center gap-3 min-w-0 flex-1">
                        <span class="text-xl bg-white/20 p-2 rounded-xl backdrop-blur-sm">${typeConfig.icon}</span>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-0.5">
                                <span class="${typeConfig.bg} ${typeConfig.text} text-[9px] px-2 py-0.5 rounded-full font-semibold">${typeConfig.label}</span>
                                ${deadlineHtml ? `<span class="opacity-60">${deadlineHtml}</span>` : ''}
                            </div>
                            <h3 class="txt-title text-white">${this.escapeHtml(item.content)}</h3>
                            <!-- Barra de Progreso en Header -->
                            ${item.tareas && item.tareas.length > 0 ? `
                                <div class="mt-2 flex items-center gap-2 bg-white/20 p-1 px-2 rounded-full">
                                    <div class="flex-1 bg-white/40 h-1 rounded-full overflow-hidden">
                                        <div class="bg-white h-full" style="width: ${progressWidth}"></div>
                                    </div>
                                    <span class="text-[9px] font-bold text-white/80">${item.tareas.filter(t => t.completado).length}/${item.tareas.length}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button class="btn-pin p-2 text-white/50 hover:text-white transition-colors" data-id="${item.id}" title="${item.anclado ? 'Desanclar' : 'Anclar'}">
                            <i class="fa-solid fa-thumbtack ${item.anclado ? 'rotate-45' : ''}"></i>
                        </button>
                        <i class="fa-solid fa-expand bg-white/20 p-2 rounded-full text-xs transition-transform group-hover:scale-110 cursor-pointer action-expand" data-id="${item.id}"></i>
                        <button class="action-delete p-2 text-white/50 hover:text-red-400 transition-colors" data-id="${item.id}" title="Eliminar">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>

                <!-- Body Minimalista -->
                <div class="card-body-soft p-4 bg-brand/5 border-2 border-brand/20">
                    <!-- Previsualización de Descripción -->
                    ${item.descripcion ? (() => {
                    const descTruncada = item.descripcion.length > 200 ? item.descripcion.substring(0, 200) + '...' : item.descripcion;
                    return `<p class="text-base text-ink/70 mb-3 whitespace-pre-wrap leading-relaxed">${this.escapeHtml(descTruncada)}</p>`;
                })() : ''}

                    <!-- Previsualización de Tareas (Interactiva) -->
                    ${item.tareas && item.tareas.length > 0 ? `
                        <div class="space-y-1 mb-2">
                            ${item.tareas.slice(0, 3).map((t, idx) => `
                                <div class="flex items-center gap-3 py-1.5">
                                    <input type="checkbox" class="kawaii-checkbox timeline-task-checkbox" 
                                           ${t.completado ? 'checked' : ''} 
                                           data-id="${item.id}" data-index="${idx}">
                                    <span class="text-base text-ink ${t.completado ? 'line-through opacity-50' : 'font-medium'}">${this.escapeHtml(t.titulo)}</span>
                                </div>
                            `).join('')}
                            ${item.tareas.length > 3 ? `<p class="text-[10px] font-bold text-brand ml-7">+ ${item.tareas.length - 3} más...</p>` : ''}
                        </div>
                    ` : ''}

                    <!-- Previsualización de Enlaces (clicables) -->
                    ${this.renderUrlPreviews(item, 2)}

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
                const descTruncada = item.descripcion.length > 150 ? item.descripcion.substring(0, 150) + '...' : item.descripcion;
                previewHtml += `<p class="text-base text-ink/70 mt-2 whitespace-pre-wrap leading-relaxed">${this.escapeHtml(descTruncada)}</p>`;
            }

            // 2. Previsualización de Tareas (Checklist)
            if (item.tareas && item.tareas.length > 0) {
                const maxPreviewTasks = 3;
                const tasksPreview = item.tareas.slice(0, maxPreviewTasks).map((t, idx) => `
                    <div class="flex items-center gap-3 py-1.5">
                        <input type="checkbox" class="kawaii-checkbox timeline-task-checkbox" 
                               ${t.completado ? 'checked' : ''} 
                               data-id="${item.id}" data-index="${idx}">
                        <span class="text-base text-ink ${t.completado ? 'line-through opacity-50' : 'font-medium'}">${this.escapeHtml(t.titulo)}</span>
                    </div>
                `).join('');

                previewHtml += `
                    <div class="mt-2 space-y-0.5">
                        ${tasksPreview}
                        ${item.tareas.length > maxPreviewTasks ? `<p class="text-[10px] font-bold text-brand ml-6">+ ${item.tareas.length - maxPreviewTasks} más...</p>` : ''}
                    </div>
                `;
            }

            // 3. Previsualización de Enlaces Múltiples (clicables)
            previewHtml += this.renderUrlPreviews(item, 2);

            // 4. Barra de Progreso (Solo si hay tareas)
            let progressHtml = '';
            if (item.tareas && item.tareas.length > 0) {
                const completed = item.tareas.filter(t => t.completado).length;
                const progressWidth = `${Math.round((completed / item.tareas.length) * 100)}%`;
                progressHtml = `
                    <div class="mt-3 flex items-center gap-2">
                        <div class="flex-1 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div class="${typeConfig.bg} h-full transition-all" style="width: ${progressWidth}"></div>
                        </div>
                        <span class="text-[10px] font-bold text-ink/60">${completed}/${item.tareas.length}</span>
                    </div>
                `;
            }

            const pinnedClass = isPinned ? 'pinned-card' : '';
            card.className = `item-card bg-white rounded-2xl p-4 shadow-sticker border-2 border-gray-100 group relative hover:z-10 transition-all mb-4 w-full cursor-pointer ${pinnedClass}`;
            card.dataset.expanded = 'false';

            // Renderizar etiquetas (tags)
            const tagsHtml = this.renderTags(item.tags);

            card.innerHTML = `
                <div class="flex gap-4 items-start">
                    <div class="w-12 h-12 bg-gray-100 text-ink rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-gray-200">
                        <span class="text-2xl">${typeConfig.icon}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1 flex-wrap">
                            <span class="${typeConfig.bg} ${typeConfig.text} text-[9px] px-2 py-0.5 rounded-full font-semibold">${typeConfig.label}</span>
                            ${deadlineHtml}
                            ${fechaHtml}
                        </div>
                        <h3 class="text-base text-ink font-bold leading-snug">${this.escapeHtml(this.truncate(item.content, 80))}</h3>
                        ${progressHtml}
                        ${previewHtml}
                        ${tagsHtml ? `<div class="flex gap-1.5 flex-wrap mt-2">${tagsHtml}</div>` : ''}
                    </div>
                    <div class="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button class="btn-pin p-2 text-ink/20 hover:text-brand transition-colors" data-id="${item.id}" title="${item.anclado ? 'Desanclar' : 'Anclar'}">
                            <i class="fa-solid fa-thumbtack ${item.anclado ? 'rotate-45' : ''}"></i>
                        </button>
                        <button class="action-expand p-2 text-ink/20 hover:text-ink transition-colors" data-id="${item.id}" title="Expandir"><i class="fa-solid fa-expand"></i></button>
                        <button class="action-finish p-2 text-ink/20 hover:text-success transition-colors" data-id="${item.id}" title="Terminar"><i class="fa-solid fa-check-circle"></i></button>
                        <button class="action-delete p-2 text-ink/20 hover:text-urgent transition-colors" data-id="${item.id}" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `;
        }
    },

    renderExpandedCard(card, item, config, isPinned = false) {
        const themeClass = `theme-${config.color}`;
        const typeConfig = this.typeConfig[item.type] || this.typeConfig.note;
        const tagClass = `tag-type tag-${item.type}`;

        // Mantener las clases de pinned card si corresponde
        const pinnedClasses = isPinned ? 'pinned-card expanded-card' : '';
        card.className = `item-card bg-white rounded-[2rem] shadow-sticker border-2 border-gray-100 overflow-hidden mb-8 w-full transition-all duration-300 transform scale-[1.01] ${pinnedClasses}`;
        card.dataset.expanded = 'true';

        const tareasHtml = (item.tareas || []).map((t, idx) => `
            <div class="flex items-start gap-3 p-2 rounded-xl group/task border-b border-gray-100/50">
                <input type="checkbox" class="kawaii-checkbox mt-1" ${t.completado ? 'checked' : ''} data-index="${idx}">
                <textarea rows="1" 
                        class="flex-1 bg-transparent border-none font-medium text-base text-ink outline-none focus:ring-0 inline-task-input resize-none" 
                        placeholder="¿Qué sigue?" data-index="${idx}">${this.escapeHtml(t.titulo)}</textarea>
                <button class="btn-remove-inline text-ink/20 hover:text-ink px-2 transition-colors mt-1" data-index="${idx}"><i class="fa-solid fa-xmark"></i></button>
            </div>
        `).join('');

        const hasDesc = !!item.descripcion;
        const hasTasks = (item.tareas || []).length > 0;
        const urls = Array.isArray(item.urls) ? item.urls : (item.url ? [item.url] : []);
        const hasUrl = urls.some(u => u);
        const hasAlarm = !!item.deadline;

        // Tags del item
        const tagsHtml = this.renderTags(item.tags);
        const hasTags = tagsHtml && tagsHtml.length > 0;

        card.innerHTML = `
            <!-- Header: color sólido solo para proyectos -->
            <div class="${typeConfig.headerBg || typeConfig.bg} p-6 ${typeConfig.headerBg ? 'text-white' : 'text-ink'} flex justify-between items-center rounded-t-3xl">
                <div class="flex items-center gap-4 flex-1">
                    <span class="text-3xl ${typeConfig.headerBg ? 'bg-white/20' : 'bg-white/40'} p-3 rounded-2xl backdrop-blur-sm">${typeConfig.icon}</span>
                    <input type="text" id="inline-content-${item.id}" value="${this.escapeHtml(item.content)}" 
                           class="bg-white/20 border-none rounded-xl px-4 py-2 txt-display ${typeConfig.headerBg ? 'text-white placeholder-white/50' : 'text-ink placeholder-ink/50'} focus:ring-2 focus:ring-white/50 w-full outline-none" placeholder="Título...">
                </div>
                <button class="action-collapse bg-white/20 hover:bg-white/30 p-3 rounded-full transition-all ml-4">
                    <i class="fa-solid fa-compress"></i>
                </button>
            </div>
            
            <!-- Body: fondo blanco suave -->
            <div class="p-6 space-y-6 rounded-b-3xl bg-white">
                <!-- Secciones de Contenido (Dinámicas) -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-2">
                        <label class="txt-label ml-1">Tipo</label>
                        <select id="inline-type-${item.id}" class="w-full bg-white/40 border-none rounded-2xl px-4 py-3 text-base text-ink focus:ring-2 focus:ring-white/50 outline-none font-bold">
                            <option value="nota" ${item.type === 'nota' || item.type === 'idea' || item.type === 'note' ? 'selected' : ''}>📝 Nota</option>
                            <option value="tarea" ${item.type === 'tarea' || item.type === 'task' ? 'selected' : ''}>✅ Tarea (Checklist)</option>
                            <option value="proyecto" ${item.type === 'proyecto' || item.type === 'project' ? 'selected' : ''}>📁 Proyecto</option>
                            <option value="directorio" ${item.type === 'directorio' || item.type === 'link' ? 'selected' : ''}>🔗 Enlace</option>
                        </select>
                    </div>
                    
                    ${hasTags ? `<div class="space-y-2"><label class="txt-label ml-1">Etiquetas</label><div class="flex gap-2 flex-wrap">${tagsHtml}</div></div>` : ''}
                    
                    ${(() => {
                // Selector de Energía (Solo si es Salud/Bienestar)
                return `
                    <!-- Selector de Energía (Solo si es Salud/Bienestar) -->
                    <div class="space-y-2 ${item.tags?.includes('salud') || item.tags?.includes('bienestar') || item.tags?.includes('emocion') ? '' : 'hidden'}" id="section-energy-${item.id}">
                        <label class="txt-label ml-1 flex justify-between">
                            ¿Cómo está tu energía? 
                            <span class="font-black text-brand" id="energy-val-${item.id}">${item.meta?.energia || 5}/10</span>
                        </label>
                        <input type="range" id="inline-energy-${item.id}" min="1" max="10" step="1" 
                               value="${item.meta?.energia || 5}" 
                               class="w-full accent-brand cursor-pointer h-2 bg-gray-100 rounded-lg appearance-none"
                               oninput="document.getElementById('energy-val-${item.id}').textContent = this.value + '/10'">
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
                    </div>
                    <div id="inline-tasks-list-${item.id}" class="space-y-2">
                        ${tareasHtml}
                    </div>
                    <div class="flex justify-center pt-2">
                        <button class="btn-add-inline-task group flex items-center gap-2 px-6 py-3 bg-gray-50 hover:bg-gray-100 rounded-2xl text-base font-bold text-gray-400 hover:text-brand transition-all border-2 border-dashed border-gray-200 hover:border-brand/30">
                            <i class="fa-solid fa-plus-circle text-lg"></i>
                            Añadir tarea
                        </button>
                    </div>
                </div>

                <div id="section-url-${item.id}" class="space-y-2 ${hasUrl ? '' : 'hidden'}">
                    <label class="txt-label ml-1">Enlaces</label>
                    <div id="inline-urls-list-${item.id}" class="space-y-2">
                        ${(() => {
                            const urls = Array.isArray(item.urls) ? item.urls : (item.url ? [item.url] : []);
                            return urls.map((u, idx) => `
                                <div class="relative flex gap-2 animate-fadeIn">
                                    <i class="fa-solid fa-link absolute left-4 top-1/2 -translate-y-1/2 text-ink/30"></i>
                                    <input type="url" data-url-index="${idx}" value="${u || ''}" 
                                           class="w-full bg-white/40 border-none rounded-2xl pl-10 pr-5 py-3 text-base text-ink placeholder-ink/30 focus:ring-2 focus:ring-white/50 outline-none font-medium" 
                                           placeholder="https://...">
                                    <button type="button" class="btn-remove-url px-3 text-ink/30 hover:text-urgent transition-colors" data-index="${idx}">
                                        <i class="fa-solid fa-xmark"></i>
                                    </button>
                                </div>
                            `).join('');
                        })()}
                    </div>
                    <button type="button" class="btn-add-inline-url w-full flex items-center justify-center gap-2 py-2 text-brand hover:text-brand-dark transition-all text-sm font-bold">
                        <i class="fa-solid fa-plus-circle"></i> Añadir otro enlace
                    </button>
                </div>

                <div id="section-alarm-${item.id}" class="space-y-4 ${hasAlarm ? '' : 'hidden'}">
                    <div class="flex justify-between items-center px-1">
                        <label class="txt-label flex items-center gap-2"><i class="fa-solid fa-bell text-brand"></i> Alarma / Deadline</label>
                        <button type="button" class="btn-remove-alarm text-ink/30 hover:text-urgent transition-colors text-sm" data-item-id="${item.id}">
                            <i class="fa-solid fa-trash"></i> Quitar
                        </button>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-1">
                            <label class="txt-label ml-1">Fecha</label>
                            <input type="date" id="inline-alarm-date-${item.id}" value="${(() => {
                                if (!item.deadline) return '';
                                const d = new Date(item.deadline);
                                return d.toISOString().split('T')[0];
                            })()}" 
                                   class="w-full bg-white/40 border-none rounded-2xl px-4 py-3 text-base text-ink focus:ring-2 focus:ring-white/50 outline-none font-medium">
                        </div>
                        <div class="space-y-1">
                            <label class="txt-label ml-1">Hora</label>
                            <input type="time" id="inline-alarm-time-${item.id}" value="${(() => {
                                if (!item.deadline) return '';
                                const d = new Date(item.deadline);
                                return d.toTimeString().slice(0, 5);
                            })()}" 
                                   class="w-full bg-white/40 border-none rounded-2xl px-4 py-3 text-base text-ink focus:ring-2 focus:ring-white/50 outline-none font-medium">
                        </div>
                    </div>
                    <div class="space-y-1">
                        <label class="txt-label ml-1">Repetición</label>
                        <select id="inline-alarm-repeat-${item.id}" class="w-full bg-white/40 border-none rounded-2xl px-4 py-3 text-base text-ink focus:ring-2 focus:ring-white/50 outline-none font-bold">
                            <option value="" ${!item.repeat ? 'selected' : ''}>Sin repetición</option>
                            <option value="daily" ${item.repeat === 'daily' ? 'selected' : ''}>📅 Diario</option>
                            <option value="weekly" ${item.repeat === 'weekly' ? 'selected' : ''}>📆 Semanal</option>
                            <option value="monthly" ${item.repeat === 'monthly' ? 'selected' : ''}>🗓️ Mensual</option>
                        </select>
                    </div>
                </div>

                <!-- Barra de Deseos (Wishbar) -->
                <div class="flex flex-wrap justify-center gap-2 py-4 border-t border-gray-50">
                    ${!hasTasks ? `<button data-reveal="tasks" class="wish-item px-4 py-2 rounded-full text-gray-400 hover:text-brand transition-all text-[10px] font-bold uppercase tracking-wider flex items-center gap-2"><i class="fa-solid fa-check-double"></i> + Tareas</button>` : ''}
                    ${!hasDesc ? `<button data-reveal="desc" class="wish-item px-4 py-2 rounded-full text-gray-400 hover:text-brand transition-all text-[10px] font-bold uppercase tracking-wider flex items-center gap-2"><i class="fa-solid fa-align-left"></i> + Descripción</button>` : ''}
                    ${!hasUrl ? `<button data-reveal="url" class="wish-item px-4 py-2 rounded-full text-gray-400 hover:text-brand transition-all text-[10px] font-bold uppercase tracking-wider flex items-center gap-2"><i class="fa-solid fa-link"></i> + Link</button>` : ''}
                    ${!hasAlarm ? `<button data-reveal="alarm" class="wish-item px-4 py-2 rounded-full text-gray-400 hover:text-brand transition-all text-[10px] font-bold uppercase tracking-wider flex items-center gap-2"><i class="fa-solid fa-bell"></i> + Alarma</button>` : ''}
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
        const isPinned = card.classList.contains('pinned-card');
        
        let hadExpanded = false;
        document.querySelectorAll('[data-expanded="true"]').forEach(c => {
            if (c !== card) {
                c.dataset.expanded = 'false';
                // Si la card que se cierra era pinned y expandida, limpiarla
                if (c.classList.contains('pinned-card')) {
                    c.classList.remove('expanded-card');
                }
                hadExpanded = true;
            }
        });
        
        // Ocultar overlay de pinned si había alguno activo
        const overlay = document.getElementById('pinned-overlay');
        if (overlay) overlay.classList.remove('active');
        
        // Recargar una sola vez si había otra tarjeta expandida
        if (hadExpanded && window.kai) window.kai.loadItems();

        this.updateCardContent(card, item, true);
        
        // Si es una card pinned, aplicar estilos de expansión que rompen del slider
        if (isPinned) {
            card.classList.add('expanded-card');
            // Mostrar overlay
            if (overlay) overlay.classList.add('active');
            // Deshabilitar scroll del body para evitar conflictos
            document.body.style.overflow = 'hidden';
        } else {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        // Guardar estado de card expandida
        if (window.kai) {
            window.kai.setExpandedCard(item.id);
        }
    },

    collapsePinnedCard(card, item) {
        card.classList.remove('expanded-card');
        const overlay = document.getElementById('pinned-overlay');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    },

    initPinnedOverlay() {
        // Crear overlay si no existe
        let overlay = document.getElementById('pinned-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'pinned-overlay';
            document.body.appendChild(overlay);
        }
        
        overlay.addEventListener('click', () => {
            const expandedCard = document.querySelector('.pinned-card.expanded-card');
            if (expandedCard && window.kai) {
                const itemId = expandedCard.dataset.id;
                expandedCard.dataset.expanded = 'false';
                this.collapsePinnedCard(expandedCard, null);
                this.updateCardContent(expandedCard, window.kai.state.items.find(i => i.id === itemId), false);
                window.kai.clearExpandedCard();
            }
        });
    },

    bindInlineEvents(card, item) {
        const id = item.id;
        const isPinned = card.classList.contains('pinned-card');

        card.querySelectorAll('.action-collapse').forEach(btn => {

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                card.dataset.expanded = 'false';
                // Si es pinned, usar el método especial de colapso
                if (isPinned) {
                    this.collapsePinnedCard(card, item);
                }
                this.updateCardContent(card, item, false);
                // Limpiar estado de card expandida
                if (window.kai) {
                    window.kai.clearExpandedCard();
                }
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

        // Eventos para URLs múltiples
        card.querySelector('.btn-add-inline-url')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.addInlineUrl(id);
        });

        card.querySelectorAll('.btn-remove-url').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                btn.closest('.relative').remove();
            });
        });

        card.querySelectorAll('.btn-remove-inline').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                btn.closest('.group\\/task').remove();
            });
        });

        // Evento para quitar alarma
        card.querySelector('.btn-remove-alarm')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const alarmSection = card.querySelector(`#section-alarm-${id}`);
            if (alarmSection) {
                alarmSection.classList.add('hidden');
                // Limpiar los valores
                const dateInput = card.querySelector(`#inline-alarm-date-${id}`);
                const timeInput = card.querySelector(`#inline-alarm-time-${id}`);
                const repeatSelect = card.querySelector(`#inline-alarm-repeat-${id}`);
                if (dateInput) dateInput.value = '';
                if (timeInput) timeInput.value = '';
                if (repeatSelect) repeatSelect.value = '';
            }
            // Mostrar el botón de la wishbar de nuevo
            const alarmWishBtn = card.querySelector('[data-reveal="alarm"]');
            if (alarmWishBtn) alarmWishBtn.classList.remove('hidden');
        });

        // Reactividad de Tipo (Cambio dinámico)
        const typeSelect = card.querySelector(`#inline-type-${id}`);
        if (typeSelect) {
            typeSelect.addEventListener('change', () => {
                const newType = typeSelect.value;
                const sections = {
                    desc: card.querySelector(`#section-desc-${id}`),
                    tasks: card.querySelector(`#section-tasks-${id}`),
                    url: card.querySelector(`#section-url-${id}`)
                };

                // 1. Mostrar/Ocultar secciones según el tipo
                if (newType === 'tarea') {
                    sections.tasks?.classList.remove('hidden');
                    if (sections.tasks && sections.tasks.querySelector('.inline-tasks-list')?.children.length === 0) {
                        this.addInlineTask(id);
                    }
                } else if (newType === 'proyecto') {
                    sections.tasks?.classList.remove('hidden');
                    sections.desc?.classList.remove('hidden');
                } else if (newType === 'directorio') {
                    sections.url?.classList.remove('hidden');
                }

                // 2. Preservación de Datos: Si se cambia desde Enlace, no perder las URLs
                const urlInputs = card.querySelectorAll(`#inline-urls-list-${id} input`);
                const descInput = card.querySelector(`#inline-desc-${id}`);

                urlInputs.forEach(urlInput => {
                    if (newType !== 'directorio' && urlInput && urlInput.value.trim()) {
                        // Mover URLs a la descripción para no perderlas
                        const urlVal = urlInput.value.trim();
                        if (descInput && !descInput.value.includes(urlVal)) {
                            descInput.value = descInput.value ? descInput.value + '\n\nEnlace: ' + urlVal : 'Enlace: ' + urlVal;
                            sections.desc?.classList.remove('hidden');
                        }
                    }
                });
            });
        }
    },

    addInlineTask(id) {
        const list = document.getElementById(`inline-tasks-list-${id}`);
        if (!list) return;
        const div = document.createElement('div');
        div.className = 'flex items-start gap-3 p-2 rounded-xl group/task animate-fadeIn border-b border-gray-100/50';
        div.innerHTML = `
            <input type="checkbox" class="kawaii-checkbox mt-1">
            <textarea rows="1" class="flex-1 bg-transparent border-none font-medium text-base text-ink outline-none focus:ring-0 inline-task-input resize-none" placeholder="¿Qué sigue?"></textarea>
            <button class="btn-remove-inline text-ink/20 hover:text-ink px-2 transition-colors mt-1"><i class="fa-solid fa-xmark"></i></button>
        `;
        div.querySelector('.btn-remove-inline').addEventListener('click', () => div.remove());
        list.appendChild(div);
        div.querySelector('textarea').focus();
    },

    addInlineUrl(id) {
        const list = document.getElementById(`inline-urls-list-${id}`);
        if (!list) return;
        const count = list.querySelectorAll('.relative').length;
        const div = document.createElement('div');
        div.className = 'relative flex gap-2 animate-fadeIn';
        div.innerHTML = `
            <i class="fa-solid fa-link absolute left-4 top-1/2 -translate-y-1/2 text-ink/30"></i>
            <input type="url" data-url-index="${count}" 
                   class="w-full bg-white/40 border-none rounded-2xl pl-10 pr-5 py-3 text-base text-ink placeholder-ink/30 focus:ring-2 focus:ring-white/50 outline-none font-medium" 
                   placeholder="https://...">
            <button type="button" class="btn-remove-url px-3 text-ink/30 hover:text-urgent transition-colors">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;
        div.querySelector('.btn-remove-url').addEventListener('click', () => div.remove());
        list.appendChild(div);
        div.querySelector('input').focus();
    },

    async handleInlineSave(card, item) {
        const id = item.id;
        const content = document.getElementById(`inline-content-${id}`).value;
        const type = document.getElementById(`inline-type-${id}`).value;
        const descripcion = document.getElementById(`inline-desc-${id}`)?.value || '';

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

        // Capturar múltiples URLs
        const urls = [];
        card.querySelectorAll(`#inline-urls-list-${id} input`).forEach(input => {
            const val = input.value.trim();
            if (val) urls.push(val);
        });

        // Capturar meta data (Energía)
        const energia = document.getElementById(`inline-energy-${id}`)?.value;
        const meta = {
            ...item.meta,
            energia: energia ? parseInt(energia) : (item.meta?.energia || null)
        };

        // Capturar datos de alarma
        const alarmDate = document.getElementById(`inline-alarm-date-${id}`)?.value;
        const alarmTime = document.getElementById(`inline-alarm-time-${id}`)?.value;
        const alarmRepeat = document.getElementById(`inline-alarm-repeat-${id}`)?.value || null;

        let deadline = null;
        if (alarmDate && alarmTime) {
            deadline = new Date(`${alarmDate}T${alarmTime}:00`).toISOString();
        } else if (alarmDate) {
            deadline = new Date(`${alarmDate}T09:00:00`).toISOString();
        }

        const updates = { id, content, type, descripcion, urls, tareas, meta, deadline, repeat: alarmRepeat };

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
            html += ` <span class="mx-1 text-gray-300">/</span> <a href="#" data-id="${item.id}" data-action="navigate" class="hover:text-brand transition">${this.truncate(item.content, 20)}</a>`;
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
            type: type ? type.value : 'nota'
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
        const deadline = (date && time) ? `${date}T${time}` : (date || null);
        const repeat = document.getElementById('edit-repeat')?.value || null;

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

        return { id, content, type, descripcion, url, tags, tareas, deadline, repeat };
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

        const repeatSelect = document.getElementById('edit-repeat');
        if (repeatSelect) {
            repeatSelect.value = item.repeat || '';
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
            <input type="checkbox" class="kawaii-checkbox mt-1" ${task.completado ? 'checked' : ''} onchange="this.parentElement.querySelector('.task-item-input').dataset.completado = this.checked">
            <textarea rows="1" class="task-item-input flex-1 bg-transparent border-none font-medium text-base text-ink outline-none resize-none" 
                   data-completado="${task.completado}" placeholder="¿Cuál es el siguiente paso?">${this.escapeHtml(task.titulo)}</textarea>
            <button type="button" class="btn-remove-task text-ink/30 hover:text-urgent transition-colors mt-1"><i class="fa-solid fa-xmark"></i></button>
        `;

        div.querySelector('.btn-remove-task').addEventListener('click', () => div.remove());
        container.appendChild(div);
    },

    // --- VISIBILIDAD & ESTADOS (LEGACY MODAL SUPPORT) ---

    toggleSidebar() {
        const sidebar = this.elements.sidebar();
        const overlay = document.getElementById('sidebar-overlay');
        sidebar?.classList.toggle('-translate-x-full');
        overlay?.classList.toggle('hidden');
    },

    openSidebar() {
        const sidebar = this.elements.sidebar();
        const overlay = document.getElementById('sidebar-overlay');
        sidebar?.classList.remove('-translate-x-full');
        overlay?.classList.remove('hidden');
    },

    closeSidebar() {
        const sidebar = this.elements.sidebar();
        const overlay = document.getElementById('sidebar-overlay');
        sidebar?.classList.add('-translate-x-full');
        overlay?.classList.add('hidden');
    },

    // El modal ya no se usa para editar, pero lo mantenemos por si acaso para otros fines
    toggleModal(show = true) {
        const modal = this.elements.modalEdit();
        if (show) modal.classList.remove('hidden');
        else modal.classList.add('hidden');
    },

    toggleAlarmsModal(show = true) {
        const modal = document.getElementById('modal-alarms');
        if (show) modal.classList.remove('hidden');
        else modal.classList.add('hidden');
    },

    showAlarmsModal(alarms) {
        const container = document.getElementById('alarms-list');
        if (!container) return;

        if (!alarms || alarms.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <span class="text-4xl">🔔</span>
                    <p class="text-gray-400 mt-4">No tienes alarmas activas</p>
                    <p class="text-sm text-gray-300 mt-2">Crea una desde el input o editando una card</p>
                </div>
            `;
        } else {
            container.innerHTML = alarms.map(item => {
                const deadline = new Date(item.deadline);
                const now = new Date();
                const diff = deadline.getTime() - now.getTime();
                const days = Math.floor(diff / 86400000);
                const hours = Math.floor((diff % 86400000) / 3600000);
                const minutes = Math.floor((diff % 3600000) / 60000);

                let timeText = '';
                if (days > 0) timeText = `${days}d ${hours}h`;
                else if (hours > 0) timeText = `${hours}h ${minutes}min`;
                else timeText = `${minutes}min`;

                const repeatText = item.repeat === 'daily' ? '📅 Diario' : 
                                  item.repeat === 'weekly' ? '📅 Semanal' : 
                                  item.repeat === 'monthly' ? '📅 Mensual' : '';

                return `
                    <div class="bg-rose-50 rounded-xl p-4 border border-rose-200 flex items-center justify-between">
                        <div class="flex-1">
                            <p class="font-bold text-ink">${this.escapeHtml(item.content || 'Sin título')}</p>
                            <p class="text-sm text-rose-500">⏰ ${timeText} • ${deadline.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                            ${repeatText ? `<p class="text-xs text-orange-500 mt-1">${repeatText}</p>` : ''}
                        </div>
                        <div class="flex gap-2">
                            <button onclick="window.controller?.openEditModal('${item.id}')" class="w-8 h-8 rounded-full bg-white hover:bg-rose-100 flex items-center justify-center transition" title="Editar">
                                <i class="fa-solid fa-pen text-xs text-rose-500"></i>
                            </button>
                            <button onclick="window.controller?.cancelAlarm('${item.id}')" class="w-8 h-8 rounded-full bg-white hover:bg-rose-100 flex items-center justify-center transition" title="Cancelar">
                                <i class="fa-solid fa-trash text-xs text-rose-500"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        this.toggleAlarmsModal(true);
    },

    async cancelAlarm(id) {
        try {
            await data.updateItem(id, { deadline: null, repeat: null });
            this.showNotification('Alarma cancelada', 'success');
            await window.controller?.loadItems();
            this.toggleAlarmsModal(false);
        } catch (error) {
            console.error('Error canceling alarm:', error);
            this.showNotification('Error al cancelar alarma', 'error');
        }
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

        toast.className = `fixed top-10 left-1/2 -translate-x-1/2 ${colors[type] || 'bg-brand'} text-ink font-bold px-8 py-4 rounded-blob shadow-float z-[500] -translate-y-20 transition-all duration-300`;
        toast.textContent = message;

        document.body.appendChild(toast);
        setTimeout(() => toast.style.transform = 'translate(-50%, 40px)', 10);

        setTimeout(() => {
            toast.style.transform = 'translate(-50%, -100px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    renderDashboard(grouped, stats, periodo = 'total') {
        const container = this.elements.container();
        if (!container) return;

        container.innerHTML = `
            <div class="animate-fadeIn space-y-10 pb-20 max-w-4xl mx-auto px-4">
                <!-- Header del Dashboard -->
                <div class="text-center pt-8 pb-4">
                    <h2 class="text-4xl font-bold text-ink mb-2">Mi Progreso ✨</h2>
                    <p class="text-ink/60 font-hand text-2xl">¡Mira todo lo que has logrado, Maria!</p>
                </div>

                <!-- SELECTOR DE PERIODO -->
                <div class="flex justify-center gap-2 mb-8">
                    ${['semana', 'mes', 'total'].map(p => `
                        <button onclick="window.kai.showDashboard('${p}')" 
                                class="px-6 py-2 rounded-full font-bold transition-all shadow-sm ${periodo === p ? 'bg-brand text-white' : 'bg-white text-ink/60 hover:bg-gray-50 border border-gray-100'}">
                            ${p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                    `).join('')}
                </div>

                <!-- WIDGETS DE ESTADÍSTICAS -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
                    <!-- Widget: Racha -->
                    <div class="bg-peach/10 border-2 border-peach/30 p-6 rounded-blob text-center transition-transform hover:scale-105">
                        <div class="text-3xl mb-1">🔥</div>
                        <div class="text-4xl font-black text-ink">${stats.racha}</div>
                        <div class="text-sm font-bold text-ink/60 uppercase tracking-wider">Días de Racha</div>
                    </div>
                    
                    <!-- Widget: Logros -->
                    <div class="bg-success/10 border-2 border-success/30 p-6 rounded-blob text-center transition-transform hover:scale-105">
                        <div class="text-3xl mb-1">🏆</div>
                        <div class="text-4xl font-black text-ink">${stats.totalLogros}</div>
                        <div class="text-sm font-bold text-ink/60 uppercase tracking-wider">Logros Guardados</div>
                    </div>

                    <!-- Widget: Progreso Tareas (Gráfico Circular CSS) -->
                    <div class="bg-action/10 border-2 border-action/30 p-6 rounded-blob text-center transition-transform hover:scale-105">
                        <div class="relative w-20 h-20 mx-auto mb-2 flex items-center justify-center rounded-full" 
                             style="background: conic-gradient(var(--color-brand) ${stats.progresoTareas * 3.6}deg, rgba(255,255,255,0.5) 0deg)">
                            <div class="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                                <span class="text-xl font-black text-ink">${stats.progresoTareas}%</span>
                            </div>
                        </div>
                        <div class="text-sm font-bold text-ink/60 uppercase tracking-wider">Tareas Listas</div>
                    </div>
                </div>

                <!-- SECCIÓN SALUD Y BIENESTAR (REDISEÑADA) -->
                <section class="space-y-6">
                    <div class="flex items-center justify-between gap-3">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl p-2 bg-peach rounded-xl shadow-sm">🌈</span>
                            <h3 class="text-2xl font-bold text-ink">Bienestar y Energía</h3>
                        </div>
                    </div>

                    <!-- Contenedor para el Informe de Kai -->
                    <div id="wellbeing-report-container" class="mb-8 hidden">
                        <!-- Aquí se inyectará el reporte de Kai -->
                    </div>

                    <!-- Contenedor para el Gráfico de Energía -->
                    <div id="energy-chart-container" class="bg-white/40 border-2 border-brand/10 p-6 rounded-blob shadow-sm overflow-hidden mb-8">
                        <h4 class="text-brand font-bold uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                            Mi Energía - Tendencia ${periodo === 'semana' ? 'Semanal' : periodo === 'mes' ? 'Mensual' : 'Total'}
                            <span class="h-px bg-brand/20 flex-1"></span>
                        </h4>
                        <div id="energy-chart-bars" class="flex items-end justify-around gap-2 h-40 pt-4">
                            <!-- JS inyectará las barras aquí -->
                        </div>
                    </div>
                </section>

                <!-- SECCIÓN PRODUCTIVIDAD -->
                <section class="space-y-6">
                    <div class="flex items-center gap-3">
                        <span class="text-2xl p-2 bg-action rounded-xl shadow-sm">🚀</span>
                        <h3 class="text-2xl font-bold text-ink">En Marcha</h3>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${grouped.productividad.length > 0 ?
                grouped.productividad.map(item => this.renderDashboardCard(item, 'bg-action/10 border-action/30')).join('') :
                '<div class="col-span-full bg-white/40 border-2 border-dashed border-gray-200 py-12 rounded-blob text-center text-ink/40 italic font-hand text-xl">Todo tranquilo por aquí. ¿Alguna meta nueva en mente? 💡</div>'
            }
                    </div>
                </section>

                <!-- SECCIÓN LOGROS (HECHO) -->
                <section class="space-y-6">
                    <div class="flex items-center gap-3">
                        <span class="text-2xl p-2 bg-success rounded-xl shadow-sm">🏆</span>
                        <h3 class="text-2xl font-bold text-ink">Mis Victorias</h3>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${grouped.hecho.length > 0 ?
                grouped.hecho.map(item => this.renderDashboardCard(item, 'bg-success/10 border-success/30')).join('') :
                '<div class="col-span-full bg-white/40 border-2 border-dashed border-gray-200 py-12 rounded-blob text-center text-ink/40 italic font-hand text-xl">¡Tus éxitos aparecerán aquí cuando termines tus tareas! 🏁</div>'
            }
                    </div>
                </section>

                <!-- Botón para volver -->
                <div class="pt-12 text-center">
                    <button onclick="window.kai.goHome()" class="bg-ink text-white font-bold px-10 py-4 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all text-lg">
                        Volver al Panel Principal 🏠
                    </button>
                </div>
            </div>
        `;
    },

    renderWellbeingReportLoading() {
        const reportContainer = document.getElementById('wellbeing-report-container');
        if (!reportContainer) return;

        reportContainer.classList.remove('hidden');
        reportContainer.innerHTML = `
            <div class="bg-white/80 border-2 border-peach/20 p-8 rounded-blob shadow-sm animate-pulse flex flex-col items-center text-center">
                <div class="text-3xl mb-4">🌸</div>
                <p class="text-ink/60 font-hand text-xl italic">Kai está analizando tus sentimientos con mucho cariño... 🌸✨</p>
            </div>
        `;
    },

    renderWellbeingReportTrigger() {
        const reportContainer = document.getElementById('wellbeing-report-container');
        if (!reportContainer) return;

        reportContainer.classList.remove('hidden');
        reportContainer.innerHTML = `
            <div class="bg-brand/5 border-2 border-dashed border-brand/20 p-10 rounded-blob flex flex-col items-center text-center group hover:bg-brand/10 transition-all">
                <div class="text-4xl mb-4 group-hover:scale-110 transition-transform">✨</div>
                <h4 class="text-brand font-bold text-xl mb-2">¿Quieres tu informe de hoy?</h4>
                <p class="text-ink/60 font-hand text-lg mb-6">Aún no es la hora de mi reporte automático, pero si quieres puedo analizar tus notas ahora mismo. 🧸🌸</p>
                <button onclick="window.kai.triggerManualReport()" 
                        class="bg-brand text-white font-bold px-8 py-3 rounded-full shadow-sticker hover:scale-105 active:scale-95 transition-all">
                    Generar Informe Ahora ✨
                </button>
            </div>
        `;
    },

    renderWellbeingReport(reportText) {
        const reportContainer = document.getElementById('wellbeing-report-container');
        if (!reportContainer) return;

        reportContainer.classList.remove('hidden');
        reportContainer.innerHTML = `
            <div class="bg-lavender/30 border-2 border-brand/20 p-8 rounded-blob shadow-md relative overflow-hidden group">
                <!-- Decoración -->
                <div class="absolute -top-4 -right-4 text-4xl opacity-10 group-hover:rotate-12 transition-transform">🌸</div>
                <div class="absolute -bottom-4 -left-4 text-4xl opacity-10 group-hover:-rotate-12 transition-transform">✨</div>
                
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center shrink-0 shadow-sm border border-brand/10 text-2xl">
                        🤖
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="text-brand font-bold uppercase tracking-widest text-xs mb-3 flex items-center gap-2">
                            Reporte de Bienestar por Kai
                            <span class="h-px bg-brand/20 flex-1"></span>
                        </h4>
                        <div class="text-ink font-hand text-xl leading-relaxed whitespace-pre-line">
                            ${this.escapeHtml(reportText)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderEnergyChart(data) {
        const chartBars = document.getElementById('energy-chart-bars');
        if (!chartBars) return;

        if (!data || data.length === 0) {
            chartBars.innerHTML = '<p class="text-ink/30 italic text-sm self-center">No hay suficientes datos de energía para mostrar tendencia.</p>';
            return;
        }

        chartBars.innerHTML = data.map(point => {
            const height = (point.value / 10) * 100;
            return `
                <div class="group relative flex-1 flex flex-col items-center">
                    <!-- Tooltip persistente al hover -->
                    <div class="absolute -top-10 left-1/2 -translate-x-1/2 bg-ink text-white text-[10px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-10 whitespace-nowrap shadow-float">
                        Energía: ${point.value}/10
                        <div class="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-ink"></div>
                    </div>
                    
                    <div class="bg-brand/20 w-full rounded-t-xl transition-all duration-1000 origin-bottom hover:bg-brand/40 shadow-sm relative overflow-hidden" 
                         style="height: ${height}%">
                        <!-- Brillo dinámico -->
                        <div class="absolute inset-0 bg-gradient-to-t from-white/0 to-white/20"></div>
                    </div>
                    <span class="text-[9px] text-ink/40 font-black mt-3 uppercase truncate w-full text-center tracking-tighter">${point.label}</span>
                </div>
            `;
        }).join('');
    },

    renderDashboardCard(item, customClasses) {
        const typeConfig = this.typeConfig[item.type] || this.typeConfig.nota;
        const fecha = new Date(item.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

        return `
            <div class="p-6 rounded-blob border-2 shadow-sm ${customClasses} transition-all hover:scale-[1.02] cursor-pointer action-edit group" data-id="${item.id}">
                <div class="flex items-start gap-4">
                    <span class="text-2xl group-hover:rotate-12 transition-transform">${typeConfig.icon}</span>
                    <div class="min-w-0 flex-1">
                        <div class="flex justify-between items-start gap-2">
                            <h4 class="font-bold text-ink truncate text-lg">${this.escapeHtml(item.content)}</h4>
                            <span class="text-[10px] font-bold text-ink/40 bg-white/50 px-2 py-0.5 rounded-full uppercase shrink-0">${fecha}</span>
                        </div>
                        <p class="text-sm text-ink/70 mt-1 line-clamp-2 italic">${this.escapeHtml(item.descripcion || '')}</p>
                        ${item.tareas && item.tareas.length > 0 ? `
                            <div class="mt-4 flex items-center gap-3">
                                <div class="flex-1 bg-white/60 h-2 rounded-full overflow-hidden shadow-inner">
                                    <div class="bg-brand h-full transition-all duration-700" style="width: ${Math.round((item.tareas.filter(t => t.completado).length / item.tareas.length) * 100)}%"></div>
                                </div>
                                <span class="text-[11px] font-black text-ink/60">${item.tareas.filter(t => t.completado).length}/${item.tareas.length}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    },

    renderLoading() {

        // Instant - no loading indicator needed
        if (this.elements.container()) {
            this.elements.container().innerHTML = '';
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
    },

    // =====================================
    // CHECK-IN UI
    // =====================================

    renderCheckinButton(momentos) {
        const container = document.getElementById('main-content');
        if (!container) return;

        let btnExistente = document.getElementById('checkin-float-btn');
        if (btnExistente) btnExistente.remove();

        const momentoActual = kai?.getCurrentMoment() || 'mañana';
        const momentoConfig = momentos.find(m => m.id === momentoActual);

        const btn = document.createElement('button');
        btn.id = 'checkin-float-btn';
        btn.className = 'fixed bottom-24 right-6 z-50 bg-brand text-white p-4 rounded-full shadow-float hover:scale-110 transition-all animate-pulse cursor-pointer';
        btn.innerHTML = `
            <div class="flex flex-col items-center gap-1">
                <span class="text-2xl">${momentoConfig?.icono || '💭'}</span>
                <span class="text-xs font-bold">Check-in</span>
            </div>
        `;
        btn.onclick = () => kai?.showCheckinModal();

        document.body.appendChild(btn);
    },

    toggleCheckinButton(mostrar, momento = 'mañana') {
        const btn = document.getElementById('checkin-float-btn');
        if (!btn) {
            if (mostrar && kai?.checkinConfig) {
                kai.renderCheckinButton(kai.checkinConfig.momentos);
            }
            return;
        }

        btn.style.display = mostrar ? 'flex' : 'none';
    },

    showCheckinModal(data) {
        const esManana = data.momento.id === 'mañana';
        const esNoche = data.momento.id === 'noche';
        const horaActual = new Date().toTimeString().slice(0, 5);

        const overlay = document.createElement('div');
        overlay.id = 'checkin-modal-overlay';
        overlay.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4';

        overlay.innerHTML = `
            <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
                <div class="text-center mb-6">
                    <span class="text-4xl">${data.momento.icono}</span>
                    <h2 class="text-xl font-bold text-ink mt-2">${data.momento.pregunta}</h2>
                    <p class="text-sm text-ink/50">${new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                </div>
                
                ${esManana || esNoche ? `
                <div class="mb-6 p-4 bg-purple-50 rounded-2xl">
                    <label class="block text-sm font-bold text-purple-700 mb-3">
                        ${esManana ? '⏰ ¿A qué hora despertaste?' : '🌙 ¿A qué hora te dormiste?'}
                    </label>
                    <input type="time" id="checkin-hora-sueno" 
                        class="w-full p-3 rounded-xl border-2 border-purple-200 focus:border-purple-500 focus:outline-none text-lg"
                        value="${horaActual}">
                </div>
                ` : ''}
                
                <div class="mb-6">
                    <label class="block text-sm font-bold text-ink/70 mb-3">ENERGÍA</label>
                    <div class="grid grid-cols-6 gap-2" id="checkin-energia-grid">
                        ${data.energia.map(e => `
                            <button class="checkin-energia-btn flex flex-col items-center p-2 rounded-xl border-2 border-gray-100 hover:border-brand hover:bg-brand/5 transition-all"
                                    data-valor="${e.valor}">
                                <span class="text-xl">${e.icono}</span>
                                <span class="text-[10px] mt-1 font-bold text-ink/60">${e.valor}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
                
                <div class="mb-6">
                    <label class="block text-sm font-bold text-ink/70 mb-3">EMOCIÓN</label>
                    <div class="grid grid-cols-5 gap-2" id="checkin-emocion-grid">
                        ${data.emocion.map(e => `
                            <button class="checkin-emocion-btn flex flex-col items-center p-2 rounded-xl border-2 border-gray-100 hover:border-purple-400 hover:bg-purple-50 transition-all"
                                    data-valor="${e.valor}">
                                <span class="text-xl">${e.icono}</span>
                                <span class="text-[9px] mt-1 font-bold text-ink/60 truncate w-full text-center">${e.label}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
                
                <button id="checkin-save-btn" class="w-full bg-brand text-white font-bold py-3 rounded-2xl shadow-sticker opacity-50 cursor-not-allowed" disabled>
                    Guardar Check-in
                </button>
                
                <button id="checkin-close-btn" class="w-full mt-2 text-ink/50 font-medium py-2">
                    Cancelar
                </button>
            </div>
        `;

        document.body.appendChild(overlay);

        let energiaSeleccionada = null;
        let emocionSeleccionada = null;

        overlay.querySelectorAll('.checkin-energia-btn').forEach(btn => {
            btn.onclick = () => {
                overlay.querySelectorAll('.checkin-energia-btn').forEach(b => {
                    b.classList.remove('border-brand', 'bg-brand/10');
                    b.classList.add('border-gray-100');
                });
                btn.classList.remove('border-gray-100');
                btn.classList.add('border-brand', 'bg-brand/10');
                energiaSeleccionada = btn.dataset.valor;
                checkBoton();
            };
        });

        overlay.querySelectorAll('.checkin-emocion-btn').forEach(btn => {
            btn.onclick = () => {
                overlay.querySelectorAll('.checkin-emocion-btn').forEach(b => {
                    b.classList.remove('border-purple-400', 'bg-purple-50');
                    b.classList.add('border-gray-100');
                });
                btn.classList.remove('border-gray-100');
                btn.classList.add('border-purple-400', 'bg-purple-50');
                emocionSeleccionada = btn.dataset.valor;
                checkBoton();
            };
        });

        function checkBoton() {
            const saveBtn = document.getElementById('checkin-save-btn');
            if (energiaSeleccionada && emocionSeleccionada) {
                saveBtn.disabled = false;
                saveBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }

        document.getElementById('checkin-save-btn').onclick = async () => {
            const momento = data.momento.id;
            const horaSueno = document.getElementById('checkin-hora-sueno')?.value || null;
            const success = await kai?.saveCheckin(momento, energiaSeleccionada, emocionSeleccionada, horaSueno);
            if (success) {
                overlay.remove();
            }
        };

        document.getElementById('checkin-close-btn').onclick = () => overlay.remove();
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    },

    // === PINNED SLIDER ===
    initPinnedSlider(totalCards) {
        const slider = document.getElementById('pinned-slider');
        const arrowLeft = document.getElementById('pinned-arrow-left');
        const arrowRight = document.getElementById('pinned-arrow-right');
        const dotsContainer = document.getElementById('pinned-dots');

        if (!slider) return;

        // Ocultar flechas si solo hay 1 card
        if (totalCards <= 1) {
            if (arrowLeft) arrowLeft.style.display = 'none';
            if (arrowRight) arrowRight.style.display = 'none';
        }

        // Crear dots si hay más de 1 card
        if (totalCards > 1 && dotsContainer) {
            dotsContainer.innerHTML = '';
            for (let i = 0; i < totalCards; i++) {
                const dot = document.createElement('span');
                dot.className = `dot${i === 0 ? ' active' : ''}`;
                dot.dataset.index = i;
                dotsContainer.appendChild(dot);
            }
        }

        // Event listeners para flechas
        if (arrowLeft) {
            arrowLeft.addEventListener('click', () => {
                slider.scrollBy({ left: -300, behavior: 'smooth' });
            });
        }

        if (arrowRight) {
            arrowRight.addEventListener('click', () => {
                slider.scrollBy({ left: 300, behavior: 'smooth' });
            });
        }

        // Actualizar dots al hacer scroll
        if (dotsContainer && totalCards > 1) {
            const updateDots = () => {
                const scrollLeft = slider.scrollLeft;
                const cardWidth = 300; // 280px + 16px gap approx
                const activeIndex = Math.round(scrollLeft / cardWidth);
                const dots = dotsContainer.querySelectorAll('.dot');
                dots.forEach((dot, idx) => {
                    dot.classList.toggle('active', idx === activeIndex);
                });
            };

            slider.addEventListener('scroll', updateDots, { passive: true });
        }
    }
};
