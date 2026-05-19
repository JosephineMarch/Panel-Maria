import { data } from './data.js';
import { ui } from './ui.js';
import { auth } from './auth.js';

/**
 * Módulo de Salud y Bienestar para KAI
 * Encapsula la lógica de ciclo menstrual, sueño y check-ins.
 */
class SaludController {
    constructor() {
        this.currentUser = null;
    }

    init(user) {
        this.currentUser = user;
    }

    async loadHoySection() {
        this.updateSaludDate();
        this.renderSaludOptions();
        this.renderCicloDisplay();
        this.renderSuenoData();
        await this.loadTodayWellness();
        this.bindSaludEvents();
        await this.loadWellnessHistory();
    }

    updateSaludDate() {
        const fechaEl = document.getElementById('salud-fecha');
        const saludoEl = document.getElementById('salud-saludo');
        if (!fechaEl) return;

        const hoy = new Date();
        const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        fechaEl.textContent = `${diasSemana[hoy.getDay()]} ${hoy.getDate()} de ${meses[hoy.getMonth()]}`;

        if (saludoEl) {
            const hora = hoy.getHours();
            if (hora < 12) saludoEl.textContent = '🌅 Buenos días';
            else if (hora < 18) saludoEl.textContent = '🌤️ Buenas tardes';
            else saludoEl.textContent = '🌙 Buenas noches';
        }
    }

    getSaludOptions() {
        return {
            animo: [
                { valor: 'feliz', label: 'Feliz', icono: '😊' },
                { valor: 'bien', label: 'Bien', icono: '🙂' },
                { valor: 'neutral', label: 'Neutral', icono: '😐' },
                { valor: 'triste', label: 'Triste', icono: '😢' },
                { valor: 'ansiosa', label: 'Ansiosa', icono: '😰' },
                { valor: 'abrumada', label: 'Abrumada', icono: '😵' }
            ],
            energia: [
                { valor: 10, label: 'A tope', icono: '🔥' },
                { valor: 8, label: 'Activa', icono: '💪' },
                { valor: 6, label: 'Normal', icono: '🙂' },
                { valor: 4, label: 'Cansada', icono: '😌' },
                { valor: 2, label: 'Agotada', icono: '😴' },
                { valor: 0, label: 'Sin energía', icono: '💀' }
            ],
            sueno: [
                { valor: '0-3', label: '0-3h', icono: '😫' },
                { valor: '4-5', label: '4-5h', icono: '😴' },
                { valor: '6', label: '6h', icono: '😊' },
                { valor: '7-8', label: '7-8h', icono: '🌟' },
                { valor: '9-10', label: '9-10h', icono: '✨' },
                { valor: '10+', label: '10h+', icono: '😵' }
            ],
            ciclo: [
                { valor: 'menstruacion', label: 'Menstruación', icono: '🌸' },
                { valor: 'folicular', label: 'Folicular', icono: '🌱' },
                { valor: 'ovulacion', label: 'Ovulación', icono: '🌕' },
                { valor: 'lutea', label: 'Lútea', icono: '🌙' }
            ]
        };
    }

    // ===== CÁLCULO DEL CICLO MENSTRUAL =====
    getCicloData() {
        const fechaInicio = localStorage.getItem('ciclo_fecha_inicio');
        const duracionCiclo = parseInt(localStorage.getItem('ciclo_duracion') || '28');
        
        if (!fechaInicio) return null;
        
        const inicio = new Date(fechaInicio);
        const hoy = new Date();
        const diffTime = hoy - inicio;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        const diaDelCiclo = ((diffDays % duracionCiclo) + duracionCiclo) % duracionCiclo + 1;
        
        let fase = {};
        if (diaDelCiclo <= 5) {
            fase = { nombre: 'Menstruación', icono: '🩸', desc: 'Tu cuerpo se renueva', color: 'text-pink-500' };
        } else if (diaDelCiclo <= 13) {
            fase = { nombre: 'Fase Folicular', icono: '🌱', desc: 'Tu energía va en aumento', color: 'text-green-500' };
        } else if (diaDelCiclo <= 16) {
            fase = { nombre: 'Ovulación', icono: '🥚', desc: 'Día fértil - máxima energía', color: 'text-yellow-500' };
        } else {
            fase = { nombre: 'Fase Lútea', icono: '🌙', desc: 'Más introspectiva', color: 'text-indigo-500' };
        }
        
        const proximaMenstruacion = new Date(inicio);
        proximaMenstruacion.setDate(proximaMenstruacion.getDate() + duracionCiclo);
        
        const ovulacion = new Date(inicio);
        ovulacion.setDate(ovulacion.getDate() + 14);
        
        return {
            diaDelCiclo: Math.min(diaDelCiclo, duracionCiclo),
            duracionCiclo,
            fase,
            fechaInicio: inicio.toLocaleDateString('es-ES'),
            proximaMenstruacion: proximaMenstruacion.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
            ovulacion: ovulacion.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
            diasParaProxima: Math.ceil((proximaMenstruacion - hoy) / (1000 * 60 * 60 * 24))
        };
    }

