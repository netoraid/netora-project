const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { supabase } = require('../database/supabase');
const { requireAdmin } = require('../middleware/auth');
const { broadcastPengumuman, broadcastHapusPengumuman, broadcastQuizDataChanged } = require('../services/socket');
const pengumumanRouter = require('./pengumuman');

// Seluruh endpoint admin diwajibkan melewati proteksi requireAdmin
router.use(requireAdmin);

// Helper parser URL YouTube Universal
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

// 1. GET /api/admin/stats - Ringkasan KPI & Statistik Sistem
router.get('/stats', async (req, res) => {
  try {
    const [usersRes, materiRes, videoRes, quizRes, scoresRes] = await Promise.all([
      supabase.from('users').select('id, email, role'),
      supabase.from('materi').select('id, kategori'),
      supabase.from('video').select('id', { count: 'exact', head: true }),
      supabase.from('quiz').select('id', { count: 'exact', head: true }),
      supabase.from('nilai_quiz').select('skor')
    ]);

    const allUsers = usersRes.data || [];
    const siswaList = allUsers.filter(u => u.role !== 'admin' && u.email !== 'admin123' && u.email !== 'admin@netora.id');
    const totalSiswa = siswaList.length;

    const allMateri = materiRes.data || [];
    const totalMateri = allMateri.length;
    const totalVideo = videoRes.count || 0;

    const scores = (scoresRes.data || []).map(s => s.skor);
    const totalKuis = scores.length;

    let avgSkor = 0;
    let maxSkor = 0;
    let minSkor = 0;
    let lulusCount = 0;
    let remidiCount = 0;
    let rangeTinggi = 0;
    let rangeSedang = 0;
    let rangeRendah = 0;

    if (totalKuis > 0) {
      const sum = scores.reduce((acc, curr) => acc + curr, 0);
      avgSkor = Math.round((sum / totalKuis) * 10) / 10;
      maxSkor = Math.max(...scores);
      minSkor = Math.min(...scores);
      lulusCount = scores.filter(s => s >= 70).length;
      remidiCount = totalKuis - lulusCount;
      rangeTinggi = scores.filter(s => s >= 90).length;
      rangeSedang = scores.filter(s => s >= 70 && s < 90).length;
      rangeRendah = scores.filter(s => s < 70).length;
    }

    const persenLulus = totalKuis > 0 ? Math.round((lulusCount / totalKuis) * 100) : 0;

    // Distribusi Kategori Materi
    const katMap = {};
    allMateri.forEach(m => {
      const k = m.kategori || 'Umum';
      katMap[k] = (katMap[k] || 0) + 1;
    });
    const materiKategori = Object.keys(katMap).map(kategori => ({
      kategori,
      jumlah: katMap[kategori]
    }));

    return res.json({
      success: true,
      stats: {
        totalSiswa,
        totalMateri,
        totalVideo,
        totalKuis,
        avgSkor,
        lulusCount,
        remidiCount,
        persenLulus,
        materiKategori,
        distribusiNilai: {
          tinggi: rangeTinggi,
          sedang: rangeSedang,
          rendah: rangeRendah
        }
      }
    });
  } catch (err) {
    console.error('Admin Stats Error:', err);
    return res.status(500).json({ error: 'Gagal memuat statistik admin.' });
  }
});

// 2. GET /api/admin/aktivitas - Feed Aktivitas Kuis Siswa Real-time
router.get('/aktivitas', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;

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
      console.error('Supabase Admin Aktivitas Error:', error);
      return res.status(500).json({ error: 'Gagal memuat aktivitas siswa.' });
    }

    const mapped = (aktivitas || []).map(item => {
      const user = item.users || {};
      return {
        id: item.id,
        skor: item.skor,
        tanggal: item.tanggal,
        user_id: item.user_id,
        siswa_nama: user.nama || 'Siswa',
        siswa_email: user.email || '-',
        siswa_foto: user.foto || 'uploads/default.png',
        lulus: item.skor >= 70,
        status: item.skor >= 70 ? 'LULUS' : 'REMIDI'
      };
    });

    return res.json({
      success: true,
      aktivitas: mapped
    });
  } catch (err) {
    console.error('Admin Aktivitas Error:', err);
    return res.status(500).json({ error: 'Gagal memuat aktivitas siswa.' });
  }
});

