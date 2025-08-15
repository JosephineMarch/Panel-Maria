// Módulo para gestionar la funcionalidad del chat con IA
import { CEREBRAS_API_KEY } from './config.js';

// Referencia a la instancia principal de la aplicación
let appInstance = null;

// Prompts de la IA
let interpretationPrompt = '';
let qaPrompt = '';

// Elementos del DOM
let chatFab, chatContainer, chatClose, chatMinimize, chatMessages, chatForm, chatInput;

// URL del Endpoint de la API (ajustar si es necesario)
const API_ENDPOINT = 'https://api.cerebras.net/v1/chat/completions'; // Placeholder, ajustar a la URL real

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
                model: 'llama-4-scout-17b-16e-instruct', // Actualizado según la documentación
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`Error de la API: ${response.status} ${response.statusText} - ${errorBody.error.message}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;

    } catch (error) {
        console.error("Error llamando a la API de Cerebras:", error);
        throw error; // Re-lanzar para que la función que llama lo maneje
    }
}


/**
 * Inicializa el módulo de chat, recibiendo la instancia de la app.
 * @param {object} app - La instancia de la clase PanelMariaApp.
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
        interpretationPrompt = await fetch('./interpretation-prompt.txt').then(res => res.text());
        qaPrompt = await fetch('./qa-prompt.txt').then(res => res.text());
    } catch (error) {
        console.error("Error al cargar los prompts:", error);
        chatFab.classList.add('hidden');
        return;
    }

    // Event Listeners
    chatFab.addEventListener('click', toggleChat);
    chatClose.addEventListener('click', toggleChat);
    chatMinimize.addEventListener('click', toggleMinimize);
    chatForm.addEventListener('submit', handleFormSubmit);
    chatInput.addEventListener('input', autoResizeTextarea);
    chatInput.addEventListener('keydown', handleTextareaKeydown);

    addMessage('ia', '¡Hola! Estoy conectada y lista para ayudarte. Pídeme que cree algo o pregúntame sobre tu contenido.');
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const userInput = chatInput.value.trim();
    if (!userInput || !appInstance) return;

    addMessage('user', userInput);
    chatInput.value = '';
    autoResizeTextarea();
    showThinkingIndicator(true);

    try {
        // Lógica para decidir si es un comando o una pregunta
        const commandKeywords = ['crea', 'añade', 'agrega', 'idea', 'proyecto', 'logro', 'directorio', 'enlace', 'link'];
        const isCommand = commandKeywords.some(kw => userInput.toLowerCase().split(' ').some(word => word === kw));

        if (isCommand) {
            await handleCommand(userInput);
        } else {
            await handleQuestion(userInput);
        }
    } catch (error) {
        addMessage('ia', `Lo siento, ha ocurrido un error: ${error.message}`);
    } finally {
        showThinkingIndicator(false);
    }
}

async function handleCommand(text) {
    const prompt = interpretationPrompt.replace('{text}', text);
    const responseJson = await callCerebrasAPI(prompt);

    try {
        const itemData = JSON.parse(responseJson);
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
        addMessage('ia', `¡Hecho! He creado un nuevo elemento en "${newItem.categoria}".`);
        appInstance.showToast('Elemento creado con éxito por IA', 'success');
        appInstance.switchCategory(newItem.categoria);

    } catch (error) {
        console.error("Error al procesar la respuesta JSON de la IA:", error);
        addMessage('ia', "La IA me dio una respuesta en un formato inesperado. No pude crear el bloque.");
    }
}

async function handleQuestion(question) {
    const context = JSON.stringify(appInstance.items, null, 2);
    const prompt = qaPrompt.replace('{context}', context).replace('{query}', question);
    const responseText = await callCerebrasAPI(prompt);
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
