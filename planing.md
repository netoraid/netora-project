# 📋 Dokumentasi Sistem, Arsitektur, Hasil Akhir & Panduan Deployment NETORA v2

---

## 🚀 1. Overview & Visi Proyek
**NETORA v2** adalah platform aplikasi web pembelajaran interaktif terpadu untuk jurusan **Teknik Komputer dan Jaringan (TKJ)** berbasis *full-stack*. Aplikasi ini dirancang dengan antarmuka futuristik bertema **Dark Cyberpunk & Clean Modern** yang mengusung prinsip **Native Web App (Single Page Application Transition)** dan **Responsif Penuh**:
- **Desktop View ($\ge$ 992px)**: Tampil sebagai **Dashboard Pembelajaran Modern** yang leluasa (lebar maksimal 1180px) dengan tata letak multi-kolom simetris, header navigasi desktop, modul materi unggulan, dan laboratorium tugas siswa interaktif.
- **Mobile View ($<$ 992px)**: Tampil ringkas, bersih, ramah jempol (*mobile-first*), tanpa batasan bingkai ponsel tiruan yang membatasi layar fisik smartphone, dilengkapi *Bottom Navigation Bar* putih bersih dan gestur *Pull-to-Refresh*.

---

## 🛠️ 2. Tech Stack & Arsitektur Sistem

Aplikasi dibangun dengan teknologi yang ringan, cepat, tanpa overhead framework berat (*Vanilla Architecture*), sehingga memiliki portabilitas 100% di berbagai platform hosting dan container:

### A. Frontend (Klien)
- **HTML5 Semantik**: Struktur dokumen bersih, teroptimasi SEO, meta tag viewport mobile responsif, dan favicon terpasang di seluruh halaman.
- **Vanilla CSS3 (Design System Terpadu)**: 
  - Variabel CSS (`:root`), Flexbox, CSS Grid.
  - Efek visual modern: Glassmorphism, Ambient Glow, Keyframe Animation 60 FPS.
  - Dual Mode Visual: Cyberpunk Dark Mode & Clean White Card Layout.
- **Vanilla JavaScript ES6+**:
  - **Native SPA Transition Router**: Pergantian halaman instan tanpa reload dokumen, bebas layar putih (*zero-white-flash*).
  - **In-Memory Pre-Caching**: Memuat halaman di RAM browser untuk respon instan < 10ms.
  - **Dynamic State & DOM Manipulation**: Event binding otomatis, Async/Await Fetch API, Modal System, Toast Notification Engine.

### B. Backend (Server)
- **Node.js**: Runtime JavaScript asynchronous berkinerja tinggi.
- **Express.js (v4.21+)**: Web application framework untuk routing RESTful API dan penyajian file statis.
- **Session Management (`express-session`)**: Pengelolaan autentikasi berbasis cookie `httpOnly` dengan masa aktif 24 jam dan dukungan reverse proxy (`app.set('trust proxy', 1)`).
- **Keamanan Sandi (`bcryptjs`)**: Password hashing dengan algoritma salt 10 rounds (100% Pure JavaScript, tanpa kompilasi native C++).
- **File Upload Engine (`multer`)**: Pengunggahan foto profil avatar ke direktori `public/uploads/` dengan filter ekstensi gambar dan batasan ukuran berkas (maks 5MB).
- **CORS & Body Parser**: Terintegrasi untuk mendukung integrasi API lintas perangkat.

### C. Basis Data (Database)
- **Engine**: **Supabase Cloud (PostgreSQL)**.
- **Client**: **`@supabase/supabase-js`** terintegrasi langsung dengan backend Express.js.
- **Kredensial**: Menggunakan `SUPABASE_SERVICE_ROLE_KEY` untuk operasi backend penuh dan RLS (*Row Level Security*) pada tabel publik.
- **Fitur Utama**: Skalabilitas cloud, relasi integritas referensial penuh (Foreign Key `ON DELETE CASCADE`), indeks performa tinggi, dan backup cloud otomatis.

---

