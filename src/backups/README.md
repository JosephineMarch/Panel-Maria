# 📂 Backups de Base de Datos - Panel-Maria

Este directorio contiene copias de seguridad del esquema y migraciones de la base de datos Supabase.

## ¿Qué es esto?

Son archivos SQL que definen la estructura de tu base de datos:
- Tablas
- Índices
- Políticas de seguridad (RLS)
- Migraciones

## Archivos incluidos

| Archivo | Descripción |
|---------|-------------|
| `supabase_schema.sql` | Schema original - define la tabla `items` completa |
| `supabase_migration.sql` | Migración - agrega columnas faltantes |
| `supabase_migration_checkin.sql` | Migración para la tabla de check-ins |
| `supabase_migration_fcm_tokens.sql` | Migración para tokens de notificaciones push |

## ¿Para qué sirve?

1. **Respaldo**: Si algún día se rompe la DB, podés recrear la estructura
2. **Referencia**: Para ver cómo está definida la DB
3. **Migración**: Si necesitás mover la app a otro proyecto de Supabase

## ¿Cómo usar?

Si necesitás ejecutar estos archivos:
1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Seleccioná tu proyecto
3. Entrá al **SQL Editor**
4. Copiá y pegá el contenido del archivo
5. Ejecutá

## ⚠️ Nota importante

Estos archivos son snapshots del schema en el momento en que se crearon. La DB actual puede haber cambiado. Para ver el schema actual, vas a Supabase → Database → Tables.

---
*Generado automáticamente durante la auditoría del proyecto*
*Fecha: Abril 2026*