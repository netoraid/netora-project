const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabase');
const { requireAuth } = require('../middleware/auth');
const { broadcastQuizSubmitted } = require('../services/socket');
const { recordQuizSubmission, getQuizSubmissionById } = require('../services/quiz_history');

// GET /api/quiz (Ambil daftar soal kuis dari database terurut sesuai urutan input)
router.get('/', async (req, res) => {
  try {
    const kat = req.query.kategori;
    let query = supabase
      .from('quiz')
      .select('id, pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, kategori');

    if (kat && kat !== 'all') {
      query = query.ilike('kategori', `%${kat}%`);
    }

    // Pastikan urutan selalu teratur dari soal pertama (ID terkecil) ke soal terakhir
    query = query.order('id', { ascending: true });

    const { data: list, error } = await query;

    if (error) {
      console.error('Fetch Quiz Supabase Error:', error);
      return res.status(500).json({ error: 'Gagal memuat kuis.' });
    }

    const parsed = (list || []).map(q => {
      let mainKategori = (q.kategori || 'Umum').trim();
      let judulKuis = mainKategori;
      if (mainKategori.includes(':::')) {
        const parts = mainKategori.split(':::');
        mainKategori = parts[0].trim();
        judulKuis = parts[1].trim();
      }
      return {
        ...q,
        kategori: mainKategori,
        judul_kuis: judulKuis,
        raw_kategori: q.kategori
      };
    });

    return res.json({ success: true, quiz: parsed });
  } catch (err) {
    console.error('Fetch Quiz Error:', err);
    return res.status(500).json({ error: 'Gagal memuat kuis.' });
  }
});

// POST /api/quiz/submit (Kirim jawaban, evaluasi, dan simpan riwayat review lengkap)
router.post('/submit', async (req, res) => {
  const { jawaban, topicTitle } = req.body; // format: { 1: 'A', 2: 'C', ... }

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
      .select('id, pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, jawaban_benar, kategori')
      .in('id', ids);

    if (qErr) {
      console.error('Supabase Quiz Check Error:', qErr);
      return res.status(500).json({ error: 'Gagal memeriksa jawaban kuis.' });
    }

    let benar = 0;
    const reviewList = [];

    // Evaluasi setiap butir soal sesuai urutan ID yang dikirim
    ids.forEach((id, idx) => {
      const q = (dbQuestions || []).find(item => item.id === id);
      if (!q) return;

      const userAns = (jawaban[q.id] || '').trim().toUpperCase();
      const correctAns = (q.jawaban_benar || '').trim().toUpperCase();
      const isCorrect = (userAns === correctAns);

      if (isCorrect) benar++;

      const opsiMap = {
        A: q.pilihan_a || '',
        B: q.pilihan_b || '',
        C: q.pilihan_c || '',
        D: q.pilihan_d || ''
      };

      const userText = opsiMap[userAns] || (userAns ? `Pilihan ${userAns}` : 'Tidak Dijawab');
      const correctText = opsiMap[correctAns] || `Pilihan ${correctAns}`;

      reviewList.push({
        no: idx + 1,
        id: q.id,
        pertanyaan: q.pertanyaan,
        pilihan_a: q.pilihan_a,
        pilihan_b: q.pilihan_b,
        pilihan_c: q.pilihan_c,
        pilihan_d: q.pilihan_d,
        jawaban_user: userAns || '-',
        jawaban_user_text: userText,
        jawaban_benar: correctAns,
        jawaban_benar_text: correctText,
        is_benar: isCorrect,
        penjelasan: isCorrect
          ? 'Jawaban Anda Benar! Pemahaman Anda pada konsep dan materi soal ini sudah tepat.'
          : `Jawaban Anda Belum Tepat. Pilihan yang Anda pilih: [${userAns || '-'}] "${userText}". Kunci jawaban yang benar adalah [${correctAns}]: "${correctText}".`
      });
    });

    const total = reviewList.length;
    const skor = total > 0 ? Math.round((benar / total) * 100) : 0;
    const isLulus = skor >= 70;

    // Simpan skor jika user login
    let saved = false;
    let submissionId = Date.now();

    if (req.session && req.session.userId) {
      const { data: insertedNilai, error: saveErr } = await supabase
        .from('nilai_quiz')
        .insert([
          {
            user_id: req.session.userId,
            skor: skor
          }
        ])
        .select('id')
        .single();

      if (!saveErr && insertedNilai) {
        saved = true;
        submissionId = insertedNilai.id;
      } else if (saveErr) {
        console.error('Save Nilai Quiz Error:', saveErr);
      }

      // Rekam detail pengerjaan ke service riwayat agar Admin dan Guru bisa meninjau
      recordQuizSubmission({
        id: submissionId,
        nilai_id: submissionId,
        user_id: req.session.userId,
        siswa_nama: req.session.userName || 'Siswa Netora',
        siswa_email: req.session.userEmail || '-',
        topic_title: topicTitle || 'Kuis TKJ',
        skor,
        benar,
        total,
        lulus: isLulus,
        tanggal: new Date().toISOString(),
        review: reviewList
      });

      try {
        broadcastQuizSubmitted({
          id: submissionId,
          userId: req.session.userId,
          nama: req.session.userName || 'Siswa',
          skor,
          benar,
          total,
          lulus: isLulus,
          timestamp: new Date()
        });
      } catch (e) {}
    } else {
      // Jika guest (belum login), simpan sementara di service riwayat
      recordQuizSubmission({
        id: submissionId,
        nilai_id: submissionId,
        user_id: null,
        siswa_nama: 'Tamu / Siswa Belum Login',
        siswa_email: '-',
        topic_title: topicTitle || 'Kuis TKJ',
        skor,
        benar,
        total,
        lulus: isLulus,
        tanggal: new Date().toISOString(),
        review: reviewList
      });
    }

    return res.json({
      success: true,
      submissionId,
      skor,
      benar,
      total,
      lulus: isLulus,
      saved,
      review: reviewList
    });
  } catch (err) {
    console.error('Submit Quiz Error:', err);
    return res.status(500).json({ error: 'Gagal memproses kuis.' });
  }
});

// GET /api/quiz/detail/:id (Lihat rincian hasil jawaban kuis)
router.get('/detail/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const detail = await getQuizSubmissionById(id);
    if (!detail) {
      return res.status(404).json({ error: 'Data rincian kuis tidak ditemukan.' });
    }
    return res.json({ success: true, submission: detail });
  } catch (err) {
    console.error('Fetch Quiz Detail Error:', err);
    return res.status(500).json({ error: 'Gagal memuat rincian kuis.' });
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
