// Service Pengaturan Global & Batas Waktu Belajar Netora v2
// Dual-layer persistence: Supabase PostgreSQL (app_settings) + Fallback File Lokal (database/settings.json)

const fs = require('fs');
const path = require('path');
const { supabase } = require('../database/supabase');

const SETTINGS_FILE = path.join(__dirname, '..', 'database', 'settings.json');

const DEFAULT_DURASI_SETTING = {
  enabled: true,
  max_duration_minutes: 60,
  mode: 'harian', // 'harian' (reset tiap hari 00:00) | 'sesi' (dihitung per sesi login aktif)
  pesan: 'Kamu telah belajar melebihi batas waktu yang dianjurkan oleh Guru & Administrator. Istirahatkan matamu sejenak (aturan 20-20-20), minum air putih, dan lakukan relaksasi tubuh sebelum melanjutkan belajar!',
  snooze_minutes: 10,
  updated_at: new Date().toISOString()
};

// Helper baca dari file lokal
function readLocalSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.durasi_belajar === 'object') {
        return { ...DEFAULT_DURASI_SETTING, ...parsed.durasi_belajar };
      }
    }
  } catch (err) {
    console.warn('⚠️ [SETTINGS] Gagal membaca settings.json lokal:', err.message);
  }
  return { ...DEFAULT_DURASI_SETTING };
}

// Helper simpan ke file lokal
function saveLocalSettings(durasiSetting) {
  try {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    let allSettings = {};
    if (fs.existsSync(SETTINGS_FILE)) {
      try {
        allSettings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')) || {};
      } catch (e) {}
    }
    allSettings.durasi_belajar = durasiSetting;
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(allSettings, null, 2), 'utf-8');
  } catch (err) {
    console.error('❌ [SETTINGS] Gagal menulis settings.json lokal:', err.message);
  }
}

// Ambil Pengaturan Durasi Belajar
async function getDurasiSetting() {
  try {
    // 1. Coba baca dari Supabase tabel app_settings
    const { data, error } = await supabase
      .from('app_settings')
      .select('value, updated_at')
      .eq('key', 'durasi_belajar')
      .maybeSingle();

    if (!error && data && data.value) {
      const merged = { ...DEFAULT_DURASI_SETTING, ...data.value };
      if (data.updated_at) merged.updated_at = data.updated_at;
      // Sinkronkan ke lokal sebagai cache
      saveLocalSettings(merged);
      return merged;
    }
  } catch (err) {
    // Supabase error / tabel belum dibuat, fallback otomatis ke lokal
  }

  // 2. Fallback ke file lokal jika Supabase gagal/tabel belum ada
  return readLocalSettings();
}

// Update Pengaturan Durasi Belajar (Admin)
async function updateDurasiSetting(input) {
  const current = await getDurasiSetting();

  const cleanSettings = {
    enabled: typeof input.enabled === 'boolean' ? input.enabled : current.enabled,
    max_duration_minutes: Math.max(1, Math.min(1440, parseInt(input.max_duration_minutes, 10) || current.max_duration_minutes || 60)),
    mode: input.mode === 'sesi' ? 'sesi' : 'harian',
    pesan: (input.pesan && String(input.pesan).trim()) || current.pesan || DEFAULT_DURASI_SETTING.pesan,
    snooze_minutes: Math.max(1, Math.min(120, parseInt(input.snooze_minutes, 10) || current.snooze_minutes || 10)),
    updated_at: new Date().toISOString()
  };

  // 1. Simpan segera ke file lokal
  saveLocalSettings(cleanSettings);

  // 2. Coba simpan ke Supabase jika tabel app_settings tersedia
  try {
    await supabase
      .from('app_settings')
      .upsert({
        key: 'durasi_belajar',
        value: cleanSettings,
        updated_at: new Date()
      });
  } catch (err) {
    console.warn('⚠️ [SETTINGS] Catatan: Sinkronisasi cloud Supabase (app_settings) ditunda, data tersimpan di storage server.');
  }

  return cleanSettings;
}

module.exports = {
  getDurasiSetting,
  updateDurasiSetting,
  DEFAULT_DURASI_SETTING
};
