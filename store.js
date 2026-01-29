
/*
================================================================================
|       PANEL MARÍA - STORE (Gestión de Datos y Estado)                        |
================================================================================
*/

import { auth } from './auth.js';

export class Store {
    constructor() {
        this.items = [];
        this.settings = {
            autoSaveVoice: false,
            theme: 'default',
            lastCategory: 'todos',
            customCategories: [],
            categoryTags: {}
        };
        this.user = null;
        this.filters = {
            search: '',
            tag: null,
            category: 'todos'
        };
        this.sortBy = 'recientes';

        // Obseravble pattern for subscribers (Renderer, App)
        this.listeners = [];
    }

    subscribe(listener) {
        this.listeners.push(listener);
    }

    notify() {
        this.listeners.forEach(listener => listener(this));
    }

    // --- User & Auth State ---

    setUser(user) {
        this.user = user;
        if (user) {
            window.storage.setAdapter('firebase', user.uid);
        } else {
            window.storage.setAdapter('local');
        }
    }

    // --- ID Generator (Proxy to storage) ---

    generateId() {
        return window.storage.generateId();
    }

    // --- Auto-Save Wrappers ---
    // The Store orchestrates the storage calls but maintains the in-memory state source of truth.

    async loadData() {
        try {
            const data = await window.storage.loadAll();
            this.items = data.items || [];
            this.settings = { ...this.settings, ...(data.settings || {}) };

            // Restore last category if valid
            if (this.settings.lastCategory) {
                this.filters.category = this.settings.lastCategory;
            }

            this.notify();
            return true;
        } catch (error) {
            console.error('Store: Error loading data', error);
            return false;
        }
    }

    async saveSettings() {
        try {
            await window.storage.saveAll({ settings: this.settings });
            // Should we notify on settings save? Only if it affects UI (like theme)
            // But usually theme is applied immediately. 
        } catch (error) {
            console.error('Store: Error saving settings', error);
        }
    }

    // --- CRUD Actions ---

    /**
     * Central method for all data mutations.
     * @param {Array<{type: 'add'|'update'|'delete', id?: string, data?: any}>} operations
     */
    async performUpdates(operations) {
        try {
            if (window.storage.adapter.type === 'local') {
                // Optimistic Local Update
                const newItems = await window.storage.performBatchUpdate(operations, this.items);
                this.items = newItems;
                await window.storage.saveAll({ items: this.items, settings: this.settings });
            } else {
                // Firebase: Wait for server (or local persistence)
                await window.storage.performBatchUpdate(operations);
                // Reload to sync state with what really happened
                await this.loadData();
            }
            this.notify(); // Re-render triggers here
        } catch (error) {
            console.error('Store: Error processing updates', error);
            throw error;
        }
    }

    async addItem(itemData) {
        const newItem = {
            ...itemData,
            id: this.generateId(),
            fecha_creacion: new Date().toISOString(),
            fecha_finalizacion: null,
            meta: itemData.meta || {}
        };
        await this.performUpdates([{ type: 'add', data: newItem }]);
        return newItem;
    }

    async updateItem(id, updates) {
        await this.performUpdates([{ type: 'update', id, data: updates }]);
    }

    async deleteItem(id) {
        await this.performUpdates([{ type: 'delete', id }]);
    }

    async deleteItems(ids) {
        const operations = ids.map(id => ({ type: 'delete', id }));
        await this.performUpdates(operations);
    }

    async updateItems(ids, updates) {
        const operations = ids.map(id => ({ type: 'update', id, data: updates }));
        await this.performUpdates(operations);
    }

    // --- Filtering & Sorting Logic ---

    setCategory(category) {
        this.filters.category = category;
        this.filters.tag = null; // Reset tag filter on category change
        this.settings.lastCategory = category;
        this.saveSettings(); // Persist preference
        this.notify();
    }

    setSearch(term) {
        this.filters.search = term.toLowerCase();
        this.notify();
    }

    setTagFilter(tag) {
        this.filters.tag = this.filters.tag === tag ? null : tag; // Toggle
        this.notify();
    }

    setSort(sortBy) {
        this.sortBy = sortBy;
        this.notify();
    }

    /**
     * Returns the projected view of the data based on current filters.
     */
    getFilteredItems() {
        let items = [...this.items]; // Copy

        // 1. Category Filter
        if (this.filters.category !== 'todos') {
            items = items.filter(item => item.categoria.toLowerCase() === this.filters.category.toLowerCase());
        }

        // 2. Search Filter
        if (this.filters.search) {
            const term = this.filters.search;
            items = items.filter(item =>
                (item.titulo || '').toLowerCase().includes(term) ||
                (item.descripcion || '').toLowerCase().includes(term) ||
                (item.etiquetas || []).some(tag => tag.toLowerCase().includes(term)) ||
                (item.url || '').toLowerCase().includes(term)
            );
        }

        // 3. Tag Filter
        if (this.filters.tag) {
            const tagFilter = this.filters.tag.toLowerCase();
            items = items.filter(item => (item.etiquetas || []).some(t => t.toLowerCase() === tagFilter));
        }

        // 4. Sorting
        return items.sort((a, b) => {
            // Pinned items always on top
            if (a.anclado !== b.anclado) return a.anclado ? -1 : 1;

            switch (this.sortBy) {
                case 'recientes':
                    return new Date(b.fecha_creacion || 0) - new Date(a.fecha_creacion || 0);
                case 'antiguos':
                    return new Date(a.fecha_creacion || 0) - new Date(b.fecha_creacion || 0);
                case 'titulo-asc':
                    return (a.titulo || '').localeCompare(b.titulo || '');
                case 'titulo-desc':
                    return (b.titulo || '').localeCompare(a.titulo || '');
                default:
                    return 0;
            }
        });
    }

    /**
     * Aggregates all unique tags from items + settings.
     */
    getAllTags() {
        const allTags = new Set();
        this.items.forEach(item => (item.etiquetas || []).forEach(tag => allTags.add(tag)));
        Object.values(this.settings.categoryTags || {}).forEach(tags => tags.forEach(tag => allTags.add(tag)));
        return allTags;
    }

    getItem(id) {
        return this.items.find(i => i.id === id);
    }
}
