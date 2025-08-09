/*
================================================================================
|       PANEL DE CONTROL UNIFICADO - MÓDULO DE ALMACENAMIENTO (STORAGE)
================================================================================
*/

import { db } from './firebase-config.js';
import { collection, doc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, query, where, writeBatch } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// Clase base para adaptadores de almacenamiento (Define la interfaz)
class StorageAdapter {
    constructor(userId = null) {
        this.userId = userId;
    }
    async loadData() {
        throw new Error('loadData must be implemented');
    }
    async saveData(data) {
        throw new Error('saveData must be implemented');
    }
    async addItem(item) {
        throw new Error('addItem must be implemented');
    }
    async updateItem(id, partialUpdate) {
        throw new Error('updateItem must be implemented');
    }
    async deleteItem(id) {
        throw new Error('deleteItem must be implemented');
    }
}

// Adaptador para LocalStorage
class LocalStorageAdapter extends StorageAdapter {
    constructor(userId = null) {
        super(userId);
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
                categoryTags: {}
            }
        };

        try {
            const data = localStorage.getItem(this.storageKey);
            if (!data) {
                return defaultData;
            }
            const parsedData = JSON.parse(data);
            parsedData.settings = { ...defaultData.settings, ...(parsedData.settings || {}) };
            if (!parsedData.settings.categoryTags) parsedData.settings.categoryTags = {};
            return parsedData;
        } catch (error) {
            console.error('Error loading data from localStorage:', error);
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

    async addItem(item) {
        const data = await this.loadData();
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
        data.items.push(newItem);
        await this.saveData(data);
        return newItem;
    }

    async updateItem(id, partialUpdate) {
        const data = await this.loadData();
        const itemIndex = data.items.findIndex(item => item.id === id);
        if (itemIndex === -1) {
            throw new Error(`Item with id ${id} not found`);
        }
        data.items[itemIndex] = { ...data.items[itemIndex], ...partialUpdate };
        await this.saveData(data);
        return data.items[itemIndex];
    }

    async deleteItem(id) {
        const data = await this.loadData();
        const initialLength = data.items.length;
        data.items = data.items.filter(item => item.id !== id);
        if (data.items.length === initialLength) {
            throw new Error(`Item with id ${id} not found for deletion`);
        }
        await this.saveData(data);
        return true;
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }
}

// Adaptador para Firebase
class FirebaseAdapter extends StorageAdapter {
    constructor(userId) {
        super(userId);
        if (!this.userId) {
            throw new Error("FirebaseAdapter requires a userId.");
        }
        this.userCollectionRef = collection(db, `users/${this.userId}/items`);
        this.userSettingsDocRef = doc(db, `users/${this.userId}/settings/appSettings`);
    }

    async loadData() {
        const itemsSnapshot = await getDocs(this.userCollectionRef);
        const items = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const settingsDoc = await getDocs(query(collection(db, `users/${this.userId}/settings`)));
        let settings = {};
        if (!settingsDoc.empty) {
            settings = settingsDoc.docs[0].data();
        }

        const defaultSettings = {
            autoSaveVoice: false,
            theme: 'default',
            lastCategory: 'todos',
            customCategories: [],
            categoryTags: {}
        };
        settings = { ...defaultSettings, ...settings };
        if (!settings.categoryTags) settings.categoryTags = {};

        return { items, settings };
    }

    async saveData(data) {
        // Save items (this method is not directly used by main app for item changes)
        // Items are saved individually via addItem, updateItem, deleteItem

        // Save settings
        await setDoc(this.userSettingsDocRef, data.settings, { merge: true });
        return true;
    }

    async addItem(item, batch = null) {
        const newItem = {
            ...item,
            fecha_creacion: new Date().toISOString(),
            fecha_finalizacion: item.fecha_finalizacion || null,
            anclado: item.anclado || false,
            etiquetas: item.etiquetas || [],
            tareas: item.tareas || [],
            meta: item.meta || {}
        };
        if (batch) {
            const newDocRef = doc(this.userCollectionRef);
            batch.set(newDocRef, newItem);
            return { id: newDocRef.id, ...newItem }; // Return a temporary ID for batch
        } else {
            const docRef = await addDoc(this.userCollectionRef, newItem);
            return { id: docRef.id, ...newItem };
        }
    }

    async updateItem(id, partialUpdate, batch = null) {
        const itemRef = doc(this.userCollectionRef, id);
        if (batch) {
            batch.update(itemRef, partialUpdate);
        } else {
            await updateDoc(itemRef, partialUpdate);
        }
        // For simplicity, we'll reload the item to return the full updated object
        // This part might need adjustment if we want to avoid a read after every update in a batch
        const updatedSnapshot = await getDocs(query(this.userCollectionRef, where('__name__', '==', id)));
        if (!updatedSnapshot.empty) {
            return { id: updatedSnapshot.docs[0].id, ...updatedSnapshot.docs[0].data() };
        } else {
            throw new Error(`Item with id ${id} not found after update`);
        }
    }

