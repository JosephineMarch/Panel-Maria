// Módulo para gestionar la funcionalidad del chat con IA

// Referencia a la instancia principal de la aplicación
let appInstance = null;

// Prompts de la IA
let interpretationPrompt = '';
let qaPrompt = '';

// Elementos del DOM
let chatFab, chatContainer, chatClose, chatMessages, chatForm, chatInput;

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
    chatMessages = document.getElementById('chat-messages');
    chatForm = document.getElementById('chat-form');
    chatInput = document.getElementById('chat-input');

    if (!chatFab) return; // Salir si los elementos del chat no existen

    // Cargar los prompts
    try {
        interpretationPrompt = await fetch('./interpretation-prompt.txt').then(res => res.text());
        qaPrompt = await fetch('./qa-prompt.txt').then(res => res.text());
    } catch (error) {
        console.error("Error al cargar los prompts de la IA:", error);
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

function toggleChat() {
    chatContainer.classList.toggle('hidden');
    chatFab.classList.toggle('hidden');
    if (!chatContainer.classList.contains('hidden')) {
        chatInput.focus();
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const userInput = chatInput.value.trim();
    if (!userInput || !appInstance) return;

    addMessage('user', userInput);
    chatInput.value = '';
    autoResizeTextarea();

    showThinkingIndicator(true);

    // Simulación de la lógica de IA
    // En una implementación real, aquí se haría una llamada a un endpoint
    // que determine la intención (comando vs. pregunta).
    setTimeout(() => {
        const commandKeywords = ['crea', 'añade', 'agrega', 'idea', 'proyecto', 'logro', 'directorio'];
        const isCommand = commandKeywords.some(kw => userInput.toLowerCase().includes(kw));

        if (isCommand) {
            handleCommand(userInput);
        } else {
            handleQuestion(userInput);
        }

        showThinkingIndicator(false);
    }, 1000);
}

async function handleCommand(command) {
    // Simulación de la interpretación de la IA. 
    // En un caso real, se enviaría `command` y `interpretationPrompt` a la API.
    console.log("Procesando comando:", command);

    // Simulación de una respuesta JSON de la IA
    const mockResponse = {
        categoria: 'idea',
        titulo: `Idea generada por IA: ${command.substring(0, 20)}...`,
        descripcion: command,
        etiquetas: ['ia', 'chat']
    };

    const newItem = {
        ...mockResponse,
        id: appInstance.storage.generateId(), // Usar el generador de IDs del storage
        fecha_creacion: new Date().toISOString(),
        fecha_finalizacion: null,
        anclado: false,
        tareas: [],
        meta: { source: 'chat-ia' }
    };

    try {
        await appInstance.performItemUpdates([{ type: 'add', data: newItem }]);
        addMessage('ia', `He creado un nuevo elemento en "${newItem.categoria}" con el título: "${newItem.titulo}".`);
        appInstance.showToast('Elemento creado con éxito por IA', 'success');
        appInstance.switchCategory(newItem.categoria);
    } catch (error) {
        console.error("Error al guardar el item desde el chat:", error);
        addMessage('ia', 'Hubo un error al intentar crear el elemento.');
        appInstance.showToast('Error al crear el elemento', 'error');
    }
}

async function handleQuestion(question) {
    // Simulación de consulta a la IA.
    console.log("Procesando pregunta:", question);

    // 1. Obtener el contexto (los datos del usuario)
    const context = JSON.stringify(appInstance.items, null, 2);

    // 2. Formatear el prompt (esto se haría en el backend en un caso real)
    const fullPrompt = qaPrompt.replace('{context}', context).replace('{query}', question);
    console.log("Enviando a IA (simulado):", fullPrompt);

    // 3. Simular respuesta de la IA
    const mockAnswer = "Basado en tus datos, tienes 5 proyectos en total. El más reciente es 'Remodelación de la web'. ¿Necesitas más detalles?";
    addMessage('ia', mockAnswer);
}

function addMessage(sender, text) {
    const messageElement = document.createElement('div');
    messageElement.className = `chat-message ${sender}`;

    messageElement.innerHTML = `
        <div class="icon">
            <span class="material-symbols-outlined">${sender === 'user' ? 'person' : 'smart_toy'}</span>
        </div>
        <div class="content"></div>
    `;
    messageElement.querySelector('.content').textContent = text; // Usar textContent para seguridad

    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

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
