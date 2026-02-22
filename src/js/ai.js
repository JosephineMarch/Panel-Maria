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
        const { data, error } = await supabase.functions.invoke('kai-process', {
            body: { text }
        });

        if (error) throw error;
        return data;
    },

    parseIntent(text) {
        const lowerText = text.toLowerCase();
        
        let type = 'note';
        let tags = [];
        let deadline = null;

        if (lowerText.includes('tarea') || lowerText.includes('hacer') || lowerText.includes('to-do')) {
            type = 'task';
        } else if (lowerText.includes('proyecto') || lowerText.includes('project')) {
            type = 'project';
        } else if (lowerText.includes('recordatorio') || lowerText.includes('recordar')) {
            type = 'reminder';
        } else if (lowerText.includes('enlace') || lowerText.includes('link') || lowerText.includes('http')) {
            type = 'link';
        } else if (lowerText.includes('humor') || lowerText.includes('me siento') || lowerText.includes('estado')) {
            type = 'mood';
        }

        const tagMatch = text.match(/#(\w+)/g);
        if (tagMatch) {
            tags = tagMatch.map(t => t.replace('#', ''));
        }

        const dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})(?:\/(\d{2,4}))?/);
        if (dateMatch) {
            const year = dateMatch[3] ? parseInt(dateMatch[3]) : new Date().getFullYear();
            deadline = new Date(year, parseInt(dateMatch[2]) - 1, parseInt(dateMatch[1])).toISOString();
        }

        return { type, tags, deadline };
    }
};
