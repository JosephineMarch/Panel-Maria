# Catálogo Detallado de Funciones y Escenarios de Prueba - Panel-Maria (KAI) 🛠️

Este documento define las funcionalidades exactas de la aplicación y sirve como especificación para las pruebas automatizadas de regresión.

**Estado**: ✅ = Implementado y funcional | 🚧 = Parcialmente implementado | 📋 = Pendiente

## 1. Captura Instantánea (Omni-Input)

La barra de entrada en el footer es el corazón de la app.

- **F01: Creación de Nota Rápida** ✅
  - *Descripción*: Escribir texto y pulsar "Enter" o "+" crea una nota.
  - *Prueba*: Ingresar "Comprar leche", verificar creación de card con tipo "nota".

- **F02: Detección Automática de Tareas** ✅
  - *Descripción*: El sistema identifica si el input debe ser una tarea (por keywords, comas múltiples, o formato "tarea item1, item2").
  - *Prueba*: Ingresar "Hacer la maleta", verificar creación de card con checklist.

- **F03: Detección de Enlaces (URLs)** ✅
  - *Descripción*: URLs pegadas en el input se marcan como tipo "directorio".
  - *Prueba*: Ingresar "https://google.com", verificar tipo directorio.

- **F04: Captura por Voz** ✅
  - *Descripción*: El botón de micrófono activa Web Speech API y transcribe en tiempo real.
  - *Prueba*: Click en micrófono → verificar overlay de escucha → hablar → texto en input.

- **F05: Análisis con IA (Cerebras)** ✅
  - *Descripción*: Si hay API key, el input se envía a Cerebras para generar título, descripción y tags óptimos.
  - *Prueba*: Ingresar texto largo → verificar que IA genera título corto + descripción completa.

- **F06: Detección de Alarmas en Texto** ✅
  - *Descripción*: Palabras como "alarma", "recordatorio", "recuérdame" + fecha/hora crean alarmas automáticamente.
  - *Prueba*: "Recuérdame mañana a las 3pm" → verificar deadline configurado.

- **F07: Detección de Repeticiones** ✅
  - *Descripción*: "cada día", "semanal", "mensual" en el texto configuran alarmas repetitivas.
  - *Prueba*: "Tomar pastilla cada día a las 8am" → verificar repeat: daily.

## 2. Organización Bento (Feed & Cards)

Visualización agrupada y modular.

- **F08: Renderizado de Cards Bento** ✅
  - *Descripción*: Cada ítem se muestra en una tarjeta con color e icono según su tipo.
  - *Prueba*: Verificar colores: Amarillo (Nota), Azul (Tarea), Rosa (Proyecto), Morado (Directorio).

- **F09: Edición Inline (Expand/Collapse)** ✅
  - *Descripción*: Pulsar una card la expande para mostrar descripción, tareas, enlaces y alarma.
  - *Prueba*: Click en card → verificar formulario expandido con todos los campos editables.

- **F10: Gestión de Checklists** ✅
  - *Descripción*: Añadir, borrar y marcar tareas dentro de una card de tipo "tarea".
  - *Prueba*: Marcar checkbox → verificar estado de persistencia.

- **F11: Anclado de Elementos (Pinned)** ✅
  - *Descripción*: El botón de pin mantiene el ítem arriba en sección "📌 Fijados".
  - *Prueba*: Click pin → verificar que el ítem se mueva a la sección anclados.

- **F12: Múltiples URLs por Card** 🚧
  - *Descripción*: Cada card puede tener un array de URLs. La edición inline soporta agregar/quitar múltiples enlaces.
  - *Prueba*: Expandir card → "+ Link" → agregar URL → verificar que se guarda en array.
  - *Nota*: La estructura de datos soporta múltiples URLs, pero la UI tipo Google Keep (reordenar) está pendiente.

- **F13: Agrupación por Fecha** ✅
  - *Descripción*: Items agrupados en separadores: Hoy, Ayer, día de la semana, fecha completa.
  - *Prueba*: Crear items en diferentes fechas → verificar agrupación correcta.

- **F14: Barra de Progreso en Proyectos** ✅
  - *Descripción*: Proyectos muestran barra de progreso con tareas completadas/total.
  - *Prueba*: Crear proyecto con 3 tareas → marcar 1 → verificar barra 1/3.

## 3. Inteligencia Artificial (Kai)

Funciones impulsadas por LLM (Cerebras).

- **F15: Chat Contextual** ✅
  - *Descripción*: Chat con Kai sobre los datos existentes. Kai tiene contexto RAG de todos los items.
  - *Prueba*: Enviar mensaje → Recibir respuesta con burbuja de chat.

- **F16: Ejecución de Acciones por IA** ✅
  - *Descripción*: Kai puede interpretar comandos y ejecutar 10 tipos de acción (crear, editar, borrar, buscar, filtrar, etc.).
  - *Prueba*: "Crea una tarea para mañana" → verificar creación automática del ítem.

- **F17: Modo Offline de IA** ✅
  - *Descripción*: Sin API key, `offlineParse()` detecta tipos y tags localmente.
  - *Prueba*: Desconectar internet → ingresar texto → verificar detección básica.

## 4. Alarmas y Notificaciones

- **F18: Alarmas con Polling Local** ✅
  - *Descripción*: Verificación cada 30s de deadlines próximos con pestaña abierta.
  - *Prueba*: Configurar alarma en 1 min → verificar notificación inline con snooze.