// 3. GET /api/admin/siswa - Daftar Seluruh Siswa & Rangkuman Performa
router.get('/siswa', async (req, res) => {
  try {
    const [usersRes, scoresRes] = await Promise.all([
      supabase.from('users').select('*').order('id', { ascending: false }),
      supabase.from('nilai_quiz').select('user_id, skor')
    ]);

    const allUsers = usersRes.data || [];
    const siswaList = allUsers.filter(u => u.role !== 'admin' && u.email !== 'admin123' && u.email !== 'admin@netora.id');

    // Kelompokkan skor berdasarkan user_id
    const userScores = {};
    (scoresRes.data || []).forEach(row => {
      if (!userScores[row.user_id]) userScores[row.user_id] = [];
      userScores[row.user_id].push(row.skor);
    });

    const result = siswaList.map(u => {
      const sc = userScores[u.id] || [];
      const total_ujian = sc.length;
      let rata_skor = 0;
      let skor_tertinggi = 0;
      if (total_ujian > 0) {
        const sum = sc.reduce((a, b) => a + b, 0);
        rata_skor = Math.round((sum / total_ujian) * 10) / 10;
        skor_tertinggi = Math.max(...sc);
      }

      return {
        id: u.id,
        nama: u.nama,
        email: u.email,
        password_plain: u.password_plain || '123456',
        foto: u.foto || 'uploads/default.png',
        bio: u.bio,
        created_at: u.created_at,
        total_ujian,
        rata_skor,
        skor_tertinggi
      };
    });

    return res.json({
      success: true,
      siswa: result
    });
  } catch (err) {
    console.error('Admin Siswa Error:', err);
    return res.status(500).json({ error: 'Gagal memuat daftar siswa.' });
  }
});

// 3b. GET /api/admin/siswa-terbaru - Siswa yang Baru Saja Mendaftar
router.get('/siswa-terbaru', async (req, res) => {
  try {
    const { data: list, error } = await supabase
      .from('users')
      .select('id, nama, email, password_plain, foto, created_at, role')
      .order('id', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Gagal memuat siswa terbaru.' });
    }

    const filtered = (list || [])
      .filter(u => u.role !== 'admin' && u.email !== 'admin123' && u.email !== 'admin@netora.id')
      .slice(0, 8)
      .map(u => ({
        id: u.id,
        nama: u.nama,
        email: u.email,
        password_plain: u.password_plain || '123456',
        foto: u.foto || 'uploads/default.png',
        created_at: u.created_at
      }));

    return res.json({ success: true, siswa: filtered });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal memuat siswa terbaru.' });
  }
});

// 4. DELETE /api/admin/siswa/:id - Hapus Akun Siswa
router.delete('/siswa/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data: target } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', id)
      .maybeSingle();

    if (!target) {
      return res.status(404).json({ error: 'Siswa tidak ditemukan.' });
    }
    if (target.role === 'admin') {
      return res.status(403).json({ error: 'Tidak dapat menghapus akun Administrator.' });
    }

    // Hapus akun siswa (nilai_quiz otomatis terhapus lewat ON DELETE CASCADE)
    await supabase.from('users').delete().eq('id', id);

    return res.json({ success: true, message: 'Akun siswa berhasil dihapus dari sistem.' });
  } catch (err) {
    console.error('Delete Siswa Error:', err);
    return res.status(500).json({ error: 'Gagal menghapus siswa.' });
  }
});

// 4b. POST /api/admin/reset-siswa - Hapus Seluruh Akun Siswa & Riwayat Ujian
router.post('/reset-siswa', async (req, res) => {
  try {
    // 1. Hapus seluruh nilai quiz
    await supabase.from('nilai_quiz').delete().neq('id', 0);
    // 2. Hapus seluruh user yang bukan admin
    await supabase.from('users').delete().neq('role', 'admin').not('email', 'in', '("admin123","admin@netora.id")');

    return res.json({ success: true, message: 'Seluruh akun siswa dan riwayat kuis berhasil dibersihkan.' });
  } catch (err) {
    console.error('Reset Siswa Error:', err);
    return res.status(500).json({ error: 'Gagal mereset data siswa.' });
  }
});

// 4c. PUT /api/admin/siswa/:id/password - Ubah / Reset Password Siswa oleh Admin
router.put('/siswa/:id/password', async (req, res) => {
  const { id } = req.params;
  const { passwordBaru } = req.body;
  if (!passwordBaru || passwordBaru.length < 4) {
    return res.status(400).json({ error: 'Password baru minimal 4 karakter.' });
  }

  const hashed = bcrypt.hashSync(passwordBaru, 10);

  try {
    const { data: target } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', id)
      .maybeSingle();

    if (!target) {
      return res.status(404).json({ error: 'Siswa tidak ditemukan.' });
    }

    await supabase
      .from('users')
      .update({
        password: hashed,
        password_plain: passwordBaru
      })
      .eq('id', id);

    return res.json({ success: true, message: 'Password siswa berhasil diperbarui!' });
  } catch (err) {
    console.error('Update Password Siswa Error:', err);
    return res.status(500).json({ error: 'Gagal mengubah password siswa.' });
  }
});

