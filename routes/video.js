const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabase');

// Helper parser URL YouTube Universal (Mendukung desktop, mobile m.youtube, youtu.be, shorts, nocookie, direct ID)
function parseYouTubeLink(url) {
  if (!url) return { videoId: null, embedUrl: '', thumbnailUrl: '', directUrl: '' };
  const str = String(url).trim();
  let videoId = null;

  if (/^[\w-]{11}$/.test(str)) {
    videoId = str;
  } else {
    const regExp = /(?:(?:www\.|m\.)?youtube\.com\/(?:(?:watch\?(?:.*&)?v=)|(?:embed|v|shorts|live)\/)|youtu\.be\/|youtube-nocookie\.com\/embed\/)([\w-]{11})/i;
    const match = str.match(regExp);
    videoId = match ? match[1] : null;
  }

  if (!videoId) {
    return {
      videoId: null,
      embedUrl: str,
      thumbnailUrl: '',
      directUrl: str
    };
  }

  return {
    videoId,
    embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`,
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    directUrl: `https://www.youtube.com/watch?v=${videoId}`
  };
}

// GET /api/video (Akses Baca Video Siswa)
router.get('/', async (req, res) => {
  try {
    const { data: list, error } = await supabase
      .from('video')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Fetch Video Supabase Error:', error);
      return res.status(500).json({ error: 'Gagal memuat video.' });
    }

    const mapped = (list || []).map(v => {
      const yt = parseYouTubeLink(v.url_youtube);
      return {
        ...v,
        videoId: yt.videoId,
        thumbnail_url: yt.thumbnailUrl,
        url_youtube: yt.embedUrl || v.url_youtube,
        kategori: v.kategori || 'Mikrotik',
        durasi: v.durasi || '15:00'
      };
    });

    return res.json({ success: true, video: mapped });
  } catch (err) {
    console.error('Fetch Video Error:', err);
    return res.status(500).json({ error: 'Gagal memuat video.' });
  }
});

// POST /api/video (Tambah Video)
router.post('/', async (req, res) => {
  const { judul, deskripsi, url_youtube, kategori, durasi } = req.body;
  if (!judul || !url_youtube) {
    return res.status(400).json({ error: 'Judul dan URL YouTube wajib diisi.' });
  }

  const yt = parseYouTubeLink(url_youtube);
  const embedUrl = yt.embedUrl || url_youtube.trim();
  const kat = (kategori && kategori.trim()) ? kategori.trim() : 'Mikrotik';
  const dur = (durasi && durasi.trim()) ? durasi.trim() : '15:00';
  const desc = (deskripsi && deskripsi.trim()) ? deskripsi.trim() : '';

  try {
    const { data: created, error } = await supabase
      .from('video')
      .insert([
        {
          judul: judul.trim(),
          deskripsi: desc,
          url_youtube: embedUrl,
          kategori: kat,
          durasi: dur
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Tambah Video Supabase Error:', error);
      return res.status(500).json({ error: 'Gagal menambahkan vidio praktik.' });
    }

    return res.json({
      success: true,
      message: 'Vidio praktik berhasil ditambahkan!',
      id: created.id,
      thumbnail_url: yt.thumbnailUrl
    });
  } catch (err) {
    console.error('Tambah Video Error:', err);
    return res.status(500).json({ error: 'Gagal menambahkan vidio praktik.' });
  }
});

// PUT /api/video/:id (Update Video)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { judul, deskripsi, url_youtube, kategori, durasi } = req.body;

  if (!judul || !url_youtube) {
    return res.status(400).json({ error: 'Judul dan URL YouTube wajib diisi.' });
  }

  const yt = parseYouTubeLink(url_youtube);
  const embedUrl = yt.embedUrl || url_youtube.trim();
  const kat = (kategori && kategori.trim()) ? kategori.trim() : 'Mikrotik';
  const dur = (durasi && durasi.trim()) ? durasi.trim() : '15:00';
  const desc = (deskripsi && deskripsi.trim()) ? deskripsi.trim() : '';

  try {
    const { data: updated, error } = await supabase
      .from('video')
      .update({
        judul: judul.trim(),
        deskripsi: desc,
        url_youtube: embedUrl,
        kategori: kat,
        durasi: dur
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error || !updated) {
      return res.status(404).json({ error: 'Vidio tidak ditemukan atau gagal diperbarui.' });
    }

    return res.json({
      success: true,
      message: 'Vidio praktik berhasil diperbarui!',
      thumbnail_url: yt.thumbnailUrl
    });
  } catch (err) {
    console.error('Update Video Error:', err);
    return res.status(500).json({ error: 'Gagal memperbarui vidio praktik.' });
  }
});

// DELETE /api/video/:id (Hapus Video)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('video')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: 'Gagal menghapus vidio praktik.' });
    }

    return res.json({ success: true, message: 'Vidio praktik berhasil dihapus.' });
  } catch (err) {
    console.error('Hapus Video Error:', err);
    return res.status(500).json({ error: 'Gagal menghapus vidio praktik.' });
  }
});

module.exports = router;
