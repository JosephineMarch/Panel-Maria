-- Migration: Agregar columnas faltantes a la tabla items
-- Ejecutar en Supabase SQL Editor

-- Agregar columnas que faltan
ALTER TABLE items ADD COLUMN IF NOT EXISTS descripcion TEXT DEFAULT '';
ALTER TABLE items ADD COLUMN IF NOT EXISTS url TEXT DEFAULT '';
ALTER TABLE items ADD COLUMN IF NOT EXISTS tareas JSONB DEFAULT '[]';
ALTER TABLE items ADD COLUMN IF NOT EXISTS anclado BOOLEAN DEFAULT false;
ALTER TABLE items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Actualizar tipo para soportar español
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_type_check;
ALTER TABLE items ADD CONSTRAINT items_type_check 
    CHECK (type IN ('nota', 'tarea', 'proyecto', 'directorio'));

-- Agregar trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_items_updated_at ON items;
CREATE TRIGGER update_items_updated_at
    BEFORE UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Política de seguridad adicional: solo usuarios autenticados
DROP POLICY IF EXISTS "No anonymous access" ON items;
CREATE POLICY "No anonymous access" ON items
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Verificar que RLS esté activo
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

SELECT 'Migration completada exitosamente' as resultado;
