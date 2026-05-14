# ROADMAP - Panel-Maria (KAI) 🗺️

Hoja de ruta del proyecto con estado actual y mejoras futuras.

---

## ✅ Implementado

### Captura y Organización
- ✅ Captura de texto con detección automática de tipo (nota, tarea, proyecto, directorio)
- ✅ Captura por voz con Web Speech API
- ✅ Análisis offline del input (sin necesidad de IA)
- ✅ Enriquecimiento con IA (Cerebras gpt-oss-120b con contexto RAG)
- ✅ Cards Bento expandibles con edición inline
- ✅ Múltiples URLs por card (estructura de datos + edición inline)
- ✅ Checklists con agregar/eliminar/marcar tareas
- ✅ Anclado de items (pinned)
- ✅ Agrupación por fecha (Hoy, Ayer, esta semana, etc.)
- ✅ Barra de progreso en proyectos
- ✅ Filtro por categorías y tags
- ✅ Búsqueda full-text con RPC de Supabase

### Inteligencia Artificial
- ✅ Chat contextual con Kai (10 tipos de acción JSON)
- ✅ Modo offline sin API key
- ✅ Memoria de conversación (10 mensajes)
- ✅ Contexto RAG con items actuales del usuario

### Alarmas y Notificaciones
- ✅ Alarmas con polling local (cada 30s)
- ✅ Snooze: 5, 10, 30 minutos (inline) + 5, 10 min (push)
- ✅ Alarmas repetitivas (daily, weekly, monthly)
- ✅ Push notifications multi-dispositivo (FCM V1 API)
- ✅ Prioridad de notificaciones (high/normal)
- ✅ Notificaciones inline con banner animado

### Sección "Hoy"
- ✅ Rutinas diarias con completitud
- ✅ Tareas del día (crear, completar, eliminar)
- ✅ Check-ins de bienestar (3 momentos: mañana/tarde/noche)
- ✅ Seguimiento de energía (0-10) y emoción (10 estados)
- ✅ Notificaciones automáticas de check-in

### Share Target
- ✅ Recepción de contenido compartido (GET params)
- ✅ Modal de previsualización con título editable y dominio
- ✅ Clasificación inteligente de tipo sugerido
- ✅ Selector de card existente para agregar URL
- ✅ Dual action: nueva card o agregar a existente

### PWA y Conectividad
- ✅ Service Worker con cache v12 y 3 estrategias
- ✅ Manifest con Share Target, Shortcuts, Screenshots
- ✅ Firebase Cloud Messaging con token refresh automático
- ✅ Sincronización realtime con Supabase
- ✅ Persistencia de estado (vista, card expandida, filtros)
- ✅ Importación/exportación JSON

### Testing
- ✅ Playwright configurado en package.json

---

## 🚧 En Progreso

- 🚧 **Múltiples enlaces UI completa**: La estructura de datos soporta arrays de URLs y la edición inline permite agregar/quitar, pero falta la UI tipo Google Keep para reordenar enlaces, descripciones y tareas con drag & drop.

---

## 📋 Plan de Fases

### Fase 1 — 🔥 INICIO + SISTEMA DE TAREAS (Siguiente)
- **Estado**: Planificado (ver `docs/architecture.md` → Fase 1)
- **Descripción**: Rediseño completo del Inicio como centro de productividad:
  - Quick-add bar para crear tareas en 2 segundos
  - Lista plana de tareas (sin cards) agrupadas por fecha/prioridad
  - Sistema de puntos (10/20/30/50/100)
  - Tags como filtros (chips clicables)
  - Animación al completar (300ms check + fade out)
  - Tareas completadas salen de Inicio → van a Historial
  - Footer `+` sigue siendo el capturador universal (notas, enlaces, proyectos)
- **Impacto**: Flujo de productividad diaria para TDAH

### Fase 2 — 🎨 DISEÑO DIFERENCIAL DE CARDS
- **Estado**: Pendiente
- **Descripción**: Cada tipo de card (nota, tarea, enlace, proyecto) con identidad visual propia
- **Depende de**: Fase 1

### Fase 3 — 💚 SALUD UNIFICADO
- **Estado**: Pendiente
- **Descripción**: Unificar los dos sistemas de salud actuales, agregar interrupciones de sueño, múltiples check-ins por día
- **Depende de**: Fase 2

### Fase 4 — 📅 HISTORIAL COMO AGENDA
- **Estado**: Pendiente
- **Descripción**: Vista cronológica completa con filtros, tipo calendario/agenda. TODO visible aquí.

### Fase 5 — ⏱️ POMODORO
- **Estado**: Pendiente
- **Descripción**: Timer funcional, integrado con el sistema de tareas

### Fase 6 — 🏆 BAÚL + GAMIFICACIÓN
- **Estado**: Pendiente
- **Descripción**: Logros, puntos acumulados, recompensas, features extra

### Fase 7 — 🔮 FEATURES EXTRA
- **Estado**: Pendiente
- **Descripción**: Lector de archivos, gastos, mascotas, etc.

---

## 🔮 Futuras Mejoras

### UX/UI
- 🔮 Dashboard de logros mejorado con estadísticas visuales y tendencias
- 🔮 Modo oscuro
- 🔮 Animaciones de transición entre vistas
- 🔮 Personalización de colores y temas
- 🔮 Onboarding para nuevos usuarios

### Funcionalidades
- 🔮 Búsqueda semántica con vector search (embeddings)
- 🔮 Sincronización offline-first con Background Sync API
- 🔮 Integración con calendarios externos (Google Calendar)
- 🔮 Exportación a PDF de resúmenes semanales
- 🔮 Recordatorios basados en ubicación (Geolocation API)
- 🔮 Modo "Enfoque" — ocultar todo excepto la tarea actual
- 🔮 Estadísticas de productividad (items creados, completados, streaks)

### Arquitectura
- 🔮 Refactorizar `logic.js` en sub-controladores (ItemController, HoyController, SearchController)
- 🔮 Refactorizar `ui.js` con sistema de templates
- 🔮 Proxy server para API keys (Cerebras)
- 🔮 Tests E2E completos con Playwright (40 funciones)
- 🔮 CI/CD pipeline
- 🔮 PWA con background sync para offline completo

### IA
- 🔮 Modelos más avanzados cuando estén disponibles
- 🔮 Análisis de patrones emocionales a largo plazo
- 🔮 Sugerencias proactivas basadas en hábitos
- 🔮 Resumen automático semanal de logros y pendientes

---

## 📊 Métricas del Proyecto

| Métrica | Valor |
|---------|-------|
| Módulos ES | 14 |
| Funciones documentadas | 40 |
| Versión de caché SW | v12 |
| Modelo de IA | gpt-oss-120b |
| Tablas Supabase | 6+ (items, fcm_tokens, daily_checkins, daily_routines, daily_routine_completions, daily_tasks) |
| Tipos de acción IA | 10 |
| Estrategias de caché | 3 |
| Proveedores de auth | 2 (Google, Email) |

---

Última actualización: Abril 2026
