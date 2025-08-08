/*
================================================================================
|       PANEL MARÍA - SISTEMA DE ALMACENAMIENTO CON PATRÓN ADAPTER              |
================================================================================
*/

// Esquema de datos unificado según requerimientos
const ITEM_SCHEMA = {
    id: "string",                // UID interno (no visible)
    modulo: "string",            // "directorio" | "idea" | "proyecto" | "logro"
    titulo: "string",
    descripcion: "string",       // opt
    categorias: ["string"],      // array (puede ser vacío)
    anclado: true | false,
    fecha_creacion: "ISO8601",
    fecha_finalizacion: "ISO8601|null",
    estado_historial: [          // array opcional, para proyectos principalmente
        { "estado":"pendiente|en_proceso|completado", "fecha":"ISO8601" }
    ],
    tareas: [                    // siempre existe (puede estar vacía)
        { "id":"string", "titulo":"string", "completado": true|false }
    ],
    urls: ["string"],            // multiples URLs; visibles en Directorio
    archivos_adjuntos: [         // opt, guardado para futuro
        { "nombre":"string", "url":"string", "tipo":"string" }
    ],
    tema_modulo: "string",       // nombre del tema/color para CSS
    meta: { }                    // espacio para metadatos extensibles
};

// Clase base para adaptadores de almacenamiento
class StorageAdapter {
    async loadAll() {
        throw new Error('loadAll must be implemented');
    }
    
    async saveAll(items) {
        throw new Error('saveAll must be implemented');
    }
    
    async addItem(item) {
        throw new Error('addItem must be implemented');
    }
    
    async updateItem(id, partial) {
        throw new Error('updateItem must be implemented');
    }
    
    async deleteItem(id) {
        throw new Error('deleteItem must be implemented');
    }
    
    async query(filters) {
        throw new Error('query must be implemented');
    }
}

// Adaptador para LocalStorage
class LocalStorageAdapter extends StorageAdapter {
    constructor() {
        super();
        this.storageKey = 'panelMaria:data';
        this.settingsKey = 'panelMaria:settings';
    }
    
    async loadAll() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (!data) {
                return {
                    items: [],
                    settings: this.getDefaultSettings()
                };
            }
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading data from localStorage:', error);
            return {
                items: [],
                settings: this.getDefaultSettings()
            };
        }
    }
    
    async saveAll(data) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving data to localStorage:', error);
            return false;
        }
    }
    
    async addItem(item) {
        try {
            const data = await this.loadAll();
            
            // Generar ID único
            item.id = this.generateId();
            
            // Asignar fecha de creación si no existe
            if (!item.fecha_creacion) {
                item.fecha_creacion = new Date().toISOString();
            }
            
            // Inicializar arrays si no existen
            if (!item.categorias) item.categorias = [];
            if (!item.tareas) item.tareas = [];
            if (!item.urls) item.urls = [];
            if (!item.estado_historial) item.estado_historial = [];
            if (!item.archivos_adjuntos) item.archivos_adjuntos = [];
            if (!item.meta) item.meta = {};
            
            data.items.push(item);
            await this.saveAll(data);
            return item;
        } catch (error) {
            console.error('Error adding item:', error);
            throw error;
        }
    }
    
    async updateItem(id, partial) {
        try {
            const data = await this.loadAll();
            const index = data.items.findIndex(item => item.id === id);
            
            if (index === -1) {
                throw new Error(`Item with id ${id} not found`);
            }
            
            // Actualizar solo los campos proporcionados
            data.items[index] = { ...data.items[index], ...partial };
            
            await this.saveAll(data);
            return data.items[index];
        } catch (error) {
            console.error('Error updating item:', error);
            throw error;
        }
    }
    
    async deleteItem(id) {
        try {
            const data = await this.loadAll();
            const index = data.items.findIndex(item => item.id === id);
            
            if (index === -1) {
                throw new Error(`Item with id ${id} not found`);
            }
            
            data.items.splice(index, 1);
            await this.saveAll(data);
            return true;
        } catch (error) {
            console.error('Error deleting item:', error);
            throw error;
        }
    }
    
    async query(filters = {}) {
        try {
            const data = await this.loadAll();
            let items = [...data.items];
            
            // Filtrar por módulo
            if (filters.modulo) {
                items = items.filter(item => item.modulo === filters.modulo);
            }
            
            // Filtrar por categoría
            if (filters.categoria) {
                items = items.filter(item => 
                    item.categorias.some(cat => 
                        cat.toLowerCase().includes(filters.categoria.toLowerCase())
                    )
                );
            }
            
            // Filtrar por búsqueda de texto
            if (filters.search) {
                const searchTerm = filters.search.toLowerCase();
                items = items.filter(item => 
                    item.titulo.toLowerCase().includes(searchTerm) ||
                    item.descripcion.toLowerCase().includes(searchTerm) ||
                    item.categorias.some(cat => cat.toLowerCase().includes(searchTerm)) ||
                    item.urls.some(url => url.toLowerCase().includes(searchTerm))
                );
            }
            
            // Filtrar por anclado
            if (filters.anclado !== undefined) {
                items = items.filter(item => item.anclado === filters.anclado);
            }
            
            // Ordenar: anclados primero, luego por fecha de creación
            items.sort((a, b) => {
                if (a.anclado && !b.anclado) return -1;
                if (!a.anclado && b.anclado) return 1;
                return new Date(b.fecha_creacion) - new Date(a.fecha_creacion);
            });
            
            return items;
        } catch (error) {
            console.error('Error querying items:', error);
            return [];
        }
    }
    
    async getSettings() {
        try {
            const settings = localStorage.getItem(this.settingsKey);
            return settings ? JSON.parse(settings) : this.getDefaultSettings();
        } catch (error) {
            console.error('Error loading settings:', error);
            return this.getDefaultSettings();
        }
    }
    
    async saveSettings(settings) {
        try {
            localStorage.setItem(this.settingsKey, JSON.stringify(settings));
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
        }
    }
    
    getDefaultSettings() {
        return {
            autoSaveVoice: false,
            theme: 'default',
            lastModule: 'directorio'
        };
    }
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

