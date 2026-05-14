# ROADMAP — KAI v2

**Rama**: `redesign-ui` | **Fase actual**: 1 — INICIO + Sistema de Tareas 🚧

## Fase 1 — 🔥 INICIO + Sistema de Tareas 🚧

**Estado**: En desarrollo en `redesign-ui`

Rediseño del Inicio como centro de productividad diaria:
- Quick-add bar para crear tareas en 2 segundos
- Lista plana de tareas (sin cards) agrupadas por fecha/prioridad
- Sistema de puntos (10/20/30/50/100) con acumulador
- Tags como filtros (chips clicables)
- Animación al completar (300ms check + fade out)
- Tareas completadas salen de Inicio → van a Historial
- Footer `+` abre en modo tarea por defecto

**Impacto**: Flujo de productividad diaria para TDAH

---

## Fases siguientes

| # | Nombre | Descripción | Depende de |
|---|--------|-------------|------------|
| 2 | 🎨 Diseño diferencial de cards | Cada tipo de card con identidad visual propia | Fase 1 |
| 3 | 💚 Salud unificado | Unificar sistemas de salud, múltiples check-ins por día | Fase 2 |
| 4 | 📅 Historial como agenda | Vista cronológica completa con calendario y filtros | — |
| 5 | ⏱️ Pomodoro | Timer integrado con sistema de tareas | Fase 1 |
| 6 | 🏆 Baúl + gamificación | Logros, puntos acumulados, recompensas, lista de deseos | Fase 1 |
| 7 | 🔮 Features extra | Lector archivos, gastos, mascotas, etc. | — |

---

## Mejoras futuras (sin fase asignada)

- Dashboard de logros con estadísticas visuales
- Modo oscuro
- Onboarding interactivo
- Búsqueda semántica con vector search
- Sincronización offline-first (Background Sync API)
- Integración Google Calendar
- Exportación PDF semanal
- Modo "Enfoque"
- Refactor logic.js en sub-controladores
- Proxy server para API keys
- CI/CD pipeline
- Tests E2E completos (47 funciones)

---
Mayo 2026
