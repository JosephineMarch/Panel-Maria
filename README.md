📘 DOCUMENTACIÓN MAESTRA: PROYECTO KAI
1. Visión y Filosofía (Diseño ADHD-Friendly)
Una PWA (Aplicación Web Progresiva) que funciona como un "segundo cerebro" externo.
Cero Fricción: Captura en < 3 segundos (Voz/Texto/Compartir).
Diseño Atómico: Todo es un bloque de información. Un proyecto es un bloque que contiene otros bloques.
Estímulo Visual (Kawaii): Interfaz amigable, colores pasteles sólidos, bordes redondeados y gamificación (logros) para generar dopamina.
Asistencia Proactiva: La IA (Kai) no solo guarda, sino que organiza, recuerda con voz humana y anima emocionalmente.
2. Stack Tecnológico
Frontend: HTML5, Vanilla JavaScript (ES6 Modules), Tailwind CSS (vía CDN para prototipado rápido o Build process).
Backend & Base de Datos: Supabase.
Base de datos: PostgreSQL.
Vectores: pgvector (para la memoria de la IA).
Almacenamiento: Supabase Storage (para audios e imágenes).
Autenticación: Supabase Auth (Google/Email).
Inteligencia Artificial: OpenAI API (GPT-4o-mini o Whisper) gestionada a través de Supabase Edge Functions (para proteger tu API Key).
3. Diseño de la Base de Datos (Modelo Atómico)
En lugar de tener 20 tablas, usaremos una Tabla Maestra flexible. Esto permite que una "nota" se convierta en "proyecto" solo cambiando su tipo.
Tabla Principal: items
Esta es la tabla donde vivirá el 90% de tu app.
Columna	Tipo	Descripción
id	UUID	Identificador único.
user_id	UUID	Vincula el dato al usuario (Seguridad RLS).
content	TEXT	El texto principal (la nota, el título del proyecto, etc).
type	TEXT	note, task, project, reminder, link, mood, voice.
parent_id	UUID	La clave de todo. Si esto tiene un ID, significa que este item pertenece a otro (ej: una tarea dentro de un proyecto).
status	TEXT	inbox, active, completed, archived.
tags	TEXT[]	Array de etiquetas (ej: ['trabajo', 'urgente']).
deadline	TIMESTAMPTZ	Fecha y hora límite (opcional).
meta	JSONB	Datos extra flexibles (ej: URL del audio, URL de la imagen, json del checklist, sentimiento del mood).
embedding	VECTOR(1536)	La representación matemática para que la IA busque por contexto.
created_at	TIMESTAMPTZ	Fecha de creación.
### 4. Arquitectura de Carpetas (MVC)
Para una mantenibilidad total y separación de responsabilidades:

- **src/js/data.js (El Modelo - Los Datos)**: Comunicación exclusiva con Supabase e IndexedDB. Guarda, edita y borra. No conoce el HTML.
- **src/js/logic.js (El Controlador - El Cerebro)**: Lógica de negocio, integración con IA (Kai) y procesamiento de datos. Decide qué hacer.
- **src/js/ui.js (La Vista - El HTML/Tailwind)**: Único archivo autorizado para tocar el DOM (`getElementById`, `innerHTML`, etc.).
> [!IMPORTANT]  
> Esta separación permite cambiar todo el diseño visual en `ui.js` sin romper la lógica del "cerebro" en `logic.js` ni la base de datos en `data.js`.

/proyecto-kai
│
├── index.html        # La estructura base (lo que ya tienes)
├── /src
│   ├── /css
│   │   └── style.css # Estilos extra (animaciones custom)
│   │
│   ├── /js
│   │   ├── app.js       # Punto de entrada principal
│   │   ├── supabase.js  # Configuración y conexión a Supabase
│   │   ├── auth.js      # Manejo de inicio de sesión/usuario
│   │   ├── data.js      # CRUD (Crear, Leer, Actualizar, Borrar)
│   │   ├── ui.js        # Manipulación del DOM (Renderizar tarjetas, cambiar colores)
│   │   ├── ai.js        # Lógica de voz y conexión con Edge Functions
│   │   └── utils.js     # Funciones de ayuda (formatear fechas, etc)
│   │
│   └── /assets          # Tus ilustraciones e iconos
│
├── manifest.json     # Configuración para instalar como App (PWA)
└── sw.js             # Service Worker (Para que funcione Offline)




5. Plan de Acción: Paso a Paso
Aquí es donde empezamos a trabajar. No mires todo el plan, solo el Paso 1.
🟢 FASE 1: Cimientos y Conexión (Día 1-2)
El objetivo: Que tu HTML "muerto" se conecte a una base de datos real.
Configurar Supabase:
Crear cuenta en Supabase.
Crear nuevo proyecto "Kai Brain".
Ejecutar el script SQL (te lo daré cuando empecemos esta fase) para crear la tabla items.
Estructura Local:
Crear la carpeta del proyecto en tu computadora.
Separar el HTML gigante que te di en los archivos .js correspondientes.
Conexión:
Instalar la librería de Supabase en el HTML (<script>).
Hacer que al escribir en el "input" y dar Enter, se guarde en la nube y aparezca en la lista.
🟡 FASE 2: La Lógica Atómica (Día 3-4)
El objetivo: Que puedas crear proyectos y tareas dentro de ellos.
Renderizado Inteligente: Programar ui.js para que sepa pintar diferente si el item es una note (amarillo) o un project (carpeta).
Jerarquía: Crear la lógica para que al hacer clic en un Proyecto, la app filtre y muestre solo los items que tengan ese parent_id.
Edición Manual: Hacer que los botones de "Editar" y "Borrar" funcionen realmente.
🟠 FASE 3: El Cerebro IA (Día 5-7)
El objetivo: Que Kai entienda lo que escribes/hablas.
Edge Function: Crear una función en Supabase que reciba texto.
Prompt Engineering: Enseñarle a la IA: "Eres Kai, si el usuario dice X, crea un JSON con formato Y".
Conexión de Voz: Usar la Web Speech API del navegador (gratis) para convertir tu voz a texto y mandársela a Kai.
🔴 FASE 4: PWA y Pulido Visual (Día 8+)
El objetivo: Que se sienta como una app nativa.
Manifest & Service Worker: Configurar el archivo para que sea instalable en iOS/Android.
Share Target: Configurar para recibir cosas desde "Compartir" de otras apps.
Ilustraciones: Reemplazar los emojis por tus propios dibujos.