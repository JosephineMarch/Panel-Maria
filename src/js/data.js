import { supabase } from './supabase.js';
import { utils } from './utils.js';

export const data = {
    /**
     * Crea un nuevo item en Supabase
     */
    async createItem(itemData) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) {
            console.error('Auth error:', authError);
            throw new Error('Error de autenticación');
        }
        if (!user) throw new Error('Usuario no autenticado');

        const item = {
            user_id: user.id,
            content: utils.sanitizeInput(itemData.content || ''),
            type: itemData.type || 'nota',
            parent_id: itemData.parent_id || null,
            status: itemData.status || 'inbox',
            descripcion: utils.sanitizeInput(itemData.descripcion || ''),
            url: utils.sanitizeInput(itemData.url || ''),
            tareas: itemData.tareas || [],
            tags: itemData.tags || [],
            deadline: itemData.deadline || null,
            anclado: itemData.anclado || false,
            meta: itemData.meta || {}
        };

        const { data, error } = await supabase
            .from('items')
            .insert(item)
            .select()
            .single();

        if (error) {
            console.error('Error createItem:', error);
            throw error;
        }
        return data;
    },

    /**
     * Obtiene una lista de items filtrada
     */
    async getItems(filters = {}) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.warn('data.getItems: No hay usuario autenticado');
            return [];
        }

        let query = supabase
            .from('items')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (filters.id) {
            query = query.eq('id', filters.id).single();
        } else {
            if (filters.parent_id !== undefined) {
                if (filters.parent_id === null) query = query.is('parent_id', null);
                else query = query.eq('parent_id', filters.parent_id);
            }
            if (filters.type) query = query.eq('type', filters.type);
            if (filters.status) query = query.eq('status', filters.status);
            if (filters.user_id) query = query.eq('user_id', filters.user_id);
            if (filters.search) query = query.ilike('content', `%${filters.search}%`);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error getItems:', error);
            throw error;
        }
        return data || [];
    },

    /**
     * Actualiza un item existente
     */
    async updateItem(id, updates) {
        const sanitizedUpdates = {};
        
        if (updates.content !== undefined) {
            sanitizedUpdates.content = utils.sanitizeInput(updates.content);
        }
        if (updates.descripcion !== undefined) {
            sanitizedUpdates.descripcion = utils.sanitizeInput(updates.descripcion);
        }
        if (updates.url !== undefined) {
            sanitizedUpdates.url = utils.sanitizeInput(updates.url);
        }
        if (updates.type !== undefined) sanitizedUpdates.type = updates.type;
        if (updates.parent_id !== undefined) sanitizedUpdates.parent_id = updates.parent_id;
        if (updates.status !== undefined) sanitizedUpdates.status = updates.status;
        if (updates.tareas !== undefined) sanitizedUpdates.tareas = updates.tareas;
        if (updates.tags !== undefined) sanitizedUpdates.tags = updates.tags;
        if (updates.deadline !== undefined) sanitizedUpdates.deadline = updates.deadline;
        if (updates.anclado !== undefined) sanitizedUpdates.anclado = updates.anclado;
        if (updates.meta !== undefined) sanitizedUpdates.meta = updates.meta;

        const { data, error } = await supabase
            .from('items')
            .update(sanitizedUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updateItem:', error);
            throw error;
        }
        return data;
    },

    /**
     * Elimina un item
     */
    async deleteItem(id) {
        const { error } = await supabase
            .from('items')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleteItem:', error);
            throw error;
        }
        return true;
    },

    /**
     * Obtiene hijos de un item (atajo para getItems)
     */
    async getChildItems(parentId) {
        return this.getItems({ parent_id: parentId });
    }
};
