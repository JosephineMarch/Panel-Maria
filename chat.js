// Módulo de Inteligencia Artificial - KAI (Cerebras Powered)
import { CEREBRAS_API_KEY } from './config.js';
import { buildSystemPrompt } from './kai-persona.js'; // Import Persona

let appInstance = null;
let chatMessages, chatInput, voiceBtn; // Global refs
const API_ENDPOINT = 'https://api.cerebras.ai/v1/chat/completions';
const MODEL = 'llama-3.3-70b';
// Intentamos cargar el historial guardado, si no existe, empezamos vacío
let chatHistory = JSON.parse(localStorage.getItem('kai_history')) || [];


// --- MAIN FUNCTION ---
export async function initChat(app) {
    appInstance = app;

    // Bind DOM Elements
    chatMessages = document.querySelector('.kai-messages'); // Fixed selector
    if (!chatMessages) chatMessages = document.getElementById('kaiMessages'); // Fallback

    chatInput = document.getElementById('kaiInput');
    voiceBtn = document.getElementById('voiceBtn');

    if (voiceBtn) {
        voiceBtn.addEventListener('click', toggleVoiceInput);
    }

    console.log('Kai AI Module Initialized (Persona Loaded & Listeners Ready)');

    // Al final de initChat...
if (chatHistory.length > 0) {
    chatHistory.forEach(msg => {
        const sender = msg.role === 'user' ? 'user' : 'kai';
        // Solo mostramos si el mensaje tiene contenido de texto
        if (msg.content && typeof msg.content === 'string') {
             appendMessage(sender, msg.content);
        }
    });
}
    
}

// --- PUBLIC API ---
export async function sendMessageToKai(text) {
    if (!text.trim()) return;

    const context = getContextSummary(appInstance.store);
    const systemPrompt = buildSystemPrompt(context);

    const messages = [
        { role: 'system', content: systemPrompt },
        ...chatHistory,
        { role: 'user', content: text }
    ];

    try {
        const responseText = await callCerebras(messages);
        
        // Guardamos en el array
        chatHistory.push({ role: 'user', content: text });
        chatHistory.push({ role: 'assistant', content: responseText });

        // Mantenemos solo los últimos 15 para no saturar
        if (chatHistory.length > 15) chatHistory.shift();

        // --- ESTO ES LO NUEVO: Guardado persistente ---
        localStorage.setItem('kai_history', JSON.stringify(chatHistory));

        await handleKaiResponse(responseText);
    } catch (error) {
        console.error('Kai Brain Freeze:', error);
        appendMessage('kai', 'Ups, 🥶 Intenta otra vez.');
    }
}



// --- INTERNAL HELPERS ---

function getContextSummary(store) {
    // Summarize last 40 items with IDs
    const tags = Array.from(store.getAllTags()).join(', ');
    const items = store.items.slice(0, 40).map(i => `(ID: ${i.id})[${i.titulo}]#${(i.etiquetas || []).join(',')} `).join('\n');

    return `
CONTEXTO(TUS DATOS):
    Etiquetas Globales: ${tags}
    
    ITEMS RECIENTES(Úsalos para editar / borrar):
    ${items}
`;
}

