import { data as db } from './data.js';

/**
 * Cerebras Engine for KAI
 * Gestión de Inteligencia, Contexto y Memoria
 */
export const cerebras = {
    apiKey: 'csk-enykhkmwv8rv3hje86prnj6pevxjp6t46w3h3nxd5ne92j4d', // EL USUARIO DEBE INSERTAR SU API KEY AQUÍ
    model: 'gpt-oss-120b', // El sucesor oficial de llama-3.3-70b (deprecado el 16/02/2026)
    apiUrl: 'https://api.cerebras.ai/v1/chat/completions',

    // Memoria de la sesión actual
    history: [],

    // Límite de memoria para no saturar el contexto
    maxHistory: 10,

    /**
     * Inicializa o limpia la memoria
     */
    reset() {
        this.history = [];
    },

    /**
     * Obtiene el contexto actual del panel (RAG avanzado)
     */
    async getContext() {
        try {
            const items = await db.getItems();
            // Formateamos los items con más detalle para que la IA entienda la estructura
            const contextItems = items.map(i => ({
                id: i.id,
                titulo: i.content,
                tipo: i.type,
                parent: i.parent_id,
                tags: i.tags,
                completado: i.tareas ? i.tareas.every(t => t.completado) : false,
                deadline: i.deadline,
                descripcion: i.descripcion ? i.descripcion.substring(0, 100) + '...' : ''
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
                response: "¡Hola! Estoy listo para ayudarte, pero necesito que configures mi 'Cerebro' (API Key de Cerebras) en src/js/cerebras.js para empezar.",
                action: null
            };
        }

        const context = await this.getContext();
        const systemPrompt = `
Eres KAI (Kawaii Artificial Intelligence), el sistema operativo emocional y administrativo de Maria. 
No eres un simple bot, eres su mano derecha, capaz de organizar su vida aunque ella no sea precisa.

MISIÓN: 
Interpretar los deseos de Maria y ejecutarlos en su panel de control. Si ella dice "tengo que comprar leche", entiende que es una Tarea. Si dice "se me ocurrió un app de gatos", es una Idea. Si dice "no me olvides avisar de X a las 5", es un Recordatorio.

ESTADO ACTUAL DEL PANEL (Tu memoria a corto plazo):
${context}

TUS SUPERPODERES (Acciones):
Debes responder con un JSON de acción AL FINAL de tu mensaje si detectas una intención clara. FORMATO ESTRICTO: [ACTION] {"type": "ACCION", "data": { ... }}

TIPOS DE ACCIÓN DISPONIBLES:

1. CREATE_ITEM: Para crear cualquier cosa nueva.
   data: { type: "nota|tarea|proyecto|directorio", content: "título", descripcion?: "...", tareas?: [], tags?: ["logro", "salud", "emocion"], deadline?: "ISO8601" }

2. UPDATE_ITEM: Para editar, cambiar tipo, anclar, completar.
   data: { id: "UUID_DEL_ITEM", updates: { content?, type?, tags?, descripcion?, deadline?, status?, anclado?: boolean } }

3. DELETE_ITEM: Para borrar cuando Maria lo pida.
   data: { id: "UUID_DEL_ITEM" }

4. TOGGLE_TASK: Para marcar/desmarcar una tarea específica dentro de un proyecto.
   data: { id: "UUID_DEL_PROYECTO", taskIndex: 0, completed: true|false }

5. TOGGLE_PIN: Para anclar/desanclar un elemento.
   data: { id: "UUID_DEL_ITEM" }

6. OPEN_PROJECT: Para navegar dentro de un proyecto.
   data: { id: "UUID_DEL_PROYECTO" }

7. OPEN_EDIT: Para abrir el modal de edición de un elemento.
   data: { id: "UUID_DEL_ITEM", focus?: "tasks|description|url" }

8. SEARCH: Para buscar algo en el panel.
   data: { query: "texto a buscar" }

9. FILTER_CATEGORY: Para filtrar por categoría.
   data: { category: "all|nota|tarea|proyecto|directorio" }

10. NO_ACTION: Cuando solo sea conversación sin acción.
   data: {}

REGLAS CRÍTICAS:
- UUIDs: Busca SIEMPRE el ID en el contexto proporcionado. El ID es un UUID formato "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
- TIPOS DE ELEMENTOS: Usa estos valores EXACTOS: 'nota', 'tarea', 'proyecto', 'directorio'
- ETIQUETAS: 'logro', 'salud', 'emocion', 'alarma'
- FECHAS: Formato ISO8601 (YYYY-MM-DDTHH:MM:SS)
- TONO: Cariñosa, eficiencia, emojis 🧸✨🌈
- SEGURIDAD: Nunca inventes IDs. Si no lo encuentra, usa SEARCH primero.

EJEMPLOS DE ACCIONES:
- "Crea una nota sobre viajes" → CREATE_ITEM {type: "nota", content: "Viajes"}
- "Cambia la nota de gatos a proyecto" → UPDATE_ITEM {id: "UUID", updates: {type: "proyecto"}}
- "Borra eso" → DELETE_ITEM {id: "UUID"}
- "Marca la primera tarea de proyectos" → TOGGLE_TASK {id: "UUID", taskIndex: 0, completed: true}
- "Entra en el proyecto viajes" → OPEN_PROJECT {id: "UUID"}
- "Edita la nota de gatos" → OPEN_EDIT {id: "UUID"}

MEMORIA DE CONVERSACIÓN:
${JSON.stringify(this.history.slice(-4))}
`;

        try {
            console.log(`🧠 KAI: Llamando a Cerebras (${this.model})...`);
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...this.history,
                        { role: 'user', content: message }
                    ],
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Cerebras API Error Response:', response.status, errorData);
                throw new Error(errorData.error?.message || `API Error ${response.status}`);
            }

            const result = await response.json();

            if (!result.choices || result.choices.length === 0) {
                console.error('Cerebras API Unexpected Result:', result);
                throw new Error('No choices returned from AI');
            }

            const aiContent = result.choices[0].message.content;

            // Guardar en historial
            this.history.push({ role: 'user', content: message });
            this.history.push({ role: 'assistant', content: aiContent });
            if (this.history.length > this.maxHistory * 2) this.history.splice(0, 2);

            // Parsear acción si existe
            let action = null;
            if (aiContent.includes('[ACTION]')) {
                const parts = aiContent.split('[ACTION]');
                const actionStr = parts[1].trim();
                try {
                    // Limpiar posibles caracteres extra antes del JSON
                    const cleanStr = actionStr.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
                    action = JSON.parse(cleanStr);
                    console.log('🎯 Acción parseada:', action.type);
                } catch (e) {
                    console.error('Error parsing AI action:', e, 'Raw:', actionStr);
                }
            }

            // Limpiar respuesta de marcadores de acción
            let cleanResponse = aiContent;
            if (aiContent.includes('[ACTION]')) {
                cleanResponse = aiContent.split('[ACTION]')[0].trim();
            }

            return {
                response: cleanResponse,
                action: action
            };

        } catch (error) {
            console.error('Cerebras API ask failed:', error);
            return {
                response: `Lo siento Maria, mi cerebro dio un error: ${error.message}. ¿Reintentamos? 🔌🧸`,
                action: null
            };
        }
    }
};
