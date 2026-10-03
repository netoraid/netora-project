const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabase');
const { requireGuru } = require('../middleware/auth');

// Seluruh endpoint guru wajib melewati proteksi requireGuru
router.use(requireGuru);

// 1. GET /api/guru/stats - Statistik Ringkasan Khusus Guru
router.get('/stats', async (req, res) => {
  try {
    const [usersRes, quizRes, scoresRes] = await Promise.all([
      supabase.from('users').select('id, email, role, nama'),
      supabase.from('quiz').select('id, kategori'),
      supabase.from('nilai_quiz').select('user_id, skor')
    ]);

    const allUsers = usersRes.data || [];
    const siswaList = allUsers.filter(u => u.role !== 'admin' && u.role !== 'guru' && u.email !== 'admin123' && u.email !== 'guru123');
    const totalSiswa = siswaList.length;

    const allQuiz = quizRes.data || [];
    const totalKuisSoal = allQuiz.length;

    const allScores = scoresRes.data || [];
    const totalSesiKuis = allScores.length;

    let avgSkor = 0;
    let lulusCount = 0;
    let remidiCount = 0;

    if (totalSesiKuis > 0) {
      const sum = allScores.reduce((acc, curr) => acc + (Number(curr.skor) || 0), 0);
      avgSkor = Math.round((sum / totalSesiKuis) * 10) / 10;
      lulusCount = allScores.filter(s => (Number(s.skor) || 0) >= 70).length;
      remidiCount = totalSesiKuis - lulusCount;
    }

    const persenLulus = totalSesiKuis > 0 ? Math.round((lulusCount / totalSesiKuis) * 100) : 0;

    // Hitung rata-rata progress per siswa
    const userScoresMap = {};
    allScores.forEach(row => {
      if (!userScoresMap[row.user_id]) userScoresMap[row.user_id] = [];
      userScoresMap[row.user_id].push(Number(row.skor) || 0);
    });

    let totalProgressSum = 0;
    let tuntasCount = 0;
    let sedangCount = 0;
    let belumCount = 0;

    siswaList.forEach(u => {
      const sc = userScoresMap[u.id] || [];
      const totalUjian = sc.length;
      let progress = 0;
      if (totalUjian > 0) {
        const sum = sc.reduce((a, b) => a + b, 0);
        const avg = sum / totalUjian;
        progress = Math.min(100, Math.max(10, Math.round((Math.min(totalUjian, 5) / 5) * 50 + (avg / 100) * 50)));
      }

      totalProgressSum += progress;
      if (progress >= 80) {
        tuntasCount++;
      } else if (progress >= 40) {
        sedangCount++;
      } else {
        belumCount++;
      }
    });

    const avgProgress = totalSiswa > 0 ? Math.round(totalProgressSum / totalSiswa) : 0;

    return res.json({
      success: true,
      stats: {
        totalSiswa,
        totalKuisSoal,
        totalSesiKuis,
        avgSkor,
        lulusCount,
        remidiCount,
        persenLulus,
        avgProgress,
        distribusiProgress: {
          tuntas: tuntasCount,
          sedang: sedangCount,
          belum: belumCount
        }
      }
    });
  } catch (err) {
    console.error('Guru Stats Error:', err);
    return res.status(500).json({ error: 'Gagal memuat statistik guru.' });
  }
});

// 2. GET /api/guru/nilai - Riwayat Nilai Kuis Siswa
router.get('/nilai', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 100;

    const { data: aktivitas, error } = await supabase
      .from('nilai_quiz')
      .select(`
        id,
        skor,
        tanggal,
        user_id,
        users (
          id,
          nama,
          email,
          foto
        )
      `)
      .order('id', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Supabase Guru Nilai Error:', error);
      return res.status(500).json({ error: 'Gagal memuat data nilai siswa.' });
    }

    const mapped = (aktivitas || []).map(item => {
      const user = item.users || {};
      const skorNum = Number(item.skor) || 0;
      return {
        id: item.id,
        skor: skorNum,
        tanggal: item.tanggal,
        user_id: item.user_id,
        siswa_nama: user.nama || 'Siswa',
        siswa_email: user.email || '-',
        siswa_foto: user.foto || 'uploads/default.png',
        lulus: skorNum >= 70,
        status: skorNum >= 70 ? 'LULUS' : 'REMIDI'
      };
    });

    return res.json({
      success: true,
      nilai: mapped
    });
  } catch (err) {
    console.error('Guru Nilai Error:', err);
    return res.status(500).json({ error: 'Gagal memuat riwayat nilai siswa.' });
  }
});

