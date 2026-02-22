-- Script SQL para crear la tabla items en Supabase
-- Ejecutar este script en el Editor SQL de Supabase

-- 1. Crear la tabla items
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'note' CHECK (type IN ('note', 'task', 'project', 'reminder', 'link', 'mood', 'voice')),
    parent_id UUID REFERENCES items(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'inbox' CHECK (status IN ('inbox', 'active', 'completed', 'archived')),
    tags TEXT[] DEFAULT '{}',
    deadline TIMESTAMPTZ,
    meta JSONB DEFAULT '{}',
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas RLS
-- Los usuarios solo pueden ver sus propios items
CREATE POLICY "Users can view their own items" ON items
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own items" ON items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own items" ON items
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own items" ON items
    FOR DELETE USING (auth.uid() = user_id);

-- 4. Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_parent_id ON items(parent_id);
CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);

-- 5. Crear función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Habilitar extensión pgvector (si no está habilitada)
CREATE EXTENSION IF NOT EXISTS vector;
