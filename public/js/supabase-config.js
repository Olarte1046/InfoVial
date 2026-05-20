const SUPABASE_URL = 'https://qrhrjtuifgukemkqwhar.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyaHJqdHVpZmd1a2Vta3F3aGFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NDEyNDcsImV4cCI6MjA5MzUxNzI0N30.HZAbrHiKRdIjRwYmlZibXU_iJIyoqDtl0dSlY-_l4NY';

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true
        }
    }
);

window.supabaseClient = supabaseClient;