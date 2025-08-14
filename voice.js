/*
================================================================================
|       PANEL MARÍA - SISTEMA DE ENTRADA POR VOZ (VERSIÓN CORREGIDA)           |
================================================================================
*/

class VoiceManager {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.currentTranscription = '';
        this.autoSave = false;

        this.initSpeechRecognition();
    }

    initSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('El reconocimiento de voz no es compatible en este navegador.');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'es-ES';

        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateUIForListening(true);
            this.updateVoiceModal('Escuchando...', 'Habla ahora...');
        };

        this.recognition.onresult = (event) => {
            this.currentTranscription = Array.from(event.results)
                .map(result => result[0].transcript).join('');
            this.updateTranscriptionDisplay(this.currentTranscription);
        };

        this.recognition.onerror = (event) => {
            console.error('Error de reconocimiento de voz:', event.error);
            this.showToast(`Error de voz: ${event.error}`, 'error');
            this.stopListening();
        };

        this.recognition.onend = () => {
            if (this.isListening) { // Solo procesa si no fue una parada manual
                this.isListening = false;
                this.updateUIForListening(false);
                if (this.currentTranscription.trim()) {
                    this.processTranscription();
                } else {
                    this.closeVoiceModal();
                }
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
            this.recognition.start();
            this.openVoiceModal();
        } catch (e) {
            this.showToast('No se pudo iniciar el reconocimiento.', 'error');
        }
    }

    stopListening() {
        this.isListening = false; // Marcar como parada manual
        if (this.recognition) {
            this.recognition.stop();
        }
        this.updateUIForListening(false);
        this.closeVoiceModal();
    }
    
    processTranscription() {
        this.updateVoiceModal('Procesando...', 'Interpretando tu entrada.');
        const interpretedItem = this.interpretTextToItem(this.currentTranscription);

        if (this.autoSave) {
            this.saveInterpretedItem(interpretedItem);
        } else {
            this.showForReview(interpretedItem);
        }
    }

    interpretTextToItem(text) {
        const lowerText = text.toLowerCase();
        let categoria = 'ideas'; // Default
        if (/\brecurso|link|enlace\b/.test(lowerText)) categoria = 'directorio';
        else if (/\bproyecto|voy a hacer|pasos\b/.test(lowerText)) categoria = 'proyectos';
        else if (/\blogro|terminado|finalizado\b/.test(lowerText)) categoria = 'logros';

        const titulo = text.split(/[.!?]/)[0].trim() || 'Elemento de voz';
        const url = (text.match(/(https?:\/\/[^\s]+)/gi) || [''])[0];
        
        const tareas = (text.match(/(-|\*|\d\.)\s*(.*)/g) || []).map(t => ({
            id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            titulo: t.replace(/(-|\*|\d\.)\s*/, '').trim(),
            completado: false
        }));

        return {
            titulo,
            descripcion: text,
            categoria,
            url,
            tareas,
            etiquetas: [],
            anclado: false,
            fecha_creacion: new Date().toISOString(),
            fecha_finalizacion: categoria === 'logros' ? new Date().toISOString() : null,
            meta: { source: 'voice' }
        };
    }

    async saveInterpretedItem(itemData) {
        try {
            // CORRECCIÓN: Usar el método correcto del storage global.
            await window.storage.performBatchUpdate([{ type: 'add', data: itemData }]);
            this.showToast(`Elemento "${itemData.titulo}" guardado.`, 'success');
            this.closeVoiceModal();
            // CORRECCIÓN: Notificar a la app principal para que refresque la UI.
            if (window.appController) {
                window.appController.requestDataRefresh();
            }
        } catch (error) {
            console.error("Error al guardar desde voz:", error);
            this.showToast("No se pudo guardar el elemento.", "error");
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
            window.appController.openModal(); // Abre modal vacío
            // Rellena el formulario con los datos interpretados
            document.getElementById('itemTitle').value = item.titulo;
            document.getElementById('itemDescription').value = item.descripcion;
            document.getElementById('itemUrl').value = item.url;
            document.getElementById('itemCategory').value = item.categoria;
        };
    }
    
    // --- UI Helpers ---
    openVoiceModal() { document.getElementById('voiceModal').classList.remove('hidden'); }
    closeVoiceModal() { document.getElementById('voiceModal').classList.add('hidden'); }
    updateUIForListening(isListening) {
        const voiceBtn = document.getElementById('voiceBtn');
        if (voiceBtn) {
            voiceBtn.classList.toggle('listening', isListening);
            voiceBtn.querySelector('.material-symbols-outlined').textContent = isListening ? 'stop' : 'mic';
        }
        document.getElementById('voiceStatus').classList.toggle('hidden', !isListening);
        document.getElementById('voiceTranscription').classList.toggle('hidden', isListening);
    }
    updateVoiceModal(title, msg) { document.getElementById('voiceTitle').textContent = title; document.getElementById('voiceMessage').textContent = msg; }
    updateTranscriptionDisplay(text) { document.getElementById('transcriptionText').textContent = text; }
    setAutoSave(enabled) { this.autoSave = !!enabled; }
    showToast(message, type = 'success') { if (window.appController) window.appController.showToast(message, type); }
}

window.voiceManager = new VoiceManager();