
/*
================================================================================
|       PANEL MARÍA - APP ORCHESTRATOR (CORE v2.1)                             |
================================================================================
*/

import { Store } from './store.js';
import { Renderer } from './renderer.js';
import { initChat } from './chat.js';
import { auth, onAuthStateChanged, signInWithGoogle, signOutUser } from './auth.js';

// --- Helper: TagInput Class ---
class TagInput {
    constructor(container, allTagsProvider) {
        this.container = container;
        this.input = this.container.querySelector('.tags-input-field');
        this.suggestionsContainer = this.container.parentElement.querySelector('.tag-suggestions');
        this.allTagsProvider = allTagsProvider;
        this.activeTags = new Set();
        this.setupEventListeners();
    }
    setupEventListeners() {
        this.container.addEventListener('click', () => this.input.focus());
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); if (this.input.value.trim()) this.addTag(this.input.value.trim()); }
            else if (e.key === 'Backspace' && this.input.value === '') { this.removeTag(Array.from(this.activeTags).pop()); }
        });
        this.input.addEventListener('input', () => this.renderSuggestions());
        this.suggestionsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('tag-suggestion')) this.addTag(e.target.dataset.tag);
        });
        this.container.addEventListener('click', (e) => {
            const removeButton = e.target.closest('.tag-remove');
            if (removeButton) { e.stopPropagation(); this.removeTag(removeButton.dataset.tag); }
        });
    }
    getTags() { return Array.from(this.activeTags); }
    setTags(tags = []) { this.activeTags = new Set(tags.map(t => t.toLowerCase())); this.render(); }
    addTag(tag) {
        const normalizedTag = tag.toLowerCase().trim();
        if (normalizedTag && !this.activeTags.has(normalizedTag)) {
            this.activeTags.add(normalizedTag);
            this.input.value = ''; this.render(); this.renderSuggestions(); this.input.focus();
        }
    }
    removeTag(tag) { if (!tag) return; this.activeTags.delete(tag.toLowerCase()); this.render(); this.renderSuggestions(); }
    render() {
        Array.from(this.container.querySelectorAll('.tag-pill')).forEach(pill => pill.remove());
        this.activeTags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'tag-pill';
            tagElement.innerHTML = `${tag.charAt(0).toUpperCase() + tag.slice(1)} <span class="tag-remove" data-tag="${tag}">&times;</span>`;
            this.container.insertBefore(tagElement, this.input);
        });
    }
    renderSuggestions() {
        this.suggestionsContainer.innerHTML = '';
        const allTags = this.allTagsProvider();
        const inputValue = this.input.value.toLowerCase();
        if (!inputValue) return;
        const filtered = Array.from(allTags).filter(tag => tag.toLowerCase().includes(inputValue) && !this.activeTags.has(tag.toLowerCase()));
        filtered.slice(0, 10).forEach(tag => {
            const span = document.createElement('span');
            span.className = 'tag-suggestion'; span.dataset.tag = tag; span.textContent = tag.charAt(0).toUpperCase() + tag.slice(1);
            this.suggestionsContainer.appendChild(span);
        });
    }
}

// --- Main Application Class ---
class PanelMariaApp {
    constructor() {
        this.store = new Store();
        this.renderer = new Renderer(this);
        this.selectedItems = new Set();
        this.modalTagInput = null;
        this.bulkTagInput = null;

        // Subscribe Renderer to Store updates
        this.store.subscribe((storeInstance) => {
            this.renderer.render(storeInstance, this.selectedItems);
            // Also apply theme if settings changed
            this.renderer.applyTheme(storeInstance.settings.theme);
        });

        console.log('App: Initialized (Modular v2.1)');
    }

    async init() {
        this.setupComponents();
        this.setupEventListeners();
        initChat(this);
        this.setupAuthListener();
        this.checkForUrlData();
    }