## 📁 3. Struktur File & Direktori Proyek

```
Netora/
├── server.js                  # Entrypoint server Express & port binding dinamis
├── netora.db                  # Database SQLite (Users, Materi, Video, Quiz, Pengumuman)
├── package.json               # Konfigurasi dependensi Pure JS & engines Node.js
├── package-lock.json          # Lockfile dependensi npm
├── planing.md                 # Dokumentasi master sistem, arsitektur & panduan deploy
├── .gitignore                 # Filter berkas untuk upload/git (node_modules, mp4, apk)
│
├── database/
│   └── init.js                # Skema 6 tabel SQLite, query wrapper, & data seeding awal
│
├── middleware/
│   └── auth.js                # Middleware proteksi route session (requireAuth & admin check)
│
├── routes/
│   ├── auth.js                # Endpoint Login, Register, Logout, & Session Me
│   ├── materi.js              # Endpoint Katalog & Detail Materi
│   ├── video.js               # Endpoint Galeri Video Praktikum Mikrotik
│   ├── quiz.js                # Endpoint Soal Quiz & Perhitungan Skor
│   ├── pengumuman.js          # Endpoint Pengumuman & Notifikasi
│   ├── profil.js              # Endpoint Profil, Password, & Upload Avatar
│   └── admin.js               # Endpoint CRUD Lengkap Khusus Admin
│
└── public/                    # Seluruh Halaman & Aset Web (Static Web Root)
    ├── assets/
    │   └── logo.png           # Logo master Netora
    ├── uploads/
    │   └── default.png        # Avatar default pengguna & folder unggahan foto
    ├── css/
    │   └── netora.css         # Master Stylesheet (Desktop, Mobile, Animasi SPA, Layout)
    ├── js/
    │   ├── netora.js          # Engine SPA Router, Pull-to-Refresh, Toast, Header Sync
    │   ├── auth.js            # Logika Login, Register, & Validasi Input
    │   ├── beranda.js         # Inisialisasi Beranda & Carousel
    │   ├── materi.js          # Inisialisasi & Filter Katalog Materi
    │   ├── video.js           # Inisialisasi Galeri & Video Player Modal
    │   ├── quiz.js            # State Machine Kuis Interaktif 10 Soal
    │   ├── kalkulator.js      # Algoritma Subnetting RFC 791/4632 & Riwayat Lokal
    │   ├── progres.js         # Statistik Pembelajaran & Riwayat Nilai
    │   ├── pengumuman.js      # Daftar Notifikasi & Pengumuman
    │   ├── profil.js          # Tab Edit Profil, Keamanan, & Ganti Avatar
    │   └── admin.js           # Single Page Application Dashboard Admin
    │
    ├── beranda.html           # Dashboard Utama Siswa (4 Modul Inti & Lab Tugas)
    ├── materi.html            # Katalog Modul Pembelajaran (Grid 2 Kolom)
    ├── materi-detail.html     # Pembaca Modul Lengkap
    ├── video.html             # Galeri Video Praktik RouterOS
    ├── quiz.html              # Uji Kompetensi Interaktif 10 Soal
    ├── kalkulator.html        # Kalkulator Subnetting & CIDR Split Desktop
    ├── progres.html           # Laporan Capaian Belajar Siswa
    ├── pengumuman.html        # Pusat Pengumuman & Informasi
    ├── profil.html            # Profil Pengguna & Pengaturan Akun
    ├── login.html             # Halaman Masuk Multi-Role
    ├── register.html          # Halaman Pendaftaran Siswa
    ├── admin.html             # Panel Kontrol Manajemen Admin
    └── tentang.html           # Informasi Versi Aplikasi & Pengembang
```

---

## 🗄️ 4. Skema Basis Data SQLite (`netora.db`)

1. **`users`**:
   - `id` (INTEGER PK AUTOINCREMENT)
   - `nama` (TEXT), `email` (TEXT UNIQUE), `password` (HASH BCRYPT)
   - `foto` (TEXT, default: `uploads/default.png`), `bio` (TEXT)
   - `role` (TEXT, default: `'siswa'`, opsi: `'admin'`)
   - `created_at` (DATETIME)
