// src/js/demo-data.js
// Generador de datos demo para pruebas sin conexión
// NO afecta el funcionamiento de la app - solo para testing
//
// Para regenerar demo data desde la consola del navegador:
// import('./demo-data.js').then(m => m.regenerarDemoItems()).then(() => location.reload())

export function generarDemoData() {
    const ahora = new Date();
    
    return [
        {
            id: 'demo-1',
            content: 'Proyecto Principal',
            type: 'proyecto',
            descripcion: 'Este es un proyecto con una descripción muy larga que quiero ver completa sin que se corte. Aquí hay más texto para demostrar que ahora se muestra todo el contenido sin límites de caracteres.',
            tareas: [
                { titulo: 'Tarea con texto muy largo que antes se cortaba y ahora debería mostrarse completo', completado: false },
                { titulo: 'Otra tarea normal', completado: true },
                { titulo: 'Tarea número tres', completado: false }
            ],
            deadline: null,
            anclado: false,
            created_at: ahora.toISOString()
        },
        {
            id: 'demo-2',
            content: 'Ideas para el Proyecto',
            type: 'idea',
            descripcion: 'Una idea con descripción muy larga: Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
            tareas: [],
            deadline: null,
            anclado: false,
            created_at: new Date(ahora.getTime() - 3600000).toISOString()
        },
        {
            id: 'demo-3',
            content: 'Recordatorio Importante',
            type: 'reminder',
            descripcion: 'Esta alarma debería sonar en 2 minutos',
            tareas: [],
            deadline: new Date(ahora.getTime() + 120000).toISOString(),
            anclado: false,
            created_at: new Date(ahora.getTime() - 7200000).toISOString()
        },
        {
            id: 'demo-4',
            content: 'Lista de Compras',
            type: 'task',
            descripcion: '',
            tareas: [
                { titulo: 'Comprar leche', completado: false },
                { titulo: 'Pan', completado: false },
                { titulo: 'Huevos', completado: false },
                { titulo: 'Frutas y verduras frescas del mercado', completado: false }
            ],
            deadline: null,
            anclado: false,
            created_at: new Date(ahora.getTime() - 86400000).toISOString()
        },
        {
            id: 'demo-5',
            content: 'Enlace útil',
            type: 'directorio',
            descripcion: 'Mi sitio web favorito',
            url: 'https://google.com',
            tareas: [],
            deadline: null,
            anclado: false,
            created_at: new Date(ahora.getTime() - 172800000).toISOString()
        },
        {
            id: 'demo-6',
            content: '¡Mi Primer Logro!',
            type: 'logro',
            descripcion: 'He completado todas mis tareas del día',
            tareas: [],
            deadline: null,
            anclado: false,
            created_at: new Date(ahora.getTime() - 259200000).toISOString()
        },
        {
            id: 'demo-bitacora-1',
            content: 'Hice ejercicio — Hoy 8:00am',
            type: 'bitacora',
            descripcion: '',
            tareas: [],
            tags: ['bitacora', 'accion'],
            meta: { momento: 'hoy' },
            deadline: null,
            anclado: false,
            created_at: new Date(ahora.getTime() - 3600000).toISOString()
        },
        {
            id: 'demo-bitacora-2',
            content: 'Terminé de leer el libro — Ayer 6:30pm',
            type: 'bitacora',
            descripcion: '',
            tareas: [],
            tags: ['bitacora', 'accion'],
            meta: { momento: 'ayer' },
            deadline: null,
            anclado: false,
            created_at: new Date(ahora.getTime() - 86400000).toISOString()
        },
        {
            id: 'demo-bitacora-3',
            content: 'Me bañé — Hoy 7:30am',
            type: 'bitacora',
            descripcion: '',
            tareas: [],
            tags: ['bitacora', 'accion'],
            meta: { momento: 'hoy' },
            deadline: null,
            anclado: false,
            created_at: new Date(ahora.getTime() - 7200000).toISOString()
        }
    ];
}

export function regenerarDemoItems() {
    localStorage.removeItem('kaiDemoItems');
    const datos = generarDemoData();
    localStorage.setItem('kaiDemoItems', JSON.stringify(datos));
    console.log('✅ Demo data regenerada');
    return datos;
}
