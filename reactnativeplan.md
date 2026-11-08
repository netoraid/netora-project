# Rencana Eksekusi: Kompilasi Web NETORA ke Aplikasi Android (React Native WebView)

Dokumen ini memuat perencanaan teknis, arsitektur, dependensi, konfigurasi native, serta langkah-langkah implementasi untuk mengompilasi platform **https://www.netora.web.id** menjadi aplikasi mobile Android (.APK / .AAB) siap rilis menggunakan **React Native**.

---

## 1. Ringkasan Proyek & Tujuan

| Parameter | Spesifikasi |
| :--- | :--- |
| **Nama Aplikasi** | NETORA (Media Pembelajaran TKJ) |
| **Package Name** | `id.web.netora.app` |
| **Target URL Utama** | `https://www.netora.web.id` |
| **Platform Target** | Android (Min SDK 24 / Android 7.0, Target SDK 34 / Android 14+) & iOS |
| **Metode Kompilasi** | React Native Hybrid WebView Wrapper dengan Optimasi Native Device |
| **Tujuan** | Memberikan pengalaman aplikasi mobile native kepada siswa, auto-sync dengan server tanpa perlu build ulang saat ada perubahan konten, dan siap diunggah ke Google Play Store. |

---

## 2. Arsitektur & Struktur Direktori

Proyek aplikasi mobile ini direkomendasikan dibuat dalam satu folder terpisah (misalnya: `netora-mobile/` atau `mobile/`) agar independen dari repositori backend server Netora.

```text
netora-mobile/
├── android/                        # Konfigurasi Gradle, Manifest, & Keystore Android
│   ├── app/
│   │   ├── build.gradle            # Versi APK, dependensi native, & signing config
│   │   └── src/main/
│   │       ├── AndroidManifest.xml # Izin internet, storage, kamera, & keyboard resize
│   │       └── res/                # Aset icon (mipmap) & splash screen
├── src/
│   ├── components/
│   │   ├── CustomStatusBar.js     # Status bar biru Netora (#0D5BFF)
│   │   ├── OfflineNotice.js       # Tampilan ramah saat koneksi internet terputus
│   │   └── LoadingOverlay.js      # Animasi loading indicator saat berpindah laman
│   ├── hooks/
│   │   └── useAndroidBackHandler.js # Penanganan tombol fisik "Back" di smartphone
│   └── App.js                     # Root controller React Native + WebView engine
├── assets/
│   ├── icon.png                   # Icon aplikasi Netora (512x512)
│   └── splash.png                 # Gambar splash screen pembuka aplikasi
├── package.json
└── README.md
```

---

## 3. Daftar Dependensi & Pustaka Inti

Pustaka yang akan diinstal pada proyek React Native:

1. **`react-native-webview`** (Wajib): 
   - Engine perender web performa tinggi berbasis Chromium (Android) dan WebKit (iOS).
   - Mendukung eksekusi JavaScript, LocalStorage, Session Cookies, dan komunikasi dua arah (*postMessage*).
2. **`@react-native-community/netinfo`**:
   - Mendeteksi ketersediaan koneksi internet secara realtime. Jika data seluler/Wi-Fi terputus, aplikasi menampilkan peringatan ramah (*offline screen*) dan tombol "Coba Lagi" tanpa crash.
3. **`react-native-safe-area-context`**:
   - Mengatur margin layar agar tidak tertutup oleh poni kamera (notch), camera hole, maupun tombol navigasi bawah smartphone Android modern.
4. **`react-native-splash-screen`**:
   - Mencegah layar putih kosong (*white blink*) saat aplikasi pertama kali di-tap oleh pengguna.

---

## 4. Rencana Fitur Khusus & Optimasi Rasa Native

Agar aplikasi tidak terasa kaku seperti membuka Chrome biasa, fitur-fitur berikut akan dipasang:

### A. Penanganan Tombol "Back" Fisik Android (`BackHandler`)
* **Skenario:** Ketika siswa menekan tombol "Back" di navigasi HP:
  * Jika sedang berada di dalam materi, kuis, atau halaman detail $\rightarrow$ kembali ke halaman sebelumnya di web (`webViewRef.current.goBack()`).
  * Jika sudah berada di beranda/halaman awal $\rightarrow$ muncul konfirmasi toast: *"Tekan sekali lagi untuk keluar dari Netora"*. Aplikasi tidak langsung tertutup secara mendadak.

