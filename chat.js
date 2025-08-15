// Módulo para gestionar la funcionalidad del chat con IA
import { addItem } from './storage.js';
import { showToast } from './app.js'; // Suponiendo que showToast es exportada

// TODO: Cargar la configuración de la IA desde un archivo o variable global
const AI_CONFIG = {
    // Aquí iría la configuración de la API de Cerebras/OpenAI
    // apiKey: '...',
    // model: '...'
};

// TODO: Cargar los prompts desde los archivos de texto
let interpretationPrompt = '';
let qaPrompt = '';

// Elementos del DOM
const chatFab = document.getElementById('chat-fab');
const chatContainer = document.getElementById('chat-container');
const chatClose = document.getElementById('chat-close');
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');

/**
 * Inicializa el módulo de chat
 */
export async function initChat() {
    if (!chatFab) return; // Si el chat no existe en la página, no hacer nada

    // Cargar los prompts
    try {
        interpretationPrompt = await fetch('./interpretation-prompt.txt').then(res => res.text());
        qaPrompt = await fetch('./qa-prompt.txt').then(res => res.text());
    } catch (error) {
        console.error("Error al cargar los prompts de la IA:", error);
        // Deshabilitar el chat si no se pueden cargar los prompts
        chatFab.classList.add('hidden');
        return;
    }

    // Event Listeners
    chatFab.addEventListener('click', toggleChat);
    chatClose.addEventListener('click', toggleChat);
    chatForm.addEventListener('submit', handleFormSubmit);
    chatInput.addEventListener('input', autoResizeTextarea);
    chatInput.addEventListener('keydown', handleTextareaKeydown);

    addMessage('ia', '¡Hola! Soy tu asistente. Pídeme que cree algo o hazme una pregunta sobre tu contenido.');
}

/**
 * Muestra u oculta la ventana del chat
 */
function toggleChat() {
    chatContainer.classList.toggle('hidden');
    chatFab.classList.toggle('hidden');
    if (!chatContainer.classList.contains('hidden')) {
        chatInput.focus();
    }
}

/**
 * Gestiona el envío del formulario del chat
 * @param {Event} e
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    const userInput = chatInput.value.trim();
    if (!userInput) return;

    addMessage('user', userInput);
    chatInput.value = '';
    autoResizeTextarea(); // Resetear altura

    // Mostrar indicador de "pensando"
    showThinkingIndicator(true);

    // TODO: Aquí iría la lógica para determinar si es un comando o una pregunta
    // Por ahora, simularemos una llamada a la IA y una respuesta
    
    // Simulación de llamada a la IA
    setTimeout(() => {
        const isCommand = userInput.toLowerCase().startsWith('crea') || userInput.toLowerCase().startsWith('añade');
        
        if (isCommand) {
            handleCommand(userInput);
        } else {
            handleQuestion(userInput);
        }
        
        showThinkingIndicator(false);
    }, 1500);
}

/**
 * Gestiona los comandos para crear elementos
 * @param {string} command
 */
async function handleCommand(command) {
    // Simulación de interpretación de IA
    console.log("Procesando comando:", command);
    // En un caso real, aquí se llamaría a la API de IA con `interpretationPrompt`
    // y se recibiría un objeto JSON.
    
    // Simulación de respuesta de la IA
    const mockResponse = {
        categoria: 'idea',
        titulo: 'Probar la nueva función de chat',
        descripcion: 'El usuario ha pedido crear esto a través del chat.',
        etiquetas: ['ia', 'testing']
    };

    try {
        // await addItem(mockResponse); // Esto fallará si no se recarga la vista principal
        console.log("Item creado (simulado):", mockResponse);
        addMessage('ia', `He creado un nuevo elemento en la categoría "${mockResponse.categoria}" con el título: "${mockResponse.titulo}".`);
        showToast('Elemento creado con éxito.');
        // TODO: Se necesita una forma de refrescar la vista principal sin recargar la página
        // Por ejemplo, emitiendo un evento personalizado que app.js escuche.
        document.dispatchEvent(new CustomEvent('itemAdded'));

    } catch (error) {
        console.error("Error al guardar el item desde el chat:", error);
        addMessage('ia', 'Hubo un error al intentar crear el elemento. Por favor, inténtalo de nuevo.');
    }
}

/**
 * Gestiona las preguntas del usuario
 * @param {string} question
 */
async function handleQuestion(question) {
    // Simulación de consulta a la IA
    console.log("Procesando pregunta:", question);
    // En un caso real:
    // 1. Cargar todos los items: const allItems = await storage.loadAll();
    // 2. Formatear el prompt de QA: qaPrompt.replace('{context}', JSON.stringify(allItems)).replace('{query}', question)
    // 3. Llamar a la API de IA
    
    // Simulación de respuesta
    const mockAnswer = "He encontrado 3 proyectos activos y 5 ideas pendientes. El proyecto más reciente es 'Remodelación de la web'.";
    addMessage('ia', mockAnswer);
}


/**
 * Añade un mensaje a la ventana del chat
 * @param {'user' | 'ia'} sender
 * @param {string} text
 */
function addMessage(sender, text) {
    const messageElement = document.createElement('div');
    messageElement.className = `chat-message ${sender}`;

    const icon = document.createElement('div');
    icon.className = 'icon';
    const iconSpan = document.createElement('span');
    iconSpan.className = 'material-symbols-outlined';
    iconSpan.textContent = sender === 'user' ? 'person' : 'smart_toy';
    icon.appendChild(iconSpan);

    const content = document.createElement('div');
    content.className = 'content';
    content.textContent = text;

    messageElement.appendChild(icon);
    messageElement.appendChild(content);

    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll
}

/**
 * Muestra u oculta el indicador de "pensando" de la IA
 * @param {boolean} show
 */
function showThinkingIndicator(show) {
    let indicator = chatMessages.querySelector('.thinking');
    if (show) {
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'chat-message ia thinking';
            indicator.innerHTML = `
                <div class="icon">
                    <span class="material-symbols-outlined">smart_toy</span>
                </div>
                <div class="content">
                    <span class="dot"></span><span class="dot"></span><span class="dot"></span>
                </div>
            `;
            chatMessages.appendChild(indicator);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    } else {
        if (indicator) {
            indicator.remove();
        }
    }
}


/**
 * Ajusta la altura del textarea automáticamente
 */
function autoResizeTextarea() {
    chatInput.style.height = 'auto';
    chatInput.style.height = (chatInput.scrollHeight) + 'px';
}

/**
 * Gestiona el evento de presionar una tecla en el textarea
 * @param {KeyboardEvent} e
 */
function handleTextareaKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatForm.dispatchEvent(new Event('submit'));
    }
}

// Inicializar el chat cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initChat);