// 4d. POST /api/admin/siswa - Tambah Akun Siswa Baru oleh Admin
router.post('/siswa', async (req, res) => {
  const { nama, email, password } = req.body;
  if (!nama || !email) {
    return res.status(400).json({ error: 'Nama dan email wajib diisi.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanNama = nama.trim();
  const plainPwd = (password && password.trim().length >= 4) ? password.trim() : '123456';

  try {
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: 'Email atau username ini sudah terdaftar oleh akun lain.' });
    }

    const hashed = bcrypt.hashSync(plainPwd, 10);

    const { data: created, error } = await supabase
      .from('users')
      .insert([
        {
          nama: cleanNama,
          email: cleanEmail,
          password: hashed,
          password_plain: plainPwd,
          role: 'siswa',
          foto: 'uploads/default.png',
          bio: 'Siswa TKJ Netora'
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Gagal menambahkan akun siswa baru.' });
    }

    return res.json({
      success: true,
      message: 'Akun siswa baru berhasil didaftarkan!',
      id: created.id
    });
  } catch (err) {
    console.error('Tambah Siswa Error:', err);
    return res.status(500).json({ error: 'Gagal menambahkan akun siswa baru.' });
  }
});

// 4e. PUT /api/admin/siswa/:id - Edit Data Profil & Kredensial Siswa
router.put('/siswa/:id', async (req, res) => {
  const { id } = req.params;
  const { nama, email, password } = req.body;

  if (!nama || !email) {
    return res.status(400).json({ error: 'Nama dan email wajib diisi.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanNama = nama.trim();

  try {
    const { data: target } = await supabase
      .from('users')
      .select('id, role, password, password_plain')
      .eq('id', id)
      .maybeSingle();

    if (!target) {
      return res.status(404).json({ error: 'Siswa tidak ditemukan.' });
    }
    if (target.role === 'admin') {
      return res.status(403).json({ error: 'Tidak dapat mengubah akun Administrator.' });
    }

    // Cek duplikasi email
    const { data: dup } = await supabase
      .from('users')
      .select('id')
      .eq('email', cleanEmail)
      .neq('id', id)
      .maybeSingle();

    if (dup) {
      return res.status(400).json({ error: 'Email tersebut sudah digunakan oleh akun lain.' });
    }

    let hashed = target.password;
    let plain = target.password_plain;
    if (password && password.trim().length >= 4) {
      plain = password.trim();
      hashed = bcrypt.hashSync(plain, 10);
    }

    await supabase
      .from('users')
      .update({
        nama: cleanNama,
        email: cleanEmail,
        password: hashed,
        password_plain: plain
      })
      .eq('id', id);

    return res.json({ success: true, message: 'Data akun siswa berhasil diperbarui!' });
  } catch (err) {
    console.error('Update Siswa Error:', err);
    return res.status(500).json({ error: 'Gagal memperbarui data siswa.' });
  }
});

// 5. GET /api/admin/pengumuman - Daftar Pengumuman
router.get('/pengumuman', async (req, res) => {
  try {
    const { data: list, error } = await supabase
      .from('pengumuman')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Gagal memuat pengumuman.' });
    }

    return res.json({ success: true, pengumuman: list || [] });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal memuat pengumuman.' });
  }
});

// 6. POST /api/admin/pengumuman - Tambah Notifikasi/Pengumuman Baru
router.post('/pengumuman', async (req, res) => {
  const { judul, isi, kategori, penting } = req.body;
  if (!judul || !isi) {
    return res.status(400).json({ error: 'Judul dan isi notifikasi wajib diisi.' });
  }

  try {
    const kat = kategori && kategori.trim() ? kategori.trim() : 'Pengumuman';
    const { data: created, error } = await supabase
      .from('pengumuman')
      .insert([
        {
          judul: judul.trim(),
          isi: isi.trim(),
          kategori: kat,
          penting: penting ? 1 : 0
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Gagal menerbitkan notifikasi.' });
    }

    try {
      if (pengumumanRouter.invalidateCache) pengumumanRouter.invalidateCache();
      broadcastPengumuman(created);
    } catch (e) {}

    return res.json({
      success: true,
      message: 'Notifikasi berhasil diterbitkan!',
      id: created.id
    });
  } catch (err) {
    console.error('Create Pengumuman Error:', err);
    return res.status(500).json({ error: 'Gagal menerbitkan notifikasi.' });
  }
});

// 7. DELETE /api/admin/pengumuman/:id - Hapus Pengumuman
router.delete('/pengumuman/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('pengumuman')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: 'Gagal menghapus pengumuman.' });
    }

    try {
      if (pengumumanRouter.invalidateCache) pengumumanRouter.invalidateCache();
      broadcastHapusPengumuman(id);
    } catch (e) {}

    return res.json({ success: true, message: 'Pengumuman berhasil dihapus.' });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal menghapus pengumuman.' });
  }
});

// 8. GET /api/admin/materi - Daftar Modul Materi
router.get('/materi', async (req, res) => {
  try {
    const { data: list, error } = await supabase
      .from('materi')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'Gagal memuat materi.' });
    }

    const mapped = (list || []).map(m => ({
      id: m.id,
      judul: m.judul,
      kategori: m.kategori,
      created_at: m.created_at,
      panjang_konten: (m.isi || '').length,
      isi: m.isi
    }));

    return res.json({ success: true, materi: mapped });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal memuat materi.' });
  }
});