    renderCicloDisplay() {
        const noConfigurado = document.getElementById('ciclo-no-configurado');
        const configurado = document.getElementById('ciclo-configurado');
        
        if (!noConfigurado || !configurado) return;
        
        const data = this.getCicloData();
        
        if (!data) {
            noConfigurado.classList.remove('hidden');
            configurado.classList.add('hidden');
            const inputFecha = document.getElementById('ciclo-fecha-inicio');
            if (inputFecha) {
                inputFecha.value = '';
                inputFecha.max = new Date().toISOString().split('T')[0];
            }
        } else {
            noConfigurado.classList.add('hidden');
            configurado.classList.remove('hidden');
            const progress = document.getElementById('ciclo-progress');
            if (progress) {
                progress.style.width = `${(data.diaDelCiclo / data.duracionCiclo) * 100}%`;
            }
            const diaActual = document.getElementById('ciclo-dia-actual');
            if (diaActual) diaActual.textContent = `Día ${data.diaDelCiclo} de ${data.duracionCiclo}`;
            const faseIcon = document.getElementById('ciclo-fase-icon');
            const faseNombre = document.getElementById('ciclo-fase-nombre');
            const faseDesc = document.getElementById('ciclo-fase-desc');
            if (faseIcon) faseIcon.textContent = data.fase.icono;
            if (faseNombre) {
                faseNombre.textContent = data.fase.nombre;
                faseNombre.className = `font-bold text-lg ${data.fase.color} mt-2`;
            }
            if (faseDesc) faseDesc.textContent = data.fase.desc;
            const proximaFecha = document.getElementById('ciclo-proxima-fecha');
            const ovulacionFecha = document.getElementById('ciclo-ovulacion-fecha');
            if (proximaFecha) proximaFecha.textContent = `${data.proximaMenstruacion} (${data.diasParaProxima} días)`;
            if (ovulacionFecha) ovulacionFecha.textContent = data.ovulacion;
        }
    }

    saveCicloFecha(fecha) {
        if (!fecha) return;
        localStorage.setItem('ciclo_fecha_inicio', fecha);
        this.renderCicloDisplay();
        ui.showNotification('¡Ciclo registrado! 💚', 'success');
    }

    // ===== REGISTRO DE SUEÑO =====
    calcularHorasSueno(dormir, despertar, interrupciones) {
        const [hDormir, mDormir] = dormir.split(':').map(Number);
        const [hDespertar, mDespertar] = despertar.split(':').map(Number);
        let minutosDormir = hDormir * 60 + mDormir;
        let minutosDespertar = hDespertar * 60 + mDespertar;
        if (minutosDespertar < minutosDormir) {
            minutosDespertar += 24 * 60;
        }
        let minutosTotales = minutosDespertar - minutosDormir;
        minutosTotales -= (interrupciones * 15);
        if (minutosTotales < 0) minutosTotales = 0;
        const horas = Math.floor(minutosTotales / 60);
        const minutos = minutosTotales % 60;
        return { horas, minutos, texto: `${horas}h ${minutos > 0 ? minutos + 'm' : ''}` };
    }

    generarSugerenciaSueno(horas, interrupciones, horaDormir, tieneSiesta = false) {
        const sugerencias = [];
        if (horas < 6) sugerencias.push('🛌 Tu cuerpo necesita más descanso. Intentá dormir al menos 7 horas.');
        else if (horas >= 7 && horas <= 9) sugerencias.push('✅ Tus horas de sueño están dentro del rango recomendado (7-9h).');
        else if (horas > 9) sugerencias.push('💤 Dormiste mucho, pero si aún sentís cansancio, la calidad puede estar afectada.');
        if (interrupciones >= 3) sugerencias.push('🌊 Varias interrupciones pueden afectar la calidad del sueño. ¿Hay algo que te despierta?');
        const horaNum = parseInt(horaDormir.split(':')[0]);
        if (horaNum >= 0 && horaNum < 3) sugerencias.push('🌙 Dormiste muy tarde. Esto puede afectar tu ritmo circadiano.');
        if (tieneSiesta) {
            sugerencias.push('😴 Tomaste siesta hoy. Si fue después de las 4pm, puede afectar tu sueño esta noche.');
            sugerencias.push('💡 Las siestas cortas (20-30 min) antes de las 3pm son las mejores para recuperar energía.');
        }
        if (horas < 7 || interrupciones >= 2) sugerencias.push('☕ Considerá una siesta de 20 min antes de las 3pm para recuperar energía.');
        return sugerencias[Math.floor(Math.random() * sugerencias.length)] || '';
    }

