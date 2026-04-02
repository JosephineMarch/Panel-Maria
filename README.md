# KAI - Tu Segundo Cerebro (Panel-Maria) 🧠✨

**KAI** es una aplicación PWA (Progressive Web App) diseñada específicamente para ser **ADHD-Friendly**, permitiendo capturar pensamientos, tareas, proyectos y enlaces de manera instantánea y organizada mediante inteligencia artificial.

## 🚀 Características Principales

- **Captura Omnipresente**: Barra de entrada rápida que detecta intenciones mediante Procesamiento de Lenguaje Natural (NLP).
- **Interfaz tipo Bento**: Visualización limpia y modular de tarjetas con estados expandibles para edición inline.
- **IA Integrada (Kai)**: Asistente personal basado en Cerebras que ayuda a clasificar, buscar y actuar sobre tu información.
- **Sistema de Alarmas Pro**: Notificaciones push sincronizadas entre dispositivos con snooze (5min, 10min, 30min) y alarmas repetitivas (diaria, semanal, mensual).
- **Sección "Hoy"**: Pestaña dedicada con rutinas diarias, tareas del día y check-ins de bienestar (mañana/tarde/noche).
- **Share Target**: Recibe contenido compartido desde otras apps y permite elegir si crear una nueva card o agregar a una existente.
- **Check-ins de Bienestar**: Sistema de seguimiento emocional y de energía con 3 momentos del día.
- **Privacidad y Sincronización**: Respaldado por Supabase con cifrado y sincronización en tiempo real.

## 🛠️ Stack Tecnológico

- **Frontend**: HTML5, Vanilla JavaScript (ES Modules), Tailwind CSS (CDN).
- **Backend / Persistence**: Supabase (PostgreSQL, Auth, Realtime, Edge Functions).
- **Inteligencia Artificial**: Cerebras API (modelo gpt-oss-120b).
- **PWA**: Service Worker con estrategias de caché avanzadas (cache-first, network-first, stale-while-revalidate).
- **Notificaciones Push**: Firebase Cloud Messaging (FCM V1 API) con JWT RS256 firmado vía Web Crypto.
- **Testing**: Playwright configurado para pruebas E2E.

## 📁 Estructura del Proyecto

```
Panel-Maria/
├── index.html              # Estructura principal y componentes UI
├── app.js                  # Punto de entrada, registro de SW y FCM
├── manifest.json           # Manifiesto PWA (Share Target, Shortcuts)
├── sw.js                   # Service Worker (kai-cache-v12)
├── package.json            # Dependencias de desarrollo (Playwright)
├── playwright.config.js    # Configuración de tests E2E
├── src/js/                 # 14 módulos ES
│   ├── ai.js               # Reconocimiento de voz (Web Speech API) y detección offline (alarmas, tags, bitácora)
│   ├── alarmas.js          # Gestión de alarmas con polling local (30s), snooze, repeticiones y notificaciones inline
│   ├── auth.js             # Autenticación Supabase (Google OAuth, Email/Password)
│   ├── cerebras.js         # Motor de IA con contexto RAG, memoria de conversación y acciones JSON
│   ├── checkins.js         # Sistema de check-ins emocionales y de energía (3 momentos/día)
│   ├── data.js             # Capa de datos con Supabase, búsqueda full-text (RPC) y sanitización
│   ├── firebase.js         # Cliente FCM: tokens, refresh automático, mensajes foreground
│   ├── hoy.js              # Sección "Hoy": rutinas, tareas diarias, check-ins diarios
│   ├── items.js            # CRUD de items: crear, leer, actualizar, eliminar, importar/exportar
│   ├── logic.js            # Controlador central (KaiController): orquestación, eventos, navegación, IA
│   ├── share.js            # Share Target: recibe contenido externo, modal de clasificación, agregar a card existente
│   ├── supabase.js         # Cliente Supabase y configuración de tipos (nota, tarea, proyecto, directorio)
│   ├── ui.js               # Renderizado de UI: cards Bento, chat Kai, edición inline, dashboard logros
│   └── utils.js            # Utilidades: sanitización, formateo de fechas, debounce, storage
├── tests/                  # Tests E2E con Playwright
├── supabase/               # Migraciones y Edge Functions
└── docs/                   # Documentación del proyecto
```

## 📋 Estado Actual

**Versión**: Beta funcional  
**Cache del SW**: `kai-cache-v12`  
**Modelo de IA**: gpt-oss-120b (Cerebras)  
**Módulos**: 14 módulos ES en `src/js/`  

### ✅ Implementado
- Captura de texto y voz con clasificación automática (offline + IA)
- Cards Bento expandibles con edición inline (descripción, tareas, múltiples URLs, alarmas)
- Chat con Kai (asistente IA con contexto de datos y acciones automáticas)
- Alarmas con snooze (5, 10, 30 min) y repeticiones (diaria, semanal, mensual)
- Push notifications multi-dispositivo vía FCM V1
- Share Target con modal de previsualización y selector de card existente
- Sección "Hoy" con rutinas, tareas diarias y check-ins
- Sistema de check-ins emocionales (energía + emoción, 3 momentos/día)
- Importación/exportación JSON
- Búsqueda full-text con RPC de Supabase
- Persistencia de estado (vista actual, card expandida)
- Tests E2E con Playwright

### 📋 Pendiente (ver ROADMAP)
- Múltiples enlaces por card (parcialmente implementado, falta UI completa tipo Google Keep)
- Pantalla de login dedicada
- Mejora del dashboard de logros
- Limpieza de archivos del proyecto

## 📋 Requisitos de Instalación

1. Clonar el repositorio.
2. Configurar las variables de entorno de Supabase en `src/js/supabase.js`.
3. Configurar la API key de Cerebras en `src/js/cerebras.js`.
4. Abrir `index.html` en un servidor local (Ej: Live Server o `python -m http.server`).

---
Desarrollado con ❤️ para ayudar a mentes creativas a mantenerse enfocadas.

Última actualización: Abril 2026
