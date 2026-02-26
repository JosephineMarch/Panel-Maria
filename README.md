# KAI - Tu Segundo Cerebro

Una PWA (Aplicación Web Progresiva) de gestión personal diseñada para personas con TDAH.

## Características

- **Captura rápida**: Escribe o usa voz en segundos
- **Diseño ADHD-Friendly**: Estímulos visuales positivos, colores pasteles, interfaz minimalista
- **Alarmas inteligentes**: "Avisame en 5 minutos" - funciona con tu zona horaria
- **Etiquetas automáticas**: Detecta salud y emociones en el texto
- **Modo demo**: Prueba sin iniciar sesión
- **Sincronización en la nube**: Tus datos seguros

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

## Estructura del Proyecto

```
/src
  /js
    ai.js         - Detección de alarmas, tags, intenciones
    auth.js       - Autenticación (Google/Email)
    cerebras.js   - Integración con IA
    data.js       - CRUD con base de datos
    demo-data.js  - Datos de ejemplo
    logic.js      - Controlador principal
    supabase.js   - Configuración de conexión
    ui.js         - Interfaz de usuario
    utils.js      - Funciones helper
```

## Desarrollo Local

1. Clona el repositorio
2. Configura tu conexión a Supabase en `src/js/supabase.js`
3. Abre `index.html` en un servidor local (ej: Live Server)
4. O usa: `npx serve .`

## Tech Stack

- Frontend: Vanilla JS, Tailwind CSS (CDN)
- Backend: Supabase (PostgreSQL)
- Auth: Google OAuth
- AI: Cerebras (GPT-4o-mini)
