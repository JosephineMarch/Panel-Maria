import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://jiufptuxadjavjfbfwka.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppdWZwdHV4YWRqYXZqZmJmd2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwODY0NzgsImV4cCI6MjA4NTY2MjQ3OH0.LCXYWsmD-ZM45O_HNVwFHu8dJFzxns3Zd_2BHusm2CY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const CONFIG = {
    types: ['note', 'task', 'project', 'reminder', 'link', 'mood', 'voice'],
    statuses: ['inbox', 'active', 'completed', 'archived'],
    typeIcons: {
        note: '📝',
        task: '✅',
        project: '📁',
        reminder: '⏰',
        link: '🔗',
        mood: '💭',
        voice: '🎤'
    },
    typeColors: {
        note: '#fef3c7',
        task: '#d1fae5',
        project: '#e0e7ff',
        reminder: '#fee2e2',
        link: '#dbeafe',
        mood: '#fce7f3',
        voice: '#f3e8ff'
    }
};