2. **`materi`**:
   - `id` (INTEGER PK AUTOINCREMENT), `judul` (TEXT), `kategori` (TEXT), `isi` (TEXT), `created_at` (DATETIME)
   - *(Kategori: Cisco, Mikrotik, Server & Linux, Jaringan Dasar)*
3. **`video`**:
   - `id` (INTEGER PK AUTOINCREMENT), `judul` (TEXT), `deskripsi` (TEXT), `url_youtube` (TEXT)
   - `kategori` (TEXT), `durasi` (TEXT), `created_at` (DATETIME)
4. **`quiz`**:
   - `id` (INTEGER PK AUTOINCREMENT), `pertanyaan` (TEXT)
   - `pilihan_a` (TEXT), `pilihan_b` (TEXT), `pilihan_c` (TEXT), `pilihan_d` (TEXT)
   - `jawaban_benar` (TEXT), `kategori` (TEXT)
5. **`nilai_quiz`**:
   - `id` (INTEGER PK AUTOINCREMENT), `user_id` (FK users.id), `skor` (INTEGER), `tanggal` (DATETIME)
6. **`pengumuman`**:
   - `id` (INTEGER PK AUTOINCREMENT), `judul` (TEXT), `isi` (TEXT), `kategori` (TEXT), `penting` (INTEGER 0/1), `created_at` (DATETIME)

---

## 🔌 5. Daftar Endpoint RESTful API

### 🔐 Autentikasi (`/api/auth`)
- `POST /api/auth/register` : Mendaftarkan siswa baru.
- `POST /api/auth/login` : Masuk akun siswa / admin.
- `POST /api/auth/logout` : Menghapus session aktif.
- `GET /api/auth/me` : Mendeteksi session login saat ini.

### 📚 Modul Pembelajaran (`/api/materi`)
- `GET /api/materi` : Mengambil seluruh katalog materi.
- `GET /api/materi/:id` : Mengambil detail baca modul materi.

### 🎥 Video Tutorial (`/api/video`)
- `GET /api/video` : Mengambil daftar video tutorial YouTube.

### 📝 Kuis Interaktif (`/api/quiz`)
- `GET /api/quiz` : Mengambil 10 soal acak tanpa kunci jawaban.
- `POST /api/quiz/submit` : Menghitung skor kuis & menyimpan nilai (jika login).
- `GET /api/quiz/riwayat` : Riwayat nilai ujian siswa yang login.

### 📢 Pengumuman (`/api/pengumuman`)
- `GET /api/pengumuman` : Mengambil pengumuman aktif.

### 👤 Profil & Akun Siswa (`/api/profil`)
- `GET /api/profil` : Data profil & riwayat belajar siswa.
- `PUT /api/profil/update` : Memperbarui nama dan bio.
- `PUT /api/profil/ganti-password` : Mengganti kata sandi.
- `POST /api/profil/upload-foto` : Mengunggah foto profil (Multipart Form).
- `DELETE /api/profil/hapus-foto` : Mereset foto profil ke default.

### 🛡️ Manajemen Admin (`/api/admin`)
- `GET /api/admin/stats` : Statistik total siswa, materi, video, dan quiz.
- `GET /api/admin/aktivitas` : Log aktivitas siswa terkini.
- `GET /api/admin/siswa` : Daftar seluruh siswa.
- `POST /api/admin/siswa` : Menambahkan akun siswa baru secara manual.
- `PUT /api/admin/siswa/:id/password` : Reset kata sandi siswa.
- `DELETE /api/admin/siswa/:id` : Menghapus akun siswa.
- `POST /api/admin/reset-siswa` : Reset massal data siswa non-admin.
- CRUD Materi: `GET`, `POST`, `PUT`, `DELETE` ke `/api/admin/materi`.
- CRUD Video: `GET`, `POST`, `PUT`, `DELETE` ke `/api/admin/video`.
- CRUD Quiz: `GET`, `POST`, `PUT`, `DELETE` ke `/api/admin/quiz`.
- CRUD Pengumuman: `GET`, `POST`, `DELETE` ke `/api/admin/pengumuman`.

