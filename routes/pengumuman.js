const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabase');

// GET /api/pengumuman (Akses Baca Pengumuman)
router.get('/', async (req, res) => {
  try {
    const { data: list, error } = await supabase
      .from('pengumuman')
      .select('*')
      .order('penting', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch Pengumuman Supabase Error:', error);
      return res.status(500).json({ error: 'Gagal memuat pengumuman.' });
    }

    return res.json({ success: true, pengumuman: list || [] });
  } catch (err) {
    console.error('Fetch Pengumuman Error:', err);
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

module.exports = router;