    setupComponents() {
        this.modalTagInput = new TagInput(document.getElementById('itemTagsWrapper'), () => this.store.getAllTags());
        this.bulkTagInput = new TagInput(document.getElementById('bulkTagsWrapper'), () => this.store.getAllTags());

        // Sidebar
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('toggleSidebarBtn');
        const closeBtn = document.getElementById('closeSidebarBtn');
        if (toggleBtn) toggleBtn.addEventListener('click', () => {
            if (window.innerWidth <= 768) sidebar.classList.toggle('open'); else sidebar.classList.toggle('hidden');
        });
        if (closeBtn) closeBtn.addEventListener('click', () => sidebar.classList.remove('open'));
    }

    setupAuthListener() {
        onAuthStateChanged(auth, (user) => {
            const elements = {
                loginBtn: document.getElementById('loginBtn'),
                logoutBtn: document.getElementById('logoutBtn'),
                userProfile: document.getElementById('userProfile'),
                userAvatar: document.getElementById('userAvatar'),
                userName: document.getElementById('userName')
            };

            if (user) {
                elements.loginBtn.classList.add('hidden');
                elements.logoutBtn.classList.remove('hidden');
                elements.userProfile.classList.remove('hidden');
                if (user.photoURL) elements.userAvatar.src = user.photoURL;
                if (user.displayName) elements.userName.textContent = user.displayName.split(' ')[0];
                this.showToast(`Hola, ${user.displayName || 'Viajero'} 👋`, 'success');
            } else {
                elements.loginBtn.classList.remove('hidden');
                elements.logoutBtn.classList.add('hidden');
                elements.userProfile.classList.add('hidden');
            }

            this.store.setUser(user);
            document.getElementById('loader').classList.remove('hidden');
            this.store.loadData()
                .then(() => this.processUrlData())
                .finally(() => document.getElementById('loader').classList.add('hidden'));
        });
    }

    // --- Core Action Wrapper ---
    async performItemUpdates(operations) {
        document.getElementById('loader').classList.remove('hidden');
        try {
            await this.store.performUpdates(operations);
            this.selectedItems.clear();
        } catch (e) {
            console.error(e);
            this.showToast('Error en la operación', 'error');
        } finally {
            document.getElementById('loader').classList.add('hidden');
        }
    }

    // --- Logic & Event Handling ---

