# Panel María - Organizador Personal

Una aplicación web completa para organizar recursos, ideas, proyectos y logros de forma visual y eficiente. Diseñada para personas con TDAH o tendencia a la dispersión, priorizando la accesibilidad y facilidad de uso.

## 🚀 Características Principales

### 4 Módulos Integrados
- **Directorio**: Organiza URLs y recursos importantes
- **Ideas**: Captura y gestiona ideas creativas
- **Proyectos**: Planifica con tareas y seguimiento de progreso
- **Logros**: Celebra y documenta completaciones

### Funcionalidades Avanzadas
- ✅ **Entrada por voz** con interpretación IA automática
- ✅ **Conversiones automáticas** entre módulos
- ✅ **Selección múltiple** y acciones en lote
- ✅ **Sistema de theming** con 3 paletas predefinidas
- ✅ **Almacenamiento local** con preparación para Firebase
- ✅ **Búsqueda y filtros** avanzados
- ✅ **Anclado de elementos** importantes
- ✅ **Exportación/importación** de datos

## 📁 Estructura del Proyecto

```
Panel Maria/
├── index.html              # Página principal
├── style.css               # Estilos y sistema de theming
├── app.js                  # Lógica principal de la aplicación
├── storage.js              # Sistema de almacenamiento (LocalStorage + Firebase)
├── voice.js                # Entrada por voz e interpretación IA
├── firebase-config.js      # Configuración de Firebase (placeholder)
├── paletas.json           # Paletas de colores predefinidas
└── README.md              # Este archivo
```

## 🛠️ Instalación y Uso

### Requisitos
- Navegador web moderno con soporte para:
  - Web Speech API (para entrada por voz)
  - LocalStorage
  - ES6+ JavaScript

### Instalación Local
1. Descarga todos los archivos en una carpeta
2. Abre `index.html` en tu navegador
3. ¡Listo! La aplicación funciona completamente offline

### Despliegue Web
1. Sube todos los archivos a tu servidor web
2. Asegúrate de que el servidor sirva archivos estáticos
3. Accede a través de HTTPS para funcionalidad de voz completa

## 🎨 Sistema de Temas

La aplicación incluye 3 temas predefinidos:

### Tema por Defecto
- Paleta suave y profesional
- Colores neutros y accesibles

### Tema Oscuro
- Modo oscuro para uso nocturno
- Reduce la fatiga visual

### Tema Colorido
- Paleta vibrante y energética
- Ideal para creatividad

**Cambiar tema**: Configuración → Selector de tema

## 🗄️ Almacenamiento

### LocalStorage (Actual)
- Datos guardados localmente en el navegador
- Funciona completamente offline
- Límite de ~5-10MB por dominio

### Firebase (Futuro)
Para activar Firebase:

1. **Configurar proyecto Firebase**:
   ```javascript
   // En firebase-config.js
   const firebaseConfig = {
       apiKey: "tu-api-key",
       authDomain: "tu-proyecto.firebaseapp.com",
       projectId: "tu-proyecto",
       // ... resto de configuración
   };
   ```

2. **Instalar dependencias**:
   ```bash
   npm install firebase
   ```

3. **Activar en la aplicación**:
   ```javascript
   // En app.js
   storage.setMode('firebase', firebaseConfig);
   ```

## 🎤 Entrada por Voz

### Funcionalidades
- **Reconocimiento de voz** en tiempo real
- **Interpretación IA** automática del contenido
- **Detección de módulo** según palabras clave
- **Extracción automática** de URLs y tareas
- **Guardado automático** opcional

### Palabras Clave para Módulos
- **Directorio**: "recurso", "link", "enlace"
- **Ideas**: "idea", "pensé", "se me ocurrió"
- **Proyectos**: "voy a hacer", "hacer esto", "pasos", "paso 1"
- **Logros**: "ya lo hice", "terminado", "finalizado"

### Configuración
- **Guardado automático**: ON/OFF en configuración
- **Idioma**: Español (configurable en voice.js)
- **Confianza**: Indicador de precisión de interpretación

## 🔄 Conversiones Automáticas

### Flujos Soportados
1. **Idea → Proyecto**: Convierte idea en proyecto con tareas
2. **Idea → Logro**: Convierte idea directamente en logro
3. **Proyecto → Logro**: Automático cuando todas las tareas están completadas

