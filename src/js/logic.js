/**
 * KAI - Lógica Principal del Controlador
 * ======================================
 * 
 * Este archivo contiene el controlador principal de la aplicación.
 * Organizado en las siguientes secciones:
 * 
 * SECCIÓN 1: Utilidades (lines 9-30)
 *   - formatDeadlineForDB()
 *   - formatDeadlineForDisplay()
 * 
 * SECCIÓN 2: KaiController - Inicialización (lines 31-120)
 *   - constructor(), init()
 * 
 * SECCIÓN 3: Alarmas (lines 151-380)
 *   - startAlarmChecker(), scheduleAllAlarms()
 *   - scheduleTriggerNotification(), checkAlarms()
 *   - showAlarmNotification(), playAlarmSound()
 * 
 * SECCIÓN 4: CRUD de Items (lines 381-800)
 *   - crearItem(), editarItem(), borrarItem()
 *   - loadItems(), finishItem(), toggleAnclado()
 *   - updateItemInline(), saveInlineEdit()
 * 
 * SECCIÓN 5: IA / Kai (lines 801-950)
 *   - processWithKai(), executeKaiAction()
 *   - crearAlarma(), detectarTagsYAlarmas()
 * 
 * SECCIÓN 6: Eventos y Handlers (lines 951-1100)
 *   - bindEvents(), handleNavigation()
 *   - setupShareTarget()
 * 
 * SECCIÓN 7: Utilidades de Vista (lines 1101-1123)
 *   - getItemActions(), renderQuickActions()
 */

import { supabase } from './supabase.js';
import { data } from './data.js';
import { ui } from './ui.js';
import { auth } from './auth.js';
import { ai } from './ai.js';
import { cerebras } from './cerebras.js';
import { requestFCMToken } from './firebase.js';

function formatDeadlineForDB(deadline) {
    if (!deadline) return null;
    if (typeof deadline === 'number') {
        return new Date(deadline).toISOString();
    }
    if (typeof deadline === 'string') {
        const parsed = parseInt(deadline);
        if (!isNaN(parsed)) {
            return new Date(parsed).toISOString();
        }
        return deadline;
    }
    return null;
}

function formatDeadlineForDisplay(deadline) {
    if (!deadline) return null;
    const d = new Date(typeof deadline === 'number' ? deadline : deadline);
    if (isNaN(d.getTime())) return null;
    return d;
}

class KaiController {
    constructor() {
        this.currentUser = null;
        this.currentParentId = null;
        this.currentCategory = 'all';
        this.currentTag = null;
        this.breadcrumbPath = [];
        this.init();
    }

    async init() {
        ui.init();
        this.bindEvents();
        this.startAlarmChecker();
        this.setupRealtimeSubscription();

        try {
            this.currentUser = await auth.init();
            if (this.currentUser) {
                ui.updateUserInfo(this.currentUser);
                await this.loadItems();
            } else {
                // No cargar demo automáticamente - esperar a que usuario lo genere
                // console.log('Sin sesión - esperando generación de demo...');
                this.loadEmptyState();
            }
        } catch (error) {
            console.error('Error en inicialización:', error);
            this.loadEmptyState();
        }

        ai.init();
    }

