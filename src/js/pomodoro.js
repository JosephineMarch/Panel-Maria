/**
 * Módulo Pomodoro
 * Sistema de gestión de tiempo Pomodoro para KAI
 */

import { data } from './data.js';
import { ui } from './ui.js';

export const pomodoro = {
    // Configuración
    tiempoTrabajo: 25,      // minutos
    tiempoDescansoCorto: 5, // minutos
    tiempoDescansoLargo: 15,// minutos
    maxCiclos: 4,
    
    // Estado
    tiempoRestante: 25 * 60, // segundos
    estado: 'idle',          // idle, trabajo, descanso
    ciclosCompletados: 0,
    intervalo: null,
    tareaActual: null,      // ID de tarea asociada
    
    /**
     * Iniciar el Pomodoro
     */
    iniciar(tareaId = null) {
        if (this.estado !== 'idle') return;
        
        this.tareaActual = tareaId;
        this.estado = 'trabajo';
        this.tiempoRestante = this.tiempoTrabajo * 60;
        
        this.mostrarTimer();
        this.iniciarIntervalo();
        
        this.notificar('🍅 Pomodoro iniciado', 'Enfocate y trabajá durante 25 minutos');
    },
    
    /**
     * Iniciar el intervalo del timer
     */
    iniciarIntervalo() {
        this.intervalo = setInterval(() => {
            this.tiempoRestante--;
            
            if (this.tiempoRestante <= 0) {
                this.completarPeriodo();
            } else {
                this.actualizarTimer();
            }
        }, 1000);
    },
    
    /**
     * Completar el período actual (trabajo o descanso)
     */
    async completarPeriodo() {
        this.detener();
        
        if (this.estado === 'trabajo') {
            // Guardar pomodoro completado
            await this.guardarSesion(true);
            
            this.ciclosCompletados++;
            
            // Decidir siguiente acción
            if (this.ciclosCompletados >= this.maxCiclos) {
                // Descanso largo
                this.notificar('🎉 ¡4 pomodoros!', 'Descanso largo de 15 minutos');
                this.estado = 'descanso-largo';
                this.tiempoRestante = this.tiempoDescansoLargo * 60;
            } else {
                // Descanso corto
                this.notificar('⏰ ¡25 min!', 'Descansa 5 minutos');
                this.estado = 'descanso';
                this.tiempoRestante = this.tiempoDescansoCorto * 60;
            }
            
            // Reproducir audio
            this.reproducirAudio('descanso');
            
            // Mostrar opciones
            this.mostrarOpcionesDescanso();
            
        } else {
            // Terminó descanso, volver a trabajo
            this.notificar('☕ Descanso terminado', '¡Listo para enfocarte!');
            this.reproducirAudio('trabajo');
            this.estado = 'trabajo';
            this.tiempoRestante = this.tiempoTrabajo * 60;
            this.mostrarTimer();
            this.iniciarIntervalo();
        }
    },
    
    /**
     * Pausar el Pomodoro
     */
    pausar() {
        if (this.estado === 'idle') return;
        this.detener();
        this.estado = 'pausado';
        this.mostrarTimer();
    },
    
    /**
     * Reanudar el Pomodoro
     */
    reanudar() {
        if (this.estado !== 'pausado') return;
        this.estado = 'trabajo';
        this.iniciarIntervalo();
        this.mostrarTimer();
    },
    
    /**
     * Detener completamente
     */
    async detener() {
        if (this.intervalo) {
            clearInterval(this.intervalo);
            this.intervalo = null;
        }
    },
    
    /**
     * Saltar al siguiente período
     */
    async saltar() {
        await this.detener();
        
        if (this.estado === 'trabajo') {
            // Guardar como incompleto (no cuenta)
            await this.guardarSesion(false);
            
            // Ir a descanso
            if (this.ciclosCompletados >= this.maxCiclos - 1) {
                this.estado = 'descanso-largo';
                this.tiempoRestante = this.tiempoDescansoLargo * 60;
            } else {
                this.estado = 'descanso';
                this.tiempoRestante = this.tiempoDescansoCorto * 60;
            }
        } else {
            // Fin del descanso, volver a trabajo
            this.estado = 'trabajo';
            this.tiempoRestante = this.tiempoTrabajo * 60;
        }
        
        this.mostrarTimer();
        this.iniciarIntervalo();
    },
    
    /**
     * Finalizar sesión
     */
    async finish() {
        await this.detener();
        this.reset();
        ui.showNotification('Sesión finalizada', 'info');
    },
    
    /**
     * Resetear todo
     */
    reset() {
        this.estado = 'idle';
        this.tiempoRestante = this.tiempoTrabajo * 60;
        this.ciclosCompletados = 0;
        this.tareaActual = null;
        this.mostrarTimer();
    },
    
    /**
     * Guardar sesión en la base de datos
     */
    async guardarSesion(completo = true) {
        try {
            await data.createItem({
                type: 'pomodoro',
                content: completo ? 'Pomodoro completado' : 'Pomodoro incompleto',
                descripcion: completo ? 'completed' : 'incomplete',
                meta: {
                    duracion: this.tiempoTrabajo,
                    ciclo: this.ciclosCompletados + 1,
                    tarea_id: this.tareaActual,
                    completo: completo
                }
            });
            console.log('✅ Sesión Pomodoro guardada');
        } catch (err) {
            console.error('Error guardando sesión Pomodoro:', err);
        }
    },
    
    /**
     * Obtener pomodoros de hoy
     */
    async getPomodorosHoy() {
        try {
            const items = await data.getItems({ type: 'pomodoro' });
            const hoy = new Date().toDateString();
            
            return items.filter(item => {
                const fecha = new Date(item.created_at).toDateString();
                return fecha === hoy && item.meta?.completo === true;
            }).length;
        } catch (err) {
            console.error('Error obteniendo pomodoros:', err);
            return 0;
        }
    },
    
    /**
     * Obtener pomodoros de una tarea específica
     */
    async getPomodorosTarea(tareaId) {
        try {
            const items = await data.getItems({ type: 'pomodoro' });
            return items.filter(item => item.meta?.tarea_id === tareaId).length;
        } catch (err) {
            return 0;
        }
    },
    
    /**
     * Notificación push
     */
    notificar(titulo, cuerpo) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(titulo, {
                body: cuerpo,
                icon: './src/assets/icon-192.png'
            });
        }
    },
    
    /**
     * Reproducir audio con voz
     */
    reproducirAudio(tipo) {
        if (!('speechSynthesis' in window)) return;
        
        const textos = {
            'trabajo': 'Enfocate',
            'descanso': 'Descansa'
        };
        
        const utterance = new SpeechSynthesisUtterance(textos[tipo]);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        
        // Intentar usar voz en español si existe
        const voces = speechSynthesis.getVoices();
        const vozES = voces.find(v => v.lang.includes('es'));
        if (vozES) utterance.voice = vozES;
        
        speechSynthesis.speak(utterance);
    },
    
    /**
     * Mostrar timer en el modal
     */
    mostrarTimer() {
        const modal = document.getElementById('modal-pomodoro');
        if (!modal) return;
        
        const minutos = Math.floor(this.tiempoRestante / 60);
        const segundos = this.tiempoRestante % 60;
        const tiempoStr = `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
        
        document.getElementById('pomodoro-timer').textContent = tiempoStr;
        document.getElementById('pomodoro-ciclos').textContent = `Ciclo: ${this.ciclosCompletados + 1}/${this.maxCiclos}`;
        
        // Actualizar estado del botón
        const btnIniciar = document.getElementById('pomodoro-btn-iniciar');
        if (this.estado === 'idle' || this.estado === 'pausado') {
            btnIniciar.textContent = this.estado === 'pausado' ? '▶ Reanudar' : '▶ Iniciar';
        } else if (this.estado === 'trabajo' || this.estado === 'descanso' || this.estado === 'descanso-largo') {
            btnIniciar.textContent = '⏸ Pausar';
        }
    },
    
    /**
     * Actualizar timer (llamada cada segundo)
     */
    actualizarTimer() {
        this.mostrarTimer();
    },
    
    /**
     * Mostrar opciones después de completar trabajo
     */
    mostrarOpcionesDescanso() {
        const opciones = document.getElementById('pomodoro-opciones');
        if (opciones) {
            opciones.classList.remove('hidden');
        }
    },
    
    /**
     * Inicializar el módulo
     */
    init() {
        // Botón flotante
        document.getElementById('btn-pomodoro')?.addEventListener('click', () => {
            this.reset();
            this.mostrarTimer();
            document.getElementById('modal-pomodoro')?.classList.remove('hidden');
        });
        
        // Botones del modal
        document.getElementById('pomodoro-btn-iniciar')?.addEventListener('click', () => {
            if (this.estado === 'idle' || this.estado === 'pausado') {
                this.iniciar(this.tareaActual);
            } else {
                this.pausar();
            }
        });
        
        document.getElementById('pomodoro-btn-saltar')?.addEventListener('click', () => {
            this.saltar();
        });
        
        document.getElementById('pomodoro-btn-fin')?.addEventListener('click', () => {
            this.finish();
        });
        
        // Cerrar modal
        document.getElementById('pomodoro-cerrar')?.addEventListener('click', () => {
            if (this.estado !== 'idle' && this.estado !== 'trabajo') {
                if (confirm('¿Abandonar la sesión?')) {
                    this.finish();
                    document.getElementById('modal-pomodoro')?.classList.add('hidden');
                }
            } else {
                document.getElementById('modal-pomodoro')?.classList.add('hidden');
            }
        });
        
        console.log('✅ Pomodoro inicializado');
    }
};

// Auto-inicializar cuando se cargue
window.addEventListener('DOMContentLoaded', () => {
    pomodoro.init();
});