const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabase');

// Helper untuk mem-parse konten materi menjadi format halaman terstruktur
function parseMateriPages(item) {
  let pages = [];
  if (item && item.isi) {
    try {
      const parsed = JSON.parse(item.isi);
      if (Array.isArray(parsed) && parsed.length > 0) {
        pages = parsed.map((p, idx) => ({
          halaman: p.halaman || (idx + 1),
          judul: p.judul || `Halaman ${idx + 1}`,
          konten: p.konten || ''
        }));
      }
    } catch (e) {}
  }

  // Fallback jika berupa teks biasa (dianggap sebagai 1 halaman)
  if (pages.length === 0) {
    pages = [{
      halaman: 1,
      judul: item.judul || 'Materi Utama',
      konten: item.isi || ''
    }];
  }

  return {
    id: item.id,
    judul: item.judul,
    kategori: item.kategori,
    total_halaman: pages.length,
    pages_text: `${pages.length} halaman`,
    pages: pages,
    preview: (pages[0].konten || '').substring(0, 120),
    created_at: item.created_at
  };
}

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

    const mapped = (list || []).map(parseMateriPages);

    return res.json({ success: true, materi: mapped });
  } catch (err) {
    console.error('Fetch Materi Error:', err);
    return res.status(500).json({ error: 'Gagal memuat materi.' });
  }
});

// GET /api/materi/:id (Detail Materi dengan Halaman Lengkap)
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

    return res.json({ success: true, materi: parseMateriPages(materi) });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal memuat detail materi.' });
  }
});

module.exports = router;