    loadEmptyState() {
        // Mostrar estado vacío
        ui.render([], false);
        const container = ui.elements.container();
        if (container) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <div class="text-6xl mb-4">🧠</div>
                    <h2 class="text-2xl font-bold text-ink mb-2">Bienvenido a KAI</h2>
                    <p class="text-ink/60 mb-6">Tu segundo cerebro está listo para usar. Inicia sesión para guardar tus pensamientos.</p>
                </div>
            `;
        }
    }

    startAlarmChecker() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        this.scheduleAllAlarms();
        this.checkAlarms();

        setInterval(() => {
            this.scheduleAllAlarms();
            this.checkAlarms();
        }, 30000);
    }

    async scheduleAllAlarms() {
        try {
            let items;

            if (this.isDemoMode) {
                items = JSON.parse(localStorage.getItem('kaiDemoItems')) || [];
            } else if (this.currentUser) {
                items = await data.getItems({});
            } else {
                return;
            }

            const scheduledIds = JSON.parse(localStorage.getItem('scheduledAlarms') || '[]');
            const now = Date.now();

            for (const item of items) {
                if (!item.deadline || scheduledIds.includes(item.id)) continue;

                let deadlineTime;
                if (typeof item.deadline === 'number') {
                    deadlineTime = item.deadline;
                } else if (typeof item.deadline === 'string') {
                    deadlineTime = new Date(item.deadline).getTime();
                } else {
                    continue;
                }

                const reminderTime = deadlineTime - 60000;

                if (deadlineTime > now && deadlineTime - now < 7 * 24 * 60 * 60 * 1000) {
                    await this.scheduleTriggerNotification(item, reminderTime, deadlineTime);
                    scheduledIds.push(item.id);
                }
            }

            localStorage.setItem('scheduledAlarms', JSON.stringify(scheduledIds));
        } catch (error) {
            console.error('Error scheduling alarms:', error);
        }
    }

    async scheduleTriggerNotification(item, reminderTime, deadlineTime) {
        // En un dispositivo móvil, esto se enviaría vía FCM.
        // Aquí registramos el log para depuración.
        console.log(`🔔 Alarma programada: ${item.content} para las ${new Date(deadlineTime).toLocaleTimeString()}`);
    }


    async checkAlarms() {
        try {
            let items;

            if (this.isDemoMode) {
                items = JSON.parse(localStorage.getItem('kaiDemoItems')) || [];
            } else if (this.currentUser) {
                items = await data.getItems({});
            } else {
                return;
            }

            const now = Date.now();
            const triggeredIds = JSON.parse(localStorage.getItem('triggeredAlarms') || '[]');
            const alarmTimestamps = JSON.parse(localStorage.getItem('alarmTimestamps') || '{}');

            const validTriggeredIds = [];
            for (const id of triggeredIds) {
                const lastTriggered = alarmTimestamps[id] || 0;
                if (now - lastTriggered < 24 * 60 * 60 * 1000) {
                    validTriggeredIds.push(id);
                }
            }
            localStorage.setItem('triggeredAlarms', JSON.stringify(validTriggeredIds));

            for (const item of items) {
                if (!item.deadline) continue;

                let deadlineTime;
                if (typeof item.deadline === 'number') {
                    deadlineTime = item.deadline;
                } else if (typeof item.deadline === 'string') {
                    deadlineTime = new Date(item.deadline).getTime();
                } else {
                    continue;
                }

                if (deadlineTime <= now - 60000) {
                    continue;
                }

                if (!validTriggeredIds.includes(item.id)) {
                    const timeDiff = deadlineTime - now;

                    if (timeDiff <= 0) {
                        validTriggeredIds.push(item.id);
                        alarmTimestamps[item.id] = now;
                        localStorage.setItem('alarmTimestamps', JSON.stringify(alarmTimestamps));
                        localStorage.setItem('triggeredAlarms', JSON.stringify(validTriggeredIds));

                        this.triggerAlarm(item);
                    }
                }
            }
        } catch (error) {
            console.error('Error checking alarms:', error);
        }
    }

    setupRealtimeSubscription() {
        if (this.isDemoMode) return;

        let refreshTimeout;
        supabase
            .channel('public:items')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => {
                console.log('🔄 Cambio detectado en DB, programando recarga silenciosa...');
                clearTimeout(refreshTimeout);
                refreshTimeout = setTimeout(() => this.loadItems(true), 1000); // Recarga silenciosa con debounce
            })
            .subscribe();
    }

    triggerAlarm(item) {
        console.log(`⏰ Ejecutando alarma para: ${item.content}`);
        ui.showNotification(`⏰ ¡Hora de: ${item.content}!`, 'warning');

        try {
            // Sonido de campana suave
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.volume = 0.7;
            audio.play().catch(e => {
                console.warn('Audio play bloqueado. Se requiere interacción previa.', e);
                // Fallback: vibración si está disponible
                if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
            });
        } catch (err) {
            console.error('Error al reproducir audio:', err);
        }

        if (Notification.permission === 'granted') {
            new Notification('⏰ KAI: Tienes un pendiente', {
                body: item.content,
                icon: './src/assets/icon-192.png',
                tag: item.id,
                requireInteraction: true
            });
        }
    }

    bindEvents() {
        // --- Datos (Import/Export) ---
        document.getElementById('btn-export')?.addEventListener('click', () => this.handleExport());
        document.getElementById('btn-import')?.addEventListener('click', () => {
            document.getElementById('import-file')?.click();
        });
        document.getElementById('import-file')?.addEventListener('change', (e) => this.handleImport(e));

        // --- Entradas Principales ---
        ui.elements.editForm()?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEdit();
        });

        document.getElementById('btn-submit')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        ui.elements.inputMain()?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleSubmit();
            }
        });

        // --- Share Target Event ---
        window.addEventListener('kai:add-item', async (e) => {
            const { type, content, url, parent_id } = e.detail;
            try {
                await data.createItem({
                    type: type,
                    content: content,
                    url: url || '',
                    parent_id: parent_id || null
                });
                ui.showNotification(`¡Guardado en ${parent_id ? 'el proyecto' : type}! ✨`, 'success');
                await this.loadItems();
            } catch (error) {
                console.error('Error adding shared item:', error);
                ui.showNotification('No pude guardar el elemento compartido.', 'error');
            }
        });

        // --- Navegación & Categorías (Tipos) ---
        document.querySelectorAll('.btn-category').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleCategoryClick(e.target);
            });
        });

        // --- Navegación & Tags ---
        document.querySelectorAll('.btn-tag').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleCategoryClick(e.target);
            });
        });

        // --- Modals & Sidebar ---
        document.getElementById('btn-user')?.addEventListener('click', () => ui.toggleSidebar());
        document.getElementById('btn-close-sidebar')?.addEventListener('click', () => ui.closeSidebar());
        document.getElementById('sidebar-overlay')?.addEventListener('click', () => ui.closeSidebar());
        document.getElementById('btn-google')?.addEventListener('click', () => this.handleGoogleLogin());
        document.getElementById('btn-logout')?.addEventListener('click', () => this.handleLogout());
        document.getElementById('btn-add-task')?.addEventListener('click', () => ui.addTaskToModal());

        // Tag suggestions
        document.querySelectorAll('.tag-suggestion').forEach(tag => {
            tag.addEventListener('click', () => {
                const input = document.getElementById('edit-tags');
                const current = input.value || '';
                const newTag = tag.dataset.tag;
                input.value = current ? current + ', ' + newTag : newTag;
            });
        });

        // Voz e Interfaz
        document.getElementById('btn-voice-footer')?.addEventListener('click', () => this.toggleVoiceInput());
        document.getElementById('btn-close-voice')?.addEventListener('click', () => this.stopVoiceInput());
        document.getElementById('btn-stop-voice')?.addEventListener('click', () => this.stopVoiceInput());

        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => ui.toggleModal(false));
        });

        // Kai Chat
        ui.elements.kaiAvatarContainer()?.addEventListener('click', () => ui.toggleKaiChat());
        document.getElementById('kai-chat-back')?.addEventListener('click', () => ui.toggleKaiChat(false));
        document.getElementById('kai-chat-minimize')?.addEventListener('click', () => ui.toggleKaiChat(false));
        ui.elements.kaiChatSend()?.addEventListener('click', () => this.handleKaiChat());
        ui.elements.kaiChatInput()?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleKaiChat();
        });

        // --- Delegación de Items (Stickers) ---
        ui.elements.container()?.addEventListener('click', async (e) => {
            const finishBtn = e.target.closest('.action-finish');
            const deleteBtn = e.target.closest('.action-delete');
            const openBtn = e.target.closest('.action-open');
            const pinBtn = e.target.closest('.action-pin');
            const editBtn = e.target.closest('.action-edit');
            const taskCheckbox = e.target.closest('.timeline-task-checkbox');

            if (taskCheckbox) {
                e.stopPropagation();
                await this.toggleTimelineTask(taskCheckbox.dataset.id, parseInt(taskCheckbox.dataset.index), taskCheckbox.checked);
            } else if (finishBtn) {
                e.stopPropagation();
                this.finishItem(finishBtn.dataset.id);
            } else if (deleteBtn) {
                e.stopPropagation();
                if (confirm('¿Borrar este recuerdo?')) this.deleteItem(deleteBtn.dataset.id);
            } else if (openBtn) {
                e.stopPropagation();
                this.openProject(openBtn.dataset.id);
            } else if (pinBtn) {
                e.stopPropagation();
                this.togglePin(pinBtn.dataset.id);
            } else if (editBtn) {
                e.stopPropagation();
                this.openEditModal(editBtn.dataset.id);
            }
        });

        // --- Auth Listeners ---
        window.addEventListener('auth-SIGNED_IN', async () => {
            this.currentUser = await auth.getUser();
            if (this.currentUser) {
                ui.updateUserInfo(this.currentUser);
                await this.loadItems();
            }
        });

        window.addEventListener('auth-SIGNED_OUT', () => {
            this.currentUser = null;
            ui.updateUserInfo(null);
            this.goHome();
        });

        window.addEventListener('voice-result', (e) => {
            const input = ui.elements.inputMain();
            if (input) input.value = e.detail.transcript;
            this.stopVoiceInput();
        });
    }

    async handleExport() {
        try {
            const items = await data.getItems({});
            
            const exportData = {
                app: 'Panel-Maria-KAI',
                version: '1.0.0',
                date: new Date().toISOString(),
                items: items
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `kai-backup-${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            ui.showNotification('✅ Exportación completada', 'success');
        } catch (e) {
            console.error('Export error:', e);
            ui.showNotification('❌ Error al exportar', 'error');
        }
    }