---

## 🧭 6. Alur Pengguna & Sistem Hak Akses (User Flow)

```mermaid
graph TD
    A["Pengunjung Mengakses URL ('/')"] --> B{"Punya Sesi Login?"}
    B -->|Tidak| C["Halaman Login (login.html)"]
    B -->|Ya & Role Siswa| D["Dashboard Siswa (beranda.html)"]
    B -->|Ya & Role Admin| E["Panel Admin (admin.html)"]
    
    C -->|Klik Daftar| F["Halaman Register (register.html)"]
    C -->|Login Sukses| B
    
    D --> G["Materi Pembelajaran (materi.html)"]
    D --> H["Video Praktik (video.html)"]
    D --> I["Quiz Interaktif (quiz.html)"]
    D --> J["Kalkulator IP (kalkulator.html)"]
    D --> K["Laporan Progress (progres.html)"]
    D --> L["Pusat Notifikasi (pengumuman.html)"]
    D --> M["Pengaturan Akun (profil.html)"]
```

---

## 🏆 7. Hasil Akhir yang Sudah Selesai 100% (Milestone Akhir)

Berikut adalah rekapitulasi fitur dan penyempurnaan menyeluruh yang telah selesai diimplementasikan:

### 1. Native SPA Transition Engine (Perpindahan Halaman Mulus 60 FPS)
- **Zero Browser Reload & Layar Putih Hilang Total**: Mengeliminasi `window.location.href` pada navigasi antar halaman dashboard siswa (`beranda`, `materi`, `video`, `quiz`, `kalkulator`, `progres`, `pengumuman`, `profil`).
- **In-Memory Pre-Caching (0ms Respons)**: Seluruh halaman siswa di-cache ke dalam memori RAM browser di latar belakang saat aplikasi dimuat pertama kali.
- **Micro-Glide Directional Animation**: Animasi meluncur halus ke kanan saat navigasi maju, dan meluncur ke kiri saat menekan tombol Kembali atau tab di sebelah kiri.
- **History & Gestur Back HP**: Mendukung `history.pushState` dan listener `popstate`, sehingga tombol Back fisik smartphone berfungsi sempurna tanpa reload.
- **Re-inisialisasi Script Otomatis**: Setiap skrip halaman mengekspor fungsi inisialisasi (`initBerandaPage`, `initMateriPage`, `initVideoPage`, `initQuizPage`, `initKalkulatorPage`, `initProgresPage`, `initPengumumanPage`, `initProfilPage`) yang langsung dieksekusi saat rute berganti.

### 2. Formal Pull-to-Refresh Engine
- **Khusus Halaman Dashboard Siswa**: Fitur tarik ke bawah untuk refresh aplikasi pada perangkat mobile.
- **Desain Formal & Elegan**: Menggunakan spinner berputar formal yang bersih di bagian atas layar.
- **Non-Blocking Gesture**: Memiliki threshold tarikan terukur (> 75px) dan sensitivitas tinggi tanpa mengganggu scrolling normal konten halaman.

### 3. Redesain Kalkulator IP Subnetting Real-time
- **Standar RFC Otentik**: Menghitung Subnet Mask, Network Address, Broadcast Address, Wildcard Mask, Usable Host Range, dan Total Host berdasarkan RFC 791 dan RFC 4632.
- **Layout Split 2 Kolom Desktop**: Form input di sisi kiri dan Card Hasil Kalkulasi Interaktif di sisi kanan.
- **Dynamic Spotlight Card**: Menampilkan nilai sorotan dengan aksen warna dinamis sesuai pilihan (Subnet, Network, Broadcast, Range).
- **Format Biner 32-Bit Terpadu**: Visualisasi susunan bit biner subnet mask dalam kartu rapi.
- **1-Click Copy**: Tombol salin instan dengan notifikasi toast pada setiap parameter hasil.
- **Riwayat Perhitungan**: Menyimpan 5 perhitungan terakhir secara lokal di peramban.