    actualizarCalculoSueno() {
        const dormir = document.getElementById('sueno-dormir')?.value || '23:00';
        const despertar = document.getElementById('sueno-despertar')?.value || '07:00';
        const interrupciones = parseInt(document.getElementById('sueno-interrupciones-valor')?.textContent || '0');
        const calculo = this.calcularHorasSueno(dormir, despertar, interrupciones);
        const tieneSiesta = document.getElementById('sueno-dia-check')?.checked;
        const diaDetalles = document.getElementById('sueno-dia-detalles');
        let horasSiesta = { horas: 0, minutos: 0, texto: '' };
        if (diaDetalles) {
            if (tieneSiesta) {
                diaDetalles.classList.remove('hidden');
                const desde = document.getElementById('sueno-dia-desde')?.value || '14:00';
                const hasta = document.getElementById('sueno-dia-hasta')?.value || '15:30';
                horasSiesta = this.calcularHorasSueno(desde, hasta, 0);
                const durationDisplay = document.getElementById('sueno-dia-duration');
                if (durationDisplay) durationDisplay.textContent = `⏱️ ${horasSiesta.texto}`;
            } else {
                diaDetalles.classList.add('hidden');
            }
        }
        const totalMinutos = (calculo.horas * 60 + calculo.minutos) + (horasSiesta.horas * 60 + horasSiesta.minutos);
        const totalHoras = Math.floor(totalMinutos / 60);
        const totalMinutosRest = totalMinutos % 60;
        const totalTexto = `${totalHoras}h ${totalMinutosRest > 0 ? totalMinutosRest + 'm' : ''}`;
        const horasTotal = document.getElementById('sueno-horas-total');
        const horasEfectivas = document.getElementById('sueno-horas-efectivas');
        if (horasTotal) horasTotal.textContent = totalTexto;
        if (horasEfectivas) {
            let efectivasTexto = `${calculo.horas}h ${calculo.minutos}m`;
            if (horasSiesta.horas > 0 || horasSiesta.minutos > 0) efectivasTexto += ` + ${horasSiesta.texto} (siesta)`;
            horasEfectivas.textContent = `(${efectivasTexto})`;
        }
        const sugerenciaContainer = document.getElementById('sueno-sugerencia');
        const sugerenciaTexto = document.getElementById('sueno-sugerencia-texto');
        if (sugerenciaContainer && sugerenciaTexto) {
            const sugerencia = this.generarSugerenciaSueno(calculo.horas, interrupciones, dormir, tieneSiesta);
            if (sugerencia) {
                sugerenciaContainer.classList.remove('hidden');
                sugerenciaTexto.textContent = sugerencia;
            } else {
                sugerenciaContainer.classList.add('hidden');
            }
        }
    }

    getSuenoData() {
        return {
            dormir: localStorage.getItem('sueno_dormir') || '23:00',
            despertar: localStorage.getItem('sueno_despertar') || '07:00',
            interrupciones: parseInt(localStorage.getItem('sueno_interrupciones') || '0'),
            tieneSiesta: localStorage.getItem('sueno_tiene_siesta') === 'true',
            siestaDesde: localStorage.getItem('sueno_siesta_desde') || '14:00',
            siestaHasta: localStorage.getItem('sueno_siesta_hasta') || '15:30'
        };
    }

    renderSuenoData() {
        const data = this.getSuenoData();
        const dormirInput = document.getElementById('sueno-dormir');
        const despertarInput = document.getElementById('sueno-despertar');
        const interrupcionesDisplay = document.getElementById('sueno-interrupciones-valor');
        const siestaCheck = document.getElementById('sueno-dia-check');
        const siestaDesde = document.getElementById('sueno-dia-desde');
        const siestaHasta = document.getElementById('sueno-dia-hasta');
        if (dormirInput) dormirInput.value = data.dormir;
        if (despertarInput) despertarInput.value = data.despertar;
        if (interrupcionesDisplay) interrupcionesDisplay.textContent = data.interrupciones;
        if (siestaCheck) siestaCheck.checked = data.tieneSiesta;
        if (siestaDesde) siestaDesde.value = data.siestaDesde;
        if (siestaHasta) siestaHasta.value = data.siestaHasta;
        this.actualizarCalculoSueno();
    }

