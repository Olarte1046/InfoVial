/**
 * InfoVial Core Engine
 * Production Grade Authentication & Navigation
 */

const InfoVial = {
    storageKey: 'infovial_registration_data',

    // --- State Management ---
    getData() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : {};
    },

    saveData(data) {
        const currentData = this.getData();
        const newData = { ...currentData, ...data };
        localStorage.setItem(this.storageKey, JSON.stringify(newData));
    },

    clearData() {
        localStorage.removeItem(this.storageKey);
    },

    // --- Auth Strategy ---
    async getSession() {
        if (typeof supabaseClient === 'undefined') return null;
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) console.error('Auth Session Error:', error.message);
        return session;
    },

    // Protected Route Middleware (Client-side)
    async requireAuth() {
        const session = await this.getSession();
        if (!session) {
            const currentPath = window.location.pathname;
            if (currentPath.includes('dashboard.html')) {
                window.location.href = 'login.html?redirect=dashboard';
            }
        }
        return session;
    },

    // --- UI Helpers ---
    initTheme() {
        const savedTheme = localStorage.getItem('infovial_theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeToggleIcon(savedTheme);
    },

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('infovial_theme', newTheme);
        this.updateThemeToggleIcon(newTheme);
    },

    updateThemeToggleIcon(theme) {
        const toggle = document.querySelector('.theme-toggle');
        if (toggle) {
            toggle.innerHTML = theme === 'dark'
                ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14z"/></svg>'
                : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
        }
    },

    nextStep(nextPage) { window.location.href = nextPage; },
    backStep() { window.history.back(); },

    checkProgress() {
        const data = this.getData();
        if (window.location.pathname === '/' || window.location.pathname.includes('index.html')) return;
        if (!data.nombre && window.location.pathname.includes('step')) {
            window.location.href = 'step1.html';
        }
    },

    maskId(id) {
        if (!id) return '...';
        return id.length > 8 ? id.substring(0, 4) + '...' + id.substring(id.length - 2) : id;
    }
};

/**
 * Dashboard Controller
 */
const Dashboard = {
    session: null,
    profile: null,

    async init() {
        this.session = await InfoVial.requireAuth();
        if (!this.session) return;

        if (!navigator.onLine) {
            this.showOfflineError();
            return;
        }

        this.showLoading(true);
        await this.loadProfile();
        this.showLoading(false);

        if (this.profile) {
            this.render();
        } else {
            this.showNoProfileUI();
        }
    },

    async loadProfile() {
        try {
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('user_id', this.session.user.id)
                .maybeSingle();

            if (error) throw error;
            this.profile = data;
        } catch (err) {
            console.error('Core Profile Load Error:', err);
        }
    },

    render() {
        if (!this.profile) return;
        const p = this.profile;
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '-'; };

        set('dash-name', p.nombre);
        set('dash-meta', `${p.edad} años • ${p.ciudad || 'Colombia'}`);
        set('dash-blood', p.sangre);
        set('dash-vial-id', p.vital_id);

        set('val-nombre', p.nombre);
        set('val-edad', p.edad);
        set('val-eps', p.eps);
        set('val-condiciones', p.condiciones || 'Ninguna');
        set('val-meds', p.medicamentos || 'Ninguno');
        set('val-contacto', p.contacto_nombre);
        set('val-relacion', p.contacto_relacion);
        set('val-tel', p.telefono_emergencia);

        const masked = document.getElementById('masked-vial-id');
        if (masked) masked.textContent = InfoVial.maskId(p.vital_id);
    },

    async shareProfile() {
        const shareData = {
            title: 'Mi Perfil InfoVial',
            text: 'En caso de emergencia, escanea mi QR o visita este enlace:',
            url: window.location.origin + '/u.html?s=' + this.profile.public_slug
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(shareData.url);
                alert('Enlace copiado al portapapeles');
            }
        } catch (err) {
            console.error('Share Error:', err);
        }
    },

    openModal(id) { document.getElementById(id)?.classList.add('active'); },
    closeModal(id) { document.getElementById(id)?.classList.remove('active'); },

    async updateProfile(formData) {
        try {
            const { error } = await supabaseClient
                .from('profiles')
                .update(formData)
                .eq('user_id', this.session.user.id);

            if (error) throw error;
            this.profile = { ...this.profile, ...formData };
            this.render();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    },

    async logout() {
        await supabaseClient.auth.signOut();
        window.location.href = 'index.html';
    },

    showLoading(show) {
        // Implement simple loading overlay if needed
        console.log('Loading state:', show);
    },

    showNoProfileUI() {
        document.querySelector('.app-container').innerHTML = `
            <div style="text-align: center; padding: 60px 24px; animation: fadeIn 0.5s ease;">
                <div style="font-size: 64px; margin-bottom: 24px;">👋</div>
                <h1>Casi listo, ${this.session.user.email.split('@')[0]}</h1>
                <p class="description" style="margin-bottom: 32px;">Aún no has configurado tu perfil médico vital.</p>
                <a href="step1.html" class="btn btn-primary">Completar mi Perfil</a>
                <button onclick="Dashboard.logout()" class="btn btn-outline" style="margin-top: 16px;">Salir</button>
            </div>
        `;
    }
};

// Global Listeners
document.addEventListener('DOMContentLoaded', () => {
    InfoVial.initTheme();

    if (window.location.pathname.includes('dashboard.html')) {
        Dashboard.init();
    }

    if (/step\d/.test(window.location.pathname)) {
        InfoVial.checkProgress();
    }

    // Listen for auth changes (Session refresh/logout)
    if (typeof supabaseClient !== 'undefined') {
        supabaseClient.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') window.location.href = 'index.html';
            if (event === 'TOKEN_REFRESHED') console.log('Auth link secured.');
        });
    }
});
