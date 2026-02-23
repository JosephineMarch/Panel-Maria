import { supabase } from './supabase.js';

export const ai = {
    isRecording: false,
    recognition: null,

    async init() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.lang = 'es-ES';
            this.recognition.continuous = false;
            this.recognition.interimResults = true;

            this.recognition.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0])
                    .map(result => result.transcript)
                    .join('');

                window.dispatchEvent(new CustomEvent('voice-result', {
                    detail: { transcript }
                }));
            };

            this.recognition.onerror = (event) => {
                console.error('Voice recognition error:', event.error);
                this.isRecording = false;
                window.dispatchEvent(new CustomEvent('voice-error', {
                    detail: { error: event.error }
                }));
            };

            this.recognition.onend = () => {
                this.isRecording = false;
            };
        }
    },

    startVoice() {
        if (!this.recognition) {
            console.warn('Speech recognition not supported');
            return false;
        }
        this.isRecording = true;
        this.recognition.start();
        return true;
    },

    stopVoice() {
        if (this.recognition) {
            this.recognition.stop();
            this.isRecording = false;
        }
    },

    async processWithKai(text) {
        // Ahora usamos el motor de Cerebras
        const { cerebras } = await import('./cerebras.js');
        return await cerebras.ask(text);
    },

    // El parseIntent manual queda obsoleto por la IA, 
    // pero lo mantenemos como fallback básico si fuera necesario
    parseIntent(text) {
        // Podríamos redirigir esto a la IA también o dejarlo para procesado offline rápido
        return { type: 'note', tags: [], deadline: null };
    },

    detectarBitacora(texto) {
        const textoLower = texto.toLowerCase().trim();
        
        // Patrones para comandos explícitos de bitácora (prioridad alta)
        const patronesExplicit = [
            { regex: /^bitácora:\s*(.+)/i, momento: 'ahora' },
            { regex: /^bitacora:\s*(.+)/i, momento: 'ahora' },
            { regex: /^(?:anota|guarda|registra|pon|escribe)\s+(?:en\s+)?bitácora[:\s]*(.+)/i, momento: 'ahora' },
            { regex: /^(?:para|voy a|quiero)\s+bitácora[:\s]*(.+)/i, momento: 'ahora' }
        ];

        for (const patron of patronesExplicit) {
            const match = textoLower.match(patron.regex);
            if (match && match[1]) {
                const contenido = match[1].trim().replace(/,$/, '');
                return {
                    esBitacora: true,
                    contenido: this.capitalizar(contenido),
                    momento: patron.momento,
                    textoOriginal: texto,
                    explicito: true
                };
            }
        }
        
        // Patrones para detectar acciones personales (prioridad normal)
        const patrones = [
            { regex: /^hoy\s+(hice|terminé|empecé|comí|estudié|trabajé|bañé|acabé|levanté|cené)\s+(.+)/i, momento: 'hoy', conContenido: true },
            { regex: /^ayer\s+(hice|terminé|empecé|comí|estudié|trabajé|bañé|acabé|levanté|cené)\s+(.+)/i, momento: 'ayer', conContenido: true },
            { regex: /^esta\s+(mañana|tarde|noche)\s+(hice|terminé|empecé|comí|estudié|trabajé|bañé|acabé)\s+(.+)/i, momento: 'esta mañana', conContenido: true },
            { regex: /^acabo\s+de\s+(.+)/i, momento: 'ahora', conContenido: true },
            { regex: /^me\s+(bañé|levanté|desperté|acosté|cambié)\s*$/i, momento: 'ahora', conContenido: false },
            { regex: /^(hice|terminé|empecé|comí|estudié|trabajé|bañé|acabé|levanté|cené)\s+(.+)/i, momento: 'hoy', conContenido: true },
            { regex: /^ya\s+(hice|terminé|acabé)\s+(.+)/i, momento: 'hoy', conContenido: true },
            { regex: /^terminé\s+de\s+(.+)/i, momento: 'hoy', conContenido: true },
            { regex: /^empecé\s+a\s+(.+)/i, momento: 'hoy', conContenido: true }
        ];

        for (const patron of patrones) {
            const match = textoLower.match(patron.regex);
            if (match) {
                let contenido = '';
                
                // Extraer el contenido según el patrón
                if (patron.conContenido) {
                    if (match.length === 3) {
                        contenido = match[2].trim();
                    } else if (match.length === 4) {
                        contenido = match[3].trim();
                    }
                } else {
                    // Para patrones sin contenido adicional (como "me bañé")
                    contenido = match[1] ? match[1] : match[0];
                }
                
                // Limpiar contenido
                contenido = contenido.replace(/,$/, '').trim();
                
                // Si el contenido está vacío, usar la palabra clave
                if (!contenido && match[1]) {
                    contenido = match[1];
                }

                return {
                    esBitacora: true,
                    contenido: this.capitalizar(contenido),
                    momento: patron.momento,
                    textoOriginal: texto,
                    explicito: false
                };
            }
        }

        return { esBitacora: false, contenido: '', momento: '', textoOriginal: texto, explicito: false };
    },

    capitalizar(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
};
