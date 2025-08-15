/*
================================================================================
|       PANEL MARÍA - SISTEMA DE ENTRADA POR VOZ (CON IA)                      |
================================================================================
*/

// Importa la clave de API desde el archivo de configuración. 
// Este archivo no se sube a GitHub gracias a .gitignore.
import { CEREBRAS_API_KEY } from './config.js';

class VoiceManager {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.currentTranscription = '';
        this.autoSave = false; // Temporarily force to false for debugging
        this.promptTemplate = '';

        this.initSpeechRecognition();
        this.loadPromptTemplate();
    }

    async loadPromptTemplate() {
        try {
            const response = await fetch('interpretation-prompt.txt');
            if (!response.ok) throw new Error('Network response was not ok');
            this.promptTemplate = await response.text();
        } catch (error) {
            console.error('Error loading interpretation prompt:', error);
            this.showToast('Error al cargar la plantilla de IA.', 'error');
        }
    }

    initSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('El reconocimiento de voz no es compatible en este navegador.');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'es-ES';

        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateUIForListening(true);
            this.updateVoiceModal('Escuchando...', 'Habla ahora... (haz clic en el botón para detener)');
        };

        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                finalTranscript += event.results[i][0].transcript;
            }
            this.currentTranscription = finalTranscript;
            this.updateTranscriptionDisplay(this.currentTranscription);
        };

        this.recognition.onerror = (event) => {
            console.error('Error de reconocimiento de voz:', event.error);
            this.showToast(`Error de voz: ${event.error}`, 'error');
            this.isListening = false;
            this.updateUIForListening(false);
            this.closeVoiceModal();
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.updateUIForListening(false);
            if (this.currentTranscription.trim()) {
                this.processTranscription();
            } else {
                this.closeVoiceModal();
            }
        };
    }

    startListening() {
        if (!this.recognition) {
            this.showToast('Reconocimiento de voz no disponible.', 'error');
            return;
        }
        if (this.isListening) {
            this.stopListening();
            return;
        }
        try {
            this.currentTranscription = '';
            this.updateTranscriptionDisplay('');
            this.recognition.start();
            this.openVoiceModal();
        } catch (e) {
            this.showToast('No se pudo iniciar el reconocimiento.', 'error');
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }
    
    async processTranscription() {
        this.updateVoiceModal('Procesando con IA...', 'Analizando el texto para estructurar los datos.');
        try {
            const structuredData = await this.getAIInterpretation(this.currentTranscription);
            const item = this.mapAIDataToItem(structuredData);

            if (this.autoSave) {
                this.saveInterpretedItem(item);
            } else {
                this.showForReview(item);
            }
        } catch (error) {
            console.error('AI interpretation failed:', error);
            this.showToast(error.message, 'error');
            this.closeVoiceModal();
        }
    }

    async getAIInterpretation(text) {
        if (!this.promptTemplate) {
            throw new Error('La plantilla de IA no se ha cargado.');
        }

        const fullPrompt = this.promptTemplate.replace('{TEXTO_TRANSCRITO}', text);

        // ======================================================================
        // CONFIGURACIÓN DE LA API DE CEREBRAS
        // ======================================================================
        const apiEndpoint = 'https://api.cerebras.ai/v1/chat/completions';
        const apiKey = CEREBRAS_API_KEY;

        const body = {
            model: "llama-4-scout-17b-16e-instruct",
            messages: [{ role: "user", content: fullPrompt }],
            temperature: 0.5
        };
        // ======================================================================

        if (!apiKey || apiKey === 'YOUR_CEREBRAS_API_KEY_HERE') {
            throw new Error('La clave de API de Cerebras no está configurada. Revisa tu archivo config.js');
        }

        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Error de la API de Cerebras: ${response.status} ${errorBody}`);
        }

        const data = await response.json();
        
        const jsonString = data.choices[0].message.content;

        try {
            return JSON.parse(jsonString);
        } catch (e) {
            console.error("La IA no devolvió un JSON válido:", jsonString);
            throw new Error("La respuesta de la IA no tuvo el formato JSON esperado.");
        }
    }

    mapAIDataToItem(aiData) {
        return {
            titulo: aiData.titulo || 'Elemento de voz',
            descripcion: aiData.descripcion || '',
            categoria: aiData.modulo || 'ideas',
            url: (aiData.urls && aiData.urls.length > 0) ? aiData.urls[0] : '',
            tareas: (aiData.tareas || []).map(t => ({
                id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                titulo: t,
                completado: false
            })),
            etiquetas: aiData.categorias || [],
            anclado: false,
            fecha_creacion: new Date().toISOString(),
            fecha_finalizacion: (aiData.modulo === 'logros') ? new Date().toISOString() : null,
            meta: { source: 'voice-ai', raw: aiData }
        };
    }

    async saveInterpretedItem(itemData) {
        try {
            await window.storage.performBatchUpdate([{ type: 'add', data: itemData }]);
            this.showToast(`Elemento "${itemData.titulo}" guardado.`, 'success');
            // this.closeVoiceModal(); // Removed for debugging
            if (window.appController) {
                window.appController.requestDataRefresh();
            }
        } catch (error) {
            console.error("Error al guardar desde voz:", error);
            this.showToast("No se pudo guardar el elemento.", "error");
            // Keep modal open on error for user to see toast
        }
    }
    
    showForReview(item) {
        document.getElementById('voiceStatus').classList.add('hidden');
        const reviewDiv = document.getElementById('voiceReview');
        reviewDiv.innerHTML = `
            <p><strong>Categoría:</strong> ${item.categoria}</p>
            <p><strong>Título:</strong> ${item.titulo}</p>
            ${item.tareas.length > 0 ? `<p><strong>Tareas:</strong> ${item.tareas.length} detectadas</p>` : ''}
            ${item.url ? `<p><strong>URL:</strong> ${item.url}</p>` : ''}
        `;
        document.getElementById('voiceTranscription').classList.remove('hidden');

        const saveBtn = document.getElementById('voiceSaveBtn');
        const editBtn = document.getElementById('voiceEditBtn');

        saveBtn.onclick = () => this.saveInterpretedItem(item);
        editBtn.onclick = () => {
            this.closeVoiceModal();
            window.appController.openModal();
            document.getElementById('itemTitle').value = item.titulo;
            document.getElementById('itemDescription').value = item.descripcion;
            document.getElementById('itemUrl').value = item.url;
            document.getElementById('itemCategory').value = item.categoria;
        };
    }
    
    // --- UI Helpers ---
    openVoiceModal() { 
        document.getElementById('voiceModal').classList.remove('hidden');
        document.getElementById('voiceStatus').classList.remove('hidden');
        document.getElementById('voiceTranscription').classList.add('hidden');
    }
    closeVoiceModal() { document.getElementById('voiceModal').classList.add('hidden'); }
    updateUIForListening(isListening) {
        const voiceBtn = document.getElementById('voiceBtn');
        if (voiceBtn) {
            voiceBtn.classList.toggle('listening', isListening);
            voiceBtn.querySelector('.material-symbols-outlined').textContent = isListening ? 'stop' : 'mic';
        }
    }
    updateVoiceModal(title, msg) { document.getElementById('voiceTitle').textContent = title; document.getElementById('voiceMessage').textContent = msg; }
    updateTranscriptionDisplay(text) { document.getElementById('transcriptionText').textContent = text; }
    setAutoSave(enabled) { this.autoSave = !!enabled; }
    showToast(message, type = 'success') { if (window.appController && window.appController.showToast) window.appController.showToast(message, type); }
}

window.voiceManager = new VoiceManager();