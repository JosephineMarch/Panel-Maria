import { data as db } from './data.js';

/**
 * Gemini Engine for KAI
 * Gestión de Inteligencia, Contexto y Memoria (Google AI)
 */
export const gemini = {
    apiKey: 'AIzaSyB40I6HisopVIxZEQJy60dYQ6g1UmOAL8I', // EL USUARIO DEBE INSERTAR SU API KEY DE GOOGLE AQUÍ
    model: 'gemini-2.0-flash',
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/',

    // Memoria de la sesión actual (Formato Gemini: { role: 'user'|'model', parts: [{text: '...'}] })
    history: [],

    // Límite de memoria
    maxHistory: 10,

    /**
     * Inicializa o limpia la memoria
     */
    reset() {
        this.history = [];
    },

    /**
     * Obtiene el contexto actual del panel (RAG humilde)
     */
    async getContext() {
        try {
            const items = await db.getItems();
            if (!items || items.length === 0) return 'El panel está vacío actualmente.';

            const contextItems = items.map(i => ({
                id: i.id,
                titulo: i.content,
                tipo: i.type,
                descripcion: i.descripcion || '',
                completado: i.tareas ? i.tareas.every(t => t.completado) : false,
                deadline: i.deadline || 'Sin fecha'
            }));

            return JSON.stringify(contextItems);
        } catch (error) {
            console.error('Error fetching context:', error);
            return '[]';
        }
    },

    /**
     * Procesa un mensaje del usuario
     */
    async ask(message) {
        if (!this.apiKey) {
            return {
                response: "¡Hola! Estoy listo para ser tu cerebro secundario. Pero primero, necesito que insertes tu API Key de Gemini en `src/js/gemini.js`. ✨",
                action: null
            };
        }

        const context = await this.getContext();

        const systemInstruction = `
Eres KAI (Kawaii Artificial Intelligence), el asistente personal del Panel de Control de Maria.
Tu objetivo es ayudar a Maria a gestionar sus ideas (bombillas), proyectos (carpetas), tareas (checklists), alarmas y logros (trofeos).

CONTEXTO ACTUAL DEL PANEL (Tus datos reales):
${context}

REGLAS DE ACTUACIÓN:
1. Personalidad: Alegre, ultra-eficiente, minimalista y cariñosa. Usa emojis (🧸, ✨, 📁, 💡).
2. Tienes el poder de gestionar el panel. Si Maria te pide crear, borrar o actualizar algo, DEBES hacerlo.
3. Para ejecutar acciones, incluye SIEMPRE al final de tu respuesta el comando estructurado: [ACTION] {"type": "ACCION", "data"| "id": ...}

ACCIONES QUE PUEDES EJECUTAR:
- CREATE_ITEM: {"type": "idea"|"task"|"proyecto"|"reminder"|"directorio", "content": "TÍTULO", "descripcion": "...", "tareas": ["T1", "T2"], "tags": ["tag1"], "deadline": "ISO_DATE", "url": "..."}
- UPDATE_ITEM: {"id": "UID", "updates": {...}}
- DELETE_ITEM: {"id": "UID"}
- SEARCH: {"query": "termino"}

EJEMPLO DE RESPUESTA:
"¡Hecho! He anotado esa idea brillante. 💡✨
[ACTION] {"type": "CREATE_ITEM", "data": {"content": "Vender limonada", "type": "idea"}}"
`;

        try {
            let currentModel = this.model;
            console.log(`🧠 KAI: Llamando a Gemini (${currentModel})...`);

            let response = await this.callApi(message, currentModel, systemInstruction);

            // Si el modelo específico falla con 404, probamos con el alias '-latest'
            // O viceversa si el usuario puso uno que no existe en esta versión
            if (response.status === 404) {
                console.warn(`Modelo ${currentModel} no encontrado en ${this.apiUrl}, probando fallback...`);
                currentModel = currentModel.includes('-latest') ? currentModel.replace('-latest', '') : `${currentModel}-latest`;
                response = await this.callApi(message, currentModel, systemInstruction);
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Gemini API Error Response:', response.status, errorData);
                throw new Error(errorData.error?.message || `Error ${response.status}`);
            }

            const result = await response.json();
            const aiContent = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!aiContent) {
                console.error('Respuesta vacía de Gemini:', result);
                throw new Error('No se recibió contenido de la IA');
            }

            // Guardar en historial
            this.history.push({ role: 'user', parts: [{ text: message }] });
            this.history.push({ role: 'model', parts: [{ text: aiContent }] });
            if (this.history.length > this.maxHistory * 2) this.history.splice(0, 2);

            // Parsear acción si existe
            let action = null;
            if (aiContent.includes('[ACTION]')) {
                const parts = aiContent.split('[ACTION]');
                try {
                    action = JSON.parse(parts[1].trim());
                } catch (e) {
                    console.error('Error parsing Gemini action:', e);
                }
            }

            return {
                response: aiContent.split('[ACTION]')[0].trim(),
                action: action
            };

        } catch (error) {
            console.error('Gemini API Error:', error);
            return {
                response: `Vaya Maria, mi cerebro dio un error: ${error.message}. ¿Lo intentamos otra vez? 🔌🧸`,
                action: null
            };
        }
    },

    /**
     * Helper para llamar a la API con un modelo específico
     */
    async callApi(message, model, systemInstruction) {
        const url = `${this.apiUrl}${model}:generateContent?key=${this.apiKey}`;
        const body = {
            contents: [
                ...this.history,
                {
                    role: 'user',
                    parts: [{ text: message }]
                }
            ],
            system_instruction: {
                parts: [{ text: systemInstruction }]
            },
            generation_config: {
                temperature: 0.7,
                top_k: 40,
                top_p: 0.95,
                max_output_tokens: 1024,
            }
        };

        return await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    }
};