### B. Izin Kamera & Galeri Foto (`AndroidManifest.xml`)
* Fitur ganti foto profil siswa dan fitur unggah gambar materi di panel admin memerlukan izin native:
  * `android.permission.INTERNET`
  * `android.permission.ACCESS_NETWORK_STATE`
  * `android.permission.CAMERA`
  * `android.permission.READ_MEDIA_IMAGES` (Android 13+)
  * `android.permission.READ_EXTERNAL_STORAGE` (Android 12 ke bawah)
* Mengaktifkan `domStorageEnabled={true}`, `allowFileAccess={true}`, dan `geolocationEnabled={false}` pada komponen WebView.

### C. Penyesuaian Keyboard & Formulir (`windowSoftInputMode`)
* Saat mengetik materi di editor atau mengisi kuis, keyboard Android sering kali menutupi tombol simpan.
* Diatur dengan: `android:windowSoftInputMode="adjustResize"` pada `AndroidManifest.xml` agar tampilan otomatis bergeser ke atas saat keyboard virtual muncul.

### D. Status Bar & Tampilan Visual Identik
* Background Status Bar disetel ke warna biru Netora (`#0D5BFF`) dengan icon teks putih (`barStyle="light-content"`).
* Menghilangkan scrollbar horizontal yang tidak sengaja tergeser.
* Menambahkan fitur **Pull-to-Refresh** (tarik ke bawah untuk menyegarkan data) menggunakan `RefreshControl`.

---

## 5. Prasyarat Lingkungan Pengembangan (Development Environment)

Sebelum memulai pembuatan proyek, alat-alat berikut perlu dipersiapkan di komputer:

1. **Node.js**: Versi LTS ($\ge$ 20.x).
2. **Java Development Kit (JDK)**: OpenJDK 17 (versi standar untuk Android SDK terbaru).
3. **Android Studio**:
   - Android SDK Platform 34 (Android 14) / 35.
   - Android SDK Build-Tools.
   - Android Virtual Device (AVD) atau Smartphone fisik dengan mode *USB Debugging* aktif untuk uji coba.

---

## 6. Tahapan Eksekusi Step-by-Step

### Tahap 1: Inisialisasi Proyek
```bash
npx @react-native-community/cli@latest init NetoraApp
cd NetoraApp
```

### Tahap 2: Pemasangan Dependensi
```bash
npm install react-native-webview @react-native-community/netinfo react-native-safe-area-context
```

### Tahap 3: Konfigurasi Native Android
1. Modifikasi `android/app/src/main/AndroidManifest.xml` (tambahkan izin dan fitur kamera/penyimpanan).
2. Pasang ikon aplikasi Netora ke folder `android/app/src/main/res/mipmap-*`.
3. Setel nama aplikasi di `android/app/src/main/res/values/strings.xml` menjadi `"NETORA"`.

### Tahap 4: Penulisan Logika Utama (`App.js`)
* Pasang komponen `WebView` dengan `source={{ uri: 'https://www.netora.web.id' }}`.
* Hubungkan event listener `onNavigationStateChange` dengan hook `BackHandler`.
* Tambahkan pengecekan koneksi `NetInfo`.

### Tahap 5: Pengujian (Testing)
* Uji coba login, navigasi menu, pembacaan materi, pengerjaan kuis dengan timer, hingga upload foto profil pada perangkat Android.

### Tahap 6: Generate Keystore & Build APK Rilis
1. Buat production keystore:
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore netora-release-key.p12 -alias netora-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Konfigurasi `signingConfigs` pada `android/app/build.gradle`.
3. Jalankan kompilasi:
   * **Untuk file APK langsung install:**
     ```bash
     cd android && ./gradlew assembleRelease
     ```
     Hasil APK: `android/app/build/outputs/apk/release/app-release.apk`
   * **Untuk file AAB (Google Play Store):**
     ```bash
     cd android && ./gradlew bundleRelease
     ```
     Hasil AAB: `android/app/build/outputs/bundle/release/app-release.aab`

---

## 7. Checklist Kesiapan Sebelum Build

- [ ] Domain `https://www.netora.web.id` sudah memiliki sertifikat SSL aktif (HTTPS) tanpa peringatan keamanan.
- [ ] Responsive design web pada layar smartphone sudah rapi (CSS flexbox & grid sudah optimal).
- [ ] File logo Netora resolusi tinggi (512x512 PNG transparan) sudah siap untuk icon aplikasi.
- [ ] Akun Google Play Console (opsional, jika ingin dipublikasikan resmi di Google Play Store).

