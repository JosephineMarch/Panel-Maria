# Sistema de Diseño - KAI / Panel-María

Referencia de componentes, patrones y módulos reutilizables de la app.

> ⚠️ **Documento vivo**: Este archivo recopilael sistema de diseño de la app. Cada módulo documentado tiene su archivo detallado en la carpeta.

---

## Índice de Componentes

| Módulo | Descripción | Estado |
|--------|-------------|--------|
| [Tags/Etiquetas](#tags--etiquetas) | Sistema de etiquetas con autocompletado | ✅ Documentado |
| Quick Add | Input rápido de tareas | 🔲 Pendiente |
| Task Row | Fila de tarea con checkbox | 🔲 Pendiente |
| Cards de filtro | Pendientes/Logradas | 🔲 Pendiente |
| Dashboard | Estadísticas y reportes | 🔲 Pendiente |
| Modales | Editar tarea, etc | 🔲 Pendiente |
| Puntos | Sistema de recompensas | 🔲 Pendiente |

---

## Tags / Etiquetas

Sistema de etiquetas para tareas y proyectos con autocompletado inteligente.

### Archivos relacionados
- `src/js/logic.js` - Lógica de tags (~líneas 2900-3100)
- `src/js/ui.js` - Render de tags (~líneas 84, 2068)
- `src/js/utils.js` - Helpers (~líneas 126-140)
- `docs/tags-system.md` - Documentación completa

### Descripción rápida
- Crear tareas con `#hashtag` → se convierte en etiqueta
- Autocompletado al escribir en campos de etiquetas
- Edición inline en tareas (click X para eliminar, + Tag para agregar)
- Gestión global: renombrar/eliminar de todas las tareas

### CSS Classes
```
.tag           - Chip base de etiqueta
.tag-s         - Variante pequeña
.tag-primary   - Color primario (brand)
.tag-filter    - Para filtrar por tag
```

### Preview

```
[tarea] #salud #emocion [X] [+ Tag]
```

---

## Quick Add (Input de tareas)

### Archivos relacionados
- `index.html` - markup línea ~301
- `src/js/logic.js` - `quickAddInicio()` ~línea 1875

### Descripción rápida
Input con selector de puntos integrado para crear tareas rápidas.

### Preview

```
[ __________________________ ] [10⭐] [20⭐] [50⭐] [100🔥] [+]
```

---

## Task Row (Fila de tarea)

### Archivos relacionados
- `src/js/ui.js` - `renderTaskRow()` ~línea 2051
- `src/css/style.css` - `.task-row` ~línea 2151

### Descripción rápida
Fila de tarea con checkbox, contenido, puntos, etiquetas y acciones.

### Preview

```
[✓] Mi tarea                              [🗑]
      10⭐  #tag1  #tag2  [+Tag]
```

---

## Cards de Filtro (Pendientes/Logradas)

### Archivos relacionados
- `index.html` - markup ~líneas 318-331
- `src/js/logic.js` - `updateFilterCounts()` ~línea 2017

### Descripción rápida
Dos cards que funcionan como filtros y muestran conteo en tiempo real.

### Preview

```
[📋 Pendientes 5]  [✨ Logradas 12]
```

---

## Puntos (Sistema de recompensas)

### Archivos relacionados
- `index.html` - botones ~líneas 307-310
- `src/js/logic.js` - `updatePointsAccumulator()` ~línea 2019
- `src/css/style.css` - `.points-badge` ~línea 2290

### Descripción rápida
Sistema de puntos (10/20/50/100) para motivar completion de tareas.

### CSS Classes
```
.points-badge    - Badge de puntos
.points-badge-10 - Variante 10 puntos
.points-badge-20 - Variante 20 puntos
.points-badge-50 - Variante 50 puntos
.points-badge-100 - Variante 100 puntos
```

---

## Tokens de Diseño (Colors)

### Colors
```css
--brand: #FF8B9D           /* Principal (rosa) */
--brand-dark: #E06B7D      /* Rosa oscuro */
--secondary: #19c9cc       /* Turquesa */
--secondary-dark: #02a7af  /* Turquesa oscuro */
--success: #22c55e        /* Verde éxito */
--peach: #FFE5D9          /* Durazno */
--mint: #D1FAE5           /* Verde menta */
--link: #8B5CF6           /* Violeta (links) */
```

---

## To be documented...
- Dashboard / Estadísticas
- Modales (editar tarea, etc)
- Checkbox animations
- Filtros por tag
- Sistema de alarmas
- Historial / Timeline