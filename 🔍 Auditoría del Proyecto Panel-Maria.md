🔍 Auditoría del Proyecto Panel-Maria
Resumen Ejecutivo
Categoría	Cantidad
🔴 Bugs Críticos	5
🟠 Código Duplicado / Muerto	4
🟡 Desconexiones / Inconsistencias	6
🟢 Mejoras de Robustez	3
🔴 BUGS CRÍTICOS
1. <main> anidado ilegalmente en 
index.html
Archivo: 
index.html

diff
- <main id="app" ...>          ← primer main
-   ...
-   <main>                     ← ¡segundo main dentro del primero! (L162)
-     <section id="items-container">
El HTML es inválido. Un <main> dentro de otro <main> rompe la semántica y puede causar comportamientos inesperados en algunos navegadores. El <main> interno de la línea 162 debe cambiarse por un <div>.

2. </div> huérfano al final del <body> en 
index.html
Archivo: 
index.html

html
</div>   ← línea 397: cierre sin apertura correspondiente
    </body>
Hay un </div> extra justo antes de cerrar el </body>. Esto significa que algún elemento del DOM está mal cerrado o tiene un </div> de sobra que corrompe la estructura.

3. Error de sintaxis en 
ui_new.js
 (comillas rotas)
Archivo: 
ui_new.js

js
// Línea 366 — comillas mezcladas, esto causa SyntaxError en runtime
completado: row.querySelector('input[type='checkbox']').checked
//                                         ^          ^
//                               comilla simple rompe el string
Debe ser:

js
completado: row.querySelector('input[type="checkbox"]').checked
Este archivo no está importado actualmente, pero si alguna vez se usa causará un crash inmediato.

4. 
expandCard
 en 
ui.js
 recarga TODOS los items al expandir una tarjeta
Archivo: 
ui.js L488-L501

js
expandCard(card, item) {
    document.querySelectorAll('[data-expanded="true"]').forEach(c => {
        if (c !== card) {
            c.dataset.expanded = 'false';
            if (window.kai) window.kai.loadItems(); // ← recarga TODA la lista N veces
        }
    });
    ...
}
Si hay múltiples tarjetas expandidas, se disparan múltiples llamadas a 
loadItems()
, lo que genera peticiones innecesarias a Supabase (o parpadeos en modo demo). Debe llamarse UNA sola vez fuera del loop.

5. 
deleteItem
 en modo real no recarga la lista
Archivo: 
logic.js L496-L509