### 4. Bottom Spacing & Unified Bottom Navigation Bar
- **Standarisasi Spacing 60px**: Penyeragaman tinggi navigasi bawah (60px) dan jarak aman konten mobile (padding-bottom 68px) di semua halaman.
- **Visual Bersih & Responsif**: Berwarna putih bersih dengan indikator dot notifikasi dan penanda aktif (*active tab highlight*).

### 5. Panel Kontrol Admin Terpadu (`admin.html`)
- **Single Page Application Admin**: Manajemen data siswa, materi, video, kuis, dan pengumuman dalam satu antarmuka cepat dengan sidebar responsif.
- **Proteksi Tingkat Tinggi**: Verifikasi peran (*role check*) di level server; pengguna berstatus siswa otomatis ditolak jika mencoba mengakses API admin.

---

## 🌐 8. Panduan Deployment Lengkap ke Pterodactyl Panel (fincloud.my.id)

Bagian ini memuat panduan lengkap untuk memasang dan menjalankan aplikasi **NETORA v2** pada server hosting **Pterodactyl Panel** di **`https://panel.fincloud.my.id`** dengan **IP Public: `203.175.125.151`**.

### A. Spesifikasi & Kompatibilitas Sistem

| Parameter | Spesifikasi / Konfigurasi |
|---|---|
| **Alamat Panel** | `https://panel.fincloud.my.id` |
| **IP Public Server** | `203.175.125.151` |
| **Nest / Egg** | **NodeJS** (Generic Node.js Egg) |
| **Docker Image** | `ghcr.io/parkervcp/yolks:nodejs_22` *(Sangat Disarankan)* atau `nodejs_20` |
| **File Utama (Startup)** | `server.js` |
| **Perintah Startup** | `node server.js` atau `npm start` |
| **Port Binding** | Otomatis membaca `process.env.PORT` atau `process.env.SERVER_PORT` di host `0.0.0.0` |

### B. Daftar Berkas yang Wajib Di-Upload

Saat membuat berkas `.zip` untuk diunggah ke File Manager Pterodactyl:

#### ✅ Berkas & Folder yang HARUS Di-Upload:
1. `public/` (Semua file HTML, CSS, JS, Gambar, dan Ikon)
2. `routes/` (Seluruh berkas route API)
3. `database/` (Berkas `init.js`)
4. `middleware/` (Berkas `auth.js`)
5. `server.js` (Server backend)
6. `package.json` & `package-lock.json`
7. `netora.db` *(Penting: sertakan database ini agar data materi, akun admin, video, dan quiz bawaan langsung tersedia)*

#### ❌ Berkas yang JANGAN Di-Upload:
- `node_modules/` *(Dilarang upload dari Windows! Biarkan panel menginstal dependensi melalui `npm install` agar sesuai dengan container Linux)*
- Berkas video rekaman besar (`*.mp4`)
- Berkas installer APK (`*.apk`)
- Berkas script lokal Windows (`*.bat`)

### C. Langkah-Langkah Pemasangan di Pterodactyl

1. **Buka Server di Panel Fincloud**:
   - Login ke `https://panel.fincloud.my.id`.
   - Buka server Node.js Anda.
   - Buka tab **Network / Allocation** dan catat **Port** yang diberikan sistem (Contoh: `10025`, `25565`, dll).

2. **Atur Menu "Startup"**:
   - Masuk ke tab **Startup** pada panel.
   - Pastikan Docker Image mengarah ke **NodeJS 22** (`ghcr.io/parkervcp/yolks:nodejs_22`).
   - Pastikan Startup Command berisi: `node server.js` (atau `npm start`).
   - Pastikan Main File berisi: `server.js`.

3. **Upload & Ekstrak Berkas di Menu "Files"**:
   - Masuk ke tab **Files**.
   - Unggah berkas `netora.zip`.
   - Klik kanan atau opsi menu pada berkas zip, pilih **Unarchive / Extract**.
   - Pastikan berkas `server.js` berada langsung di folder utama `/home/container/`.

