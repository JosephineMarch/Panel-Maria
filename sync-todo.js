/**
 * Sincroniza los TODOs desde Supabase hacia docs/TODO.md
 * 
 * Uso: node sync-todo.js
 * 
 * No requiere dependencias adicionales - usa fetch nativo de Node
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuración de Supabase (tu proyecto)
const SUPABASE_URL = 'https://jiufptuxadjavjfbfwka.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppdWZwdHV4YWRqYXZqZmJmd2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwODY0NzgsImV4cCI6MjA4NTY2MjQ3OH0.LCXYWsmD-ZM45O_HNVwFHu8dJFzxns3Zd_2BHusm2CY';

async function syncTodos() {
    console.log('Sincronizando TODOs desde Supabase...\n');
    
    // Obtener todos los TODOs usando fetch
    const response = await fetch(`${SUPABASE_URL}/rest/v1/todos?select=*&order=created_at.desc`, {
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
    });
    
    if (!response.ok) {
        console.error('Error al obtener TODOs:', response.status, response.statusText);
        process.exit(1);
    }
    
    const todos = await response.json();
    
    if (!todos || todos.length === 0) {
        console.log('No hay TODOs en la base de datos.');
        const emptyContent = `# TODO: Mejoras y Correcciones Panel-Maria

*Este documento se genera desde la app - NO EDITAR MANUALMENTE*
*Ultima sincronizacion: ${new Date().toLocaleString('es-ES')}*

---

No hay tareas pendientes. 

---

*Este documento se ira actualizando conforme confirmes que las tareas se han realizado satisfactoriamente.*`;
        fs.writeFileSync(path.join(__dirname, 'docs', 'TODO.md'), emptyContent);
        console.log('Archivo docs/TODO.md actualizado (vacio)');
        return;
    }
    
    // Agrupar por prioridad
    const alta = todos.filter(t => t.prioridad === 'alta');
    const media = todos.filter(t => t.prioridad === 'media');
    const baja = todos.filter(t => t.prioridad === 'baja');
    
    // Generar contenido markdown
    let content = `# TODO: Mejoras y Correcciones Panel-Maria

*Este documento se genera automaticamente desde la app*
*Ultima sincronizacion: ${new Date().toLocaleString('es-ES')}*

---

## Prioridad Alta (${alta.length} tareas)
${alta.length === 0 ? '_No hay tareas de alta prioridad_' : ''}
${alta.map(t => `- [${t.completado ? 'x' : ' '}] ${t.texto}`).join('\n')}

## Prioridad Media (${media.length} tareas)
${media.length === 0 ? '_No hay tareas de prioridad media_' : ''}
${media.map(t => `- [${t.completado ? 'x' : ' '}] ${t.texto}`).join('\n')}

## Prioridad Baja (${baja.length} tareas)
${baja.length === 0 ? '_No hay tareas de baja prioridad_' : ''}
${baja.map(t => `- [${t.completado ? 'x' : ' '}] ${t.texto}`).join('\n')}

---

*Este documento se ira actualizando conforme confirmes que las tareas se han realizado satisfactoriamente.*
`;

    // Escribir archivo
    const outputPath = path.join(__dirname, 'docs', 'TODO.md');
    fs.writeFileSync(outputPath, content);
    
    console.log(`Archivo docs/TODO.md actualizado con ${todos.length} tareas`);
    console.log(`   - Alta: ${alta.length} | Media: ${media.length} | Baja: ${baja.length}`);
    console.log(`\nArchivo guardado en: ${outputPath}`);
}

syncTodos().catch(console.error);