// [DEPRECATED] File ini sebelumnya digunakan untuk SQLite lokal.
// Database Netora v2 sekarang telah dimigrasikan secara penuh ke Supabase PostgreSQL.
// Silakan gunakan database/supabase.js untuk koneksi database.

const { supabase } = require('./supabase');

module.exports = {
  supabase,
  // Helper dummy untuk kompatibilitas jika ada modul lama yang memanggil
  initDb: () => {
    console.log('ℹ️ Netora kini aktif menggunakan Supabase Cloud Database.');
  }
};
