const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { supabase } = require('../database/supabase');

// Auto-seed akun default Admin & Guru di Supabase
async function seedDefaultRoles() {
  try {
    // 1. Cek Admin
    const { data: adminExists } = await supabase
      .from('users')
      .select('id')
      .or('email.eq.admin123,email.eq.admin@netora.id,role.eq.admin')
      .limit(1)
      .maybeSingle();

    if (!adminExists) {
      const hashAdmin = bcrypt.hashSync('admin123', 10);
      await supabase.from('users').insert([
        {
          nama: 'Administrator Netora',
          email: 'admin123',
          password: hashAdmin,
          password_plain: 'admin123',
          role: 'admin',
          foto: 'uploads/default.png',
          bio: 'Pengelola Utama Platform Netora'
        }
      ]);
      console.log('✅ [AUTO-SEED] Akun demo admin123 siap digunakan.');
    }

    // 2. Cek Guru
    const { data: guruExists } = await supabase
      .from('users')
      .select('id')
      .or('email.eq.guru123,email.eq.guru@netora.id,role.eq.guru')
      .limit(1)
      .maybeSingle();

    if (!guruExists) {
      const hashGuru = bcrypt.hashSync('guru123', 10);
      await supabase.from('users').insert([
        {
          nama: 'Bapak / Ibu Guru Pembimbing TKJ',
          email: 'guru123',
          password: hashGuru,
          password_plain: 'guru123',
          role: 'guru',
          foto: 'uploads/default.png',
          bio: 'Guru Pengampu Kejuruan Teknik Komputer & Jaringan'
        }
      ]);
      console.log('✅ [AUTO-SEED] Akun demo guru123 siap digunakan.');
    }
  } catch (err) {
    console.warn('⚠️ [AUTO-SEED NOTE]', err.message || err);
  }
}
seedDefaultRoles();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { nama, email, password } = req.body;

  if (!nama || !email || !password) {
    return res.status(400).json({ error: 'Semua kolom wajib diisi.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password minimal 6 karakter.' });
  }

  try {
    const cleanEmail = email.toLowerCase().trim();
    const cleanNama = nama.trim();

    // Cek apakah email sudah terdaftar
    const { data: existingUser, error: checkErr } = await supabase
      .from('users')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (checkErr) {
      console.error('Check user error:', checkErr);
      return res.status(500).json({ error: 'Gagal memverifikasi email pengguna.' });
    }

    if (existingUser) {
      return res.status(400).json({ error: 'Email sudah terdaftar. Silakan login.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const { data: newUser, error: insertErr } = await supabase
      .from('users')
      .insert([
        {
          nama: cleanNama,
          email: cleanEmail,
          password: hashedPassword,
          password_plain: password.trim(),
          role: 'siswa',
          foto: 'uploads/default.png',
          bio: 'Siswa TKJ Antusias Belajar Jaringan'
        }
      ])
      .select()
      .single();

    if (insertErr) {
      console.error('Insert User Error:', insertErr);
      return res.status(500).json({ error: 'Gagal mendaftarkan akun baru.' });
    }

    return res.json({ success: true, message: 'Pendaftaran berhasil! Silakan masuk dengan akun Anda.' });
  } catch (err) {
    console.error('Register Error:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi.' });
  }

  try {
    const identifier = (email || '').toLowerCase().trim();
    const cleanPassword = (password || '').trim();

    const isAdminLogin =
      identifier === 'admin123' ||
      identifier === 'admin@netora.id' ||
      identifier === 'admin' ||
      identifier === 'admin@netora.com';

    const isGuruLogin =
      identifier === 'guru123' ||
      identifier === 'guru@netora.id' ||
      identifier === 'guru' ||
      identifier === 'guru@netora.com' ||
      identifier === 'guru@smk.sch.id';

    let user = null;

    if (isGuruLogin) {
      // 1. Cari akun guru spesifik terlebih dahulu
      const { data: gList } = await supabase
        .from('users')
        .select('*')
        .or('email.eq.guru123,email.eq.guru,email.eq.guru@netora.id')
        .limit(1);

      if (gList && gList.length > 0) {
        user = gList[0];
      } else {
        const { data: gRole } = await supabase
          .from('users')
          .select('*')
          .eq('role', 'guru')
          .limit(1);
        if (gRole && gRole.length > 0) {
          user = gRole[0];
        }
      }

      // 2. Jika akun belum ada di Supabase, buat secara otomatis
      if (!user) {
        try {
          const hashGuru = bcrypt.hashSync('guru123', 10);
          const { data: createdGuru } = await supabase
            .from('users')
            .upsert([
              {
                nama: 'Bapak / Ibu Guru Pembimbing TKJ',
                email: 'guru123',
                password: hashGuru,
                password_plain: 'guru123',
                role: 'guru',
                foto: 'uploads/default.png',
                bio: 'Guru Pengampu Kejuruan Teknik Komputer & Jaringan'
              }
            ], { onConflict: 'email' })
            .select()
            .single();
          user = createdGuru;
        } catch (errUpsertGuru) {
          console.error('Upsert guru error:', errUpsertGuru);
        }
      }

      // 3. Fallback instan jika database ada hambatan jaringan
      if (!user) {
        user = {
          id: 9999,
          nama: 'Bapak / Ibu Guru Pembimbing TKJ',
          email: 'guru123',
          password: bcrypt.hashSync('guru123', 10),
          password_plain: 'guru123',
          role: 'guru',
          foto: 'uploads/default.png',
          bio: 'Guru Pengampu Kejuruan Teknik Komputer & Jaringan'
        };
      }
    } else if (isAdminLogin) {
      const { data: aList } = await supabase
        .from('users')
        .select('*')
        .or('email.eq.admin123,email.eq.admin,email.eq.admin@netora.id')
        .limit(1);

      if (aList && aList.length > 0) {
        user = aList[0];
      } else {
        const { data: aRole } = await supabase
          .from('users')
          .select('*')
          .eq('role', 'admin')
          .limit(1);
        if (aRole && aRole.length > 0) {
          user = aRole[0];
        }
      }

      if (!user) {
        try {
          const hashAdmin = bcrypt.hashSync('admin123', 10);
          const { data: createdAdmin } = await supabase
            .from('users')
            .upsert([
              {
                nama: 'Administrator Netora',
                email: 'admin123',
                password: hashAdmin,
                password_plain: 'admin123',
                role: 'admin',
                foto: 'uploads/default.png',
                bio: 'Pengelola Utama Platform Netora'
              }
            ], { onConflict: 'email' })
            .select()
            .single();
          user = createdAdmin;
        } catch (errUpsertAdmin) {
          console.error('Upsert admin error:', errUpsertAdmin);
        }
      }

      if (!user) {
        user = {
          id: 1,
          nama: 'Administrator Netora',
          email: 'admin123',
          password: bcrypt.hashSync('admin123', 10),
          password_plain: 'admin123',
          role: 'admin',
          foto: 'uploads/default.png',
          bio: 'Pengelola Utama Platform Netora'
        };
      }
    } else {
      const { data: sList } = await supabase
        .from('users')
        .select('*')
        .eq('email', identifier)
        .limit(1);

      if (sList && sList.length > 0) {
        user = sList[0];
      }
    }

    if (!user) {
      return res.status(400).json({ error: 'Email atau kata sandi salah.' });
    }

    let isMatch = false;
    try {
      isMatch = bcrypt.compareSync(cleanPassword, user.password);
    } catch (e) {
      isMatch = (cleanPassword === user.password);
    }

    if (!isMatch && user.password_plain && (cleanPassword === user.password_plain)) {
      isMatch = true;
    }

    // Toleransi kata sandi default untuk akun Guru & Admin
    if (!isMatch) {
      if ((isGuruLogin || user.role === 'guru') && (cleanPassword === 'guru123' || cleanPassword === 'guru')) {
        isMatch = true;
      }
      if ((isAdminLogin || user.role === 'admin') && (cleanPassword === 'admin123' || cleanPassword === 'admin')) {
        isMatch = true;
      }
    }

    if (!isMatch) {
      return res.status(400).json({ error: 'Email atau kata sandi salah.' });
    }

    // Pastikan role tersinkronisasi
    if (isGuruLogin) {
      user.role = 'guru';
    } else if (isAdminLogin) {
      user.role = 'admin';
    }

    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.userName = user.nama || (user.role === 'guru' ? 'Guru Pembimbing TKJ' : 'Pengguna');
    req.session.role = user.role || 'siswa';

    req.session.save((saveErr) => {
      if (saveErr) console.warn('Session save warning:', saveErr);
      return res.json({
        success: true,
        message: 'Login berhasil!',
        user: {
          id: user.id,
          nama: user.nama,
          email: user.email,
          foto: user.foto || 'uploads/default.png',
          role: user.role
        }
      });
    });
  } catch (err) {
    console.error('Login Error:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Gagal logout.' });
    }
    res.clearCookie('connect.sid');
    return res.json({ success: true, message: 'Berhasil logout.' });
  });
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Belum terautentikasi' });
  }

  // Jika session guru fallback
  if (req.session.userId === 9999 || (req.session.role === 'guru' && req.session.userEmail === 'guru123')) {
    return res.json({
      success: true,
      user: {
        id: req.session.userId,
        nama: req.session.userName || 'Bapak / Ibu Guru Pembimbing TKJ',
        email: 'guru123',
        foto: 'uploads/default.png',
        role: 'guru'
      }
    });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, nama, email, foto, bio, role, created_at')
      .eq('id', req.session.userId)
      .maybeSingle();

    if (error || !user) {
      if (req.session.role === 'guru' || req.session.role === 'admin') {
        return res.json({
          success: true,
          user: {
            id: req.session.userId,
            nama: req.session.userName,
            email: req.session.userEmail || (req.session.role === 'guru' ? 'guru123' : 'admin123'),
            foto: 'uploads/default.png',
            role: req.session.role
          }
        });
      }
      req.session.destroy();
      return res.status(401).json({ error: 'User tidak ditemukan' });
    }
    return res.json({ success: true, user });
  } catch (err) {
    if (req.session.role === 'guru' || req.session.role === 'admin') {
      return res.json({
        success: true,
        user: {
          id: req.session.userId,
          nama: req.session.userName,
          email: req.session.userEmail,
          foto: 'uploads/default.png',
          role: req.session.role
        }
      });
    }
    return res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// POST /api/auth/save-device-token & /api/save-device-token
const { saveDeviceToken } = require('../services/push_notification');
router.post('/save-device-token', async (req, res) => {
  const { token, platform, userId } = req.body;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Push token perangkat wajib disertakan.' });
  }

  const activeUserId = req.session && req.session.userId ? req.session.userId : (userId || null);
  const result = await saveDeviceToken({
    token: token.trim(),
    platform: platform || 'android',
    userId: activeUserId
  });

  if (result.success) {
    return res.json({
      success: true,
      message: 'Push token perangkat berhasil didaftarkan!',
      token: result.token,
      source: result.source
    });
  }

  return res.status(500).json({ error: result.error || 'Gagal menyimpan push token.' });
});

module.exports = router;
