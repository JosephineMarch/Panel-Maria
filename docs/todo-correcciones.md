# Todo: Correcciones y Mejoras KAI

> Documento vivo de tareas pendientes. Organizadas por sección de la app.

---

## ✅ YA IMPLEMENTADAS ( Completado )

| Fecha | Sección | Tarea |
|-------|---------|-------|
| 2026-05-17 | SALUD | Sliders horizontales para ánimo (1-10) con emojis dinámicos |
| 2026-05-17 | SALUD | Sliders horizontales para energía (1-10) con emojis dinámicos |
| 2026-05-17 | SALUD | Sueño completo: hora dormir/despertar, interrupciones, siesta, cálculo automático |
| 2026-05-17 | SALUD | Ciclo menstrual con cálculo automático de fases + próximos eventos |
| 2026-05-17 | GENERAL | Renombrar `section-hoy` → `section-salud` (footer nav ahora funciona correctamente) |
| 2026-05-16 | INICIO | Quitar icono de inicio del header |
| 2026-05-16 | INICIO | Cambiar "Inicio" por "Hola, María 💜" |
| 2026-05-16 | INICIO | Corregir filtro "Logradas" (muestra tareas completadas) |
| 2026-05-16 | INICIO | Auto-agregar tag "logro" al completar tarea |
| 2026-05-16 | INICIO | Implementar Pomodoro v1 (timer, voz, guardado en DB) |

---

# Todo: Correcciones y Mejoras KAI

> Documento vivo de tareas pendientes. Organizadas por sección de la app.

---

## 🔴 GATOS (Nueva Sección) — PRIORIDAD ALTA

| # | Tarea | Estado |
|---|-------|--------|
| G1 | Crear sección "Mis Gatos" en el footer nav | 🔲 Pendiente |
| G2 | **Registro integral**: Como fichas de gatos. Nombre, fechas (nacimiento/rescate/muerte) | 🔲 Pendiente |
| G3 | **Salud veterinaria**: Historial, desparasitación, notas médicas | 🔲 Pendiente |
| G4 | **Control de insumos**: Arena y Comida (compras, uso, alertas de fin de existencias) | 🔲 Pendiente |

---

## 🟠 HISTORIAL — PRIORIDAD ALTA

### Plan de Implementación: Unificación y Mejoras del Historial

**Objetivo:** Unificar `timeline-content` dentro de `section-historial`, agregar calendario semanal, CRUD completo, filtros avanzados y rediseño de cards.

**Arquitectura escalable:** El calendario semanal es la base para futuras vistas (diaria, mensual, Google Calendar-style).

| Fase | Paso | Tarea | Estado |
|------|------|-------|--------|
| **Fase 1** | 1.1 | Unificar `timeline-content` dentro de `section-historial` (mover búsqueda/filtros, eliminar contenedores duplicados) | ✅ Completado |
| **Fase 1** | 1.2 | Centralizar data en un solo array y actualizar `renderTimeline()` | 🔲 Pendiente |
| **Fase 2** | 2.1 | Crear estructura HTML del calendario semanal horizontal | ✅ Completado |
| **Fase 2** | 2.2 | Implementar lógica JS para generar días de la semana actual | ✅ Completado |
| **Fase 2** | 2.3 | Agregar navegación entre semanas (anterior/siguiente) | ✅ Completado |
| **Fase 2** | 2.4 | Highlight del día seleccionado y scroll automático | ✅ Completado |
| **Fase 3** | 3.1 | Rediseñar cards del historial (mismo estilo que tareas del inicio) | 🔲 Pendiente |
| **Fase 3** | 3.2 | Mostrar contenido condicional según tipo (nota=texto, tarea=checklist, enlace=URL) | 🔲 Pendiente |
| **Fase 4** | 4.1 | Implementar modal de edición para items del historial | 🔲 Pendiente |
| **Fase 4** | 4.2 | Agregar botón de eliminar con confirmación | 🔲 Pendiente |
| **Fase 4** | 4.3 | Persistir cambios en localStorage/Supabase | 🔲 Pendiente |
| **Fase 5** | 5.1 | Sistema de filtros por tipo (nota, enlace, tarea, salud, gatos) | 🔲 Pendiente |
| **Fase 5** | 5.2 | Sistema de filtros por tags | 🔲 Pendiente |
| **Fase 5** | 5.3 | Filtros combinables y fáciles de extender | 🔲 Pendiente |
| **Fase 6** | 6.1 | Pruebas de usabilidad y ajustes finales | 🔲 Pendiente |
| **Futuro** | F1 | Vista diaria del calendario | 🔲 Evaluación |
| **Futuro** | F2 | Vista mensual del calendario | 🔲 Evaluación |
| **Futuro** | F3 | Vista tipo Google Calendar (grilla completa) | 🔲 Evaluación |

---

### Historial de Cambios

