import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://jiufptuxadjavjfbfwka.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppdWZwdHV4YWRqYXZqZmJmd2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwODY0NzgsImV4cCI6MjA4NTY2MjQ3OH0.LCXYWsmD-ZM45O_HNVwFHu8dJFzxns3Zd_2BHusm2CY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const CONFIG = {
    // Tipos canónicos — TODOS EN ESPAÑOL
    types: ['nota', 'tarea', 'proyecto', 'directorio'],

    // Mapa de migración: convierte tipos antiguos (inglés/mixtos) al tipo español correcto
    migrarTipo(tipo) {
        const mapa = {
            'note': 'nota',
            'idea': 'nota',
            'task': 'tarea',
            'project': 'proyecto',
            'link': 'directorio',
            'reminder': 'nota', // Alarma ahora es etiqueta
            'alarm': 'nota', // Alarma ahora es etiqueta
            'voice': 'nota',
            'mood': 'nota',
            'logro': 'nota', // Logro ahora es etiqueta
            // ya en español — pass-through
            'nota': 'nota',
            'tarea': 'tarea',
            'proyecto': 'proyecto',
            'directorio': 'directorio',
            'alarma': 'nota', // Alarma ahora es etiqueta
        };
        return mapa[tipo] || 'nota';
    },

    typeIcons: {
        nota: '📝',
        tarea: '✅',
        proyecto: '📁',
        directorio: '🔗',
    },
    typeColors: {
        nota: '#f0a5ff',
        tarea: '#64748B',
        proyecto: '#37d9e0',
        directorio: '#f0a5ff',
    }
};

