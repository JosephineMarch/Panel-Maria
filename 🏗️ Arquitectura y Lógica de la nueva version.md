🏗️ Arquitectura y Lógica del Sistema
1. El Concepto: "El Registro Único"
A diferencia de otras apps que tienen tablas separadas, el Panel-María funciona bajo una Arquitectura de Entrada Universal.

Base de Datos (Supabase): Una sola tabla llamada registros.

Propiedades de cada registro:

id: Único.

tipo: (tarea, nota, enlace, salud, pomodoro).

contenido: Texto principal.

metadata: Objeto JSON (aquí se guardan los puntos de la tarea, la URL del enlace, o los datos de salud como "ánimo" o "horas de sueño").

tags: Array de etiquetas.

estado: (pendiente, logrado).

created_at: Fecha y hora exacta.

2. Lógica de Navegación (Filtros Dinámicos)
La app no tiene "carpetas", tiene vistas.

Si entras a "Notas", la app simplemente hace una consulta: SELECT * FROM registros WHERE tipo = 'nota'.

Esto permite que el Historial sea el lugar donde todo converge cronológicamente, mientras que las otras pantallas son "ventanas" que solo muestran un tipo de dato.

3. El Motor de Gamificación
Acumulador: Una función escucha cada vez que un registro de tipo tarea cambia su estado a logrado.

Cálculo: Suma el valor de metadata.puntos al contador semanal del usuario.

Trigger de Premio: Si puntos_semanales >= meta, se activa el estado reward_available en el perfil del usuario, desbloqueando la animación del regalo en la interfaz.

🔄 Flujo de Usuario (User Journey)
Entrada: El usuario abre la app en Inicio. Ve sus tareas pendientes (scroll infinito) y su progreso de puntos.

Acción: * Marca una tarea -> Los puntos suben en tiempo real.

Crea algo -> Usa el botón Omni-Crear (Plus). El sistema detecta si es tarea o nota y lo manda a la base de datos.

Consulta: El usuario quiere ver un enlace guardado hace una semana. Va a Historial, pulsa el filtro "Enlaces" y navega por el tiempo.

Bienestar: Una vez al día (o cuando quiera), entra a Salud y llena sus métricas. Esto genera un registro tipo salud que alimenta las estadísticas futuras.

📱 Lista de Pantallas Necesarias (MVP)
Para que el Panel-María sea funcional al 100%, necesitas diseñar e iterar sobre estas 5 pantallas clave:

1. Pantalla de Inicio (Dashboard & Focus)
Función: Gestión de tareas pendientes, visualización de puntos semanales y acceso al Pomodoro.

Elemento Clave: Scroll infinito de tareas "estilo banco" con filtros rápidos por Tags.

2. Pantalla de Salud (Bitácora de Bienestar)
Función: Registro de métricas diarias (ánimo, energía, sueño, ciclo).

Elemento Clave: Interfaz de botones grandes (Radio buttons) para registrar datos sin escribir.

3. Pantalla de Historial (La Memoria)
Función: Ver el paso del tiempo. Todo lo que hiciste (tareas logradas, notas, salud) en orden cronológico.

Elemento Clave: Selector de fecha (Calendario) y filtros por tipo de contenido.

4. Pantalla de "El Baúl" (Configuración y Recursos)
Función: Gestionar los premios de la gamificación, ver la biblioteca de enlaces y configurar la app.

Elemento Clave: Gestión de la "Lista de Deseos" (Premios que quieres canjear con tus puntos).

5. Modal de Creación Universal (Omni-Editor)
Función: La ventana que aparece al darle al botón "+".

Elemento Clave: Switch rápido para cambiar entre "Nueva Tarea", "Nueva Nota" o "Nuevo Enlace".