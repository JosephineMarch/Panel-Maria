# KAI v2 — Tu Segundo Cerebro 🧠✨

**Rama**: `redesign-ui` | **Fase actual**: 1 — INICIO + Sistema de Tareas 🚧

PWA ADHD-Friendly para capturar pensamientos, tareas y enlaces al instante. IA conversacional (Kai), alarmas con push, check-ins de bienestar.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML5 + Vanilla JS (ES Modules) + Tailwind CSS CDN |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Edge Functions) |
| IA | Cerebras (gpt-oss-120b) |
| Push | Firebase Cloud Messaging FCM V1 |
| PWA | Service Worker (cache-first/network-first/stale-while-revalidate) |
| Tests | Playwright |

## Estructura

```
index.html              # UI completa + Tailwind config
app.js                  # Entry: SW register, FCM, alarmas
sw.js                   # Service Worker (kai-cache-v12)
manifest.json           # PWA manifest

src/js/                 # 13 módulos ES
├── logic.js            # KaiController — orquestador
├── ui.js               # Renderizado: cards Bento, chat, edición inline
├── data.js             # CRUD Supabase + sanitización
├── items.js            # ItemManager: load/create/update/delete/pin
├── supabase.js         # Cliente Supabase + CONFIG (tipos, iconos)
├── cerebras.js         # Motor IA: RAG, chat, 10 acciones JSON
├── auth.js             # Google OAuth + Email/Password
├── alarmas.js          # Alarmas: polling 30s, snooze, push
├── salud.js            # Módulo de Salud: ciclo, sueño, check-ins
├── ai.js               # Voz (Web Speech API)
├── firebase.js         # FCM tokens + foreground messages
├── share.js            # Share Target API
└── utils.js            # sanitize, formatDate, debounce, throttle

docs/                   # Documentación del proyecto
tests/                  # E2E con Playwright
supabase/functions/     # Edge Functions (Deno/TS)
```

## Fase 1 — INICIO + Sistema de Tareas 🚧

En desarrollo en `redesign-ui`. Cambios:

- **Nuevo Inicio**: Lista plana de tareas (sin cards Bento) con quick-add bar
- **Agrupación**: Ancladas → Vencidas → Hoy → Mañana → Esta semana → Sin fecha
- **Sistema de Puntos**: 10/20/30/50/100 por tarea
- **Filtros por Tags**: Chips clicables arriba de la lista
- **Check + Fade Out**: Animación 300ms al completar, la tarea sale del Inicio
- **Footer `+`**: En Inicio abre modo tarea por defecto

> Cards Bento (notas, proyectos, enlaces) siguen funcionando en Historial. Solo cambia el Inicio.

### Ya implementado en redesign-ui
- Paleta de colores actualizada (bg-lavender→bg-link, bg-lemon→bg-note, bg-peach→bg-urgent)
- Edición inline de cards corregida
- Selector de tipo en edición inline
- Secciones ocultas con Wishbar

## Fases siguientes

| Fase | Qué | Estado |
|------|-----|--------|
| 2 | Diseño diferencial de cards | 📋 Pendiente |
| 3 | Salud unificado | 📋 Pendiente |
| 4 | Historial como agenda | 📋 Pendiente |
| 5 | Pomodoro | 📋 Pendiente |
| 6 | Baúl + gamificación | 📋 Pendiente |
| 7 | Features extra | 📋 Pendiente |

## Instalación

```bash
git clone <repo>
git checkout redesign-ui
# Configurar Supabase en src/js/supabase.js
# Configurar Cerebras API key en src/js/cerebras.js
# Servir con Live Server o http-server
```

---
Mayo 2026
