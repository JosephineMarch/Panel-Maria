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
    }
};
