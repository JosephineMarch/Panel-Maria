# Panel María - Organizador Personal (Versión Corregida)

Una aplicación web completa para organizar recursos, ideas, proyectos y logros de forma visual y eficiente. Funciona directamente desde el navegador, sin necesidad de instalación.

## 🚀 Características Principales

-   **4 Módulos Integrados**: Directorio, Ideas, Proyectos y Logros.
-   **Almacenamiento Dual**: Funciona offline con **LocalStorage** y se sincroniza en la nube con **Firebase** al iniciar sesión.
-   **Entrada por Voz**: Captura ideas rápidamente usando tu voz. La aplicación interpreta el contenido y lo clasifica automáticamente.
-   **Acciones en Lote**: Selecciona múltiples elementos para cambiar su categoría, etiquetas o eliminarlos de una sola vez.
-   **Búsqueda y Filtros**: Encuentra lo que necesitas con una búsqueda potente y filtros por etiquetas.
-   **Personalización**: Ancla elementos importantes y personaliza la apariencia con 3 temas (claro, oscuro, colorido).
-   **Portabilidad de Datos**: Exporta todos tus datos a un archivo JSON o importa un respaldo en cualquier momento.
-   **Bookmarklet**: Guarda cualquier página web directamente en tu Directorio desde la barra de marcadores de tu navegador.

## 🛠️ Cómo Usar

No se necesita instalación. ¡Funciona directamente!

1.  **Descarga los Archivos**: Descarga los archivos (`index.html`, `style.css`, `app.js`, etc.) y guárdalos todos en una misma carpeta.
2.  **Abre `index.html`**: Haz doble clic en el archivo `index.html` para abrirlo en tu navegador (Chrome o Firefox son recomendados).
3.  **¡Listo!** La aplicación comenzará a funcionar usando el almacenamiento local de tu navegador. Tus datos se guardarán en tu propio ordenador.

### (Opcional) Sincronización con Firebase

Para que tus datos se guarden en la nube y se sincronicen entre dispositivos, necesitas configurar tu propio proyecto de Firebase:

1.  **Crea un Proyecto en Firebase**: Ve a la [consola de Firebase](https://console.firebase.google.com/), crea un nuevo proyecto y añade una aplicación web.
2.  **Obtén tus Credenciales**: Firebase te dará un objeto de configuración (`firebaseConfig`) con tus claves.
3.  **Crea tu archivo de configuración**:
    *   En la carpeta del proyecto, busca el archivo `firebase-config.example.js`.
    *   Crea una **copia** de este archivo y renómbrala a `firebase-config.js`.
    *   Abre tu nuevo archivo `firebase-config.js` y pega tus propias credenciales de Firebase donde se indica.
4.  **Configura Reglas de Seguridad**:
    *   En tu proyecto de Firebase, ve a **Firestore Database**.
    *   Haz clic en la pestaña **"Reglas"**.
    *   Reemplaza el contenido con lo siguiente y publica los cambios:
        ```
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /users/{userId}/{document=**} {
              allow read, write: if request.auth != null && request.auth.uid == userId;
            }
          }
        }
        ```

**Importante**: El archivo `firebase-config.js` donde pones tus claves está ignorado por Git, por lo que no se subirá a ningún repositorio. Este es el método seguro para proteger tus credenciales.

Ahora, cuando abras la aplicación e inicies sesión con Google, tus datos se guardarán y leerán de forma segura desde tu cuenta de Firebase.

## 🎤 Entrada por Voz

-   **Activación**: Haz clic en el icono del micrófono.
-   **Clasificación Automática**: La aplicación detecta palabras clave para asignar una categoría:
    -   **Directorio**: "recurso", "link", "enlace".
    -   **Ideas**: "idea", "se me ocurrió".
    -   **Proyectos**: "voy a hacer", "proyecto", "pasos".
    -   **Logros**: "terminé", "finalizado", "ya lo hice".
-   **Revisión**: Por defecto, la aplicación te mostrará lo que entendió para que lo confirmes o edites antes de guardar. Puedes activar el "guardado automático" en la configuración.

## 🔮 Próximas Mejoras (Roadmap)

-   [ ] Conversión automática de Proyecto a Logro al completar todas las tareas.
-   [ ] Un panel de estadísticas para visualizar tu progreso.
-   [ ] Notificaciones y recordatorios.

---
**Panel María** - Organiza tu vida digital de forma inteligente y eficiente.