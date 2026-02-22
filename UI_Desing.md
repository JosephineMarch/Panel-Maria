🎨 Documentación Maestra: Sistema de Diseño y Arquitectura UI (Vista)
1. Filosofía de Diseño: "Kawaii Productivo"
El objetivo es reducir la ansiedad visual del usuario (TDAH) mediante un entorno amigable, gamificado y "tierno", pero altamente funcional.
Estética: Bloques sólidos, colores pastel saturados (no lavados), bordes muy redondeados (rounded-3xl), sombras duras (sin difuminar) para efecto "sticker".
Tipografía: Quicksand (Google Fonts) - Redondeada y legible.
Feedback: Todo debe reaccionar. Si tocas un botón, debe haber un efecto de "hundirse" o rebotar.
2. Configuración del Tema (Tailwind CSS)
Este es el archivo de configuración que define el "alma" visual. Si en el futuro quieres cambiar el diseño, solo modificas esto.
Archivo: tailwind.config.js
code
JavaScript
tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Quicksand', 'sans-serif'], // Tipografía principal
        hand: ['Patrick Hand', 'cursive'],  // Para notas manuscritas (opcional)
      },
      colors: {
        // Paleta "Kawaii Solid"
        'cream': '#FFFDF5',      // Fondo principal (papel)
        'ink': '#4A4A4A',        // Texto (nunca negro puro)
        
        // Colores Semánticos (Usados por lógica)
        'brand': '#FFB7C5',      // (Sugar Pink) - Principal / Kai
        'brand-dark': '#FF9EAA', // Hover principal
        
        'action': '#AEC6CF',     // (Soft Blue) - Enlaces / Botones secundarios
        'success': '#B9FBC0',    // (Mint) - Logros / Completado
        'warning': '#FDFD96',    // (Lemon) - Notas / Ideas
        'urgent': '#FFDAC1',     // (Peach) - Deadlines cercanos
        'accent': '#E6E6FA',     // (Lavender) - Elementos decorativos
        
        'card-bg': '#FFFFFF',    // Fondo de tarjetas
        'input-bg': '#F3F4F6',   // Fondo de inputs
      },
      borderRadius: {
        'blob': '2rem',          // Bordes extra redondos estilo burbuja
      },
      boxShadow: {
        // Sombra estilo Sticker (Sólida, sin blur)
        'sticker': '0 6px 0px 0px rgba(0,0,0,0.08)', 
        'sticker-hover': '0 8px 0px 0px rgba(0,0,0,0.08)',
        'pressed': 'inset 0 4px 6px rgba(0,0,0,0.1)', // Efecto botón presionado
        'float': '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      },
      animation: {
        'bounce-slow': 'bounce 3s infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        }
      }
    }
  }
}
3. Arquitectura del Archivo ui.js (La Vista)
Este archivo es el único autorizado para manipular el DOM (HTML). Funciona bajo el patrón de "Renderizado Puro": recibe datos (JSON) y devuelve HTML.
Reglas de Oro para ui.js:
No llama a la base de datos (eso es data.js).
No toma decisiones de negocio (eso es logic.js).
Solo sabe Pintar (mostrar datos) y Escuchar (clicks/inputs).
Estructura de Métodos en ui.js
El archivo debe exportar un objeto o clase UI con estos métodos públicos:
A. Inicialización y Layout
UI.init(): Configura los event listeners globales (botones del menú, scroll).
UI.toggleTheme(themeName): Permite cambiar clases del <body> si quieres cambiar de Kawaii a Dark Mode.
B. Renderizado de Elementos (Componentes)
UI.renderFeed(itemsList): Recibe un array de objetos (notas, tareas) y limpia/repinta el área principal.
UI.createCard(item): (Función Core) Recibe un solo objeto item y devuelve el string HTML de la tarjeta correspondiente según su item.type.
Si type == 'project': Renderiza tarjeta con barra de progreso.
Si type == 'voice': Renderiza tarjeta con ondas de audio.
Si type == 'task': Renderiza checkbox.
UI.updateMoodSelector(currentMood): Actualiza el icono del header.
C. Interacción (Inputs & Outputs)
UI.getInputValue(): Devuelve el texto escrito en la barra inferior.
UI.clearInput(): Limpia la barra.
UI.showKaiResponse(text, emotion): Muestra la burbuja flotante del asistente con la animación correspondiente (feliz, pensando, alerta).
UI.toggleRecordingState(isRecording): Cambia el botón del micrófono a rojo/animado cuando se está grabando.
4. Biblioteca de Componentes (Templates HTML)
Aquí definimos cómo se construyen visualmente los bloques. ui.js usará estas plantillas rellenándolas con los datos.
4.1 La Tarjeta Base (Container)
Todas las unidades de información viven dentro de este contenedor para mantener consistencia.
code
Html
<div class="bg-card-bg rounded-blob p-5 shadow-sticker mb-4 border-2 border-transparent hover:border-brand transition-all duration-300 group relative">
    <!-- Contenido inyectado aquí -->
    <!-- Botón de menú (3 puntos) siempre visible en hover -->
    <button class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-brand transition" onclick="Logic.handleEdit('${id}')">
        <i class="fa-solid fa-ellipsis"></i>
    </button>