### Reglas de Fechas
- **fecha_creacion**: Se asigna al crear cualquier elemento
- **fecha_finalizacion**: Solo se asigna al convertir en logro
- **Conservación**: Las fechas se mantienen durante conversiones

## 📊 Esquema de Datos

```json
{
  "id": "string",                // UID interno único
  "modulo": "string",            // "directorio" | "idea" | "proyecto" | "logro"
  "titulo": "string",            // Título del elemento
  "descripcion": "string",       // Descripción opcional
  "categorias": ["string"],      // Array de categorías
  "anclado": true | false,       // Elemento anclado
  "fecha_creacion": "ISO8601",   // Fecha de creación
  "fecha_finalizacion": "ISO8601|null", // Fecha de finalización (solo logros)
  "estado_historial": [          // Historial de estados (proyectos)
    { "estado":"pendiente|en_proceso|completado", "fecha":"ISO8601" }
  ],
  "tareas": [                    // Lista de tareas (proyectos)
    { "id":"string", "titulo":"string", "completado": true|false }
  ],
  "urls": ["string"],            // URLs (directorio)
  "archivos_adjuntos": [         // Archivos adjuntos (futuro)
    { "nombre":"string", "url":"string", "tipo":"string" }
  ],
  "tema_modulo": "string",       // Tema específico del módulo
  "meta": { }                    // Metadatos extensibles
}
```

## ⌨️ Atajos de Teclado

- **Ctrl/Cmd + N**: Nuevo elemento
- **Ctrl/Cmd + M**: Activar micrófono
- **Escape**: Cerrar modales
- **Enter**: Guardar formularios

## 🔧 Configuración Avanzada

### Variables CSS Personalizables
```css
:root {
  --bg-main: #FDFCF7;           /* Fondo principal */
  --bg-card: #FFFFFF;           /* Fondo de tarjetas */
  --text-main: #2C2C2C;         /* Texto principal */
  --accent-orange-cta: #F5C56F; /* Color de acción */
  /* ... más variables */
}
```

### Configuración de Voz
```javascript
// En voice.js
this.recognition.lang = 'es-ES';        // Idioma
this.recognition.continuous = false;     // Reconocimiento continuo
this.recognition.interimResults = true;  // Resultados intermedios
```

## 📱 Responsive Design

La aplicación es completamente responsive y funciona en:
- 📱 Móviles (320px+)
- 📱 Tablets (768px+)
- 💻 Desktop (1024px+)

## 🧪 Pruebas

### Funcionalidades a Probar
1. **Creación de elementos** en cada módulo
2. **Conversiones** entre módulos
3. **Entrada por voz** con diferentes frases
4. **Selección múltiple** y acciones en lote
5. **Cambio de temas**
6. **Exportación/importación** de datos

### Casos de Borde
- Elementos sin título
- URLs inválidas
- Tareas vacías
- Categorías duplicadas
- Conversiones con datos incompletos

## 🚨 Solución de Problemas

### Entrada por Voz No Funciona
1. Verificar permisos de micrófono
2. Usar HTTPS (requerido para Web Speech API)
3. Verificar compatibilidad del navegador

### Datos No Se Guardan
1. Verificar espacio disponible en LocalStorage
2. Revisar consola del navegador para errores
3. Verificar permisos de escritura

### Rendimiento Lento
1. Limpiar datos antiguos
2. Reducir número de elementos
3. Usar filtros para mostrar menos elementos

## 🔮 Roadmap

### Próximas Funcionalidades
- [ ] **Sincronización en la nube** (Firebase)
- [ ] **Autenticación de usuarios**
- [ ] **Compartir elementos** entre usuarios
- [ ] **Notificaciones push**
- [ ] **Dashboard con estadísticas**
- [ ] **Integración con calendarios**
- [ ] **API REST** para integraciones externas

### Mejoras Técnicas
- [ ] **PWA** (Progressive Web App)
- [ ] **Service Workers** para offline
- [ ] **IndexedDB** para mayor capacidad
- [ ] **WebAssembly** para procesamiento IA
- [ ] **WebRTC** para colaboración en tiempo real

## 📄 Licencia

Este proyecto está bajo licencia MIT. Puedes usarlo libremente para proyectos personales y comerciales.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📞 Soporte

Para soporte técnico o preguntas:
- 📧 Email: [tu-email@ejemplo.com]
- 🐛 Issues: [URL del repositorio]
- 📖 Documentación: [URL de la documentación]

---

**Panel María** - Organiza tu vida digital de forma inteligente y eficiente.
