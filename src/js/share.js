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

        if (sharedUrl || sharedText || sharedTitle) {
            this.handleSharedData({
                title: sharedTitle || '',
                text: sharedText || '',
                url: sharedUrl || ''
            });
        }

        if (window.location.search.includes('shared=')) {
            this.handleFormData();
        }
    },

    async handleFormData() {
        try {
            const formData = new FormData();
            const urlParams = new URLSearchParams(window.location.search);
            
            const title = urlParams.get('title') || '';
            const text = urlParams.get('text') || '';
            const url = urlParams.get('url') || '';
            
            if (title || text || url) {
                this.handleSharedData({ title, text, url });
            }
        } catch (e) {
            // console.log('No form data:', e);
        }
    },

    async handleSharedData(data) {
        this.currentData = data;
        
        const url = data.url || this.extractUrl(data.text) || '';
        let textOnly = data.text || '';
        if (url && textOnly.includes(url)) {
            textOnly = textOnly.replace(url, '').trim();
        }
        const fullText = `${data.title} ${textOnly}`.trim();
        
        const suggested = this.suggestType(fullText, url);
        this.suggestedType = suggested;
        
        const content = data.title || textOnly || 'Enlace compartido';
        
        await this.showShareModal(url, content, fullText, suggested);
    },

    extractUrl(text) {
        const icons = {
            task: 'fa-check',
            proyecto: 'fa-folder',
            nota: 'fa-sticky-note',
            directorio: 'fa-link',
            logro: 'fa-trophy',
            reminder: 'fa-bell'
        };
        return icons[type] || 'fa-sticky-note';
    },

    getTypeColor(type) {
        const colors = {
            task: { bg: 'bg-lemon', text: 'text-yellow-600', icon: 'text-yellow-600' },
            proyecto: { bg: 'bg-action/20', text: 'text-action', icon: 'text-action' },
            nota: { bg: 'bg-mint/20', text: 'text-green-600', icon: 'text-green-600' },
            directorio: { bg: 'bg-brand/10', text: 'text-brand', icon: 'text-brand' },
            logro: { bg: 'bg-purple-100', text: 'text-purple-600', icon: 'text-purple-600' },
            reminder: { bg: 'bg-peach/20', text: 'text-orange-600', icon: 'text-orange-600' }
        };
        return colors[type] || colors.nota;
    },

    getTypeLabel(type) {
        const labels = {
            task: 'Tarea',
            proyecto: 'Proyecto',
            nota: 'Nota',
            directorio: 'Enlace',
            logro: 'Logro',
            reminder: 'Recordatorio'
        };
        return labels[type] || 'Nota';
    },

    async showShareModal(url, title, fullText, suggestedType) {
        const existingModal = document.getElementById('share-modal');
        if (existingModal) existingModal.remove();

        const domain = url ? (() => { try { return new URL(url).hostname; } catch { return ''; } })() : '';
        const colors = this.getTypeColor(suggestedType);
        
        const hasTitle = title && title !== 'Enlace compartido';
        
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
                            class="w-full bg-white/50 border-none rounded-xl px-3 py-2 text-sm font-bold text-ink placeholder-ink/40 focus:ring-2 focus:ring-white/50 outline-none"
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

                    <div class="space-y-2 pt-2">
                        <p class="text-xs font-bold text-gray-400 uppercase tracking-wide">O clasificar como:</p>
                        
                        <div class="grid grid-cols-2 gap-2">
                            <button class="share-option ${colors.bg} hover:brightness-95 ${colors.text} font-bold py-2 px-3 rounded-xl flex items-center gap-2 transition text-sm"
                                    data-type="${suggestedType}" data-url="${url || ''}">
                                <i class="fa-solid ${this.getTypeIcon(suggestedType)}"></i>
                                ${this.getTypeLabel(suggestedType)}
                            </button>
                            
                            ${['nota', 'tarea', 'proyecto', 'directorio'].filter(t => t !== suggestedType).slice(0, 3).map(type => `
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
        `;

        document.body.appendChild(modal);
        
        document.getElementById('close-share-modal').onclick = () => this.closeModal();
        document.getElementById('dismiss-share').onclick = () => this.closeModal();
        
        document.getElementById('kai-classify-btn').onclick = () => this.classifyWithKai(url, document.getElementById('share-title-input').value || fullText);
        
        document.querySelectorAll('.share-option').forEach(btn => {
            btn.onclick = () => {
                const type = btn.dataset.type;
                const itemUrl = btn.dataset.url;
                const itemTitle = document.getElementById('share-title-input').value || 'Enlace compartido';
                this.saveSharedItem(type, itemTitle, itemUrl);
            };
        });

        modal.onclick = (e) => {
            if (e.target === modal) this.closeModal();
        };
    },

    async classifyWithKai(url, text) {
        const btn = document.getElementById('kai-classify-btn');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Kai está pensando...';
        btn.disabled = true;

        try {
            const { cerebras } = await import('./cerebras.js');
            
            const prompt = `Analiza este contenido y clasifica qué tipo de elemento es en KAI (nota, tarea, proyecto, enlace, logro o recordatorio). 
            
Contenido: "${text}"
${url ? `URL: ${url}` : ''}

Responde SOLO con una palabra: nota, tarea, proyecto, directorio, logro o reminder`;

            const response = await cerebras.ask(prompt);
            const type = response.toLowerCase().trim().replace(/[.\s]/g, '');
            
            const validTypes = ['nota', 'tarea', 'proyecto', 'directorio', 'logro', 'reminder'];
            const matchedType = validTypes.find(t => type.includes(t)) || 'nota';
            
            const title = document.getElementById('share-title-input').value || text;
            this.saveSharedItem(matchedType, title, url);
            
        } catch (error) {
            console.error('Kai classification error:', error);
            btn.innerHTML = '❌ Error, usando sugerencia anterior';
            setTimeout(() => {
                const title = document.getElementById('share-title-input').value || 'Enlace compartido';
                this.saveSharedItem(this.suggestedType, title, url);
            }, 1500);
        }
    },

    closeModal() {
        const modal = document.getElementById('share-modal');
        if (modal) {
            modal.remove();
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    },

    saveSharedItem(type, title, url) {
        window.dispatchEvent(new CustomEvent('kai:add-item', {
            detail: {
                type: type,
                content: title,
                url: url
            }
        }));
        
        this.closeModal();
        
        setTimeout(() => {
            const input = document.getElementById('item-input');
            const typeSelect = document.getElementById('item-type');
            if (input && typeSelect) {
                typeSelect.value = type;
                input.value = title;
                if (url) {
                    input.dataset.url = url;
                }
                input.focus();
                
                const event = new Event('input', { bubbles: true });
                input.dispatchEvent(event);
            }
        }, 300);
    }
};

window.addEventListener('DOMContentLoaded', () => {
    ShareUtils.init();
});

window.ShareUtils = ShareUtils;
