import { data } from './data.js';
import { ui } from './ui.js';
import { utils } from './utils.js';

/**
 * Módulo de Gatos para KAI
 * Encapsula la lógica de perfiles de gatos, bitácora de insumos y salud veterinaria.
 */
class GatosController {
    constructor() {
        this.currentUser = null;
        this.gatos = [];
        this.eventos = [];
        this.selectedCatId = localStorage.getItem('gatos_selected_id') || null;
    }

    /**
     * Inicializa el controlador de gatos
     */
    init(user) {
        this.currentUser = user;
        this.bindEvents();
    }

    /**
     * Carga todos los datos relacionados con gatos y renderiza la sección
     */
    async loadGatosSection() {
        try {
            if (!this.currentUser) return;

            // Obtener todos los items del usuario
            const items = await data.getItems({});
            
            // Filtrar perfiles de gatos (tipo nota con tag 'gato' y meta.tipo 'gato_perfil')
            this.gatos = items.filter(item => 
                item.tags && 
                item.tags.includes('gato') && 
                item.meta && 
                item.meta.tipo === 'gato_perfil'
            );

            // Filtrar eventos de salud o insumos (con tag 'gato_salud' o 'gato_insumo')
            this.eventos = items.filter(item => 
                item.tags && 
                (item.tags.includes('gato_salud') || item.tags.includes('gato_insumo'))
            );

            // Si hay gatos pero no hay seleccionado (o el seleccionado ya no existe), elegir el primero
            if (this.gatos.length > 0) {
                const existeSeleccionado = this.gatos.some(g => g.id === this.selectedCatId);
                if (!existeSeleccionado) {
                    this.selectedCatId = this.gatos[0].id;
                    localStorage.setItem('gatos_selected_id', this.selectedCatId);
                }
            } else {
                this.selectedCatId = null;
            }

            this.renderGatosUI();
        } catch (error) {
            console.error('Error al cargar la sección de gatos:', error);
            ui.showNotification('Error al cargar datos de gatos', 'error');
        }
    }

    /**
     * Renderiza la UI principal de la sección de gatos
     */
    renderGatosUI() {
        this.renderAvatars();
        this.renderActiveCatDetails();
        this.renderInsumosUI();
        this.renderSaludUI();
    }