    async handleImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                if (importedData.app !== 'Panel-Maria-KAI' || !Array.isArray(importedData.items)) {
                    throw new Error('Formato de archivo inválido');
                }

                if (confirm(`Se importarán ${importedData.items.length} elementos. ¿Deseas continuar?`)) {
                    // En producción, esto debería insertar en Supabase uno por uno o en lote
                    for (const item of importedData.items) {
                        delete item.id; // Evitar conflictos de UUID
                        delete item.created_at;
                        await data.createItem(item);
                    }
                    ui.showNotification('✅ Importación exitosa!', 'success');
                    this.loadItems();
                }
            } catch (err) {
                console.error('Import error:', err);
                ui.showNotification('❌ El archivo no es un backup válido de KAI', 'error');
            }
        };
        reader.readAsText(file);
    }

    // --- LÓGICA DE NEGOCIO ---

    async parseIntentWithAI(content) {
        try {
            const prompt = `Analiza este texto y determina qué tipo de elemento crear y qué tags agregar.

Texto: "${content}"

Responde SOLO con JSON, sin otro texto:
{
  "type": "nota" | "tarea" | "proyecto" | "directorio",
  "tags": ["salud"] | ["emocion"] | ["logro"] | [],
  "reason": "explicación corta de por qué elegiste ese tipo"
}

REGLAS:
- type: "tarea" si dice "tengo que", "necesito", "pendiente", "no olvidar", verbos en futuro
- type: "proyecto" si dice "proyecto", "iniciar", "vamos a hacer algo grande"
- type: "directorio" si menciona videos, enlaces, links, youtube, etc
- type: "nota" para todo lo demás
- tags: incluye "salud" si menciona dolor, enfermedad, síntoma, médico, etc
- tags: incluye "emocion" si menciona cómo se siente (triste, feliz, ansiosa, etc)
- tags: incluye "logro" si menciona que logró, terminó, completó, etc
- tags puede estar vacío si no aplica`;

            const { cerebras } = await import('./cerebras.js');
            const response = await cerebras.ask(prompt);

            let parsed = { type: 'nota', tags: [] };

            if (response.response) {
                try {
                    const jsonMatch = response.response.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        parsed = JSON.parse(jsonMatch[0]);
                    }
                } catch (e) {
                    console.log('Error parsing AI response, using default');
                }
            }

            return {
                type: parsed.type || 'nota',
                tags: parsed.tags || []
            };
        } catch (error) {
            console.error('Error parsing with AI:', error);
            return { type: 'nota', tags: [] };
        }
    }

    // --- ANÁLISIS OFFLINE (sin IA) ---
    parseInputOffline(content) {
        const text = content.toLowerCase().trim();

        // Detectar tipo por palabra clave
        let type = 'nota';
        let tareas = [];

        // Detectar formato "tarea título, item a, b, c" o "tarea título item a, b, c"
        // Ejemplo: "tarea que hare hoy, item 1, 2, 3" o "tarea lavar platos item comprar leche, pagar luz"
        const itemMatchWithTitle = content.match(/^tarea\s+(.+?)(?:,\s*|\s+)item\s+(.+)$/i);

        if (itemMatchWithTitle) {
            const titulo = itemMatchWithTitle[1].trim();
            const itemsText = itemMatchWithTitle[2];
            tareas = itemsText.split(',').map(s => s.trim()).filter(s => s.length > 0);
            tareas = tareas.map(titulo => ({ titulo, completado: false }));
            return {
                type: 'tarea',
                content: titulo,
                tags: [],
                items: tareas,
                hasDeadline: false
            };
        }

        // Detectar solo "item a, b, c" (sin título antes)
        const onlyItemsMatch = content.match(/^item\s+(.+)$/i);
        if (onlyItemsMatch) {
            const itemsText = onlyItemsMatch[1];
            tareas = itemsText.split(',').map(s => s.trim()).filter(s => s.length > 0);
            tareas = tareas.map(titulo => ({ titulo, completado: false }));
            return {
                type: 'tarea',
                content: '',
                tags: [],
                items: tareas,
                hasDeadline: false
            };
        }

        // Orden importa: alarma primero porque puede combinarse con tarea
        if (text.includes('alarma') || text.includes('recordatorio') || text.includes('avísame') || text.includes('recuérdame')) {
            type = 'tarea';
        }
        if (text.startsWith('tarea') || text.includes('tengo que') || text.includes('necesito') || text.includes('pendiente')) {
            type = 'tarea';
        }
        if (text.startsWith('proyecto') || text.includes('proyecto')) {
            type = 'proyecto';
        }
        if (text.startsWith('enlace') || text.includes('enlace') || text.startsWith('link') || text.includes(' youtube') || text.includes('http')) {
            type = 'directorio';
        }

        // Detectar tags por palabra clave
        const tags = [];
        if (text.includes('logro') || text.includes('logré') || text.includes('completé') || text.includes('terminé')) {
            tags.push('logro');
        }
        if (text.includes('salud') || text.includes('dolor') || text.includes('enfermo') || text.includes('médico')) {
            tags.push('salud');
        }
        if (text.includes('emocion') || text.includes('emoción') || text.includes('triste') || text.includes('feliz')) {
            tags.push('emocion');
        }

        // Limpiar el contenido (quitar las palabras clave del inicio)
        let mainContent = content;
        if (type === 'tarea') {
            mainContent = content.replace(/^tarea\s*/i, '').trim();
        } else if (type === 'proyecto') {
            mainContent = content.replace(/^proyecto\s*/i, '').trim();
        } else if (type === 'directorio') {
            mainContent = content.replace(/^(enlace|link)\s*/i, '').trim();
        } else if (type === 'tarea' && text.includes('alarma')) {
            mainContent = content.replace(/^alarma\s*/i, '').replace(/recordatorio\s*/i, '').trim();
        }

        return {
            type,
            content: mainContent,
            tags,
            items: [],
            hasDeadline: text.includes('alarma') || text.includes('recordatorio')
        };
    }

    async handleSubmit() {
        const { content, type } = ui.getMainInputData();
        if (!content) return;

        // Si el usuario ingresó algo que parece un link pero el tipo es nota, cambiar a directorio
        let finalType = type;
        const isUrl = content.match(/^(https?:\/\/[^\s]+)/i);
        if (isUrl && (type === 'nota' || type === 'note')) {
            finalType = 'directorio';
        }

        // 1. Primero: análisis offline (sin internet)
        const offlineParsed = this.parseInputOffline(content);

        // 2. Detectar alarmas (comando en cualquier parte)
        const alarmaData = ai.detectarAlarmas(content);

        if (alarmaData.esAlarma) {
            await this.crearAlarma(alarmaData);
            return;
        }

        // 3. Detectar tags adicionales (salud, emocion)
        const detectedTags = ai.detectarTags(content);
        const allTags = [...new Set([...offlineParsed.tags, ...detectedTags])];

        if (!this.currentUser) {
            ui.showNotification('¡Ups! Necesitas entrar para que Kai recuerde esto.', 'warning');
            ui.toggleSidebar();
            return;
        }

        try {
            // Usar análisis offline como base, luego mejorar con IA si hay conexión
            let currentType = finalType !== 'nota' ? finalType : offlineParsed.type;
            let finalTags = [...allTags];
            let finalContent = offlineParsed.content || content;
            let finalItems = offlineParsed.items || [];

            // Generación automática de título si el contenido es largo (asumiendo que es descripción)
            if (finalContent.length > 50 && !content.includes('\n')) {
                // Si parece una descripción larga, Kai generará un título luego.
                // Por ahora usamos los primeros 30 caracteres como título provisional.
            }
            // Si no detectó tipo específico o hay internet, usar IA para mejorar
            if (offlineParsed.type === 'nota' || !offlineParsed.type) {
                try {
                    const aiParsed = await this.parseIntentWithAI(content);
                    if (aiParsed.type) currentType = aiParsed.type; // Changed finalType to currentType
                    finalTags = [...new Set([...finalTags, ...aiParsed.tags])];
                } catch (e) {
                    // Sin internet, usar análisis offline
                }
            }

            await data.createItem({
                content: finalContent,
                type: currentType,
                parent_id: this.currentParentId,
                tags: finalTags,
                url: currentType === 'directorio' ? this.extractUrl(content) : '',
                tareas: finalItems,
                deadline: null
            });

            const itemCount = finalItems.length;
            let message = '¡Anotado con éxito!';
            if (itemCount > 0) {
                message = `¡Tarea con ${itemCount} items creada!`;
            }

            ui.clearMainInput();
            ui.showNotification(message, 'success');
            await this.loadItems();
        } catch (error) {
            console.error('Error al crear:', error);
            ui.showNotification('KAI no pudo guardar eso. ¿Intentamos de nuevo?', 'error');
        }
    }

    extractUrl(text) {
        const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
        return urlMatch ? urlMatch[1] : '';
    }

    async sendPushNotification(token, title, body, deadlineTimestamp, itemId) {
        try {
            console.log('📲 Enviando push notification...', { token: token?.substring(0, 20) + '...', title, body, deadlineTimestamp });

            const { data, error } = await supabase.functions.invoke('send-push', {
                body: {
                    token: token,
                    title: title,
                    body: body,
                    timestamp: deadlineTimestamp,
                    itemId: itemId
                }
            });

            if (error) throw error;

            console.log('Push notification sent:', data);
            return data;
        } catch (error) {
            console.error('Error sending push notification:', error);
        }
    }

    async crearAlarma(alarmaData) {
        try {
            const contenidoAlarma = alarmaData.contenido || 'Recordatorio';
            const deadline = alarmaData.deadline;

            let newItemId = null;
            if (this.currentUser) {
                const deadlineForDB = formatDeadlineForDB(deadline);
                const result = await data.createItem({
                    content: contenidoAlarma,
                    type: 'nota',
                    parent_id: this.currentParentId,
                    tags: ['alarma'],
                    deadline: deadlineForDB
                });
                newItemId = result[0]?.id || result?.id || null;
            }

            ui.clearMainInput();

            const deadlineDate = formatDeadlineForDisplay(deadline);
            const hora = deadlineDate ? deadlineDate.toLocaleString('es-ES', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : '';

            const mensajesAlarma = [
                `¡Alarmas configurada para ${hora}! ⏰`,
                `¡Te recuerdo a las ${hora}! ⏰✨`,
                `¡Listo! Te aviso a las ${hora} ⏰`
            ];
            const mensajeAleatorio = mensajesAlarma[Math.floor(Math.random() * mensajesAlarma.length)];
            ui.showNotification(mensajeAleatorio, 'success');

            // --- CORRECCIÓN PWA MÓVIL (iOS/Android): Solicitar token on-click ---
            let fcmToken = localStorage.getItem('fcmToken');
            if (deadline) {
                const deadlineTimestamp = new Date(deadline).getTime();

                const { data: tokens } = await supabase
                    .from('fcm_tokens')
                    .select('token');

                const allTokens = tokens?.map(t => t.token) || [];
                console.log('📱 Tokens encontrados para el usuario:', allTokens.length);

                if (allTokens.length === 0 && fcmToken) {
                    allTokens.push(fcmToken);
                }

                if (allTokens.length > 0) {
                    for (const token of allTokens) {
                        await this.sendPushNotification(
                            token,
                            '⏰ KAI - Recordatorio',
                            contenidoAlarma,
                            deadlineTimestamp,
                            newItemId
                        );
                    }
                    alert(`📲 Push programada para ${allTokens.length} dispositivo(s)`);
                } else {
                    alert('⚠️ No hay dispositivos registrados. Permite notificaciones.');
                }
            }

            await this.loadItems();
        } catch (error) {
            console.error('Error al crear alarma:', error);
            ui.showNotification('No pude crear la alarma. ¿Reintentamos?', 'error');
        }
    }

    async handleEdit() {
        const updates = ui.getEditFormData();
        try {
            await data.updateItem(updates.id, updates);
            ui.toggleModal(false);
            ui.showNotification('¡Cambios guardados con amor!', 'success');
            await this.loadItems();
        } catch (error) {
            console.error('Error al editar:', error);
            ui.showNotification('Hubo un problema al guardar los cambios.', 'error');
        }
    }

    async dataUpdateInline(id, updates) {
        try {
            // Convertir deadline a formato ISO si es necesario
            if (updates.deadline) {
                if (typeof updates.deadline === 'number') {
                    // Es un timestamp
                    updates.deadline = new Date(updates.deadline).toISOString();
                } else if (typeof updates.deadline === 'string' && updates.deadline.includes('T')) {
                    // Ya es ISO string, verificar que sea válido
                    const d = new Date(updates.deadline);
                    if (isNaN(d.getTime())) {
                        updates.deadline = null;
                    }
                } else if (typeof updates.deadline === 'string' && !updates.deadline.includes('T')) {
                    // Es una fecha sin hora (YYYY-MM-DD)
                    updates.deadline = updates.deadline + 'T00:00:00.000Z';
                }
            } else {
                updates.deadline = null;
            }

            await data.updateItem(id, updates);
            ui.showNotification('¡Bloque actualizado! ✨', 'success');
            await this.loadItems();
        } catch (error) {
            console.error('Error al actualizar inline:', error);
            ui.showNotification('No pude guardar los cambios del bloque.', 'error');
        }
    }

    async deleteItem(id) {
        try {
            await data.deleteItem(id);
            ui.showNotification('Recuerdo borrado con éxito. 🗑️', 'info');
            await this.loadItems();
        } catch (error) {
            console.error('Error al borrar:', error);
            ui.showNotification('No pude borrar eso. ¿Reintentamos?', 'error');
        }
    }

    async loadItems(silent = false) {
        if (!silent) ui.renderLoading();
        try {
            const filters = { parent_id: this.currentParentId };
            
            // Si la categoría es 'hoy', ignoramos el filtro de tipo y buscamos todo para filtrar por fecha localmente
            if (this.currentCategory === 'hoy') {
                const items = await data.getItems({ parent_id: this.currentParentId });
                const today = new Date().toISOString().split('T')[0];
                
                const filteredItems = items.filter(item => {
                    const d = item.deadline ? item.deadline.split('T')[0] : item.created_at.split('T')[0];
                    return d === today && item.status !== 'completed';
                });

                ui.render(filteredItems);
            } else {
                if (this.currentCategory !== 'all') filters.type = this.currentCategory;
                const items = await data.getItems(filters);

                // Filtrar por tag si aplica
                let filteredItems = items;
                if (this.currentTag) {
                    filteredItems = items.filter(item => item.tags && item.tags.includes(this.currentTag));
                }

                ui.render(filteredItems);
            }
            
            this.updateBreadcrumb();
        } catch (error) {
            console.error('Error al cargar:', error);
            if (!silent) ui.renderError('No pudimos cargar tus pensamientos. ¿Reintentamos?');
        }
    }

    async updateBreadcrumb() {
        ui.renderBreadcrumb(this.breadcrumbPath, (id) => this.navigateTo(id));
    }

    // --- Gestión de Chat de Kai con IA ---
    async handleKaiChat() {
        const input = ui.elements.kaiChatInput();
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        ui.addKaiMessage(text, false); // Mensaje del usuario
        ui.showKaiThinking(true);

        try {
            const { response, action } = await cerebras.ask(text);
            ui.showKaiThinking(false);
            ui.addKaiMessage(response, true); // Respuesta de Kai

            if (action) {
                await this.executeKaiAction(action);
            }
        } catch (error) {
            ui.showKaiThinking(false);
            ui.addKaiMessage("Perdona Maria, algo falló en mi conexión. ¿Podemos intentar de nuevo? 🧸🔌");
        }
    }

    async executeKaiAction(action) {
        // console.log('🤖 Kai ejecutando acción:', action);
        try {
            const actionData = action.data || {};
            const id = actionData.id;

            switch (action.type) {
                case 'CREATE_ITEM':
                    if (!this.currentUser) {
                        ui.showNotification('¡Ups! Necesitas entrar para guardar.', 'warning');
                        ui.toggleSidebar();
                        return;
                    }
                    await data.createItem(actionData);
                    await this.loadItems();
                    ui.showNotification('¡Creado con éxito! ✨', 'success');
                    break;

                case 'UPDATE_ITEM':
                    if (!id) throw new Error('ID no proporcionado para actualizar');
                    await data.updateItem(id, actionData.updates || actionData);
                    await this.loadItems();
                    ui.showNotification('¡Actualizado! 📁', 'success');
                    break;

                case 'DELETE_ITEM':
                    if (!id) throw new Error('ID no proporcionado para borrar');
                    if (confirm('¿Estás segura de querer borrar esto? Kai dice que es definitivo.')) {
                        await data.deleteItem(id);
                        await this.loadItems();
                        ui.showNotification('¡Borrado! 🗑️', 'info');
                    }
                    break;

                case 'TOGGLE_TASK':
                    if (!id || actionData.taskIndex === undefined) {
                        ui.showNotification('Faltan datos para completar la tarea.', 'warning');
                        break;
                    }
                    await this.toggleTimelineTask(id, actionData.taskIndex, actionData.completed);
                    ui.showNotification(actionData.completed ? '¡Tarea completada! ✅' : 'Tarea desmarcada', 'success');
                    break;

                case 'TOGGLE_PIN':
                    if (!id) throw new Error('ID no proporcionado para anclado');
                    await this.togglePin(id);
                    break;

                case 'OPEN_PROJECT':
                    if (!id) throw new Error('ID no proporcionado para abrir proyecto');
                    await this.openProject(id);
                    ui.showNotification('Abriendo proyecto... 📁', 'info');
                    break;

                case 'OPEN_EDIT':
                    if (!id) throw new Error('ID no proporcionado para editar');
                    await this.openEditModal(id, actionData.focus);
                    break;

                case 'SEARCH':
                    const query = action.query || actionData.query;
                    if (!query) {
                        ui.showNotification('¿Qué quieres que busque Maria? 🔍', 'info');
                        break;
                    }
                    ui.showNotification(`Buscando "${query}"... 🔍`, 'info');
                    const searchResults = await data.getItems({ search: query });
                    if (searchResults.length > 0) {
                        ui.render(searchResults);
                        ui.addKaiMessage(`¡Aquí tienes lo que encontré sobre "${query}"! ✨(${searchResults.length} resultados)`);
                    } else {
                        ui.addKaiMessage(`Vaya Maria, busqué por todo el panel y no encontré nada sobre "${query}". 🧐`);
                    }
                    break;

                case 'FILTER_CATEGORY':
                    this.currentCategory = actionData.category || 'all';
                    await this.loadItems();
                    ui.showNotification(`Mostrando: ${actionData.category || 'todos'}`, 'info');
                    break;

                case 'NO_ACTION':
                    ui.showNotification('Kai entiende pero no actúa.', 'info');
                    break;

                default:
                    console.warn('Acción de Kai no reconocida:', action.type);
                    ui.showNotification('Kai intentó hacer algo, pero no lo entendí.', 'warning');
            }
        } catch (error) {
            console.error('Error al ejecutar acción de Kai:', error);
            ui.addKaiMessage(`Tuve problemas para completar esa acción: ${error.message}. 😔`);
            ui.showNotification('Error al ejecutar la acción de Kai.', 'error');
        }
    }

    async togglePin(id) {
        try {
            const items = await data.getItems({ id });
            const item = Array.isArray(items) ? items[0] : items;
            const newPinned = !item.anclado;
            await data.updateItem(id, { anclado: newPinned });
            ui.showNotification(newPinned ? '📌 Anclado al panel' : '📍 Desanclado', 'success');
            await this.loadItems();
        } catch (error) {
            console.error('Error pin:', error);
        }
    }

    async toggleTimelineTask(id, taskIndex, isCompleted) {
        try {
            const items = await data.getItems({ id });
            const item = Array.isArray(items) ? items.find(i => i.id === id) : items;
            if (item && item.tareas && item.tareas[taskIndex]) {
                item.tareas[taskIndex].completado = isCompleted;
                await data.updateItem(id, { tareas: item.tareas });
                await this.loadItems();
            }
        } catch (error) {
            console.error('Error toggle timeline task:', error);
        }
    }

    async finishItem(id) {
        try {
            const items = await data.getItems({ id });
            const item = Array.isArray(items) ? items.find(i => i.id === id) : items;
            const currentTags = item.tags || [];
            const newTags = currentTags.includes('logro') ? currentTags : [...currentTags, 'logro'];
            await data.updateItem(id, { tags: newTags, status: 'completed' });
            ui.showNotification('¡Felicidades por tu logro! 🏆', 'success');
            await this.loadItems();
        } catch (error) {
            console.error('Error finish:', error);
        }
    }

    // --- NAVEGACIÓN ---

    async openProject(id) {
        try {
            const items = await data.getItems({ id });
            const project = Array.isArray(items) ? items.find(i => i.id === id) : items;

            if (project) {
                this.breadcrumbPath.push({ id, content: project.content });
                this.currentParentId = id;
                await this.loadItems();
            }
        } catch (error) {
            console.error('Error abrir proyecto:', error);
        }
    }

    async navigateTo(id) {
        const index = this.breadcrumbPath.findIndex(item => item.id === id);
        if (index === -1) return;

        this.breadcrumbPath = this.breadcrumbPath.slice(0, index + 1);
        this.currentParentId = id;
        await this.loadItems();
    }

    async goHome() {
        this.breadcrumbPath = [];
        this.currentParentId = null;
        await this.loadItems();
    }

    async handleCategoryClick(button) {
        document.querySelectorAll('.btn-category').forEach(b => b.classList.remove('active', 'border-brand', 'bg-white', 'shadow-sticker'));
        document.querySelectorAll('.btn-tag').forEach(b => b.classList.remove('active', 'bg-lavender', 'text-purple-600', 'border-purple-200'));

        // Aplicar estilos activos según el tipo de botón
        if (button.classList.contains('btn-tag')) {
            button.classList.add('active', 'bg-lavender', 'text-purple-600', 'border-purple-200');
        } else {
            button.classList.add('active', 'border-brand', 'bg-white', 'shadow-sticker');
        }

        // Manejar tanto categorías como tags
        this.currentCategory = button.dataset.category || null;
        this.currentTag = button.dataset.tag || null;

        await this.loadItems();
    }

    async openEditModal(id, focus = null) {
        try {
            const items = await data.getItems({ id });
            const item = Array.isArray(items) ? items.find(i => i.id === id) : items;
            if (item) {
                ui.fillEditModal(item, focus);
                ui.toggleModal(true);
            }
        } catch (error) {
            ui.showNotification('Error al cargar datos del elemento.', 'error');
        }
    }

    // --- AUTH & VOICE ---

    async handleGoogleLogin() {
        try { await auth.signInWithGoogle(); }
        catch (error) { ui.showNotification('Error al conectar con Google.', 'error'); }
    }

    async handleLogout() {
        try {
            await auth.signOut();
            this.currentUser = null;
            ui.updateUserInfo(null);
            ui.toggleSidebar();
            this.goHome();
        } catch (error) {
            ui.showNotification('Error al cerrar sesión.', 'error');
        }
    }

    toggleVoiceInput() {
        if (ai.isRecording) this.stopVoiceInput();
        else {
            ui.toggleVoiceOverlay(true);
            ai.startVoice();
        }
    }

    stopVoiceInput() {
        ai.stopVoice();
        ui.toggleVoiceOverlay(false);
    }
}



// Inicialización global
window.addEventListener('DOMContentLoaded', () => {
    window.kai = new KaiController();
});

export default KaiController;
