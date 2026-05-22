# Design System — KAI v2

**Rama**: `redesign-ui` | **Fase**: 1 — INICIO + Sistema de Tareas 🚧

## Tema Visual

**Kawaii Funcional** — pastel-vibrante con formas orgánicas. Feeling de "diario de creatividad personal": íntimo, handmade, con estructura de app funcional. Sin gradients. Sin handwritten fonts.

## Paleta

```css
--primary: #ff9ba7;          /* Sugar Pink */
--primary-dark: #fe6d7f;
--secondary: #19c9cc;        /* Turquesa */
--accent: #ffde8d;           /* Amarillo */
--cream: #FFFDF5;            /* Fondo principal */
--ink: #4A4A4A;              /* Texto */
--card-bg: #FFFFFF;
--input-bg: #F3F4F6;
--success: #B9FBC0;          /* Mint */
--urgent: #FFDAC1;           /* Peach */
```

### Colores por tipo (redesign-ui)

| Tipo | Clase | Hex |
|------|-------|-----|
| Nota | `bg-note` | `#f0a5ff` |
| Tarea | `bg-tarea` | `#64748B` |
| Proyecto | `bg-proyecto` | `#37d9e0` |
| Enlace | `bg-link` | `#f0a5ff` |
| Logro | `bg-logro` | — |

## Tipografía

`Poppins` en todos los pesos (300-700). Sin fuentes secundarias.

- xs: 12px · sm: 14px · base: 16px · lg: 18px · xl: 20px · 2xl: 24px · 3xl: 30px
- Body: line-height 1.5-1.6 · Headings: 1.2-1.3 · Max line length: 75ch

## Componentes clave

| Componente | Estilo |
|-----------|--------|
| Cards Bento | bg-white, shadow-sticker, rounded-[2rem], pinned: border-l-4 brand |
| Botón primary | bg-brand, text-white, rounded-blob, shadow-sticker |
| Botón secondary | bg-white, border-2 border-brand |
| Inputs | bg-input-bg, focus: border-brand + ring-2 |
| Checkbox | 24x24px, border 2px, border-radius 8px, success bg cuando checked |
| Tags | brand/10 bg, border-brand/20, rounded-full, text-xs |
| Modales | bg-white, rounded-blob, overlay ink/20 + backdrop-blur-sm |

## Iconos

- **Marca**: Ilustraciones custom SVG (headers, empty states, logros, onboarding)
- **Funcionales**: Font Awesome 6 line style (filtros, navegación, acciones)
- **Transición**: Fase 1 emojis → Fase 2 iconos custom → Fase 3 sistema propio

## Motion

Animaciones con propósito: confirmar acción, guiar atención, add delight.

- Hover: scale-[1.02] · Active: scale-[0.98]
- Card expand: 300ms ease-out
- Checkbox: scale bounce 0.95→1.05→1
- Creación: fade-in + slide-up
- Respetar `prefers-reduced-motion`

## Espaciado

Base 4px. Mobile: px-3, gap-4. Desktop: px-8, gap-6/8. Max content: max-w-7xl. Touch targets mínimos 44x44px.

## Sombras

```css
--shadow-sticker: 0 6px 0px 0px rgba(0,0,0,0.08);
--shadow-sticker-hover: 0 8px 0px 0px rgba(0,0,0,0.08);
--shadow-pressed: inset 0 4px 6px rgba(0,0,0,0.1);
--shadow-float: 0 10px 25px -5px rgba(0,0,0,0.1);
```

## Breakpoints

Mobile first: sm:640 · md:768 · lg:1024 · xl:1280. Grid: 1 col mobile, 2 columnas tablet+.

---
Mayo 2026
