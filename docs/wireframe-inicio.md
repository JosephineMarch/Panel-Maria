# Wireframe: Inicio — KAI v2

**Rama**: `redesign-ui` | **Fase**: 1 — INICIO + Sistema de Tareas 🚧

## Estructura

```
┌─────────────────────────────────────┐
│ 🏠 KAI                  [avatar]    │ ← Header
├─────────────────────────────────────┤
│ ¡Buenos días, María! ✨             │ ← Saludo dinámico
├─────────────────────────────────────┤
│ [Escribe una tarea... ]  [➕] [🎤]    │ ← Quick-add bar
├─────────────────────────────────────┤
│ [Todas] [Pendientes] [Logradas]      │ ← Filtros base
│ [#logro] [#salud] [#trabajo]         │ ← Tags chips
├─────────────────────────────────────┤
│ 📌 Ancladas                          │
│ ☐ Tarea importante          10 pts   │
│                                       │
│ 🔴 Vencidas                          │
│ ☐ Tarea vencida             20 pts   │
│                                       │
│ 📅 Hoy                               │
│ ☐ Regar plantas             #jardín  │
│ ☐ Llamar médico            #salud    │
│                                       │
│ 📅 Mañana / 📅 Esta semana            │
│ ☐ Otra tarea                         │
│                                       │
│ 🗂️ Sin fecha                          │
│ ☐ Tarea sin deadline                 │
├─────────────────────────────────────┤
│ 🏠   ❤️   📅   📦    [➕]            │ ← Bottom nav
└─────────────────────────────────────┘
```

## Componentes

### Header
Logo + título + avatar (perfil). Sin campana ni extras.

### Saludo
`6-12: "Buenos días" · 12-18: "Buenas tardes" · 18-22: "Buenas noches" · 22-6: "¿Despierta?"`
Incluye emoji del último check-in emocional.

### Quick-add bar
Input tipo texto. Enter crea tarea con puntos por defecto. Botón + abre modal de tarea. Micrófono para voz.

### Filtros
- [Todas] [Pendientes] [Logradas] — filtros base
- Tags como chips horizontales (scroll si hay muchos)
- Selected: bg-brand text-white

### Lista de tareas
```
┌────────────────────────────────────┐
│ ☐ Walk with dog              10 pts│
│        📅 Hoy  •  #logro           │
└────────────────────────────────────┘
```
- Pendiente: ☐ checkbox vacío
- Hover: botones editar/eliminar
- Completada: check animado 300ms + fade out

### Bottom nav
| # | Icono | Vista |
|---|-------|-------|
| 0 | 🏠 | Inicio |
| 1 | ❤️ | Salud |
| 2 | 📅 | Historial |
| 3 | 📦 | Baúl |
| + | ➕ | Crear (Omni-Editor) |

Active tab: bg-brand text-white. + siempre visible y fijo.

---
Mayo 2026