    saveSuenoData() {
        const dormir = document.getElementById('sueno-dormir')?.value;
        const despertar = document.getElementById('sueno-despertar')?.value;
        const interrupciones = document.getElementById('sueno-interrupciones-valor')?.textContent;
        const tieneSiesta = document.getElementById('sueno-dia-check')?.checked;
        const siestaDesde = document.getElementById('sueno-dia-desde')?.value;
        const siestaHasta = document.getElementById('sueno-dia-hasta')?.value;
        if (dormir) localStorage.setItem('sueno_dormir', dormir);
        if (despertar) localStorage.setItem('sueno_despertar', despertar);
        if (interrupciones) localStorage.setItem('sueno_interrupciones', interrupciones);
        localStorage.setItem('sueno_tiene_siesta', tieneSiesta ? 'true' : 'false');
        if (siestaDesde) localStorage.setItem('sueno_siesta_desde', siestaDesde);
        if (siestaHasta) localStorage.setItem('sueno_siesta_hasta', siestaHasta);
        this.actualizarCalculoSueno();
    }

    renderSaludOptions() {
        const options = this.getSaludOptions();
        for (const [group, items] of Object.entries(options)) {
            const container = document.getElementById(`${group}-group`);
            if (!container) continue;
            container.innerHTML = items.map(item => `
                <button type="button"
                        class="salud-radio flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border-2 border-border-soft text-center hover:border-brand hover:bg-brand/5 transition-all cursor-pointer active:scale-95"
                        data-group="${group}"
                        data-value="${item.valor}"
                        aria-pressed="false">
                    <span class="text-3xl">${item.icono}</span>
                    <span class="text-xs font-bold text-gray-600">${item.label}</span>
                </button>
            `).join('');
        }
    }

    async saveWellness(wellnessData) {
        const fecha = new Date().toISOString().split('T')[0];
        if (!this.currentUser) {
            const local = JSON.parse(localStorage.getItem('wellness_local') || '[]');
            const idx = local.findIndex(w => w.fecha === fecha);
            const entry = { ...wellnessData, fecha, updatedAt: new Date().toISOString() };
            if (idx >= 0) local[idx] = entry;
            else local.push(entry);
            localStorage.setItem('wellness_local', JSON.stringify(local));
            ui.showNotification('Registro guardado 💚', 'success');
            return;
        }
        const existing = await this.getTodayWellness();
        try {
            if (existing) {
                await data.updateItem(existing.id, {
                    meta: { ...existing.meta, ...wellnessData, fecha }
                });
            } else {
                await data.createItem({
                    content: `Bitácora - ${fecha}`,
                    type: 'checkin',
                    tags: ['salud', 'bienestar'],
                    meta: { ...wellnessData, fecha }
                });
            }
            ui.showNotification('Registro guardado 💚', 'success');
        } catch (error) {
            console.error('Error saving wellness:', error);
            ui.showNotification('Error al guardar', 'error');
        }
    }

    async getTodayWellness() {
        const fecha = new Date().toISOString().split('T')[0];
        if (!this.currentUser) {
            const local = JSON.parse(localStorage.getItem('wellness_local') || '[]');
            return local.find(w => w.fecha === fecha) || null;
        }
        try {
            const items = await data.getItems({ type: 'checkin' });
            return items.find(item =>
                item.meta?.fecha === fecha &&
                item.tags?.includes('bienestar')
            ) || null;
        } catch (error) {
            console.error('Error getTodayWellness:', error);
            return null;
        }
    }

