// backend/data/supabase.js
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Cliente admin (com service role - para operações administrativas)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Cliente público (com anon key - para validação RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

module.exports = { supabase, supabaseAdmin };