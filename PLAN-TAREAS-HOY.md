# Plan: Tareas del Día

## Idea central
Crear una tarea especial con tag "hoy" que:
- Se crea automáticamente al abrir la app
- Tiene título automático no editable ("Tareas para hoy [día fecha]")
- Deadline = medianoche
- Se muestra arriba de todo el panel

---

## Estructura

| Campo | Valor |
|-------|-------|
| Tipo | `tarea` |
| Tag | `hoy` |
| Título | Auto: "Tareas para hoy jueves 27 feb" |
| Deadline | Medianoche del día actual |
| Subtareas | Editables (checklist) |

---

## Comportamiento

1. **Al abrir app** → Buscar tarea con tag "hoy" de hoy
2. **Si no existe** → Crear automáticamente
3. **Mostrar** → Sección "Hoy" arriba de todo
4. **Al vencer** → Queda guardada para dashboard

---

## Archivos a modificar

- `logic.js` - crear/buscar tarea "hoy", filtrar render, deadline automático
- `ui.js` - estilo especial sección "hoy"

---

## Pendiente decidir
- ¿Items por defecto en la tarea del día? (ej: "ejercicio", "medicar")
