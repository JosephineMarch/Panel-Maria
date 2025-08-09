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
        const defaultData = {
            items: [],
            settings: { 
                autoSaveVoice: false, 
                theme: 'default',
                lastCategory: 'todos',
                customCategories: [], 
                allTags: [] 
            }
        };

        try {
            const data = localStorage.getItem(this.storageKey);
            if (!data) {
                return defaultData;
            }
            // Asegurarse de que los datos parseados tengan la estructura correcta
            const parsedData = JSON.parse(data);
            parsedData.settings = { ...defaultData.settings, ...(parsedData.settings || {}) };
            return parsedData;
        } catch (error) {
            console.error('Error loading data from localStorage:', error);
            // En caso de error, devuelve la estructura por defecto para evitar crashes
            return defaultData;
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
            meta: item.meta || {}
        };

        (newItem.etiquetas || []).forEach(tag => {
            if (!data.settings.allTags.includes(tag)) {
                data.settings.allTags.push(tag);
            }
        });

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

        (partialUpdate.etiquetas || []).forEach(tag => {
            if (!data.settings.allTags.includes(tag)) {
                data.settings.allTags.push(tag);
            }
        });

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
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    async convertToLogro(id) {
        return this.updateItem(id, {
            categoria: 'logros',
            fecha_finalizacion: new Date().toISOString()
        });
    }

    async exportData() {
        try {
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
        } catch (error) {
            console.error("Error exporting data:", error);
        }
    }

    async importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const fileContent = event.target.result;

                    if (file.name.endsWith('.html') || file.type === 'text/html') {
                        const newItems = this._parseChromeBookmarks(fileContent);
                        if (newItems.length === 0) {
                            return reject(new Error('No se encontraron marcadores válidos en el archivo HTML.'));
                        }
                        const currentData = await this.loadAll();
                        const existingUrls = new Set(currentData.items.map(i => i.url));
                        const uniqueNewItems = newItems.filter(i => !existingUrls.has(i.url));
                        
                        currentData.items.push(...uniqueNewItems);
                        await this.saveAll(currentData);
                        resolve({ importedCount: uniqueNewItems.length, type: 'html' });

                    } else {
                        const importedData = JSON.parse(fileContent);
                        if (!importedData || !importedData.items || !importedData.settings) {
                            return reject(new Error('Estructura de datos JSON importados inválida'));
                        }
                        const currentData = await this.loadAll();
                        const existingIds = new Set(currentData.items.map(i => i.id));
                        const newItems = importedData.items.filter(i => !existingIds.has(i.id));
                        currentData.items = [...currentData.items, ...newItems];
                        currentData.settings.customCategories = [...new Set([...(currentData.settings.customCategories || []), ...(importedData.settings.customCategories || [])])];
                        currentData.settings.allTags = [...new Set([...(currentData.settings.allTags || []), ...(importedData.settings.allTags || [])])];
                        
                        await this.saveAll(currentData);
                        resolve({ importedCount: newItems.length, type: 'json' });
                    }
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
        });
    }

    _parseChromeBookmarks(htmlContent) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const results = [];

        function walk(listNode, categoryStack) {
            for (const itemNode of listNode.children) {
                if (itemNode.tagName !== 'DT') continue;

                const h3 = itemNode.querySelector(':scope > h3');
                const subList = itemNode.querySelector(':scope > dl');
                const a = itemNode.querySelector(':scope > a');

                if (h3 && subList) {
                    const folderName = h3.textContent.trim();
                    walk(subList, [...categoryStack, folderName]);
                } else if (a && a.href && a.href.startsWith('http')) {
                    let cleanStack = [...categoryStack];
                    if (cleanStack.length > 0 && cleanStack[0] === 'Barra de marcadores') {
                        cleanStack.shift();
                    }
                    
                    const tags = cleanStack.map(folder => folder.toLowerCase());

                    results.push({
                        id: null, // Se generará en addItem
                        categoria: 'directorio',
                        titulo: a.textContent.trim() || 'Enlace sin título',
                        url: a.href,
                        descripcion: `Importado de: ${cleanStack.join(' / ')}`,
                        etiquetas: tags,
                        anclado: false,
                        fecha_creacion: new Date().toISOString(),
                        fecha_finalizacion: null,
                        tareas: [],
                        meta: { source: 'html-import' }
                    });
                }
            }
        }

        const mainList = doc.querySelector('dl');
        if (mainList) {
            walk(mainList, []);
        }
        return results;
    }

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

// Instancia global
const storage = new Storage('local');
window.storage = storage;