// 8b. GET /api/admin/materi/:id - Detail 1 Modul Materi
router.get('/materi/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data: m, error } = await supabase
      .from('materi')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !m) {
      return res.status(404).json({ error: 'Modul materi tidak ditemukan.' });
    }
    return res.json({ success: true, materi: m });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal mengambil detail materi.' });
  }
});

// 8c. POST /api/admin/materi - Tambah Modul Materi Baru
router.post('/materi', async (req, res) => {
  const { judul, kategori, isi } = req.body;
  if (!judul || !isi) {
    return res.status(400).json({ error: 'Judul dan isi materi wajib diisi.' });
  }

  const kat = (kategori && kategori.trim()) ? kategori.trim() : 'Mikrotik';

  try {
    const { data: created, error } = await supabase
      .from('materi')
      .insert([
        {
          judul: judul.trim(),
          kategori: kat,
          isi: isi.trim()
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Gagal menambahkan materi baru.' });
    }

    return res.json({
      success: true,
      message: 'Modul materi berhasil ditambahkan!',
      id: created.id
    });
  } catch (err) {
    console.error('Tambah Materi Error:', err);
    return res.status(500).json({ error: 'Gagal menambahkan materi baru.' });
  }
});

// 8d. PUT /api/admin/materi/:id - Update Modul Materi
router.put('/materi/:id', async (req, res) => {
  const { id } = req.params;
  const { judul, kategori, isi } = req.body;

  if (!judul || !isi) {
    return res.status(400).json({ error: 'Judul dan isi materi wajib diisi.' });
  }

  const kat = (kategori && kategori.trim()) ? kategori.trim() : 'Mikrotik';

  try {
    const { data: updated, error } = await supabase
      .from('materi')
      .update({
        judul: judul.trim(),
        kategori: kat,
        isi: isi.trim()
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error || !updated) {
      return res.status(404).json({ error: 'Modul materi tidak ditemukan.' });
    }

    return res.json({ success: true, message: 'Modul materi berhasil diperbarui!' });
  } catch (err) {
    console.error('Update Materi Error:', err);
    return res.status(500).json({ error: 'Gagal memperbarui modul materi.' });
  }
});

// 8e. DELETE /api/admin/materi/:id - Hapus Modul Materi
router.delete('/materi/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('materi')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: 'Gagal menghapus modul materi.' });
    }

    return res.json({ success: true, message: 'Modul materi berhasil dihapus.' });
  } catch (err) {
    console.error('Hapus Materi Error:', err);
    return res.status(500).json({ error: 'Gagal menghapus modul materi.' });
  }
});

// 9. GET /api/admin/quiz - Ambil seluruh bank soal kuis
router.get('/quiz', async (req, res) => {
  try {
    const { data: list, error } = await supabase
      .from('quiz')
      .select('id, pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, jawaban_benar, kategori')
      .order('id', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'Gagal memuat bank soal kuis.' });
    }

    return res.json({ success: true, quiz: list || [], total: (list || []).length });
  } catch (err) {
    console.error('Fetch Admin Quiz Error:', err);
    return res.status(500).json({ error: 'Gagal memuat bank soal kuis.' });
  }
});

// 10. GET /api/admin/quiz/:id - Ambil detail 1 soal kuis
router.get('/quiz/:id', async (req, res) => {
  try {
    const { data: q, error } = await supabase
      .from('quiz')
      .select('id, pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, jawaban_benar, kategori')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error || !q) {
      return res.status(404).json({ error: 'Soal kuis tidak ditemukan.' });
    }
    return res.json({ success: true, soal: q });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal mengambil detail soal.' });
  }
});

