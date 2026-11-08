// Service Push Notification Netora v2 (Expo Push API / FCM Android)
// Mendukung pengiriman notifikasi broadcast dan personal ke smartphone pengguna

const fs = require('fs');
const path = require('path');
const { supabase } = require('../database/supabase');

// File fallback lokal untuk token jika tabel Supabase belum dibuat atau sedang migrasi
const FALLBACK_TOKENS_FILE = path.join(__dirname, '..', 'database', 'device_tokens.json');

// Pastikan file fallback aman
function loadLocalTokens() {
  try {
    if (fs.existsSync(FALLBACK_TOKENS_FILE)) {
      const raw = fs.readFileSync(FALLBACK_TOKENS_FILE, 'utf-8');
      return JSON.parse(raw) || [];
    }
  } catch (e) {}
  return [];
}

function saveLocalTokens(tokens) {
  try {
    const dir = path.dirname(FALLBACK_TOKENS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(FALLBACK_TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
  } catch (e) {}
}

/**
 * Menyimpan atau memperbarui device_push_token pengguna
 * @param {Object} param0
 * @param {string} param0.token - Push token (cth: ExponentPushToken[xxx] atau FCM Token)
 * @param {string} [param0.platform] - 'android' atau 'ios'
 * @param {number|string|null} [param0.userId] - ID user jika sudah login
 */
async function saveDeviceToken({ token, platform = 'android', userId = null }) {
  if (!token || typeof token !== 'string') {
    return { success: false, error: 'Token tidak valid' };
  }

  const cleanToken = token.trim();
  const parsedUserId = userId && !isNaN(Number(userId)) ? Number(userId) : null;

  // 1. Simpan ke Supabase (Tabel: user_device_tokens)
  try {
    const { data, error } = await supabase
      .from('user_device_tokens')
      .upsert(
        {
          token: cleanToken,
          platform: platform || 'android',
          user_id: parsedUserId,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'token' }
      )
      .select();

    if (!error) {
      // Jika ada userId, update juga kolom push_token di tabel users jika kolom tersedia
      if (parsedUserId) {
        try {
          await supabase
            .from('users')
            .update({ push_token: cleanToken })
            .eq('id', parsedUserId);
        } catch (e) {}
      }

      return { success: true, token: cleanToken, source: 'supabase' };
    }
  } catch (err) {
    // Lanjut ke fallback jika tabel belum tersedia di database
  }

  // 2. Fallback: Simpan ke local cache JSON agar notifikasi tetap 100% berfungsi
  try {
    let localTokens = loadLocalTokens();
    const existingIndex = localTokens.findIndex(item => item.token === cleanToken);

    const tokenObj = {
      token: cleanToken,
      platform: platform || 'android',
      user_id: parsedUserId,
      updated_at: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      localTokens[existingIndex] = tokenObj;
    } else {
      localTokens.push(tokenObj);
    }

    saveLocalTokens(localTokens);
    return { success: true, token: cleanToken, source: 'fallback_file' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Mengambil seluruh token perangkat yang valid dari database dan cache lokal
 * @returns {Promise<Array<string>>}
 */
async function getAllValidDeviceTokens() {
  const tokenSet = new Set();

  // 1. Ambil dari Supabase tabel user_device_tokens
  try {
    const { data, error } = await supabase
      .from('user_device_tokens')
      .select('token');

    if (!error && Array.isArray(data)) {
      data.forEach(row => {
        if (row && row.token) tokenSet.add(row.token.trim());
      });
    }
  } catch (e) {}

  // 2. Ambil dari kolom users.push_token (jika ada)
  try {
    const { data: users, error: userErr } = await supabase
      .from('users')
      .select('push_token')
      .not('push_token', 'is', null);

    if (!userErr && Array.isArray(users)) {
      users.forEach(u => {
        if (u && u.push_token) tokenSet.add(u.push_token.trim());
      });
    }
  } catch (e) {}

  // 3. Gabungkan dengan fallback local cache
  const localTokens = loadLocalTokens();
  localTokens.forEach(t => {
    if (t && t.token) tokenSet.add(t.token.trim());
  });

  return Array.from(tokenSet);
}

/**
 * Mengirim Push Notification ke seluruh perangkat HP yang terdaftar
 * Menggunakan Expo Push Notification API v2
 * @param {Object} param0
 * @param {string} param0.title - Judul Notifikasi (cth: "Pengumuman Baru: Jadwal Ujian")
 * @param {string} param0.body - Isi Pesan Notifikasi
 * @param {Object} [param0.data] - Metadata tambahan (id, tipe, link halaman)
 */
async function sendPushNotification({ title, body, data = {} }) {
  try {
    const tokens = await getAllValidDeviceTokens();

    if (!tokens || tokens.length === 0) {
      console.log('ℹ️ [PUSH NOTIF] Belum ada perangkat yang mendaftarkan push token.');
      return { success: false, count: 0, reason: 'Belum ada token perangkat terdaftar' };
    }

    // Format pesan standar Expo Push Notification
    const messages = tokens.map(token => ({
      to: token,
      sound: 'default',
      title: title || 'Netora TKJ',
      body: body || 'Ada pembaruan baru di platform Netora.',
      data: {
        ...data,
        url: data.url || 'https://netora.web.id/beranda.html',
        timestamp: Date.now()
      },
      priority: 'high',
      channelId: 'default'
    }));

    // Expo menyarankan pengiriman dalam batch maksimal 100 pesan per request
    const CHUNK_SIZE = 100;
    const chunks = [];
    for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
      chunks.push(messages.slice(i, i + CHUNK_SIZE));
    }

    let successCount = 0;
    let errorCount = 0;

    for (const chunk of chunks) {
      try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chunk)
        });

        const result = await response.json();
        if (response.ok && result && result.data) {
          successCount += chunk.length;
        } else {
          errorCount += chunk.length;
          console.warn('⚠️ [PUSH NOTIF WARNING] Respons Expo:', result);
        }
      } catch (postErr) {
        errorCount += chunk.length;
        console.error('❌ [PUSH NOTIF ERROR] Gagal mengirim chunk:', postErr.message);
      }
    }

    console.log(`\n┌────────────────────────────────────────────────────────┐`);
    console.log(`│ 🔔 [PUSH NOTIFICATION SENT]                             │`);
    console.log(`│ Judul  : ${(title || '').slice(0, 44).padEnd(44)} │`);
    console.log(`│ Sukses : ${String(successCount).padEnd(44)} │`);
    console.log(`│ Total  : ${String(tokens.length).padEnd(44)} │`);
    console.log(`└────────────────────────────────────────────────────────┘\n`);

    return {
      success: true,
      totalTokens: tokens.length,
      successCount,
      errorCount
    };
  } catch (err) {
    console.error('❌ [PUSH NOTIFICATION CRITICAL ERROR]:', err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  saveDeviceToken,
  getAllValidDeviceTokens,
  sendPushNotification
};

