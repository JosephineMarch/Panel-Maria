```javascript
// Módulo de Inteligencia Artificial - KAI (Cerebras Powered)
import { CEREBRAS_API_KEY } from './config.js';
import { buildSystemPrompt } from './kai-persona.js'; // Import Persona

let appInstance = null;
const API_ENDPOINT = 'https://api.cerebras.ai/v1/chat/completions';
const MODEL = 'llama-3.3-70b'; // High capability model for instructions


// --- MAIN FUNCTION ---
export async function initChat(app) {
    appInstance = app;
    console.log('Kai AI Module Initialized (Persona Loaded)');
}

// --- PUBLIC API ---
export async function sendMessageToKai(text) {
    if (!text.trim()) return;

    // 1. Get Context
    const context = getContextSummary(appInstance.store);
    
    // 2. Build Prompt using Persona
    const systemPrompt = buildSystemPrompt(context);

    // 3. Prepare Messages
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
    ];

    try {
        const responseText = await callCerebras(messages);
        await handleKaiResponse(responseText);
    } catch (error) {
        console.error('Kai Brain Freeze:', error);
        appendMessage('kai', 'Ups, mi cerebro digital se congeló un segundo. 🥶 Intenta otra vez.');
    }
}

// --- INTERNAL HELPERS ---

function getContextSummary(store) {
    // Summarize last 40 items with IDs
    const tags = Array.from(store.getAllTags()).join(', ');
    const items = store.items.slice(0, 40).map(i => `(ID: ${ i.id })[${ i.titulo }]#${ (i.etiquetas || []).join(',') } `).join('\n');

    return `
CONTEXTO(TUS DATOS):
    Etiquetas Globales: ${ tags }
    
    ITEMS RECIENTES(Úsalos para editar / borrar):
    ${ items }
`;
}

async function callCerebras(messages) {
    if (!CEREBRAS_API_KEY) throw new Error("Falta API KEY");

    const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ CEREBRAS_API_KEY } `
        },
        body: JSON.stringify({
            model: MODEL,
            messages: messages,
            temperature: 0.7,
            max_tokens: 1000,
            response_format: { type: "json_object" } // Force JSON mode mostly
        })
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`API Error: ${ err } `);
    }

    const data = await res.json();
    return data.choices[0].message.content;
}

async function handleKaiResponse(rawText) {
    console.log('Kai Raw Response:', rawText);

    let parsed;
    try {
        parsed = JSON.parse(rawText);
    } catch (e) {
        appendMessage('kai', rawText); // Fallback
        return;
    }

    // --- ROUTER DE ACCIONES ---
    const { action, data, id, response } = parsed;

    // 1. CREATE
    if (action === 'create') {
        const newItem = {
            id: appInstance.store.generateId(),
            titulo: data.titulo || 'Sin Título',
            descripcion: data.descripcion || '',
            url: data.url || '',
            etiquetas: data.etiquetas || [],
            tareas: data.tareas || [],
            fecha_creacion: new Date().toISOString()
        };
        await appInstance.store.addItem(newItem);
        appendMessage('kai', `He guardado "<b>${newItem.titulo}</b>" ⚡`);

        // 2. UPDATE
    } else if (action === 'update') {
        if (!id) {
            appendMessage('kai', 'Necesito un ID para editar, pero no lo encontré. 😵');
            return;
        }
        await appInstance.store.updateItem(id, data);
        appendMessage('kai', `Actualizado.Renové el item ${ id.substr(0, 4) }... ✨`);

        // 3. DELETE
    } else if (action === 'delete') {
        if (!id) {
            appendMessage('kai', 'No sé qué ID borrar. 😵');
            return;
        }
        await appInstance.store.deleteItem(id);
        appendMessage('kai', `Borrado.Desapareció en el vacío. 🗑️`);

        // 4. CHAT
    } else if (action === 'chat' || response) {
        const text = response || data?.mensaje || (typeof data === 'string' ? data : "...");
        appendMessage('kai', text);

    } else {
        appendMessage('kai', rawText);
    }
}

function appendMessage(sender, html) {
    const container = document.getElementById('kaiMessages');
    if (!container) return;

    const div = document.createElement('div');
    div.className = `msg msg - ${ sender } `;
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