// 11. POST /api/admin/quiz - Tambah soal kuis baru
router.post('/quiz', async (req, res) => {
  const { pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, jawaban_benar, kategori } = req.body;
  if (!pertanyaan || !pilihan_a || !pilihan_b || !pilihan_c || !pilihan_d || !jawaban_benar) {
    return res.status(400).json({ error: 'Seluruh pertanyaan, pilihan A-D, dan kunci jawaban wajib diisi.' });
  }

  const kunci = (jawaban_benar || '').trim().toUpperCase();
  if (!['A', 'B', 'C', 'D'].includes(kunci)) {
    return res.status(400).json({ error: 'Kunci jawaban harus berupa salah satu dari A, B, C, atau D.' });
  }

  const kat = kategori && kategori.trim() ? kategori.trim() : 'Cisco Packet Tracer';

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
      return res.status(500).json({ error: 'Gagal menambahkan soal kuis baru.' });
    }

    try {
      broadcastQuizDataChanged();
    } catch (e) {}

    return res.json({
      success: true,
      message: 'Soal kuis baru berhasil ditambahkan!',
      id: created.id
    });
  } catch (err) {
    console.error('Tambah Soal Quiz Error:', err);
    return res.status(500).json({ error: 'Gagal menambahkan soal kuis baru.' });
  }
});

// 12. PUT /api/admin/quiz/:id - Update soal kuis
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

  const kat = kategori && kategori.trim() ? kategori.trim() : 'Cisco Packet Tracer';

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

    try {
      broadcastQuizDataChanged();
    } catch (e) {}

    return res.json({ success: true, message: 'Soal kuis berhasil diperbarui!' });
  } catch (err) {
    console.error('Update Soal Quiz Error:', err);
    return res.status(500).json({ error: 'Gagal memperbarui soal kuis.' });
  }
});

// 13. DELETE /api/admin/quiz/:id - Hapus butir soal kuis
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

    try {
      broadcastQuizDataChanged();
    } catch (e) {}

    return res.json({ success: true, message: 'Soal kuis berhasil dihapus.' });
  } catch (err) {
    console.error('Hapus Soal Quiz Error:', err);
    return res.status(500).json({ error: 'Gagal menghapus soal kuis.' });
  }
});

// 14. GET /api/admin/video - Daftar Vidio Praktik
router.get('/video', async (req, res) => {
  try {
    const { data: list, error } = await supabase
      .from('video')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Gagal memuat daftar vidio.' });
    }

    const parsed = (list || []).map(v => {
      const yt = parseYouTubeLink(v.url_youtube);
      return {
        ...v,
        videoId: yt.videoId,
        thumbnail_url: yt.thumbnailUrl,
        embed_url: yt.embedUrl
      };
    });

    return res.json({ success: true, video: parsed });
  } catch (err) {
    console.error('Admin Fetch Video Error:', err);
    return res.status(500).json({ error: 'Gagal memuat daftar vidio.' });
  }
});

// 15. POST /api/admin/video - Tambah Vidio Praktik Baru
router.post('/video', async (req, res) => {
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
      return res.status(500).json({ error: 'Gagal menambahkan vidio praktik.' });
    }

    return res.json({
      success: true,
      message: 'Vidio praktik berhasil ditambahkan!',
      id: created.id,
      thumbnail_url: yt.thumbnailUrl
    });
  } catch (err) {
    console.error('Admin Tambah Video Error:', err);
    return res.status(500).json({ error: 'Gagal menambahkan vidio praktik.' });
  }
});

// 16. PUT /api/admin/video/:id - Update Vidio Praktik
router.put('/video/:id', async (req, res) => {
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
      return res.status(404).json({ error: 'Vidio tidak ditemukan.' });
    }

    return res.json({
      success: true,
      message: 'Vidio praktik berhasil diperbarui!',
      thumbnail_url: yt.thumbnailUrl
    });
  } catch (err) {
    console.error('Admin Update Video Error:', err);
    return res.status(500).json({ error: 'Gagal memperbarui vidio praktik.' });
  }
});

// 17. DELETE /api/admin/video/:id - Hapus Vidio Praktik
router.delete('/video/:id', async (req, res) => {
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
    console.error('Admin Hapus Video Error:', err);
    return res.status(500).json({ error: 'Gagal menghapus vidio praktik.' });
  }
});

module.exports = router;
