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
    } catch (e) {}
    return res.redirect('/beranda.html');
  }
  res.redirect('/login.html');
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
