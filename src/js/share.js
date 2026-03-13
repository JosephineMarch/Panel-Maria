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
        const colors = this.getTypeColor(suggestedType);
        
        const hasTitle = title && title !== 'Enlace compartido' && title !== 'Nota compartida';

        // Obtener proyectos para el selector
        let proyectos = [];
        try {
            const { data } = await import('./data.js');
            proyectos = await data.getItems({ type: 'proyecto' });
        } catch (e) {
            console.error('Error loading projects for share modal:', e);
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
                    <div class="bg-gradient-to-r ${colors.bg} to-transparent rounded-2xl p-4 border-l-4 ${colors.text.replace('text-', 'border-')}">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-xs font-bold uppercase ${colors.text}">✨ ${this.getTypeLabel(suggestedType)} sugerido</span>
                        </div>
                        <input type="text" id="share-title-input" 
                            class="w-full bg-white/50 border-none rounded-xl px-3 py-2 text-sm font-bold text-ink placeholder-ink/40 focus:ring-2 focus:ring-brand outline-none"
                            placeholder="${hasTitle ? '' : 'Escribe un título...'}"
                            value="${hasTitle ? title : ''}"
                            autocomplete="off">
                        ${url ? `<p class="text-xs text-gray-500 truncate mt-1">${domain}</p>` : ''}
                    </div>

                    ${url ? `
                        <a href="${url}" target="_blank" rel="noopener noreferrer"
                           class="block bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold py-2 px-4 rounded-xl text-center truncate">
                            <i class="fa-solid fa-external-link-alt mr-1"></i> ${url}
                        </a>
                    ` : ''}

                    <div class="space-y-4 pt-2">
                        <!-- Selector de Proyecto -->
                        <div class="space-y-1">
                            <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">📍 Guardar en:</label>
                            <select id="share-parent-id" class="w-full bg-gray-50 border-none rounded-xl px-3 py-2 text-sm font-bold text-ink focus:ring-2 focus:ring-brand outline-none">
                                <option value="">📥 Bandeja de entrada</option>
                                ${proyectos.map(p => `<option value="${p.id}">📁 ${p.content}</option>`).join('')}
                            </select>
                        </div>

                        <div class="space-y-2">
                            <p class="text-xs font-bold text-gray-400 uppercase tracking-wide">O clasificar como:</p>
                            
                            <div class="grid grid-cols-2 gap-2">
                                <button class="share-option ${colors.bg} hover:brightness-95 ${colors.text} font-bold py-2 px-3 rounded-xl flex items-center gap-2 transition text-sm"
                                        data-type="${suggestedType}" data-url="${url || ''}">
                                    <i class="fa-solid ${this.getTypeIcon(suggestedType)}"></i>
                                    ${this.getTypeLabel(suggestedType)}
                                </button>
                                
                                ${['nota', 'tarea', 'proyecto', 'directorio'].filter(t => t !== suggestedType).map(type => `
                                    <button class="share-option bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-2 px-3 rounded-xl flex items-center gap-2 transition text-sm"
                                            data-type="${type}" data-url="${url || ''}">
                                        <i class="fa-solid ${this.getTypeIcon(type)}"></i>
                                        ${this.getTypeLabel(type)}
                                    </button>
                                `).join('')}
                            </div>
                            
                            <button id="kai-classify-btn" class="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition hover:brightness-110">
                                <span class="text-lg">🧠</span> Kai decide por mí
                            </button>
                            
                            <button id="dismiss-share" class="w-full bg-gray-100 text-gray-500 font-bold py-2 px-4 rounded-xl transition text-sm">
                                Descartar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        document.getElementById('close-share-modal').onclick = () => this.closeModal();
        document.getElementById('dismiss-share').onclick = () => this.closeModal();
        
        document.getElementById('kai-classify-btn').onclick = () => {
            const parentId = document.getElementById('share-parent-id').value;
            this.classifyWithKai(url, document.getElementById('share-title-input').value || fullText, parentId);
        };
        
        document.querySelectorAll('.share-option').forEach(btn => {
            btn.onclick = () => {
                const type = btn.dataset.type;
                const itemUrl = btn.dataset.url;
                const itemTitle = document.getElementById('share-title-input').value || 'Contenido compartido';
                const parentId = document.getElementById('share-parent-id').value;
                this.saveSharedItem(type, itemTitle, itemUrl, parentId);
            };
        });

        modal.onclick = (e) => {
            if (e.target === modal) this.closeModal();
        };
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
