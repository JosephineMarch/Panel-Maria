/*
================================================================================
|       PANEL DE CONTROL UNIFICADO - MÓDULO DE ALMACENAMIENTO (STORAGE)
|       VERSION OPTIMIZADA
================================================================================
*/

import { db } from './firebase-config.js';
import { collection, doc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, query, where, writeBatch } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// Clase base para adaptadores de almacenamiento (Define la interfaz)
class StorageAdapter {
    constructor(userId = null) {
        this.userId = userId;
    }
    async loadData() { throw new Error('loadData must be implemented'); }
    async saveData(data) { throw new Error('saveData must be implemented'); }
    generateId() { throw new Error('generateId must be implemented'); }
    async performBatchUpdate(operations, currentItems) { throw new Error('performBatchUpdate must be implemented'); }
}

// Adaptador para LocalStorage (Optimizado)
class LocalStorageAdapter extends StorageAdapter {
    constructor(userId = null) {
        super(userId);
        this.storageKey = 'panelControlUnificadoData';
        this.type = 'local';
    }

    async loadData() {
        const defaultData = {
            items: [],
            settings: {
                autoSaveVoice: false, theme: 'default', lastCategory: 'todos', customCategories: [], categoryTags: {}
            }
        };
        try {
            const data = localStorage.getItem(this.storageKey);
            if (!data) return defaultData;
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

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    // Batch updates para LocalStorage (Corrige el bug de acciones en lote)
    async performBatchUpdate(operations, currentItems) {
        let newItems = [...currentItems];
        for (const op of operations) {
            if (op.type === 'update') {
                newItems = newItems.map(item => item.id === op.id ? { ...item, ...op.data } : item);
            } else if (op.type === 'delete') {
                newItems = newItems.filter(item => item.id !== op.id);
            } else if (op.type === 'add') {
                newItems.push(op.data);
            }
        }
        return newItems; // Devuelve los items actualizados para que app.js los guarde
    }
}

// Adaptador para Firebase (Sin cambios mayores, solo se alinea con la nueva interfaz)
class FirebaseAdapter extends StorageAdapter {
    constructor(userId) {
        super(userId);
        this.type = 'firebase';
        if (!this.userId) throw new Error("FirebaseAdapter requires a userId.");
        this.userCollectionRef = collection(db, `users/${this.userId}/items`);
        this.userSettingsDocRef = doc(db, `users/${this.userId}/settings/appSettings`);
    }

    async loadData() {
        const itemsSnapshot = await getDocs(this.userCollectionRef);
        const items = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const settingsDoc = await getDocs(query(collection(db, `users/${this.userId}/settings`)));
        let settings = {};
        if (!settingsDoc.empty) settings = settingsDoc.docs[0].data();
        const defaultSettings = { autoSaveVoice: false, theme: 'default', lastCategory: 'todos', customCategories: [], categoryTags: {} };
        settings = { ...defaultSettings, ...settings };
        if (!settings.categoryTags) settings.categoryTags = {};
        return { items, settings };
    }

    async saveData(data) {
        // En Firebase, 'saveData' es principalmente para guardar la configuración.
        // Los items se guardan a través de 'performBatchUpdate'.
        await setDoc(this.userSettingsDocRef, data.settings, { merge: true });
        return true;
    }

    generateId() {
        return doc(collection(db, 'temp')).id;
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
                const newDocRef = doc(this.userCollectionRef);
                batch.set(newDocRef, op.data);
            }
        }
        await batch.commit();
    }
}

// --- Clase Principal de Almacenamiento (Simplificada) ---
class Storage {
    constructor(mode = 'local', userId = null) {
        this.adapter = null;
        this.setAdapter(mode, userId);
    }

    setAdapter(mode, userId = null) {
        if (mode === 'local') this.adapter = new LocalStorageAdapter(userId);
        else if (mode === 'firebase') {
            if (!userId) throw new Error('UserId is required for firebase mode');
            this.adapter = new FirebaseAdapter(userId);
        } else throw new Error(`Unknown storage mode: ${mode}`);
    }

    async loadAll() { return await this.adapter.loadData(); }
    async saveAll(data) { return await this.adapter.saveData(data); }
    generateId() { return this.adapter.generateId(); }
    async performBatchUpdate(operations, currentItems) {
        if (this.adapter.type === 'local') {
            return await this.adapter.performBatchUpdate(operations, currentItems);
        }
        return await this.adapter.performBatchUpdate(operations);
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

    // Importación Optimizada
    async importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const fileContent = event.target.result;
                    const currentData = await this.loadAll();
                    let itemsToAdd = [];

                    if (file.name.endsWith('.html') || file.type === 'text/html') {
                        const parsedItems = this._parseChromeBookmarks(fileContent);
                        if (parsedItems.length === 0) return reject(new Error('No se encontraron marcadores válidos.'));
                        const existingUrls = new Set(currentData.items.map(i => i.url).filter(Boolean));
                        itemsToAdd = parsedItems.filter(i => !existingUrls.has(i.url));
                    } else {
                        const importedData = JSON.parse(fileContent);
                        if (!importedData || !importedData.items) return reject(new Error('Estructura JSON inválida.'));
                        const existingIds = new Set(currentData.items.map(i => i.id));
                        itemsToAdd = importedData.items.filter(i => !existingIds.has(i.id));
                        // Simple settings merge, could be improved if needed
                        currentData.settings = { ...currentData.settings, ...(importedData.settings || {}) };
                    }

                    // Add new items to the existing ones
                    currentData.items.push(...itemsToAdd.map(item => ({
                        ...item,
                        id: this.generateId(),
                        fecha_creacion: new Date().toISOString()
                    })));

                    // Save the entire updated database at once
                    await this.saveAll(currentData);
                    resolve({ importedCount: itemsToAdd.length });

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
                    walk(subList, [...categoryStack, h3.textContent.trim()]);
                } else if (a && a.href && a.href.startsWith('http')) {
                    results.push({
                        categoria: 'directorio',
                        titulo: a.textContent.trim() || 'Enlace sin título',
                        url: a.href,
                        etiquetas: categoryStack.map(f => f.toLowerCase()),
                        // ... other fields are set during import
                    });
                }
            }
        }
        const mainList = doc.querySelector('dl');
        if (mainList) walk(mainList, []);
        return results;
    }
}

// Instancia global
const storage = new Storage('local');
window.storage = storage;

// --- Funciones de ayuda para la IA (requieren adaptación si se usan) ---
async function interpretAndCreateItem(text) {
    // Esta función ahora necesitaría ser llamada desde la instancia de PanelMariaApp
    // para que pueda interactuar con el estado de la aplicación.
    console.warn("interpretAndCreateItem is deprecated as a global function.");
}