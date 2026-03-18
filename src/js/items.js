/**
 * Módulo de Items (CRUD)
 * ======================
 * Maneja las operaciones básicas de items: crear, leer, actualizar, eliminar
 * 
 * @module items
 */

import { data } from './data.js';
import { ui } from './ui.js';

/**
 * @typedef {Object} Item
 * @property {string} id - ID único del item
 * @property {string} content - Contenido principal
 * @property {string} [descripcion] - Descripción opcional
 * @property {string} [type] - Tipo: nota, tarea, proyecto, directorio
 * @property {string} [parent_id] - ID del item padre (para proyectos)
 * @property {string[]} [tags] - Array de tags
 * @property {string[]} [urls] - URLs asociadas (array para múltiples enlaces)
 * @property {Array<{titulo: string, completado: boolean}>} [tareas] - Subtareas
 * @property {number|string|Date} [deadline] - Fecha límite
 * @property {boolean} [completado] - Si está completado
 * @property {boolean} [pinned] - Si está fijada
 * @property {Object} [meta] - Metadatos adicionales
 * @property {string} created_at - Fecha de creación
 */

/**
 * @typedef {Object} ItemQuery
 * @property {string} [parentId] - Filtrar por padre
 * @property {string} [category] - Filtrar por categoría
 * @property {string} [tag] - Filtrar por tag
 * @property {string} [type] - Filtrar por tipo
 */

class ItemManager {
    constructor() {
        // No necesita referencia al controller para las operaciones básicas
    }

    // Obtener referencia al controller cuando sea necesario
    get controller() {
        return window.controller;
    }

    /**
     * Carga los items según el contexto actual y los renderiza
     * @returns {Promise<Item[]>} Array de items cargados
     */
    async load() {
        try {
            /** @type {Item[]} */
            let items = [];
            
            if (this.controller && this.controller.currentUser) {
                items = await data.getItems({
                    parentId: this.controller.currentParentId,
                    category: this.controller.currentCategory,
                    tag: this.controller.currentTag
                });
            }

            if (this.controller) {
                this.controller.allItems = items;
            }
            ui.render(items, false);
            return items;
        } catch (error) {
            console.error('Error loading items:', error);
            ui.renderError('Error al cargar los elementos');
            return [];
        }
    }

    /**
     * Crea un nuevo item
     * @param {Omit<Item, 'id'|'created_at'>} itemData - Datos del item
     * @returns {Promise<Item>} Item creado
     */
    async create(itemData) {
        try {
            const result = await data.createItem(itemData);
            ui.showNotification('¡Anotado con éxito! ✨', 'success');
            return result;
        } catch (error) {
            console.error('Error creating item:', error);
            ui.showNotification('No pude guardar eso. ¿Intentamos de nuevo?', 'error');
            throw error;
        }
    }

    /**
     * Actualiza un item existente
     * @param {string} id - ID del item
     * @param {Partial<Item>} updates - Campos a actualizar
     */
    async update(id, updates) {
        try {
            await data.updateItem(id, updates);
            ui.showNotification('¡Cambios guardados!', 'success');
        } catch (error) {
            console.error('Error updating item:', error);
            ui.showNotification('Error al guardar cambios.', 'error');
            throw error;
        }
    }

    /**
     * Elimina un item
     * @param {string} id - ID del item a eliminar
     */
    async delete(id) {
        try {
            await data.deleteItem(id);
            ui.showNotification('Eliminado', 'success');
        } catch (error) {
            console.error('Error deleting item:', error);
            ui.showNotification('Error al eliminar.', 'error');
            throw error;
        }
    }

    /**
     * Marca un item como completado
     * @param {string} id - ID del item
     */
    async finish(id) {
        try {
            await data.updateItem(id, { completado: true });
            ui.showNotification('¡Hecho! 🎉', 'success');
        } catch (error) {
            console.error('Error finishing item:', error);
            throw error;
        }
    }

    /**
     * Alterna el estado de pinned de un item
     * @param {string} id - ID del item
     */
    async togglePin(id) {
        try {
            const item = this.controller.allItems?.find(i => i.id === id);
            if (!item) return;
            
            await data.updateItem(id, { 
                pinned: !item.pinned 
            });
        } catch (error) {
            console.error('Error toggling pin:', error);
            throw error;
        }
    }

    /**
     * Extrae una URL de un texto
     * @param {string} text - Texto a analizar
     * @returns {string} URL encontrada o string vacío
     */
    extractUrl(text) {
        const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
        return urlMatch ? urlMatch[1] : '';
    }

    /**
     * Importa items desde un archivo JSON
     * @param {Object} fileData - Datos del archivo importado
     * @returns {Promise<boolean>} true si tuvo éxito
     */
    async handleImport(fileData) {
        try {
            for (const item of fileData.items) {
                delete item.id;
                delete item.created_at;
                await data.createItem(item);
            }
            ui.showNotification('¡Importación exitosa!', 'success');
            return true;
        } catch (error) {
            console.error('Error importing:', error);
            ui.showNotification('Error al importar.', 'error');
            return false;
        }
    }

    /**
     * Exporta todos los items a un archivo JSON
     */
    async handleExport() {
        try {
            const items = await data.getItems({});
            
            const exportData = {
                app: 'Panel-Maria-KAI',
                version: '1.0.0',
                date: new Date().toISOString(),
                items: items
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `kai-backup-${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            ui.showNotification('¡Exportación completada!', 'success');
        } catch (error) {
            console.error('Export error:', error);
            ui.showNotification('Error al exportar.', 'error');
        }
    }
}

export const items = new ItemManager();