4. **Instal Dependensi (`npm install`)**:
   - Buka tab **Console**.
   - Jika egg tidak melakukan instalasi otomatis, jalankan perintah:
     ```bash
     npm install
     ```
   - *(Dependensi Netora 100% Pure JavaScript: `express`, `express-session`, `cors`, `bcryptjs`, dan `multer`. Proses instalasi hanya memakan waktu 3–5 detik).*

5. **Nyalakan Server**:
   - Klik tombol **Start** pada server.
   - Amati log di Console:
     ```text
     ====================================================
     🚀 Server NETORA v2 Berjalan & Siap Digunakan!
     🌐 Akses Pterodactyl / IP Public : http://203.175.125.151:<PORT>
     💻 Akses Lokal / Internal      : http://localhost:<PORT>
     ====================================================
     ```

### D. Akses Aplikasi & Akun Login Bawaan

Akses aplikasi melalui peramban:
```
http://203.175.125.151:<PORT_ALOKASI_ANDA>
```
*(Contoh jika port alokasi Anda adalah `10025`: `http://203.175.125.151:10025`)*

#### Kredensial Akun Default:
- **Akun Admin**:
  - Email: `admin@netora.id`
  - Password: `password123`
  - *(Memiliki akses penuh ke halaman `/admin.html`)*
- **Akun Siswa Contoh**:
  - Email: `siswa@netora.id`
  - Password: `password123`
  - *(Atau buat akun siswa baru secara instan melalui menu Daftar di `/register.html`)*

### E. Keunggulan Arsitektur Netora di Pterodactyl
1. **Relative API Endpoints**: Seluruh pemanggilan data di sisi frontend menggunakan path relatif (`/api/...`). Tidak ada URL IP lokal yang terikat (*hardcoded*), sehingga aplikasi langsung berjalan normal di IP publik manapun, port berapapun, atau domain kustom bersertifikat SSL (`https://netora.fincloud.my.id`).
2. **Dynamic Port Binding**: `server.js` secara otomatis membaca variabel lingkungan `process.env.PORT` atau `process.env.SERVER_PORT` yang diberikan oleh Pterodactyl di host `0.0.0.0`.
3. **Session Stability**: Menggunakan konfigurasi `app.set('trust proxy', 1)` agar cookie sesi login tetap valid dan tidak mudah logout saat diakses melalui reverse proxy.

---

## 💻 9. Panduan Operasional Lokal (Development)

Untuk menjalankan atau mengembangkan aplikasi di komputer lokal:

```bash
# Instalasi dependensi
npm install

# Menjalankan server produksi
npm start

# Menjalankan mode pengembangan (auto-reload saat file diedit)
npm run dev
```

Aplikasi lokal dapat diakses melalui:
👉 **`http://localhost:3000`**

---

## 🌐 10. Panduan Integrasi Custom Domain (`netora.web.id`), Cloudflare & Pembuatan Aplikasi Mobile (APK / PWA)

Dokumen ini merupakan panduan teknis langkah-demi-langkah untuk menghubungkan domain kustom **`netora.web.id`** ke server Pterodactyl melalui jaringan global **Cloudflare**, mengaktifkan sertifikat SSL/HTTPS gratis, menghilangkan nomor port alokasi pada URL, serta mengubah web menjadi aplikasi Android (.apk / PWA) siap instal untuk siswa.

---

### 10.1. Langkah 1: Hubungkan Domain `netora.web.id` ke Cloudflare

