// Módulo de Inteligencia Artificial - KAI (Flexible AI Powered)
import { CEREBRAS_API_KEY, GEMINI_API_KEY, ACTIVE_AI_PROVIDER } from './config.js';
import { buildSystemPrompt } from './kai-persona.js';

let appInstance = null;
let chatMessages, chatInput, voiceBtn;
const CEREBRAS_ENDPOINT = 'https://api.cerebras.ai/v1/chat/completions';
const MODEL_CEREBRAS = 'llama-3.3-70b';

// --- MAIN FUNCTION ---
export async function initChat(app) {
    appInstance = app;
    chatMessages = document.getElementById('kaiMessages');
    chatInput = document.getElementById('kaiInput');
    voiceBtn = document.getElementById('voiceBtn');

    if (voiceBtn) {
        voiceBtn.addEventListener('click', toggleVoiceInput);
    }
    console.log('Kai AI Module Initialized (TDAH 3 Edition)');
}

// --- PUBLIC API ---
export async function sendMessageToKai(text) {
    if (!text.trim()) return;

    // 1. Get Context (RAG Lite)
    const context = getExpandedContext(appInstance.store);

    // 2. Build Prompt
    const systemPrompt = buildSystemPrompt(context);

    // 3. Prepare Messages
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
    ];

    try {
        const responseJson = await callAI(messages);
        await handleKaiResponse(responseJson);
    } catch (error) {
        console.error('Kai Brain Freeze:', error);
        appendMessage('kai', '¡Uy! Mi cerebro digital se congeló un segundo. 🥶 ¿Lo repetimos?');
    }
}

// --- AI ORCHESTRATOR ---
async function callAI(messages) {
    if (ACTIVE_AI_PROVIDER === 'cerebras') {
        return callCerebras(messages);
    } else if (ACTIVE_AI_PROVIDER === 'gemini') {
        // Placeholder for Gemini implementation
        throw new Error("Gemini Provider not yet implemented fully.");
    }
}

async function callCerebras(messages) {
    if (!CEREBRAS_API_KEY) throw new Error("Falta API KEY de Cerebras");

    const res = await fetch(CEREBRAS_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CEREBRAS_API_KEY}`
        },
        body: JSON.stringify({
            model: MODEL_CEREBRAS,
            messages: messages,
            temperature: 0.7,
            response_format: { type: "json_object" }
        })
    });

    if (!res.ok) throw new Error(`API Error: ${await res.text()}`);
    const data = await res.json();
    return data.choices[0].message.content;
}

// --- KAI VOICE (Web Speech API) ---
function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Parar lo anterior
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
}

// --- CORE LOGIC ---
async function handleKaiResponse(rawText) {
    console.log('Kai Response:', rawText);
    let parsed;
    try {
        parsed = JSON.parse(rawText);
    } catch (e) {
        appendMessage('kai', rawText); // Fallback to raw if not JSON
        return;
    }

    const { action, data, id, response } = parsed;

    if (response) {
        appendMessage('kai', response);
        speak(response.replace(/<[^>]*>/g, '')); // Hablar sin HTML
    }

    // --- Actions ---
    switch (action) {
        case 'create':
            await appInstance.store.addItem({
                ...data,
                id: appInstance.store.generateId(),
                fecha_creacion: new Date().toISOString()
            });
            break;
        case 'update':
            if (id) await appInstance.store.updateItem(id, data);
            break;
        case 'delete':
            if (id) await appInstance.store.deleteItem(id);
            break;
        default:
            console.log('Action not handled:', action);
    }
}

function getExpandedContext(store) {
    // Proporcionar un resumen de TODO para "memoria global"
    const items = store.items.map(i =>
        `[ID: ${i.id}] ${i.titulo} (${i.tipo}) - Estado: ${i.estado} - Tags: #${(i.etiquetas || []).join(', #')}`
    ).join('\n');

    return `
ESTADO ACTUAL DE LA APP:
Items guardados: ${store.items.length}
Lista de items:
${items}
`;
}

export function appendMessage(sender, html) {
    const container = document.getElementById('kaiMessages');
    if (!container) return;

    const div = document.createElement('div');
    div.className = `msg msg-${sender}`;
    div.innerHTML = html;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// --- VOICE INPUT ---
let recognition = null;
let isListening = false;

function toggleVoiceInput() {
    if (!('webkitSpeechRecognition' in window)) {
        alert('Tu navegador no soporta entrada de voz.');
        return;
    }

    if (!recognition) {
        recognition = new webkitSpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.onstart = () => {
            isListening = true;
            voiceBtn.classList.add('recording');
        };
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            chatInput.value = transcript;
            chatInput.focus();
        };
        recognition.onerror = () => {
            isListening = false;
            voiceBtn.classList.remove('recording');
        };
        recognition.onend = () => {
            isListening = false;
            voiceBtn.classList.remove('recording');
        };
    }

    if (isListening) recognition.stop();
    else recognition.start();
}
