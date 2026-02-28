export const utils = {
    isDev: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    
    generateId() {
        return crypto.randomUUID();
    },

    log(...args) {
        if (this.isDev) console.log(...args);
    },

    warn(...args) {
        if (this.isDev) console.warn(...args);
    },

    error(...args) {
        if (this.isDev) console.error(...args);
    },

    debug(...args) {
        if (this.isDev) console.debug(...args);
    },

    sanitizeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    sanitizeInput(text) {
        if (typeof text !== 'string') return text;
        return text
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    },

    stripHtml(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    },

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },

    formatDate(dateString, format = 'short') {
        const date = new Date(dateString);
        
        if (format === 'full') {
            return date.toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        if (format === 'time') {
            return date.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short'
        });
    },

    timeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'hace un momento';
        
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `hace ${minutes} min`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `hace ${hours} h`;
        
        const days = Math.floor(hours / 24);
        if (days < 7) return `hace ${days} días`;
        
        const weeks = Math.floor(days / 7);
        if (weeks < 4) return `hace ${weeks} semanas`;
        
        const months = Math.floor(days / 30);
        if (months < 12) return `hace ${months} meses`;
        
        const years = Math.floor(days / 365);
        return `hace ${years} años`;
    },

    debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    throttle(func, limit = 300) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    parseTags(text) {
        const tagRegex = /#(\w+)/g;
        const tags = [];
        let match;
        
        while ((match = tagRegex.exec(text)) !== null) {
            tags.push(match[1]);
        }
        
        return tags;
    },

    removeTags(text) {
        return text.replace(/#\w+/g, '').trim();
    },

    extractUrls(text) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.match(urlRegex) || [];
    },

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    slugify(text) {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/--+/g, '-')
            .trim();
    },

    getRandomColor() {
        const colors = [
            '#fef3c7', '#d1fae5', '#e0e7ff', '#fee2e2',
            '#dbeafe', '#fce7f3', '#f3e8ff', '#ffedd5'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    },

    storage: {
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch {
                return defaultValue;
            }
        },

        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch {
                return false;
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch {
                return false;
            }
        },

        clear() {
            try {
                localStorage.clear();
                return true;
            } catch {
                return false;
            }
        }
    }
};
