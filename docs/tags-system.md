# Tags / Etiquetas

> 📖 **Parte del Sistema de Diseño**: Ver `docs/design-system.md` para índice completo

Sistema de etiquetas para tareas y proyectos con autocompletado inteligente.

---

## Quick Reference

| Acción | Dónde | Cómo |
|--------|-------|------|
| Crear con tags | Quick Add | Escribir `#tag` en el texto |
| Editar tags | Modal edición | Escribir en campo etiquetas, autocompletado |
| Agregar tag | Task row | Click "+ Tag", escribir, suggestions |
| Eliminar tag | Task row | Click "X" junto a la etiqueta |
| Gestionar global | Dashboard | Sección "Gestión de Etiquetas" |

---

## CSS Classes

```
.tag           - Chip base de etiqueta
.tag-s         - Variante pequeña
.tag-primary   - Color primario (brand)
.tag-filter    - Para filtrar por tag
```

---

## Código Reutilizable

### Extraer hashtags del texto:
```javascript
const hashtags = content.match(/#[\w-]+/g);
const tags = hashtags?.map(t => t.substring(1).toLowerCase()) || [];
```

### Autocompletado simple:
```javascript
input.addEventListener('input', (e) => {
    const matches = allTags.filter(t => t.includes(e.target.value.toLowerCase()));
    dropdown.innerHTML = matches.map(t => `<div>${t}</div>`).join('');
});
```

### Sanitizar (solo < y >):
```javascript
sanitizeInput(text) {
    return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
```

---

## Estructura en DB

```json
{
    "id": "abc123",
    "content": "Mi tarea",
    "type": "tarea",
    "tags": ["salud", "emocion"]
}
```

> ⚠️ Solo tareas y proyectos tienen tags (no notas ni enlaces)