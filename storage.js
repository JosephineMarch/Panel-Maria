/*
================================================================================
|       PANEL DE CONTROL UNIFICADO - MÓDULO DE ALMACENAMIENTO (STORAGE)         |
================================================================================
*/

// Clase base para adaptadores de almacenamiento (Define la interfaz)
class StorageAdapter {
    async loadData() {
        throw new Error('loadData must be implemented');
    }
    async saveData(data) {
        throw new Error('saveData must be implemented');
    }
}

// Adaptador para LocalStorage
class LocalStorageAdapter extends StorageAdapter {
    constructor() {
        super();
        this.storageKey = 'panelControlUnificadoData';
    }

    async loadData() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (!data) {
                // Si no hay datos, devuelve la estructura por defecto
                return {
                    items: [],
                    settings: { autoSaveVoice: true }
                };
            }
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading data from localStorage:', error);
            // En caso de error, devuelve la estructura por defecto para evitar crashes
            return {
                items: [],
                settings: { autoSaveVoice: true }
            };
        }
    }

    async saveData(data) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving data to localStorage:', error);
            return false;
        }
    }
}

// Adaptador para Firebase (Implementación futura)
class FirebaseAdapter extends StorageAdapter {
    constructor(config) {
        super();
        console.warn('Firebase adapter is not implemented yet.');
        // Aquí se inicializaría Firebase: this.db = firebase.firestore();
    }
    async loadData() {
        throw new Error('Firebase adapter not implemented yet');
    }
    async saveData(data) {
        throw new Error('Firebase adapter not implemented yet');
    }
}

// --- Clase Principal de Almacenamiento ---
// Usa el patrón Adapter para cambiar fácilmente entre LocalStorage y Firebase.
class Storage {
    constructor(mode = 'local') {
        this.setAdapter(mode);
    }

    setAdapter(mode, config = null) {
        if (mode === 'local') {
            this.adapter = new LocalStorageAdapter();
        } else if (mode === 'firebase') {
            if (!config) throw new Error('Firebase config required for firebase mode');
            this.adapter = new FirebaseAdapter(config);
        } else {
            throw new Error(`Unknown storage mode: ${mode}`);
        }
    }

    // --- Funciones CRUD ---

    async loadAll() {
        return await this.adapter.loadData();
    }

    async saveAll(data) {
        return await this.adapter.saveData(data);
    }

    async addItem(item) {
        const data = await this.loadAll();
        
        const newItem = {
            ...item,
            id: this.generateId(),
            fecha_creacion: new Date().toISOString(),
            fecha_finalizacion: item.fecha_finalizacion || null,
            anclado: item.anclado || false,
            etiquetas: item.etiquetas || [],
            tareas: item.tareas || [],
            archivos_adjuntos: item.archivos_adjuntos || [],
            meta: item.meta || {}
        };

        data.items.push(newItem);
        await this.saveAll(data);
        return newItem;
    }

    async updateItem(id, partialUpdate) {
        const data = await this.loadAll();
        const itemIndex = data.items.findIndex(item => item.id === id);

        if (itemIndex === -1) {
            throw new Error(`Item with id ${id} not found`);
        }

        data.items[itemIndex] = { ...data.items[itemIndex], ...partialUpdate };
        await this.saveAll(data);
        return data.items[itemIndex];
    }

    async deleteItem(id) {
        const data = await this.loadAll();
        const initialLength = data.items.length;
        data.items = data.items.filter(item => item.id !== id);

        if (data.items.length === initialLength) {
            throw new Error(`Item with id ${id} not found for deletion`);
        }

        await this.saveAll(data);
        return true;
    }

    async query(filters = {}) {
        const { items } = await this.loadAll();
        let filteredItems = [...items];

        // Filtrar por categoría
        if (filters.categoria && filters.categoria !== 'todos') {
            filteredItems = filteredItems.filter(item => item.categoria === filters.categoria);
        }

        // ... aquí se podrían añadir más filtros (ej: por etiqueta, por texto)

        // Ordenar: anclados primero, luego por fecha de creación descendente
        filteredItems.sort((a, b) => {
            if (a.anclado && !b.anclado) return -1;
            if (!a.anclado && b.anclado) return 1;
            return new Date(b.fecha_creacion) - new Date(a.fecha_creacion);
        });

        return filteredItems;
    }
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    // --- Funciones de Lógica de Negocio ---

    async convertToLogro(id) {
        const data = await this.loadAll();
        const itemIndex = data.items.findIndex(item => item.id === id);

        if (itemIndex === -1) {
            throw new Error(`Item with id ${id} not found`);
        }

        data.items[itemIndex].categoria = 'logro';
        data.items[itemIndex].fecha_finalizacion = new Date().toISOString();
        
        await this.saveAll(data);
        return data.items[itemIndex];
    }

    // --- Funciones de Importar/Exportar ---

    async exportData() {
        const data = await this.loadAll();
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `panel_maria_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (data && data.items && data.settings) {
                        await this.saveAll(data);
                        resolve();
                    } else {
                        reject(new Error('Estructura de JSON inválida'));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
        });
    }
    
    // --- Funciones de Configuración ---
    
    async getSettings() {
        const data = await this.loadAll();
        return data.settings || {};
    }

    async saveSettings(settings) {
        const data = await this.loadAll();
        data.settings = settings;
        await this.saveAll(data);
    }
}

// Instancia global del almacenamiento para ser usada en toda la aplicación
const storage = new Storage('local');

// Exportar para uso en otros módulos si se usara un sistema de módulos,
// o adjuntar a window para acceso global simple.
window.storage = storage;
