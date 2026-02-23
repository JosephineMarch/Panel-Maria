# Plan de Implementación: Bitácora Automática

**Fecha de creación:** 22/02/2026  
**Estado:** Pendiente de implementación  
**Objetivo:** Detectar automáticamente cuando Maria cuenta que realizó una acción y guardarla en una bitácora personal.

---

## Problema Actual

Kai no entiende bien a Maria cuando le cuenta cosas que hizo. No detecta cuando ella dice "hoy hice ejercicio", "ayer terminé el proyecto", "me bañé", etc.

---

## Solución

Detectar frases automáticamente (offline, sin internet) y guardarlas como entradas de bitácora con timestamp automático.

---

## Patrones a Detectar

| Patrón | Ejemplo de entrada | Extrae |
|--------|-------------------|--------|
| `hoy hice...` | "Hoy hice ejercicio" | "ejercicio" |
| `ayer terminé...` | "Ayer terminé el proyecto" | "el proyecto" |
| `acabo de...` | "Acabo de comer" | "comer" |
| `me bañé` | "Me bañé" | "me bañé" |
| `estudié...` | "Estudié matemáticas" | "matemáticas" |
| `trabajé en...` | "Trabajé en el proyecto" | "el proyecto" |
| `empecé...` | "Empecé a leer" | "leer" |

---

## Estructura de Datos

### Opción elegida: Todo junto (misma tabla items)

Usar el campo `type` existente, añadiendo "bitacora" como nuevo tipo.

```javascript
// Estructura del item en localStorage/Supabase
{
  id: "bit-123456",
  type: "bitacora",
  content: "Hice ejercicio",        // Lo que Maria hizo
  tags: ["bitacora", "accion"],     // Para filtrar
  meta: {
    momento: "hoy",                  // "hoy", "ayer", "esta mañana"
    emocion: "😊"                    // Opcional: detectar emoji
  },
  deadline: null,
  anclado: false,
  created_at: "2026-02-22T08:00:00Z"
}
```

---

## Archivos a Modificar

### 1. `src/js/ai.js`
- Agregar función `detectarBitacora(texto)` 
- Retorna objeto con `{ esBitacora: boolean, contenido: string, momento: string }`
- Usa regex patterns para detección offline

### 2. `src/js/ui.js`
- Agregar configuración del tipo "bitacora" en `typeConfig`:
```javascript
bitacora: { color: 'bitacora', icon: '📝', solid: 'theme-bitacora', label: 'BITÁCORA' }
```
- Agregar estilos theme-bitacora en el CSS

### 3. `src/js/logic.js`
- En `handleSubmit()`: después de parsear intent, verificar si es bitácora
- Si es bitácora: crear item con type "bitacora" y tags ["bitacora"]
- En `handleKaiChat()`: integrar detección de bitácora antes de enviar a IA

### 4. `index.html`
- Agregar botón de categoría "📝 Bitácora" en el nav

### 5. `src/css/style.css` (si es necesario)
- Agregar estilos para theme-bitacora

---

## Flujo de Usuario

1. **Input de voz o texto**: Maria dice "Hoy hice ejercicio"
2. **Detección**: El sistema detecta el patrón de bitácora
3. **Confirmación (opcional)**: Kai pregunta "¿Querías que lo anotara?" o simplemente lo anota
4. **Guardado**: Se crea entrada en bitácora con timestamp
5. **Feedback**: Kai responde "¡Anotado en tu bitácora! ✨"
6. **Visualización**: Nueva categoría muestra las entradas

---

## UI Esperada

### En el filtro de categorías:
```
[Todos] [📁 Proyectos] [🏆 Logros] [📝 Bitácora]
```

### Como card en el panel:
```
┌─────────────────────────────┐
│ 📝 BITÁCORA                │
│ ─────────────────────────── │
│ Hice ejercicio              │
│ Hoy 8:00am           😊    │
└─────────────────────────────┘
```

---

## Consideraciones

- **Offline**: La detección funciona sin internet (regex, no IA)
- **Rendimiento**: No afectar velocidad de input
- **UX**: No intrusivo, Kai responde suavemente

---

## Pendiente

- [x] Implementar detección en ai.js
- [x] Agregar tipo bitacora en ui.js
- [x] Integrar en logic.js
- [x] Añadir botón en index.html
- [ ] Testear flujo completo
