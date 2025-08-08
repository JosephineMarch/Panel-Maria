/*
================================================================================
|       PANEL MARÍA - SISTEMA DE ENTRADA POR VOZ E INTERPRETACIÓN IA            |
================================================================================
*/

class VoiceManager {
    constructor() {
        this.recognition = null;
        this.synthesis = null;
        this.isListening = false;
        this.isProcessing = false;
        this.currentTranscription = '';
        this.autoSave = false;
        
        this.initSpeechRecognition();
        this.initSpeechSynthesis();
    }
    
    initSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Speech recognition not supported');
            return;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'es-ES';
        
        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateVoiceButton();
            this.updateVoiceModal('Escuchando...', 'Habla ahora para crear un nuevo elemento');
        };
        
        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            
            this.currentTranscription = finalTranscript + interimTranscript;
            this.updateTranscriptionDisplay();
        };
        
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.stopListening();
            
            let errorMessage = 'Error en el reconocimiento de voz';
            switch (event.error) {
                case 'no-speech':
                    errorMessage = 'No se detectó voz. Intenta de nuevo.';
                    break;
                case 'audio-capture':
                    errorMessage = 'Error al capturar audio. Verifica tu micrófono.';
                    break;
                case 'not-allowed':
                    errorMessage = 'Permiso denegado para usar el micrófono.';
                    break;
                case 'network':
                    errorMessage = 'Error de red. Verifica tu conexión.';
                    break;
            }
            
            this.showToast(errorMessage, 'error');
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
            this.updateVoiceButton();
            
            if (this.currentTranscription.trim()) {
                this.processTranscription();
            } else {
                this.closeVoiceModal();
            }
        };
    }
    
    initSpeechSynthesis() {
        if ('speechSynthesis' in window) {
            this.synthesis = window.speechSynthesis;
        }
    }
    
    startListening() {
        if (!this.recognition) {
            this.showToast('El reconocimiento de voz no está disponible en tu navegador', 'error');
            return;
        }
        
        try {
            this.currentTranscription = '';
            this.recognition.start();
            this.openVoiceModal();
        } catch (error) {
            console.error('Error starting speech recognition:', error);
            this.showToast('Error al iniciar el reconocimiento de voz', 'error');
        }
    }
    
    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }
    
    updateVoiceButton() {
        const voiceBtn = document.getElementById('voiceBtn');
        if (voiceBtn) {
            voiceBtn.classList.toggle('listening', this.isListening);
            voiceBtn.querySelector('.material-symbols-outlined').textContent = 
                this.isListening ? 'stop' : 'mic';
        }
    }
    
    openVoiceModal() {
        const modal = document.getElementById('voiceModal');
        if (modal) {
            modal.classList.remove('hidden');
            this.updateVoiceModal('Escuchando...', 'Habla ahora para crear un nuevo elemento');
        }
    }
    
    closeVoiceModal() {
        const modal = document.getElementById('voiceModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
    
    updateVoiceModal(title, message) {
        const titleEl = document.getElementById('voiceTitle');
        const messageEl = document.getElementById('voiceMessage');
        
        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;
    }
    
    updateTranscriptionDisplay() {
        const transcriptionEl = document.getElementById('transcriptionText');
        const transcriptionDiv = document.getElementById('voiceTranscription');
        
        if (transcriptionEl) {
            transcriptionEl.textContent = this.currentTranscription;
        }
        
        if (transcriptionDiv && this.currentTranscription.trim()) {
            transcriptionDiv.classList.remove('hidden');
        }
    }
    
    async processTranscription() {
        this.isProcessing = true;
        this.updateVoiceModal('Procesando...', 'Interpretando tu entrada con IA');
        
        try {
            // Interpretar el texto con IA
            const interpretedItem = await this.interpretTextToItem(this.currentTranscription);
            
            if (this.autoSave) {
                // Guardado automático
                await this.saveInterpretedItem(interpretedItem);
                this.showToast(`Creado ${interpretedItem.titulo} en módulo ${interpretedItem.modulo}`, 'success');
                this.closeVoiceModal();
            } else {
                // Mostrar para revisión
                this.showTranscriptionForReview(interpretedItem);
            }
        } catch (error) {
            console.error('Error processing transcription:', error);
            this.showToast('Error al procesar la entrada. Intenta de nuevo.', 'error');
            this.closeVoiceModal();
        } finally {
            this.isProcessing = false;
        }
    }
    
    async interpretTextToItem(text) {
        // Prompt para la IA según especificaciones del documento
        const prompt = `Eres un servicio que convierte texto transcrito en un JSON con la estructura:
{ modulo, titulo, descripcion, categorias[], tareas[], urls[] }

Reglas:
- Si el texto contiene varias líneas con guiones o numeración, interpretalas como tareas.
- Detecta URLs explícitas (http/https/www) y ponlas en urls[].
- Si detectas keywords como "recurso", "link", "enlace" => modulo: "directorio".
- Si detectas "idea", "pensé", "se me ocurrió" => modulo: "idea".
- Si detectas "voy a hacer", "hacer esto", "pasos", "paso 1" => modulo: "proyecto".
- Si detectas "ya lo hice", "terminado", "finalizado" => modulo: "logro".
- Devuelve JSON válido. No incluyas texto adicional.

Texto a interpretar: "${text}"`;

        try {
            // Simulación de interpretación IA (en producción usarías una API real)
            const interpretedItem = this.simulateAIInterpretation(text);
            return interpretedItem;
        } catch (error) {
            console.error('Error in AI interpretation:', error);
            throw new Error('Error en la interpretación de IA');
        }
    }
    
    simulateAIInterpretation(text) {
        const lowerText = text.toLowerCase();
        
        // Detectar módulo
        let modulo = 'idea'; // por defecto
        if (lowerText.includes('recurso') || lowerText.includes('link') || lowerText.includes('enlace')) {
            modulo = 'directorio';
        } else if (lowerText.includes('voy a hacer') || lowerText.includes('hacer esto') || lowerText.includes('pasos') || lowerText.includes('paso 1')) {
            modulo = 'proyecto';
        } else if (lowerText.includes('ya lo hice') || lowerText.includes('terminado') || lowerText.includes('finalizado')) {
            modulo = 'logro';
        }
        
        // Extraer título (primera frase)
        const sentences = text.split(/[.!?]/).filter(s => s.trim());
        const titulo = sentences[0]?.trim() || 'Elemento sin título';
        
        // Extraer descripción (resto del texto)
        const descripcion = sentences.slice(1).join('. ').trim() || '';
        
        // Extraer URLs
        const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
        const urls = text.match(urlRegex) || [];
        
        // Extraer tareas (líneas con guiones o numeración)
        const taskRegex = /^[\s]*[-*•]\s*(.+)$|^[\s]*\d+[\.\)]\s*(.+)$/gm;
        const tareas = [];
        let match;
        while ((match = taskRegex.exec(text)) !== null) {
            tareas.push({
                id: Date.now().toString(36) + Math.random().toString(36).substr(2),
                titulo: match[1] || match[2],
                completado: false
            });
        }
        
        // Extraer categorías (palabras clave comunes)
        const categorias = [];
        const categoryKeywords = {
            'trabajo': ['trabajo', 'laboral', 'oficina'],
            'personal': ['personal', 'vida', 'privado'],
            'estudio': ['estudio', 'aprendizaje', 'curso'],
            'proyecto': ['proyecto', 'desarrollo', 'creación'],
            'idea': ['idea', 'concepto', 'inspiración']
        };
        
        for (const [category, keywords] of Object.entries(categoryKeywords)) {
            if (keywords.some(keyword => lowerText.includes(keyword))) {
                categorias.push(category);
            }
        }
        
        return {
            modulo,
            titulo,
            descripcion,
            categorias,
            tareas,
            urls,
            anclado: false,
            fecha_creacion: new Date().toISOString(),
            fecha_finalizacion: modulo === 'logro' ? new Date().toISOString() : null,
            estado_historial: modulo === 'proyecto' ? [{ estado: 'pendiente', fecha: new Date().toISOString() }] : [],
            archivos_adjuntos: [],
            tema_modulo: '',
            meta: {
                confidence: 'medium',
                source: 'voice',
                originalText: text
            }
        };
    }
    
    async saveInterpretedItem(item) {
        try {
            const savedItem = await storage.addItem(item);
            return savedItem;
        } catch (error) {
            console.error('Error saving interpreted item:', error);
            throw error;
        }
    }
    
    showTranscriptionForReview(item) {
        this.updateVoiceModal('Revisar elemento', 'Revisa y ajusta el elemento antes de guardar');
        
        // Mostrar el elemento interpretado en el modal
        const transcriptionDiv = document.getElementById('voiceTranscription');
        if (transcriptionDiv) {
            transcriptionDiv.innerHTML = `
                <h4>Elemento interpretado:</h4>
                <div class="interpreted-item">
                    <p><strong>Módulo:</strong> ${item.modulo}</p>
                    <p><strong>Título:</strong> ${item.titulo}</p>
                    <p><strong>Descripción:</strong> ${item.descripcion || 'Sin descripción'}</p>
                    <p><strong>Categorías:</strong> ${item.categorias.join(', ') || 'Sin categorías'}</p>
                    ${item.tareas.length > 0 ? `<p><strong>Tareas:</strong> ${item.tareas.length} tareas detectadas</p>` : ''}
                    ${item.urls.length > 0 ? `<p><strong>URLs:</strong> ${item.urls.length} URLs detectadas</p>` : ''}
                </div>
                <div class="voice-actions">
                    <button id="voiceRetryBtn" class="btn btn--text">Reintentar</button>
                    <button id="voiceSaveBtn" class="btn btn--filled">Guardar</button>
                </div>
            `;
            
            // Configurar eventos para los botones
            const retryBtn = transcriptionDiv.querySelector('#voiceRetryBtn');
            const saveBtn = transcriptionDiv.querySelector('#voiceSaveBtn');
            
            if (retryBtn) {
                retryBtn.onclick = () => {
                    this.currentTranscription = '';
                    this.startListening();
                };
            }
            
            if (saveBtn) {
                saveBtn.onclick = async () => {
                    try {
                        await this.saveInterpretedItem(item);
                        this.showToast(`Creado ${item.titulo} en módulo ${item.modulo}`, 'success');
                        this.closeVoiceModal();
                    } catch (error) {
                        this.showToast('Error al guardar el elemento', 'error');
                    }
                };
            }
        }
    }
    
    setAutoSave(enabled) {
        this.autoSave = enabled;
    }
    
    speak(text) {
        if (this.synthesis) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'es-ES';
            utterance.rate = 0.9;
            this.synthesis.speak(utterance);
        }
    }
    
    showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
    }
}

// Instancia global del gestor de voz
const voiceManager = new VoiceManager();

// Exportar para uso global
window.voiceManager = voiceManager;
