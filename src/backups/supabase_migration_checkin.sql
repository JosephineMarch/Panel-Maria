-- Migración para agregar tipo 'checkin' a la tabla items
-- Ejecutar en Supabase SQL Editor

-- 1. Eliminar el constraint CHECK actual y crear uno nuevo con 'checkin'
ALTER TABLE items DROP CONSTRAINT items_type_check;

ALTER TABLE items ADD CHECK (type IN ('nota', 'tarea', 'proyecto', 'directorio', 'checkin', 'reporte'));

-- 2. Verificar que todo funcione
-- SELECT * FROM items WHERE type = 'checkin' LIMIT 1;