// 3. GET /api/guru/progress - Progress Belajar Siswa Berapa Persen
router.get('/progress', async (req, res) => {
  try {
    const [usersRes, scoresRes] = await Promise.all([
      supabase.from('users').select('id, nama, email, foto, bio, created_at, role').order('id', { ascending: false }),
      supabase.from('nilai_quiz').select('user_id, skor, tanggal')
    ]);

    const allUsers = usersRes.data || [];
    const siswaList = allUsers.filter(u => u.role !== 'admin' && u.role !== 'guru' && u.email !== 'admin123' && u.email !== 'guru123');

    // Kelompokkan skor berdasarkan user_id
    const userScores = {};
    (scoresRes.data || []).forEach(row => {
      if (!userScores[row.user_id]) userScores[row.user_id] = [];
      userScores[row.user_id].push(Number(row.skor) || 0);
    });

    const result = siswaList.map(u => {
      const sc = userScores[u.id] || [];
      const total_ujian = sc.length;
      let rata_skor = 0;
      let skor_tertinggi = 0;
      let progress_persen = 0;
      let status_progress = 'Belum Mulai';

      if (total_ujian > 0) {
        const sum = sc.reduce((a, b) => a + b, 0);
        rata_skor = Math.round((sum / total_ujian) * 10) / 10;
        skor_tertinggi = Math.max(...sc);

        // Perhitungan persentase progres belajar:
        // Bobot: Frekuensi Kuis (50%) + Kualitas Pemahaman / Rata-rata Skor (50%)
        const bobotUjian = (Math.min(total_ujian, 5) / 5) * 50;
        const bobotSkor = (rata_skor / 100) * 50;
        progress_persen = Math.min(100, Math.max(10, Math.round(bobotUjian + bobotSkor)));

        if (progress_persen >= 80) {
          status_progress = 'Tuntas / Kompeten';
        } else if (progress_persen >= 40) {
          status_progress = 'Sedang Berprogres';
        } else {
          status_progress = 'Perlu Peningkatan';
        }
      }

      return {
        id: u.id,
        nama: u.nama,
        email: u.email,
        foto: u.foto || 'uploads/default.png',
        bio: u.bio,
        created_at: u.created_at,
        total_ujian,
        rata_skor,
        skor_tertinggi,
        progress_persen,
        status_progress
      };
    });

    return res.json({
      success: true,
      siswa: result
    });
  } catch (err) {
    console.error('Guru Progress Error:', err);
    return res.status(500).json({ error: 'Gagal memuat progress belajar siswa.' });
  }
});

// 4. GET /api/guru/quiz - Daftar Seluruh Soal Kuis
router.get('/quiz', async (req, res) => {
  try {
    const { data: list, error } = await supabase
      .from('quiz')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      console.error('Supabase Guru Quiz Error:', error);
      return res.status(500).json({ error: 'Gagal memuat daftar soal kuis.' });
    }

    return res.json({
      success: true,
      quiz: list || []
    });
  } catch (err) {
    console.error('Guru Quiz Fetch Error:', err);
    return res.status(500).json({ error: 'Gagal memuat daftar soal kuis.' });
  }
});

// 5. GET /api/guru/quiz/:id - Detail 1 Soal Kuis
router.get('/quiz/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data: q, error } = await supabase
      .from('quiz')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !q) {
      return res.status(404).json({ error: 'Soal kuis tidak ditemukan.' });
    }
    return res.json({ success: true, soal: q });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal mengambil detail soal.' });
  }
});