// Adaptador para Firebase (placeholder)
class FirebaseAdapter extends StorageAdapter {
    constructor(config) {
        super();
        this.config = config;
        // Aquí se inicializaría Firebase
        // this.db = firebase.firestore();
    }
    
    async loadAll() {
        // Implementación para Firebase
        throw new Error('Firebase adapter not implemented yet');
    }
    
    async saveAll(data) {
        // Implementación para Firebase
        throw new Error('Firebase adapter not implemented yet');
    }
    
    async addItem(item) {
        // Implementación para Firebase
        throw new Error('Firebase adapter not implemented yet');
    }
    
    async updateItem(id, partial) {
        // Implementación para Firebase
        throw new Error('Firebase adapter not implemented yet');
    }
    
    async deleteItem(id) {
        // Implementación para Firebase
        throw new Error('Firebase adapter not implemented yet');
    }
    
    async query(filters) {
        // Implementación para Firebase
        throw new Error('Firebase adapter not implemented yet');
    }
}

// Clase principal de almacenamiento
class Storage {
    constructor() {
        this.mode = 'local'; // 'local' | 'firebase'
        this.adapter = new LocalStorageAdapter();
        this.debounceTimer = null;
    }
    
    setMode(mode, config = null) {
        this.mode = mode;
        
        switch (mode) {
            case 'local':
                this.adapter = new LocalStorageAdapter();
                break;
            case 'firebase':
                if (!config) {
                    throw new Error('Firebase config required');
                }
                this.adapter = new FirebaseAdapter(config);
                break;
            default:
                throw new Error(`Unknown storage mode: ${mode}`);
        }
    }
    
    // Métodos principales con debouncing para guardado
    async loadAll() {
        return await this.adapter.loadAll();
    }
    
    async saveAll(data) {
        // Debounce para evitar escrituras constantes
        clearTimeout(this.debounceTimer);
        return new Promise((resolve) => {
            this.debounceTimer = setTimeout(async () => {
                const result = await this.adapter.saveAll(data);
                resolve(result);
            }, 300);
        });
    }
    
