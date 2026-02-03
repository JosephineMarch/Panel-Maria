export const sampleItems = [
    {
        titulo: "Rediseño de Terraza 🌿",
        descripcion: "Un espacio neo-brutalista con muchas plantas y luz neonatal.",
        tipo: "hormiga",
        estado: "proceso",
        url: "",
        etiquetas: ["hogar", "decoracion", "exterior"],
        anclado: true,
        fecha_creacion: new Date().toISOString(),
        tareas: [
            { titulo: "Comprar macetas de cemento", completado: true },
            { titulo: "Elegir plantas de sombra", completado: false },
            { titulo: "Instalar luces LED", completado: false }
        ]
    },
    {
        titulo: "Idea: Podcast 'Cerebro Externo' 🎙️",
        descripcion: "Episodios cortos de 5 minutos sobre productividad para TDAH.",
        tipo: "chispa",
        estado: "planeacion",
        url: "https://spotify.com",
        etiquetas: ["ideas", "marketing", "personal"],
        anclado: false,
        fecha_creacion: new Date(Date.now() - 86400000).toISOString(),
        tareas: []
    },
    {
        titulo: "Iconos Lucide (Referencia) 💎",
        descripcion: "Biblioteca de iconos minimalistas que usamos en el panel.",
        tipo: "referencia",
        estado: "terminado",
        url: "https://lucide.dev",
        etiquetas: ["diseño", "recursos"],
        anclado: false,
        fecha_creacion: new Date(Date.now() - 172800000).toISOString(),
        tareas: []
    },
    {
        titulo: "Mañana Productiva 🧘",
        descripcion: "Bitácora de rutina matutina. Hoy me sentí muy enfocada.",
        tipo: "salud",
        estado: "terminado",
        url: "",
        etiquetas: ["bienestar", "rutina"],
        anclado: false,
        fecha_creacion: new Date(Date.now() - 400000000).toISOString(),
        tareas: [
            { titulo: "Meditar 10 min", completado: true },
            { titulo: "Escribir 3 agradecimientos", completado: true }
        ]
    },
    {
        titulo: "¡Curso de Animación Web! 🎓",
        descripcion: "Terminé el módulo de Framer Motion. ¡Fue increíble!",
        tipo: "logro",
        estado: "terminado",
        url: "https://frontendmasters.com",
        etiquetas: ["estudio", "logros", "dev"],
        anclado: true,
        fecha_creacion: new Date(Date.now() - 500000000).toISOString(),
        tareas: []
    },
    {
        titulo: "Revisión Mensual de Gastos 💸",
        descripcion: "Toca ver en qué se nos fue el dinero este mes.",
        tipo: "hormiga",
        estado: "planeacion",
        url: "",
        etiquetas: ["finanzas", "orden"],
        anclado: false,
        fecha_creacion: new Date().toISOString(),
        tareas: [
            { titulo: "Descargar extractos", completado: false },
            { titulo: "Categorizar en Excel", completado: false }
        ]
    }
];