- **F19: Snooze de Alarmas** ✅
  - *Descripción*: 3 opciones de snooze: 5 min, 10 min, 30 min (inline) + 5 min, 10 min (push notification).
  - *Prueba*: Disparar alarma → click "5 min" → verificar que se re-dispara.

- **F20: Alarmas Repetitivas** ✅
  - *Descripción*: Daily, weekly, monthly con avance automático del deadline.
  - *Prueba*: Alarma diaria → verificar que después de dispararse, el deadline avanza 24h.

- **F21: Push Notifications Multi-Dispositivo** ✅
  - *Descripción*: FCM V1 API con JWT RS256. Edge Function envía push incluso con app cerrada.
  - *Prueba*: Cerrar app → esperar alarma → verificar notificación del sistema.

- **F22: Prioridad de Notificaciones** ✅
  - *Descripción*: Tags "urgente"/"importante" → prioridad high con vibración extendida.
  - *Prueba*: Crear alarma con tag urgente → verificar vibración [200,100,200,100,200].

## 5. Sección "Hoy"

- **F23: Rutinas Diarias** ✅
  - *Descripción*: Lista de rutinas con checkbox de completitud. Soporta rutinas por defecto y personalizadas.
  - *Prueba*: Marcar "Tomar medicación" → verificar persistencia del día.

- **F24: Tareas del Día** ✅
  - *Descripción*: Crear, completar y eliminar tareas específicas para hoy.
  - *Prueba*: Agregar tarea → marcar completada → verificar tachado.

- **F25: Check-ins de Bienestar** ✅
  - *Descripción*: 3 momentos (mañana, tarde, noche) con energía (0-10) y emoción (10 estados).
  - *Prueba*: Completar check-in mañana → verificar notificación de guardado.

- **F26: Notificaciones de Check-in** ✅
  - *Descripción*: Recordatorios automáticos programados según el momento del día.
  - *Prueba*: Verificar que a las 10h llega notificación "¿Cómo amaneciste?".

## 6. Share Target

- **F27: Recepción de Contenido Compartido** ✅
  - *Descripción*: Recibir enlaces/texto desde otras apps del sistema vía URL params.
  - *Prueba*: Compartir URL desde navegador → verificar modal de KAI.

- **F28: Previsualización de Contenido** ✅
  - *Descripción*: Modal muestra preview del enlace, dominio, título editable.
  - *Prueba*: Compartir link → verificar que se muestra dominio y título.

- **F29: Agregar a Card Existente** ✅
  - *Descripción*: Selector de cards existentes para agregar URL a una card ya creada.
  - *Prueba*: Compartir URL → seleccionar card existente → verificar URL agregada.

- **F30: Clasificación Inteligente** ✅
  - *Descripción*: Sugerencia automática de tipo (nota, tarea, directorio) según contenido.
  - *Prueba*: Compartir link → verificar que sugiere tipo "directorio".

## 7. Gestión de Datos

- **F31: Importación JSON** ✅
  - *Descripción*: Importar backup completo desde archivo `.json` formato `Panel-Maria-KAI`.
  - *Prueba*: Importar archivo → verificar recarga de items.

- **F32: Exportación JSON** ✅
  - *Descripción*: Exportar todos los datos a archivo `.json` descargable.
  - *Prueba*: Click export → verificar descarga de archivo.

- **F33: Búsqueda Full-Text** ✅
  - *Descripción*: Búsqueda con RPC `search_items` de Supabase con fallback ILIKE.
  - *Prueba*: Escribir en barra de búsqueda → verificar resultados filtrados.

- **F34: Filtro por Categorías y Tags** ✅
  - *Descripción*: Filtrar el feed principal por tipo o tag.
  - *Prueba*: Click en "Proyecto" → verificar que solo se vean proyectos.

- **F35: Sincronización Realtime** ✅
  - *Descripción*: Sincronización automática vía Supabase channel `public:items` con debounce de 1s.
  - *Prueba*: Abrir 2 pestañas → crear item en una → verificar actualización en la otra.

## 8. PWA & Conectividad

- **F36: Service Worker** ✅
  - *Descripción*: Cache v12 con 3 estrategias (cache-first, network-first, stale-while-revalidate).
  - *Prueba*: Desconectar internet → verificar que la app carga desde caché.

- **F37: Instalación PWA** ✅
  - *Descripción*: Manifest configurado con iconos, screenshots, shortcuts.
  - *Prueba*: Verificar prompt de instalación en Chrome mobile.

- **F38: Shortcuts** ✅
  - *Descripción*: "Nueva Idea" y "Nueva Tarea" desde long-press del icono.
  - *Prueba*: Long-press icono → click "Nueva Tarea" → verificar input enfocado.

- **F39: FCM Token Management** ✅
  - *Descripción*: Generación, refresh automático (>6 días) y sync con Supabase.
  - *Prueba*: Verificar que token se guarda en `fcm_tokens` al iniciar sesión.

- **F40: Persistencia de Estado** ✅
  - *Descripción*: Vista actual, card expandida y filtros se guardan en localStorage.
  - *Prueba*: Expandir card → recargar → verificar que sigue expandida.

---
*Cualquier fallo en estas 40 funciones críticas detendrá el despliegue.*

Última actualización: Abril 2026