    async addItem(item) {
        return await this.adapter.addItem(item);
    }
    
    async updateItem(id, partial) {
        return await this.adapter.updateItem(id, partial);
    }
    
    async deleteItem(id) {
        return await this.adapter.deleteItem(id);
    }
    
    async query(filters) {
        return await this.adapter.query(filters);
    }
    
    // Métodos específicos para conversiones
    async convertIdeaToProject(ideaId) {
        try {
            const data = await this.loadAll();
            const ideaIndex = data.items.findIndex(item => item.id === ideaId && item.modulo === 'idea');
            
            if (ideaIndex === -1) {
                throw new Error('Idea not found');
            }
            
            const idea = data.items[ideaIndex];
            
            // Crear nuevo proyecto
            const project = {
                ...idea,
                id: this.adapter.generateId(),
                modulo: 'proyecto',
                fecha_creacion: new Date().toISOString(),
                fecha_finalizacion: null,
                tareas: idea.tareas.length > 0 ? idea.tareas : [],
                estado_historial: [{ estado: 'pendiente', fecha: new Date().toISOString() }]
            };
            
            // Eliminar la idea original
            data.items.splice(ideaIndex, 1);
            
            // Agregar el proyecto
            data.items.push(project);
            
            await this.saveAll(data);
            return project;
        } catch (error) {
            console.error('Error converting idea to project:', error);
            throw error;
        }
    }
    
    async convertIdeaToLogro(ideaId) {
        try {
            const data = await this.loadAll();
            const ideaIndex = data.items.findIndex(item => item.id === ideaId && item.modulo === 'idea');
            
            if (ideaIndex === -1) {
                throw new Error('Idea not found');
            }
            
            const idea = data.items[ideaIndex];
            
            // Crear nuevo logro
            const logro = {
                ...idea,
                id: this.adapter.generateId(),
                modulo: 'logro',
                fecha_finalizacion: new Date().toISOString()
            };
            
            // Eliminar la idea original
            data.items.splice(ideaIndex, 1);
            
            // Agregar el logro
            data.items.push(logro);
            
            await this.saveAll(data);
            return logro;
        } catch (error) {
            console.error('Error converting idea to logro:', error);
            throw error;
        }
    }
    
    async convertProjectToLogro(projectId) {
        try {
            const data = await this.loadAll();
            const projectIndex = data.items.findIndex(item => item.id === projectId && item.modulo === 'proyecto');
            
            if (projectIndex === -1) {
                throw new Error('Project not found');
            }
            
            const project = data.items[projectIndex];
            
            // Verificar que todas las tareas estén completadas
            const allTasksCompleted = project.tareas.every(task => task.completado);
            if (!allTasksCompleted) {
                throw new Error('All tasks must be completed to convert to logro');
            }
            
            // Crear nuevo logro
            const logro = {
                ...project,
                id: this.adapter.generateId(),
                modulo: 'logro',
                fecha_finalizacion: new Date().toISOString(),
                meta: {
                    ...project.meta,
                    tareas_historial: project.tareas,
                    proyecto_original_id: project.id
                }
            };
            
            // Eliminar el proyecto original
            data.items.splice(projectIndex, 1);
            
            // Agregar el logro
            data.items.push(logro);
            
            await this.saveAll(data);
            return logro;
        } catch (error) {
            console.error('Error converting project to logro:', error);
            throw error;
        }
    }
    
    // Métodos para configuración
    async getSettings() {
        if (this.adapter.getSettings) {
            return await this.adapter.getSettings();
        }
        return this.adapter.getDefaultSettings();
    }
    
    async saveSettings(settings) {
        if (this.adapter.saveSettings) {
            return await this.adapter.saveSettings(settings);
        }
        return false;
    }
    
    // Métodos de utilidad
    async exportData() {
        const data = await this.loadAll();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `panel-maria-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    async importData(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            // Validar estructura básica
            if (!data.items || !Array.isArray(data.items)) {
                throw new Error('Invalid data format');
            }
            
            await this.saveAll(data);
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            throw error;
        }
    }
}

// Instancia global del almacenamiento
const storage = new Storage();

// Exportar para uso global
window.storage = storage;
