const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabase');

// In-memory cache untuk pengumuman (30 detik) agar respons instan dan hemat kuota DB
let _pengumumanCache = null;
let _pengumumanCacheTime = 0;
const CACHE_TTL_MS = 30000;

// GET /api/pengumuman (Akses Baca Pengumuman)
router.get('/', async (req, res) => {
  const now = Date.now();
  if (_pengumumanCache && (now - _pengumumanCacheTime < CACHE_TTL_MS)) {
    return res.json({ success: true, pengumuman: _pengumumanCache });
  }

  try {
    const { data: list, error } = await supabase
      .from('pengumuman')
      .select('*')
      .order('penting', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      // Jika terjadi error koneksi tetapi masih ada cache lama, gunakan cache lama
      if (_pengumumanCache) {
        return res.json({ success: true, pengumuman: _pengumumanCache });
      }
      console.error('Fetch Pengumuman Supabase Error:', error.message || error);
      return res.status(500).json({ error: 'Gagal memuat pengumuman.' });
    }

    _pengumumanCache = list || [];
    _pengumumanCacheTime = now;

    return res.json({ success: true, pengumuman: _pengumumanCache });
  } catch (err) {
    if (_pengumumanCache) {
      return res.json({ success: true, pengumuman: _pengumumanCache });
    }
    console.error('Fetch Pengumuman Error:', err.message || err);
    return res.status(500).json({ error: 'Gagal memuat pengumuman.' });
  }
});

// GET /api/pengumuman/:id (Detail Pengumuman)
router.get('/:id', async (req, res) => {
  try {
    const { data: item, error } = await supabase
      .from('pengumuman')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error || !item) {
      return res.status(404).json({ error: 'Pengumuman tidak ditemukan.' });
    }
    return res.json({ success: true, pengumuman: item });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal memuat pengumuman.' });
  }
});

function invalidatePengumumanCache() {
  _pengumumanCache = null;
  _pengumumanCacheTime = 0;
}

router.invalidateCache = invalidatePengumumanCache;

module.exports = router;
