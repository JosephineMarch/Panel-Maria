// supabase import removed — was imported but never used

export const ai = {
    isRecording: false,
    recognition: null,

    async init() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.lang = 'es-ES';
            this.recognition.continuous = false;
            this.recognition.interimResults = true;

            this.recognition.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0])
                    .map(result => result.transcript)
                    .join('');

                window.dispatchEvent(new CustomEvent('voice-result', {
                    detail: { transcript }
                }));
            };

            this.recognition.onerror = (event) => {
                console.error('Voice recognition error:', event.error);
                this.isRecording = false;
                window.dispatchEvent(new CustomEvent('voice-error', {
                    detail: { error: event.error }
                }));
            };

            this.recognition.onend = () => {
                this.isRecording = false;
            };
        }
    },

    startVoice() {
        if (!this.recognition) {
            console.warn('Speech recognition not supported');
            return false;
        }
        this.isRecording = true;
        this.recognition.start();
        return true;
    },

    stopVoice() {
        if (this.recognition) {
            this.recognition.stop();
            this.isRecording = false;
        }
    },

    async processWithKai(text) {
        // Ahora usamos el motor de Cerebras
        const { cerebras } = await import('./cerebras.js');
        return await cerebras.ask(text);
    },

    // El parseIntent manual queda obsoleto por la IA,
    // pero lo mantenemos como fallback básico si fuera necesario
    parseIntent(text) {
        // Podríamos redirigir esto a la IA también o dejarlo para procesado offline rápido
        return { type: 'note', tags: [], deadline: null };
    },

    detectarBitacora(texto) {
        const textoLower = texto.toLowerCase().trim();

        // Patrones para comandos explícitos de bitácora (prioridad alta)
        const patronesExplicit = [
            { regex: /^bitácora:\s*(.+)/i, momento: 'ahora' },
            { regex: /^bitacora:\s*(.+)/i, momento: 'ahora' },
            { regex: /^(?:anota|guarda|registra|pon|escribe)\s+(?:en\s+)?bitácora[:\s]*(.+)/i, momento: 'ahora' },
            { regex: /^(?:para|voy a|quiero)\s+bitácora[:\s]*(.+)/i, momento: 'ahora' }
        ];

        for (const patron of patronesExplicit) {
            const match = textoLower.match(patron.regex);
            if (match && match[1]) {
                const contenido = match[1].trim().replace(/,$/, '');
                return {
                    esBitacora: true,
                    contenido: this.capitalizar(contenido),
                    momento: patron.momento,
                    textoOriginal: texto,
                    explicito: true
                };
            }
        }

        // Patrones para detectar acciones personales (prioridad normal)
        const patrones = [
            { regex: /^hoy\s+(hice|terminé|empecé|comí|estudié|trabajé|bañé|acabé|levanté|cené)\s+(.+)/i, momento: 'hoy', conContenido: true },
            { regex: /^ayer\s+(hice|terminé|empecé|comí|estudié|trabajé|bañé|acabé|levanté|cené)\s+(.+)/i, momento: 'ayer', conContenido: true },
            { regex: /^esta\s+(mañana|tarde|noche)\s+(hice|terminé|empecé|comí|estudié|trabajé|bañé|acabé)\s+(.+)/i, momento: 'esta mañana', conContenido: true },
            { regex: /^acabo\s+de\s+(.+)/i, momento: 'ahora', conContenido: true },
            { regex: /^me\s+(bañé|levanté|desperté|acosté|cambié)\s*$/i, momento: 'ahora', conContenido: false },
            { regex: /^(hice|terminé|empecé|comí|estudié|trabajé|bañé|acabé|levanté|cené)\s+(.+)/i, momento: 'hoy', conContenido: true },
            { regex: /^ya\s+(hice|terminé|acabé)\s+(.+)/i, momento: 'hoy', conContenido: true },
            { regex: /^terminé\s+de\s+(.+)/i, momento: 'hoy', conContenido: true },
            { regex: /^empecé\s+a\s+(.+)/i, momento: 'hoy', conContenido: true }
        ];

        for (const patron of patrones) {
            const match = textoLower.match(patron.regex);
            if (match) {
                let contenido = '';

                // Extraer el contenido según el patrón
                if (patron.conContenido) {
                    if (match.length === 3) {
                        contenido = match[2].trim();
                    } else if (match.length === 4) {
                        contenido = match[3].trim();
                    }
                } else {
                    // Para patrones sin contenido adicional (como "me bañé")
                    contenido = match[1] ? match[1] : match[0];
                }

                // Limpiar contenido
                contenido = contenido.replace(/,$/, '').trim();

                // Si el contenido está vacío, usar la palabra clave
                if (!contenido && match[1]) {
                    contenido = match[1];
                }

                return {
                    esBitacora: true,
                    contenido: this.capitalizar(contenido),
                    momento: patron.momento,
                    textoOriginal: texto,
                    explicito: false
                };
            }
        }

        return { esBitacora: false, contenido: '', momento: '', textoOriginal: texto, explicito: false };
    },

    detectarAlarmas(texto) {
        const textoLower = texto.toLowerCase();

        const tieneComandoAlarma = /alarma|recordatorio|recuerdame|avísame|avisa|recordar|recuerda/i.test(textoLower);

        if (!tieneComandoAlarma) {
            return { esAlarma: false, deadline: null };
        }

        const deadline = this.extraerFechaHora(texto);

        if (deadline) {
            // Limpiar el texto del comando
            let contenido = texto
                .replace(/alarma:?\s*/i, '')
                .replace(/recordatorio:?\s*/i, '')
                .replace(/recuerdame\s*/i, '')
                .replace(/avísame\s*/i, '')
                .replace(/avisa\s*/i, '')
                .replace(/recordar\s*/i, '')
                .replace(/recuerda\s*/i, '')
                .replace(/dentro\s+de\s+\d+\s*(minuto|minutos|min|hora|horas|h)\b\s*/gi, '')
                .replace(/en\s+\d+\s*(minuto|minutos|min|hora|horas|h)\b\s*/gi, '')
                .replace(/en\s+una\s+(hora|minuto)\b\s*/gi, '')
                .replace(/en\s+un\s+(hora|minuto)\b\s*/gi, '')
                .trim();

            // Si quedó vacío, usar un mensaje genérico
            if (!contenido || contenido.length < 2) {
                contenido = 'Recordatorio';
            }

            return {
                esAlarma: true,
                deadline: deadline,
                contenido: contenido
            };
        }

        return { esAlarma: false, deadline: null };
    },

    extraerFechaHora(texto) {
        const ahora = new Date();
        const fecha = new Date(ahora);
        const textoLower = texto.toLowerCase();

        const dentroMinuto = textoLower.match(/dentro\s+(?:de\s+)?(\d+)\s*(minuto|minutos|min|m)/i);
        if (dentroMinuto) {
            const minutos = parseInt(dentroMinuto[1]);
            fecha.setMinutes(fecha.getMinutes() + minutos);
            return fecha.getTime();
        }

        const dentroHora = textoLower.match(/dentro\s+(?:de\s+)?(\d+)\s*(hora|horas|h)/i);
        if (dentroHora) {
            const horas = parseInt(dentroHora[1]);
            fecha.setHours(fecha.getHours() + horas);
            return fecha.getTime();
        }

        const enMinuto = textoLower.match(/en\s+(\d+)\s*(minuto|minutos|min|m)\b/i);
        if (enMinuto) {
            const minutos = parseInt(enMinuto[1]);
            fecha.setMinutes(fecha.getMinutes() + minutos);
            return fecha.getTime();
        }

        const enHora = textoLower.match(/en\s+(\d+)\s*(hora|horas|h)\b/i);
        if (enHora) {
            const horas = parseInt(enHora[1]);
            fecha.setHours(fecha.getHours() + horas);
            return fecha.getTime();
        }

        if (/en\s+una\s+hora/i.test(textoLower)) {
            fecha.setHours(fecha.getHours() + 1);
            return fecha.getTime();
        }

        if (/en\s+un\s+minuto/i.test(textoLower)) {
            fecha.setMinutes(fecha.getMinutes() + 1);
            return fecha.getTime();
        }

        // Hora específica
        const horaMatch = textoLower.match(/(?:a las|para las)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
        if (horaMatch) {
            let horas = parseInt(horaMatch[1]);
            const minutos = horaMatch[2] ? parseInt(horaMatch[2]) : 0;
            const periodo = horaMatch[3]?.toLowerCase();

            if (periodo === 'pm' && horas < 12) horas += 12;
            if (periodo === 'am' && horas === 12) horas = 0;

            fecha.setHours(horas, minutos, 0, 0);

            if (fecha < ahora) {
                fecha.setDate(fecha.getDate() + 1);
            }

            return fecha.getTime();
        }

        return null;
    },

    detectarTags(texto) {
        const textoLower = texto.toLowerCase();
        const tags = [];

        // Tags de salud (cuerpo físico)
        const patronesSalud = [
            /me\s+dolió/i, /me\s+duele/i, /estuve\s+cansada/i, /estoy\s+cansada/i,
            /me\s+enfermé/i, /me\s+enfermo/i, /tengo\s+dolor/i, /me\s+siento\s+débil/i,
            /me\s+siento\s+enferma/i, /tengo\s+gripe/i, /tengo\s+resfriado/i,
            /me\s+headache/i, /me\s+dolor\s+de/i, /tengo\s+fatiga/i
        ];

        // Tags de emoción
        const patronesEmocion = [
            /me\s+sentí/i, /me\s+siento/i, /estoy\s+(triste|feliz|contento|contenta|feliz)/i,
            /me\s+siento\s+(bien|mal|triste|feliz|ansioso|preocupado)/i,
            /tengo\s+(miedo|vergüenza|rabia|enojo)/i, /estoy\s+(ansioso|preocupado|nervioso)/i,
            /me\s+siento\s+(solo|sola)/i, /tengo\s+(ansiedad|depresión)/i
        ];

        for (const patron of patronesSalud) {
            if (patron.test(textoLower)) {
                tags.push('salud');
                break;
            }
        }

        for (const patron of patronesEmocion) {
            if (patron.test(textoLower)) {
                tags.push('emocion');
                break;
            }
        }

        return tags;
    },

    capitalizar(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
};
