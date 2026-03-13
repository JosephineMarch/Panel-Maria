import { data as db } from './data.js';

/**
 * Cerebras Engine for KAI
 * Gestión de Inteligencia, Contexto y Memoria
 * 
 * ⚠️ NOTA DE SEGURIDAD: La API key expuesta en código cliente es inevitable en apps sin backend.
 * Para mayor seguridad, considera usar un proxy server o variables de entorno en build.
 */
export const cerebras = {
    apiKey: 'csk-enykhkmwv8rv3hje86prnj6pevxjp6t46w3h3nxd5ne92j4d', // API key Cerebras - reemplazar por la propia si es necesario
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
     * Modo offline: análisis local sin IA
     */
    offlineParse(message) {
        const text = message.toLowerCase();

        // Detectar tipo
        let type = 'nota';
        let items = [];
        let tags = [];

        // Detectar formato "tarea título, item a, b, c"
        const itemMatch = message.match(/^tarea\s+(.+?),\s*item\s+(.+)$/i);

        if (itemMatch) {
            const titulo = itemMatch[1].trim();
            const itemsText = itemMatch[2];
            items = itemsText.split(',').map(s => s.trim()).filter(s => s.length > 0);
            items = items.map(titulo => ({ titulo, completado: false }));

            // Detectar tags
            if (text.includes('logro') || text.includes('logré')) tags.push('logro');
            if (text.includes('salud') || text.includes('dolor') || text.includes('enfermo')) tags.push('salud');
            if (text.includes('emocion') || text.includes('emoción') || text.includes('triste')) tags.push('emocion');

            const actionData = {
                type: 'tarea',
                content: titulo,
                tags: tags,
                tareas: items
            };

            const responses = [
                "¡Tarea con checklist creada! ✅",
                "¡Listo! Tarea con items guardada ✨",
                "Hecho! Tu tarea está lista 💫"
            ];

            return {
                response: responses[Math.floor(Math.random() * responses.length)],
                action: { type: 'CREATE_ITEM', data: actionData }
            };
        }

        // Detectar solo "item a, b, c" (sin título)
        const onlyItemsMatch = message.match(/^item\s+(.+)$/i);
        if (onlyItemsMatch) {
            const itemsText = onlyItemsMatch[1];
            items = itemsText.split(',').map(s => s.trim()).filter(s => s.length > 0);
            items = items.map(titulo => ({ titulo, completado: false }));

            const actionData = {
                type: 'tarea',
                content: '',
                tags: tags,
                tareas: items
            };

            return {
                response: "¡Tarea con checklist creada! ✅",
                action: { type: 'CREATE_ITEM', data: actionData }
            };
        }

        if (text.includes('tarea') || text.includes('tengo que') || text.includes('necesito') || text.includes('pendiente')) {
            type = 'tarea';
        }
        if (text.includes('proyecto')) {
            type = 'proyecto';
        }
        if (text.includes('enlace') || text.includes('link') || text.includes('youtube') || text.includes('http')) {
            type = 'directorio';
        }

        // Detectar tags
        if (text.includes('logro') || text.includes('logré')) tags.push('logro');
        if (text.includes('salud') || text.includes('dolor') || text.includes('enfermo')) tags.push('salud');
        if (text.includes('emocion') || text.includes('emoción') || text.includes('triste')) tags.push('emocion');

        // Detectar acción
        let action = null;
        const actionData = {
            type: type,
            content: message.replace(/^(tarea|proyecto|enlace|link)\s*/i, '').trim(),
            tags: tags,
            tareas: items
        };

        // Crear siempre un item
        action = {
            type: 'CREATE_ITEM',
            data: actionData
        };

        const responses = [
            "¡Anotado! 🧸✨",
            "¡Listo! Ya lo guardé 💫",
            "Hecho! Tu panel está actualizado 🌟",
            "¡Creado con cariño! 🫰"
        ];

        return {
            response: responses[Math.floor(Math.random() * responses.length)],
            action: action
        };
    },

    /**
     * Procesa un mensaje del usuario
     */
    async ask(message) {
        if (!this.apiKey || this.apiKey === 'TU_API_KEY_AQUI') {
            // Modo offline: analizar localmente
            return this.offlineParse(message);
        }

        const context = await this.getContext();
        const systemPrompt = `
Eres KAI (Kawaii Artificial Intelligence), el sistema operativo emocional y administrativo de Maria. 
No eres un simple bot, eres su mano derecha, capaz de organizar su vida aunque ella no sea precisa.

MISIÓN: 
Interpretar los deseos de Maria y ejecutarlos en su panel de control. Maria tiene TDHA, por lo que a veces sus mensajes son caóticos: puede enviar un link sin título, o una descripción muy larga sin decir qué es. Tu trabajo es poner orden.

Si Maria envía algo que parece una descripción larga (> 50 caracteres) pero no tiene título claro, TÚ debes generar un título corto y creativo (máximo 6 palabras) para el campo "content" y poner el texto completo en "descripcion".

TUS SUPERPODERES (Acciones):
Debes responder con un JSON de acción AL FINAL de tu mensaje si detectas una intención clara. FORMATO ESTRICTO: [ACTION] {"type": "ACCION", "data": { ... }}

TIPOS DE ACCIÓN DISPONIBLES:

1. CREATE_ITEM: Para crear cualquier cosa nueva.
   data: { type: "nota|tarea|proyecto|directorio", content: "título", descripcion?: "...", tareas?: [], tags?: ["logro", "salud", "emocion", "alarma"], deadline?: "ISO8601" }

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
- TÍTULOS Y DESCRIPCIÓN: Maria tiene TDHA y suele escribir ideas largas sin estructura. Si el mensaje es una descripción o nota larga: 1. El texto original va a "descripcion". 2. TÚ generas un título (content) de máximo 5-6 palabras que resuma la idea.
- DETECCIÓN AUTÓNOMA: 
    * Si detectas una URL (http, www, youtube, etc.), asígnalo SIEMPRE a tipo "directorio".
    * Si detectas verbos de acción (comprar, hacer, ir, llamar) o listas, asígnalo a "tarea".
- TIPOS DE ELEMENTOS: Usa estos valores EXACTOS: 'nota', 'tarea', 'proyecto', 'directorio'
- ETIQUETAS: 'logro', 'salud', 'emocion', 'alarma'
- FECHAS: Formato ISO8601.
- TONO: Cariñosa, eficiente, emojis 🧸✨🌈

=== GUÍA DE INFERENCIA DE INTENCIÓN ===

Cuando Maria te escribe, DEBES inferir qué quiere hacer. Analiza las palabras clave y el contexto:

--- PARA DETECTAR SALUD (agrega tag "salud"):
- "me duele", "me duele la cabeza/cabeza", "estoy enferma", "estoy mala", "tengo dolor de..."
- "estoy cansada", "tengo fatiga", "me siento débil", "tengo gripe", "resfriado"
- "tomé medicina", "fui al médico", "tengo cita médica", "me operaron"
- "me enfermé", "estoy malaise", "tengo síntoma"

--- PARA DETECTAR EMOCIONES (agrega tag "emocion"):
- "me sentí", "me siento" + (triste, feliz, contenta, alegre, ansiosa, preocupada, nerviosa)
- "estoy triste", "estoy feliz", "estoy ansiosa", "estoy preocupada"
- "tengo miedo", "tengo vergüenza", "tengo rabia", "tengo enojo"
- "me siento sola", "me siento sola", "tengo ansiedad", "tengo depresión"
- "estoy emocionada", "estoy ilusionada", "estoy frustrada"

--- PARA DETECTAR LOGROS (agrega tag "logro"):
- "logré", "conseguí", "terminé", "completé", "acabé"
- "por fin", "al fin", "ya pude", "finalmente"
- "gané", "me gané", "me otorgaron"
- "cumplí", "superé", "avancé"

--- PARA DETECTAR TIPO "tarea":
- "tengo que", "tengo que comprar", "tengo que hacer", "necesito"
- "no olvidar", "recordar", "importante"
- "to do", "checklist", "lista de"
- "pendiente", "aún no", "falta"
- "para mañana", "para hoy", "esta semana"
- Verbos en futuro: "voy a", "haré", "compraré"

--- PARA DETECTAR TIPO "proyecto":
- "proyecto", "iniciar proyecto", "crear proyecto"
- "vamos a", "vamos a hacer", "quiero hacer algo grande"
- "planificar", "estrategia", "iniciativa"
- "a largo plazo", "a futuro", "a futuro"

--- PARA DETECTAR TIPO "directorio" (enlace):
- "vi un video", "vi un video de", "vi un reels", "vi un tiktok"
- "leí un artículo", "leí un post", "leí un blog"
- "este link", "este enlace", "esta página"
- "youtube", "netflix", "instagram", "twitter", "tiktok"
- "compartido", "enviado", "reenviado"

--- PARA DETECTAR "solo guardando" (sin acción):
- "anotar", "guardar", "recordar", "tener presente"
- "para no olvidar", "para que no se me olvide"
- Información general que no requiere acción

EJEMPLOS DE INFERENCIA:
- "Me duele la cabeza desde hoy" → CREATE_ITEM {type: "nota", content: "Me duele la cabeza", tags: ["salud"]}
- "Hoy me sentí feliz porque logré terminar el proyecto" → CREATE_ITEM {type: "nota", content: "Logré terminar el proyecto", tags: ["logro", "emocion"]}
- "Tengo que comprar leche y pan" → CREATE_ITEM {type: "tarea", content: "Comprar leche y pan"}
- "Vi un video de recetas" → CREATE_ITEM {type: "directorio", content: "Video de recetas"}
- "Se me ocurrió una idea para una app" → CREATE_ITEM {type: "nota", content: "Idea para una app"}
- "Voy a crear un proyecto de renovation de casa" → CREATE_ITEM {type: "proyecto", content: "Renovación de casa"}
- "Mi primo está sick" → CREATE_ITEM {type: "nota", content: "Primo está enfermo", tags: ["salud"]}
- "Me siento triste hoy" → CREATE_ITEM {type: "nota", content: "Me siento triste", tags: ["emocion"]}
- "No olvidar comprar regalos" → CREATE_ITEM {type: "tarea", content: "Comprar regalos"}

MEMORIA DE CONVERSACIÓN:
${JSON.stringify(this.history.slice(-4))}
`;

        try {
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
            const actionMatch = aiContent.match(/\[ACTION\]\s*(\{[\s\S]*)/); // Match desde [ACTION] hasta el final
            if (actionMatch) {
                let rawAction = actionMatch[1].trim();
                
                // Intento de parsear el JSON tal cual
                try {
                    // Verificar si el JSON está completo contando llaves
                    const openBraces = (rawAction.match(/\{/g) || []).length;
                    const closeBraces = (rawAction.match(/\}/g) || []).length;
                    
                    // Si faltan llaves de cierre, agregarlas
                    if (openBraces > closeBraces) {
                        const missing = openBraces - closeBraces;
                        rawAction += '}'.repeat(missing);
                    }

                    action = JSON.parse(rawAction);
                    console.log('🎯 Acción detectada:', action.type, action.data);
                } catch (e) {
                    console.error('Error parsing AI action:', e, 'Raw:', actionMatch[1]);
                    // Fallback a NO_ACTION si falla el parseo pero había intención
                    action = { type: 'NO_ACTION', data: {} };
                }
            }

            // Limpiar respuesta de marcadores de acción
            let cleanResponse = aiContent.replace(/\[ACTION\]\s*\{[\s\S]*?\}[\s\S]*/g, '').trim();

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
