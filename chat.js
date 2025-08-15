// Módulo para gestionar la funcionalidad del chat con IA (Arquitectura de Prompt Unificado)
import { CEREBRAS_API_KEY } from './config.js';

// Referencia a la instancia principal de la aplicación
let appInstance = null;

// Contenido del prompt principal
let mainPrompt = '';

// Elementos del DOM
let chatFab, chatContainer, chatClose, chatMinimize, chatMessages, chatForm, chatInput;

// Configuración de la API
const API_ENDPOINT = 'https://api.cerebras.ai/v1/chat/completions';
const API_MODEL = 'gpt-oss-120b';

/**
 * Llama a la API de Cerebras con un prompt específico.
 * @param {string} prompt - El prompt completo a enviar.
 * @returns {Promise<string>} - La respuesta de texto de la IA.
 */
async function callCerebrasAPI(prompt) {
    if (!CEREBRAS_API_KEY || CEREBRAS_API_KEY === 'YOUR_CEREBRAS_API_KEY_HERE') {
        throw new Error('La clave de API de Cerebras no está configurada en config.js');
    }

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CEREBRAS_API_KEY}`
            },
            body: JSON.stringify({
                model: API_MODEL,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 2048,
                stream: false
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Error de la API: ${response.status} - ${errorBody}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;

    } catch (error) {
        console.error("Error llamando a la API de Cerebras:", error);
        throw error;
    }
}

/**
 * Inicializa el módulo de chat.
 * @param {object} app - La instancia de PanelMariaApp.
 */
export async function initChat(app) {
    appInstance = app;
    
    // Asignar elementos del DOM
    chatFab = document.getElementById('chat-fab');
    chatContainer = document.getElementById('chat-container');
    chatClose = document.getElementById('chat-close');
    chatMinimize = document.getElementById('chat-minimize');
    chatMessages = document.getElementById('chat-messages');
    chatForm = document.getElementById('chat-form');
    chatInput = document.getElementById('chat-input');

    if (!chatFab) return;

    try {
        mainPrompt = await fetch('./main-prompt.txt').then(res => res.text());
    } catch (error) {
        console.error("Error fatal: no se pudo cargar main-prompt.txt", error);
        chatFab.classList.add('hidden');
        return;
    }

    // Listeners
    chatFab.addEventListener('click', toggleChat);
    chatClose.addEventListener('click', toggleChat);
    chatMinimize.addEventListener('click', toggleMinimize);
    chatForm.addEventListener('submit', handleFormSubmit);
    chatInput.addEventListener('input', autoResizeTextarea);
    chatInput.addEventListener('keydown', handleTextareaKeydown);

    addMessage('ia', '¡Hola! Soy María AI. ¿Qué te gustaría organizar o crear hoy?');
}

/**
 * Gestiona el envío de un mensaje del usuario.
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    const userInput = chatInput.value.trim();
    if (!userInput || !appInstance) return;

    addMessage('user', userInput);
    chatInput.value = '';
    autoResizeTextarea();
    showThinkingIndicator(true);

    try {
        // Optimización: Solo enviar el contexto de datos si no es un comando de creación obvio.
        const commandKeywords = ['crea', 'añade', 'agrega', 'idea', 'proyecto', 'logro', 'directorio'];
        const isLikelyCommand = commandKeywords.some(kw => userInput.toLowerCase().startsWith(kw));
        
        let context = '[]'; // Por defecto, no se envía contexto para aligerar la petición.
        if (!isLikelyCommand) {
            // Si no es un comando de creación, es probable que sea una pregunta, así que enviamos el contexto.
            context = JSON.stringify(appInstance.items, null, 2);
        }

        const prompt = mainPrompt.replace('{context}', context).replace('{text}', userInput);

        const responseJsonString = await callCerebrasAPI(prompt);
        const responseObject = JSON.parse(responseJsonString);

        switch (responseObject.intent) {
            case 'create':
                handleCreate(responseObject.data);
                break;
            case 'answer':
                handleAnswer(responseObject.response);
                break;
            default:
                // Si la IA devuelve una intención desconocida, la mostramos como respuesta de chat.
                handleAnswer(responseJsonString);
                console.warn('Intención no reconocida, mostrando JSON crudo:', responseObject);
        }

    } catch (error) {
        console.error("Error en el ciclo del chat:", error);
        addMessage('ia', `Lo siento, ha ocurrido un error: ${error.message}`);
    } finally {
        showThinkingIndicator(false);
    }
}

/**
 * Maneja la creación de un nuevo bloque de datos.
 * @param {object} itemData - El objeto de datos del bloque a crear.
 */
async function handleCreate(itemData) {
    const newItem = {
        ...itemData,
        id: window.storage.generateId(),
        fecha_creacion: new Date().toISOString(),
        fecha_finalizacion: null,
        anclado: itemData.anclado || false,
        tareas: itemData.tareas || [],
        meta: { source: 'chat-ia' }
    };

    await appInstance.performItemUpdates([{ type: 'add', data: newItem }]);
    addMessage('ia', `¡Listo! He creado un nuevo elemento en la categoría "${newItem.categoria}".`);
    appInstance.showToast('Elemento creado con éxito por IA', 'success');
    appInstance.switchCategory(newItem.categoria);
}

/**
 * Maneja una respuesta conversacional de la IA.
 * @param {string} responseText - El texto de la respuesta.
 */
function handleAnswer(responseText) {
    addMessage('ia', responseText);
}


// --- Funciones de UI (sin cambios) ---

function toggleChat() {
    chatContainer.classList.toggle('hidden');
    chatFab.classList.toggle('hidden');
    if (!chatContainer.classList.contains('hidden')) {
        chatContainer.classList.remove('is-minimized');
        chatInput.focus();
    }
}

function toggleMinimize() {
    chatContainer.classList.toggle('is-minimized');
    const icon = chatMinimize.querySelector('.material-symbols-outlined');
    if (chatContainer.classList.contains('is-minimized')) {
        icon.textContent = 'expand_less';
        chatMinimize.title = 'Maximizar';
    } else {
        icon.textContent = 'expand_more';
        chatMinimize.title = 'Minimizar';
    }
}

function addMessage(sender, text) {
    const messageElement = document.createElement('div');
    messageElement.className = `chat-message ${sender}`;
    messageElement.innerHTML = `
        <div class="icon"><span class="material-symbols-outlined">${sender === 'user' ? 'person' : 'smart_toy'}</span></div>
        <div class="content"></div>`;
    messageElement.querySelector('.content').textContent = text;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showThinkingIndicator(show) {
    let indicator = chatMessages.querySelector('.thinking');
    if (show) {
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'chat-message ia thinking';
            indicator.innerHTML = `<div class="icon"><span class="material-symbols-outlined">smart_toy</span></div><div class="content"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>`;
            chatMessages.appendChild(indicator);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    } else {
        if (indicator) indicator.remove();
    }
}

function autoResizeTextarea() {
    chatInput.style.height = 'auto';
    chatInput.style.height = (chatInput.scrollHeight) + 'px';
}

function handleTextareaKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatForm.dispatchEvent(new Event('submit'));
    }
}
