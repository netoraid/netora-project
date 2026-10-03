// Admin Dashboard Logic Netora v2
// Monitoring Aktivitas Siswa, Kuis, Statistik, & Konten

window.initAdminDashboard = async function() {
  // 1. Verifikasi Akses Administrator
  const user = await getUser();
  if (!user) {
    window.location.href = '/login.html';
    return;
  }

  // Verifikasi Akses Administrator — Hanya role 'admin' yang diizinkan
  // Siswa yang mencoba akses URL ini secara langsung akan di-redirect ke beranda
  if (user.role !== 'admin') {
    toast('Akses Ditolak: Halaman ini hanya untuk Administrator.', 'error');
    setTimeout(() => {
      window.location.href = '/beranda.html';
    }, 800);
    return;
  }

  // Set Profile Admin di Header
  const adminNama = document.getElementById('admin-nama');
  const adminAvatar = document.getElementById('admin-avatar');
  if (adminNama) adminNama.textContent = user.nama;
  if (adminAvatar && user.foto) adminAvatar.src = user.foto;

  // 2. Live Real-time Clock
  function updateClock() {
    const el = document.getElementById('live-time-text');
    if (!el) return;
    const now = new Date();
    const options = {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    };
    el.textContent = now.toLocaleDateString('id-ID', options) + ' WIB';
  }
  updateClock();
  setInterval(updateClock, 1000);

  // 3. Admin Tab Switching Controller (Desktop Buttons & Mobile Dropdown Sync)
  window.switchAdminTab = function(targetId) {
    if (!targetId) return;

    const tabBtns = document.querySelectorAll('.admin-tab-btn');
    const tabContents = document.querySelectorAll('.admin-tab-content');
    const mobileTabSelect = document.getElementById('admin-tab-select-mobile');

    // Update active tab buttons
    tabBtns.forEach(b => {
      if (b.dataset.tab === targetId) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    // Update active tab content dengan inline style.display agar 100% akurat
    tabContents.forEach(c => {
      if (c.id === targetId) {
        c.classList.add('active');
        c.style.display = 'block';
      } else {
        c.classList.remove('active');
        c.style.display = 'none';
      }
    });

    // Sync mobile dropdown value
    if (mobileTabSelect && mobileTabSelect.value !== targetId) {
      mobileTabSelect.value = targetId;
    }
  };

  // Event listener untuk tombol tab desktop
  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      window.switchAdminTab(btn.dataset.tab);
    });
  });

  // Event listener untuk dropdown mobile (change dan input)
  const mobileTabSelect = document.getElementById('admin-tab-select-mobile');
  if (mobileTabSelect) {
    mobileTabSelect.addEventListener('change', function() {
      window.switchAdminTab(this.value);
    });
    mobileTabSelect.addEventListener('input', function() {
      window.switchAdminTab(this.value);
    });
  }

  // Inisialisasi tab pertama saat halaman dibuka
  window.switchAdminTab('tab-overview');

  // 4. Data State
  let globalStats = null;
  let globalAktivitas = [];
  let globalSiswa = [];

  // ==========================================
  // FETCH & RENDER: STATISTIK & KPI
  // ==========================================
  async function loadStats() {
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      if (!res.ok || !data.success) return;

      globalStats = data.stats;
      const s = globalStats;

      // Update KPI
      document.getElementById('stat-total-siswa').textContent = s.totalSiswa;
      document.getElementById('stat-total-kuis').textContent = s.totalKuis;
      document.getElementById('stat-avg-skor').textContent = s.avgSkor;
      document.getElementById('stat-persen-lulus').textContent = s.persenLulus + '%';
      document.getElementById('stat-lulus-count').textContent = s.lulusCount;
      document.getElementById('stat-remidi-count').textContent = s.remidiCount;
      document.getElementById('stat-total-materi').textContent = s.totalMateri;
      document.getElementById('stat-total-video').textContent = s.totalVideo;

      // Update Distribusi Nilai Bars
      const dist = s.distribusiNilai;
      const totalUjian = s.totalKuis || 1;

      const pctTinggi = Math.round((dist.tinggi / totalUjian) * 100);
      const pctSedang = Math.round((dist.sedang / totalUjian) * 100);
      const pctRendah = Math.round((dist.rendah / totalUjian) * 100);

      document.getElementById('bar-cnt-tinggi').textContent = `${dist.tinggi} ujian (${pctTinggi}%)`;
      document.getElementById('bar-fill-tinggi').style.width = `${pctTinggi}%`;

      document.getElementById('bar-cnt-sedang').textContent = `${dist.sedang} ujian (${pctSedang}%)`;
      document.getElementById('bar-fill-sedang').style.width = `${pctSedang}%`;

      document.getElementById('bar-cnt-rendah').textContent = `${dist.rendah} ujian (${pctRendah}%)`;
      document.getElementById('bar-fill-rendah').style.width = `${pctRendah}%`;
    } catch (err) {
      console.error('Error loadStats:', err);
    }
  }

  // ==========================================
  // FETCH & RENDER: LIVE AKTIVITAS KUIS SISWA
  // ==========================================
  async function loadAktivitas() {
    const tbody = document.getElementById('tbody-aktivitas');
    if (!tbody) return;

    try {
      const res = await fetch('/api/admin/aktivitas');
      const data = await res.json();
      if (!res.ok || !data.success) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--red);">Gagal memuat aktivitas.</td></tr>';
        return;
      }

      globalAktivitas = data.aktivitas;
      renderAktivitasTable();
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--red);">Kesalahan server saat memuat aktivitas.</td></tr>';
    }
  }

  function renderAktivitasTable() {
    const tbody = document.getElementById('tbody-aktivitas');
    if (!tbody) return;

    const filterStatus = document.getElementById('filter-aktivitas-status').value;
    const query = (document.getElementById('search-aktivitas').value || '').toLowerCase().trim();

    let list = globalAktivitas.filter(item => {
      // Filter Status
      if (filterStatus === 'LULUS' && !item.lulus) return false;
      if (filterStatus === 'REMIDI' && item.lulus) return false;

      // Filter Search
      if (query) {
        const matchNama = (item.siswa_nama || '').toLowerCase().includes(query);
        const matchEmail = (item.siswa_email || '').toLowerCase().includes(query);
        if (!matchNama && !matchEmail) return false;
      }
      return true;
    });

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-low);">Tidak ada riwayat aktivitas yang sesuai filter.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map((item, idx) => `
      <tr>
        <td style="color:var(--text-low); font-weight:600;">${idx + 1}</td>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="${item.siswa_foto || 'uploads/default.png'}" alt="Foto" style="width:34px; height:34px; border-radius:50%; object-fit:cover; border:1px solid rgba(108,124,255,0.3);">
            <strong style="color:var(--text-hi); font-size:13.5px;">${escapeHtml(item.siswa_nama)}</strong>
          </div>
        </td>
        <td style="color:var(--text-mid); font-size:13px;">${escapeHtml(item.siswa_email)}</td>
        <td style="color:var(--text-low); font-size:12.5px;">
          <span style="display:inline-flex; align-items:center; gap:4px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <span>${formatTanggal(item.tanggal)}</span>
          </span>
        </td>
        <td style="text-align:center;">
          <span class="skor-pill ${item.lulus ? 'skor-lulus' : 'skor-remidi'}">
            ${item.skor}
          </span>
        </td>
        <td style="text-align:center;">
          <span class="badge ${item.lulus ? 'badge-green' : 'badge-red'}" style="margin:0;">
            ${item.status}
          </span>
        </td>
      </tr>
    `).join('');
  }

  // Filter Listeners Aktivitas
  const filterAktivitas = document.getElementById('filter-aktivitas-status');
  if (filterAktivitas) filterAktivitas.addEventListener('change', renderAktivitasTable);

  const searchAktivitas = document.getElementById('search-aktivitas');
  if (searchAktivitas) searchAktivitas.addEventListener('input', renderAktivitasTable);

  const btnRefreshAktivitas = document.getElementById('btn-refresh-aktivitas');
  if (btnRefreshAktivitas) {
    btnRefreshAktivitas.addEventListener('click', () => {
      loadStats();
      loadAktivitas();
      toast('Data aktivitas diperbarui!', 'info');
    });
  }

  // ==========================================
  // FETCH & RENDER: MANAJEMEN SISWA
  // ==========================================
  async function loadSiswa() {
    const tbody = document.getElementById('tbody-siswa');
    if (!tbody) return;

    try {
      const res = await fetch('/api/admin/siswa');
      const data = await res.json();
      if (!res.ok || !data.success) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--red);">Gagal memuat data siswa.</td></tr>';
        return;
      }

      globalSiswa = data.siswa;
      renderSiswaTable();
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--red);">Terjadi kesalahan koneksi server.</td></tr>';
    }
  }

  function renderSiswaTable() {
    const tbody = document.getElementById('tbody-siswa');
    if (!tbody) return;

    const query = (document.getElementById('search-siswa')?.value || '').toLowerCase().trim();

    let list = globalSiswa.filter(s => {
      if (query) {
        const matchNama = (s.nama || '').toLowerCase().includes(query);
        const matchEmail = (s.email || '').toLowerCase().includes(query);
        return matchNama || matchEmail;
      }
      return true;
    });

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px; color:#64748B;">Tidak ada siswa yang ditemukan.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map((s, idx) => `
      <tr>
        <td style="font-weight:700; color:#64748B;">${idx + 1}</td>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="${escapeHtml(s.foto || 'uploads/default.png')}" alt="Foto" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:1px solid #CBD5E1;">
            <div>
              <strong style="color:#0F172A; display:block; font-size:13.5px;">${escapeHtml(s.nama)}</strong>
              <span style="font-size:11px; color:#64748B;">Terdaftar: ${formatTanggal(s.created_at)}</span>
            </div>
          </div>
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <code style="color:#0D5BFF; font-weight:700; font-size:12.5px;">${escapeHtml(s.email)}</code>
            <button type="button" class="btn-copy-mini" data-copy-val="${escapeHtml(s.email)}" onclick="copyText(this.dataset.copyVal, 'Email disalin!')" title="Salin Email">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
          </div>
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <code style="color:#15803D; font-weight:800; font-size:13px; background:#DCFCE7; padding:3px 8px; border-radius:6px; border:1px solid #BBF7D0; letter-spacing:0.3px;">${escapeHtml(s.password_plain || '123456')}</code>
            <button type="button" class="btn-copy-mini" data-copy-val="${escapeHtml(s.password_plain || '123456')}" onclick="copyText(this.dataset.copyVal, 'Kata sandi disalin!')" title="Salin Kata Sandi">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
          </div>
        </td>
        <td style="text-align:center;">
          <span class="badge badge-purple" style="margin:0; font-size:11px;">${s.total_ujian || 0} Ujian</span>
        </td>
        <td style="text-align:center;">
          <strong style="color:${(s.rata_skor >= 70) ? '#15803D' : ((s.rata_skor > 0) ? '#DC2626' : '#64748B')}; font-size:14px;">
            ${s.rata_skor ? s.rata_skor : '-'}
          </strong>
        </td>
        <td style="text-align:center;">
          <strong style="color:${(s.skor_tertinggi >= 70) ? '#15803D' : ((s.skor_tertinggi > 0) ? '#DC2626' : '#64748B')}; font-size:14px;">
            ${s.skor_tertinggi !== null && s.skor_tertinggi !== undefined ? s.skor_tertinggi : '-'}
          </strong>
        </td>
        <td style="text-align:center;">
          <div style="display:flex; align-items:center; justify-content:center; gap:6px;">
            <button type="button" class="btn-secondary" style="width:auto; padding:5px 10px; font-size:11.5px; border-radius:8px; display:inline-flex; align-items:center; gap:4px;" onclick="bukaModalSiswa(${s.id})" title="Lihat Detail & Kredensial">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              <span>Detail</span>
            </button>
            <button type="button" class="btn-action-delete" style="padding:5px 10px; font-size:11.5px; border-radius:8px;" onclick="hapusSiswa(${s.id})" title="Hapus Akun Siswa">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px; height:13px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  const searchSiswa = document.getElementById('search-siswa');
  if (searchSiswa) searchSiswa.addEventListener('input', renderSiswaTable);

  // Global function Hapus Siswa (aman dari karakter tanda petik/apostrof)
  window.hapusSiswa = async function (id) {
    const s = globalSiswa.find(item => item.id === id);
    const nama = s ? s.nama : `Siswa #${id}`;
    const confirmed = await confirmDialog(`Apakah Anda yakin ingin menghapus akun siswa "${nama}" beserta seluruh riwayat nilainya?`, {
      title: 'Hapus Akun Siswa',
      confirmText: 'Hapus Siswa',
      cancelText: 'Batal',
      type: 'danger'
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/siswa/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (res.ok && data.success) {
        toast('Akun siswa berhasil dihapus!', 'success');
        await loadSiswa();
        loadStats();
        loadAktivitas();
      } else {
        toast(data.error || 'Gagal menghapus siswa.', 'error');
      }
    } catch (err) {
      toast('Terjadi kesalahan koneksi server.', 'error');
    }
  };

  // Reset / Hapus Seluruh Siswa Sekaligus
  const btnResetSemua = document.getElementById('btn-reset-all-siswa') || document.getElementById('btn-reset-semua-siswa');
  if (btnResetSemua) {
    btnResetSemua.addEventListener('click', async () => {
      const confirmed = await confirmDialog('Tindakan ini akan MENGHAPUS SEMUA AKUN SISWA dan mengosongkan seluruh riwayat ujian kuis. Akun Admin tetap aman.', {
        title: 'Reset Semua Siswa',
        confirmText: 'Ya, Bersihkan Semua',
        cancelText: 'Batal',
        type: 'danger'
      });
      if (!confirmed) return;

      try {
        const res = await fetch('/api/admin/reset-siswa', { method: 'POST' });
        const data = await res.json();
        if (res.ok && data.success) {
          toast('Seluruh akun siswa dan nilai kuis berhasil dibersihkan!', 'success');
          loadStats();
          loadSiswa();
          loadSiswaTerbaru();
          loadAktivitas();
        } else {
          toast(data.error || 'Gagal mereset data siswa.', 'error');
        }
      } catch (err) {
        toast('Terjadi kesalahan koneksi server.', 'error');
      }
    });
  }

  // Modal Tambah Siswa Baru
  window.bukaModalTambahSiswa = function() {
    const modal = document.getElementById('modal-tambah-siswa');
    const form = document.getElementById('form-tambah-siswa');
    if (!modal) return;
    if (form) form.reset();
    modal.style.display = 'flex';
  };

  window.tutupModalTambahSiswa = function() {
    const modal = document.getElementById('modal-tambah-siswa');
    if (modal) modal.style.display = 'none';
  };

  const btnTambahSiswa = document.getElementById('btn-tambah-siswa');
  if (btnTambahSiswa) btnTambahSiswa.addEventListener('click', window.bukaModalTambahSiswa);

  const btnCloseModalTambahSiswa = document.getElementById('btn-close-modal-tambah-siswa');
  if (btnCloseModalTambahSiswa) btnCloseModalTambahSiswa.addEventListener('click', window.tutupModalTambahSiswa);

  const btnBatalModalTambahSiswa = document.getElementById('btn-batal-modal-tambah-siswa');
  if (btnBatalModalTambahSiswa) btnBatalModalTambahSiswa.addEventListener('click', window.tutupModalTambahSiswa);

  const formTambahSiswa = document.getElementById('form-tambah-siswa');
  if (formTambahSiswa) {
    formTambahSiswa.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nama = document.getElementById('input-tambah-siswa-nama').value.trim();
      const email = document.getElementById('input-tambah-siswa-email').value.trim();
      const password = document.getElementById('input-tambah-siswa-password').value.trim();

      const btnSubmit = document.getElementById('btn-simpan-siswa-baru');
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Menyimpan...';
      }

      try {
        const res = await fetch('/api/admin/siswa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nama, email, password })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          window.tutupModalTambahSiswa();
          await loadSiswa();
          loadStats();
          loadSiswaTerbaru();
          toast(data.message || 'Akun siswa berhasil didaftarkan!', 'success');
        } else {
          toast(data.error || 'Gagal menambahkan akun siswa.', 'error');
        }
      } catch (err) {
        toast('Terjadi kesalahan koneksi server.', 'error');
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Simpan Akun Siswa</span>';
        }
      }
    });
  }

  // ==========================================
  // MODAL DETAIL & KREDENSIAL SISWA
  // ==========================================
  let activeModalSiswaId = null;

  window.copyText = function(text, successMsg) {
    if (!text || text === '-' || text === '••••••••') return;
    navigator.clipboard.writeText(text).then(() => {
      toast(successMsg || 'Disalin ke clipboard!', 'success');
    }).catch(() => {
      toast('Gagal menyalin teks.', 'error');
    });
  };

  window.toggleTablePwd = function(id, plainPwd) {
    const el = document.getElementById(`pwd-table-${id}`);
    if (!el) return;
    if (el.textContent === '••••••••') {
      el.textContent = plainPwd;
      el.style.color = '#38bdf8';
    } else {
      el.textContent = '••••••••';
      el.style.color = '#4ade80';
    }
  };

  window.bukaModalSiswa = function(id) {
    const s = globalSiswa.find(item => item.id === id);
    if (!s) return;

    activeModalSiswaId = s.id;
    const modal = document.getElementById('modal-detail-siswa');
    if (!modal) return;

    // Data Identitas Siswa
    document.getElementById('modal-siswa-nama').textContent = s.nama;
    document.getElementById('modal-siswa-email').textContent = s.email;
    document.getElementById('modal-siswa-foto').src = s.foto || 'uploads/default.png';
    document.getElementById('modal-siswa-tgl').innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
      <span>Terdaftar: ${formatTanggal(s.created_at)}</span>
    `;

    // Statistik Ujian Siswa
    const totalKuisEl = document.getElementById('modal-siswa-total-kuis');
    if (totalKuisEl) totalKuisEl.textContent = `${s.total_ujian || 0} Ujian`;

    const avgSkorEl = document.getElementById('modal-siswa-avg-skor');
    if (avgSkorEl) avgSkorEl.textContent = s.rata_skor ? `${s.rata_skor}` : '-';

    const maxSkorEl = document.getElementById('modal-siswa-max-skor');
    if (maxSkorEl) maxSkorEl.textContent = s.skor_tertinggi ? `${s.skor_tertinggi}` : '-';

    // Kredensial Kata Sandi Siswa
    const plainPwd = s.password_plain || '123456';
    const pwdEl = document.getElementById('modal-siswa-pwd');
    if (pwdEl) {
      pwdEl.textContent = plainPwd;
      pwdEl.dataset.realPwd = plainPwd;
      pwdEl.dataset.masked = 'false';
    }

    // Reset Tombol Toggle Sandi
    const iconEl = document.getElementById('btn-toggle-modal-pwd-icon');
    const textEl = document.getElementById('btn-toggle-modal-pwd-text');
    if (iconEl) iconEl.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
    if (textEl) textEl.textContent = 'Sembunyikan';

    const inputNewPwd = document.getElementById('modal-input-new-pwd');
    if (inputNewPwd) inputNewPwd.value = '';

    modal.style.display = 'flex';
  };

  function tutupModalSiswa() {
    const modal = document.getElementById('modal-detail-siswa');
    if (modal) modal.style.display = 'none';
    activeModalSiswaId = null;
  }

  const btnCloseModal = document.getElementById('btn-close-modal-detail');
  if (btnCloseModal) btnCloseModal.addEventListener('click', tutupModalSiswa);

  // Close modal when clicking outside card
  const modalDetailOverlay = document.getElementById('modal-detail-siswa');
  if (modalDetailOverlay) {
    modalDetailOverlay.addEventListener('click', (e) => {
      if (e.target === modalDetailOverlay) tutupModalSiswa();
    });
  }

  const btnToggleModalPwd = document.getElementById('btn-toggle-modal-pwd');
  if (btnToggleModalPwd) {
    btnToggleModalPwd.addEventListener('click', () => {
      const pwdEl = document.getElementById('modal-siswa-pwd');
      const iconEl = document.getElementById('btn-toggle-modal-pwd-icon');
      const textEl = document.getElementById('btn-toggle-modal-pwd-text');
      if (!pwdEl) return;

      const real = pwdEl.dataset.realPwd || '123456';
      const isMasked = pwdEl.dataset.masked === 'true';

      if (isMasked) {
        pwdEl.textContent = real;
        pwdEl.dataset.masked = 'false';
        if (iconEl) iconEl.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
        if (textEl) textEl.textContent = 'Sembunyikan';
      } else {
        pwdEl.textContent = '••••••••';
        pwdEl.dataset.masked = 'true';
        if (iconEl) iconEl.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
        if (textEl) textEl.textContent = 'Lihat Sandi';
      }
    });
  }

  document.querySelectorAll('.btn-copy-cred').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.copy;
      const el = document.getElementById(targetId);
      if (!el) return;
      const text = el.dataset.realPwd || el.textContent;
      if (text && text !== '-' && text !== '••••••••') {
        copyText(text, 'Kredensial disalin!');
      } else if (el.dataset.realPwd) {
        copyText(el.dataset.realPwd, 'Kata sandi disalin!');
      }
    });
  });

  const btnSubmitResetPwd = document.getElementById('btn-submit-reset-pwd');
  if (btnSubmitResetPwd) {
    btnSubmitResetPwd.addEventListener('click', async () => {
      if (!activeModalSiswaId) return;
      const input = document.getElementById('modal-input-new-pwd');
      const passwordBaru = (input ? input.value : '').trim();

      if (!passwordBaru || passwordBaru.length < 4) {
        toast('Kata sandi baru minimal 4 karakter!', 'error');
        return;
      }

      try {
        const res = await fetch(`/api/admin/siswa/${activeModalSiswaId}/password`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passwordBaru })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          toast('Kata sandi siswa berhasil diperbarui!', 'success');
          const pwdEl = document.getElementById('modal-siswa-pwd');
          if (pwdEl) {
            pwdEl.textContent = passwordBaru;
            pwdEl.dataset.realPwd = passwordBaru;
          }
          if (input) input.value = '';
          loadSiswa();
        } else {
          toast(data.error || 'Gagal mengubah kata sandi.', 'error');
        }
      } catch (err) {
        toast('Terjadi kesalahan koneksi server.', 'error');
      }
    });
  }

  // ==========================================
  // FETCH & RENDER: KELOLA PENGUMUMAN
  // ==========================================
  async function loadPengumuman() {
    const container = document.getElementById('admin-pengumuman-list');
    const badge = document.getElementById('badge-total-pengumuman');
    if (!container) return;

    try {
      const res = await fetch('/api/admin/pengumuman');
      const data = await res.json();
      if (!res.ok || !data.success) return;

      const list = data.pengumuman;
      if (badge) badge.textContent = `${list.length} Informasi`;

      if (list.length === 0) {
        container.innerHTML = '<p style="color:var(--text-low); text-align:center; padding:30px;">Belum ada pengumuman.</p>';
        return;
      }

      container.innerHTML = list.map(item => `
        <div class="card-panel" style="padding:14px; margin-bottom:0; ${item.penting ? 'border-color:rgba(239,68,68,0.5);' : ''}">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:6px;">
            <div style="display:flex; align-items:center; gap:6px;">
              ${item.penting ? '<span class="badge badge-red" style="margin:0; font-size:10px; display:inline-flex; align-items:center; gap:3px;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg><span>PENTING</span></span>' : ''}
              <span class="badge badge-purple" style="margin:0; font-size:10px;">${escapeHtml(item.kategori)}</span>
              <span style="font-size:11px; color:var(--text-low);">${formatTanggal(item.created_at)}</span>
            </div>
            <button class="btn-action-delete" onclick="hapusPengumuman(${item.id})" style="padding:4px 8px; font-size:11px;">
              Hapus
            </button>
          </div>
          <strong style="color:var(--text-hi); font-size:14px; display:block; margin-bottom:4px;">${escapeHtml(item.judul)}</strong>
          <p style="color:var(--text-mid); font-size:12.5px; margin:0; line-height:1.45; white-space:pre-line;">
            ${escapeHtml(item.isi)}
          </p>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = '<p style="color:var(--red); text-align:center;">Gagal memuat pengumuman.</p>';
    }
  }

  // Submit Tambah Pengumuman Baru
  const formPengumuman = document.getElementById('form-tambah-pengumuman');
  if (formPengumuman) {
    formPengumuman.addEventListener('submit', async (e) => {
      e.preventDefault();
      const judul = document.getElementById('pengumuman-judul').value.trim();
      const kategori = document.getElementById('pengumuman-kategori').value;
      const isi = document.getElementById('pengumuman-isi').value.trim();
      const penting = document.getElementById('pengumuman-penting').checked;

      try {
        const res = await fetch('/api/admin/pengumuman', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ judul, kategori, isi, penting })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          toast('Pengumuman baru berhasil diterbitkan!', 'success');
          formPengumuman.reset();
          loadPengumuman();
        } else {
          toast(data.error || 'Gagal menerbitkan pengumuman', 'error');
        }
      } catch (err) {
        toast('Terjadi kesalahan jaringan', 'error');
      }
    });
  }

  window.hapusPengumuman = async function (id) {
    const confirmed = await confirmDialog('Apakah Anda yakin ingin menghapus notifikasi / pengumuman ini?', {
      title: 'Hapus Notifikasi',
      confirmText: 'Hapus',
      cancelText: 'Batal',
      type: 'danger'
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/pengumuman/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        toast('Pengumuman berhasil dihapus!', 'success');
        loadPengumuman();
      } else {
        toast(data.error || 'Gagal menghapus', 'error');
      }
    } catch (err) {
      toast('Terjadi kesalahan jaringan', 'error');
    }
  };

  // ==========================================
  // FETCH & RENDER: KELOLA MODUL MATERI (CRUD)
  // ==========================================
  let globalMateri = [];

  async function loadMateri() {
    const tbody = document.getElementById('tbody-materi');
    if (!tbody) return;

    try {
      const res = await fetch('/api/admin/materi');
      const data = await res.json();
      if (!res.ok || !data.success) return;

      globalMateri = data.materi || [];
      window.globalMateri = globalMateri;
      window.loadMateri = loadMateri;
      const badge = document.getElementById('badge-total-materi-admin');
      if (badge) badge.textContent = `${globalMateri.length} Modul Terdaftar`;

      renderMateriTable();
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:#DC2626;">Gagal memuat modul materi.</td></tr>';
    }
  }

  function renderMateriTable() {
    const tbody = document.getElementById('tbody-materi');
    if (!tbody) return;

    const q = (document.getElementById('search-materi-admin')?.value || '').toLowerCase().trim();
    const katFilter = document.getElementById('filter-materi-kategori')?.value || 'all';

    let list = globalMateri.filter(m => {
      if (katFilter !== 'all' && m.kategori !== katFilter) return false;
      if (q && !m.judul.toLowerCase().includes(q) && !(m.isi || '').toLowerCase().includes(q)) return false;
      return true;
    });

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding:30px; color:#64748B;">
            ${globalMateri.length === 0 ? 'Belum ada modul materi. Klik "+ Tambah Modul Baru" untuk menambahkan modul.' : 'Tidak ada modul materi yang cocok dengan pencarian.'}
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map((m, i) => {
      const ringkasan = m.isi ? (m.isi.slice(0, 90) + (m.isi.length > 90 ? '...' : '')) : '';
      return `
        <tr>
          <td style="font-weight:800; color:#64748B;">${i + 1}</td>
          <td>
            <strong style="color:#0F172A; font-size:14px; display:block; margin-bottom:3px;">${escapeHtml(m.judul)}</strong>
            <span style="font-size:12px; color:#64748B; line-height:1.4; display:block;">${escapeHtml(ringkasan)}</span>
          </td>
          <td>
            <span class="badge badge-purple" style="font-size:11.5px;">${escapeHtml(m.kategori)}</span>
          </td>
          <td style="color:#475569; font-size:12.5px; font-weight:600;">
            ${m.total_halaman || 1} Halaman
          </td>
          <td style="color:#64748B; font-size:12px;">
            ${formatTanggal(m.created_at)}
          </td>
          <td style="text-align:center;">
            <div style="display:inline-flex; align-items:center; gap:6px;">
              <a href="materi-detail.html?id=${m.id}" target="_blank" class="btn-secondary" style="padding:5px 9px; font-size:11.5px; border-radius:8px; text-decoration:none; display:inline-flex; align-items:center; gap:4px;" title="Lihat Tampilan Siswa">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                <span>Lihat</span>
              </a>
              <button type="button" class="btn-secondary" onclick="bukaModalEditMateri('${m.id}')" style="padding:5px 9px; font-size:11.5px; border-radius:8px;" title="Edit Modul">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                <span>Edit</span>
              </button>
              <button type="button" class="btn-action-delete" onclick="hapusMateriAdmin('${m.id}')" style="padding:5px 9px; font-size:11.5px;" title="Hapus Modul">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                <span>Hapus</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Multi-page state & handlers for admin modal
  let currentModalPages = [{ halaman: 1, judul: '', konten: '' }];

  function renderModalPages() {
    const container = document.getElementById('materi-pages-container');
    const badge = document.getElementById('badge-page-count');
    if (!container) return;

    if (badge) {
      badge.textContent = `${currentModalPages.length} Halaman`;
    }

    container.innerHTML = currentModalPages.map((page, index) => `
      <div class="materi-page-card" data-index="${index}" style="background:#F8FAFC; border:1.5px solid #E2E8F0; border-radius:14px; padding:14px; position:relative; transition:all 0.2s;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="background:#0D5BFF; color:#fff; font-size:11px; font-weight:800; padding:3px 9px; border-radius:8px;">
              Halaman ${index + 1}
            </span>
            <span style="font-size:12.5px; font-weight:700; color:#334155;">Bagian Halaman ${index + 1}</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            ${index > 0 ? `
              <button type="button" onclick="geserHalamanMateri(${index}, -1)" title="Geser ke Atas" style="background:#FFFFFF; border:1px solid #CBD5E1; color:#475569; border-radius:6px; width:26px; height:26px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:11px;">
                ▲
              </button>
            ` : ''}
            ${index < currentModalPages.length - 1 ? `
              <button type="button" onclick="geserHalamanMateri(${index}, 1)" title="Geser ke Bawah" style="background:#FFFFFF; border:1px solid #CBD5E1; color:#475569; border-radius:6px; width:26px; height:26px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:11px;">
                ▼
              </button>
            ` : ''}
            ${currentModalPages.length > 1 ? `
              <button type="button" onclick="hapusHalamanMateri(${index})" title="Hapus Halaman Ini" style="background:#FEE2E2; border:1px solid #FECACA; color:#EF4444; border-radius:6px; width:26px; height:26px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:14px; font-weight:bold;">
                &times;
              </button>
            ` : ''}
          </div>
        </div>

        <div style="margin-bottom:8px;">
          <label style="display:block; font-size:11.5px; font-weight:700; color:#475569; margin-bottom:4px;">Judul Halaman / Sub-Topik (Opsional)</label>
          <input type="text" class="input-field page-judul-input" placeholder="Contoh: Pengenalan Packet Tracer & Workspace" value="${escapeHtml(page.judul || '')}" oninput="syncModalPageData(${index})" style="background:#FFFFFF; padding:8px 12px; font-size:12.5px;">
        </div>

        <div>
          <label style="display:block; font-size:11.5px; font-weight:700; color:#475569; margin-bottom:4px;">Konten / Isi Materi Halaman Ini *</label>
          <textarea class="input-field page-konten-input" rows="5" placeholder="Tuliskan penjelasan materi, panduan praktikum, diagram konsep..." oninput="syncModalPageData(${index})" style="background:#FFFFFF; font-size:12.5px; line-height:1.6; resize:vertical;">${escapeHtml(page.konten || '')}</textarea>
        </div>
      </div>
    `).join('');
  }

  window.syncModalPageData = function(index) {
    const container = document.getElementById('materi-pages-container');
    if (!container) return;
    const cards = container.querySelectorAll('.materi-page-card');
    if (cards[index]) {
      const judul = cards[index].querySelector('.page-judul-input')?.value || '';
      const konten = cards[index].querySelector('.page-konten-input')?.value || '';
      if (currentModalPages[index]) {
        currentModalPages[index].judul = judul;
        currentModalPages[index].konten = konten;
      }
    }
  };

  function syncAllModalPages() {
    const container = document.getElementById('materi-pages-container');
    if (!container) return;
    const cards = container.querySelectorAll('.materi-page-card');
    cards.forEach((card, idx) => {
      if (currentModalPages[idx]) {
        currentModalPages[idx].judul = card.querySelector('.page-judul-input')?.value || '';
        currentModalPages[idx].konten = card.querySelector('.page-konten-input')?.value || '';
      }
    });
  }

  window.geserHalamanMateri = function(index, direction) {
    syncAllModalPages();
    const targetIndex = index + direction;
    if (targetIndex >= 0 && targetIndex < currentModalPages.length) {
      const temp = currentModalPages[index];
      currentModalPages[index] = currentModalPages[targetIndex];
      currentModalPages[targetIndex] = temp;
      currentModalPages.forEach((p, idx) => { p.halaman = idx + 1; });
      renderModalPages();
    }
  };

  window.hapusHalamanMateri = function(index) {
    syncAllModalPages();
    if (currentModalPages.length <= 1) {
      toast('Modul materi minimal harus memiliki 1 halaman.', 'warning');
      return;
    }
    currentModalPages.splice(index, 1);
    currentModalPages.forEach((p, idx) => { p.halaman = idx + 1; });
    renderModalPages();
  };

  window.tambahHalamanMateriBaru = function() {
    syncAllModalPages();
    currentModalPages.push({
      halaman: currentModalPages.length + 1,
      judul: '',
      konten: ''
    });
    renderModalPages();
    const container = document.getElementById('materi-pages-container');
    if (container) {
      setTimeout(() => { container.scrollTop = container.scrollHeight; }, 60);
    }
  };

  const btnAddMateriPage = document.getElementById('btn-add-materi-page');
  if (btnAddMateriPage) {
    btnAddMateriPage.addEventListener('click', window.tambahHalamanMateriBaru);
  }

  window.bukaModalTambahMateri = function() {
    console.log('[Netora Admin] Membuka modal tambah materi baru');
    const modal = document.getElementById('modal-materi');
    const title = document.getElementById('modal-materi-title');
    const form = document.getElementById('form-modal-materi');
    if (!modal) return;

    if (form) form.reset();
    const idEl = document.getElementById('input-materi-id');
    const judulEl = document.getElementById('input-materi-judul');
    const katEl = document.getElementById('input-materi-kategori');
    const isiEl = document.getElementById('input-materi-isi');

    if (idEl) idEl.value = '';
    if (judulEl) judulEl.value = '';
    if (katEl) katEl.value = '';
    const selKatEl = document.getElementById('select-materi-kategori');
    if (selKatEl) selKatEl.value = '';
    if (isiEl) isiEl.value = '';
    
    currentModalPages = [{ halaman: 1, judul: '', konten: '' }];
    renderModalPages();

    if (title) title.textContent = 'Tambah Modul Materi Baru';
    modal.style.display = 'flex';
  };

  window.bukaModalEditMateri = async function(id) {
    console.log('[Netora Admin] Membuka modal edit materi ID:', id);
    let m = globalMateri.find(item => String(item.id) === String(id));
    if (!m || !m.pages || m.pages.length === 0) {
      try {
        const res = await fetch(`/api/admin/materi/${id}`);
        const data = await res.json();
        if (res.ok && data.success && data.materi) {
          m = data.materi;
        }
      } catch (err) {
        console.error('Gagal mengambil data materi:', err);
      }
    }
    if (!m) {
      toast('Data modul materi tidak ditemukan.', 'error');
      return;
    }

    const modal = document.getElementById('modal-materi');
    const title = document.getElementById('modal-materi-title');
    if (!modal) return;

    const idEl = document.getElementById('input-materi-id');
    const judulEl = document.getElementById('input-materi-judul');
    const katEl = document.getElementById('input-materi-kategori');
    const selKatEl = document.getElementById('select-materi-kategori');
    const isiEl = document.getElementById('input-materi-isi');

    if (idEl) idEl.value = m.id;
    if (judulEl) judulEl.value = m.judul || '';
    if (katEl) katEl.value = m.kategori || '';
    if (selKatEl) selKatEl.value = m.kategori || '';
    if (isiEl) isiEl.value = m.isi || '';

    if (m.pages && Array.isArray(m.pages) && m.pages.length > 0) {
      currentModalPages = JSON.parse(JSON.stringify(m.pages));
    } else if (m.isi) {
      currentModalPages = [{ halaman: 1, judul: '', konten: m.isi }];
    } else {
      currentModalPages = [{ halaman: 1, judul: '', konten: '' }];
    }
    renderModalPages();

    if (title) title.textContent = `Edit Modul Materi #${m.id}`;
    modal.style.display = 'flex';
  };

  window.tutupModalMateri = function() {
    const modal = document.getElementById('modal-materi');
    if (modal) modal.style.display = 'none';
  };

  const btnTambahMateri = document.getElementById('btn-tambah-materi');
  if (btnTambahMateri) btnTambahMateri.addEventListener('click', window.bukaModalTambahMateri);

  const btnCloseModalMateri = document.getElementById('btn-close-modal-materi');
  if (btnCloseModalMateri) btnCloseModalMateri.addEventListener('click', window.tutupModalMateri);

  const btnBatalModalMateri = document.getElementById('btn-batal-modal-materi');
  if (btnBatalModalMateri) btnBatalModalMateri.addEventListener('click', window.tutupModalMateri);

  const formModalMateri = document.getElementById('form-modal-materi');
  if (formModalMateri) {
    formModalMateri.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('input-materi-id').value;
      const judul = document.getElementById('input-materi-judul').value.trim();
      const kategori = document.getElementById('input-materi-kategori').value.trim();

      syncAllModalPages();

      if (!judul) {
        toast('Judul modul materi wajib diisi.', 'warning');
        return;
      }
      if (!kategori) {
        toast('Kategori modul materi wajib diisi.', 'warning');
        return;
      }
      if (currentModalPages.length === 0) {
        toast('Modul materi harus memiliki minimal 1 halaman.', 'warning');
        return;
      }

      const emptyPageIdx = currentModalPages.findIndex(p => !p.konten || !p.konten.trim());
      if (emptyPageIdx !== -1) {
        toast(`Harap isi konten untuk Halaman ${emptyPageIdx + 1}.`, 'warning');
        return;
      }

      const btnSubmit = document.getElementById('btn-simpan-materi');
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Menyimpan...';
      }

      try {
        const endpoint = id ? `/api/admin/materi/${id}` : '/api/admin/materi';
        const method = id ? 'PUT' : 'POST';

        const res = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ judul, kategori, pages: currentModalPages })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          window.tutupModalMateri();
          await loadMateri();
          loadStats();
          toast(data.message || 'Modul materi berhasil disimpan!', 'success');
        } else {
          toast(data.error || 'Gagal menyimpan modul materi.', 'error');
        }
      } catch (err) {
        toast('Terjadi kesalahan jaringan.', 'error');
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Simpan Modul</span>';
        }
      }
    });
  }

  window.hapusMateriAdmin = async function(id) {
    const confirmed = await confirmDialog(`Apakah Anda yakin ingin menghapus modul materi #${id}?`, {
      title: 'Hapus Modul Materi',
      confirmText: 'Hapus Modul',
      cancelText: 'Batal',
      type: 'danger'
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/materi/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (res.ok && data.success) {
        await loadMateri();
        loadStats();
        toast('Modul materi berhasil dihapus!', 'success');
      } else {
        toast(data.error || 'Gagal menghapus modul materi.', 'error');
      }
    } catch (err) {
      toast('Terjadi kesalahan jaringan.', 'error');
    }
  };

  const searchMateriAdmin = document.getElementById('search-materi-admin');
  if (searchMateriAdmin) searchMateriAdmin.addEventListener('input', renderMateriTable);

  const filterMateriKategori = document.getElementById('filter-materi-kategori');
  if (filterMateriKategori) filterMateriKategori.addEventListener('change', renderMateriTable);

  // ==========================================
  // FETCH & RENDER: SISWA TERBARU MENDAFTAR
  // ==========================================
  async function loadSiswaTerbaru() {
    const container = document.getElementById('list-siswa-terbaru');
    if (!container) return;

    try {
      const res = await fetch('/api/admin/siswa-terbaru');
      const data = await res.json();
      if (!res.ok || !data.success || !data.siswa) {
        container.innerHTML = '<div style="text-align:center; padding:15px; color:var(--text-low); font-size:12px;">Belum ada pendaftaran baru.</div>';
        return;
      }

      if (data.siswa.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:15px; color:var(--text-low); font-size:12px;">Belum ada siswa terdaftar.</div>';
        return;
      }

      container.innerHTML = data.siswa.map(s => `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; transition:0.2s;">
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="${s.foto || 'uploads/default.png'}" alt="Avatar" style="width:32px; height:32px; border-radius:50%; object-fit:cover; border:1px solid rgba(124,58,237,0.3);">
            <div>
              <strong style="display:block; font-size:13px; color:var(--text-hi);">${escapeHtml(s.nama)}</strong>
              <div style="display:flex; align-items:center; gap:6px; margin-top:2px;">
                <span style="font-size:11px; color:var(--text-low);">${escapeHtml(s.email)}</span>
                <span style="font-size:10px; color:rgba(255,255,255,0.25);">•</span>
                <code style="color:#4ade80; font-weight:800; font-size:11px; background:rgba(74,222,128,0.12); padding:1px 6px; border-radius:4px; border:1px solid rgba(74,222,128,0.25);">${escapeHtml(s.password_plain || '123456')}</code>
                <button class="btn-copy-mini" style="font-size:9.5px; padding:1px 4px;" data-copy-val="${escapeHtml(s.password_plain || '123456')}" onclick="copyText(this.dataset.copyVal, 'Sandi disalin!')" title="Salin Kata Sandi">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
              </div>
            </div>
          </div>
          <div style="text-align:right;">
            <span class="badge badge-cyan" style="font-size:10px; padding:3px 7px; margin:0;">Baru</span>
            <div style="font-size:10.5px; color:var(--text-low); margin-top:2px;">${formatTanggal(s.created_at)}</div>
          </div>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = '<div style="text-align:center; padding:15px; color:var(--text-low); font-size:12px;">Gagal memuat siswa baru.</div>';
    }
  }

  // ==========================================
  // FETCH & RENDER: BANK SOAL & SETTING KUIS
  // ==========================================
  let globalQuiz = [];

  async function loadQuizAdmin() {
    const tbody = document.getElementById('tbody-quiz');
    const badgeTotal = document.getElementById('badge-total-soal');
    if (!tbody) return;

    try {
      const res = await fetch('/api/admin/quiz');
      const data = await res.json();

      if (!res.ok || !data.success || !data.quiz) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:#EF4444;">Gagal memuat bank soal kuis.</td></tr>';
        return;
      }

      globalQuiz = data.quiz;
      if (badgeTotal) {
        badgeTotal.textContent = `${globalQuiz.length} Butir Soal Terdaftar`;
      }

      renderQuizTable();
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:#EF4444;">Terjadi kesalahan saat memuat soal kuis.</td></tr>';
    }
  }

  function renderQuizTable() {
    const tbody = document.getElementById('tbody-quiz');
    if (!tbody) return;

    const q = (document.getElementById('search-quiz')?.value || '').toLowerCase().trim();
    const filterKat = document.getElementById('filter-quiz-kategori')?.value || 'all';

    let list = globalQuiz.filter(item => {
      if (filterKat !== 'all' && (item.kategori || '').toLowerCase() !== filterKat.toLowerCase()) {
        return false;
      }
      if (q) {
        const text = (item.pertanyaan + ' ' + (item.kategori || '') + ' ' + item.pilihan_a + ' ' + item.pilihan_b + ' ' + item.pilihan_c + ' ' + item.pilihan_d).toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });

    if (list.length === 0) {
      const msg = globalQuiz.length === 0 
        ? 'Belum ada butir soal kuis di database. Klik "+ Tambah Soal Baru" di atas untuk menambahkan soal pertama.' 
        : 'Tidak ada butir soal yang sesuai kriteria pencarian.';
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:36px; color:#64748B; font-size:13px;">${msg}</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map((item, idx) => {
      const kunci = (item.jawaban_benar || 'A').toUpperCase();

      return `
        <tr>
          <td style="color:#64748B; font-weight:700; vertical-align:top; padding-top:14px;">${idx + 1}</td>
          <td>
            <div style="margin-bottom:8px;">
              <strong style="color:#0F172A; font-size:14px; line-height:1.45; display:block;">${escapeHtml(item.pertanyaan)}</strong>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:12px;">
              <div style="padding:5px 8px; border-radius:6px; background:${kunci === 'A' ? '#DCFCE7' : '#F8FAFC'}; border:1px solid ${kunci === 'A' ? '#BBF7D0' : '#E2E8F0'}; color:${kunci === 'A' ? '#15803D' : '#475569'}; font-weight:${kunci === 'A' ? '700' : '400'};">
                <strong style="color:${kunci === 'A' ? '#15803D' : '#0D5BFF'};">A.</strong> ${escapeHtml(item.pilihan_a)}
              </div>
              <div style="padding:5px 8px; border-radius:6px; background:${kunci === 'B' ? '#DCFCE7' : '#F8FAFC'}; border:1px solid ${kunci === 'B' ? '#BBF7D0' : '#E2E8F0'}; color:${kunci === 'B' ? '#15803D' : '#475569'}; font-weight:${kunci === 'B' ? '700' : '400'};">
                <strong style="color:${kunci === 'B' ? '#15803D' : '#0D5BFF'};">B.</strong> ${escapeHtml(item.pilihan_b)}
              </div>
              <div style="padding:5px 8px; border-radius:6px; background:${kunci === 'C' ? '#DCFCE7' : '#F8FAFC'}; border:1px solid ${kunci === 'C' ? '#BBF7D0' : '#E2E8F0'}; color:${kunci === 'C' ? '#15803D' : '#475569'}; font-weight:${kunci === 'C' ? '700' : '400'};">
                <strong style="color:${kunci === 'C' ? '#15803D' : '#0D5BFF'};">C.</strong> ${escapeHtml(item.pilihan_c)}
              </div>
              <div style="padding:5px 8px; border-radius:6px; background:${kunci === 'D' ? '#DCFCE7' : '#F8FAFC'}; border:1px solid ${kunci === 'D' ? '#BBF7D0' : '#E2E8F0'}; color:${kunci === 'D' ? '#15803D' : '#475569'}; font-weight:${kunci === 'D' ? '700' : '400'};">
                <strong style="color:${kunci === 'D' ? '#15803D' : '#0D5BFF'};">D.</strong> ${escapeHtml(item.pilihan_d)}
              </div>
            </div>
          </td>
          <td style="vertical-align:top; padding-top:14px;">
            <span class="badge badge-purple" style="font-size:11px;">${escapeHtml(item.kategori || 'Umum')}</span>
          </td>
          <td style="text-align:center; vertical-align:top; padding-top:14px;">
            <span class="badge badge-green" style="font-weight:900; font-size:12px; padding:4px 10px;">
              Opsi ${escapeHtml(kunci)}
            </span>
          </td>
          <td style="text-align:center; vertical-align:top; padding-top:14px;">
            <div style="display:flex; align-items:center; justify-content:center; gap:6px;">
              <button class="btn-secondary" style="width:auto; padding:6px 10px; font-size:11.5px; border-radius:8px; display:inline-flex; align-items:center; gap:4px;" onclick="bukaModalEditSoal(${item.id})" title="Edit Soal">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                <span>Edit</span>
              </button>
              <button class="btn-action-delete" style="padding:6px 10px; font-size:11.5px; border-radius:8px;" onclick="hapusSoal(${item.id})" title="Hapus Soal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px; height:13px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Modal Tambah / Edit Soal
  window.bukaModalTambahSoal = function() {
    const modal = document.getElementById('modal-soal-quiz');
    if (!modal) return;

    document.getElementById('modal-soal-title').textContent = 'Tambah Soal Kuis Baru';
    document.getElementById('soal-id').value = '';
    document.getElementById('input-soal-pertanyaan').value = '';
    document.getElementById('input-soal-kategori').value = 'Cisco Packet Tracer';
    document.getElementById('input-soal-a').value = '';
    document.getElementById('input-soal-b').value = '';
    document.getElementById('input-soal-c').value = '';
    document.getElementById('input-soal-d').value = '';
    document.getElementById('input-soal-kunci').value = 'A';

    modal.style.display = 'flex';
  };

  window.bukaModalEditSoal = function(id) {
    const item = globalQuiz.find(q => q.id === id);
    if (!item) return;

    const modal = document.getElementById('modal-soal-quiz');
    if (!modal) return;

    document.getElementById('modal-soal-title').textContent = 'Edit Soal Kuis #' + item.id;
    document.getElementById('soal-id').value = item.id;
    document.getElementById('input-soal-pertanyaan').value = item.pertanyaan;
    document.getElementById('input-soal-kategori').value = item.kategori || 'Cisco Packet Tracer';
    document.getElementById('input-soal-a').value = item.pilihan_a;
    document.getElementById('input-soal-b').value = item.pilihan_b;
    document.getElementById('input-soal-c').value = item.pilihan_c;
    document.getElementById('input-soal-d').value = item.pilihan_d;
    document.getElementById('input-soal-kunci').value = (item.jawaban_benar || 'A').toUpperCase();

    modal.style.display = 'flex';
  };

  function tutupModalSoal() {
    const modal = document.getElementById('modal-soal-quiz');
    if (modal) modal.style.display = 'none';
  }

  const btnTambahSoal = document.getElementById('btn-tambah-soal');
  if (btnTambahSoal) btnTambahSoal.addEventListener('click', window.bukaModalTambahSoal);

  const btnCloseModalSoal = document.getElementById('btn-close-modal-soal');
  if (btnCloseModalSoal) btnCloseModalSoal.addEventListener('click', tutupModalSoal);

  const btnBatalModalSoal = document.getElementById('btn-batal-modal-soal');
  if (btnBatalModalSoal) btnBatalModalSoal.addEventListener('click', tutupModalSoal);

  const modalSoalOverlay = document.getElementById('modal-soal-quiz');
  if (modalSoalOverlay) {
    modalSoalOverlay.addEventListener('click', (e) => {
      if (e.target === modalSoalOverlay) tutupModalSoal();
    });
  }

  // Submit Form Soal Kuis (Tambah / Edit)
  const formSoalQuiz = document.getElementById('form-soal-quiz');
  if (formSoalQuiz) {
    formSoalQuiz.addEventListener('submit', async (e) => {
      e.preventDefault();

      const soalId = document.getElementById('soal-id').value;
      const pertanyaan = document.getElementById('input-soal-pertanyaan').value.trim();
      const kategori = document.getElementById('input-soal-kategori').value;
      const pilihan_a = document.getElementById('input-soal-a').value.trim();
      const pilihan_b = document.getElementById('input-soal-b').value.trim();
      const pilihan_c = document.getElementById('input-soal-c').value.trim();
      const pilihan_d = document.getElementById('input-soal-d').value.trim();
      const jawaban_benar = document.getElementById('input-soal-kunci').value;

      if (!pertanyaan || !pilihan_a || !pilihan_b || !pilihan_c || !pilihan_d) {
        toast('Harap isi semua kolom pertanyaan dan pilihan A sampai D.', 'warning');
        return;
      }

      const bodyData = { pertanyaan, kategori, pilihan_a, pilihan_b, pilihan_c, pilihan_d, jawaban_benar };
      const btnSubmit = document.getElementById('btn-simpan-soal');
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Menyimpan...';
      }

      try {
        const url = soalId ? `/api/admin/quiz/${soalId}` : '/api/admin/quiz';
        const method = soalId ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData)
        });
        const data = await res.json();

        if (res.ok && data.success) {
          tutupModalSoal();
          await loadQuizAdmin();
          toast(data.message || 'Soal kuis berhasil disimpan!', 'success');
        } else {
          toast(data.error || 'Gagal menyimpan soal kuis.', 'error');
        }
      } catch (err) {
        toast('Terjadi kesalahan koneksi.', 'error');
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Simpan Soal</span>';
        }
      }
    });
  }

  // Hapus Soal Kuis
  window.hapusSoal = async function(id) {
    const confirmed = await confirmDialog(`Apakah Anda yakin ingin menghapus butir soal #${id}?`, {
      title: 'Hapus Soal Kuis',
      confirmText: 'Hapus Soal',
      cancelText: 'Batal',
      type: 'danger'
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/quiz/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (res.ok && data.success) {
        await loadQuizAdmin();
        toast('Soal kuis berhasil dihapus!', 'success');
      } else {
        toast(data.error || 'Gagal menghapus soal.', 'error');
      }
    } catch (err) {
      toast('Terjadi kesalahan jaringan.', 'error');
    }
  };

  // Search & Filter Event Listeners
  const searchQuizInput = document.getElementById('search-quiz');
  if (searchQuizInput) searchQuizInput.addEventListener('input', renderQuizTable);

  const filterQuizKat = document.getElementById('filter-quiz-kategori');
  if (filterQuizKat) filterQuizKat.addEventListener('change', renderQuizTable);

  // ==========================================
  // MANAJEMEN VIDIO PRAKTIK YOUTUBE
  // ==========================================
  let globalVideos = [];

  function parseYouTubeUrlClient(url) {
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

  async function loadVideoAdmin() {
    try {
      let res = await fetch('/api/admin/video');
      if (res.status === 404) {
        res = await fetch('/api/video');
      }
      const data = await res.json();
      if (res.ok && data.success) {
        globalVideos = data.video || [];
        const badge = document.getElementById('badge-total-video-admin');
        if (badge) badge.textContent = `${globalVideos.length} Vidio Terdaftar`;
        renderVideoAdminTable();
      }
    } catch (err) {
      console.error('Error load video admin:', err);
    }
  }

  function renderVideoAdminTable() {
    const tbody = document.getElementById('tbody-video-admin');
    if (!tbody) return;

    const q = (document.getElementById('search-video-admin')?.value || '').toLowerCase().trim();
    let list = globalVideos.filter(v => {
      if (q && !v.judul.toLowerCase().includes(q) && !(v.deskripsi || '').toLowerCase().includes(q) && !(v.kategori || '').toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding:30px; color:#64748B;">
            ${globalVideos.length === 0 ? 'Belum ada vidio praktik. Klik "+ Tambah Vidio Baru" untuk menambahkan vidio YouTube.' : 'Tidak ada vidio yang cocok dengan pencarian.'}
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map((v, i) => {
      const thumb = v.thumbnail_url || (parseYouTubeUrlClient(v.url_youtube).thumbnailUrl || 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
      return `
        <tr>
          <td style="font-weight:800; color:#64748B;">${i + 1}</td>
          <td>
            <div style="position:relative; width:90px; height:56px; border-radius:8px; overflow:hidden; background:#0F172A; border:1px solid #CBD5E1;">
              <img src="${escapeHtml(thumb)}" alt="Thumb" style="width:100%; height:100%; object-fit:cover; display:block;" onerror="this.style.opacity='0.2'">
              <div style="position:absolute; inset:0; background:rgba(0,0,0,0.25); display:flex; align-items:center; justify-content:center;">
                <div style="width:20px; height:20px; border-radius:50%; background:rgba(13,91,255,0.95); display:flex; align-items:center; justify-content:center;">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="#FFFFFF" style="margin-left:1px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                </div>
              </div>
            </div>
          </td>
          <td>
            <strong style="color:#0F172A; font-size:13.5px; display:block; margin-bottom:3px;">${escapeHtml(v.judul)}</strong>
            <p style="margin:0 0 4px; font-size:12px; color:#64748B; line-height:1.4;">${escapeHtml(v.deskripsi || 'Tidak ada deskripsi')}</p>
            <a href="${escapeHtml(v.url_youtube)}" target="_blank" rel="noopener noreferrer" style="font-size:11px; color:#0D5BFF; text-decoration:none; display:inline-flex; align-items:center; gap:4px; font-weight:600;">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              <span>Buka Link Player</span>
            </a>
          </td>
          <td>
            <span class="badge badge-purple" style="font-size:11.5px;">${escapeHtml(v.kategori || 'Mikrotik')}</span>
          </td>
          <td>
            <span style="font-size:12.5px; font-weight:700; color:#334155;">${escapeHtml(v.durasi || '15:00')}</span>
          </td>
          <td style="text-align:center;">
            <div style="display:inline-flex; align-items:center; gap:6px;">
              <button type="button" class="btn-secondary" onclick="bukaModalEditVideo(${v.id})" style="padding:5px 10px; font-size:11.5px; border-radius:8px;" title="Edit Vidio">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                <span>Edit</span>
              </button>
              <button type="button" class="btn-action-delete" onclick="hapusVideoAdmin(${v.id})" style="padding:5px 10px; font-size:11.5px;" title="Hapus Vidio">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                <span>Hapus</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function updateLiveVideoPreview(url) {
    const thumbImg = document.getElementById('video-preview-thumb');
    const placeholder = document.getElementById('video-preview-placeholder');
    const statusText = document.getElementById('video-preview-status');
    const yt = parseYouTubeUrlClient(url);

    if (yt.videoId && yt.thumbnailUrl) {
      if (thumbImg) {
        thumbImg.src = yt.thumbnailUrl;
        thumbImg.style.display = 'block';
      }
      if (placeholder) placeholder.style.display = 'none';
      if (statusText) {
        statusText.textContent = 'Link YouTube Terdeteksi (ID: ' + yt.videoId + ')';
        statusText.style.color = '#15803D';
      }
    } else {
      if (thumbImg) thumbImg.style.display = 'none';
      if (placeholder) placeholder.style.display = 'block';
      if (statusText) {
        statusText.textContent = url ? 'Format link belum sesuai atau bukan YouTube' : 'Masukkan link YouTube di atas';
        statusText.style.color = url ? '#B91C1C' : '#64748B';
      }
    }
  }

  const inputVideoUrl = document.getElementById('input-video-url');
  if (inputVideoUrl) {
    inputVideoUrl.addEventListener('input', function() {
      updateLiveVideoPreview(this.value);
    });
    inputVideoUrl.addEventListener('paste', function() {
      setTimeout(() => updateLiveVideoPreview(inputVideoUrl.value), 50);
    });
  }

  window.bukaModalTambahVideo = function() {
    const modal = document.getElementById('modal-video');
    const title = document.getElementById('modal-video-title');
    const form = document.getElementById('form-modal-video');
    if (!modal) return;

    if (form) form.reset();
    document.getElementById('input-video-id').value = '';
    if (title) title.textContent = 'Tambah Vidio Praktik Baru';
    updateLiveVideoPreview('');
    modal.style.display = 'flex';
  };

  window.bukaModalEditVideo = function(id) {
    const v = globalVideos.find(item => item.id === id);
    if (!v) return;

    const modal = document.getElementById('modal-video');
    const title = document.getElementById('modal-video-title');
    if (!modal) return;

    document.getElementById('input-video-id').value = v.id;
    document.getElementById('input-video-judul').value = v.judul || '';
    document.getElementById('input-video-kategori').value = v.kategori || 'Mikrotik';
    document.getElementById('input-video-durasi').value = v.durasi || '15:00';
    document.getElementById('input-video-url').value = v.url_youtube || '';
    document.getElementById('input-video-deskripsi').value = v.deskripsi || '';

    if (title) title.textContent = `Edit Vidio Praktik #${v.id}`;
    updateLiveVideoPreview(v.url_youtube || '');
    modal.style.display = 'flex';
  };

  window.tutupModalVideo = function() {
    const modal = document.getElementById('modal-video');
    if (modal) modal.style.display = 'none';
  };

  const btnTambahVideo = document.getElementById('btn-tambah-video');
  if (btnTambahVideo) btnTambahVideo.addEventListener('click', window.bukaModalTambahVideo);

  const btnCloseModalVideo = document.getElementById('btn-close-modal-video');
  if (btnCloseModalVideo) btnCloseModalVideo.addEventListener('click', window.tutupModalVideo);

  const btnBatalModalVideo = document.getElementById('btn-batal-modal-video');
  if (btnBatalModalVideo) btnBatalModalVideo.addEventListener('click', window.tutupModalVideo);

  const formModalVideo = document.getElementById('form-modal-video');
  if (formModalVideo) {
    formModalVideo.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('input-video-id').value;
      const judul = document.getElementById('input-video-judul').value.trim();
      const kategori = document.getElementById('input-video-kategori').value;
      const durasi = document.getElementById('input-video-durasi').value.trim() || '15:00';
      const url_youtube = document.getElementById('input-video-url').value.trim();
      const deskripsi = document.getElementById('input-video-deskripsi').value.trim();

      const btnSubmit = document.getElementById('btn-simpan-video');
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Menyimpan...';
      }

      try {
        let endpoint = id ? `/api/admin/video/${id}` : '/api/admin/video';
        let method = id ? 'PUT' : 'POST';

        let res = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ judul, kategori, durasi, url_youtube, deskripsi })
        });

        // Fallback jika /api/admin/video 404
        if (res.status === 404) {
          const fallbackEndpoint = id ? `/api/video/${id}` : '/api/video';
          res = await fetch(fallbackEndpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ judul, kategori, durasi, url_youtube, deskripsi })
          });
        }

        const data = await res.json();

        if (res.ok && data.success) {
          window.tutupModalVideo();
          await loadVideoAdmin();
          loadStats();
          toast(data.message || 'Vidio praktik berhasil disimpan!', 'success');
        } else {
          toast(data.error || 'Gagal menyimpan vidio.', 'error');
        }
      } catch (err) {
        toast('Terjadi kesalahan jaringan.', 'error');
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Simpan Vidio</span>';
        }
      }
    });
  }

  window.hapusVideoAdmin = async function(id) {
    const confirmed = await confirmDialog(`Apakah Anda yakin ingin menghapus vidio praktik #${id}?`, {
      title: 'Hapus Vidio Praktik',
      confirmText: 'Hapus Vidio',
      cancelText: 'Batal',
      type: 'danger'
    });
    if (!confirmed) return;

    try {
      let res = await fetch(`/api/admin/video/${id}`, { method: 'DELETE' });
      if (res.status === 404) {
        res = await fetch(`/api/video/${id}`, { method: 'DELETE' });
      }
      const data = await res.json();

      if (res.ok && data.success) {
        await loadVideoAdmin();
        loadStats();
        toast('Vidio praktik berhasil dihapus!', 'success');
      } else {
        toast(data.error || 'Gagal menghapus vidio.', 'error');
      }
    } catch (err) {
      toast('Terjadi kesalahan jaringan.', 'error');
    }
  };

  const searchVideoAdminInput = document.getElementById('search-video-admin');
  if (searchVideoAdminInput) searchVideoAdminInput.addEventListener('input', renderVideoAdminTable);

  // Logout Admin
  const btnLogout = document.getElementById('btn-admin-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      logout();
    });
  }

  // Initial Load
  loadStats();
  loadAktivitas();
  loadSiswa();
  loadSiswaTerbaru();
  loadPengumuman();
  loadMateri();
  loadVideoAdmin();
  loadQuizAdmin();

  // Auto-Sync Polling cerdas (Hanya aktif saat tab sedang dilihat, interval 15 detik)
  let isPolling = false;
  setInterval(async () => {
    if (document.hidden || isPolling) return;
    isPolling = true;
    try {
      await Promise.allSettled([
        loadStats(),
        loadAktivitas(),
        loadSiswa(),
        loadSiswaTerbaru()
      ]);
    } finally {
      isPolling = false;
    }
  }, 15000);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.initAdminDashboard);
} else {
  window.initAdminDashboard();
}

