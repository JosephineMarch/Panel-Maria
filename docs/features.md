# Funciones — KAI v2

**Rama**: `redesign-ui` | **Fase**: 1 — INICIO + Sistema de Tareas 🚧

**Estados**: ✅ Estable | 🚧 En progreso | 📋 Pendiente

---

## Base estable (sin cambios en Fase 1)

### Captura
- ✅ Creación rápida desde barra de input
- ✅ Detección automática: notas, tareas, enlaces, alarmas, repeticiones
- ✅ Captura por voz (Web Speech API)
- ✅ Análisis offline sin IA
- ✅ Enriquecimiento con Cerebras (si hay API key)

### Cards Bento (Historial)
- ✅ Renderizado por tipo con color e icono
- ✅ Edición inline expandible (descripción, tareas, URLs, alarma)
- ✅ Checklists con agregar/eliminar/marcar
- ✅ Anclado (pinned)
- ✅ Múltiples URLs por card
- ✅ Agrupación por fecha
- ✅ Barra de progreso en proyectos

### IA (Kai)
- ✅ Chat contextual con RAG
- ✅ 10 tipos de acción JSON
- ✅ Modo offline
- ✅ Memoria de 10 mensajes

### Alarmas
- ✅ Polling local 30s
- ✅ Snooze 5/10/30 min
- ✅ Repeticiones daily/weekly/monthly
- ✅ Push multi-dispositivo FCM V1
- ✅ Prioridad high para tags urgente

### Sección Hoy
- ✅ Rutinas diarias
- ✅ Tareas del día
- ✅ Check-ins (3 momentos, energía 0-10, 10 emociones)
- ✅ Notificaciones automáticas de check-in

### Share Target
- ✅ Recepción de contenido externo
- ✅ Modal de previsualización
- ✅ Agregar a card existente
- ✅ Clasificación inteligente

### Gestión de datos
- ✅ Importación/exportación JSON
- ✅ Búsqueda full-text (RPC + ILIKE)
- ✅ Filtro por categorías y tags
- ✅ Sincronización Realtime
- ✅ Persistencia de estado (localStorage)

### PWA
- ✅ Service Worker con 3 estrategias
- ✅ Instalación PWA
- ✅ Shortcuts
- ✅ FCM token management + refresh

---

## Fase 1 — INICIO + Sistema de Tareas 🚧

| ID | Función | Descripción | Estado |
|----|---------|-------------|--------|
| F41 | Quick-add bar | Barra rápida en Inicio para crear tareas | 🚧 |
| F42 | Lista plana de tareas | Tareas agrupadas por fecha/prioridad (sin cards) | 🚧 |
| F43 | Sistema de puntos | Puntuación 10/20/30/50/100 por tarea | 🚧 |
| F44 | Filtros por tags | Chips clicables que filtran la lista | 🚧 |
| F45 | Animación al completar | Check 300ms + fade out | 🚧 |
| F46 | Tareas → Historial | Completadas salen del Inicio | 🚧 |
| F47 | Footer + modo tarea | En Inicio, + abre creación de tarea por defecto | 🚧 |

---

## Fases futuras 📋

| ID | Fase | Funciones |
|----|------|-----------|
| F48-F52 | 2 — Diseño diferencial | Cards con identidad visual propia por tipo |
| F53-F58 | 3 — Salud unificado | Unificar salud, múltiples check-ins, sueño |
| F59-F63 | 4 — Historial agenda | Calendario, línea de tiempo, filtros avanzados |
| F64-F67 | 5 — Pomodoro | Timer, integración con tareas |
| F68-F72 | 6 — Baúl gamificación | Logros, puntos, lista de deseos, recompensas |
| F73+ | 7 — Features extra | Lector archivos, gastos, mascotas |

---
Mayo 2026
