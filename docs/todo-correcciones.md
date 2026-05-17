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

## 🔴 GATOS (Nueva Sección) — PRIORIDAD ALTA

| # | Tarea | Estado |
|---|-------|--------|
| G1 | Crear sección "Mis Gatos" en el footer nav | 🔲 Pendiente |
| G2 | Registrar datos de cada gato: nombre, fecha nacimiento/rescate/muerte | 🔲 Pendiente |
| G3 | Registros de salud (veterinaria, desparasitación) | 🔲 Pendiente |
| G4 | Control de arena (compré, empezaron a usarla) | 🔲 Pendiente |
| G5 | Control de comida (compré, empezaron a comer) | 🔲 Pendiente |

---

## 🟠 HISTORIAL — PRIORIDAD ALTA

| # | Tarea | Estado |
|---|-------|--------|
| H1 | **Corregir filtros**: Al hacer click envía al inicio en vez de filtrar | 🔲 Pendiente |
| H2 | **Borrar duplicates**: Ver en inspector el ID del resumen y eliminar. Solo mostrar `timeline-content` (renombrar a "historial") | 🔲 Pendiente |
| H3 | Rediseñar cards - más limpias como tareas, sin cambio de tipo | 🔲 Pendiente |
| H4 | Tags autocomplete reusable en input de búsqueda | 🔲 Pendiente |

---

## 🟡 SALUD — PRIORIDAD MEDIA

| # | Tarea | Estado |
|---|-------|--------|
| S1 | Guardar registros de salud en historial con iconos especiales | 🔲 Pendiente |
| S2 | Definir diseño de iconos para salud en el historial | 🔲 Pendiente |

---

## 🟢 INICIO — PRIORIDAD VARIADA

| # | Tarea | Prioridad | Estado |
|---|-------|-----------|--------|
| I1 | **Tareas no aparecen**: Se demoran en mostrar, hay que crear otra para ver la anterior | Alta | 🔲 Pendiente |
| I2 | Sistema de tags reusable (input crear tareas con #, historial, modal footer) | Media | 🔲 Pendiente |
| I3 | Pomodoro - permitir vincular a tarea específica (no solo "sin tarea específica") | Media | 🔲 Pendiente |
| I4 | Rediseñar cards pendientes/logradas según sistema de diseño KAI | Media | 🔲 Pendiente |
| I5 | Espacio grande entre header y "Hola María" - corregir | Baja | 🔲 Pendiente |
| I6 | Ancho máximo 800px para modo escritorio (como blog) | Media | 🔲 Pendiente |
| I7 | Implementar Matriz Eisenhower + Principio de Pareto | Media | 🔲 Pendiente |
| I8 | Uniformidad: tareas e items del historial con mismo diseño | Media | 🔲 Pendiente |

---

## 🔵 GENERAL

| # | Tarea | Prioridad | Estado |
|---|-------|-----------|--------|
| G1 | Organizar código JS por secciones (como hoy.js → crear gatos.js, salud.js, etc.) | Media | 🔲 Pendiente |
| G2 | Rediseñar notificaciones (ubicación y diseño) | Baja | 🔲 Pendiente |
| G3 | Revisar si hoy.js es código muerto o se usa (para salud) | Baja | 🔲 Pendiente |

---

## 🟣 SISTEMA WIKI / RELACIONES — IDEA EN EVALUACIÓN

> Feature propuesto para conectar toda la información de la app.

### Concepto
Relacionar notas, tareas, salud, gatos, etc. entre sí para encontrar patrones y navegar no linealmente.

### Propuesta recomendada: Vínculos Simples

| Feature | Descripción |
|---------|-------------|
| Campo "Relacionado con" | En cada card, buscar y vincular otros items |
| Vínculos bidireccionales | Ver conexión en ambos sentidos |
| Sugerencias automáticas | "Quizás related con..." basado en tags |
| Navegación por grafo | (futuro) Ver conexiones visuales |

### Alternativas por complejidad

| Enfoque | Complejidad | TDAH-Friendly |
|---------|-------------|---------------|
| Solo tags | Baja | ✅ |
| Vínculos simples | Media | ✅ |
| Wiki completo | Alta | ❌ |

### Ejemplos de uso

```
Tarea: "Llevar gatos al vet"
  → Relacionado con: Nota "Veterinaria"
  → Relacionado con: Gato "Luna"
  → Tags: #gatos #salud

Nota: "Claves del trabajo"
  → Relacionado con: Proyecto "Trabajo"
  → Tags: #trabajo #importante
```

### Estado: ⏳ En evaluación - ¿Implementar?

---

## 🎯 ORDEN SUGERIDO PARA TRABAJAR

### Semana 1:
1. **GATOS** - Nueva sección (feature nuevo y prioridad alta)
2. **HISTORIAL H1-H2** - Filtros y duplicates (problemas graves)

### Semana 2:
3. **INICIO I1** - Tareas no se muestran (bug crítico)
4. **HISTORIAL H3** - Rediseñar cards

### Semana 3:
5. **SALUD S1-S2** - Iconos en historial
6. **INICIO I2-I3** - Tags y Pomodoro

### Semana 4:
7. **GENERAL G1** - Reorganizar código
8. Resto de tareas...

---

## 📝 NOTAS TÉCNICAS

### Pomodoro (completado):
- Timer usa timestamps para funcionar cuando la pestaña no está visible
- Usa setTimeout recursivo (200ms) para mayor precisión
- **Limitación**: navegadores ralentizan JS en pestañas inactivas
- **Futuro**: Web Worker para precisión 100%

### Timeline vs Historial:
- `timeline-content` debe renombrarse a `historial-content`
- Eliminar sección duplicada que muestra resúmenes

---

## 📋 CHANGELOG

### 2026-05-17
- ✅ Implementado sistema de salud con sliders horizontales
- ✅ Ciclo menstrual automático con fases
- ✅ Sueño completo con siesta
- ✅ Sección renombrada de "hoy" a "salud"
- 📝 Agregadas todas las tareas nuevas organizadas por sección