// Módulo de Inteligencia Artificial - KAI (Cerebras Powered)
import { CEREBRAS_API_KEY } from './config.js';

let appInstance = null;
const API_ENDPOINT = 'https://api.cerebras.ai/v1/chat/completions';
const MODEL = 'llama3.1-70b'; // High capability model for instructions

// --- SYSTEM PROMPT ---
const BASE_PROMPT = `
Eres KAI ⚡, el sistema operativo inteligente de la vida de María.
Tu objetivo es organizar su caos, gestionar su información y ser un compañero proactivo.

PERSONALIDAD:
- Alegre, ingeniosa, rápida y empática (pero no empalagosa).
- Usas emojis con moderación pero estilo.
- Vas al grano. No das discursos vacíos.

CAPACIDADES:
Tienes acceso DE LECTURA a sus notas y CAPACIDAD DE ESCRITURA para crear/modificar.

INSTRUCCIONES DE RESPUESTA:
- Si el usuario quiere guardar algo (idea, tarea, dato):
  RESPONDE SOLO CON UN JSON QUE CONTENGA LA ACCIÓN "CREATE".
- Si el usuario pregunta algo sobre sus notas:
  Busca en el CONTEXTO proporcionado y responde en texto natural.
- Si el usuario saluda o charla:
  Responde con personalidad.

FORMATO JSON PARA ACCIONES (¡IMPORTANTE!):
Si detectas una intención de crear o guardar, TU RESPUESTA DEBE SER **ÚNICAMENTE** ESTE JSON (sin texto antes ni después):

{
  "action": "create",
  "data": {
    "titulo": "Título Corto y Claro",
    "descripcion": "El contenido completo de la nota...",
    "etiquetas": ["tag1", "tag2"], 
    "tareas": [ {"titulo": "Tarea 1", "completado": false} ], 
    "url": "http://..." (si detectas link)
  }
}

REGLA DE ETIQUETAS:
- Usa etiquetas existentes del CONTEXTO siempre que encajen.
- Inventa nuevas solo si es necesario (ej: "trabajo", "casa", "ideas", "compras").
`;

// --- MAIN FUNCTION ---
export async function initChat(app) {
    appInstance = app;
    console.log('Kai AI Module Initialized');
}

// --- PUBLIC API ---
export async function sendMessageToKai(text) {
    if (!text.trim()) return;

    // 1. Get Context (Items Summarized)
    const context = getContextSummary(appInstance.store);

    // 2. Prepare Messages
    const messages = [
        { role: 'system', content: basePromptWithContext(context) },
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
    // Summarize last 50 items headers + All Tags
    const tags = Array.from(store.getAllTags()).join(', ');
    const items = store.items.slice(0, 30).map(i => `- [${i.titulo}] #${(i.etiquetas || [])[0]}`).join('\n');

    return `
    CONTEXTO ACTUAL (DATOS DE MARÍA):
    Etiquetas Existentes: ${tags}
    Últimas Notas:
    ${items}
    `;
}

function basePromptWithContext(context) {
    return BASE_PROMPT + "\n" + context;
}

async function callCerebras(messages) {
    if (!CEREBRAS_API_KEY) throw new Error("Falta API KEY");

    const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CEREBRAS_API_KEY}`
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
        throw new Error(`API Error: ${err}`);
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
        // Fallback: It's just chat text
        appendMessage('kai', rawText);
        return;
    }

    // Check Intents
    if (parsed.action === 'create') {
        const newItem = {
            id: appInstance.store.generateId(),
            titulo: parsed.data.titulo,
            descripcion: parsed.data.descripcion || '',
            url: parsed.data.url || '',
            etiquetas: parsed.data.etiquetas || [],
            tareas: parsed.data.tareas || [],
            fecha_creacion: new Date().toISOString()
        };

        // Add to Store
        await appInstance.store.addItem(newItem); // This method usually auto-wraps in update

        // Notify User
        appendMessage('kai', `¡Hecho! He guardado "<b>${newItem.titulo}</b>" con las etiquetas <b>#${newItem.etiquetas.join(', #')}</b>. 🧠✨`);

    } else if (parsed.response) {
        // Explicit chat response in JSON
        appendMessage('kai', parsed.response);
    } else {
        // Fallback if JSON but weird structure
        appendMessage('kai', rawText); // Just show raw if not an action
    }
}

function appendMessage(sender, html) {
    const container = document.getElementById('kaiMessages');
    if (!container) return;

    const div = document.createElement('div');
    div.className = `msg msg-${sender}`;
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
