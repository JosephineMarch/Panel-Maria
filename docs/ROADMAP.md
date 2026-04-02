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

## 📋 Pendiente - Alta Prioridad

### 1. Múltiples enlaces con estilo Google Keep
- **Problema actual**: Se pueden guardar varios enlaces (estructura de datos lista), pero no se pueden reordenar ni organizar como bloques independientes.
- **Requerimiento**: Que cada card tenga bloques reordenables de: texto, checklist, deadline, enlaces múltiples — como Google Keep.
- **Impacto**: Mejora significativa en la organización visual de la información.

### 2. Sección "Hoy" funcional completa
- **Problema actual**: La sección existe como pestaña secundaria pero la creación de nuevos items y el marcado de tareas por defecto (medicación) no funcionan correctamente.
- **Requerimiento**: 
  - Poder crear nuevos items desde la sección Hoy
  - Poder marcar como hechas las tareas por defecto (medicación)
  - Por defecto la pestaña activa debe ser Timeline, no Hoy
- **Impacto**: La sección Hoy es clave para la rutina diaria ADHD.

### 3. Pantalla de inicio de sesión dedicada
- **Problema actual**: El login se hace desde un sidebar, sin una pantalla dedicada.
- **Requerimiento**: Pantalla de login separada con diseño personalizable (el usuario ilustrará después).
- **Impacto**: Mejor primera impresión y onboarding.

### 4. Limpiar el proyecto
- **Problema actual**: Hay archivos que confunden y marean.
- **Requerimiento**: 
  - Eliminar archivos no utilizados
  - Organizar estructura de carpetas
  - Limpiar código muerto o comentado
  - Verificar que todos los módulos del SW estén en STATIC_ASSETS
- **Impacto**: Reduce confusión y mejora mantenibilidad.

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