    async loadWellnessHistory(days = 7) {
        const container = document.getElementById('wellness-history');
        if (!container) return;
        let records = [];
        if (!this.currentUser) records = JSON.parse(localStorage.getItem('wellness_local') || '[]');
        else {
            try {
                const items = await data.getItems({ type: 'checkin' });
                records = items.filter(item => item.tags?.includes('bienestar'));
            } catch (error) {
                console.error('Error loading wellness history:', error);
            }
        }
        if (records.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-400 py-4">Aún no hay registros</p>';
            return;
        }
        records.sort((a, b) => new Date(b.fecha || b.created_at) - new Date(a.fecha || a.created_at));
        const animoIconos = { feliz: '😊', bien: '🙂', neutral: '😐', triste: '😢', ansiosa: '😰', abrumada: '😵' };
        const energiaIconos = { 10: '🔥', 8: '💪', 6: '🙂', 4: '😌', 2: '😴', 0: '💀' };
        container.innerHTML = records.slice(0, 7).map(r => {
            const meta = r.meta || r;
            const date = new Date(meta.fecha || r.created_at);
            const dateStr = date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
            return `
                <div class="flex items-center gap-2 p-3 rounded-xl bg-white border border-border-soft">
                    <span class="text-xs text-gray-400 w-16">${dateStr}</span>
                    <span title="Ánimo">${animoIconos[meta.animo] || '❓'}</span>
                    <span title="Energía">${energiaIconos[meta.energia] || '❓'}</span>
                    <span title="Sueño: ${meta.sueno}" class="text-sm">😴 ${meta.sueno}</span>
                    <span title="Ciclo" class="ml-auto text-sm">${meta.ciclo ? '🌸' : ''}</span>
                </div>
            `;
        }).join('');
    }

    async loadTodayWellness() {
        const today = await this.getTodayWellness();
        if (!today) return;
        const meta = today.meta || today;
        if (meta.animo) {
            const btn = document.querySelector(`.salud-radio[data-group="animo"][data-value="${meta.animo}"]`);
            if (btn) btn.click();
        }
        if (meta.energia !== undefined && meta.energia !== null) {
            const btn = document.querySelector(`.salud-radio[data-group="energia"][data-value="${meta.energia}"]`);
            if (btn) btn.click();
        }
        if (meta.sueno) {
            const btn = document.querySelector(`.salud-radio[data-group="sueno"][data-value="${meta.sueno}"]`);
            if (btn) btn.click();
        }
        if (meta.ciclo) {
            const btn = document.querySelector(`.salud-radio[data-group="ciclo"][data-value="${meta.ciclo}"]`);
            if (btn) btn.click();
        }
    }

