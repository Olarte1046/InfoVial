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

        const {
            data: { session },
            error
        } = await supabaseClient.auth.getSession();

        if (error) {
            console.error('Auth Session Error:', error.message);
        }

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
        const savedTheme =
            localStorage.getItem('infovial_theme') || 'light';

        document.documentElement.setAttribute(
            'data-theme',
            savedTheme
        );

        this.updateThemeToggleIcon(savedTheme);
    },

    toggleTheme() {
        const currentTheme =
            document.documentElement.getAttribute('data-theme');

        const newTheme =
            currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute(
            'data-theme',
            newTheme
        );

        localStorage.setItem(
            'infovial_theme',
            newTheme
        );

        this.updateThemeToggleIcon(newTheme);
    },

    updateThemeToggleIcon(theme) {
        const toggle =
            document.querySelector('.theme-toggle');

        if (!toggle) return;

        toggle.innerHTML =
            theme === 'dark'
                ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14z"/>
                </svg>`
                : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>`;
    },

    nextStep(nextPage) {
        window.location.href = nextPage;
    },

    // FIXED: No more history loop issues
    backStep() {
        const path = window.location.pathname;
        const fileName = path.split('/').pop();

        const routes = {
            'step2.html': 'step1.html',
            'step3.html': 'step2.html',
            'step4.html': 'step3.html',
            'step5.html': 'step4.html'
        };

        if (routes[fileName]) {
            window.location.href = routes[fileName];
        }
    },

    // FIXED: Safe step routing
    checkProgress() {
        const path = window.location.pathname;
        const fileName = path.split('/').pop();
        const data = this.getData();

        // Ignore non-step pages
        if (!fileName.startsWith('step')) return;

        // Step1 always allowed
        if (fileName === 'step1.html') return;

        // Step2+ requires profile basics
        if (
            ['step2.html', 'step3.html', 'step4.html', 'step5.html'].includes(fileName)
            && !data.nombre
        ) {
            window.location.replace('step1.html');
            return;
        }

        // Step3+ requires health data
        if (
            ['step3.html', 'step4.html', 'step5.html'].includes(fileName)
            && !('condiciones' in data || 'medicamentos' in data)
        ) {
            window.location.replace('step2.html');
            return;
        }

        // Step4+ requires SOS contact
        if (
            ['step4.html', 'step5.html'].includes(fileName)
            && !data.contacto_nombre
        ) {
            window.location.replace('step3.html');
            return;
        }
    },

    maskId(id) {
        if (!id) return '...';

        return id.length > 8
            ? id.substring(0, 4) +
                  '...' +
                  id.substring(id.length - 2)
            : id;
    }
};

/**
 * Dashboard Controller
 */
const Dashboard = {
    session: null,
    profile: null,

    async init() {
        this.session =
            await InfoVial.requireAuth();

        if (!this.session) return;

        const urlParams =
            new URLSearchParams(
                window.location.search
            );

        if (
            urlParams.get('action') ===
            'complete_registration'
        ) {
            await this.finalizeRegistration();
            return;
        }

        if (!navigator.onLine) {
            this.showOfflineError?.();
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
        const regData =
            InfoVial.getData();

        if (!regData.pending_profile) {
            window.location.href =
                'dashboard.html';
            return;
        }

        this.showLoading(
            true,
            'Finalizando activación...'
        );

        try {
            const public_slug =
                crypto.randomUUID();

            const vital_id =
                'IV-' +
                Math.random()
                    .toString(36)
                    .substring(2, 7)
                    .toUpperCase();

            const { error } =
                await supabaseClient
                    .from('profiles')
                    .insert({
                        user_id:
                            this.session.user.id,
                        nombre:
                            regData.nombre,
                        edad:
                            regData.edad,
                        sangre:
                            regData.sangre,
                        condiciones:
                            regData.condiciones,
                        medicamentos:
                            regData.medicamentos,
                        contacto_nombre:
                            regData.contacto_nombre,
                        contacto_relacion:
                            regData.contacto_relacion,
                        telefono_emergencia:
                            regData.telefono_emergencia,
                        ciudad:
                            regData.ciudad,
                        eps:
                            regData.eps,
                        public_slug,
                        vital_id
                    });

            if (error) throw error;

            InfoVial.clearData();

            window.location.href =
                'step5.html?s=' +
                public_slug;
        } catch (err) {
            console.error(
                'Finalization Error:',
                err
            );

            alert(
                'Error al activar perfil: ' +
                    err.message
            );

            this.showNoProfileUI();
        } finally {
            this.showLoading(false);
        }
    },

    async loadProfile() {
        try {
            const { data, error } =
                await supabaseClient
                    .from('profiles')
                    .select('*')
                    .eq(
                        'user_id',
                        this.session.user.id
                    )
                    .maybeSingle();

            if (error) throw error;

            this.profile = data;
        } catch (err) {
            console.error(
                'Core Profile Load Error:',
                err
            );
        }
    }
};

// Global Listeners
document.addEventListener(
    'DOMContentLoaded',
    () => {
        InfoVial.initTheme();

        const path =
            window.location.pathname;

        const isDashboard =
            path.includes(
                'dashboard.html'
            );

        const isStep =
            /step\d/.test(path);

        if (isDashboard) {
            Dashboard.init();
        }

        // FIXED: safe execution
        if (isStep) {
            try {
                InfoVial.checkProgress();
            } catch (err) {
                console.error(
                    'Step navigation error:',
                    err
                );
            }
        }

        // Auth Lifecycle Manager
        if (
            typeof supabaseClient !==
            'undefined'
        ) {
            supabaseClient.auth.onAuthStateChange(
                (event) => {
                    if (
                        event ===
                            'SIGNED_OUT' &&
                        (isDashboard ||
                            isStep)
                    ) {
                        window.location.href =
                            'index.html';
                    }
                }
            );
        }
    }
);