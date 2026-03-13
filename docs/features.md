# Catálogo Detallado de Funciones y Escenarios de Prueba - Panel-Maria (KAI) 🛠️

Este documento define las funcionalidades exactas de la aplicación y sirve como especificación para las pruebas automatizadas de regresión.

## 1. Captura Instantánea (Omni-Input)
La barra de entrada en el footer es el corazón de la app.

- **F01: Creación de Nota Rápida**
  - *Descripción*: Escribir texto y pulsar "Enter" o "+" crea una nota.
  - *Prueba*: Ingresar "Comprar leche", verificar creación de card con tipo "nota".
- **F02: Detección Automática de Tareas**
  - *Descripción*: El sistema identifica si el input debe ser una tarea (por keywords como "hacer", "pasos", o "?" o el selector de tipo).
  - *Prueba*: Ingresar "Hacer la maleta", verificar creación de card con checklist.
- **F03: Detección de Enlaces (URLs)**
  - *Descripción*: URLs pegadas en el input se marcan como tipo "directorio".
  - *Prueba*: Ingresar "https://google.com", verificar tipo enlace.
- **F04: Captura por Voz**
  - *Descripción*: El botón de micrófono activa el dictado y procesa mediante IA para clasificar.
  - *Prueba*: Simular evento de voz (si es posible) o verificar apertura de overlay de escucha.

## 2. Organización Bento (Feed & Cards)
Visualización agrupada y modular.

- **F05: Renderizado de Cards Bento**
  - *Descripción*: Cada ítem se muestra en una tarjeta con color e icono según su tipo.
  - *Prueba*: Verificar colores: Amarillo (Nota), Azul (Tarea), Rosa (Proyecto), Morado (Directorio).
- **F06: Edición Inline (Expand/Collapse)**
  - *Descripción*: Pulsar una card la expande para mostrar descripción, tareas y enlaces.
  - *Prueba*: Click en card -> Verificar visibilidad de `#inline-description`. Edit -> Guardar.
- **F07: Gestión de Checklists**
  - *Descripción*: Añadir, borrar y marcar tareas dentro de una card de tipo "tarea".
  - *Prueba*: Marcar checkbox -> Verificar estado de persistencia.
- **F08: Anclado de Elementos (Pinned)**
  - *Descripción*: El botón de pin mantiene el ítem arriba.
  - *Prueba*: Click pin -> Verificar que el ítem se mueva a la sección "Anclados".

## 3. Inteligencia Artificial (Kai)
Funciones impulsadas por LLM (Cerebras).

- **F09: Chat Contextual**
  - *Descripción*: Chat con Kai sobre los datos existentes.
  - *Prueba*: Enviar mensaje -> Recibir respuesta con clase `.kai-message-bubble`.
- **F10: Ejecución de Acciones por IA**
  - *Descripción*: Kai puede interpretar "Crea una tarea para mañana" y ejecutar el comando.
  - *Prueba*: Enviar comando a Kai -> Verificar creación automática del ítem.

## 4. Gestión Pro y Datos
Funciones avanzadas de sistema.

- **F11: Alarmas y Recordatorios**
  - *Descripción*: Programar fecha/hora y recibir notificación (Push o Local).
  - *Prueba*: Programar deadline -> Verificar visualización del badge de tiempo.
- **F12: Importación/Exportación JSON**
  - *Descripción*: Copia de seguridad completa de los datos.
  - *Prueba*: Exportar -> Verificar descarga de archivo `.json`. Importar -> Verificar recarga de items.
- **F13: Filtro por Categorías y Tags**
  - *Descripción*: Filtrar el feed principal mediante iconos superiores o tags de colores.
  - *Prueba*: Click en "Proyecto" -> Verificar que solo se vean proyectos.

## 5. PWA & Conectividad
Instalación y compartición.

- **F14: Share Target (Recepción)**
  - *Descripción*: Recibir enlaces/texto desde otras apps del sistema.
  - *Prueba*: Verificar procesamiento de parámetros `URLSearchParams` en el inicio.
- **F15: Realtime Sync**
  - *Descripción*: Sincronización automática vía Supabase.

---
*Cualquier fallo en estas 15 funciones críticas detendrá el despliegue.*
