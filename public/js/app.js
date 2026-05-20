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

        // Check for deferred registration completion
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('action') === 'complete_registration') {
            await this.finalizeRegistration();
            return;
        }

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

    async finalizeRegistration() {
        const regData = InfoVial.getData();
        if (!regData.pending_profile) {
            window.location.href = 'dashboard.html';
            return;
        }

        this.showLoading(true, 'Finalizando activación...');

        try {
            const public_slug = crypto.randomUUID();
            const vital_id = 'IV-' + Math.random().toString(36).substring(2, 7).toUpperCase();

            const { data, error } = await supabaseClient.from('profiles').insert({
                user_id: this.session.user.id,
                nombre: regData.nombre,
                edad: regData.edad,
                sangre: regData.sangre,
                condiciones: regData.condiciones,
                medicamentos: regData.medicamentos,
                contacto_nombre: regData.contacto_nombre,
                contacto_relacion: regData.contacto_relacion,
                telefono_emergencia: regData.telefono_emergencia,
                ciudad: regData.ciudad,
                eps: regData.eps,
                public_slug: public_slug,
                vital_id: vital_id
            }).select().single();

            if (error) throw error;

            InfoVial.clearData();
            window.location.href = 'step5.html?s=' + public_slug;
        } catch (err) {
            console.error('Finalization Error:', err);
            alert('Error al activar perfil: ' + err.message);
            this.showNoProfileUI();
        } finally {
            this.showLoading(false);
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

    showLoading(show, message = 'Cargando...') {
        let loader = document.getElementById('global-loader');
        if (!loader && show) {
            loader = document.createElement('div');
            loader.id = 'global-loader';
            loader.innerHTML = `<div class="glass" style="position:fixed; inset:0; z-index:9999; display:flex; flex-direction:column; align-items:center; justify-content:center; background: rgba(255,255,255,0.8); backdrop-filter:blur(10px);">
                <div class="spinner" style="width:40px; height:40px; border:4px solid var(--primary-soft); border-top-color:var(--primary); border-radius:50%; animation:spin 1s linear infinite; margin-bottom:16px;"></div>
                <div style="font-weight:700; color:var(--primary); font-size:14px; letter-spacing:1px; text-transform:uppercase;">${message}</div>
                <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
            </div>`;
            document.body.appendChild(loader);
        }
        if (loader) loader.style.display = show ? 'flex' : 'none';
        if (loader && message) loader.querySelector('div:last-child').innerText = message;
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

    const path = window.location.pathname;
    const isDashboard = path.includes('dashboard.html');
    const isLogin = path.includes('login.html');
    const isStep = /step\d/.test(path);

    if (isDashboard) {
        Dashboard.init();
    }

    if (isStep) {
        InfoVial.checkProgress();
    }

    // Auth Lifecycle Manager
    if (typeof supabaseClient !== 'undefined') {
        supabaseClient.auth.onAuthStateChange((event, session) => {
            // Only redirect to index if we are on a page that REQUIRES auth
            if (event === 'SIGNED_OUT' && (isDashboard || isStep)) {
                window.location.href = 'index.html';
            }
        });
    }
});
