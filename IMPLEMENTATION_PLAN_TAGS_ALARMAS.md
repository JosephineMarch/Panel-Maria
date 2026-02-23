# Plan de Implementación: Reestructuración de Tipos y Tags

**Fecha de creación:** 23/02/2026  
**Estado:** Pendiente de implementación  
**Versión anterior:** Sistema con tipos "idea", "bitacora", "logro", "reminder"

---

## Objetivo

Simplificar la estructura de categorías manteniendo la funcionalidad existente y agregando nuevas capacidades para análisis personal (emociones, salud).

---

## ⚠️ Importante: No se toca la base de datos

**Los datos existentes NO se modifican.** Solo se cambia el código.
- Los items con `type: 'idea'` seguirán funcionando
- Los items con `type: 'directorio'` siguen igual
- Los deadlines existentes se mantienen
- Los tags existentes se mantienen

---

## Nueva Estructura

### Tipos (para UI y filtrado rápido)

| Tipo | Propósito | Notas |
|------|-----------|-------|
| `nota` | Texto libre + fecha/hora automática | Antes "idea" |
| `task` | Lista de tareas (checklist) | Sin cambios |
| `proyecto` | Carpeta que agrupa notas/tasks | Sin cambios |
| `directorio` | Enlaces de otras apps/webs | Sin cambios |

### Tags (para análisis y detección automática)

| Tag | Cuándo se aplica | Ejemplo |
|-----|------------------|---------|
| `logro` | Cuando completas algo (manual) | - |
| `salud` | Cosas físicas del cuerpo | "me dolió", "estuve cansada" |
| `emocion` | Estados emocionales | "me sentí bien", "estoy triste" |

---

## Detección Automática (Offline)

### 1. Alarmas (comando en cualquier parte del texto)

**Comando:** `alarma:` o `recordatorio:`

| Input | Resultado |
|-------|-----------|
| "comprar leche, alarma: a las 6pm" | Crea nota con deadline 18:00 |
| "recordatorio: reunión a las 3" | Crea nota con deadline 15:00 |
| "alarma para mañana 9am" | Crea nota con deadline mañana 9:00 |

**Patrones de hora a detectar:**
- "a las 6pm", "a las 9am"
- "para las 14:00"
- "hoy", "mañana"
- "en 1 hora"

### 2. Tags Automáticos

| Patrón | Tag |
|--------|-----|
| "me dolió...", "estuve cansada...", "me enfermé...", "me_duele..." | `salud` |
| "me sentí...", "estoy...", "me siento...", "me siento..." | `emocion` |

---

## Detección de Logros (Manual)

El usuario marca manualmente cuando algo es un logro (ya funciona con el botón "Terminar" → convierte a tipo "logro").

---

## Notas siempre con fecha/hora

- Todas las notas capturan `created_at` automáticamente
- Se muestra en la UI (ya implementado para bitácora)

---

## Compatibilidad hacia atrás

### Datos existentes que siguen funcionando:

| Campo | Valor actual | Comportamiento |
|-------|-------------|----------------|
| type | 'idea' | Se muestra como "nota" |
| type | 'directorio' | Sin cambios |
| type | 'task' | Sin cambios |
| type | 'proyecto' | Sin cambios |
| deadline | cualquier fecha | Sin cambios |
| tags | cualquier array | Sin cambios |

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/js/ai.js` | - Nueva función detectarAlarmas() <br> - Actualizar detectarBitacora() para detectar tags <br> - Agregar detección de emociones/salud |
| `src/js/logic.js` | - Integrar detección de alarmas en handleSubmit() <br> - Integrar tags en la creación |
| `src/js/ui.js` | - Cambiar "idea" → "nota" en typeConfig <br> - Actualizar labels en selects |
| `src/css/style.css` | - Actualizar si es necesario |
| `index.html` | - Actualizar labels si es necesario |
| `src/js/demo-data.js` | - Regenerar con nuevos tipos/tags |

---

## Orden de Implementación

1. Actualizar typeConfig (solo nombres)
2. Agregar detección de alarmas en ai.js
3. Agregar detección de tags (salud, emocion) en ai.js
4. Integrar en logic.js
5. Regenerar demo-data.js
6. Probar

---

## Pendiente

- [ ] Actualizar typeConfig: idea → nota
- [ ] Agregar detectarAlarmas() en ai.js
- [ ] Actualizar detectarBitacora() para tags
- [ ] Agregar detección de emociones y salud
- [ ] Integrar en logic.js
- [ ] Regenerar demo-data.js
- [ ] Probar todo

---

## Notas

- Los cambios son solo en código JavaScript
- La base de datos NO se modifica
- Los datos existentes siguen funcionando
- El comando "alarma:" se detecta en cualquier parte del texto
