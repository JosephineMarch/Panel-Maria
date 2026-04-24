# Design

Based on: Stitch DESIGN.md format

## Visual Theme

**Kawaii Funcional** — Estética pastel-vibrante con formas orgánicas (blobs), pero con personalidad propia. Las ilustraciones custom reemplazan emojis genéricos para crear identidad de marca única. El feeling: "diario de creatividad personal" — íntimo, handmade, pero con estructura de app funcional.

**Physical scene**: Persona con TDAH usando la app en un momento de claridad, quizás en la cama antes de dormir o durante una pausa en el trabajo. Ambiente: luz suave, momento de calma. La app debe sentirse como un espacio seguro, no como una herramienta de productividad corporativa.

## Color Palette

### Brand Colors (CSS custom properties)

```css
--primary: #ff9ba7;          /* Sugar Pink - color primario */
--primary-dark: #fe6d7f;    /* Hover/active state */
--primary-light: #ffe4e8;    /* Backgrounds, highlights */

--secondary: #19c9cc;        /* Turquesa - acciones secundarias */
--accent: #ffde8d;           /* Amarillo - acentos, energía */

--cream: #FFFDF5;            /* Background principal */
--ink: #4A4A4A;              /* Texto principal */
--ink-light: #9ca3af;       /* Texto secundario */
--card-bg: #FFFFFF;          /* Cards background */
--input-bg: #F3F4F6;        /* Input backgrounds */
--border-soft: #f3e8e8;     /* Bordes suaves (tinted) */

--success: #B9FBC0;          /* Mint - completado, éxito */
--urgent: #FFDAC1;           /* Peach - prioridad */
```

### Color Strategy: **Committed**