    addSafeListener(id, event, handler) {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, handler);
        // else console.warn(`App: Element ${id} missing.`);
    }

    setupEventListeners() {
        // Auth
        this.addSafeListener('loginBtn', 'click', () => signInWithGoogle().catch(e => this.showToast('Error login', 'error')));
        this.addSafeListener('logoutBtn', 'click', () => signOutUser().catch(e => this.showToast('Error logout', 'error')));

        // Main Modals
        this.addSafeListener('addItemBtn', 'click', () => this.openModal());
        this.addSafeListener('emptyStateAddBtn', 'click', () => this.openModal());
        this.addSafeListener('closeModalBtn', 'click', () => this.closeModal());
        this.addSafeListener('cancelBtn', 'click', () => this.closeModal());

        // Settings
        this.addSafeListener('settingsBtn', 'click', () => this.openSettingsModal());
        this.addSafeListener('settingsCloseBtn', 'click', () => this.closeSettingsModal());
        this.addSafeListener('autoSaveVoice', 'change', (e) => { this.store.settings.autoSaveVoice = e.target.checked; this.store.saveSettings(); });
        this.addSafeListener('themeSelect', 'change', (e) => { this.store.settings.theme = e.target.value; this.store.saveSettings(); this.renderer.applyTheme(e.target.value); });

        // Import/Export
        this.addSafeListener('exportDataBtn', 'click', () => window.storage.exportData());
        this.addSafeListener('importDataBtn', 'click', () => document.getElementById('importFile').click());
        this.addSafeListener('importFile', 'change', (e) => this.handleImportFile(e));

        // Item Form
        this.addSafeListener('itemForm', 'submit', (e) => this.handleFormSubmit(e));
        this.addSafeListener('addTaskBtn', 'click', () => this.renderer.addTaskField());
        this.addSafeListener('itemCategory', 'change', (e) => this.renderer.toggleNewCategoryInput(e.target.value));

        // Custom Categories
        this.addSafeListener('newCategoryCreateBtn', 'click', () => this.addCustomCategory(document.getElementById('newCategoryNameInput').value));
        this.addSafeListener('newCategoryCloseBtn', 'click', () => document.getElementById('newCategoryModal').classList.add('hidden'));
        this.addSafeListener('newCategoryCancelBtn', 'click', () => document.getElementById('newCategoryModal').classList.add('hidden'));

        // Confirm Modal
        this.addSafeListener('confirmCancelBtn', 'click', () => this.renderer.closeConfirmModal());
        // confirmOkBtn is handled dynamically in renderer.showConfirmModal

        // Filters
        this.addSafeListener('searchInput', 'input', (e) => setTimeout(() => this.store.setSearch(e.target.value), 300));
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', () => this.store.setCategory(chip.dataset.category || 'todos'));
        });
        this.addSafeListener('sortSelect', 'change', (e) => this.store.setSort(e.target.value));

        // Bulk
        this.addSafeListener('selectAllCheckbox', 'change', (e) => this.toggleSelectAll(e.target.checked));
        this.addSafeListener('bulkChangeCategoryBtn', 'click', () => this.openBulkCategoryModal());
        this.addSafeListener('bulkChangeTagsBtn', 'click', () => this.openBulkTagsModal());
        this.addSafeListener('bulkPinBtn', 'click', () => this.bulkTogglePinned());
        this.addSafeListener('bulkDeleteBtn', 'click', () => this.confirmBulkDelete());

        // Bulk Modals
        this.addSafeListener('bulkCategoryOkBtn', 'click', () => this.handleBulkChangeCategory());
        this.addSafeListener('bulkCategoryCancelBtn', 'click', () => document.getElementById('bulkCategoryModal').classList.add('hidden'));
        this.addSafeListener('bulkCategoryCloseBtn', 'click', () => document.getElementById('bulkCategoryModal').classList.add('hidden'));

        this.addSafeListener('bulkTagsOkBtn', 'click', () => this.handleBulkChangeTags());
        this.addSafeListener('bulkTagsCancelBtn', 'click', () => document.getElementById('bulkTagsModal').classList.add('hidden'));
        this.addSafeListener('bulkTagsCloseBtn', 'click', () => document.getElementById('bulkTagsModal').classList.add('hidden'));

        // Grid delegation
        document.getElementById('itemsContainer').addEventListener('click', (e) => this.handleGridClick(e));

        // Shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.closeSettingsModal();
            }
        });
    }

    // --- Grid Logic ---
    handleGridClick(e) {
        const actionEl = e.target.closest('[data-action]');
        if (!actionEl) return;
        const card = actionEl.closest('.card');
        const id = card ? card.dataset.id : null;
        if (actionEl.dataset.action !== 'handle-card-click') e.stopPropagation();

        switch (actionEl.dataset.action) {
            case 'handle-card-click': this.openModal(id); break;
            case 'toggle-pinned':
                if (id) { const i = this.store.getItem(id); if (i) this.store.updateItem(id, { anclado: !i.anclado }); }
                break;
            case 'toggle-task':
                const taskId = actionEl.dataset.taskId;
                if (id && taskId) this.toggleTask(id, taskId);
                break;
        }
    }

    async toggleTask(itemId, taskId) {
        const item = this.store.getItem(itemId);
        if (item) {
            const newTasks = item.tareas.map(t => t.id === taskId ? { ...t, completado: !t.completado } : t);
            await this.store.updateItem(itemId, { tareas: newTasks });
        }
    }

    toggleSelectAll(checked) {
        if (checked) {
            const visible = this.store.getFilteredItems();
            visible.forEach(i => this.selectedItems.add(i.id));
        } else {
            this.selectedItems.clear();
        }
        this.store.notify();
    }

    // --- Modal Logic ---
    openModal(id = null) {
        this.renderer.clearItemModal();
        if (id) {
            const item = this.store.getItem(id);
            if (item) {
                this.renderer.populateItemModal(item);
                this.modalTagInput.setTags(item.etiquetas);
                document.getElementById('modalTitle').textContent = 'Editar Elemento';
                this.currentEditId = id;
            }
        } else {
            document.getElementById('modalTitle').textContent = 'Nuevo Elemento';
            this.currentEditId = null;
            this.modalTagInput.setTags([]);
        }
        document.getElementById('itemModal').classList.remove('hidden');
    }

    closeModal() {
        document.getElementById('itemModal').classList.add('hidden');
        this.currentEditId = null;
    }

    async handleFormSubmit(e) {
        e.preventDefault();

        // Handle new category creation from modal
        let finalCategory = document.getElementById('itemCategory').value;
        if (finalCategory === '__new_category__') {
            const newCatName = document.getElementById('newItemCategory').value.trim();
            if (!newCatName) { this.showToast('Nombre de categoría inválido', 'error'); return; }
            finalCategory = newCatName.toLowerCase();
            this.addCustomCategoryInternal(finalCategory); // Add to store without reload
        }

        const formData = {
            titulo: document.getElementById('itemTitle').value.trim(),
            descripcion: document.getElementById('itemDescription').value.trim(),
            url: document.getElementById('itemUrl').value.trim(),
            categoria: finalCategory,
            etiquetas: this.modalTagInput.getTags(),
            anclado: document.getElementById('itemPinned').checked,
            tareas: Array.from(document.querySelectorAll('.task-item')).map(div => ({
                titulo: div.querySelector('.task-input').value,
                completado: div.querySelector('.task-checkbox').checked,
                id: div.querySelector('.task-checkbox').dataset.id || this.store.generateId() // Ensure task ID
            })).filter(t => t.titulo)
        };

        if (!formData.titulo) { this.showToast('Título requerido', 'error'); return; }

        if (this.currentEditId) {
            await this.store.updateItem(this.currentEditId, formData);
        } else {
            await this.store.addItem(formData);
        }
        this.closeModal();
        this.showToast('Guardado', 'success');
    }

    // --- Settings & Categories Logic ---

    openSettingsModal() {
        document.getElementById('autoSaveVoice').checked = this.store.settings.autoSaveVoice;
        document.getElementById('themeSelect').value = this.store.settings.theme;
        this.renderer.renderCustomCategories(this.store.settings.customCategories);
        this.renderer.renderGlobalTags(this.store.getAllTags()); // Pass all tags
        document.getElementById('settingsModal').classList.remove('hidden');
    }
    closeSettingsModal() { document.getElementById('settingsModal').classList.add('hidden'); }

    // Callback used by Renderer
    confirmDeleteCategory(category) {
        this.renderer.showConfirmModal(
            'Eliminar Categoría',
            `¿Borrar categoría "${category}"? Los elementos irán a Directorio.`,
            () => this.deleteCustomCategory(category)
        );
    }

    // Callback used by Renderer
    confirmDeleteTag(tag) {
        this.renderer.showConfirmModal(
            'Eliminar Etiqueta',
            `¿Borrar etiqueta "${tag}" de todos los elementos?`,
            () => this.deleteGlobalTag(tag)
        );
    }

    async addCustomCategory(name) {
        if (!name) return;
        this.addCustomCategoryInternal(name);
        this.store.saveSettings(); // Persist
        document.getElementById('newCategoryModal').classList.add('hidden');
        this.showToast('Categoría creada', 'success');
        // Refresh selectors
        this.renderer.populateCategorySelector(document.getElementById('itemCategory'), true);
        this.renderer.populateCategorySelector(document.getElementById('bulkCategorySelector'));
    }

    addCustomCategoryInternal(name) {
        const n = name.toLowerCase().trim();
        if (!this.store.settings.customCategories.includes(n)) {
            this.store.settings.customCategories.push(n);
        }
    }

    async deleteCustomCategory(category) {
        // 1. Remove from settings
        this.store.settings.customCategories = this.store.settings.customCategories.filter(c => c !== category);

        // 2. Move items to 'directorio'
        const itemsToMove = this.store.items.filter(i => i.categoria === category);
        const operations = itemsToMove.map(i => ({ type: 'update', id: i.id, data: { categoria: 'directorio' } }));

        // 3. Save
        await this.store.saveSettings();
        if (operations.length > 0) await this.store.performUpdates(operations);

        this.showToast('Categoría eliminada', 'success');
        this.openSettingsModal(); // Refresh list
    }

    async deleteGlobalTag(tag) {
        const itemsWithTag = this.store.items.filter(i => i.etiquetas && i.etiquetas.includes(tag));
        const operations = itemsWithTag.map(i => ({
            type: 'update',
            id: i.id,
            data: { etiquetas: i.etiquetas.filter(t => t !== tag) }
        }));

        if (operations.length > 0) await this.store.performUpdates(operations);
        this.showToast('Etiqueta eliminada', 'success');
        this.openSettingsModal(); // Refresh list
    }

    // --- Bulk Logic ---
    openBulkCategoryModal() {
        this.renderer.populateCategorySelector(document.getElementById('bulkCategorySelector'));
        document.getElementById('bulkCategoryModal').classList.remove('hidden');
    }
    openBulkTagsModal() {
        this.bulkTagInput.setTags([]);
        document.getElementById('bulkTagsModal').classList.remove('hidden');
    }

    async handleBulkChangeCategory() {
        const cat = document.getElementById('bulkCategorySelector').value;
        const ops = Array.from(this.selectedItems).map(id => ({ type: 'update', id, data: { categoria: cat } }));
        await this.performItemUpdates(ops);
        document.getElementById('bulkCategoryModal').classList.add('hidden');
    }

    async handleBulkChangeTags() {
        const tags = this.bulkTagInput.getTags();
        const ops = Array.from(this.selectedItems).map(id => ({ type: 'update', id, data: { etiquetas: tags } }));
        await this.performItemUpdates(ops);
        document.getElementById('bulkTagsModal').classList.add('hidden');
    }

    async bulkTogglePinned() {
        const first = this.store.getItem([...this.selectedItems][0]);
        const target = !first.anclado;
        const ops = Array.from(this.selectedItems).map(id => ({ type: 'update', id, data: { anclado: target } }));
        await this.performItemUpdates(ops);
    }

    confirmBulkDelete() {
        this.renderer.showConfirmModal(
            'Eliminar Elementos',
            `¿Borrar ${this.selectedItems.size} elementos seleccionados?`,
            () => {
                const ops = Array.from(this.selectedItems).map(id => ({ type: 'delete', id }));
                this.performItemUpdates(ops);
            }
        );
    }

    // --- Import / URL --- 
    checkForUrlData() {
        const params = new URLSearchParams(window.location.search);
        if (params.has('title') || params.has('text') || params.has('url')) {
            this.pendingShare = {
                title: params.get('title'),
                text: params.get('text'),
                url: params.get('url')
            };
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    async processUrlData() {
        if (!this.pendingShare) return;
        this.openModal();
        document.getElementById('itemTitle').value = this.pendingShare.title || '';
        document.getElementById('itemDescription').value = this.pendingShare.text || '';
        document.getElementById('itemUrl').value = this.pendingShare.url || '';
        this.pendingShare = null;
    }

    async handleImportFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.showToast('Procesando archivo...', 'info');
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target.result;
                let importedData = [];

                if (file.name.endsWith('.json')) {
                    const json = JSON.parse(content);
                    importedData = Array.isArray(json) ? json : (json.items || []);
                } else if (file.name.endsWith('.html')) {
                    // Simple HTML Bookmark parser
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(content, 'text/html');
                    doc.querySelectorAll('a').forEach(a => {
                        importedData.push({
                            titulo: a.textContent,
                            url: a.href,
                            categoria: 'directorio',
                            fecha_creacion: new Date().toISOString()
                        });
                    });
                }

                if (importedData.length > 0) {
                    // Batch Add
                    const ops = importedData.map(d => ({
                        type: 'add',
                        data: {
                            ...d,
                            id: this.store.generateId(),
                            meta: {},
                            tareas: [],
                            etiquetas: [] // Simplified for robustness
                        }
                    }));
                    await this.store.performUpdates(ops);
                    this.showToast(`Importados ${importedData.length} elementos`, 'success');
                } else {
                    this.showToast('No se encontraron datos válidos', 'error');
                }
            } catch (err) {
                console.error(err);
                this.showToast('Error al importar', 'error');
            }
        };
        reader.readAsText(file);
    }

    showToast(msg, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.textContent = msg;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new PanelMariaApp();
    window.app.init();
});