    /**
     * Renderiza la lista horizontal de avatars de gatos
     */
    renderAvatars() {
        const container = document.getElementById('gatos-avatars-container');
        if (!container) return;

        let html = '';
        
        // Botones de cada gato
        this.gatos.forEach(gato => {
            const isSelected = gato.id === this.selectedCatId;
            const borderClass = isSelected 
                ? 'border-4 border-brand bg-brand/10 scale-105 shadow-md' 
                : 'border-2 border-gray-200 hover:border-brand/40 bg-white';
            
            html += `
                <button class="flex flex-col items-center gap-1 p-2 rounded-2xl transition duration-200 min-w-[70px] ${borderClass}" data-id="${gato.id}">
                    <span class="text-3xl">${gato.meta.emoji || '🐱'}</span>
                    <span class="text-xs font-bold truncate max-w-[64px] text-gray-700">${gato.content}</span>
                </button>
            `;
        });

        // Botón para agregar nuevo gato
        html += `
            <button id="btn-gatos-agregar" class="flex flex-col items-center justify-center gap-1 p-2 rounded-2xl border-2 border-dashed border-gray-300 hover:border-brand text-gray-400 hover:text-brand transition duration-200 min-w-[70px] bg-white/50">
                <span class="text-3xl"><i class="fa-solid fa-plus-circle text-2xl"></i></span>
                <span class="text-[10px] font-bold">Agregar</span>
            </button>
        `;

        container.innerHTML = html;

        // Bindeamos los eventos de selección
        container.querySelectorAll('button[data-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectedCatId = btn.dataset.id;
                localStorage.setItem('gatos_selected_id', this.selectedCatId);
                this.renderGatosUI();
            });
        });

        // Bindear botón agregar
        document.getElementById('btn-gatos-agregar')?.addEventListener('click', () => {
            this.showGatoModal();
        });
    }

    /**
     * Renderiza los detalles del gato seleccionado
     */
    renderActiveCatDetails() {
        const container = document.getElementById('gatos-active-details');
        if (!container) return;

        if (!this.selectedCatId) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <span class="text-5xl block mb-2">🐾</span>
                    <p class="text-sm font-semibold">No tienes ningún gatito registrado aún.</p>
                    <p class="text-xs text-gray-400">Presiona "Agregar" arriba para registrar tu primer minino.</p>
                </div>
            `;
            return;
        }

        const gato = this.gatos.find(g => g.id === this.selectedCatId);
        if (!gato) return;

        const edadStr = this.calcularEdad(gato.meta.nacimiento, gato.meta.fallecimiento);
        
        let fechasHtml = '';
        if (gato.meta.nacimiento) {
            fechasHtml += `
                <div class="flex items-center gap-2 text-xs text-gray-600">
                    <span class="w-5 text-center">🎂</span>
                    <span>Nació: <strong>${this.formatFechaLegible(gato.meta.nacimiento)}</strong></span>
                </div>
            `;
        }
        if (gato.meta.rescate) {
            fechasHtml += `
                <div class="flex items-center gap-2 text-xs text-gray-600 mt-1">
                    <span class="w-5 text-center">🏠</span>
                    <span>Rescatado: <strong>${this.formatFechaLegible(gato.meta.rescate)}</strong></span>
                </div>
            `;
        }
        if (gato.meta.fallecimiento) {
            fechasHtml += `
                <div class="flex items-center gap-2 text-xs text-red-600 mt-1">
                    <span class="w-5 text-center">🌈</span>
                    <span>Falleció: <strong>${this.formatFechaLegible(gato.meta.fallecimiento)}</strong></span>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="flex items-start gap-4">
                <div class="text-5xl p-3 bg-brand/5 rounded-2xl border border-brand/10 shadow-inner select-none">
                    ${gato.meta.emoji || '🐱'}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-2">
                        <h3 class="text-xl font-bold text-gray-800 truncate">${gato.content}</h3>
                        <button id="btn-gatos-editar-activo" class="text-gray-400 hover:text-brand p-1 transition" title="Editar gato">
                            <i class="fa-solid fa-pen text-sm"></i>
                        </button>
                    </div>
                    <p class="text-sm font-semibold text-brand/80 mt-0.5">
                        ${gato.meta.fallecimiento ? 'En el arcoíris 🌈 (Edad: ' + edadStr + ')' : 'Edad: ' + edadStr}
                    </p>
                    <div class="mt-2 border-t border-gray-100 pt-2">
                        ${fechasHtml}
                    </div>
                    ${gato.descripcion ? `<p class="text-xs text-gray-500 italic mt-2 bg-gray-50 p-2 rounded-lg border border-gray-100">${gato.descripcion}</p>` : ''}
                </div>
            </div>
        `;

        // Bindear editar
        document.getElementById('btn-gatos-editar-activo')?.addEventListener('click', () => {
            this.showGatoModal(gato);
        });
    }

    /**
     * Renderiza la UI de control de insumos (comida/arena)
     */
    renderInsumosUI() {
        const container = document.getElementById('gatos-insumos-container');
        if (!container) return;

        if (!this.selectedCatId) {
            container.innerHTML = `<p class="text-xs text-center text-gray-400 py-4">Registra un gato para ver insumos.</p>`;
            return;
        }

        // Buscar últimos eventos de insumos para este gato (o globales del usuario si no tuvieran cat_id, pero se registran por gato)
        const eventosInsumos = this.eventos.filter(e => 
            e.tags.includes('gato_insumo') && 
            e.meta && 
            e.meta.cat_id === this.selectedCatId
        );

        // Encontrar últimos eventos
        const ultimaCompraComida = eventosInsumos.find(e => e.meta.subtipo === 'compra_comida');
        const ultimoConsumoComida = eventosInsumos.find(e => e.meta.subtipo === 'consumo_comida');
        
        const ultimaCompraArena = eventosInsumos.find(e => e.meta.subtipo === 'compra_arena');
        const ultimoConsumoArena = eventosInsumos.find(e => e.meta.subtipo === 'consumo_arena');

        const formatLastEvent = (event) => {
            if (!event) return '<span class="text-gray-400 italic">Sin registro</span>';
            const dias = this.calcularDiasTranscurridos(event.meta.fecha);
            const anotacion = event.descripcion ? ` - <span class="italic text-gray-500">"${event.descripcion}"</span>` : '';
            if (dias === 0) return `<strong class="text-green-600">Hoy</strong>${anotacion}`;
            if (dias === 1) return `<strong class="text-gray-700">Ayer</strong>${anotacion}`;
            return `<strong class="text-gray-700">Hace ${dias} días</strong> (${this.formatFechaLegible(event.meta.fecha)})${anotacion}`;
        };

        container.innerHTML = `
            <div class="space-y-4">
                <!-- COMIDA -->
                <div class="bg-amber-50/50 border border-amber-100 rounded-2xl p-3 space-y-2 relative overflow-hidden">
                    <div class="flex items-center justify-between">
                        <h4 class="font-bold text-gray-800 flex items-center gap-1.5">
                            <span>🍗</span> Comida de Gato
                        </h4>
                    </div>
                    <div class="space-y-1 text-xs">
                        <div>🛍️ Última compra: ${formatLastEvent(ultimaCompraComida)}</div>
                        <div>🍽️ Consumo iniciado: ${formatLastEvent(ultimoConsumoComida)}</div>
                    </div>
                    <div class="flex gap-2 pt-1">
                        <button class="btn-comida-compra flex-1 py-1 px-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1">
                            <i class="fa-solid fa-cart-shopping"></i> Compré Saco
                        </button>
                        <button class="btn-comida-consumo flex-1 py-1 px-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1">
                            <i class="fa-solid fa-utensils"></i> Empecé Consumo
                        </button>
                    </div>
                </div>

                <!-- ARENA -->
                <div class="bg-blue-50/50 border border-blue-100 rounded-2xl p-3 space-y-2 relative overflow-hidden">
                    <div class="flex items-center justify-between">
                        <h4 class="font-bold text-gray-800 flex items-center gap-1.5">
                            <span>🚽</span> Arena Sanitaria
                        </h4>
                    </div>
                    <div class="space-y-1 text-xs">
                        <div>🛍️ Última compra: ${formatLastEvent(ultimaCompraArena)}</div>
                        <div>🧹 Consumo iniciado: ${formatLastEvent(ultimoConsumoArena)}</div>
                    </div>
                    <div class="flex gap-2 pt-1">
                        <button class="btn-arena-compra flex-1 py-1 px-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1">
                            <i class="fa-solid fa-cart-shopping"></i> Compré Bolsa
                        </button>
                        <button class="btn-arena-consumo flex-1 py-1 px-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1">
                            <i class="fa-solid fa-box-open"></i> Empecé Consumo
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Bindear eventos rápidos de insumos
        container.querySelector('.btn-comida-compra').addEventListener('click', () => {
            this.showEventModal('insumos', 'compra_comida', 'Compró saco de comida 🍗');
        });
        container.querySelector('.btn-comida-consumo').addEventListener('click', () => {
            this.showEventModal('insumos', 'consumo_comida', 'Empezó saco de comida 🍗');
        });
        container.querySelector('.btn-arena-compra').addEventListener('click', () => {
            this.showEventModal('insumos', 'compra_arena', 'Compró bolsa de arena 🚽');
        });
        container.querySelector('.btn-arena-consumo').addEventListener('click', () => {
            this.showEventModal('insumos', 'consumo_arena', 'Empezó bolsa de arena 🚽');
        });
    }

    /**
     * Renderiza el historial veterinario / salud del gato
     */
    renderSaludUI() {
        const container = document.getElementById('gatos-salud-container');
        if (!container) return;

        if (!this.selectedCatId) {
            container.innerHTML = `<p class="text-xs text-center text-gray-400 py-4">Registra un gato para ver historial médico.</p>`;
            return;
        }

        // Filtrar eventos de salud para este gato
        const eventosSalud = this.eventos
            .filter(e => e.tags.includes('gato_salud') && e.meta && e.meta.cat_id === this.selectedCatId)
            .sort((a, b) => new Date(b.meta.fecha) - new Date(a.meta.fecha)); // Orden desc de fecha

        let html = `
            <div class="space-y-4">
                <!-- Accesos rápidos de salud -->
                <div class="grid grid-cols-2 gap-2">
                    <button class="btn-salud-vet p-2 bg-pink-50 hover:bg-pink-100 border border-pink-100 text-pink-700 text-xs font-bold rounded-xl transition flex items-center gap-2">
                        <span>🏥</span> Vet / Consulta
                    </button>
                    <button class="btn-salud-desparasitar p-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 text-xs font-bold rounded-xl transition flex items-center gap-2">
                        <span>🪱</span> Desparasitar
                    </button>
                    <button class="btn-salud-pipeta p-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition flex items-center gap-2">
                        <span>💧</span> Pipeta Antipulgas
                    </button>
                    <button class="btn-salud-nota p-2 bg-purple-50 hover:bg-purple-100 border border-purple-100 text-purple-700 text-xs font-bold rounded-xl transition flex items-center gap-2">
                        <span>📝</span> Nota Médica
                    </button>
                </div>

                <!-- Bitácora -->
                <div class="border-t border-gray-100 pt-3">
                    <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Bitácora de Salud</h4>
                    
                    ${eventosSalud.length === 0 ? `
                        <p class="text-xs text-center text-gray-400 italic py-4">No hay eventos registrados. Usa los botones superiores para registrar dosis, vacunas o visitas.</p>
                    ` : `
                        <div class="relative pl-4 border-l border-gray-100 space-y-3">
                            ${eventosSalud.map(e => {
                                let icon = '📝';
                                let bgClass = 'bg-gray-100';
                                switch(e.meta.subtipo) {
                                    case 'vet': icon = '🏥'; bgClass = 'bg-pink-100'; break;
                                    case 'desparasitacion_interna': icon = '🪱'; bgClass = 'bg-emerald-100'; break;
                                    case 'pipeta': icon = '💧'; bgClass = 'bg-indigo-100'; break;
                                }
                                
                                return `
                                    <div class="relative group" data-event-id="${e.id}">
                                        <!-- Viñeta circular -->
                                        <div class="absolute -left-[25px] top-0.5 w-[18px] h-[18px] rounded-full ${bgClass} border-2 border-white flex items-center justify-center text-[10px] shadow-sm select-none">
                                            ${icon}
                                        </div>
                                        <div class="flex items-start justify-between gap-2">
                                            <div>
                                                <span class="text-[10px] font-bold text-gray-400 block">${this.formatFechaLegible(e.meta.fecha)}</span>
                                                <strong class="text-xs text-gray-700 font-semibold block">${e.content}</strong>
                                                ${e.descripcion ? `<p class="text-xs text-gray-600 mt-0.5">${e.descripcion}</p>` : ''}
                                            </div>
                                            <button class="btn-gatos-eliminar-evento text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1 transition self-start" data-id="${e.id}" title="Eliminar registro">
                                                <i class="fa-solid fa-trash text-[10px]"></i>
                                            </button>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Bindear clicks de salud rápidos
        container.querySelector('.btn-salud-vet').addEventListener('click', () => {
            this.showEventModal('salud', 'vet', 'Visita al veterinario 🏥');
        });
        container.querySelector('.btn-salud-desparasitar').addEventListener('click', () => {
            this.showEventModal('salud', 'desparasitacion_interna', 'Desparasitación Interna 🪱');
        });
        container.querySelector('.btn-salud-pipeta').addEventListener('click', () => {
            this.showEventModal('salud', 'pipeta', 'Aplicación de pipeta antipulgas 💧');
        });
        container.querySelector('.btn-salud-nota').addEventListener('click', () => {
            this.showEventModal('salud', 'nota', 'Nota médica de salud 📝');
        });

        // Bindear eliminar evento
        container.querySelectorAll('.btn-gatos-eliminar-evento').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm('¿Estás seguro de que quieres eliminar este registro de la bitácora?')) {
                    try {
                        await data.deleteItem(btn.dataset.id);
                        ui.showNotification('Registro eliminado', 'success');
                        await this.loadGatosSection();
                    } catch (err) {
                        console.error('Error deleteEvent:', err);
                        ui.showNotification('Error al eliminar el registro', 'error');
                    }
                }
            });
        });
    }

    // ==================== MODALES Y OPERACIONES ====================

    /**
     * Muestra el modal para registrar/editar un gato
     */
    showGatoModal(gatoExistente = null) {
        // Remover modal viejo si existe
        document.getElementById('gatos-gato-modal')?.remove();

        const title = gatoExistente ? 'Editar Ficha del Gato' : 'Registrar Nuevo Gato';
        const todayStr = new Date().toISOString().split('T')[0];

        const modalHtml = `
            <div id="gatos-gato-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm transition-opacity duration-200">
                <div class="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] scale-100 transition-transform duration-200 animate-fade-in">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-bold text-gray-800">${title}</h3>
                        <button id="btn-close-gato-modal" class="text-gray-400 hover:text-gray-600 p-1">
                            <i class="fa-solid fa-xmark text-lg"></i>
                        </button>
                    </div>
                    
                    <form id="form-gato-modal" class="space-y-4 overflow-y-auto pr-1 flex-1">
                        <div>
                            <label class="block text-xs font-bold text-gray-500 mb-1">Nombre (Obligatorio)</label>
                            <input type="text" id="gato-modal-nombre" required class="w-full border-2 border-gray-100 rounded-xl p-3 text-sm focus:border-brand focus:outline-none transition" placeholder="Luna, Bigotes, etc..." value="${gatoExistente ? gatoExistente.content : ''}">
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-gray-500 mb-1">Emoji / Avatar</label>
                            <input type="text" id="gato-modal-emoji" class="w-full border-2 border-gray-100 rounded-xl p-3 text-sm focus:border-brand focus:outline-none transition text-center text-2xl w-16" maxlength="2" placeholder="🐱" value="${gatoExistente ? gatoExistente.meta.emoji || '🐱' : '🐱'}">
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-gray-500 mb-1">Fecha de Nacimiento (Aproximada)</label>
                            <input type="date" id="gato-modal-nacimiento" required max="${todayStr}" class="w-full border-2 border-gray-100 rounded-xl p-3 text-sm focus:border-brand focus:outline-none transition" value="${gatoExistente ? gatoExistente.meta.nacimiento || '' : ''}">
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-gray-500 mb-1">Fecha de Rescate (Opcional)</label>
                            <input type="date" id="gato-modal-rescate" max="${todayStr}" class="w-full border-2 border-gray-100 rounded-xl p-3 text-sm focus:border-brand focus:outline-none transition" value="${gatoExistente ? gatoExistente.meta.rescate || '' : ''}">
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-gray-500 mb-1">Fecha de Fallecimiento (Sólo si cruzó el arcoíris 🌈)</label>
                            <input type="date" id="gato-modal-fallecimiento" max="${todayStr}" class="w-full border-2 border-gray-100 rounded-xl p-3 text-sm focus:border-brand focus:outline-none transition" value="${gatoExistente ? gatoExistente.meta.fallecimiento || '' : ''}">
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-gray-500 mb-1">Breve Descripción o Notas</label>
                            <textarea id="gato-modal-descripcion" class="w-full border-2 border-gray-100 rounded-xl p-3 text-sm focus:border-brand focus:outline-none transition resize-none h-20" placeholder="Ej: Rescatado de la calle, le gusta dormir en mi cabeza...">${gatoExistente ? gatoExistente.descripcion || '' : ''}</textarea>
                        </div>

                        <div class="flex gap-2 pt-2">
                            ${gatoExistente ? `
                                <button type="button" id="btn-gatos-eliminar-gato" class="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-sm transition flex items-center justify-center gap-1.5">
                                    <i class="fa-solid fa-trash"></i> Eliminar
                                </button>
                            ` : ''}
                            <button type="submit" class="flex-1 py-3 bg-brand hover:bg-brand-dark text-white rounded-xl font-bold text-sm transition">
                                Guardar Ficha
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('gatos-gato-modal');
        const form = document.getElementById('form-gato-modal');
        const closeBtn = document.getElementById('btn-close-gato-modal');

        const closeModal = () => modal.remove();
        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

        if (gatoExistente) {
            document.getElementById('btn-gatos-eliminar-gato')?.addEventListener('click', async () => {
                if (confirm(`¿Estás seguro de que quieres eliminar a ${gatoExistente.content}? Se perderán todos sus registros asociados de insumos y salud.`)) {
                    try {
                        // Eliminar el gato
                        await data.deleteItem(gatoExistente.id);
                        
                        // Eliminar registros asociados localmente o dejarlos (se eliminan los de este gato)
                        // Para limpieza, borramos los de este gato:
                        const asociados = this.eventos.filter(e => e.meta && e.meta.cat_id === gatoExistente.id);
                        for (const r of asociados) {
                            await data.deleteItem(r.id);
                        }
                        
                        ui.showNotification('Gato y registros eliminados', 'success');
                        closeModal();
                        await this.loadGatosSection();
                    } catch (err) {
                        console.error('Error deleteGato:', err);
                        ui.showNotification('Error al eliminar', 'error');
                    }
                }
            });
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('gato-modal-nombre').value.trim();
            const emoji = document.getElementById('gato-modal-emoji').value.trim() || '🐱';
            const nacimiento = document.getElementById('gato-modal-nacimiento').value;
            const rescate = document.getElementById('gato-modal-rescate').value || null;
            const fallecimiento = document.getElementById('gato-modal-fallecimiento').value || null;
            const descripcion = document.getElementById('gato-modal-descripcion').value.trim();

            if (!nombre || !nacimiento) {
                ui.showNotification('Nombre y Nacimiento son obligatorios', 'error');
                return;
            }

            const itemData = {
                content: nombre,
                type: 'nota',
                tags: ['gato'],
                descripcion: descripcion,
                meta: {
                    tipo: 'gato_perfil',
                    emoji: emoji,
                    nacimiento: nacimiento,
                    rescate: rescate,
                    fallecimiento: fallecimiento
                }
            };

            try {
                if (gatoExistente) {
                    await data.updateItem(gatoExistente.id, itemData);
                    ui.showNotification('Ficha actualizada correctamente', 'success');
                } else {
                    const nuevo = await data.createItem(itemData);
                    this.selectedCatId = nuevo.id;
                    localStorage.setItem('gatos_selected_id', this.selectedCatId);
                    ui.showNotification('¡Gato registrado correctamente! 🎉', 'success');
                }
                closeModal();
                await this.loadGatosSection();
            } catch (err) {
                console.error('Error guardando gato:', err);
                ui.showNotification('Error al guardar el gato', 'error');
            }
        });
    }

    /**
     * Muestra el modal para registrar un evento de salud o insumos
     */
    showEventModal(categoria, subtipo, tituloPredeterminado) {
        if (!this.selectedCatId) {
            ui.showNotification('Registra un gato primero', 'error');
            return;
        }

        // Remover modal viejo si existe
        document.getElementById('gatos-evento-modal')?.remove();

        const todayStr = new Date().toISOString().split('T')[0];
        const tagAsociada = categoria === 'salud' ? 'gato_salud' : 'gato_insumo';

        const modalHtml = `
            <div id="gatos-evento-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm transition-opacity duration-200">
                <div class="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] scale-100 transition-transform duration-200 animate-fade-in">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-base font-bold text-gray-800 flex items-center gap-1.5">
                            <span>📝</span> Registrar Acción
                        </h3>
                        <button id="btn-close-evento-modal" class="text-gray-400 hover:text-gray-600 p-1">
                            <i class="fa-solid fa-xmark text-lg"></i>
                        </button>
                    </div>
                    
                    <form id="form-evento-modal" class="space-y-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-500 mb-1">Nombre / Título de la acción</label>
                            <input type="text" id="evento-modal-titulo" required class="w-full border-2 border-gray-100 rounded-xl p-3 text-sm focus:border-brand focus:outline-none transition" value="${tituloPredeterminado}">
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-gray-500 mb-1">Fecha</label>
                            <input type="date" id="evento-modal-fecha" required max="${todayStr}" class="w-full border-2 border-gray-100 rounded-xl p-3 text-sm focus:border-brand focus:outline-none transition" value="${todayStr}">
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-gray-500 mb-1">Anotaciones / Detalles (Opcional)</label>
                            <textarea id="evento-modal-notas" class="w-full border-2 border-gray-100 rounded-xl p-3 text-sm focus:border-brand focus:outline-none transition resize-none h-20" placeholder="Ej: Marca, dosis, veterinaria, peso, etc..."></textarea>
                        </div>

                        <div class="flex items-center gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <input type="checkbox" id="evento-modal-historial-kai" checked class="w-4 h-4 rounded text-brand focus:ring-brand border-gray-300">
                            <label for="evento-modal-historial-kai" class="text-xs text-gray-600 font-semibold cursor-pointer select-none">
                                Mostrar en mi Historial de KAI
                            </label>
                        </div>

                        <button type="submit" class="w-full py-3 bg-brand hover:bg-brand-dark text-white rounded-xl font-bold text-sm transition">
                            Guardar Registro
                        </button>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('gatos-evento-modal');
        const form = document.getElementById('form-evento-modal');
        const closeBtn = document.getElementById('btn-close-evento-modal');

        const closeModal = () => modal.remove();
        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const titulo = document.getElementById('evento-modal-titulo').value.trim();
            const fecha = document.getElementById('evento-modal-fecha').value;
            const notas = document.getElementById('evento-modal-notas').value.trim();
            const mostrarHistorial = document.getElementById('evento-modal-historial-kai').checked;

            if (!titulo || !fecha) {
                ui.showNotification('El título y la fecha son obligatorios', 'error');
                return;
            }

            const tags = [tagAsociada, 'gato'];
            if (!mostrarHistorial) {
                tags.push('gato_oculto');
            }

            const itemData = {
                content: titulo,
                type: 'nota',
                tags: tags,
                descripcion: notas,
                meta: {
                    tipo: 'gato_evento',
                    cat_id: this.selectedCatId,
                    categoria: categoria, // salud o insumos
                    subtipo: subtipo,
                    fecha: fecha
                }
            };

            try {
                await data.createItem(itemData);
                ui.showNotification('Acción registrada correctamente', 'success');
                closeModal();
                await this.loadGatosSection();
            } catch (err) {
                console.error('Error registrando evento gato:', err);
                ui.showNotification('Error al registrar el evento', 'error');
            }
        });
    }

    /**
     * Bindea eventos globales (si aplica)
     */
    bindEvents() {
        // Generalmente todo se bindea dinámicamente al renderizar
    }

    // ==================== UTILERÍAS ====================

    /**
     * Calcula la edad de forma legible y tierna
     */
    calcularEdad(fechaNacimiento, fechaFallecimiento) {
        if (!fechaNacimiento) return 'Fecha desconocida';
        const fin = fechaFallecimiento ? new Date(fechaFallecimiento) : new Date();
        const inicio = new Date(fechaNacimiento);
        
        let years = fin.getFullYear() - inicio.getFullYear();
        let months = fin.getMonth() - inicio.getMonth();
        let days = fin.getDate() - inicio.getDate();
        
        if (days < 0) {
            months -= 1;
            // Aproximación de días del mes anterior
            days += 30; 
        }
        if (months < 0) {
            years -= 1;
            months += 12;
        }
        
        const parts = [];
        if (years > 0) parts.push(`${years} ${years === 1 ? 'año' : 'años'}`);
        if (months > 0) parts.push(`${months} ${months === 1 ? 'mes' : 'meses'}`);
        if (parts.length === 0) {
            if (days === 0) return '¡Nació hoy! 🎉';
            parts.push(`${days} ${days === 1 ? 'día' : 'días'}`);
        }
        return parts.join(' y ');
    }

    /**
     * Calcula la diferencia en días entre una fecha y hoy
     */
    calcularDiasTranscurridos(fechaStr) {
        const fecha = new Date(fechaStr);
        // Resetear horas para cálculo por día entero
        fecha.setHours(0, 0, 0, 0);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        const diffTime = hoy - fecha;
        return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    }

    /**
     * Formatea fecha YYYY-MM-DD a formato amigable "DD de Mes, YYYY"
     */
    formatFechaLegible(fechaStr) {
        if (!fechaStr) return '';
        const partes = fechaStr.split('-');
        if (partes.length !== 3) return fechaStr;
        
        const fecha = new Date(partes[0], partes[1] - 1, partes[2]);
        const meses = [
            'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
            'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
        ];
        return `${fecha.getDate()} de ${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
    }
}

export const gatos = new GatosController();
