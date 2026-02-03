/*
================================================================================
|       PANEL MARÍA - APP ORCHESTRATOR (v3.0 TDAH Edition)                      |
================================================================================
*/
import { Store } from './store.js';
import { Renderer } from './renderer.js';
import { initChat, sendMessageToKai, appendMessage } from './chat.js';
import { auth, onAuthStateChanged, signInWithGoogle, signOutUser } from './auth.js';
import { GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

class PanelMariaApp {
    constructor() {
        this.store = new Store();
        this.renderer = new Renderer(this);
        this.currentEditingId = null;
        this.saveTimeout = null;

        // Subscribe to Store
        this.store.subscribe(() => this.renderer.render(this.store));
    }

    async init() {
        console.log('App: Initializing TDAH 3...');
        this.setupAuth();
        this.setupNavigation();
        this.setupListeners();

        // Init Kai
        initChat(this);

        // Initial Data Load
        await this.store.loadData();
    }

    setupAuth() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.store.setUser(user);
                window.storage.setAdapter('firebase', user.uid);
            } else {
                this.store.setUser(null);
                window.storage.setAdapter('local');
            }
            this.store.loadData();
        });

        document.getElementById('loginBtn')?.addEventListener('click', () => {
            const provider = new GoogleAuthProvider();
            signInWithPopup(auth, provider);
        });

        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            signOut(auth);
        });
    }

    setupNavigation() {
        const btns = {
            'btnChatView': 'kaiView',
            'btnGalleryView': 'galleryView'
        };

        Object.entries(btns).forEach(([btnId, viewId]) => {
            document.getElementById(btnId)?.addEventListener('click', () => {
                this.renderer.showView(viewId);
            });
        });

        document.getElementById('openSidebarBtn')?.addEventListener('click', () => {
            document.getElementById('sidebar').classList.add('show');
            document.getElementById('overlay').classList.add('active');
        });

        document.getElementById('overlay')?.addEventListener('click', () => {
            document.getElementById('sidebar').classList.remove('show');
            document.getElementById('overlay').classList.remove('active');
        });

        document.getElementById('addItemBtn')?.addEventListener('click', () => {
            this.openEditor(null);
        });

        document.getElementById('backToGallery')?.addEventListener('click', () => {
            this.renderer.showView('galleryView');
        });
    }

    setupListeners() {
        // Kai Chat
        document.getElementById('sendToKaiBtn')?.addEventListener('click', () => this.handleKaiInput());
        document.getElementById('kaiInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.handleKaiInput();
        });

        // Search
        document.getElementById('searchInput')?.addEventListener('input', (e) => {
            this.store.setSearch(e.target.value);
        });

        // Custom Event from Renderer
        window.addEventListener('edit-item', (e) => {
            this.openEditor(e.detail.id);
        });

        // Editor Auto-save
        const inputs = ['editTitle', 'editBody', 'editUrl', 'editTags', 'editTipo', 'editEstado'];
        inputs.forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => this.debounceSave());
            document.getElementById(id)?.addEventListener('change', () => this.saveCurrentBlock());
        });

        document.getElementById('addTaskBtn')?.addEventListener('click', () => {
            const tasks = this.getCurrentEditorTasks();
            tasks.push({ titulo: '', completado: false });
            this.renderer.renderChecklist(tasks);
            this.saveCurrentBlock();
        });

        document.getElementById('checklistContainer')?.addEventListener('input', (e) => {
            if (e.target.classList.contains('task-title')) this.debounceSave();
        });

        document.getElementById('checklistContainer')?.addEventListener('change', (e) => {
            this.saveCurrentBlock();
        });

        document.getElementById('deleteBlockBtn')?.addEventListener('click', () => {
            if (this.currentEditingId && confirm('¿Seguro que quieres borrar este bloque?')) {
                this.store.deleteItem(this.currentEditingId);
                this.renderer.showView('galleryView');
            }
        });
    }

    async handleKaiInput() {
        const input = document.getElementById('kaiInput');
        const text = input.value;
        if (!text.trim()) return;

        appendMessage('user', text);
        input.value = '';
        await sendMessageToKai(text);
    }

    openEditor(id) {
        this.currentEditingId = id;
        const item = id ? this.store.items.find(i => i.id === id) : {
            titulo: '', descripcion: '', tipo: 'chispa', estado: 'planeacion', url: '', etiquetas: [], tareas: []
        };

        if (!item) return;

        document.getElementById('editTitle').value = item.titulo || '';
        document.getElementById('editBody').value = item.descripcion || '';
        document.getElementById('editUrl').value = item.url || '';
        document.getElementById('editTags').value = (item.etiquetas || []).join(', ');
        document.getElementById('editTipo').value = item.tipo || 'chispa';
        document.getElementById('editEstado').value = item.estado || 'planeacion';

        this.renderer.renderChecklist(item.tareas);
        this.renderer.showView('editorView');
    }

    getCurrentEditorTasks() {
        const container = document.getElementById('checklistContainer');
        const tasks = [];
        container.querySelectorAll('.checklist-item').forEach(row => {
            tasks.push({
                titulo: row.querySelector('.task-title').value,
                completado: row.querySelector('.task-check').checked
            });
        });
        return tasks;
    }

    debounceSave() {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => this.saveCurrentBlock(), 1500);
    }

    async saveCurrentBlock() {
        const data = {
            titulo: document.getElementById('editTitle').value,
            descripcion: document.getElementById('editBody').value,
            url: document.getElementById('editUrl').value,
            etiquetas: document.getElementById('editTags').value.split(',').map(s => s.trim()).filter(s => s),
            tipo: document.getElementById('editTipo').value,
            estado: document.getElementById('editEstado').value,
            tareas: this.getCurrentEditorTasks()
        };

        if (this.currentEditingId) {
            await this.store.updateItem(this.currentEditingId, data);
        } else {
            // Se crea al cerrar o si Kai lo decide, pero aquí permitimos creación manual también
            if (data.titulo || data.descripcion) {
                const newId = this.store.generateId();
                await this.store.addItem({ ...data, id: newId });
                this.currentEditingId = newId;
            }
        }

        const status = document.getElementById('saveStatus');
        if (status) {
            status.textContent = 'GUARDADO...';
            setTimeout(() => status.textContent = 'GUARDADO', 1000);
        }
    }
}

// Global Init
window.app = new PanelMariaApp();
document.addEventListener('DOMContentLoaded', () => window.app.init());
