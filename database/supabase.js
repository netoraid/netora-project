// Supabase Client Setup untuk Backend Express Netora
// Pastikan package '@supabase/supabase-js' dan 'dotenv' terinstall:
// npm install @supabase/supabase-js dotenv

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || '';
// Untuk backend/server-side operasi (bypass RLS untuk admin, manipulasi user/score),
// disarankan menggunakan SERVICE_ROLE_KEY. Jika belum ada, gunakan ANON_KEY.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ [SUPABASE WARNING] SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum disetel di file .env');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

module.exports = { supabase };
