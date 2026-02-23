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
        
        // Patrones para detectar acciones personales
        const patrones = [
            { regex: /^hoy\s+(hice|terminé|empecé|comí|estudié|trabajé|bañé|acabé|levanté|cené)\s+(.+)/i, momento: 'hoy' },
            { regex: /^ayer\s+(hice|terminé|empecé|comí|estudié|trabajé|bañé|acabé|levanté|cené)\s+(.+)/i, momento: 'ayer' },
            { regex: /^esta\s+(mañana|tarde|noche)\s+(hice|terminé|empecé|comí|estudié|trabajé|bañé|acabé)\s+(.+)/i, momento: 'esta mañana' },
            { regex: /^acabo\s+de\s+(.+)/i, momento: 'ahora' },
            { regex: /^me\s+(bañé|levanté|desperté|acosté|cambié)\s*/i, momento: 'ahora' },
            { regex: /^(hice|terminé|empecé|comí|estudié|trabajé|bañé|acabé|levanté|cené)\s+(.+)/i, momento: 'hoy' },
            { regex: /^ya\s+(hice|terminé|acabé)\s+(.+)/i, momento: 'hoy' },
            { regex: /^terminé\s+de\s+(.+)/i, momento: 'hoy' },
            { regex: /^empecé\s+a\s+(.+)/i, momento: 'hoy' }
        ];

        for (const patron of patrones) {
            const match = textoLower.match(patron.regex);
            if (match) {
                let contenido = '';
                
                // Extraer el contenido según el patrón
                if (match.length === 3) {
                    contenido = match[2].trim();
                } else if (match.length === 4) {
                    contenido = match[3].trim();
                }
                
                // Limpiar contenido
                contenido = contenido.replace(/,$/, '').trim();
                
                // Si el contenido está vacío, usar la palabra clave + lo que sigue
                if (!contenido && match[1]) {
                    contenido = match[1];
                }

                return {
                    esBitacora: true,
                    contenido: this.capitalizar(contenido),
                    momento: patron.momento,
                    textoOriginal: texto
                };
            }
        }

        return { esBitacora: false, contenido: '', momento: '', textoOriginal: texto };
    },

    capitalizar(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
};
