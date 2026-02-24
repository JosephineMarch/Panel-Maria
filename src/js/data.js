import { supabase } from './supabase.js';

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
            content: itemData.content,
            type: itemData.type || 'nota',
            parent_id: itemData.parent_id || null,
            status: itemData.status || 'inbox',
            descripcion: itemData.descripcion || '',
            url: itemData.url || '',
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
        const { data, error } = await supabase
            .from('items')
            .update(updates)
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
