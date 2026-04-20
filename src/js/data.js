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
            urls: Array.isArray(itemData.urls) 
                ? itemData.urls.map(u => utils.sanitizeInput(u)).filter(Boolean)
                : (itemData.url ? [utils.sanitizeInput(itemData.url)] : []),
            tareas: itemData.tareas || [],
            tags: itemData.tags || [],
            deadline: itemData.deadline || null,
            repeat: itemData.repeat || null,
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
            return [];
        }

        // Si hay búsqueda, usar la función RPC de full-text search
        if (filters.search) {
            try {
                const { data: results, error } = await supabase
                    .rpc('search_items', {
                        p_query: filters.search,
                        p_user_id: user.id,
                        p_limit: filters.limit || 20
                    });

                if (error) {
                    console.error('Search error:', error);
                    // Fallback a búsqueda básica si falla el RPC
                    return this.getItemsBasic(user, filters);
                }

                return results || [];
            } catch (err) {
                console.error('Search exception:', err);
                return this.getItemsBasic(user, filters);
            }
        }

        // Búsqueda básica (sin búsqueda de texto)
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
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error getItems:', error);
            throw error;
        }
        return data || [];
    },

    /**
     * Fallback básico si falla el RPC (busca solo en content)
     */
    async getItemsBasic(user, filters) {
        let query = supabase
            .from('items')
            .select('*')
            .eq('user_id', user.id)
            .ilike('content', `%${filters.search}%`)
            .order('created_at', { ascending: false })
            .limit(filters.limit || 20);

        const { data, error } = await query;
        if (error) {
            console.error('Error getItemsBasic:', error);
            return [];
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
        // Guardar múltiples URLs como array
        if (updates.urls !== undefined) {
            sanitizedUpdates.urls = Array.isArray(updates.urls) 
                ? updates.urls.map(u => utils.sanitizeInput(u)).filter(Boolean)
                : (updates.url ? [utils.sanitizeInput(updates.url)] : []);
        }
        if (updates.type !== undefined) sanitizedUpdates.type = updates.type;
        if (updates.parent_id !== undefined) sanitizedUpdates.parent_id = updates.parent_id;
        if (updates.status !== undefined) sanitizedUpdates.status = updates.status;
        if (updates.tareas !== undefined) sanitizedUpdates.tareas = updates.tareas;
        if (updates.tags !== undefined) sanitizedUpdates.tags = updates.tags;
        if (updates.deadline !== undefined) sanitizedUpdates.deadline = updates.deadline;
        if (updates.repeat !== undefined) sanitizedUpdates.repeat = updates.repeat;
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
    },

    // ========== NOTIFICACIONES ==========

    /**
     * Obtiene las notificaciones del usuario
     */
    async getNotifications() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('user_notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error getNotifications:', error);
            return [];
        }
        return data || [];
    },

    /**
     * Obtiene el conteo de notificaciones no leídas
     */
    async getUnreadCount() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return 0;

        const { count, error } = await supabase
            .from('user_notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false);

        if (error) {
            console.error('Error getUnreadCount:', error);
            return 0;
        }
        return count || 0;
    },

    /**
     * Marca una notificación como leída
     */
    async markNotificationRead(id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { error } = await supabase
            .from('user_notifications')
            .update({ is_read: true })
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) {
            console.error('Error markNotificationRead:', error);
            return false;
        }
        return true;
    },

    /**
     * Marca todas las notificaciones como leídas
     */
    async markAllRead() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { error } = await supabase
            .from('user_notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('is_read', false);

        if (error) {
            console.error('Error markAllRead:', error);
            return false;
        }
        return true;
    },

    /**
     * Crea una notificación manual (para uso interno o sugerencias de Kai)
     */
    async createNotification(notifData) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('user_notifications')
            .insert({
                user_id: user.id,
                title: utils.sanitizeInput(notifData.title || ''),
                message: utils.sanitizeInput(notifData.message || ''),
                type: notifData.type || 'system',
                related_item_id: notifData.related_item_id || null
            })
            .select()
            .single();

        if (error) {
            console.error('Error createNotification:', error);
            return null;
        }
        return data;
    }
};