| Fecha | Paso Completado | Descripción |
|-------|-----------------|-------------|
| 2026-05-17 | 1.1 | Unificada la estructura: `timeline-content` eliminado, búsqueda/filtros movidos a `section-historial`, `switchView()` actualizado |
| 2026-05-17 | 2.1-2.4 | **Fase 2 Completa**: Calendario semanal implementado - HTML agregado en section-historial, CSS de day-cell, lógica JS (changeWeek, renderWeeklyCalendar, filterBySelectedDate), inicialización en init() |

---

| # | Tarea Original | Estado | Nota |
|---|-------|--------|------|
| H1 | **Filtros**: Corregir enlace (actualmente redirige al inicio en vez de filtrar) | ✅ Resuelto | Integrado en Paso 1.1 |
| H2 | **Limpieza**: Borrar duplicados (identificar ID en inspector y eliminar resumen redundante) | 🔄 En Proceso | Se abordará en centralización de data (Paso 1.2) |
| H3 | **Renombrar**: `timeline-content` a `historial-content` | ✅ Resuelto | Eliminado en favor de unificar en `section-historial` |
| H4 | **Rediseño cards**: Más limpias, estilo tareas. Eliminar opción "cambiar tipo" | 🔲 Pendiente | Fase 3 |
| H5 | **Lógica visual**: Si es nota, solo texto; si es tarea, solo checklist; si es enlace, solo URL | 🔲 Pendiente | Fase 3 |
| H6 | **Interacción**: Definir si editar vía modal o desplegable | ✅ Decidido | Modal (Fase 4) |

---

## 🟡 SALUD — PRIORIDAD MEDIA

| # | Tarea | Estado |
|---|-------|--------|
| S1 | **Bug**: Investigar y corregir error al guardar registros de salud | 🔲 Pendiente |
| S2 | **Notificaciones**: Cambiar diseño del modal antiguo a los nuevos Sliders (ánimo/energía) | 🔲 Pendiente |
| S3 | **Diseño Historial**: Implementar iconos especiales para registros de salud | 🔲 Pendiente |
| S4 | **Organización sueño**: Definir estructura para diferenciar sueño nocturno (día previo) vs siesta (día actual) | 🔲 Pendiente |
| S5 | **Menstruación**: Refinar subsección (cálculo automático de fases y próximos eventos) | 🔲 Pendiente |

---

## 🟢 INICIO — PRIORIDAD VARIADA

| # | Tarea | Prioridad | Estado |
|---|---|---|---|
| I1 | **Bug carga**: Tareas no aparecen hasta crear una nueva o recargar página | Alta | 🔲 Pendiente |
| I2 | **Sistema tags**: Reusable (#) para crear tareas, historial y modal de footer | Media | 🔲 Pendiente |
| I3 | **Pomodoro**: Permitir vincular a una tarea específica | Media | 🔲 Pendiente |
| I4 | **Diseño**: Unificar diseño de tareas con el sistema de cards del historial | Media | 🔲 Pendiente |
| I5 | **Layout**: Corregir espacio excesivo entre header y saludo "Hola María" | Baja | 🔲 Pendiente |
| I6 | **Responsividad**: Ancho máximo de 800px para escritorio | Media | 🔲 Pendiente |
| I7 | **Productividad**: Implementar Matriz Eisenhower y Principio de Pareto | Media | 🔲 Pendiente |

---

## 🔵 GENERAL

| # | Tarea | Prioridad | Estado |
|---|---|---|---|
| G1 | **Arquitectura JS**: Modularizar código (crear archivos `salud.js`, `gatos.js`, etc.) | Media | 🔲 Pendiente |
| G2 | **Backup**: Implementar copia de seguridad automática a Google Drive (diaria, madrugada) | Media | 🔲 Pendiente |
| G3 | **Notificaciones**: Rediseñar ubicación y estilo (evaluar sidebar o pantalla completa) | Baja | 🔲 Pendiente |
| G4 | **Optimización**: Revisar si `hoy.js` es código muerto o necesario para salud | Baja | 🔲 Pendiente |

---

## 🟣 SISTEMA WIKI / RELACIONES (En evaluación)

| Feature | Descripción |
|---------|-------------|
| Campo "Relacionado con" | Vincular items de diferentes secciones (gatos, salud, notas) |
| Vínculos bidireccionales | Visualizar conexión en ambos sentidos |
| Sugerencias automáticas | Basado en tags compartidos |

---

## 🎯 ORDEN SUGERIDO

1. **GATOS**: Implementar sección completa (G1-G4).
2. **HISTORIAL**: Corregir filtros, duplicados y rediseñar cards (H1-H6).
3. **INICIO**: Corregir bug de carga y vincular Pomodoro (I1, I3).
4. **SALUD**: Arreglar guardado y notificaciones (S1, S2).
5. **GENERAL**: Backup a Drive y modularización de JS (G1, G2).

---

## 📝 NOTAS TÉCNICAS
- **Pomodoro**: Actualizar lógica para permitir selección de tareas.
- **Historial**: El diseño debe ser consistente en toda la app, evitando la creación de "resúmenes" duplicados que ahora mismo ensucian la vista.