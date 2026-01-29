# 📑 ESPECIFICACIONES TÉCNICAS FINALES: PANEL-MARÍA & KAI

## 1. Identidad del Asistente: KAI

* **Personalidad:** Kai es un asistente varón, extremadamente alegre, gracioso y positivo. Es empático (entiende tus días de baja energía) pero **no complaciente** (te dará el empujoncito necesario para que no te estanques).
* **Estilo de Comunicación:** Ingenioso, con frases divertidas y un humor que aligera la carga mental.
* **Evolución Cognitiva:** Kai debe "aprender" de la información que ingresas. Su personalidad y comentarios deben adaptarse a tus gustos, tus logros y tus baches de salud, volviéndose más cercano conforme te conoce.

## 2. Arquitectura de Inteligencia (Cerebro)

* **Conexión por API:** El sistema debe configurarse fácilmente mediante una clave de API (OpenAI GPT-4o, Claude o similar).
* **Memoria a Largo Plazo (RAG):** Kai debe consultar tu base de datos de Firebase para recordar ideas pasadas, enlaces o sentimientos registrados.
* **Procesamiento de Voz:** Kai limpia tus audios desordenados, extrae la esencia y la organiza sin que tú hagas nada manual.

## 3. Funcionalidades de Interoperabilidad y Offline

* **Share Target 2.0:** Integración perfecta para compartir desde redes sociales (Facebook, Instagram, etc.). Kai recibe el link, extrae la previsualización y la guarda en el "Directorio" con etiquetas automáticas.
* **Multiplataforma Real:** Optimización total para móvil y escritorio (Responsive Design).
* **Modo Offline:** Uso de **Service Workers** e **IndexedDB** para que la app abra al instante y permita registrar información o recibir alarmas críticas de salud **sin conexión a internet**. Los datos se sincronizarán con Kai en cuanto vuelvas a estar online.

## 4. Interfaz y Experiencia de Usuario

* **Chat Central:** Una interfaz de conversación fluida con Kai para capturar y consultar.
* **Cajón de Sastre Visual:** Una galería de bloques donde conviven todos tus datos mezclados, pero organizados visualmente con etiquetas generadas por IA (ej: #Jardinería, #Ilustración).
* **Buscador Semántico:** Kai puede encontrar "aquello que mencioné de la manta azul" sin que recuerdes la fecha o la palabra exacta.

---

## 🛠 INSTRUCCIONES PARA LA IA DESARROLLADORA

> "Reutiliza toda la estructura existente de la app (Firebase, PWA, estilos). Tu prioridad es implementar el **Asistente Kai** en el chat principal. Kai debe ser capaz de:
> 1. Clasificar entradas de voz/texto/redes sociales automáticamente.
> 2. Desglosar proyectos en micro-pasos de 5 minutos.
> 3. Hablar (Web Speech API) para recordatorios de salud y tareas con una personalidad ingeniosa y alegre.
> 4. Funcionar en segundo plano (Offline) para guardar datos localmente.
> 5. Evolucionar su tono basándose en el historial de datos del usuario."
> 
> 

---

### Cómo presentar esto a la IA de programación:

1. **Copia tu código actual** o dale acceso a tu repositorio.
2. **Pega este informe completo.**
3. **Dile lo siguiente:** "Este es el levantamiento de requerimientos para mi app Panel-María. Quiero que Kai sea el cerebro. Empieza por configurar la lógica para que Kai reciba la información que comparto desde redes sociales y la clasifique automáticamente en Firebase. Mantén lo que ya funciona y optimiza el modo offline."
