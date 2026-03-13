# KAI - Tu Segundo Cerebro (Panel-Maria) 🧠✨

**KAI** es una aplicación PWA (Progressive Web App) diseñada específicamente para ser **ADHD-Friendly**, permitiendo capturar pensamientos, tareas, proyectos y enlaces de manera instantánea y organizada mediante inteligencia artificial.

## 🚀 Características Principales

- **Captura Omnipresente**: Barra de entrada rápida que detecta intenciones mediante Procesamiento de Lenguaje Natural (NLP).
- **Interfaz tipo Bento**: Visualización limpia y modular de tarjetas con estados expandibles para edición inline.
- **IA Integrada (Kai)**: Asistente personal basado en Cerebras que ayuda a clasificar, buscar y actuar sobre tu información.
- **Sistema de Alarmas Pro**: Notificaciones push sincronizadas entre dispositivos para asegurar que nunca olvides lo importante.
- **Enfoque Diario**: Widget "Mi enfoque para hoy" que prioriza lo que realmente importa.
- **Privacidad y Sincronización**: Respaldado por Supabase con cifrado y sincronización en tiempo real.

## 🛠️ Stack Tecnológico

- **Frontend**: HTML5, Vanilla JavaScript (ES6+), Tailwind CSS (CDN).
- **Backend / Persistence**: Supabase (PostgreSQL, Auth, Realtime).
- **Inteligencia Artificial**: Cerebras API (Kai AI).
- **PWA**: Service Workers para soporte offline e instalación en dispositivos móviles.
- **Notificaciones**: Firebase Cloud Messaging (FCM) integrado vía Supabase Edge Functions.

## 📁 Estructura del Proyecto

- `index.html`: Estructura principal y componentes UI.
- `app.js`: Punto de entrada, registro de Service Worker y orquestación.
- `src/js/`:
  - `logic.js`: Controlador central y lógica de negocio.
  - `ui.js`: Sistema de renderizado dinámico y componentes.
  - `data.js`: Abstracción de acceso a datos (Supabase/Demo).
  - `cerebras.js`: Integración directa con la IA Kai.
  - `auth.js`: Gestión de sesiones de usuario.
- `sw.js`: Lógica de caché y Service Worker.

## 📋 Requisitos de Instalación

1. Clonar el repositorio.
2. Configurar las variables de entorno de Supabase en `src/js/supabase.js`.
3. Abrir `index.html` en un servidor local (Ej: Live Server o `python -m http.server`).

---
Desarrollado con ❤️ para ayudar a mentes creativas a mantenerse enfocadas.
