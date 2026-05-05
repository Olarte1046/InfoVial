/**
 * InfoVital Persistence & Navigation Helper
 */
const InfoVital = {
    storageKey: 'infovital_registration_data',

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
            contacto_relacion: ''
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
    }
};

/**
 * Supabase Initialization
 */
let supabase;
if (typeof SUPABASE_URL !== 'undefined') {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
