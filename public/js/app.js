/**
 * InfoVial Persistence & Navigation Helper
 */
const InfoVial = {
    storageKey: 'infovial_registration_data',

    // Load data from localStorage (Temporary registration state)
    getData() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : {
            nombre: '',
            edad: '',
            sangre: '',
            condiciones: [],
            medicamentos: '',
            contacto_nombre: '',
            contacto_tel: '',
            contacto_relacion: '',
            ciudad: '',
            eps: ''
        };
    },

    saveData(data) {
        const currentData = this.getData();
        const newData = { ...currentData, ...data };
        localStorage.setItem(this.storageKey, JSON.stringify(newData));
    },

    clearData() {
        localStorage.removeItem(this.storageKey);
    },

    // Theme Management
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

    nextStep(nextPage) {
        window.location.href = nextPage;
    },

    backStep() {
        window.history.back();
    },

    checkProgress() {
        const data = this.getData();
        const path = window.location.pathname;
        if ((path.includes('step2') || path.includes('step3') || path.includes('step4')) && !data.nombre) {
            window.location.href = 'step1.html';
        }
    },

    maskId(id) {
        if (!id) return '...';
        return id.length > 10 ? id.substring(0, 7) + '...' + id.substring(id.length - 2) : id;
    },

    async getSession() {
        if (typeof supabaseClient === 'undefined') return null;
        const { data, error } = await supabaseClient.auth.getSession();
        return data?.session || null;
    }
};

/**
 * Dashboard Logic Controller
 */
const Dashboard = {
    session: null,
    profile: null,

    async init() {
        this.session = await InfoVial.getSession();

        if (!this.session) {
            window.location.href = 'login.html';
            return;
        }

        if (!navigator.onLine) {
            this.showOfflineError();
            return;
        }

        await this.loadProfile();
        if (this.profile) {
            this.render();
        } else {
            // If logged in but no profile, maybe redirect to registration or show "Create Profile"
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
            console.error('Error loading profile:', err);
        }
    },

    showNoProfileUI() {
        document.querySelector('.app-container').innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div class="icon" style="color: var(--primary); font-size: 48px; margin-bottom: 20px;">👤</div>
                <h1 style="color: var(--primary);">No tienes un perfil aún</h1>
                <p class="description">Para activar tu InfoVial, primero crea tu perfil médico.</p>
                <a href="step1.html" class="btn btn-primary" style="margin-top: 24px;">Crear mi perfil</a>
                <button onclick="Dashboard.logout()" class="btn btn-outline" style="margin-top: 16px;">Cerrar Sesión</button>
            </div>
        `;
    },

    showOfflineError() {
        document.querySelector('.app-container').innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div class="icon" style="color: var(--critical); font-size: 48px; margin-bottom: 20px;">📶</div>
                <h2 style="color: var(--critical);">Sin conexión</h2>
                <p class="description">Necesitas conexión a internet para ver tu panel.</p>
                <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 24px;">Reintentar</button>
            </div>
        `;
    },

    render() {
        if (!this.profile) return;
        const p = this.profile;

        // Populate elements (Assuming IDs exist in dashboard.html)
        const safeSet = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val || '...';
        };

        safeSet('dash-name', p.nombre);
        safeSet('dash-meta', `${p.edad} años • ${p.ciudad || 'Sin ciudad'}`);
        safeSet('dash-blood', p.sangre);
        safeSet('dash-vial-id', p.vital_id);

        safeSet('val-nombre', p.nombre);
        safeSet('val-edad', p.edad);
        safeSet('val-eps', p.eps);
        safeSet('val-condiciones', p.condiciones);
        safeSet('val-meds', p.medicamentos);
        safeSet('val-contacto', p.contacto_nombre);
        safeSet('val-relacion', p.contacto_relacion);
        safeSet('val-tel', p.telefono_emergencia);

        const maskedEl = document.getElementById('masked-vial-id');
        if (maskedEl) maskedEl.textContent = InfoVial.maskId(p.vital_id);
    },

    async logout() {
        await supabaseClient.auth.signOut();
        window.location.href = 'index.html';
    },

    async updateProfile(formData) {
        try {
            const { error } = await supabaseClient
                .from('profiles')
                .update(formData)
                .eq('user_id', this.session.user.id);

            if (error) throw error;
            this.profile = { ...this.profile, ...formData };
            this.render();
            alert('Perfil actualizado con éxito');
        } catch (err) {
            alert('Error al actualizar: ' + err.message);
        }
    }
};

// Initializations
document.addEventListener('DOMContentLoaded', () => {
    InfoVial.initTheme();

    if (window.location.pathname.includes('dashboard.html')) {
        Dashboard.init();
    }

    const isStep = /step\d/.test(window.location.pathname);
    if (isStep) {
        InfoVial.checkProgress();
    }
});
