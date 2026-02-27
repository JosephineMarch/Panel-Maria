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
        const fullText = `${data.title} ${data.text}`.trim();
        
        const suggested = this.suggestType(fullText, url);
        this.suggestedType = suggested;
        
        await this.showShareModal(url, data.title || data.text, fullText, suggested);
    },

    extractUrl(text) {
        if (!text) return null;
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const match = text.match(urlRegex);
        return match ? match[0] : null;
    },

    suggestType(text, url) {
        const lower = text.toLowerCase();
        
        const patterns = {
            task: [
                /tarea|task|to.do|checklist|hacer|comprar|pagar|llamar|enviar|recordar|no olvidar|pendiente|reunion| cita|entregar|terminar|completar|acabar|revisar|actualizar|renovar|subscribe|unsubscribe|follow|unfollow|buy|pay|call|send|remember|don't forget|todo|meeting|appointment|deadline|due|complete|finish|end/
            ],
            proyecto: [
                /proyecto|project|iniciar|empezar|crear|desarrollar|lanzar|build|start|begin|create|develop|launch|initiative|campaign|plan|strategy/
            ],
            idea: [
                /idea|inspiración|inspirar|curiosidad|interesante|cool|genial|awesome|interesting|note|nota|guardar|save|remember|think|thought|maybe|posible|perhaps|possible/
            ],
            directorio: [
                /enlace|link|url|web|sitio|page|website|blog|video|youtube|netflix|article|read|leer|doc|pdf|resource|reference/
            ],
            logro: [
                /logro|completado|finished|done|éxito|success|won|achieved|accomplished|victory|celebrate|celebration|milestone|badge|award|premio|ganado/
            ],
            reminder: [
                /recordatorio|reminder|alarma|alarm|avisar|notify|when|cuando|at|después|after|before|antes|mañana|hoy|next week/
            ]
        };
        
        for (const [type, regexList] of Object.entries(patterns)) {
            for (const regex of regexList) {
                if (regex.test(lower)) {
                    return type;
                }
            }
        }
        
        if (url && !text) return 'directorio';
        if (text.length > 100) return 'nota';
        
        return 'nota';
    },

    getTypeIcon(type) {
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
                        <p class="font-bold text-ink text-sm">${title || 'Sin título'}</p>
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
                                    data-type="${suggestedType}" data-url="${url || ''}" data-title="${title || url}">
                                <i class="fa-solid ${this.getTypeIcon(suggestedType)}"></i>
                                ${this.getTypeLabel(suggestedType)}
                            </button>
                            
                            ${['nota', 'tarea', 'proyecto', 'directorio'].filter(t => t !== suggestedType).slice(0, 3).map(type => `
                                <button class="share-option bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-2 px-3 rounded-xl flex items-center gap-2 transition text-sm"
                                        data-type="${type}" data-url="${url || ''}" data-title="${title || url}">
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
        
        document.getElementById('kai-classify-btn').onclick = () => this.classifyWithKai(url, title || fullText);
        
        document.querySelectorAll('.share-option').forEach(btn => {
            btn.onclick = () => {
                const type = btn.dataset.type;
                const itemTitle = btn.dataset.title;
                const itemUrl = btn.dataset.url;
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
            
            this.saveSharedItem(matchedType, text, url);
            
        } catch (error) {
            console.error('Kai classification error:', error);
            btn.innerHTML = '❌ Error, usando sugerencia anterior';
            setTimeout(() => {
                this.saveSharedItem(this.suggestedType, text, url);
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
