/**
 * KAI - Módulo de Share Target y Clasificación Inteligente
 * Recibe cualquier tipo de contenido y clasifica automáticamente
 */

const ShareUtils = {
    currentData: null,
    suggestedType: null,

    init() {
        this.checkSharedData();
        this.setupPostMessageHandler();
    },

    setupPostMessageHandler() {
        if ('launchQueue' in window && 'LaunchParams' in window) {
            window.launchQueue.setConsumer(async (launchParams) => {
                if (launchParams.targetUrl) {
                    const url = new URL(launchParams.targetUrl);
                    const params = url.searchParams;
                    this.handleSharedData({
                        title: params.get('title') || '',
                        text: params.get('text') || '',
                        url: params.get('url') || ''
                    });
                }
            });
        }
    },

    checkSharedData() {
        const urlParams = new URLSearchParams(window.location.search);
        
        const sharedTitle = urlParams.get('title');
        const sharedText = urlParams.get('text');
        const sharedUrl = urlParams.get('url');

        // Si viene de un POST (Share Target API)
        if (window.location.search.includes('share=true')) {
            this.handleFormData();
        } else if (sharedUrl || sharedText || sharedTitle) {
            this.handleSharedData({
                title: sharedTitle || '',
                text: sharedText || '',
                url: sharedUrl || ''
            });
        }
    },

    async handleFormData() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const title = urlParams.get('title') || '';
            const text = urlParams.get('text') || '';
            const url = urlParams.get('url') || '';
            
            if (title || text || url) {
                this.handleSharedData({ title, text, url });
            }
        } catch (e) {
            console.error('Error handling shared form data:', e);
        }
    },

    async handleSharedData(data) {
        this.currentData = data;
        
        let textOnly = (data.text || '').trim();
        let titleOnly = (data.title || '').trim();

        // Extraer URL si viene en el texto o en el título
        let url = data.url || this.extractUrl(textOnly) || this.extractUrl(titleOnly) || '';
        
        // Si el texto es solo una URL, tratarlo como tal
        if (!url && textOnly.match(/^https?:\/\/[^\s]+$/i)) {
            url = textOnly;
            textOnly = '';
        }

        // Si la URL está en el texto o título, limpiarlos para que no se repitan
        if (url) {
            if (textOnly.includes(url)) textOnly = textOnly.replace(url, '').trim();
            if (titleOnly.includes(url)) titleOnly = titleOnly.replace(url, '').trim();
        }
        
        const fullText = `${titleOnly} ${textOnly}`.trim();
        const suggested = this.suggestType(fullText, url);
        this.suggestedType = suggested;
        
        const content = titleOnly || textOnly || (url ? 'Enlace compartido' : 'Nota compartida');
        
        await this.showShareModal(url, content, fullText, suggested);
    },

    extractUrl(text) {
        if (!text) return null;
        const match = text.match(/https?:\/\/[^\s]+/i);
        return match ? match[0] : null;
    },

    suggestType(text, url) {
        if (url) return 'directorio';
        const lower = text.toLowerCase();
        if (lower.includes('?') || lower.includes('pasos') || lower.includes('hacer')) return 'tarea';
        return 'nota';
    },

    getTypeIcon(type) {
        const icons = {
            tarea: 'fa-check',
            proyecto: 'fa-folder',
            nota: 'fa-sticky-note',
            directorio: 'fa-link'
        };
        return icons[type] || 'fa-sticky-note';
    },

    getTypeColor(type) {
        const colors = {
            tarea: { bg: 'bg-blue-50', text: 'text-blue-600', icon: 'text-blue-600' },
            proyecto: { bg: 'bg-pink-50', text: 'text-pink-600', icon: 'text-pink-600' },
            nota: { bg: 'bg-yellow-50', text: 'text-yellow-600', icon: 'text-yellow-600' },
            directorio: { bg: 'bg-purple-50', text: 'text-purple-600', icon: 'text-purple-600' }
        };
        return colors[type] || colors.nota;
    },

    getTypeLabel(type) {
        const labels = {
            tarea: 'Tarea',
            proyecto: 'Proyecto',
            nota: 'Nota',
            directorio: 'Enlace'
        };
        return labels[type] || 'Nota';
    },

    async showShareModal(url, title, fullText, suggestedType) {
        const existingModal = document.getElementById('share-modal');
        if (existingModal) existingModal.remove();

        const domain = url ? (() => { try { return new URL(url).hostname; } catch { return ''; } })() : '';
        
        const hasTitle = title && title !== 'Enlace compartido' && title !== 'Nota compartida';

        // Obtener TODOS los items para el selector (para agregar a uno existente)
        let allItems = [];
        try {
            const { data } = await import('./data.js');
            allItems = await data.getItems({});
        } catch (e) {
            console.error('Error loading items for share modal:', e);
        }
        
        const modal = document.createElement('div');
        modal.id = 'share-modal';
        modal.className = 'fixed inset-0 bg-ink/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white w-full max-w-md rounded-blob shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                <div class="bg-brand p-4 text-white flex justify-between items-center">
                    <span class="font-bold flex items-center gap-2">📤 Compartido a KAI</span>
                    <button id="close-share-modal" class="hover:rotate-90 transition-transform">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                
                <div class="p-6 space-y-4">
                    <!-- Preview del contenido -->
                    <div class="bg-gradient-to-r from-purple-50 to-transparent rounded-2xl p-4 border-l-4 border-purple-500">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-xs font-bold uppercase text-purple-600">🔗 Enlace</span>
                        </div>
                        <input type="text" id="share-title-input" 
                            class="w-full bg-white/50 border-none rounded-xl px-3 py-2 text-sm font-bold text-ink placeholder-ink/40 focus:ring-2 focus:ring-brand outline-none"
                            placeholder="${hasTitle ? '' : 'Escribe un título...'}"
                            value="${hasTitle ? this.escapeHtml(title) : ''}"
                            autocomplete="off">
                        ${url ? `<p class="text-xs text-gray-500 truncate mt-1">${this.escapeHtml(domain)}</p>` : ''}
                    </div>

                    ${url ? `
                        <a href="${url}" target="_blank" rel="noopener noreferrer"
                           class="block bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold py-2 px-4 rounded-xl text-center truncate">
                            <i class="fa-solid fa-external-link-alt mr-1"></i> ${url}
                        </a>
                    ` : ''}

                    <!-- Selector de card existente -->
                    <div class="space-y-2">
                        <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                            🔗 Agregar a una card existente:
                        </label>
                        <select id="share-existing-card" class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-3 py-2.5 text-sm font-medium text-ink focus:ring-2 focus:ring-brand outline-none">
                            <option value="">-- Seleccionar card --</option>
                            ${allItems.filter(item => item.id && !item.completado).map(item => {
                                const typeIcon = this.getTypeIcon(item.type);
                                const truncated = item.content?.length > 40 ? item.content.substring(0, 40) + '...' : item.content;
                                return `<option value="${item.id}" data-type="${item.type || 'nota'}">${typeIcon} ${truncated || 'Sin título'}</option>`;
                            }).join('')}
                        </select>
                        <p class="text-[10px] text-gray-400 text-center">O dejá vacío para crear una nueva card</p>
                    </div>

                    <!-- Botones de acción -->
                    <div class="space-y-2 pt-4 border-t border-gray-100">
                        <button id="share-save-new" 
                                class="w-full bg-brand text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition hover:bg-brand-dark active:scale-[0.98]">
                            <i class="fa-solid fa-plus"></i> Guardar como nueva card
                        </button>
                        
                        <button id="share-add-to-existing" 
                                class="w-full bg-gray-100 text-ink font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition hover:bg-gray-200 active:scale-[0.98]">
                            <i class="fa-solid fa-link"></i> Agregar a la card seleccionada
                        </button>
                        
                        <button id="dismiss-share" 
                                class="w-full text-gray-400 font-bold py-2 px-4 rounded-xl transition text-sm hover:text-gray-600">
                            Descartar
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        document.getElementById('close-share-modal').onclick = () => this.closeModal();
        document.getElementById('dismiss-share').onclick = () => this.closeModal();
        
        // Guardar como nueva card
        document.getElementById('share-save-new').onclick = () => {
            const itemTitle = document.getElementById('share-title-input').value || 'Enlace compartido';
            this.saveSharedItem('directorio', itemTitle, url, null);
        };
        
        // Agregar a card existente
        document.getElementById('share-add-to-existing').onclick = () => {
            const selectedId = document.getElementById('share-existing-card').value;
            const itemTitle = document.getElementById('share-title-input').value || 'Enlace compartido';
            
            if (!selectedId) {
                ui.showNotification('Seleccioná una card primero', 'warning');
                return;
            }
            
            this.addUrlToExistingItem(selectedId, url, itemTitle);
        };
        
        // Deshabilitar botón "Agregar" si no hay selección
        const existingSelect = document.getElementById('share-existing-card');
        const addBtn = document.getElementById('share-add-to-existing');
        existingSelect?.addEventListener('change', () => {
            if (addBtn) {
                addBtn.disabled = !existingSelect.value;
                addBtn.classList.toggle('opacity-50', !existingSelect.value);
                addBtn.classList.toggle('cursor-not-allowed', !existingSelect.value);
            }
        });
        if (addBtn) {
            addBtn.disabled = true;
            addBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }

        modal.onclick = (e) => {
            if (e.target === modal) this.closeModal();
        };
    },

    async addUrlToExistingItem(itemId, url, title) {
        try {
            const { data } = await import('./data.js');
            const items = await data.getItems({ id: itemId });
            const item = Array.isArray(items) ? items[0] : items;
            
            if (!item) {
                ui.showNotification('No encontré la card', 'error');
                return;
            }
            
            // Agregar URL a la lista existente
            const urls = item.urls || [];
            if (!urls.includes(url)) {
                urls.push(url);
            }
            
            await data.updateItem(itemId, { urls: urls });
            
            window.dispatchEvent(new CustomEvent('kai:add-item-to-existing', {
                detail: { id: itemId, url, title }
            }));
            
            ui.showNotification(`Enlace agregado a "${item.content?.substring(0, 30) || 'la card'}" ✅`, 'success');
            this.closeModal();
        } catch (error) {
            console.error('Error adding URL to existing item:', error);
            ui.showNotification('Error al agregar el enlace', 'error');
        }
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    async classifyWithKai(url, text, parentId) {
        const btn = document.getElementById('kai-classify-btn');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Kai está pensando...';
        btn.disabled = true;

        try {
            const { cerebras } = await import('./cerebras.js');
            
            const prompt = `Analiza este contenido y clasifica qué tipo de elemento es en KAI (nota, tarea, proyecto, directorio). 
            
Contenido: "${text}"
${url ? `URL: ${url}` : ''}

Responde SOLO con una palabra de las opciones anteriores.`;

            const response = await cerebras.ask(prompt);
            const type = response.toLowerCase().trim().replace(/[.\s]/g, '');
            
            const validTypes = ['nota', 'tarea', 'proyecto', 'directorio'];
            const matchedType = validTypes.find(t => type.includes(t)) || 'nota';
            
            const title = document.getElementById('share-title-input').value || text;
            this.saveSharedItem(matchedType, title, url, parentId);
            
        } catch (error) {
            console.error('Kai classification error:', error);
            btn.innerHTML = '❌ Error, usando sugerencia';
            setTimeout(() => {
                const title = document.getElementById('share-title-input').value || 'Contenido compartido';
                this.saveSharedItem(this.suggestedType, title, url, parentId);
            }, 1000);
        }
    },

    closeModal() {
        const modal = document.getElementById('share-modal');
        if (modal) {
            modal.remove();
            // Limpiar URL
            const url = new URL(window.location);
            url.searchParams.delete('title');
            url.searchParams.delete('text');
            url.searchParams.delete('url');
            url.searchParams.delete('share');
            window.history.replaceState({}, document.title, url.pathname);
        }
    },

    saveSharedItem(type, title, url, parentId) {
        window.dispatchEvent(new CustomEvent('kai:add-item', {
            detail: {
                type: type,
                content: title,
                url: url,
                parent_id: parentId || null
            }
        }));
        
        this.closeModal();
    }
};

window.addEventListener('DOMContentLoaded', () => {
    ShareUtils.init();
});

window.ShareUtils = ShareUtils;