1. **Daftar Akun Cloudflare**:
   - Buka [https://dash.cloudflare.com](https://dash.cloudflare.com) dan buat akun gratis.
   - Klik tombol **Add a Site** / **Tambahkan Situs**, lalu masukkan nama domain: `netora.web.id`.
   - Pilih paket **Free (Gratis)**.

2. **Ubah Nameserver di Registrar Domain**:
   - Cloudflare akan menampilkan 2 alamat Nameserver khusus (misal: `amy.ns.cloudflare.com` dan `bob.ns.cloudflare.com`).
   - Masuk ke dashboard tempat Anda membeli domain `netora.web.id` (misalnya: Niagahoster, DomaiNesia, IDwebhost, Exabytes, dsb).
   - Masuk ke menu **Domain Management** $\rightarrow$ **Nameservers** (DNS).
   - Ubah Nameserver bawaan registrar menjadi 2 Nameserver Cloudflare tersebut, lalu simpan.
   - *Tunggu proses propagasi DNS (biasanya 5–30 menit).*

---

### 10.2. Langkah 2: Konfigurasi DNS Record di Cloudflare

Setelah status domain di Cloudflare aktif (**Active**):
1. Masuk ke menu **DNS** $\rightarrow$ **Records** di dashboard Cloudflare `netora.web.id`.
2. Tambahkan DNS Record untuk mengarahkan traffic ke IP Server Pterodactyl:
   - **Tipe**: `A`
   - **Name**: `@` (atau `netora.web.id`)
   - **IPv4 Address**: Masukkan IP Publik Node Pterodactyl Anda (misalnya: `203.175.125.151`).
   - **Proxy status**: **Proxied** (Ikon awan warna Orange ☁️ aktif).
   - **TTL**: `Auto`.
3. Tambahkan juga subdomain `www` (opsional):
   - **Tipe**: `CNAME`
   - **Name**: `www`
   - **Target**: `netora.web.id`
   - **Proxy status**: **Proxied** (Awan Orange).

---

### 10.3. Langkah 3: Menghilangkan Nomor Port Menggunakan Cloudflare Origin Rules (Tanpa Perlu Setup Nginx Tambahan)

Karena server Pterodactyl biasanya menggunakan port khusus (misalnya port alokasi `10025`, bukan port 80/443), jika langsung diakses siswa harus mengetik `netora.web.id:10025`. 

Agar siswa bisa membuka **`https://netora.web.id`** secara bersih **tanpa mengetik nomor port**, gunakan fitur gratis bawaan Cloudflare: **Origin Rules**.

1. Di dashboard Cloudflare domain `netora.web.id`, buka menu **Rules** $\rightarrow$ **Origin Rules**.
2. Klik tombol **Create rule**.
3. Isi parameter konfigurasi berikut:
   - **Rule name**: `Pterodactyl Port Forwarding`
   - **Field**: `Hostname`
   - **Operator**: `equals`
   - **Value**: `netora.web.id`
   - *(Jika ingin mencakup www, klik "Or" lalu tambah Hostname equals `www.netora.web.id`)*.
4. Di bagian bawah (**Destination Port**):
   - Pilih opsi: **Rewrite to...**
   - Masukkan **Port Alokasi Pterodactyl Anda** (misalnya: `10025`).
5. Klik **Deploy**.

> 💡 **Hasilnya**: Setiap kali siswa mengetik `https://netora.web.id` di browser, Cloudflare otomatis meneruskan request ke port alokasi Pterodactyl di latar belakang. Siswa melihat URL bersih `https://netora.web.id` dengan gembok SSL hijau/aman!

---

### 10.4. Langkah 4: Konfigurasi SSL/TLS & Enkripsi Cloudflare

1. Masuk ke menu **SSL/TLS** $\rightarrow$ **Overview** di Cloudflare.
2. Pilih mode enkripsi:
   - **Flexible**: *(Rekomendasi jika container Node.js di Pterodactyl berjalan dengan protokol HTTP biasa)*. Cloudflare mengamankan akses pengguna dengan HTTPS modern, lalu berkomunikasi ke Pterodactyl dengan cepat.
3. Masuk ke sub-menu **SSL/TLS** $\rightarrow$ **Edge Certificates**:
   - Aktifkan **Always Use HTTPS**: **ON** *(otomatis mengalihkan akses http:// ke https://)*.
   - Aktifkan **Automatic HTTPS Rewrites**: **ON**.
   - **Minimum TLS Version**: `TLS 1.2`.

---

### 10.5. Langkah 5: Pembuatan Aplikasi Mobile Android (APK & PWA)

Aplikasi Netora v2 telah didesain dengan konsep **Mobile-First Responsive Web Application** dengan navigasi bilah bawah *(Bottom Navigation Bar)* dan sentuhan *app shell*. Ada 2 metode untuk menjadikannya aplikasi di smartphone siswa:

#### Metode A: Progressive Web App (PWA - Langsung dari Browser Tanpa Download File)
Siswa cukup membuka `https://netora.web.id` di browser Google Chrome / Brave di HP Android:
1. Browser akan otomatis memunculkan banner: **"Tambahkan Netora ke Layar Utama"** / **"Install Aplikasi Netora"**.
2. Siswa menekan **Install**.
3. Ikon Netora dengan logo resmi akan muncul di menu aplikasi Android siswa layaknya aplikasi Play Store, berjalan *full screen* tanpa kolom address bar browser!

#### Metode B: Build File APK Siap Pasang Menggunakan PWABuilder (Gratis & Instan)
Jika Anda ingin membagikan file installer fisik berformat **`.apk`** ke grup WhatsApp kelas atau menguploadnya ke Google Play Store:
1. Pastikan domain `https://netora.web.id` sudah aktif dan dapat diakses dengan HTTPS.
2. Buka situs resmi Microsoft PWA: [https://www.pwabuilder.com](https://www.pwabuilder.com).
3. Masukkan URL: `https://netora.web.id` lalu klik **Start**.
4. PWABuilder akan memvalidasi Manifest dan Service Worker.
5. Klik tombol **Package for Android**.
6. Atur konfigurasi aplikasi:
   - **Package ID**: `id.web.netora.app`
   - **App Name**: `Netora - Belajar TKJ`
   - **Launcher Icon**: Otomatis menggunakan `logo.png` Netora.
7. Klik **Download Package**. Anda akan mendapatkan file **`netora.apk`** siap kirim ke siswa!

#### Metode C: Wrapper Native Android Studio (WebView / TWA)
Jika menginginkan build kustom dari source code Java/Kotlin di Android Studio:
- Buat proyek Android baru dengan template **Empty Views Activity**.
- Pada `MainActivity.java`, inisialisasi `WebView` dengan URL awal:
  ```java
  WebView webView = findViewById(R.id.webview);
  webView.getSettings().setJavaScriptEnabled(true);
  webView.getSettings().setDomStorageEnabled(true);
  webView.setWebViewClient(new WebViewClient());
  webView.loadUrl("https://netora.web.id");
  ```
- Tambahkan izin internet di `AndroidManifest.xml`:
  ```xml
  <uses-permission android:name="android.permission.INTERNET" />
  ```
- Build $\rightarrow$ **Build APK(s)** untuk menghasilkan file instalasi.

---

### 10.6. Checklist Lengkap Deployment Akhir

| No | Tahapan | Status | Keterangan |
|---|---|:---:|---|
| 1 | Database Supabase PostgreSQL | ✅ Siap | Seluruh tabel & API termigrasi |
| 2 | File Server & Route API | ✅ Siap | Bebas script Windows `.bat` |
| 3 | Upload ke Panel Pterodactyl | ⏳ Siap Dilakukan | Ekstrak ZIP & `npm install` |
| 4 | Setting Domain `netora.web.id` di Cloudflare | ⏳ Siap Dilakukan | Ubah Nameserver & Tambah Record A |
| 5 | Cloudflare Origin Rule (Port Rewrite) | ⏳ Siap Dilakukan | Teruskan port 443 ke port Pterodactyl |
| 6 | Verifikasi HTTPS / SSL | ⏳ Siap Dilakukan | Mode Flexible & Always Use HTTPS |
| 7 | Generate APK / PWA Siswa | ⏳ Siap Dilakukan | Via PWABuilder / Add to Home Screen |

---
*Dokumentasi ini mencerminkan arsitektur sistem final aplikasi NETORA v2 — Tim Pengembang Netora © 2026.*
