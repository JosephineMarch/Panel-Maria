# Plan de Implementación: Reestructuración de Tipos y Tags

**Fecha de creación:** 23/02/2026  
**Estado:** ✅ Completado

---

## Estructura Final

### Tipos (para UI y filtrado rápido)

| Tipo | Propósito |
|------|-----------|
| `nota` | Texto libre + fecha/hora automática |
| `task` | Lista de tareas (checklist) |
| `proyecto` | Carpeta que agrupa notas/tasks |
| `directorio` | Enlaces de otras apps/webs |
| `logro** | Cosas completadas (manual) |

### Tags (para análisis)

| Tag | Cuándo se aplica |
|-----|-----------------|
| `alarma** | Cuando tiene deadline |
| `bitacora** | Detección automática de acciones (hice, terminé, etc.) |
| `accion** | Alias de bitácora |
| `salud** | "me dolió", "estuve cansada" |
| `emocion** | "me sentí bien", "estoy triste" |

---

## Filtros en UI

### Tipos
- Todos, Notas, Proyectos, Tareas, Enlaces, Logros

### Tags
- Acciones (bitácora), Salud, Emociones

---

## Completado

- [x] tipos: idea → nota
- [x] detectarAlarmas()
- [x] Detección de tags (salud, emocion)
- [x] Filtros por tags en UI
- [x] Tags visibles en cards expandidas
- [x] Quitado tipo "bitácora" - ahora es "nota" con tags
