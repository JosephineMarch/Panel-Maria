/*
================================================================================
|       PANEL DE CONTROL UNIFICADO - MÓDULO DE ALMACENAMIENTO (STORAGE)
================================================================================
*/

import { db } from './firebase-config.js';
import { collection, doc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, query, writeBatch, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

class StorageAdapter {
    async loadAll() { throw new Error('loadAll must be implemented'); }
    async saveAll(data) { throw new Error('saveAll must be implemented'); }
    generateId() { throw new Error('generateId must be implemented'); }
    async performBatchUpdate(operations, currentItems) { throw new Error('performBatchUpdate must be implemented'); }
}

class LocalStorageAdapter extends StorageAdapter {
    constructor() {
        super();
        this.storageKey = 'panelControlUnificadoData';
        this.type = 'local';
    }

    async loadAll() {
        const defaultData = {
            items: [],
            settings: { autoSaveVoice: false, theme: 'default', lastCategory: 'todos', customCategories: [], categoryTags: {} }
        };
        try {
            const data = localStorage.getItem(this.storageKey);
            if (!data) return defaultData;
            const parsedData = JSON.parse(data);
            parsedData.settings = { ...defaultData.settings, ...(parsedData.settings || {}) };
            return parsedData;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return defaultData;
        }
    }

    async saveAll(data) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    async performBatchUpdate(operations, currentItems) {
        let newItems = [...currentItems];
        operations.forEach(op => {
            if (op.type === 'add') {
                newItems.push({ ...op.data, id: this.generateId() });
            } else if (op.type === 'update') {
                newItems = newItems.map(item => item.id === op.id ? { ...item, ...op.data } : item);
            } else if (op.type === 'delete') {
                newItems = newItems.filter(item => item.id !== op.id);
            }
        });
        return newItems;
    }
}

class FirebaseAdapter extends StorageAdapter {
    constructor(userId) {
        super();
        if (!userId) throw new Error("FirebaseAdapter requires a userId.");
        this.userId = userId;
        this.type = 'firebase';
        this.itemsCollectionRef = collection(db, `users/${this.userId}/items`);
        this.settingsDocRef = doc(db, `users/${this.userId}/settings/appSettings`);
    }

    async loadAll() {
        const itemsSnapshot = await getDocs(this.itemsCollectionRef);
        const items = itemsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

        const settingsSnapshot = await getDoc(this.settingsDocRef);
        const defaultSettings = { autoSaveVoice: false, theme: 'default', lastCategory: 'todos', customCategories: [], categoryTags: {} };
        const settings = settingsSnapshot.exists() ? { ...defaultSettings, ...settingsSnapshot.data() } : defaultSettings;
        
        return { items, settings };
    }

    async saveAll(data) {
        // En Firebase, `saveAll` solo guarda la configuración. Los items se manejan por lotes.
        await setDoc(this.settingsDocRef, data.settings, { merge: true });
    }

    generateId() {
        // En Firebase, el ID se genera automáticamente al añadir un documento.
        return doc(collection(db, '_')).id; // Truco para generar un ID offline.
    }

    async performBatchUpdate(operations) {
        const batch = writeBatch(db);
        operations.forEach(op => {
            if (op.type === 'add') {
                const newDocRef = doc(this.itemsCollectionRef); // Firestore genera el ID
                batch.set(newDocRef, op.data);
            } else if (op.type === 'update') {
                const docRef = doc(this.itemsCollectionRef, op.id);
                batch.update(docRef, op.data);
            } else if (op.type === 'delete') {
                const docRef = doc(this.itemsCollectionRef, op.id);
                batch.delete(docRef);
            }
        });
        await batch.commit();
    }
}

class Storage {
    constructor() {
        this.adapter = new LocalStorageAdapter();
    }

    setAdapter(mode, userId = null) {
        if (mode === 'firebase' && userId) {
            this.adapter = new FirebaseAdapter(userId);
        } else {
            this.adapter = new LocalStorageAdapter();
        }
        console.log(`Storage adapter set to: ${this.adapter.type}`);
    }

    async loadAll() { return this.adapter.loadAll(); }
    async saveAll(data) { return this.adapter.saveAll(data); }
    generateId() { return this.adapter.generateId(); }
    async performBatchUpdate(operations, currentItems) {
        return this.adapter.performBatchUpdate(operations, currentItems);
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
            a.click();
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
                    const data = JSON.parse(event.target.result);
                    if (!data || !data.items) return reject(new Error('Formato de archivo inválido.'));
                    
                    const currentData = await this.loadAll();
                    const existingIds = new Set(currentData.items.map(i => i.id));
                    const itemsToImport = data.items.filter(i => !existingIds.has(i.id));

                    if (itemsToImport.length > 0) {
                        const operations = itemsToImport.map(item => ({ type: 'add', data: item }));
                        await this.performBatchUpdate(operations);
                    }
                    resolve({ importedCount: itemsToImport.length });
                } catch (e) {
                    reject(new Error("Error al leer el archivo JSON."));
                }
            };
            reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
            reader.readAsText(file);
        });
    }
}

window.storage = new Storage();