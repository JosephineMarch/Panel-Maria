// src/js/demo-data.js
// Generador de datos demo para pruebas sin conexión
// NO afecta el funcionamiento de la app - solo para testing
//
// Tipos: nota, tarea, proyecto, directorio, alarma, logro
// Tags: logro, salud, emocion, alarma

export function generarDemoData() {
    const ahora = new Date();

    return [
        // Proyecto
        {
            id: 'demo-1',
            content: 'Proyecto Principal',
            type: 'proyecto',
            descripcion: 'Este es un proyecto con una descripción muy larga que quiero ver completa sin que se corte.',
            tareas: [
                { titulo: 'Tarea con texto muy largo que antes se cortaba', completado: false },
                { titulo: 'Otra tarea normal', completado: true },
                { titulo: 'Tarea número tres', completado: false }
            ],
            tags: [],
            deadline: null,
            anclado: false,
            created_at: ahora.toISOString()
        },
        // Nota simple
        {
            id: 'demo-2',
            content: 'Nota rápida sobre algo importante',
            type: 'nota',
            descripcion: 'Una nota con descripción',
            tareas: [],
            tags: [],
            deadline: null,
            anclado: false,
            created_at: new Date(ahora.getTime() - 3600000).toISOString()
        },
        // Nota con deadline (alarma)
        {
            id: 'demo-3',
            content: 'Comprar leche',
            type: 'nota',
            descripcion: '',
            tareas: [],
            tags: ['alarma'],
            deadline: new Date(ahora.getTime() + 7200000).toISOString(), // en 2 horas
            anclado: false,
            created_at: new Date(ahora.getTime() - 7200000).toISOString()
        },
        // Task (checklist)
        {
            id: 'demo-4',
            content: 'Lista de Compras',
            type: 'tarea',
            descripcion: '',
            tareas: [
                { titulo: 'Comprar leche', completado: false },
                { titulo: 'Pan', completado: false },
                { titulo: 'Huevos', completado: false },
                { titulo: 'Frutas y verduras', completado: false }
            ],
            tags: [],
            deadline: null,
            anclado: false,
            created_at: new Date(ahora.getTime() - 86400000).toISOString()
        },
        // Directorio (enlace)
        {
            id: 'demo-5',
            content: 'Enlace útil',
            type: 'directorio',
            descripcion: 'Mi sitio web favorito',
            url: 'https://google.com',
            tareas: [],
            tags: [],
            deadline: null,
            anclado: false,
            created_at: new Date(ahora.getTime() - 172800000).toISOString()
        },
        // Logro (manual)
        {
            id: 'demo-6',
            content: '¡Completé mi primer proyecto!',
            type: 'logro',
            descripcion: 'He completado todas mis tareas del día',
            tareas: [],
            tags: ['logro'],
            deadline: null,
            anclado: false,
            created_at: new Date(ahora.getTime() - 259200000).toISOString()
        },
        // Nota con tag salud
        {
            id: 'demo-7',
            content: 'Hice ejercicio',
            type: 'nota',
            descripcion: '',
            tareas: [],
            tags: ['salud'],
            deadline: null,
            anclado: false,
            created_at: new Date(ahora.getTime() - 3600000).toISOString()
        },
        // Nota con tag salud
        {
            id: 'demo-8',
            content: 'Me dolió la cabeza todo el día',
            type: 'nota',
            descripcion: '',
            tareas: [],
            tags: ['salud'],
            deadline: null,
            anclado: false,
            created_at: new Date(ahora.getTime() - 7200000).toISOString()
        },
        // Nota con tag emocion
        {
            id: 'demo-9',
            content: 'Me sentí muy feliz hoy',
            type: 'nota',
            descripcion: '',
            tareas: [],
            tags: ['emocion'],
            deadline: null,
            anclado: false,
            created_at: new Date(ahora.getTime() - 10800000).toISOString()
        },
        // Nota con tag emocion negativa
        {
            id: 'demo-10',
            content: 'Me siento triste',
            type: 'nota',
            descripcion: '',
            tareas: [],
            tags: ['emocion'],
            deadline: null,
            anclado: false,
            created_at: new Date(ahora.getTime() - 14400000).toISOString()
        },
        // Nota con tag salud (cansancio)
        {
            id: 'demo-11',
            content: 'Estuve cansada todo el día',
            type: 'nota',
            descripcion: '',
            tareas: [],
            tags: ['salud'],
            deadline: null,
            anclado: false,
            created_at: new Date(ahora.getTime() - 18000000).toISOString()
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
