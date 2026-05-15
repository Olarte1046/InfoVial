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
    }
};

// Initializations
document.addEventListener('DOMContentLoaded', () => {
    InfoVial.initTheme();

    // Auto-check on load (if not on index or public profile)
    if (!window.location.pathname.includes('u/') && !window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
        InfoVial.checkProgress();
    }
});
