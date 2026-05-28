/**
 * InfoVial Core Engine
 * Production Grade Authentication & Navigation
 */

const InfoVial = {
    storageKey: 'infovial_registration_data',

    getData() {
        const data =
            localStorage.getItem(
                this.storageKey
            );

        return data
            ? JSON.parse(data)
            : {};
    },

    saveData(data) {
        const currentData =
            this.getData();

        const newData = {
            ...currentData,
            ...data
        };

        localStorage.setItem(
            this.storageKey,
            JSON.stringify(newData)
        );
    },

    clearData() {
        localStorage.removeItem(
            this.storageKey
        );
    },

    async getSession() {
        if (
            typeof supabaseClient ===
            'undefined'
        )
            return null;

        const {
            data: { session },
            error
        } =
            await supabaseClient.auth.getSession();

        if (error) {
            console.error(
                'Auth Session Error:',
                error.message
            );
        }

        return session;
    },

    async requireAuth() {
        const session =
            await this.getSession();

        if (!session) {
            const currentPath =
                window.location.pathname;

            if (
                currentPath.includes(
                    'dashboard.html'
                )
            ) {
                window.location.href =
                    'login.html?redirect=dashboard';
            }
        }

        return session;
    },

    initTheme() {
        const savedTheme =
            localStorage.getItem(
                'infovial_theme'
            ) || 'light';

        document.documentElement.setAttribute(
            'data-theme',
            savedTheme
        );

        this.updateThemeToggleIcon(
            savedTheme
        );
    },

    toggleTheme() {
        const currentTheme =
            document.documentElement.getAttribute(
                'data-theme'
            );

        const newTheme =
            currentTheme === 'dark'
                ? 'light'
                : 'dark';

        document.documentElement.setAttribute(
            'data-theme',
            newTheme
        );

        localStorage.setItem(
            'infovial_theme',
            newTheme
        );

        this.updateThemeToggleIcon(
            newTheme
        );
    },

    updateThemeToggleIcon(theme) {
        const toggle =
            document.querySelector(
                '.theme-toggle'
            );

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
        window.location.href =
            nextPage;
    },

    backStep() {
        const path =
            window.location.pathname;

        const fileName =
            path.split('/').pop();

        const routes = {
            'step2.html':
                'step1.html',
            'step3.html':
                'step2.html',
            'step4.html':
                'step3.html',
            'step5.html':
                'step4.html'
        };

        if (
            routes[fileName]
        ) {
            window.location.href =
                routes[fileName];
        }
    },

    checkProgress() {
        const path =
            window.location.pathname;

        const fileName =
            path.split('/').pop();

        const data =
            this.getData();

        if (
            !fileName.startsWith(
                'step'
            )
        )
            return;

        if (
            fileName ===
            'step1.html'
        )
            return;

        if (
            [
                'step2.html',
                'step3.html',
                'step4.html',
                'step5.html'
            ].includes(fileName) &&
            !data.nombre
        ) {
            window.location.replace(
                'step1.html'
            );

            return;
        }

        if (
            [
                'step3.html',
                'step4.html',
                'step5.html'
            ].includes(fileName) &&
            !(
                'condiciones' in
                data ||
                'medicamentos' in
                data
            )
        ) {
            window.location.replace(
                'step2.html'
            );

            return;
        }

        if (
            [
                'step4.html',
                'step5.html'
            ].includes(fileName) &&
            !data.contacto_nombre
        ) {
            window.location.replace(
                'step3.html'
            );

            return;
        }
    },

    maskId(id) {
        if (!id)
            return '...';

        return id.length > 8
            ? `${id.substring(
                0,
                4
            )}...${id.substring(
                id.length - 2
            )}`
            : id;
    }
};

