import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://jiufptuxadjavjfbfwka.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppdWZwdHV4YWRqYXZqZmJmd2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwODY0NzgsImV4cCI6MjA4NTY2MjQ3OH0.LCXYWsmD-ZM45O_HNVwFHu8dJFzxns3Zd_2BHusm2CY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const CONFIG = {
    // Tipos canónicos — TODOS EN ESPAÑOL
    types: ['nota', 'tarea', 'proyecto', 'directorio', 'alarma'],

    // Mapa de migración: convierte tipos antiguos (inglés/mixtos) al tipo español correcto
    migrarTipo(tipo) {
        const mapa = {
            'note': 'nota',
            'idea': 'nota',
            'task': 'tarea',
            'project': 'proyecto',
            'link': 'directorio',
            'reminder': 'alarma',
            'alarm': 'alarma',
            'voice': 'nota',
            'mood': 'nota',
            'logro': 'nota', // Logro ahora es etiqueta, migrar a nota
            // ya en español — pass-through
            'nota': 'nota',
            'tarea': 'tarea',
            'proyecto': 'proyecto',
            'directorio': 'directorio',
            'alarma': 'alarma',
        };
        return mapa[tipo] || 'nota';
    },

    typeIcons: {
        nota: '📝',
        tarea: '✅',
        proyecto: '📁',
        directorio: '🔗',
        alarma: '⏰',
    },
    typeColors: {
        nota: '#fef3c7',
        tarea: '#d1fae5',
        proyecto: '#e0e7ff',
        directorio: '#dbeafe',
        alarma: '#fee2e2',
    }
};