    bindSaludEvents() {
        const animoSlider = document.getElementById('animo-slider');
        const animoIcon = document.getElementById('animo-icon');
        const animoValue = document.getElementById('animo-value');
        const animoLabel = document.getElementById('animo-label');
        const animoEmojis = { 1: '😢', 2: '😔', 3: '😕', 4: '😟', 5: '😐', 6: '🙂', 7: '😊', 8: '😄', 9: '😁', 10: '🤩' };
        const animoLabels = { 1: 'Muy triste', 2: 'Triste', 3: 'Algo triste', 4: 'Bajón', 5: 'Normal', 6: 'Bien', 7: 'Contenta', 8: 'Feliz', 9: 'Muy feliz', 10: 'Excelente' };
        if (animoSlider) {
            animoSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                if (animoIcon) animoIcon.textContent = animoEmojis[val];
                if (animoValue) animoValue.textContent = animoEmojis[val];
                if (animoLabel) animoLabel.textContent = animoLabels[val];
            });
        }
        const energiaSlider = document.getElementById('energia-slider');
        const energiaIcon = document.getElementById('energia-icon');
        const energiaValue = document.getElementById('energia-value');
        const energiaLabel = document.getElementById('energia-label');
        const energiaEmojis = { 1: '💀', 2: '😴', 3: '😪', 4: '😌', 5: '😐', 6: '🙂', 7: '💪', 8: '⚡', 9: '🔥', 10: '🚀' };
        const energiaLabels = { 1: 'Sin energía', 2: 'Agotada', 3: 'Muy cansada', 4: 'Cansada', 5: 'Normal', 6: 'Bien', 7: 'Activa', 8: 'Energética', 9: 'A tope', 10: 'Explosiva' };
        if (energiaSlider) {
            energiaSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                if (energiaIcon) energiaIcon.textContent = energiaEmojis[val];
                if (energiaValue) energiaValue.textContent = energiaEmojis[val];
                if (energiaLabel) energiaLabel.textContent = energiaLabels[val];
            });
        }
        const btnGuardarCiclo = document.getElementById('btn-guardar-ciclo');
        const inputFechaCiclo = document.getElementById('ciclo-fecha-inicio');
        if (btnGuardarCiclo && inputFechaCiclo) {
            btnGuardarCiclo.addEventListener('click', () => {
                const fecha = inputFechaCiclo.value;
                if (!fecha) { ui.showNotification('Seleccioná una fecha', 'warning'); return; }
                this.saveCicloFecha(fecha);
            });
            inputFechaCiclo.addEventListener('keypress', (e) => { if (e.key === 'Enter') btnGuardarCiclo.click(); });
        }
        const btnActualizarCiclo = document.getElementById('btn-actualizar-ciclo');
        if (btnActualizarCiclo) {
            btnActualizarCiclo.addEventListener('click', () => {
                document.getElementById('ciclo-no-configurado').classList.remove('hidden');
                document.getElementById('ciclo-configurado').classList.add('hidden');
            });
        }
        this.renderSuenoData();
        const dormirInput = document.getElementById('sueno-dormir');
        const despertarInput = document.getElementById('sueno-despertar');
        if (dormirInput) dormirInput.addEventListener('change', () => this.actualizarCalculoSueno());
        if (despertarInput) despertarInput.addEventListener('change', () => this.actualizarCalculoSueno());
        const btnMenos = document.getElementById('sueno-interrupciones-menos');
        const btnMas = document.getElementById('sueno-interrupciones-mas');
        const interrupcionesDisplay = document.getElementById('sueno-interrupciones-valor');
        if (btnMenos && interrupcionesDisplay) {
            btnMenos.addEventListener('click', () => {
                let val = parseInt(interrupcionesDisplay.textContent);
                if (val > 0) { interrupcionesDisplay.textContent = val - 1; this.actualizarCalculoSueno(); }
            });
        }
        if (btnMas && interrupcionesDisplay) {
            btnMas.addEventListener('click', () => {
                let val = parseInt(interrupcionesDisplay.textContent);
                if (val < 20) { interrupcionesDisplay.textContent = val + 1; this.actualizarCalculoSueno(); }
            });
        }
        const siestaCheck = document.getElementById('sueno-dia-check');
        if (siestaCheck) siestaCheck.addEventListener('change', () => this.actualizarCalculoSueno());
        document.querySelectorAll('.salud-radio').forEach(btn => {
            btn.addEventListener('click', () => {
                const group = btn.dataset.group;
                document.querySelectorAll(`.salud-radio[data-group="${group}"]`).forEach(b => {
                    b.classList.remove('border-brand', 'bg-brand/10');
                    b.classList.add('border-border-soft');
                    b.setAttribute('aria-pressed', 'false');
                });
                btn.classList.remove('border-border-soft');
                btn.classList.add('border-brand', 'bg-brand/10');
                btn.setAttribute('aria-pressed', 'true');
            });
        });
        const saveBtn = document.getElementById('btn-save-wellness');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                const animoSlider = document.getElementById('animo-slider');
                const energiaSlider = document.getElementById('energia-slider');
                const animo = animoSlider ? parseInt(animoSlider.value) : 5;
                const energia = energiaSlider ? parseInt(energiaSlider.value) : 5;
                const suenoDormir = document.getElementById('sueno-dormir')?.value;
                const suenoDespertar = document.getElementById('sueno-despertar')?.value;
                const suenoInterrupciones = parseInt(document.getElementById('sueno-interrupciones-valor')?.textContent || '0');
                const tieneSiesta = document.getElementById('sueno-dia-check')?.checked;
                const siestaDesde = document.getElementById('sueno-dia-desde')?.value;
                const siestaHasta = document.getElementById('sueno-dia-hasta')?.value;
                const calculoSueno = this.calcularHorasSueno(suenoDormir, suenoDespertar, suenoInterrupciones);
                let calculoSiesta = { horas: 0, minutos: 0, texto: '' };
                if (tieneSiesta && siestaDesde && siestaHasta) calculoSiesta = this.calcularHorasSueno(siestaDesde, siestaHasta, 0);
                const totalMinutos = (calculoSueno.horas * 60 + calculoSueno.minutos) + (calculoSiesta.horas * 60 + calculoSiesta.minutos);
                const totalHoras = Math.floor(totalMinutos / 60);
                const totalMinutosRest = totalMinutos % 60;
                const totalSuenoTexto = `${totalHoras}h ${totalMinutosRest > 0 ? totalMinutosRest + 'm' : ''}`;
                this.saveSuenoData();
                const ciclo = document.querySelector('.salud-radio[data-group="ciclo"][aria-pressed="true"]');
                saveBtn.disabled = true;
                saveBtn.textContent = 'Guardando...';
                await this.saveWellness({
                    animo: animo,
                    energia: energia,
                    sueno_dormir: suenoDormir,
                    sueno_despertar: suenoDespertar,
                    sueno_interrupciones: suenoInterrupciones,
                    sueno_horas: totalSuenoTexto,
                    sueno_tiene_siesta: tieneSiesta,
                    sueno_siesta_desde: tieneSiesta ? siestaDesde : null,
                    sueno_siesta_hasta: tieneSiesta ? siestaHasta : null,
                    ciclo: ciclo ? ciclo.dataset.value : null
                });
                saveBtn.disabled = false;
                saveBtn.innerHTML = '💚 Guardar registro';
                await this.loadWellnessHistory();
            });
        }
    }

    // =====================================
    // SECCIÓN: CHECK-INS DE BIENESTAR
    // =====================================

    getCheckinConfig() {
        return {
            momentos: [
                { id: 'mañana', label: 'Mañana', hora: 10, icono: '🌅', pregunta: '¿Cómo amaneciste?' },
                { id: 'tarde', label: 'Tarde', hora: 15, icono: '🌞', pregunta: '¿Cómo va tu día?' },
                { id: 'noche', label: 'Noche', hora: 21, icono: '🌙', pregunta: '¿Cómo te sientes?' }
            ],
            opcionesEnergia: [
                { valor: 10, label: 'A tope', icono: '🔥' }, { valor: 9, label: 'Explosiva', icono: '⚡' },
                { valor: 8, label: 'Activa', icono: '💪' }, { valor: 7, label: 'Bien', icono: '🙂' },
                { valor: 6, label: 'Normal', icono: '😐' }, { valor: 5, label: 'Regular', icono: '😌' },
                { valor: 4, label: 'Cansada', icono: '😔' }, { valor: 3, label: 'Agotada', icono: '😴' },
                { valor: 2, label: 'Sin ganas', icono: '😞' }, { valor: 1, label: 'Sin energía', icono: '💀' },
                { valor: 0, label: 'Ausente', icono: '⬛' }
            ],
            opcionesEmocion: [
                { valor: 'feliz', label: 'Feliz', icono: '😊' }, { valor: 'contenta', label: 'Contenta', icono: '😄' },
                { valor: 'bien', label: 'Bien', icono: '🙂' }, { valor: 'tranquila', label: 'Tranquila', icono: '😌' },
                { valor: 'neutral', label: 'Neutral', icono: '😐' }, { valor: 'ansiosa', label: 'Ansiosa', icono: '😰' },
                { valor: 'triste', label: 'Triste', icono: '😢' }, { valor: 'molesta', label: 'Molesta', icono: '😠' },
                { valor: 'frustrada', label: 'Frustrada', icono: '😤' }, { valor: 'abrumada', label: 'Abrumada', icono: '😵' }
            ]
        };
    }

    async initCheckinSystem() {
        try {
            await this.requestNotificationPermission();
            try {
                const { refreshFCMTokenIfNeeded, onForegroundMessage } = await import('./firebase.js');
                await refreshFCMTokenIfNeeded();
                await onForegroundMessage();
            } catch (fcmError) {
                console.warn('FCM no disponible:', fcmError);
            }
            this.checkPendingCheckin();
            this.startCheckinChecker();
        } catch (error) {
            console.error('Error initCheckinSystem:', error);
        }
    }

    async requestNotificationPermission() {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'granted' || Notification.permission === 'denied') return;
        await Notification.requestPermission();
    }

    getCurrentMoment() {
        const hora = new Date().getHours();
        if (hora >= 5 && hora < 12) return 'mañana';
        if (hora >= 12 && hora < 18) return 'tarde';
        return 'noche';
    }

    getCheckinId(momento, fecha) {
        const fechaStr = fecha || new Date().toISOString().split('T')[0];
        return `checkin_${momento}_${fechaStr}`;
    }

    async checkPendingCheckin() {
        if (!this.currentUser) return;
        const momento = this.getCurrentMoment();
        const checkinId = this.getCheckinId(momento);
        try {
            const items = await data.getItems({ type: 'checkin' });
            const yaRespondio = items.some(item => item.meta?.checkin_id === checkinId);
            ui.toggleCheckinButton(!yaRespondio, momento);
            if (!yaRespondio) this.scheduleCheckinNotification(momento);
        } catch (error) {
            console.error('Error checkPendingCheckin:', error);
        }
    }

    renderCheckinButton() {
        ui.renderCheckinButton(this.getCheckinConfig().momentos);
    }

    async showCheckinModal(momento = null) {
        const momentoActual = momento || this.getCurrentMoment();
        const momentoConfig = this.getCheckinConfig().momentos.find(m => m.id === momentoActual);
        ui.showCheckinModal({
            momento: momentoConfig,
            energia: this.getCheckinConfig().opcionesEnergia,
            emocion: this.getCheckinConfig().opcionesEmocion,
            timestamp: new Date().toISOString()
        });
    }

    async saveCheckin(momento, energia, emocion, hora = null) {
        const fecha = new Date().toISOString().split('T')[0];
        const checkinId = this.getCheckinId(momento, fecha);
        const momentoConfig = this.getCheckinConfig().momentos.find(m => m.id === momento);
        const momentoLabel = momentoConfig ? momentoConfig.label : momento;
        let horaDespertar = (momento === 'mañana') ? hora : null;
        let horaDormir = (momento === 'noche') ? hora : null;

        const itemData = {
            content: `Check-in ${momentoLabel} - ${fecha}`,
            type: 'checkin',
            tags: ['salud', 'emocion', momento],
            meta: {
                energia: parseInt(energia), emocion, momento, checkin_id: checkinId,
                horaDespertar, horaDormir, timestamp: new Date().toISOString()
            }
        };

        if (!this.currentUser) {
            const localCheckins = JSON.parse(localStorage.getItem('checkins_local') || '[]');
            localCheckins.push(itemData);
            localStorage.setItem('checkins_local', JSON.stringify(localCheckins));
            ui.showNotification('Check-in guardado localmente', 'success');
            return true;
        }

        try {
            await data.createItem(itemData);
            ui.showNotification('¡Check-in guardado! 💚', 'success');
            ui.toggleCheckinButton(false);
            return true;
        } catch (error) {
            console.error('Error saveCheckin:', error);
            ui.showNotification('Error al guardar check-in.', 'error');
            return false;
        }
    }

    async getCheckinHistory(dias = 7) {
        try {
            const items = await data.getItems({ type: 'checkin' });
            const limite = new Date();
            limite.setDate(limite.getDate() - dias);
            return items.filter(item => 
                new Date(item.created_at) >= limite &&
                item.meta?.energia !== undefined
            );
        } catch (error) {
            console.error('Error getCheckinHistory:', error);
            return [];
        }
    }

    calculateCheckinTrend(checkins) {
        if (!checkins || checkins.length === 0) return { energia: [], emocion: [] };
        const grouped = { energia: {}, emocion: {} };
        checkins.forEach(checkin => {
            const momento = checkin.meta?.momento;
            if (!momento) return;
            if (!grouped.energia[momento]) grouped.energia[momento] = { suma: 0, count: 0 };
            grouped.energia[momento].suma += parseInt(checkin.meta.energia) || 0;
            grouped.energia[momento].count++;
            if (checkin.meta?.emocion) {
                if (!grouped.emocion[momento]) grouped.emocion[momento] = {};
                const emo = checkin.meta.emocion;
                grouped.emocion[momento][emo] = (grouped.emocion[momento][emo] || 0) + 1;
            }
        });
        const energiaTrend = Object.entries(grouped.energia).map(([momento, data]) => ({
            momento, promedio: Math.round((data.suma / data.count) * 10) / 10, count: data.count
        }));
        const emocionTrend = Object.entries(grouped.emocion).map(([momento, emociones]) => ({
            momento, dominante: Object.entries(emociones).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral'
        }));
        return { energia: energiaTrend, emocion: emocionTrend };
    }

    scheduleCheckinNotification(momento) {
        const momentoConfig = this.getCheckinConfig().momentos.find(m => m.id === momento);
        if (!momentoConfig) return;
        const ahora = new Date();
        let horaNotificacion = new Date(ahora);
        horaNotificacion.setHours(momentoConfig.hora, 0, 0, 0);
        if (horaNotificacion <= ahora) horaNotificacion.setDate(horaNotificacion.getDate() + 1);
        setTimeout(() => this.showCheckinNotification(momento), horaNotificacion - ahora);
    }

    showCheckinNotification(momento) {
        const momentoConfig = this.getCheckinConfig().momentos.find(m => m.id === momento);
        if (!momentoConfig || Notification.permission !== 'granted') return;
        const title = '💭 Check-in de Bienestar';
        const options = {
            body: momentoConfig.pregunta,
            icon: './src/assets/icon-192.png',
            badge: './src/assets/icon-192.png',
            tag: 'checkin',
            requireInteraction: true,
            data: { action: 'checkin', momento: momento }
        };
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(reg => reg.showNotification(title, options));
        } else {
            const n = new Notification(title, options);
            n.onclick = () => { window.focus(); this.showCheckinModal(momento); n.close(); };
        }
        this.scheduleCheckinNotification(momento);
    }

    startCheckinChecker() {
        setInterval(() => this.checkPendingCheckin(), 60000);
    }
}

export const salud = new SaludController();
