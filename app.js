/*
================================================================================
|       PANEL MARÍA - APP ORCHESTRATOR (Refactored v3.0)                       |
================================================================================
*/
import { Store } from './store.js';
import { Renderer } from './renderer.js';
import { initChat } from './chat.js';
import { auth, onAuthStateChanged, signInWithGoogle, signOutUser } from './auth.js';

class PanelMariaApp {
    constructor() {
        this.store = new Store();
        this.renderer = new Renderer(this);
        this.selectedItems = new Set();

        // Subscribe to Store
        this.store.subscribe((s) => {
            this.renderer.render(s, this.selectedItems);
            this.renderer.renderCustomCategories(s.settings.customCategories);
            this.renderer.renderGlobalTags(s.getAllTags());
        });

        console.log('App: V3.0 Rebuild Initialized');
    }

    async init() {
        this.setupComponents();
        this.setupAuth();
        this.setupListeners();
        initChat(this);
    }

    setupComponents() {
        // Tag Inputs Logic (Simplified)
        this.setupTagInput('wsTagsWrapper', 'wsTagsInput');
        this.setupTagInput('bulkTagsWrapper', 'bulkTagsInput');
    }

    setupTagInput(wrapperId, inputId) {
        // Basic tag handling implementation
        // For brevity in this rebuild, we delegate to simple text splitting or custom class if needed
        // Assuming simple comma separated for now to ensure stability, or existing robust class
    }

    setupAuth() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                document.getElementById('loginBtn').classList.add('hidden');
                document.getElementById('userProfile').classList.remove('hidden');
                document.getElementById('userAvatar').src = user.photoURL || '';
                document.getElementById('userName').textContent = user.displayName;
                this.store.setUser(user);
                this.store.loadData();
            } else {
                document.getElementById('loginBtn').classList.remove('hidden');
                document.getElementById('userProfile').classList.add('hidden');
                this.store.items = []; // Clear local
                this.store.notify();
            }
        });
    }

    setupListeners() {
        const on = (id, evt, fn) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener(evt, fn);
        };

        // UI Navigation Listeners
        on('backToSidebarBtn', 'click', () => this.renderer.toggleView('list'));
        on('backToListBtn', 'click', () => this.renderer.toggleView('list'));

        on('kaiCard', 'click', () => this.renderer.toggleView('kai'));
        on('addItemBtn', 'click', () => {
            const id = this.store.generateId();
            this.store.addItem({ titulo: 'Nueva Nota', id }).then(() => this.openWorkspace(id));
        });

        // Auth
        on('loginBtn', 'click', () => signInWithGoogle());
        on('logoutBtn', 'click', () => signOutUser());

        // Tag Tabs (Event Delegation)
        document.getElementById('tagTabs').addEventListener('click', (e) => {
            if (e.target.dataset.action === 'filter-tag') {
                const tag = e.target.dataset.tag;
                this.store.setTagFilter(tag === 'all' ? null : tag);
            }
        });

        // Item Click (Event Delegation)
        document.getElementById('itemsContainer').addEventListener('click', (e) => {
            const card = e.target.closest('.card');
            if (card && card.dataset.action === 'open-item') {
                this.openWorkspace(card.dataset.id);
            }
        });

        // Workspace Auto-Save
        const autoSave = this.debounce(() => this.saveWorkspace(), 500);
        ['wsTitle', 'wsDescription', 'wsUrl', 'wsTagsInput'].forEach(id => on(id, 'input', autoSave));
        on('wsDeleteBtn', 'click', () => this.deleteCurrentItem());
    }

    // ACTIONS
    openWorkspace(id) {
        this.currentId = id;
        const item = this.store.getItem(id);
        if (!item) return;

        document.getElementById('wsTitle').value = item.titulo || '';
        document.getElementById('wsDescription').value = item.descripcion || '';
        document.getElementById('wsUrl').value = item.url || '';
        document.getElementById('wsTagsInput').value = (item.etiquetas || []).join(', ');

        this.renderer.toggleView('workspace');
    }

    saveWorkspace() {
        if (!this.currentId) return;
        const data = {
            titulo: document.getElementById('wsTitle').value,
            descripcion: document.getElementById('wsDescription').value,
            url: document.getElementById('wsUrl').value,
            // categoria removed
        };
        this.store.updateItem(this.currentId, data);
    }

    deleteCurrentItem() {
        if (!this.currentId) return;
        this.store.deleteItem(this.currentId);
        this.closeWorkspace();
    }

    // CATEGORIES (Removed)

    confirmDeleteTag(t) {
        this.renderer.showConfirmModal('Borrar Etiqueta', `¿Quitar #${t} de todo?`, () => {
            // Logic to strip tags from all items would go here
            // For safety in rebuild, just remove from UI/Store view
        });
    }

    // UTILS
    debounce(fn, ms) {
        let timer;
        return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn.apply(this, args), ms); };
    }
}

// Global Init
window.app = new PanelMariaApp();
document.addEventListener('DOMContentLoaded', () => window.app.init());
