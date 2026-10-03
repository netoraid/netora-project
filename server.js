require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const os = require('os');

// Inisialisasi Supabase Database
const { supabase } = require('./database/supabase');

// Verifikasi Koneksi Database Supabase
(async () => {
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      console.error('❌ [DATABASE] Gagal terhubung ke Supabase:', error.message);
    } else {
      console.log('✅ [DATABASE] Terhubung sukses ke Supabase PostgreSQL!');
    }
  } catch (err) {
    console.error('❌ [DATABASE] Error koneksi Supabase:', err.message);
  }
})();

// Direktori Public (HTML, CSS, JS, Aset) & Uploads
const publicDir = path.join(__dirname, 'public');
const uploadsDir = path.join(publicDir, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const assetsDir = path.join(publicDir, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const rootLogo = path.join(__dirname, 'logo.png');
const publicLogo = path.join(assetsDir, 'logo.png');
if (fs.existsSync(rootLogo) && !fs.existsSync(publicLogo)) {
  try {
    fs.copyFileSync(rootLogo, publicLogo);
  } catch (e) {}
}

const defaultAvatar = path.join(uploadsDir, 'default.png');
if (!fs.existsSync(defaultAvatar)) {
  if (fs.existsSync(publicLogo)) {
    try { fs.copyFileSync(publicLogo, defaultAvatar); } catch (e) {}
  } else if (fs.existsSync(rootLogo)) {
    try { fs.copyFileSync(rootLogo, defaultAvatar); } catch (e) {}
  }
}

const app = express();
app.set('trust proxy', 1); // Mengizinkan cookie session bekerja normal saat diakses lewat Dev Tunnels / Reverse Proxy / Pterodactyl
const PORT = process.env.SERVER_PORT || process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Mengizinkan akses dari semua interface jaringan (Wi-Fi / LAN / Pterodactyl Container)

// Middleware CORS (Memastikan request dari perangkat lain diizinkan)
app.use(
  cors({
    origin: true,
    credentials: true
  })
);

// Middleware Parsing Body
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'netora_cyberpunk_secret_key_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 Jam
      httpOnly: true,
      sameSite: 'lax'
    }
  })
);

// Middleware Proteksi Khusus Akses Halaman & Script Admin & Guru (Anti-Bypass / Anti-Hacker)
app.use(async (req, res, next) => {
  const reqPath = (req.path || '').toLowerCase();
  const isAdminTarget =
    reqPath === '/admin.html' ||
    reqPath === '/admin' ||
    reqPath === '/admin/' ||
    reqPath === '/js/admin.js' ||
    reqPath.endsWith('/admin.html');

  if (isAdminTarget) {
    if (!req.session || !req.session.userId) {
      return res.status(404).sendFile(path.join(publicDir, '404.html'));
    }

    try {
      if (req.session.role === 'admin') {
        return next();
      }

      const { data: user, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', req.session.userId)
        .maybeSingle();

      if (error || !user || user.role !== 'admin') {
        return res.status(404).sendFile(path.join(publicDir, '404.html'));
      }

      req.session.role = 'admin';
      return next();
    } catch (err) {
      return res.status(404).sendFile(path.join(publicDir, '404.html'));
    }
  }

  const isGuruTarget =
    reqPath === '/guru.html' ||
    reqPath === '/guru' ||
    reqPath === '/guru/' ||
    reqPath === '/js/guru.js' ||
    reqPath.endsWith('/guru.html');

  if (isGuruTarget) {
    if (!req.session || !req.session.userId) {
      return res.status(404).sendFile(path.join(publicDir, '404.html'));
    }

    try {
      if (req.session.role === 'guru' || req.session.role === 'admin') {
        return next();
      }

      const { data: user, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', req.session.userId)
        .maybeSingle();

      if (error || !user || (user.role !== 'guru' && user.role !== 'admin')) {
        return res.status(404).sendFile(path.join(publicDir, '404.html'));
      }

      req.session.role = user.role;
      return next();
    } catch (err) {
      return res.status(404).sendFile(path.join(publicDir, '404.html'));
    }
  }

  next();
});

// Fallback default avatar jika uploads/default.png diakses
app.get('/uploads/default.png', (req, res) => {
  const customDefault = path.join(uploadsDir, 'default.png');
  if (fs.existsSync(customDefault)) {
    return res.sendFile(customDefault);
  }
  const assetLogo = path.join(assetsDir, 'logo.png');
  if (fs.existsSync(assetLogo)) {
    return res.sendFile(assetLogo);
  }
  return res.sendFile(path.join(__dirname, 'logo.png'));
});

// Serve Static Files (HTML, CSS, JS, Aset)
app.use(express.static(publicDir));
app.use('/assets', express.static(assetsDir));

// Registrasi Route API (Semua rute telah termigrasi 100% ke Supabase)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/materi', require('./routes/materi'));
app.use('/api/video', require('./routes/video'));
app.use('/api/quiz', require('./routes/quiz'));
app.use('/api/pengumuman', require('./routes/pengumuman'));
app.use('/api/profil', require('./routes/profil'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/guru', require('./routes/guru'));

// Route Utama: Masuk ke Halaman Login terlebih dahulu (atau langsung ke Dashboard sesuai role)
app.get('/', async (req, res) => {
  if (req.session && req.session.userId) {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', req.session.userId)
        .maybeSingle();

      if (user && user.role === 'admin') {
        return res.redirect('/admin.html');
      }
      if (user && user.role === 'guru') {
        return res.redirect('/guru.html');
      }
    } catch (e) {}
    return res.redirect('/beranda.html');
  }
  res.redirect('/login.html');
});

// Catch-all 404 Handler untuk rute yang tidak ditemukan
app.use((req, res) => {
  if (req.accepts('html')) {
    return res.status(404).sendFile(path.join(publicDir, '404.html'));
  }
  res.status(404).json({ error: 'Endpoint tidak ditemukan (404)' });
});

// Jalankan Server
app.listen(PORT, HOST, () => {
  const interfaces = os.networkInterfaces();
  const detectedIps = [];

  Object.keys(interfaces).forEach((name) => {
    interfaces[name].forEach((iface) => {
      if (iface.family === 'IPv4' && !iface.internal) {
        detectedIps.push({ name, ip: iface.address });
      }
    });
  });

  const publicIp = process.env.SERVER_IP || '203.175.125.151';
  console.log(`====================================================`);
  console.log(`🚀 Server NETORA v2 (Supabase Cloud Edition) Berjalan!`);
  console.log(`☁️ Database                    : Supabase PostgreSQL`);
  console.log(`🌐 Akses Pterodactyl / IP Public : http://${publicIp}:${PORT}`);
  console.log(`💻 Akses Lokal / Internal      : http://localhost:${PORT}`);
  if (detectedIps.length > 0) {
    console.log(`📱 Interface Jaringan / LAN :`);
    detectedIps.forEach((item) => {
      console.log(`   👉 http://${item.ip}:${PORT}  [${item.name}]`);
    });
  }
  console.log(`====================================================`);
});
