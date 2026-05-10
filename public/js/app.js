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

    // Navigation helper
    nextStep(nextPage) {
        window.location.href = nextPage;
    },

    // Guard to ensure user doesn't skip steps
    checkProgress() {
        const data = this.getData();
        const path = window.location.pathname;

        // Simple rules
        if (path.includes('step2') && !data.nombre) window.location.href = 'step1.html';
        if (path.includes('step3') && !data.nombre) window.location.href = 'step1.html';
        if (path.includes('step4') && !data.nombre) window.location.href = 'step1.html';
        if (path.includes('step5') && !localStorage.getItem('infovial_last_id')) window.location.href = 'index.html';
    }
};

// Auto-check on load (if not on index or public profile)
if (!window.location.pathname.includes('u/') && !window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
    InfoVial.checkProgress();
}