// 6. POST /api/guru/quiz - Guru Menambah Soal Kuis Baru
router.post('/quiz', async (req, res) => {
  const { pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, jawaban_benar, kategori } = req.body;
  if (!pertanyaan || !pilihan_a || !pilihan_b || !pilihan_c || !pilihan_d || !jawaban_benar) {
    return res.status(400).json({ error: 'Seluruh pertanyaan, pilihan A-D, dan kunci jawaban wajib diisi.' });
  }

  const kunci = (jawaban_benar || '').trim().toUpperCase();
  if (!['A', 'B', 'C', 'D'].includes(kunci)) {
    return res.status(400).json({ error: 'Kunci jawaban harus berupa salah satu dari A, B, C, atau D.' });
  }

  const kat = kategori && kategori.trim() ? kategori.trim() : 'Teknik Komputer & Jaringan';

  try {
    const { data: created, error } = await supabase
      .from('quiz')
      .insert([
        {
          pertanyaan: pertanyaan.trim(),
          pilihan_a: pilihan_a.trim(),
          pilihan_b: pilihan_b.trim(),
          pilihan_c: pilihan_c.trim(),
          pilihan_d: pilihan_d.trim(),
          jawaban_benar: kunci,
          kategori: kat
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Insert Quiz Error:', error);
      return res.status(500).json({ error: 'Gagal menambahkan soal kuis baru.' });
    }

    return res.json({
      success: true,
      message: 'Soal kuis baru berhasil dibuat oleh Guru!',
      id: created.id
    });
  } catch (err) {
    console.error('Guru Tambah Soal Quiz Error:', err);
    return res.status(500).json({ error: 'Gagal menambahkan soal kuis baru.' });
  }
});

// 7. PUT /api/guru/quiz/:id - Guru Memperbarui Soal Kuis
router.put('/quiz/:id', async (req, res) => {
  const { id } = req.params;
  const { pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, jawaban_benar, kategori } = req.body;

  if (!pertanyaan || !pilihan_a || !pilihan_b || !pilihan_c || !pilihan_d || !jawaban_benar) {
    return res.status(400).json({ error: 'Seluruh pertanyaan, pilihan A-D, dan kunci jawaban wajib diisi.' });
  }

  const kunci = (jawaban_benar || '').trim().toUpperCase();
  if (!['A', 'B', 'C', 'D'].includes(kunci)) {
    return res.status(400).json({ error: 'Kunci jawaban harus berupa salah satu dari A, B, C, atau D.' });
  }

  const kat = kategori && kategori.trim() ? kategori.trim() : 'Teknik Komputer & Jaringan';

  try {
    const { data: updated, error } = await supabase
      .from('quiz')
      .update({
        pertanyaan: pertanyaan.trim(),
        pilihan_a: pilihan_a.trim(),
        pilihan_b: pilihan_b.trim(),
        pilihan_c: pilihan_c.trim(),
        pilihan_d: pilihan_d.trim(),
        jawaban_benar: kunci,
        kategori: kat
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error || !updated) {
      return res.status(404).json({ error: 'Soal kuis tidak ditemukan.' });
    }

    return res.json({ success: true, message: 'Soal kuis berhasil diperbarui!' });
  } catch (err) {
    console.error('Guru Update Soal Quiz Error:', err);
    return res.status(500).json({ error: 'Gagal memperbarui soal kuis.' });
  }
});

// 8. DELETE /api/guru/quiz/:id - Guru Menghapus Soal Kuis
router.delete('/quiz/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('quiz')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: 'Gagal menghapus soal kuis.' });
    }

    return res.json({ success: true, message: 'Soal kuis berhasil dihapus.' });
  } catch (err) {
    console.error('Guru Hapus Soal Quiz Error:', err);
    return res.status(500).json({ error: 'Gagal menghapus soal kuis.' });
  }
});

module.exports = router;