El color primario (#ff9ba7) domina ~40-50% de la superficie. El secundario turquesa (#19c9cc) proporciona contraste funcional. El accent amarillo (#ffde8d) se usa estratégicamente para estados destacados.

**Regla**: Solo colores sólidos. NUNCA gradients.

### Dark Mode

**No implementar inicialmente.** Enfocar en light mode primero. Dark mode puede considerarse en fase 2 si hay demanda.

## Typography

### Font Stack

```css
--font-primary: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
```

**Solo Poppins**. Sin handwritten fonts. Las ilustraciones de la usuaria aportan el toque personal.

### Type Scale

```css
--text-xs: 0.75rem;     /* 12px - metadata, timestamps */
--text-sm: 0.875rem;    /* 14px - secondary text */
--text-base: 1rem;      /* 16px - body text */
--text-lg: 1.125rem;    /* 18px - card titles */
--text-xl: 1.25rem;     /* 20px - section headers */
--text-2xl: 1.5rem;     /* 24px - page titles */
--text-3xl: 1.875rem;   /* 30px - hero elements */
```

### Line Heights & Measure

- Body: 1.5-1.6 line-height
- Headings: 1.2-1.3 line-height
- Maximum line length: 65-75ch

## Components

### Cards (Bento-style)

```
Background: --color-card-bg (white)
Border: none (o border de color suave según tipo)
Border-radius: rounded-[2rem] (Tailwind) — formas blob
Shadow: shadow-sticker (0 6px 0px 0px rgba(0,0,0,0.08))
Padding: p-4 a p-6
States:
  - Default: bg-white, shadow-sticker
  - Hover: bg-gray-50, shadow-sticker-hover
  - Pinned: border-l-4 border-brand
```

### Color Coding by Type

```
Nota:     bg-brand/5, left accent brand
Tarea:    bg-soft-blue/10, left accent soft-blue
Proyecto: bg-peach/10, left accent peach
Enlace:   bg-accent/10, left accent lavender
```

### Buttons

```
Primary: bg-brand, text-white, rounded-blob, shadow-sticker
Secondary: bg-white, border-2 border-brand, text-brand
Ghost: bg-transparent, text-brand, hover:bg-brand/10
Sizes: 
  - sm: py-2 px-4, text-sm
  - md: py-3 px-6, text-base (default)
  - lg: py-4 px-8, text-lg
States:
  - Hover: bg-brand-dark, scale-[1.02]
  - Active: scale-[0.98], shadow-pressed
  - Disabled: opacity-50, cursor-not-allowed
```

### Inputs

```
Background: bg-input-bg (--color-input-bg)
Border: border-2 border-transparent
Focus: border-brand, ring-2 ring-brand/20
Border-radius: rounded-blob (2rem) para pills, rounded-xl para inputs
Padding: py-3 px-4 mínimo (touch-friendly)
```

### Checkboxes (Custom Kawaii)

```
Size: 24x24px
Border: 2px solid --color-action
Border-radius: 8px
Background: white (unchecked), --color-success (checked)
Icon: ✓ centered en verde cuando checked
```

### Modals

```
Background: white, rounded-blob
Overlay: bg-ink/20 con backdrop-blur-sm
Max-width: max-w-lg (mobile-first)
Border-radius: rounded-blob
Shadow: shadow-2xl
```

### Tags/Badges

```
Background: brand/10
Border: border-brand/20
Text: text-brand, font-bold, text-xs
Border-radius: rounded-full (pills)
Padding: px-3 py-1
```

## Icon System

### Strategy: **Illustrated Brand + Functional Icons**

**Para elementos de marca** (moments that define identity):
- Ilustraciones custom de la usuaria (SVG inline)
- Reemplazan emojis en: headers de secciones, empty states, logros, onboarding
- Mantienen el estilo "colored pencil" de las ilustraciones existentes

**Para elementos funcionales** (utility, not decoration):
- Font Awesome 6 (line style) para: filtros, navegación, acciones de UI
- Mantener consistencia: solo iconos line, no solid

**Transición gradual**:
1. Fase 1: Reemplazar emojis principales con SVGs inline de ilustraciones
2. Fase 2: Crear set de iconos custom basados en el estilo de las ilustraciones
3. Fase 3: Sistema de iconos 100% propio

**Nota**: Los emojis actuales en el código no son remove-drastically, pero las nuevas implementaciones usan el sistema híbrido.

## Spatial System

### Base Unit: 4px

```
Spacing scale (Tailwind):
0: 0
1: 0.25rem (4px)
2: 0.5rem (8px)
3: 0.75rem (12px)
4: 1rem (16px) — base spacing
6: 1.5rem (24px)
8: 2rem (32px)
12: 3rem (48px)
16: 4rem (64px)
```

### Layout Rhythm

- Cards: gap-4 a gap-6 (mobile), gap-6 a gap-8 (desktop)
- Secciones: space-y-6 a space-y-8 entre secciones
- Padding containers: px-3 (mobile), px-8 (desktop)
- Maximum content width: max-w-7xl

### Touch Targets

Minimum 44x44px para todos los elementos interactivos (WCAG compliance).

## Motion

### Animation Philosophy

**Moderado / Juguetón** — Animaciones que adding personality sin ser distractoras. Cada motion tiene propósito: confirmar acción, guide attention, o add delight.

### Core Animations

```css
/* Transiciones UI */
transition-all duration-200 ease-out

/* Hover feedback */
hover:scale-[1.02] active:scale-[0.98]

/* Blob buttons hover */
shadow-sticker-hover (sombra se profundiza)

/* Card expand/collapse */
transition-transform duration-300 ease-out

/* Sidebar slide */
transform -translate-x-full, transition-transform duration-300

/* Wiggle sutil (elementos destacados) */
@keyframes wiggle: rotate(-3deg) → rotate(3deg), 1s ease-in-out infinite
```

### Don't Animate

- Propiedades CSS layout (width, height, margin, padding)
- Transiciones que bloquean interacción
- Elementos críticos para usuarios con TDAH (vestibular disorders)

### Micro-interactions

```
Checkbox completion: scale bounce (0.95 → 1.05 → 1)
Card creation: fade-in + slide-up sutil
Toast notifications: slide-in from bottom + fade
Modal: backdrop blur + scale from 0.95
```

## Elevation & Shadows

```css
--shadow-bubble: 0 4px 0px 0px rgba(0,0,0,0.05);
--shadow-sticker: 0 6px 0px 0px rgba(0,0,0,0.08);
--shadow-sticker-hover: 0 8px 0px 0px rgba(0,0,0,0.08);
--shadow-pressed: inset 0 4px 6px rgba(0,0,0,0.1);
--shadow-float: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
```

## Responsive Breakpoints

```css
/* Mobile first */
sm: 640px   /* Phones landscape */
md: 768px   /* Tablets */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
```

Grid system: 1 columna mobile, 2 columnas tablet+, máximo 2 columnas en feed (bento layout).

## Special Considerations

### Illustration Integration

Las ilustraciones custom de la usuaria se integran en:
1. **Empty states** — Ilustración + mensaje encouraging
2. **Achievement moments** — Celebración visual al completar metas
3. **Onboarding** — Guía visual del primer uso
4. **Headers de sección** — Branding en "Hoy", "Baúl", etc.
5. **Kai (asistente)** — Avatar ilustrado, no emoji

### Reduced Motion

Respetar `prefers-reduced-motion`. Si el usuario prefiere motion mínimo, deshabilitar animaciones no esenciales.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```