    async deleteItem(id, batch = null) {
        const itemRef = doc(this.userCollectionRef, id);
        if (batch) {
            batch.delete(itemRef);
        } else {
            await deleteDoc(itemRef);
        }
        return true;
    }

    async performBatchUpdate(operations) {
        const batch = writeBatch(db);
        for (const op of operations) {
            const itemRef = doc(this.userCollectionRef, op.id);
            if (op.type === 'update') {
                batch.update(itemRef, op.data);
            } else if (op.type === 'delete') {
                batch.delete(itemRef);
            } else if (op.type === 'add') {
                // For add, Firestore generates ID, so we need to create a new doc ref
                const newDocRef = doc(this.userCollectionRef);
                batch.set(newDocRef, op.data);
            }
        }
        await batch.commit();
    }

    generateId() {
        // Firestore generates its own IDs, so this is not strictly needed for FirebaseAdapter
        return doc(this.userCollectionRef).id;
    }
}

// --- Clase Principal de Almacenamiento ---
class Storage {
    constructor(mode = 'local', userId = null) {
        this.adapter = null;
        this.setAdapter(mode, userId);
    }

    setAdapter(mode, userId = null) {
        if (mode === 'local') {
            this.adapter = new LocalStorageAdapter(userId);
        } else if (mode === 'firebase') {
            if (!userId) throw new Error('UserId is required for firebase mode');
            this.adapter = new FirebaseAdapter(userId);
        } else {
            throw new Error(`Unknown storage mode: ${mode}`);
        }
    }

    async loadAll() {
        return await this.adapter.loadData();
    }

    async saveAll(data) {
        // This method is primarily for saving settings in FirebaseAdapter
        // For LocalStorageAdapter, it saves all items and settings
        return await this.adapter.saveData(data);
    }

    async addItem(item) {
        return await this.adapter.addItem(item);
    }

    async updateItem(id, partialUpdate) {
        return await this.adapter.updateItem(id, partialUpdate);
    }

    async deleteItem(id) {
        return await this.adapter.deleteItem(id);
    }
    
    generateId() {
        return this.adapter.generateId();
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
                    const currentData = await this.loadAll();

                    if (file.name.endsWith('.html') || file.type === 'text/html') {
                        const newItems = this._parseChromeBookmarks(fileContent);
                        if (newItems.length === 0) {
                            return reject(new Error('No se encontraron marcadores válidos en el archivo HTML.'));
                        }
                        const existingUrls = new Set(currentData.items.map(i => i.url));
                        const uniqueNewItems = newItems.filter(i => !existingUrls.has(i.url));
                        
                        for (const item of uniqueNewItems) {
                            await this.addItem(item);
                        }
                        resolve({ importedCount: uniqueNewItems.length, type: 'html' });

                    } else {
                        const importedData = JSON.parse(fileContent);
                        if (!importedData || !importedData.items || !importedData.settings) {
                            return reject(new Error('Estructura de datos JSON importados inválida'));
                        }
                        const existingIds = new Set(currentData.items.map(i => i.id));
                        const newItems = importedData.items.filter(i => !existingIds.has(i.id));
                        
                        for (const item of newItems) {
                            await this.addItem(item);
                        }

                        // Merge settings, especially custom categories and tags
                        const mergedSettings = {
                            ...currentData.settings,
                            ...importedData.settings,
                            customCategories: [...new Set([...(currentData.settings.customCategories || []), ...(importedData.settings.customCategories || [])])],
                            categoryTags: {
                                ...currentData.settings.categoryTags,
                                ...importedData.settings.categoryTags
                            }
                        };
                        // For categoryTags, merge inner arrays
                        for (const category in importedData.settings.categoryTags) {
                            if (mergedSettings.categoryTags[category]) {
                                mergedSettings.categoryTags[category] = [...new Set([...mergedSettings.categoryTags[category], ...importedData.settings.categoryTags[category]])];
                            } else {
                                mergedSettings.categoryTags[category] = importedData.settings.categoryTags[category];
                            }
                        }

                        await this.saveAll({ items: currentData.items, settings: mergedSettings }); // Save merged settings
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

// --- Funciones de ayuda para la IA ---
// Estas funciones necesitarán ser adaptadas para usar el nuevo sistema de almacenamiento
async function interpretAndCreateItem(text) {
    try {
        const prompt = await fetch('interpretation-prompt.txt').then(res => res.text());
        const response = await window.gemini.getCompletion(prompt, text);
        const itemData = JSON.parse(response);
        
        if (!itemData.titulo || !itemData.categoria) {
            throw new Error('La IA no pudo determinar el título o la categoría.');
        }
        
        // Usar el método addItem del objeto storage global
        const newItem = await storage.addItem(itemData);
        return newItem;
    } catch (error) {
        console.error('Error en la interpretación de IA:', error);
        throw error;
    }
}
