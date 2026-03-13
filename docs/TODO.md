# TODO: Mejoras y Correcciones Panel-Maria

Este documento contiene la lista maestra de cosas por corregir e implementar, según lo solicitado. Me servirá de guía para que Kai (y yo) no olvidemos nada.

## 🟢 Prioridad Alta (Funcionalidad Crítica)
- [x] **Share Target (Recibir contenido)**: Al recibir contenido de otras apps, detecto URLs en el texto o título y lo guardo como enlace.
- [x] **Selector de Destino**: Al compartir desde fuera, permitir elegir en qué proyecto o categoría guardar la info.
- [x] **Detección Automática**: Kai ya identifica enlaces y tareas por contexto sin instrucción explícita.

## 🟡 Prioridad Media (UX y UI)
- [x] **Comportamiento Dinámico**: Al cambiar el tipo de bloque, la interfaz debe actualizarse sola, pero sin eliminar el contenido actual, es decir, si cambio de enlace a tarea, el enlace debe permanecer en la descripción. Y lo mismo con otros tipos. También debe mejorarse la lógica de la barra para ingresar información, debería ser lo bastante inteligente como para detectar si el usuario está escribiendo un enlace, una tarea o una nota o proyecto y guardarlo en su tipo correspondiente. Por ejemplo, si ingreso algo que parece una nota, el texto debe estar en la descripción y Kai debe inventar un título creativo. Si ingreso algo que parece un enlace, el enlace debe estar en el campo de enlace y si no especifico un titulo que no lo ponga, que deje el espacio vacio. Si ingreso algo que parece una tarea, debe ser capaz de inferir cuales son las checklist de la tarea, si es que hay o no una descripció y/o título o si a partir de la información ingresada kai puede crear un título adecuado. Si ingreso algo que parece un proyecto, el texto debe estar en la descripción y Kai debe inventar un título creativo.  
- [x] **Entrada de Texto Inteligente**: El texto largo va a la descripción y Kai inventa un título creativo.
- [ ] **Estilo Google Keep**: Múltiples enlaces, descripciones y tareas reordenables.
- [x] **Dashboard de Logros**: Panel gráfico y visualmente agradable para fomentar la motivación. Debe tener separados los dashboard de salud/emociones, lo que sea productividad/logros,cosas que hice. Es decir, un agrupamiento inteligente de temáticas afines. No importa si tengo que hacer mucho scroll para ver todo, lo importante es que sea visualmente agradable y que fomente la motivación. Además considera que en el futuro añadiré mis ilustraciones para que pueda usarlas como stickers, o como elementos decorativos en los distintos bloques. También este dashboard debe abrirse desde el sidebar en una sección propia. Por ahora dejar el tag logros, pero considerar que en adeltante es posible que se quite.
- [ ] **Una función que me pregunta 3 veces al día cómo me siento**: Es genial para llevar el recuento de energía y salud. También quiero que tenga una opción para marcar cuando despierte y cuando me acueste para dormir, esto para ver mis rutinas de sueño. Más adelante tal vez puede poner algo para marcar si me levanto de noche, cuando me levanto, cuando me vuelvo a acostar, etc. Para que pueda ver mis patrones de sueño.
- [x] **Botón "Añadir Tarea"**: Movido debajo de las checklist para evitar el scroll innecesario.
- [x] **Campo para ingresar información**: Ajustado maquetado para que sea Mobile First.
- [x] **El botón del chat de kai**: Ajustada posición en móvil para evitar solapamiento con la barra de entrada.

## 🔵 Prioridad Baja (Ajustes Visuales)
- [x] **Tamaño de Letra**: Uniformizado todo el texto base a 16px.
- [x] **Consistencia Visual**: Unificar estilos de elementos abiertos/cerrados (bold solo en títulos).
- [ ] **Pantalla de Login**: Crear pantalla provisional.
- [ ] **Alarmas y Notificaciones**: Dejado para el final. No suenan actualmente.

## 🛠️ Errores Técnicos Detectados
- [ ] Error al guardar enlaces desde el campo inferior.
- [x] **Evitar refrescos automáticos**: Investigando por qué la página se refresca sola.
- [x] **Error JSON parsing**: Corregido el parseo de acciones de IA que fallaba cuando faltaban llaves de cierre.
- [x] **Error gráfico de energía**: Corregido para validar que el valor de energía sea un número válido (0-10) antes de graficar.

---
*Este documento se irá actualizando conforme confirmes que las tareas se han realizado satisfactoriamente.*
