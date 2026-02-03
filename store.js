/*
================================================================================
|       PANEL MARÍA - STORE (Tag-Based Architecture v3.1)                      |
================================================================================
*/

import { auth } from './auth.js';

export class Store {
    constructor() {
        this.items = [];
        this.settings = {
            autoSaveVoice: false,
            theme: 'default'
        };
        this.user = null;
        this.filters = {
            search: '',
            tag: null,
            tipo: null,
            estado: null
        };
        this.sortBy = 'recientes';
        this.listeners = [];
    }

    subscribe(listener) { this.listeners.push(listener); }
    notify() { this.listeners.forEach(l => l(this)); }

    setUser(user) {
        this.user = user;
        window.storage.setAdapter(user ? 'firebase' : 'local', user ? user.uid : null);
    }

    generateId() { return window.storage.generateId(); }

    async loadData() {
        try {
            const data = await window.storage.loadAll();
            // Data Normalization & Migration (Category -> Tag)
            this.items = (data.items || []).map(item => {
                const tags = new Set(Array.isArray(item.etiquetas) ? item.etiquetas : []);

                // MIGRATION: Convert legacy category to tag
                if (item.categoria && item.categoria !== 'todos' && item.categoria !== '__new_category__') {
                    tags.add(item.categoria.toLowerCase());
                }

                return {
                    ...item,
                    id: item.id,
                    titulo: item.titulo || 'Sin Título',
                    descripcion: item.descripcion || '',
                    tipo: item.tipo || item.categoria || 'chispa', // Map legacy or default
                    categoria: item.categoria || 'general',
                    estado: item.estado || 'planeacion',
                    etiquetas: Array.from(tags),
                    tareas: Array.isArray(item.tareas) ? item.tareas : [],
                    anclado: !!item.anclado,
                    url: item.url || '',
                    fecha_creacion: item.fecha_creacion || new Date().toISOString(),
                    fecha_finalizacion: item.fecha_finalizacion || null
                };
            });

            this.settings = { ...this.settings, ...(data.settings || {}) };
            this.notify();
            return true;
        } catch (error) {
            console.error('Store: Error loading', error);
            return false;
        }
    }

    async saveSettings() {
        await window.storage.saveAll({ settings: this.settings });
    }

    // --- CRUD ---
    async performUpdates(operations) {
        try {
            if (window.storage.adapter.type === 'local') {
                this.items = await window.storage.performBatchUpdate(operations, this.items);
                await window.storage.saveAll({ items: this.items, settings: this.settings });
            } else {
                await window.storage.performBatchUpdate(operations);
                await this.loadData();
            }
            this.notify();
        } catch (e) { console.error(e); }
    }

    async addItem(data) {
        // Ensure new items use the tag logic
        const newItem = {
            ...data,
            id: this.generateId(),
            fecha_creacion: new Date().toISOString(),
            tipo: data.tipo || 'chispa',
            estado: data.estado || 'planeacion',
            categoria: data.categoria || 'general'
        };
        await this.performUpdates([{ type: 'add', data: newItem }]);
    }

    async updateItem(id, data) { await this.performUpdates([{ type: 'update', id, data }]); }
    async deleteItem(id) { await this.performUpdates([{ type: 'delete', id }]); }

    // --- Filters ---

    // Legacy support: setCategory is dead or just resets
    setCategory(c) {
        // No-op or clear filters
        this.filters.tag = null;
        this.notify();
    }

    setSearch(term) { this.filters.search = term.toLowerCase(); this.notify(); }
    setTagFilter(tag) { this.filters.tag = this.filters.tag === tag ? null : tag; this.notify(); }
    setTipoFilter(tipo) { this.filters.tipo = this.filters.tipo === tipo ? null : tipo; this.notify(); }
    setEstadoFilter(estado) { this.filters.estado = this.filters.estado === estado ? null : estado; this.notify(); }
    setSort(s) { this.sortBy = s; this.notify(); }

    getFilteredItems() {
        let items = [...this.items];

        // 1. Search
        if (this.filters.search) {
            const t = this.filters.search;
            items = items.filter(i =>
                (i.titulo || '').toLowerCase().includes(t) ||
                (i.descripcion || '').toLowerCase().includes(t) ||
                (i.etiquetas || []).some(tag => tag.toLowerCase().includes(t))
            );
        }

        // 2. Tag Filter
        if (this.filters.tag) {
            const t = this.filters.tag.toLowerCase();
            items = items.filter(i => (i.etiquetas || []).some(tag => tag.toLowerCase() === t));
        }

        // 3. Tipo Filter
        if (this.filters.tipo) {
            items = items.filter(i => i.tipo === this.filters.tipo);
        }

        // 4. Estado Filter
        if (this.filters.estado) {
            items = items.filter(i => i.estado === this.filters.estado);
        }

        return items.sort((a, b) => {
            if (a.anclado !== b.anclado) return a.anclado ? -1 : 1;
            return new Date(b.fecha_creacion || 0) - new Date(a.fecha_creacion || 0);
        });
    }

    getAllTags() {
        const tags = new Set();
        this.items.forEach(i => (i.etiquetas || []).forEach(t => tags.add(t)));
        return tags;
    }

    getItem(id) { return this.items.find(i => i.id === id); }
}
