import { supabase } from './supabase.js';

export const auth = {
    currentUser: null,

    async init() {
        const { data: { session } } = await supabase.auth.getSession();
        this.currentUser = session?.user || null;
        
        supabase.auth.onAuthStateChange((event, session) => {
            this.currentUser = session?.user || null;
            this.handleAuthChange(event, session);
        });

        return this.currentUser;
    },

    handleAuthChange(event, session) {
        const eventName = `auth-${event}`;
        window.dispatchEvent(new CustomEvent(eventName, { detail: session }));
    },

    async signUp(email, password) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password
        });
        if (error) throw error;
        return data;
    },

    async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;
        this.currentUser = data.user;
        return data;
    },

    async signInWithGoogle() {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: 'https://josephinemarch.github.io/Panel-Maria/'
            }
        });
        if (error) throw error;
        return data;
    },

    async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        this.currentUser = null;
    },

    async getUser() {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        this.currentUser = user;
        return user;
    },

    isAuthenticated() {
        return !!this.currentUser;
    }
};