async function callCerebras(messages) {
    if (!CEREBRAS_API_KEY) throw new Error("Falta API KEY");

    const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CEREBRAS_API_KEY} `
        },
        body: JSON.stringify({
            model: MODEL,
            messages: messages,
            temperature: 0.7,
            max_tokens: 4096, // Increased for bulk operations
            response_format: { type: "json_object" }
        })
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`API Error: ${err} `);
    }

    const data = await res.json();
    return data.choices[0].message.content;
}

async function handleKaiResponse(responseText) {
    try {
        // 1. Intentamos extraer el JSON de la respuesta de KAI
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        
        // Si no hay JSON, es solo una respuesta de texto normal
        if (!jsonMatch) {
            appendMessage('kai', responseText);
            return;
        }

        const command = JSON.parse(jsonMatch[0]);
        const { action, id, data, response, updates } = command;

        // 2. Mostrar el mensaje de texto de KAI si existe
        if (response) {
            appendMessage('kai', response);
        } else if (action === 'chat') {
            appendMessage('kai', responseText);
        }

        // 3. EJECUTOR DE ACCIONES (El puente con tu Store)
        switch (action) {
            case 'create':
                // Usa el método addItem de tu store.js
                await appInstance.store.addItem(data);
                if (!response) appendMessage('kai', "✅ He creado la nota por ti.");
                break;

            case 'update':
                if (id) {
                    // Usa el método updateItem de tu store.js
                    await appInstance.store.updateItem(id, data);
                    if (!response) appendMessage('kai', "📝 Nota actualizada correctamente.");
                }
                break;

            case 'delete':
                if (id) {
                    // Usa el método deleteItem de tu store.js
                    await appInstance.store.deleteItem(id);
                    if (!response) appendMessage('kai', "🗑️ Nota eliminada.");
                }
                break;

            case 'start_global_cleanup':
                // Llama a la función de limpieza secuencial que ya tienes
                runSequentialCleanup();
                break;

            case 'bulk_update':
                // Para limpiezas masivas usando performBatchUpdate de tu storage.js
                if (updates && updates.length > 0) {
                    const operations = updates.map(u => ({
                        type: 'update',
                        id: u.id,
                        data: u.data
                    }));
                    await appInstance.store.performBatchUpdate(operations);
                    if (!response) appendMessage('kai', `He organizado ${updates.length} notas. 🧠`);
                }
                break;

            default:
                // Si la acción no es reconocida pero hay texto, lo mostramos
                if (!response && action !== 'chat') appendMessage('kai', responseText);
                break;
        }
    } catch (e) {
        console.error("Error en el ejecutor de KAI:", e);
        // Si el JSON estaba mal formado, al menos mostramos el texto
        appendMessage('kai', responseText);
    }
}


function tryRepairJSON(jsonString) {
    let str = jsonString.trim();
    if (!str.startsWith('{')) return null;

    // Common truncation patterns
    const completions = [
        str + ']}',
        str + '}]}',
        str + '"}]}',
        str + '"]}]}',
        str + '}]}]}'
    ];

    for (const alt of completions) {
        try {
            const p = JSON.parse(alt);
            if (p.action) return p;
        } catch (e) { }
    }
    return null;
}

// --- SEQUENTIAL CLEANUP LOGIC ---

// --- SEQUENTIAL CLEANUP LOGIC ---
async function runSequentialCleanup() {
    const items = appInstance.store.items;
    if (!items || items.length === 0) {
        appendMessage('kai', 'No hay nada que organizar todavía. ¡Vuelve cuando tengas más notas! ✨');
        return;
    }

    appendMessage('kai', `🚀 <b>Iniciando Organización Inteligente</b>... Iré bloque por bloque. ¡Te aviso al terminar!`);

    const BATCH_SIZE = 10;
    let processed = 0;

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);
        const batchContext = batch.map(item => `(ID: ${item.id}) [${item.titulo}] Tags actuales: #${(item.etiquetas || []).join(', #')}`).join('\n');

                const prompt = `
        TAREA: Limpia y simplifica las etiquetas de estos ${batch.length} bloques. 
        REGLAS DE ORO:
        - NUNCA uses el símbolo '#' en el JSON. Escribe solo el texto (ej: "trabajo", no "#Trabajo").
        - Si hay etiquetas similares (ej: "cita" y "reunion"), únelas en "citas".
        - Usa categorías generales: trabajo, casa, ideas, salud, proyectos.
        - Responde estrictamente con el JSON de bulk_update.
        
        BLOQUES A PROCESAR:
        ${batchContext}
        `;
        try {
            // AQUÍ EL CAMBIO: Le pasamos su identidad completa en lugar de un texto vacío
            const resText = await callCerebras([
                { role: 'system', content: buildSystemPrompt('MODO LIMPIEZA: Tu objetivo es reducir y organizar etiquetas.') }, 
                { role: 'user', content: prompt }
            ]);
            
            const parsed = JSON.parse(resText);

            if (parsed.updates) {
                for (const upd of parsed.updates) {
                    await appInstance.store.updateItem(upd.id, upd.data);
                }
            }

            processed += batch.length;
            if (i % 20 === 0) {
                appendMessage('kai', `⌚ Procesando... (${Math.min(processed, items.length)}/${items.length} bloques analizados)`);
            }

        } catch (e) {
            console.error('Batch error:', e);
        }

        await new Promise(r => setTimeout(r, 500));
    }

    appendMessage('kai', `🏆 <b>¡Misión cumplida!</b> He simplificado tu sistema de etiquetas. 🧠✨`);
}


function appendMessage(sender, html) {
    const container = document.getElementById('kaiMessages');
    if (!container) return;

    const div = document.createElement('div');
    div.className = `msg msg - ${sender} `;
    div.innerHTML = html;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// --- VOICE INPUT (Web Speech API) ---
let recognition = null;
let isListening = false;

function toggleVoiceInput() {
    // Check support
    if (!('webkitSpeechRecognition' in window)) {
        alert('Tu navegador no soporta entrada de voz. Prueba Chrome o Edge.');
        return;
    }

    // Init Recognition if not exists
    if (!recognition) {
        recognition = new webkitSpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            isListening = true;
            if (voiceBtn) voiceBtn.classList.add('recording');
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (chatInput) {
                chatInput.value = transcript;
                // Optional: Auto-send? Let's let user confirm for now.
                chatInput.focus();
            }
        };

        recognition.onerror = (event) => {
            console.error('Voice Error:', event.error);
            isListening = false;
            if (voiceBtn) voiceBtn.classList.remove('recording');
        };

        recognition.onend = () => {
            isListening = false;
            if (voiceBtn) voiceBtn.classList.remove('recording');
        };
    }

    // Toggle
    if (isListening) {
        recognition.stop();
    } else {
        recognition.start();
    }
}
