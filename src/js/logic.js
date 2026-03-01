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
 *   - constructor(), init(), esDesarrollo()
 *   - mostrarControlesDemo(), loadDemoItems()
 *   - demoUpdateItem(), demoDeleteItem()
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
import { generarDemoData, regenerarDemoItems } from './demo-data.js';

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
        // console.log('🧠 KAI: Controlador iniciado.');

        // Detectar si estamos en desarrollo (localhost)
        this.isDevMode = this.esDesarrollo();

        ui.init();
        this.bindEvents();
        this.startAlarmChecker();

        // En desarrollo, mostrar botón para generar demo
        // En producción, nunca mostrar demo
        if (this.isDevMode) {
            this.mostrarControlesDemo(true);
        } else {
            this.mostrarControlesDemo(false);
        }

        try {
            this.currentUser = await auth.init();
            // console.log('Usuario:', this.currentUser);
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
        // Mostrar estado vacío con opción de generar demo
        ui.render([], false);
        const container = ui.elements.container();
        if (container) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <div class="text-6xl mb-4">🧠</div>
                    <h2 class="text-2xl font-bold text-ink mb-2">Bienvenido a KAI</h2>
                    <p class="text-ink/60 mb-6">Tu segundo cerebro está listo para usar</p>
                    <button id="btn-generate-demo" class="bg-brand text-white font-bold py-3 px-8 rounded-blob shadow-sticker hover:bg-brand-dark transition-all">
                        ✨ Probar con datos de ejemplo
                    </button>
                </div>
            `;
            document.getElementById('btn-generate-demo')?.addEventListener('click', () => {
                regenerarDemoItems();
                this.isDemoMode = true;
                this.loadItems();
            });
        }
    }

    esDesarrollo() {
        const hostname = window.location.hostname;
        return hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname === '0.0.0.0' ||
            hostname.includes('localhost') ||
            window.location.href.includes('localhost') ||
            window.location.href.includes('127.0.0.1');
    }

    mostrarControlesDemo(mostrar) {
        const controls = document.getElementById('demo-controls');
        if (controls) {
            controls.style.display = mostrar ? 'block' : 'none';
        }
    }

    loadDemoItems() {
        // console.log('loadDemoItems llamado');

        let demoItems = JSON.parse(localStorage.getItem('kaiDemoItems'));

        if (!demoItems) {
            // Usar generador automático de demo data
            demoItems = generarDemoData();
            localStorage.setItem('kaiDemoItems', JSON.stringify(demoItems));
        }

        this.isDemoMode = true;

        ui.render(demoItems, true);
    }

    isDemoMode = false;

    async demoUpdateItem(id, updates) {
        let items = JSON.parse(localStorage.getItem('kaiDemoItems')) || [];
        const index = items.findIndex(i => i.id === id);
        if (index !== -1) {
            items[index] = { ...items[index], ...updates };
            localStorage.setItem('kaiDemoItems', JSON.stringify(items));
        }
    }

    async demoDeleteItem(id) {
        let items = JSON.parse(localStorage.getItem('kaiDemoItems')) || [];
        items = items.filter(i => i.id !== id);
        localStorage.setItem('kaiDemoItems', JSON.stringify(items));
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
        const now = Date.now();

        if (reminderTime <= now && deadlineTime > now) {
            this.triggerAlarm(item);
            return;
        }

        if (deadlineTime <= now) {
            return;
        }

        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.ready;
                
                if ('showNotification' in registration && 'trigger' in Notification.prototype) {
                    await registration.showNotification('⏰ KAI - Recordatorio', {
                        body: `Se acerca: ${item.content}`,
                        icon: '/src/assets/icon-192.png',
                        tag: `alarm-${item.id}`,
                        data: { itemId: item.id, type: 'reminder' },
                        vibrate: [200, 100, 200],
                        requireInteraction: true,
                        trigger: { 
                            type: 'timestamp', 
                            timestamp: reminderTime 
                        }
                    });
                    
                    await registration.showNotification('⏰ ¡KAI Te Recuerdas!', {
                        body: item.content,
                        icon: '/src/assets/icon-192.png',
                        tag: `alarm-final-${item.id}`,
                        data: { itemId: item.id, type: 'alarm' },
                        vibrate: [300, 100, 300, 100, 300],
                        requireInteraction: true,
                        trigger: { 
                            type: 'timestamp', 
                            timestamp: deadlineTime 
                        }
                    });
                }
            } catch (error) {
                console.log('SW trigger not supported, using fallback:', error.message);
            }
        }

        if ('Notification' in window && 'trigger' in Notification.prototype) {
            try {
                new Notification('⏰ KAI - Recordatorio', {
                    body: `Se acerca: ${item.content}`,
                    icon: '/src/assets/icon-192.png',
                    tag: `alarm-${item.id}`,
                    data: { itemId: item.id, type: 'reminder' },
                    trigger: { 
                        type: 'timestamp', 
                        timestamp: reminderTime 
                    }
                });

                new Notification('⏰ ¡KAI Te Recuerdas!', {
                    body: item.content,
                    icon: '/src/assets/icon-192.png',
                    tag: `alarm-final-${item.id}`,
                    data: { itemId: item.id, type: 'alarm' },
                    trigger: { 
                        type: 'timestamp', 
                        timestamp: deadlineTime 
                    }
                });
            } catch (error) {
                console.log('Notification trigger not supported, using fallback');
            }
        }
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

    async triggerAlarm(item) {
        if (Notification.permission === 'granted') {
            try {
                new Notification('⏰ ¡KAI Te Recuerdas!', {
                    body: item.content,
                    icon: '/src/assets/icon-192.png',
                    tag: item.id,
                    data: { itemId: item.id },
                    vibrate: [200, 100, 200],
                    requireInteraction: true
                });
            } catch (error) {
                console.error('Error showing notification:', error);
            }
        }

        ui.showNotification(`⏰ ¡Hora de: ${item.content}!`, 'warning');

        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleR4GOKjm');
        audio.volume = 0.5;
        audio.play().catch((err) => {
            console.warn('🔇 No se pudo reproducir audio de alarma:', err.message);
        });
    }

    bindEvents() {
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
            const { type, content, url } = e.detail;
            try {
                await data.createItem({
                    type: type,
                    content: content,
                    url: url || ''
                });
                ui.showNotification(`¡Guardado como ${type}! ✨`, 'success');
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

        // La gestión de breadcrumbs ahora está centralizada en ui.renderBreadcrumb
        // por lo que eliminamos el listener manual de aquí para evitar recargas.

        // --- Modals & Sidebar ---
        document.getElementById('btn-user')?.addEventListener('click', () => ui.toggleSidebar());
        document.getElementById('btn-close-sidebar')?.addEventListener('click', () => ui.closeSidebar());
        document.getElementById('sidebar-overlay')?.addEventListener('click', () => ui.closeSidebar());
        document.getElementById('btn-google')?.addEventListener('click', () => this.handleGoogleLogin());
        document.getElementById('btn-logout')?.addEventListener('click', () => this.handleLogout());
        document.getElementById('btn-add-task')?.addEventListener('click', () => ui.addTaskToModal());
        document.getElementById('btn-regenerate-demo')?.addEventListener('click', () => {
            regenerarDemoItems();
            location.reload();
        });

        // Tag suggestions - agregar tags al input
        document.querySelectorAll('.tag-suggestion').forEach(tag => {
            tag.addEventListener('click', () => {
                const input = document.getElementById('edit-tags');
                const current = input.value || '';
                const newTag = tag.dataset.tag;
                if (current) {
                    input.value = current + ', ' + newTag;
                } else {
                    input.value = newTag;
                }
            });
        });

        // El botón de voz central en el footer
        document.getElementById('btn-voice-footer')?.addEventListener('click', () => this.toggleVoiceInput());
        
        document.getElementById('btn-close-voice')?.addEventListener('click', () => {
            ai.stopVoice();
            ui.toggleVoiceOverlay(false);
        });
        
        document.getElementById('btn-stop-voice')?.addEventListener('click', () => this.stopVoiceInput());

        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => ui.toggleModal(false));
        });

        // --- Kai Chat Events ---
        ui.elements.kaiAvatarContainer()?.addEventListener('click', () => ui.toggleKaiChat());
        document.getElementById('kai-chat-back')?.addEventListener('click', () => ui.toggleKaiChat(false));
        document.getElementById('kai-chat-minimize')?.addEventListener('click', () => ui.toggleKaiChat(false));
        ui.elements.kaiChatSend()?.addEventListener('click', () => this.handleKaiChat());
        ui.elements.kaiChatInput()?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleKaiChat();
        });

        // --- Demo Regenerate Button ---
        document.addEventListener('click', (e) => {
            const regenerateBtn = e.target.closest('#btn-regenerate-in-timeline');
            if (regenerateBtn) {
                regenerarDemoItems();
                this.isDemoMode = true;
                this.loadItems();
            }
        });

        // --- Delegación de Items (Stickers) ---
        ui.elements.container()?.addEventListener('click', async (e) => {
            const finishBtn = e.target.closest('.action-finish');
            const deleteBtn = e.target.closest('.action-delete');
            const openBtn = e.target.closest('.action-open');
            const pinBtn = e.target.closest('.btn-pin');
            const taskCheckbox = e.target.closest('.timeline-task-checkbox');

            if (taskCheckbox) {
                e.stopPropagation();
                await this.toggleTimelineTask(taskCheckbox.dataset.id, parseInt(taskCheckbox.dataset.index), taskCheckbox.checked);
            } else if (deleteBtn) {
                e.stopPropagation();
                if (confirm('¿Eliminar este elemento?')) {
                    await this.deleteItem(deleteBtn.dataset.id);
                }
            } else if (finishBtn) {
                e.stopPropagation();
                await this.finishItem(finishBtn.dataset.id);
            } else if (openBtn) {
                e.stopPropagation();
                this.openProject(openBtn.dataset.id);
            } else if (pinBtn) {
                e.stopPropagation();
                await this.togglePin(pinBtn.dataset.id);
            }
        });

        // --- Eventos Globales ---
        window.addEventListener('voice-result', (e) => {
            const input = ui.elements.inputMain();
            if (input) input.value = e.detail.transcript;
            this.stopVoiceInput();
        });
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

        if (!this.currentUser && !this.isDemoMode) {
            ui.showNotification('¡Ups! Necesitas entrar para que Kai recuerde esto.', 'warning');
            ui.toggleSidebar();
            return;
        }

        try {
            // Usar análisis offline como base, luego mejorar con IA si hay conexión
            let finalType = type !== 'nota' ? type : offlineParsed.type;
            let finalTags = [...allTags];
            let finalContent = offlineParsed.content || content;
            let finalItems = offlineParsed.items || [];
            
            // Si no detectó tipo específico o hay internet, usar IA para mejorar
            if (offlineParsed.type === 'nota' || !offlineParsed.type) {
                try {
                    const aiParsed = await this.parseIntentWithAI(content);
                    if (aiParsed.type) finalType = aiParsed.type;
                    finalTags = [...new Set([...finalTags, ...aiParsed.tags])];
                } catch (e) {
                    // Sin internet, usar análisis offline
                }
            }

            if (this.isDemoMode) {
                const newItem = {
                    id: 'demo-' + Date.now(),
                    content: finalContent,
                    type: finalType,
                    parent_id: this.currentParentId,
                    tags: finalTags,
                    descripcion: '',
                    url: finalType === 'directorio' ? this.extractUrl(content) : '',
                    tareas: finalItems,
                    deadline: null,
                    anclado: false,
                    created_at: new Date().toISOString()
                };
                let items = JSON.parse(localStorage.getItem('kaiDemoItems')) || [];
                items.unshift(newItem);
                localStorage.setItem('kaiDemoItems', JSON.stringify(items));
            } else {
                await data.createItem({
                    content: finalContent,
                    type: finalType,
                    parent_id: this.currentParentId,
                    tags: finalTags,
                    url: finalType === 'directorio' ? this.extractUrl(content) : '',
                    tareas: finalItems,
                    deadline: null
                });
            }

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
            const response = await fetch('https://jiufptuxadjavjfbfwka.supabase.co/functions/v1/hyper-endpoint', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppdWZwdHV4YWRqYXZqZmJmd2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwODY0NzgsImV4cCI6MjA4NTY2MjQ3OH0.LCXYWsmD-ZM45O_HNVwFHu8dJFzxns3Zd_2BHusm2CY'
                },
                body: JSON.stringify({
                    token: token,
                    title: title,
                    body: body,
                    timestamp: deadlineTimestamp,
                    itemId: itemId
                })
            });
            const result = await response.json();
            console.log('Push notification sent:', result);
            return result;
        } catch (error) {
            console.error('Error sending push notification:', error);
        }
    }
    
    async crearAlarma(alarmaData) {
        // console.log('crearAlarma - alarmaData:', alarmaData);
        try {
            const contenidoAlarma = alarmaData.contenido || 'Recordatorio';
            const deadline = alarmaData.deadline;
            // console.log('crearAlarma - deadline antes de format:', deadline, 'tipo:', typeof deadline);

            let newItemId = null;
            if (this.isDemoMode) {
                const newItem = {
                    id: 'demo-' + Date.now(),
                    content: contenidoAlarma,
                    type: 'nota', // Mantener como nota, deadline hace la magia
                    parent_id: this.currentParentId,
                    tags: ['alarma'],
                    descripcion: '',
                    url: '',
                    tareas: [],
                    deadline: deadline,
                    anclado: false,
                    created_at: new Date().toISOString()
                };
                let items = JSON.parse(localStorage.getItem('kaiDemoItems')) || [];
                items.unshift(newItem);
                localStorage.setItem('kaiDemoItems', JSON.stringify(items));
                newItemId = newItem.id;
            } else if (this.currentUser) {
                const deadlineForDB = formatDeadlineForDB(deadline);
                // console.log('crearAlarma - deadline para Supabase:', deadlineForDB);
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

            const fcmToken = localStorage.getItem('fcmToken');
            if (fcmToken && deadline) {
                const deadlineTimestamp = new Date(deadline).getTime();
                await this.sendPushNotification(
                    fcmToken,
                    '⏰ KAI - Recordatorio',
                    contenidoAlarma,
                    deadlineTimestamp,
                    newItemId
                );
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
            if (this.isDemoMode) {
                await this.demoUpdateItem(updates.id, updates);
            } else {
                await data.updateItem(updates.id, updates);
            }
            ui.toggleModal(false);
            ui.showNotification('¡Cambios guardados con amor!', 'success');
            await this.loadItems();
        } catch (error) {
            console.error('Error al editar:', error);
            ui.showNotification('Hubo un problema al guardar los cambios.', 'error');
        }
    }

    async dataUpdateInline(id, updates) {
        // console.log('dataUpdateInline - isDemoMode:', this.isDemoMode, 'id:', id, 'updates:', updates);
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
            
            if (this.isDemoMode) {
                await this.demoUpdateItem(id, updates);
                ui.showNotification('¡Bloque actualizado! ✨', 'success');
                await this.loadItems();
            } else {
                await data.updateItem(id, updates);
                ui.showNotification('¡Bloque actualizado! ✨', 'success');
                await this.loadItems();
            }
        } catch (error) {
            console.error('Error al actualizar inline:', error);
            ui.showNotification('No pude guardar los cambios del bloque.', 'error');
        }
    }

    async deleteItem(id) {
        try {
            if (this.isDemoMode) {
                await this.demoDeleteItem(id);
                ui.showNotification('Recuerdo borrado con éxito. 🗑️', 'info');
                await this.loadItems(); // ← corregido: recargar UI en modo demo
            } else {
                await data.deleteItem(id);
                ui.showNotification('Recuerdo borrado con éxito. 🗑️', 'info');
                await this.loadItems();
            }
        } catch (error) {
            console.error('Error al borrar:', error);
            ui.showNotification('No pude borrar eso. ¿Reintentamos?', 'error');
        }
    }

    async loadItems() {
        // Verificar si hay demo items en localStorage
        const demoItems = JSON.parse(localStorage.getItem('kaiDemoItems') || 'null');

        if (this.isDemoMode || demoItems) {
            this.isDemoMode = true;
            let items = demoItems || [];

            // Filtrar por categoría o tag
            if (this.currentTag) {
                // Filtrar por tag
                items = items.filter(item => item.tags && item.tags.includes(this.currentTag));
            } else if (this.currentCategory && this.currentCategory !== 'all') {
                // Filtrar por tipo
                items = items.filter(item => item.type === this.currentCategory);
            }

            ui.render(items, true);
            return;
        }

        ui.renderLoading();
        try {
            const filters = { parent_id: this.currentParentId };
            if (this.currentCategory !== 'all') filters.type = this.currentCategory;

            const items = await data.getItems(filters);

            // Filtrar por tag si aplica
            let filteredItems = items;
            if (this.currentTag) {
                filteredItems = items.filter(item => item.tags && item.tags.includes(this.currentTag));
            }

            ui.render(filteredItems);
            this.updateBreadcrumb();
        } catch (error) {
            console.error('Error al cargar:', error);
            ui.renderError('No pudimos cargar tus pensamientos. ¿Reintentamos?');
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
                    if (this.isDemoMode) {
                        const newItem = {
                            id: 'demo-' + Date.now(),
                            content: actionData.content || '',
                            type: actionData.type || 'nota',
                            parent_id: this.currentParentId,
                            tags: actionData.tags || [],
                            descripcion: actionData.descripcion || '',
                            url: actionData.url || '',
                            tareas: actionData.tareas || [],
                            deadline: actionData.deadline || null,
                            anclado: false,
                            created_at: new Date().toISOString()
                        };
                        let items = JSON.parse(localStorage.getItem('kaiDemoItems')) || [];
                        items.unshift(newItem);
                        localStorage.setItem('kaiDemoItems', JSON.stringify(items));
                    } else {
                        if (!this.currentUser) {
                            ui.showNotification('¡Ups! Necesitas entrar para guardar.', 'warning');
                            ui.toggleSidebar();
                            return;
                        }
                        await data.createItem(actionData);
                    }
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
            if (this.isDemoMode) {
                let items = JSON.parse(localStorage.getItem('kaiDemoItems')) || [];
                const item = items.find(i => i.id === id);
                if (item) {
                    item.anclado = !item.anclado;
                    localStorage.setItem('kaiDemoItems', JSON.stringify(items));
                    ui.showNotification(item.anclado ? '📌 Anclado al panel' : '📍 Desanclado', 'success');
                    await this.loadItems();
                }
            } else {
                const items = await data.getItems({ id });
                const item = Array.isArray(items) ? items[0] : items;
                const newPinned = !item.anclado;
                await data.updateItem(id, { anclado: newPinned });
                ui.showNotification(newPinned ? '📌 Anclado al panel' : '📍 Desanclado', 'success');
                await this.loadItems();
            }
        } catch (error) {
            console.error('Error pin:', error);
        }
    }

    async toggleTimelineTask(id, taskIndex, isCompleted) {
        try {
            if (this.isDemoMode) {
                let items = JSON.parse(localStorage.getItem('kaiDemoItems')) || [];
                const item = items.find(i => i.id === id);
                if (item && item.tareas && item.tareas[taskIndex]) {
                    item.tareas[taskIndex].completado = isCompleted;
                    localStorage.setItem('kaiDemoItems', JSON.stringify(items));
                    await this.loadItems();
                }
            } else {
                const items = await data.getItems({ id });
                const item = Array.isArray(items) ? items.find(i => i.id === id) : items;
                if (item && item.tareas && item.tareas[taskIndex]) {
                    item.tareas[taskIndex].completado = isCompleted;
                    await data.updateItem(id, { tareas: item.tareas });
                    await this.loadItems();
                }
            }
        } catch (error) {
            console.error('Error toggle timeline task:', error);
        }
    }

    async finishItem(id) {
        try {
            if (this.isDemoMode) {
                let items = JSON.parse(localStorage.getItem('kaiDemoItems')) || [];
                const item = items.find(i => i.id === id);
                if (item) {
                    item.tags = item.tags || [];
                    if (!item.tags.includes('logro')) item.tags.push('logro');
                    item.status = 'completed';
                    localStorage.setItem('kaiDemoItems', JSON.stringify(items));
                    ui.showNotification('¡Felicidades por tu logro! 🏆', 'success');
                    await this.loadItems();
                }
            } else {
                const items = await data.getItems({ id });
                const item = Array.isArray(items) ? items.find(i => i.id === id) : items;
                const currentTags = item.tags || [];
                const newTags = currentTags.includes('logro') ? currentTags : [...currentTags, 'logro'];
                await data.updateItem(id, { tags: newTags, status: 'completed' });
                ui.showNotification('¡Felicidades por tu logro! 🏆', 'success');
                await this.loadItems();
            }
        } catch (error) {
            console.error('Error finish:', error);
        }
    }

    // --- NAVEGACIÓN ---

    async openProject(id) {
        try {
            let project;
            if (this.isDemoMode) {
                const items = JSON.parse(localStorage.getItem('kaiDemoItems')) || [];
                project = items.find(i => i.id === id);
            } else {
                const items = await data.getItems({ id });
                project = Array.isArray(items) ? items.find(i => i.id === id) : items;
            }

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
            let item;
            if (this.isDemoMode) {
                const items = JSON.parse(localStorage.getItem('kaiDemoItems')) || [];
                item = items.find(i => i.id === id);
            } else {
                const items = await data.getItems({ id });
                item = Array.isArray(items) ? items.find(i => i.id === id) : items;
            }
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

// listeners de auth — Supabase emite 'SIGNED_IN' (mayúsculas)
window.addEventListener('auth-SIGNED_IN', async () => {
    if (window.kai) {
        window.kai.currentUser = await auth.getUser();
        ui.updateUserInfo(window.kai.currentUser);
        await window.kai.loadItems();
    }
});

export default KaiController;
