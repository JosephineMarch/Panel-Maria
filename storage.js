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
    async getPendingOperations() { return []; }
    async clearPendingOperations() { }
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
            console.log('LocalStorageAdapter: Raw data from localStorage:', data); // Added log
            if (!data) return defaultData;
            const parsedData = JSON.parse(data);
            console.log('LocalStorageAdapter: Parsed data from localStorage:', parsedData); // Added log
            parsedData.settings = { ...defaultData.settings, ...(parsedData.settings || {}) };
            return parsedData;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return defaultData;
        }
    }

    async saveAll(data) {
        try {
            console.log('LocalStorageAdapter: Saving data to localStorage:', data); // Added log
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            console.log('LocalStorageAdapter: Data saved successfully to localStorage.'); // Added log
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
        console.log('FirebaseAdapter: Loading all items...');
        try {
            const itemsSnapshot = await getDocs(this.itemsCollectionRef);
            const items = itemsSnapshot.docs.map(doc => this.normalizeItem({ ...doc.data(), id: doc.id }));
            console.log(`FirebaseAdapter: Loaded ${items.length} items.`);

            const settingsSnapshot = await getDoc(this.settingsDocRef);
            const defaultSettings = { autoSaveVoice: false, theme: 'default', lastCategory: 'todos', customCategories: [], categoryTags: {} };
            const settings = settingsSnapshot.exists() ? { ...defaultSettings, ...settingsSnapshot.data() } : defaultSettings;

            return { items, settings };
        } catch (error) {
            console.error('FirebaseAdapter: Error loading items:', error);
            throw error;
        }
    }

    // Helper to ensure compatibility with old data
    normalizeItem(item) {
        return {
            id: item.id,
            titulo: item.titulo || 'Sin Título',
            descripcion: item.descripcion || '',
            categoria: item.categoria || 'directorio', // Fallback safety
            url: item.url || '',
            tareas: Array.isArray(item.tareas) ? item.tareas : [],
            etiquetas: Array.isArray(item.etiquetas) ? item.etiquetas : [],
            anclado: !!item.anclado,
            fecha_creacion: item.fecha_creacion || new Date().toISOString(),
            fecha_finalizacion: item.fecha_finalizacion || null,
            meta: item.meta || {}
        };
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
                const newDocRef = op.id ? doc(this.itemsCollectionRef, op.id) : doc(this.itemsCollectionRef);
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

class IndexedDBAdapter extends StorageAdapter {
    constructor() {
        super();
        this.dbName = 'PanelMariaDB';
        this.dbVersion = 1;
        this.storeName = 'items';
        this.opsStoreName = 'pendingOperations';
        this.db = null;
        this.type = 'indexeddb';
    }

    async init() {
        if (this.db) return;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(this.opsStoreName)) {
                    db.createObjectStore(this.opsStoreName, { keyPath: 'id', autoIncrement: true });
                }
            };
        });
    }

    async loadAll() {
        await this.init();
        const items = await this.getAllFromStore(this.storeName);
        const settings = JSON.parse(localStorage.getItem('panelSettings') || '{}');
        return { items, settings };
    }

    async saveAll(data) {
        if (data.settings) {
            localStorage.setItem('panelSettings', JSON.stringify(data.settings));
        }
        // Items are saved individually via performBatchUpdate for efficiency
    }

    async getAllFromStore(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    async performBatchUpdate(operations, currentItems) {
        await this.init();
        const transaction = this.db.transaction([this.storeName, this.opsStoreName], 'readwrite');
        const itemStore = transaction.objectStore(this.storeName);
        const opsStore = transaction.objectStore(this.opsStoreName);

        for (const op of operations) {
            if (op.type === 'add') {
                const item = { ...op.data, id: op.data.id || this.generateId() };
                itemStore.put(item);
            } else if (op.type === 'update') {
                const item = currentItems.find(i => i.id === op.id);
                if (item) itemStore.put({ ...item, ...op.data });
            } else if (op.type === 'delete') {
                itemStore.delete(op.id);
            }
            opsStore.add(op);
        }

        return new Promise((resolve) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = (e) => {
                console.error('IDB Transaction Error:', e);
                resolve();
            };
        });
    }

    async getPendingOperations() {
        await this.init();
        return this.getAllFromStore(this.opsStoreName);
    }

    async clearPendingOperations() {
        await this.init();
        return new Promise((resolve) => {
            const transaction = this.db.transaction(this.opsStoreName, 'readwrite');
            const store = transaction.objectStore(this.opsStoreName);
            const request = store.clear();
            request.onsuccess = () => resolve();
        });
    }
}

class Storage {
    constructor() {
        this.localAdapter = new IndexedDBAdapter();
        this.remoteAdapter = null;
        this.isOnline = navigator.onLine;
        this.setupSync();
    }

    setAdapter(mode, userId = null) {
        if (mode === 'firebase' && userId) {
            this.remoteAdapter = new FirebaseAdapter(userId);
        } else {
            this.remoteAdapter = null;
        }
    }

    async loadAll() {
        const localData = await this.localAdapter.loadAll();
        if (this.remoteAdapter && this.isOnline) {
            try {
                const remoteData = await this.remoteAdapter.loadAll();
                // Merge logic could be here, but for now we trust remote as source of truth if online
                // and update local to match
                await this.syncLocalWithRemote(remoteData.items);
                return remoteData;
            } catch (e) {
                console.error('Remote load failed, using local:', e);
            }
        }
        return localData;
    }

    async syncLocalWithRemote(remoteItems) {
        await this.localAdapter.init();
        const transaction = this.localAdapter.db.transaction(this.localAdapter.storeName, 'readwrite');
        const store = transaction.objectStore(this.localAdapter.storeName);
        store.clear();
        remoteItems.forEach(item => store.put(item));
    }

    async saveAll(data) {
        await this.localAdapter.saveAll(data);
        if (this.remoteAdapter && this.isOnline) {
            await this.remoteAdapter.saveAll(data);
        }
    }

    generateId() { return this.localAdapter.generateId(); }

    async performBatchUpdate(operations, currentItems) {
        // Always record locally first
        await this.localAdapter.performBatchUpdate(operations, currentItems);

        if (this.remoteAdapter && this.isOnline) {
            try {
                await this.remoteAdapter.performBatchUpdate(operations);
                await this.localAdapter.clearPendingOperations();
            } catch (e) {
                console.error('Remote sync failed, will retry later:', e);
            }
        }
    }

    setupSync() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncPending();
        });
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    async syncPending() {
        if (!this.remoteAdapter || !this.isOnline) return;
        const ops = await this.localAdapter.getPendingOperations();
        if (ops.length === 0) return;

        console.log(`Syncing ${ops.length} pending operations...`);
        try {
            await this.remoteAdapter.performBatchUpdate(ops);
            await this.localAdapter.clearPendingOperations();
            console.log('Sync complete.');
        } catch (e) {
            console.error('Sync failed:', e);
        }
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

                    const operations = data.items.map(item => ({ type: 'add', data: item }));
                    await this.performBatchUpdate(operations, []);
                    resolve({ importedCount: data.items.length });
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