# Wireframe: Pantalla Inicio (Nueva)

## Estructura Visual

```
┌─────────────────────────────────────┐
│ 🏠 Panel de María    [avatar]  ❤     │ ← Header
├─────────────────────────────────────┤
│                                     │
│ ¡Buenos días, María! ✨              │ ← Saludo dinámico
│                                     │
├─────────────────────────────────────┤
│ ┌─────────┐  ┌─────────┐           │
│ │📋      │  │✅       │           │
│ │Pendientes│ │Logradas │           │ ← Cards filtro rápido
│ │  (5)   │  │  (12)  │           │
│ └─────────┘  └─────────┘           │
├─────────────────────────────────────┤
│ Tags: #logro #salud #mi-mes #emocion │ ← Filtro por tags
├─────────────────────────────────────┤
│ ┌───────────────────────────────┐    │
│ │ [☕] Walk with dog          │    │
│ │ 10 pts         📅 Hoy       │    │
│ └───────────────────────────────┘    │
│ ┌───────────────────────────────┐    │
│ │ [ ] Buy groceries        │    │
│ │ 15 pts         📅 Hoy       │    │
│ └───────────────────────────────┘    │
│ ┌───────────────────────────────┐    │
│ │ [x] Make dinner          │    │   ← Lista(scroll)
│ │ 20 pts         📅 Ayer      │    │
│ └───────────────────────────────┘    │
│           ... más cards              │
│         (scroll infinito)         │
├─────────────────────────────────────┤
│                              ⏱    │ ← Botón Pomodoro
├─────────────────────────────────────┤
│ 🏠    ❤️    📅    📦            │ ← Bottom Nav
│Inicio|Salud|Historial|ulador       │
│           [+]                       │ ← Botón crear
└─────────────────────────────────────┘
```

## Componentes Detailados

### 1. Header
- **Izquierda**: Icono menú hamburguesa (abre sidebar actual)
- **Centro**: "Panel de María"
- **Derecha**: Avatar (abre perfil) + ❤ (accede a logged)

### 2. Saludo Dinámico
```
- 6am-12pm: "¡Buenos días, María! ☀️"
- 12pm-18pm: "¡Buenas tardes, María! 🌤️"
- 18pm-22pm: "¡Buenas noches, María! 🌙"
- 22pm-6am: "¡Aún estás despierta? 🌙"
```
- Incluye emoji según estado emocional del último check-in

### 3. Cards de Filtro Rápido

| Card | Color | Cantidad |
|------|-------|---------|
| 📋 Pendientes | bg-brand/10 border-brand | X tareas sin completar |
| ✅ Logradas | bg-success/20 border-success | X tareas completadas |

- Click → filtra la lista por estado
- Muestra la cuenta en tiempo real

### 4. Filtro por Tags
```
[ #logro ] [ #salud ] [ #mi-mes ] [ #emocion ]
```
- Horizontales, scroll si hay muchos
- Al clickear → filtra lista por tag
- Selected = bg-brand text-white

### 5. Lista de Tareas (Cards)

```
┌────────────────────────────────────────┐
│ ☐ Walk with dog              10 pts    │
│        📅 Hoy  •  #logro              │
└────────────────────────────────────────┘
```

**Estados:**
- Pendiente: ☐ (checkbox vacío), texto normal
- Lograda: ☕ (check filled), texto tachado, bg-success/10
- Hover: mostra botones editar/eliminar

**Scroll Infinito:**
- Cargar 10 items inicial
- Cuando scroll llega al 80% → cargar 10 más
- Loading indicator: "Cargando..." con spinner

### 6. Botón Pomodoro
- Fijo en esquina inferior derecha
- ⏱ icon + "Iniciar"
- Al clickear → abre modal Pomodoro

### 7. Bottom Navigation

| Índice | Icono | Pestaña |
|--------|------|--------|
| 0 | 🏠 | Inicio |
| 1 | ❤ | Salud |
| 2 | 📅 | Historial |
| 3 | 📦 | Baúl |
| + | + | Crear (Omni-Editor) |

**Behavior:**
- Active tab: bg-brand text-white
- Inactive: text-gray-400

### 8. Omni-Editor (Botón +)

Al hacer click → abre modal con:

```
┌─────────────────────────────────┐
│ ✕                          X  │
├─────────────────────────────────┤
│ Tipo: [Tarea] [Nota] [Enlace]     │ ← Switch rápido
├─────────────────────────────────┤
│                                 │
│ ¿Qué tienes en mente?            │ ← Input grande
│                                 │
├─────────────────────────────────┤
│ Tags: [logro] [salud] [mi-mes]   │ ← Tags opcionales
├─────────────────────────────────┤
│              [ 💾 Guardar ]      │
└─────────────────────────────────┘
```

## Notas Técnicas

### Scroll Infinito (Implementación)
```javascript
// Pseudo-código
let currentPage = 0;
const ITEMS_PER_PAGE = 20;

window.addEventListener('scroll', () => {
  if (scrollY > (documentHeight * 0.8)) {
    currentPage++;
    loadMoreItems(currentPage);
  }
});

async function loadMoreItems(page) {
  const items = await db.query(
    'SELECT * FROM registros ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [ITEMS_PER_PAGE, page * ITEMS_PER_PAGE]
  );
  renderItems(items);
}
```

### Puntos (Futuro)
- Campo en metadata: `{ puntos: 10 }`
- Card muestra puntos si existen
- Filter por puntos: rango (1-5, 6-10, 11-20, etc)