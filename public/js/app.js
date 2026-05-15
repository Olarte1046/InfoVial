/**
 * InfoVial Persistence & Navigation Helper
 */
const InfoVial = {
    storageKey: 'infovial_registration_data',

    // Load data from localStorage
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

    // Save data to localStorage
    saveData(data) {
        const currentData = this.getData();
        const newData = { ...currentData, ...data };
        localStorage.setItem(this.storageKey, JSON.stringify(newData));
    },

    // Clear data
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

    // Navigation helper
    nextStep(nextPage) {
        window.location.href = nextPage;
    },

    backStep() {
        window.history.back();
    },

    // Guard to ensure user doesn't skip steps
    checkProgress() {
        const data = this.getData();
        const path = window.location.pathname;

        if (path.includes('step2') && !data.nombre) window.location.href = 'step1.html';
        if (path.includes('step3') && !data.nombre) window.location.href = 'step1.html';
        if (path.includes('step4') && !data.nombre) window.location.href = 'step1.html';
        if (path.includes('step5') && !localStorage.getItem('infovial_last_id')) window.location.href = 'index.html';
    },

    // Mask ID for privacy
    maskId(id) {
        if (!id) return '...';
        return id.length > 10 ? id.substring(0, 7) + '...' + id.substring(id.length - 2) : id;
    }
};

/**
 * Dashboard Logic Controller
 */
const Dashboard = {
    currentId: localStorage.getItem('infovial_last_id'),
    profile: null,

    async init() {
        if (!this.currentId) {
            window.location.href = 'index.html';
            return;
        }
        await this.loadProfile();
        this.render();
    },

    async loadProfile() {
        if (!typeof supabaseClient !== 'undefined') return;
        try {
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('vital_id', this.currentId)
                .single();

            if (error) throw error;
            this.profile = data;
        } catch (err) {
            console.error('Error loading profile:', err);
        }
    },

    render() {
        if (!this.profile) return;
        const p = this.profile;

        // Header
        document.getElementById('dash-name').textContent = p.nombre;
        document.getElementById('dash-meta').textContent = `${p.edad} años • ${p.ciudad || 'Sin ciudad'}`;
        document.getElementById('dash-blood').textContent = p.sangre;

        // Sections
        document.getElementById('val-nombre').textContent = p.nombre;
        document.getElementById('val-edad').textContent = p.edad;
        document.getElementById('val-eps').textContent = p.eps || 'No registrada';

        document.getElementById('val-condiciones').textContent = p.condiciones || 'Ninguna';
        document.getElementById('val-meds').textContent = p.medicamentos || 'Ninguno';

        document.getElementById('val-contacto').textContent = p.contacto_nombre;
        document.getElementById('val-relacion').textContent = p.contacto_relacion;
        document.getElementById('val-tel').textContent = p.telefono_emergencia;

        // Masked ID
        document.getElementById('masked-vial-id').textContent = InfoVial.maskId(p.vital_id);
    },

    openModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.add('active');
            // Fill inputs if editing
            if (id === 'modal-identity') {
                document.getElementById('edit-nombre').value = this.profile.nombre;
                document.getElementById('edit-edad').value = this.profile.edad;
                document.getElementById('edit-eps').value = this.profile.eps || '';
            }
        }
    },

    closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.remove('active');
    },

    async updateProfile(formData) {
        try {
            const { error } = await supabaseClient
                .from('profiles')
                .update(formData)
                .eq('vital_id', this.currentId);

            if (error) throw error;

            this.profile = { ...this.profile, ...formData };
            this.render();
            alert('Perfil actualizado con éxito');
        } catch (err) {
            alert('Error al actualizar: ' + err.message);
        }
    },

    async deleteProfile() {
        if (!confirm('¿Estás SEGURO de que deseas eliminar tu perfil médico permanentemente? Esta acción no se puede deshacer.')) return;

        try {
            const { error } = await supabaseClient
                .from('profiles')
                .delete()
                .eq('vital_id', this.currentId);

            if (error) throw error;

            localStorage.removeItem('infovial_last_id');
            InfoVial.clearData();
            alert('Perfil eliminado correctamente');
            window.location.href = 'index.html';
        } catch (err) {
            alert('Error al eliminar: ' + err.message);
        }
    }
};

// Initializations
document.addEventListener('DOMContentLoaded', () => {
    InfoVial.initTheme();

    // Dashboard init if page matches
    if (window.location.pathname.includes('dashboard.html')) {
        Dashboard.init();
    }

    // Auto-check on registration steps
    const isStep = /step\d/.test(window.location.pathname);
    if (isStep) {
        InfoVial.checkProgress();
    }
});
