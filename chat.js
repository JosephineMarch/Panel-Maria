// Módulo para gestionar la funcionalidad del chat con IA - KAI
import { CEREBRAS_API_KEY } from './config.js';

let appInstance = null;
let chatMessages, chatForm, chatInput, voiceBtn;

// Configuración de la API
const API_ENDPOINT = 'https://api.cerebras.ai/v1/chat/completions';
const API_MODEL = 'gpt-oss-120b'; // o el modelo preferido en Cerebras

// KAI SYSTEM PROMPT
const KAI_SYSTEM_PROMPT = `
Eres Kai, un asistente IA diseñado para personas con TDAH.
Tu personalidad es: Alegre, ingeniosa, empática y motivadora.
NO eres un robot aburrido. Usas emojis ⚡, hablas claro y vas al grano.
Tu misión principal es ORGANIZAR el caos.

Cuando el usuario te da un input CASUAL (nota rápida, idea, tarea):
1. NO respondas con charla, SALVO que te pregunten directamente.
2. Tu objetivo es ESTRUCTURAR ese input en un JSON válido.
3. Si es una URL, extráela. Si es una lista, crea tareas.
4. Asigna CURIOSAMENTE una categoría: "directorio" (recursos), "ideas", "proyectos" (planes pasos), "logros" (algo hecho).
5. Genera tags automáticos útiles.

FORMATO DE RESPUESTA JSON OBLIGATORIO para creación:
{
  "intent": "create",
  "data": {
    "categoria": "string",
    "titulo": "string",
    "descripcion": "string",
    "tareas": [{"titulo": "string", "completado": false}],
    "url": "string",
    "etiquetas": ["string"]
  }
}

Si el usuario te SALUDA o PREGUNTA ("Hola Kai", "¿Cómo...?", "Ayuda"):
{
  "intent": "chat",
  "response": "Tu respuesta útil y con personalidad aquí."
}
`;

async function callCerebrasAPI(messages) {
    if (!CEREBRAS_API_KEY || CEREBRAS_API_KEY.includes('YOUR_')) {
        throw new Error('API Key no configurada');
    }

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CEREBRAS_API_KEY}` },
            body: JSON.stringify({
                model: API_MODEL,
                messages: messages,
                temperature: 0.7,
                max_tokens: 1024,
                response_format: { type: "json_object" } // Intentar forzar JSON si el modelo lo permite, sino confiar en el prompt
            })
        });

        if (!response.ok) throw new Error(await response.text());
        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
}

export async function initChat(app) {
    appInstance = app;

    // Elementos del DOM (Nuevos IDs según index.html actualizado)
    chatMessages = document.querySelector('.chat-messages-area');
    chatForm = document.getElementById('chat-form');
    chatInput = document.getElementById('chat-input');
    voiceBtn = document.getElementById('voiceBtn');

    if (!chatForm) return;

    chatForm.addEventListener('submit', handleFormSubmit);

    if (voiceBtn) {
        voiceBtn.addEventListener('click', toggleVoiceInput);
    }

    // Mensaje de bienvenida si está vacío
    if (chatMessages && chatMessages.children.length === 0) {
        addMessage('ia', '¡Epa! Soy Kai ⚡. ¿Qué caos vamos a dominar hoy? Suéltalo o pregunta lo que quieras.');
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const userInput = chatInput.value.trim();
    if (!userInput) return;

    // 1. Mostrar mensaje usuario
    addMessage('user', userInput);
    chatInput.value = '';
    chatInput.style.height = 'auto'; // Reset height

    // 2. Determinar Modo (Captura Rápida vs Chat)
    // Lógica simple: Si empieza por "Kai", "Hola", o termina en "?", es chat.
    // Si no, es captura rápida.
    const isChatRequest = /^(ka|hola|oye|ayuda)/i.test(userInput) || /\?$/.test(userInput);

    showThinkingIndicator(true);

    try {
        const messages = [
            { role: "system", content: KAI_SYSTEM_PROMPT },
            { role: "user", content: userInput }
        ];

        // Si es captura rápida, forzamos al sistema a pensar en modo estructura
        if (!isChatRequest) {
            messages.push({ role: "system", content: "El usuario parece querer GUARDAR esto. Genera solo el JSON de creación." });
        }

        const responseText = await callCerebrasAPI(messages);
        let responseObj;

        try {
            responseObj = JSON.parse(responseText);
        } catch (e) {
            // Si falla el parseo JSON, tratamos todo como respuesta texto
            responseObj = { intent: "chat", response: responseText };
        }

        if (responseObj.intent === 'create' || (responseObj.data && !responseObj.response)) {
            // Modo Captura: Guardar silenciosamente y notificar
            if (responseObj.data) {
                await handleCreate(responseObj.data);
            }
        } else {
            // Modo Chat
            addMessage('ia', responseObj.response || responseText);
        }

    } catch (error) {
        addMessage('ia', 'Ups, me tropecé con un cable. 😵 ' + error.message);
    } finally {
        showThinkingIndicator(false);
    }
}

async function handleCreate(itemData) {
    const newItem = {
        ...itemData,
        id: window.storage.generateId(),
        fecha_creacion: new Date().toISOString(),
        fecha_finalizacion: null,
        anclado: false,
        tareas: itemData.tareas || [],
        etiquetas: itemData.etiquetas || [],
        meta: { source: 'kai-ia' }
    };

    // Asegurar categoría válida
    const validCats = ['directorio', 'ideas', 'proyectos', 'logros'];
    if (!validCats.includes(newItem.categoria)) newItem.categoria = 'ideas'; // Fallback

    await appInstance.performItemUpdates([{ type: 'add', data: newItem }]);

    // Feedback visual sutil (Toast) en lugar de mensaje de chat
    appInstance.showToast(`Guardado en ${newItem.categoria} ⚡`, 'success');

    // Opcional: Si estamos en la categoría correcta, se verá al instante.
    // Si no, podemos sugerir cambiar o hacerlo automático.
    if (appInstance.currentCategory !== 'todos' && appInstance.currentCategory !== newItem.categoria) {
        // No cambiamos categoría forzosamente para no marear, pero notificamos.
    }
}

function addMessage(sender, text) {
    if (!chatMessages) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${sender}`;
    msgDiv.innerHTML = `
        <div class="icon">${sender === 'ia' ? '⚡' : '👤'}</div>
        <div class="content">${formatText(text)}</div>
    `;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatText(text) {
    // Simple formatter
    return text.replace(/\n/g, '<br>');
}

function showThinkingIndicator(show) {
    const existing = chatMessages.querySelector('.thinking');
    if (show && !existing) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-message ia thinking';
        msgDiv.innerHTML = `<div class="icon">⚡</div><div class="content">...</div>`;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } else if (!show && existing) {
        existing.remove();
    }
}

// VOICE INPUT (Web Speech API)
let recognition;
let isListening = false;

function toggleVoiceInput() {
    if (!('webkitSpeechRecognition' in window)) {
        alert('Tu navegador no soporta entrada de voz. Prueba Chrome.');
        return;
    }

    if (isListening) {
        recognition.stop();
        return;
    }

    recognition = new webkitSpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
        isListening = true;
        voiceBtn.classList.add('listening');
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        chatInput.value = transcript;
        // Auto-submit si se desea, o dejar que el usuario revise
        // chatForm.dispatchEvent(new Event('submit'));
    };

    recognition.onerror = (event) => {
        console.error('Voice error', event.error);
        isListening = false;
        voiceBtn.classList.remove('listening');
    };

    recognition.onend = () => {
        isListening = false;
        voiceBtn.classList.remove('listening');
    };

    recognition.start();
}