</div>
4.2 Tarjeta: Proyecto (Project Card)
Diseño de "Carpeta".
Header: Color sólido (bg-brand o bg-action).
Body: Muestra barra de progreso y resumen.
code
Html
<div class="rounded-blob overflow-hidden bg-white shadow-sticker" onclick="Logic.openProject('${id}')">
    <div class="bg-${color} p-4 text-white flex justify-between">
        <h3 class="font-bold text-lg"><i class="${icon}"></i> ${title}</h3>
        <span class="text-xs bg-white/20 px-2 py-1 rounded-lg">${percent}%</span>
    </div>
    <div class="p-4">
        <div class="w-full bg-gray-100 rounded-full h-3">
             <div class="bg-${color} h-3 rounded-full" style="width: ${percent}%"></div>
        </div>
        <p class="text-xs text-gray-400 mt-2">${pending_tasks} tareas pendientes</p>
    </div>
</div>
4.3 Tarjeta: Tarea Simple (Task Item)
Debe sentirse satisfactorio al marcar.
code
Html
<label class="flex items-center gap-3 p-3 rounded-xl hover:bg-brand/10 transition cursor-pointer select-none">
    <!-- Checkbox Kawaii customizado en CSS -->
    <input type="checkbox" class="kawaii-checkbox" ${completed ? 'checked' : ''} onchange="Logic.toggleTask('${id}')">
    <span class="${completed ? 'line-through text-gray-300' : 'text-ink font-bold'} transition-colors duration-300">
        ${content}
    </span>
</label>
4.4 El Asistente Kai (Floating Widget)
Debe flotar sobre todo lo demás (z-50).
code
Html
<div id="kai-widget" class="fixed bottom-24 right-5 z-50 transition-transform duration-300 transform hover:scale-105">
    <!-- Burbuja de texto (Oculta por defecto) -->
    <div id="kai-message" class="hidden bg-white border-2 border-brand p-3 rounded-2xl rounded-tr-none shadow-lg mb-2 animate-float">
        <p class="text-xs font-bold text-gray-600" id="kai-text"></p>
    </div>
    <!-- Avatar (Ilustración) -->
    <div class="w-16 h-16 bg-white rounded-full border-4 border-brand shadow-xl flex items-center justify-center cursor-pointer">
        <img src="assets/kai-avatar-happy.svg" class="w-12 h-12">
    </div>
</div>
5. Flujo de Comunicación (Ejemplo Práctico)
Para que entiendas cómo se unen las 3 partes sin mezclarse.
Escenario: El usuario agrega una nueva tarea "Comprar leche".
UI (ui.js): Detecta Enter en el input.
Acción: Llama a Logic.handleNewInput("Comprar leche").
Visual: Limpia el input (UI.clearInput()) y pone un spinner de carga pequeño.
Logic (logic.js): Recibe el texto.
Proceso: Analiza texto. Decide que es una "Tarea". Llama a Data.saveItem({ type: 'task', content: 'Comprar leche' }).
Respuesta: Cuando Data confirma el guardado, la Logic llama a UI.prependCard(newItem).
Data (data.js):
Acción: Guarda en IndexedDB y Supabase. Devuelve el objeto creado con su ID real.
UI (ui.js):
Acción Final: Recibe el objeto newItem. Usa la plantilla createCard y la inyecta al principio del feed HTML.
6. Iconografía e Ilustraciones
Para mantener la escalabilidad:
Iconos de UI: Usar FontAwesome (clases fa-solid) para controles (cerrar, menú, borrar).
Iconos de Categoría (Stickers): Usar imágenes <img> o SVG en línea dentro de contenedores definidos.
Clase CSS recomendada: .sticker-icon { width: 48px; height: 48px; filter: drop-shadow(0 2px 0 rgba(0,0,0,0.1)); }
Esto te permite dibujar tus propios iconos luego, guardarlos en /assets/icons/ y solo cambiar la ruta en el código.