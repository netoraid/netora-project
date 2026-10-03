const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { supabase } = require('../database/supabase');
const { requireAuth } = require('../middleware/auth');

// Setup Storage Multer untuk Upload Foto Profil
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const targetUploads = path.join(__dirname, '..', 'public', 'uploads');
    if (!fs.existsSync(targetUploads)) {
      fs.mkdirSync(targetUploads, { recursive: true });
    }
    cb(null, targetUploads);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'avatar-' + req.session.userId + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|webp|gif/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) {
      return cb(null, true);
    }
    cb(new Error('Hanya file gambar (jpg, png, webp, gif) yang diperbolehkan!'));
  }
});

// GET /api/profil
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data: user, error: uErr } = await supabase
      .from('users')
      .select('id, nama, email, role, foto, bio, created_at')
      .eq('id', req.session.userId)
      .maybeSingle();

    if (uErr || !user) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }
    if (!user.foto) {
      user.foto = 'uploads/default.png';
    }

    const { data: riwayat, error: rErr } = await supabase
      .from('nilai_quiz')
      .select('id, skor, tanggal')
      .eq('user_id', req.session.userId)
      .order('id', { ascending: false })
      .limit(5);

    return res.json({ success: true, user, riwayat: riwayat || [] });
  } catch (err) {
    console.error('Fetch Profil Error:', err);
    return res.status(500).json({ error: 'Gagal memuat data profil.' });
  }
});

// PUT /api/profil/update (Ubah nama & bio)
router.put('/update', requireAuth, async (req, res) => {
  const { nama, bio } = req.body;

  if (!nama || !nama.trim()) {
    return res.status(400).json({ error: 'Nama tidak boleh kosong.' });
  }

  try {
    const { error } = await supabase
      .from('users')
      .update({
        nama: nama.trim(),
        bio: (bio || '').trim()
      })
      .eq('id', req.session.userId);

    if (error) {
      console.error('Update Profil Supabase Error:', error);
      return res.status(500).json({ error: 'Gagal memperbarui profil.' });
    }

    return res.json({ success: true, message: 'Profil berhasil diperbarui!' });
  } catch (err) {
    console.error('Update Profil Error:', err);
    return res.status(500).json({ error: 'Gagal memperbarui profil.' });
  }
});

// PUT /api/profil/ganti-password
router.put('/ganti-password', requireAuth, async (req, res) => {
  const { password_lama, password_baru } = req.body;

  if (!password_lama || !password_baru) {
    return res.status(400).json({ error: 'Password lama dan password baru wajib diisi.' });
  }

  if (password_baru.length < 6) {
    return res.status(400).json({ error: 'Password baru minimal 6 karakter.' });
  }

  try {
    const { data: user, error: uErr } = await supabase
      .from('users')
      .select('password')
      .eq('id', req.session.userId)
      .maybeSingle();

    if (uErr || !user) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }

    const isMatch = bcrypt.compareSync(password_lama, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Password lama Anda salah.' });
    }

    const newHashed = bcrypt.hashSync(password_baru, 10);
    const { error: upErr } = await supabase
      .from('users')
      .update({
        password: newHashed,
        password_plain: password_baru.trim()
      })
      .eq('id', req.session.userId);

    if (upErr) {
      return res.status(500).json({ error: 'Gagal menginstal password baru.' });
    }

    return res.json({ success: true, message: 'Password berhasil diubah!' });
  } catch (err) {
    console.error('Ganti Password Error:', err);
    return res.status(500).json({ error: 'Gagal menginstal password baru.' });
  }
});

// POST /api/profil/upload-foto
router.post('/upload-foto', requireAuth, (req, res) => {
  upload.single('foto')(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Ukuran file terlalu besar: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Silakan pilih file foto profil.' });
    }

    const photoPath = 'uploads/' + req.file.filename;

    try {
      const { error } = await supabase
        .from('users')
        .update({ foto: photoPath })
        .eq('id', req.session.userId);

      if (error) {
        console.error('Save Foto Error:', error);
        return res.status(500).json({ error: 'Gagal menyimpan foto profil ke database.' });
      }

      return res.json({
        success: true,
        message: 'Foto profil berhasil diperbarui!',
        foto: photoPath
      });
    } catch (dbErr) {
      console.error('Save Foto Error:', dbErr);
      return res.status(500).json({ error: 'Gagal menyimpan foto profil ke database.' });
    }
  });
});

// DELETE / POST /api/profil/hapus-foto (Hapus Foto Profil dan Kembalikan ke Default)
const hapusFotoHandler = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { data: user, error: uErr } = await supabase
      .from('users')
      .select('foto')
      .eq('id', userId)
      .maybeSingle();

    if (uErr || !user) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }

    // Jika foto adalah file upload kustom, hapus file fisik dari disk
    if (user.foto && user.foto.startsWith('uploads/avatar-')) {
      const filePath = path.join(__dirname, '..', 'public', user.foto);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
    }

    const defaultFoto = 'uploads/default.png';
    await supabase
      .from('users')
      .update({ foto: defaultFoto })
      .eq('id', userId);

    return res.json({
      success: true,
      message: 'Foto profil berhasil dihapus dan dikembalikan ke foto standar.',
      foto: defaultFoto
    });
  } catch (err) {
    console.error('Hapus Foto Profil Error:', err);
    return res.status(500).json({ error: 'Gagal menghapus foto profil.' });
  }
};

router.delete('/hapus-foto', requireAuth, hapusFotoHandler);
router.post('/hapus-foto', requireAuth, hapusFotoHandler);
router.delete('/foto', requireAuth, hapusFotoHandler);

// DELETE /api/profil/hapus-akun (Hapus Akun & Profil Siswa Sendiri)
router.delete('/hapus-akun', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { data: user, error: uErr } = await supabase
      .from('users')
      .select('id, role, foto')
      .eq('id', userId)
      .maybeSingle();
    
    if (uErr || !user) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Akun Administrator tidak dapat dihapus dari halaman profil siswa.' });
    }

    // 1. Hapus file foto profil jika bukan default
    if (user.foto && user.foto.startsWith('uploads/avatar-')) {
      const filePath = path.join(__dirname, '..', 'public', user.foto);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
    }

    // 2. Hapus akun user (nilai_quiz akan terhapus otomatis via CASCADE)
    await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    // 3. Hancurkan sesi login
    req.session.destroy((err) => {
      res.clearCookie('connect.sid');
      return res.json({
        success: true,
        message: 'Akun dan seluruh data profil Anda berhasil dihapus secara permanen.'
      });
    });
  } catch (err) {
    console.error('Hapus Akun Error:', err);
    return res.status(500).json({ error: 'Gagal menghapus profil akun.' });
  }
});

module.exports = router;
