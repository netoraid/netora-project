const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabase');
const { requireAuth } = require('../middleware/auth');
const { broadcastQuizSubmitted } = require('../services/socket');

// GET /api/quiz (Ambil daftar soal kuis dari database terurut sesuai urutan input)
router.get('/', async (req, res) => {
  try {
    const kat = req.query.kategori;
    let query = supabase
      .from('quiz')
      .select('id, pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, kategori');

    if (kat && kat !== 'all') {
      query = query.ilike('kategori', kat);
    }

    // Pastikan urutan selalu teratur dari soal pertama (ID terkecil) ke soal terakhir
    query = query.order('id', { ascending: true });

    const { data: list, error } = await query;

    if (error) {
      console.error('Fetch Quiz Supabase Error:', error);
      return res.status(500).json({ error: 'Gagal memuat kuis.' });
    }

    return res.json({ success: true, quiz: list || [] });
  } catch (err) {
    console.error('Fetch Quiz Error:', err);
    return res.status(500).json({ error: 'Gagal memuat kuis.' });
  }
});

// POST /api/quiz/submit (Kirim jawaban, simpan jika ada sesi login)
router.post('/submit', async (req, res) => {
  const { jawaban } = req.body; // format: { 1: 'A', 2: 'C', ... }

  if (!jawaban || typeof jawaban !== 'object') {
    return res.status(400).json({ error: 'Format jawaban tidak valid.' });
  }

  try {
    const ids = Object.keys(jawaban).map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    if (ids.length === 0) {
      return res.status(400).json({ error: 'Tidak ada jawaban yang dikirim.' });
    }

    const { data: dbQuestions, error: qErr } = await supabase
      .from('quiz')
      .select('id, jawaban_benar')
      .in('id', ids);

    if (qErr) {
      console.error('Supabase Quiz Check Error:', qErr);
      return res.status(500).json({ error: 'Gagal memeriksa jawaban kuis.' });
    }

    let benar = 0;
    const total = (dbQuestions || []).length;

    (dbQuestions || []).forEach(q => {
      const userAns = (jawaban[q.id] || '').toUpperCase();
      if (userAns === (q.jawaban_benar || '').toUpperCase()) {
        benar++;
      }
    });

    const skor = total > 0 ? Math.round((benar / total) * 100) : 0;

    // Simpan skor jika user login
    let saved = false;
    if (req.session && req.session.userId) {
      const { error: saveErr } = await supabase
        .from('nilai_quiz')
        .insert([
          {
            user_id: req.session.userId,
            skor: skor
          }
        ]);

      if (!saveErr) {
        saved = true;
        try {
          broadcastQuizSubmitted({
            userId: req.session.userId,
            nama: req.session.userName || 'Siswa',
            skor,
            benar,
            total,
            lulus: skor >= 70,
            timestamp: new Date()
          });
        } catch (e) {}
      } else {
        console.error('Save Nilai Quiz Error:', saveErr);
      }
    }

    return res.json({
      success: true,
      skor,
      benar,
      total,
      lulus: skor >= 70,
      saved
    });
  } catch (err) {
    console.error('Submit Quiz Error:', err);
    return res.status(500).json({ error: 'Gagal memproses kuis.' });
  }
});

// GET /api/quiz/riwayat
router.get('/riwayat', requireAuth, async (req, res) => {
  try {
    const { data: list, error } = await supabase
      .from('nilai_quiz')
      .select('id, skor, tanggal')
      .eq('user_id', req.session.userId)
      .order('id', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Fetch Riwayat Error:', error);
      return res.status(500).json({ error: 'Gagal memuat riwayat kuis.' });
    }

    return res.json({ success: true, riwayat: list || [] });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal memuat riwayat kuis.' });
  }
});

module.exports = router;
