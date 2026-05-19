# Arquitectura — KAI v2

**Rama**: `redesign-ui` | **Fase**: 1 — INICIO + Sistema de Tareas 🚧

## Modelo de Capas

```
UI (ui.js) → Controller (logic.js) → Managers (items.js, alarmas.js, etc.) → Data (data.js) → Supabase
```

13 módulos ES con patrón singleton. Comunicación vía Custom Events (`window.dispatchEvent`).

## Módulos

| Módulo | Responsabilidad |
|--------|----------------|
| `logic.js` | KaiController: orquestación, eventos, navegación, IA |
| `ui.js` | Renderizado: cards Bento, chat Kai, edición inline, dashboard |
| `data.js` | CRUD Supabase, sanitización, búsqueda full-text |
| `items.js` | ItemManager: load/create/update/delete/finish/pin |
| `supabase.js` | Cliente Supabase + CONFIG (tipos, iconos, colores) |
| `cerebras.js` | Motor IA: RAG, chat, 10 acciones JSON |
| `auth.js` | Google OAuth + Email/Password |
| `alarmas.js` | Alarmas: polling 30s, snooze, repeticiones, push |
| `salud.js` | Gestión de Salud: ciclo, sueño, check-ins |
| `ai.js` | Voz (Web Speech API) + detección offline |
| `firebase.js` | FCM tokens + foreground messages |
| `share.js` | Share Target API |
| `utils.js` | sanitize, formatDate, debounce, throttle |

## Flujo de creación de item

1. Input en barra o footer `+`
2. `parseInputOffline()` detecta URLs, checklists, tipos, alarmas
3. Si hay API key, `cerebras.ask()` enriquece con IA
4. `data.createItem()` persiste en Supabase con sanitización
5. Si tiene deadline, trigger DB crea registro en `alarm_notifications`
6. Realtime vía `public:items` channel recarga UI con debounce 1s
7. Estado persistido en localStorage (`kai_state`)

---

## Fase 1 — INICIO + Sistema de Tareas

### Modelo híbrido de datos

```
NIVEL 1: Tarea independiente (type: 'tarea')
├── content, completado, puntos (10/20/30/50/100), tags, deadline
└── parent_id: null

NIVEL 2: Proyecto con subtareas (type: 'proyecto')
├── content, tareas: [{titulo, completado}], descripcion, urls, tags
└── Se visualiza como CARD en Historial, NO en Inicio
```

### Vista Inicio

```
Quick-add bar → [
[Todas] [Pendientes] [Logradas] ← filtros base
[#tag1] [#tag2] [#tag3]         ← chips tag

📌 Ancladas
  ☐ Tarea importante pinchada

🔴 Vencidas
  ☐ Tarea con deadline pasado

📅 Hoy / 📅 Mañana / 📅 Esta semana / 🗂️ Sin fecha
  ☐ Tarea con puntos y tags
```

### Comportamiento

| Acción | Resultado |
|--------|-----------|
| Click checkbox | Check animado 300ms + fade out → sale de Inicio |
| Click texto | Expande inline para editar |
| Quick-add | Crea `type: 'tarea'` con puntos asignados |
| Completar | Va a Historial, suma puntos |
| Tags | Se crean inline, aparecen como chips filtro |

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `index.html` | Nueva estructura de Inicio (quick-add, lista, filtros, secciones) |
| `src/js/ui.js` | Nuevo renderInicioTasks() para lista plana (no cards) |
| `src/js/logic.js` | Filtros (pendientes/logradas/tags), quick-add handler, puntos |
| `src/js/data.js` | Soporte campo `puntos` y `completado` |
| `src/css/style.css` | Estilos lista tareas, chips tags, animación check |

> No modifica cards existentes (notas, proyectos, enlaces). Siguen en Historial y footer `+`.

---
Mayo 2026
