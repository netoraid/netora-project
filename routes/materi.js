const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabase');

// GET /api/materi (Akses Baca Materi)
router.get('/', async (req, res) => {
  try {
    const { data: list, error } = await supabase
      .from('materi')
      .select('id, judul, kategori, isi, created_at')
      .order('id', { ascending: true });

    if (error) {
      console.error('Fetch Materi Supabase Error:', error);
      return res.status(500).json({ error: 'Gagal memuat materi.' });
    }

    const mapped = (list || []).map(item => ({
      id: item.id,
      judul: item.judul,
      kategori: item.kategori,
      preview: (item.isi || '').substring(0, 100),
      created_at: item.created_at
    }));

    return res.json({ success: true, materi: mapped });
  } catch (err) {
    console.error('Fetch Materi Error:', err);
    return res.status(500).json({ error: 'Gagal memuat materi.' });
  }
});

// GET /api/materi/:id (Detail Materi)
router.get('/:id', async (req, res) => {
  try {
    const { data: materi, error } = await supabase
      .from('materi')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error || !materi) {
      return res.status(404).json({ error: 'Materi tidak ditemukan.' });
    }
    return res.json({ success: true, materi });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal memuat detail materi.' });
  }
});

module.exports = router;
