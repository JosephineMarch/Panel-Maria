# KAI - Tu Segundo Cerebro

Una PWA (Aplicación Web Progresiva) de gestión personal diseñada para personas con TDAH.

## Características

- **Captura rápida**: Escribe o usa voz en segundos
- **Diseño ADHD-Friendly**: Estímulos visuales positivos, colores pasteles, interfaz minimalista
- **Alarmas inteligentes**: "Avisame en 5 minutos" - funciona con tu zona horaria
- **Etiquetas automáticas**: Detecta salud y emociones en el texto
- **Modo demo**: Prueba sin iniciar sesión
- **Sincronización en la nube**: Tus datos seguros en Supabase

## Tipos de Items

| Tipo | Descripción |
|------|-------------|
| 📝 Nota | Idea o pensamiento rápido |
| ✅ Tarea | Checklist con tareas |
| 📁 Proyecto | Carpeta organizativa |
| 🔗 Enlace | Marcador de URL |

## Etiquetas (Tags)

- `alarma` - Items con recordatorio
- `logro` - Metas completadas
- `salud` - Salud física (detectado automáticamente)
- `emocion` - Estado emocional (detectado automáticamente)

## Comandos de Alarma

```
"avisame en 5 minutos alarma"
"dentro de 1 hora recordatorio"
"despiertame en 30 minutos"
"alarma para mañana a las 8am"
```

## Configuración

### Variables de Entorno

El proyecto usa:
- Supabase URL: `https://jiufptuxadjavjfbfwka.supabase.co`
- Supabase Anon Key (configurado en `src/js/supabase.js`)

### Estructura del Proyecto

```
/src
  /js
    ai.js         - Detección de alarmas, tags, intenciones
    auth.js       - Autenticación Google
    cerebras.js   - Integración con IA
    data.js       - CRUD con Supabase
    demo-data.js  - Datos de ejemplo
    logic.js      - Controlador principal
    supabase.js   - Configuración de conexión
    ui.js         - Interfaz de usuario
    utils.js      - Funciones helper
```

## Desarrollo Local

1. Clona el repositorio
2. Abre `index.html` en un servidor local (ej: Live Server)
3. O usa: `npx serve .`

## Despliegue

Desplegado en GitHub Pages: https://josephinemarch.github.io/Panel-Maria/

## Base de Datos

Tabla `items` con columnas:
- `id`, `user_id`, `content`, `type`
- `parent_id`, `status`, `tags` (array)
- `deadline`, `anclado`, `descripcion`, `url`, `tareas`
- `created_at`, `updated_at`, `meta`

## Tech Stack

- Frontend: Vanilla JS, Tailwind CSS (CDN)
- Backend: Supabase
- Auth: Google OAuth
- AI: Cerebras (GPT-4o-mini)