const Dashboard = {
    session: null,
    profile: null,

    async init() {
        if (this._isInitializing) return;
        this._isInitializing = true;

        this.showLoading(
            true,
            'Verificando acceso...'
        );

        try {

            // Esperar a que Supabase termine de restaurar sesión
            const {
                data: { session }
            } = await supabaseClient.auth.getSession();

            if (session) {
                this.session = session;
            } else {
                await new Promise(
                    (resolve) => {
                        const {
                            data: { subscription }
                        } = supabaseClient.auth.onAuthStateChange(
                            (event, newSession) => {
                                if (newSession) {
                                    this.session = newSession;
                                    subscription.unsubscribe();
                                    resolve();
                                }
                            }
                        );

                        setTimeout(() => {
                            if (subscription) {
                                subscription.unsubscribe();
                            }
                            resolve();
                        }, 6000);
                    }
                );
            }

            if (!this.session) {
                window.location.href =
                    'login.html';
                return;
            }

            const urlParams =
                new URLSearchParams(
                    window.location.search
                );

            const shouldComplete =
                urlParams.get(
                    'action'
                ) ===
                'complete_registration';

            if (
                shouldComplete
            ) {

                // Try localStorage first, fall back to user_metadata
                // (user_metadata survives cross-device magic link opens)
                let regData = InfoVial.getData();

                console.log('Auth Action: complete_registration detected');

                if (!regData?.nombre) {
                    console.log('No local data found, checking user_metadata...');
                    const meta = this.session.user.user_metadata || {};

                    if (meta.nombre) {
                        console.log('Found registration names in metadata:', meta.nombre);
                        regData = {
                            nombre: meta.nombre || '',
                            edad: meta.edad || null,
                            sangre: meta.sangre || '',
                            condiciones: meta.condiciones || '',
                            medicamentos: meta.medicamentos || '',
                            contacto_nombre: meta.contacto_nombre || '',
                            contacto_relacion: meta.contacto_relacion || '',
                            telefono_emergencia: meta.telefono_emergencia || '',
                            ciudad: meta.ciudad || '',
                            eps: meta.eps || ''
                        };
                    } else {
                        console.warn('Critical: No registration data in metadata either.');
                    }
                }

                // Prevent double insert
                const {
                    data: existing
                } =
                    await supabaseClient
                        .from(
                            'profiles'
                        )
                        .select(
                            'id'
                        )
                        .eq(
                            'user_id',
                            this.session
                                .user.id
                        )
                        .limit(1)
                        .maybeSingle();

                if (
                    !existing &&
                    regData?.nombre
                ) {
                    await this.finalizeRegistration(
                        regData
                    );
                }

                window.history.replaceState(
                    {},
                    '',
                    '/dashboard.html'
                );
            }

            await this.loadProfile();

            this.showLoading(
                false
            );

            if (
                this.profile
            ) {
                this.render();
            } else {
                this.showNoProfileUI();
            }

        } catch (err) {

            console.error(
                'Dashboard Init Error:',
                err
            );

            this.showLoading(
                false
            );
        }
    },

    async finalizeRegistration(
        externalData
    ) {
        if (this._isFinalizing) return;
        this._isFinalizing = true;

        // Use provided data, localStorage, or user_metadata
        let regData =
            externalData ||
            InfoVial.getData();

        if (!regData?.nombre) {
            const meta =
                this.session?.user
                    ?.user_metadata;

            if (meta?.nombre) {
                regData = {
                    nombre:
                        meta.nombre || '',
                    edad:
                        meta.edad || null,
                    sangre:
                        meta.sangre || '',
                    condiciones:
                        meta.condiciones || '',
                    medicamentos:
                        meta.medicamentos || '',
                    contacto_nombre:
                        meta.contacto_nombre || '',
                    contacto_relacion:
                        meta.contacto_relacion || '',
                    telefono_emergencia:
                        meta.telefono_emergencia || '',
                    ciudad:
                        meta.ciudad || '',
                    eps:
                        meta.eps || ''
                };
            }
        }

        if (!regData?.nombre) {
            this._isFinalizing = false;
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
                            regData.nombre || '',

                        edad:
                            regData.edad || null,

                        sangre:
                            regData.sangre || '',

                        condiciones:
                            regData.condiciones || '',

                        medicamentos:
                            regData.medicamentos || '',

                        contacto_nombre:
                            regData.contacto_nombre || '',

                        contacto_relacion:
                            regData.contacto_relacion || '',

                        telefono_emergencia:
                            regData.telefono_emergencia || '',

                        ciudad:
                            regData.ciudad || '',

                        eps:
                            regData.eps || '',

                        public_slug,
                        vital_id
                    });

            if (error) {
                throw error;
            }

            InfoVial.clearData();

            window.history.replaceState(
                {},
                '',
                '/dashboard.html'
            );

            await this.loadProfile();

            this.showLoading(
                false
            );

            this.render();
        } catch (err) {
            console.error(
                'Registration Error:',
                err
            );

            this.showLoading(
                false
            );

            alert(
                'No se pudo finalizar el registro.'
            );
        }
    },

    async loadProfile() {
        try {
            const {
                data,
                error
            } =
                await supabaseClient
                    .from('profiles')
                    .select('*')
                    .eq(
                        'user_id',
                        this.session.user.id
                    )
                    .limit(1)
                    .maybeSingle();

            if (error)
                throw error;

            this.profile =
                data;
        } catch (err) {
            console.error(
                'Profile Error:',
                err
            );
        }
    },

    showLoading(
        show,
        text = 'Cargando...'
    ) {
        let loader =
            document.getElementById(
                'dashboard-loader'
            );

        if (!loader) {
            loader =
                document.createElement(
                    'div'
                );

            loader.id =
                'dashboard-loader';

            loader.style.cssText =
                `
                position:fixed;
                inset:0;
                background:rgba(255,255,255,.85);
                backdrop-filter:blur(10px);
                display:flex;
                justify-content:center;
                align-items:center;
                z-index:99999;
            `;

            loader.innerHTML =
                `
                <div style="text-align:center">
                    <div style="
                        width:38px;
                        height:38px;
                        border:3px solid rgba(0,82,255,.15);
                        border-top-color:#0052FF;
                        border-radius:50%;
                        animation:spin .7s linear infinite;
                        margin:auto auto 12px;
                    "></div>
                    <div id="loader-text">
                        ${text}
                    </div>
                </div>
            `;

            document.body.appendChild(
                loader
            );

            const style =
                document.createElement(
                    'style'
                );

            style.innerHTML =
                `
                @keyframes spin{
                    to{
                        transform:rotate(360deg)
                    }
                }
            `;

            document.head.appendChild(
                style
            );
        }

        document.getElementById(
            'loader-text'
        ).textContent =
            text;

        loader.style.display =
            show
                ? 'flex'
                : 'none';
    },

    render() {
        const p =
            this.profile;

        if (!p)
            return;

        const set =
            (
                id,
                value
            ) => {
                const el =
                    document.getElementById(
                        id
                    );

                if (el) {
                    el.textContent =
                        value ||
                        'No definido';
                }
            };

        set(
            'dash-name',
            p.nombre
        );
        set(
            'dash-meta',
            `${p.edad || '--'} años`
        );
        set(
            'dash-blood',
            p.sangre
        );
        set(
            'dash-vial-id',
            p.vital_id
        );
        set(
            'val-nombre',
            p.nombre
        );
        set(
            'val-edad',
            p.edad
        );
        set(
            'val-eps',
            p.eps
        );
        set(
            'val-condiciones',
            p.condiciones
        );
        set(
            'val-meds',
            p.medicamentos
        );
        set(
            'val-contacto',
            p.contacto_nombre
        );
        set(
            'val-relacion',
            p.contacto_relacion
        );
        set(
            'val-tel',
            p.telefono_emergencia
        );
    },

    showNoProfileUI() {
        document.getElementById(
            'dash-name'
        ).textContent =
            'Perfil no encontrado';

        document.getElementById(
            'dash-meta'
        ).textContent =
            'Completa tu perfil';

        const actionGrid =
            document.querySelector(
                '.action-grid'
            );

        if (actionGrid) {
            actionGrid.innerHTML = `
                <div style="
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 32px 24px;
                ">
                    <p style="
                        color: var(--text-muted);
                        font-size: 14px;
                        margin-bottom: 16px;
                    ">
                        No se encontraron datos de perfil.
                        Inicia el registro para crear tu Vial-ID.
                    </p>
                    <a href="step1.html"
                        class="btn btn-primary"
                        style="max-width: 280px; margin: 0 auto;">
                        Crear perfil
                    </a>
                </div>
            `;
        }
    },

    openModal(id) {
        document.getElementById(
            id
        ).style.display =
            'flex';
    },

    closeModal(id) {
        document.getElementById(
            id
        ).style.display =
            'none';
    },

    async updateProfile(
        formData
    ) {
        try {
            this.showLoading(
                true,
                'Guardando...'
            );

            const {
                error
            } =
                await supabaseClient
                    .from(
                        'profiles'
                    )
                    .update(
                        formData
                    )
                    .eq(
                        'user_id',
                        this
                            .session
                            .user.id
                    );

            if (error)
                throw error;

            await this.loadProfile();

            this.render();
        } catch (err) {
            console.error(
                err
            );

            alert(
                'No se pudo actualizar.'
            );
        } finally {
            this.showLoading(
                false
            );
        }
    },

    shareProfile() {
        if (!this.profile?.public_slug) return;

        const url = `${window.location.origin}/u.html?s=${this.profile.public_slug}`;
        const shareText = `Mi perfil médico de emergencia InfoVial:\n${url}`;

        if (navigator.share) {
            navigator.share({
                title: 'InfoVial - Perfil de Emergencia',
                text: shareText
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(shareText);
            alert('Enlace del perfil copiado en el portapapeles');
        }
    },

    async logout() {
        await supabaseClient.auth.signOut();

        window.location.href =
            '/login.html';
    }
};

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
            /step\d/.test(
                path
            );

        if (
            isDashboard
        ) {
            Dashboard.init();
        }

        if (isStep) {
            try {
                InfoVial.checkProgress();
            } catch (
            err
            ) {
                console.error(
                    err
                );
            }
        }

        if (
            typeof supabaseClient !==
            'undefined'
        ) {
            supabaseClient.auth.onAuthStateChange(
                (
                    event
                ) => {
                    if (
                        event ===
                        'SIGNED_OUT' &&
                        (
                            isDashboard ||
                            isStep
                        )
                    ) {
                        window.location.href =
                            'index.html';
                    }
                }
            );
        }
    }
);