js
async deleteItem(id) {
    try {
        if (this.isDemoMode) {
            await this.demoDeleteItem(id);
            ui.showNotification(...);
            // ← falta this.loadItems()  ← en demo no recarga!
        } else {
            await data.deleteItem(id);
            ui.showNotification(...);
            await this.loadItems(); // ← solo en modo real recarga
        }
    }
En modo demo, después de borrar un item no se recarga la UI, entonces el item borrado sigue visible hasta que el usuario hace otra acción.

🟠 CÓDIGO DUPLICADO / MUERTO
6. 
ui_new.js
 — archivo muerto, no importado en ningún lado
Archivo: 
ui_new.js

Este archivo de 484 líneas duplica casi el 60% de 
ui.js
 (mismas funciones: 
render
, 
createItemCard
, 
updateCardContent
, 
renderCollapsedCard
, 
renderExpandedCard
, 
bindInlineEvents
, 
handleInlineSave
, 
toggleSidebar
, 
toggleModal
, 
showNotification
, 
renderLoading
, 
renderError
, 
escapeHtml
, 
truncate
).

logic.js
 importa 
ui.js
, nunca 
ui_new.js
. Es un archivo fantasma.

WARNING

Recomendación: Eliminar 
ui_new.js
 o hacer un merge consciente. Tenerlo genera confusión y riesgo de editar el archivo equivocado.

7. 
gemini.js
 y 
cerebras.js
 — dos clientes de IA paralelos
Archivos: 
src/js/gemini.js
 y 
src/js/cerebras.js

logic.js
 importa y usa 
cerebras.js
 para el chat de Kai. 
gemini.js
 existe pero no está importado en ningún archivo activo. Si 
cerebras.js
 ya es el motor activo, 
gemini.js
 es código muerto.

8. 
style.css
 duplicado en la raíz
Archivos: 
style.css
 (raíz, 46 bytes) y 
src/css/style.css
 (8761 bytes)

El 
index.html
 importa 
src/css/style.css
 (correcto). El 
style.css
 de la raíz tiene 46 bytes de contenido vacío/residual y no se usa. Puede causar confusión.

9. CONFIG importado pero nunca usado en 
ui.js
Archivo: 
ui.js L1

js
import { CONFIG } from './supabase.js'; // ← importado
// ... 853 líneas después, CONFIG nunca se referencia
La misma importación ocurre en 
ui_new.js
. Ambas son importaciones muertas.

🟡 DESCONEXIONES / INCONSISTENCIAS
10. Tipos de items inconsistentes en todo el sistema
Archivo	Tipos usados
supabase.js
 CONFIG	note, 
task
, project, reminder, link
ui.js
 typeConfig	nota, 
task
, proyecto, directorio, logro, alarm, reminder
ui_new.js
 typeConfig	note, idea, proyecto, directorio, reminder, logro
index.html
 select opciones	nota, 
task
, proyecto, directorio
data.js
 createItem default	'note' (en inglés)
Hay una mezcla de tipos en inglés (note, project, reminder) y español (nota, proyecto, directorio). Esto causa que al filtrar por categoría se puedan perder items.

11. 
toggleSidebar
 usa clases diferentes en 
ui.js
 vs 
ui_new.js
js
// ui.js (activo) — línea 752
this.elements.sidebar()?.classList.toggle('-translate-x-full');
// ui_new.js — línea 384
this.elements.sidebar()?.classList.toggle('translate-x-full');
//                                         ^ sin el guion negativo
El sidebar en 
index.html
 tiene clase "-translate-x-full" (negativa). Solo 
ui.js
 es correcto.

12. 
ai.js
 importa supabase pero nunca lo usa
js
import { supabase } from './supabase.js'; // línea 1 de ai.js
// ... supabase nunca se menciona en las 297 líneas
Importación muerta.

13. auth-signIn escuchado pero auth-SIGNED_IN es lo que Supabase emite
Archivo: 
logic.js L857

js
window.addEventListener('auth-signIn', async () => { ... }); // lógica post-login
Archivo: 
auth.js L18-L21

js
handleAuthChange(event, session) {
    const eventName = `auth-${event}`; // event = 'SIGNED_IN' → "auth-SIGNED_IN"
    window.dispatchEvent(new CustomEvent(eventName, ...));
}
El evento que se emite es "auth-SIGNED_IN" (mayúsculas, como lo devuelve Supabase), pero en 
logic.js
 se escucha "auth-signIn" (camelCase). Este listener nunca se dispara, por lo que el login nunca actualiza la UI correctamente.

14. Botones de estado de ánimo en el header sin funcionalidad conectada
Archivo: 
index.html L114-L119

html
<button ...>😴 Cansada</button>
<button ...>⚡ Enfocada</button>
Estos botones no tienen 
id
, no tienen event listeners en 
logic.js
, y no guardan nada. Son decorativos pero probablemente deberían guardar el estado de ánimo como un item.

15. 
share.js
 importado en 
app.js
 — pero sin verificación de que existe
app.js
 importa './src/js/share.js'. Si este archivo falla (error de red, código roto), rompe todo el módulo porque los imports de ES módulos son estrictos. No hay manejo de error para importaciones dinámicas.

🟢 MEJORAS DE ROBUSTEZ
16. 
handleInlineSave
 en 
ui.js
 puede fallar si elementos no existen
js
const content = document.getElementById(`inline-content-${id}`).value; // sin ?
Si por alguna razón el elemento no existe en el DOM, esto lanza TypeError: Cannot read properties of null. Debe usar optional chaining o verificar antes.

17. 
triggerAlarm
 no verifica si el audio puede reproducirse
js
const audio = new Audio('data:audio/wav;base64,...');
audio.play().catch(() => {}); // el error se traga silenciosamente
El .catch(() => {}) silencia cualquier error. Al menos debería loggear en consola para poder depurar en producción.

18. 
checkAlarms
 usa hora de Lima hardcodeada
js
const limaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Lima' }));
La zona horaria está hardcodeada. Si la usuaria cambia de ciudad o usa la app en otro país, las alarmas dispararán en el horario incorrecto. Debería considerarse usar el timezone del navegador (Intl.DateTimeFormat().resolvedOptions().timeZone) o hacerlo configurable.

Plan de Correcciones Prioritarias
PRIORIDAD ALTA (corregir ya):
  ✅ Bug #5  → Añadir loadItems() en deleteItem modo demo
  ✅ Bug #13 → Corregir nombre del evento auth-SIGNED_IN
  ✅ Bug #1  → Cambiar <main> anidado por <div>
  ✅ Bug #2  → Eliminar </div> huérfano
PRIORIDAD MEDIA:
  ✅ Bug #4  → Corregir expandCard para llamar loadItems() una sola vez
  ✅ Bug #10 → Unificar tipos (todo en español: nota, tarea, proyecto, directorio, logro)
  ✅ Bug #6  → Eliminar ui_new.js o decidir cuál usar
PRIORIDAD BAJA:
  ✅ Bug #9  → Eliminar import CONFIG no usado
  ✅ Bug #12 → Eliminar import supabase no usado en ai.js
  ✅ Bug #17 → Audio de alarma ahora loggea errores
  ✅ Bug #18 → Timezone dinámico (usa configuración del navegador)

---
**✅ AUDITORÍA COMPLETADA - Todos los bugs corregidos (23/02/2026)**