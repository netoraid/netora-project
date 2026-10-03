// ==========================================================================
// NETORA GURU DASHBOARD CONTROLLER (MONITORING & QUIZ ENGINE)
// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Verifikasi Hak Akses Guru & Admin
  const user = typeof getUser === 'function' ? await getUser() : null;
  if (!user) {
    window.location.href = '/login.html';
    return;
  }

  // Hanya role 'guru' dan 'admin' yang memiliki otorisasi mengakses dashboard ini
  if (user.role !== 'guru' && user.role !== 'admin') {
    if (typeof toast === 'function') {
      toast('Akses Ditolak: Halaman ini khusus untuk Guru / Pendidik.', 'error');
    }
    setTimeout(() => {
      window.location.href = '/beranda.html';
    }, 800);
    return;
  }

  // Tampilkan Identitas Guru di Top Header
  const guruNama = document.getElementById('guru-nama');
  const guruAvatar = document.getElementById('guru-avatar');
  if (guruNama) guruNama.textContent = user.nama || 'Guru Pembimbing';
  if (guruAvatar && user.foto) guruAvatar.src = user.foto;

  // 2. Jam Digital Real-time
  function updateLiveClock() {
    const clockEl = document.getElementById('live-time-text');
    if (!clockEl) return;
    const now = new Date();
    const opt = {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    };
    clockEl.textContent = now.toLocaleDateString('id-ID', opt) + ' WIB';
  }
  updateLiveClock();
  setInterval(updateLiveClock, 1000);

  // 3. Tab Switching Controller (Desktop Buttons & Mobile Dropdown Sync)
  window.switchGuruTab = function(targetId) {
    if (!targetId) return;

    const tabBtns = document.querySelectorAll('.guru-tab-btn');
    const tabContents = document.querySelectorAll('.guru-tab-content');
    const mobileSelect = document.getElementById('guru-tab-select-mobile');

    tabBtns.forEach(btn => {
      if (btn.dataset.tab === targetId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    tabContents.forEach(c => {
      if (c.id === targetId) {
        c.classList.add('active');
        c.style.display = 'block';
      } else {
        c.classList.remove('active');
        c.style.display = 'none';
      }
    });

    if (mobileSelect && mobileSelect.value !== targetId) {
      mobileSelect.value = targetId;
    }
  };

  const desktopTabBtns = document.querySelectorAll('.guru-tab-btn');
  desktopTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      window.switchGuruTab(btn.dataset.tab);
    });
  });

  const mobileSelect = document.getElementById('guru-tab-select-mobile');
  if (mobileSelect) {
    mobileSelect.addEventListener('change', function() {
      window.switchGuruTab(this.value);
    });
  }

  // 4. Data State Internal
  let globalStats = null;
  let globalNilai = [];
  let globalProgress = [];
  let globalQuiz = [];

  // ==========================================================================
  // FITUR 1: STATISTIK & KPI DASHBOARD
  // ==========================================================================
  async function loadStats() {
    try {
      const res = await fetch('/api/guru/stats');
      const data = await res.json();
      if (!res.ok || !data.success) return;

      globalStats = data.stats;
      const s = globalStats;

      const elTotalSiswa = document.getElementById('stat-total-siswa');
      const elAvgProgress = document.getElementById('stat-avg-progress');
      const elAvgSkor = document.getElementById('stat-avg-skor');
      const elPersenLulus = document.getElementById('stat-persen-lulus');
      const elLulusSub = document.getElementById('stat-lulus-sub');
      const elTotalSoal = document.getElementById('stat-total-soal');
      const elTotalSesi = document.getElementById('stat-total-sesi');

      if (elTotalSiswa) elTotalSiswa.textContent = s.totalSiswa;
      if (elAvgProgress) elAvgProgress.textContent = `${s.avgProgress}%`;
      if (elAvgSkor) elAvgSkor.textContent = s.avgSkor;
      if (elPersenLulus) elPersenLulus.textContent = `${s.persenLulus}%`;
      if (elLulusSub) elLulusSub.textContent = `${s.lulusCount} Lulus / ${s.remidiCount} Remidi`;
      if (elTotalSoal) elTotalSoal.textContent = s.totalKuisSoal;
      if (elTotalSesi) elTotalSesi.textContent = s.totalSesiKuis;
    } catch (err) {
      console.warn('Gagal memuat statistik guru:', err);
    }
  }

  // ==========================================================================
  // FITUR 2: MELIHAT NILAI HASIL QUIZ SISWA
  // ==========================================================================
  async function loadNilai() {
    const tbody = document.getElementById('tbody-nilai-guru');
    try {
      const res = await fetch('/api/guru/nilai');
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.nilai)) {
        globalNilai = data.nilai;
        renderNilaiTable();
      } else {
        if (tbody) {
          tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:24px; color:#EF4444;">Gagal memuat rekap nilai siswa.</td></tr>`;
        }
      }
    } catch (err) {
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:24px; color:#EF4444;">Terjadi gangguan koneksi jaringan.</td></tr>`;
      }
    }
  }

  function renderNilaiTable() {
    const tbody = document.getElementById('tbody-nilai-guru');
    const labelCount = document.getElementById('label-count-nilai');
    if (!tbody) return;

    const searchKeyword = (document.getElementById('search-nilai-input')?.value || '').toLowerCase().trim();
    const filterStatus = document.getElementById('filter-nilai-status')?.value || 'all';
    const sortOrder = document.getElementById('sort-nilai-order')?.value || 'terbaru';

    let filtered = globalNilai.filter(item => {
      const nama = (item.siswa_nama || '').toLowerCase();
      const email = (item.siswa_email || '').toLowerCase();
      const matchSearch = !searchKeyword || nama.includes(searchKeyword) || email.includes(searchKeyword);

      let matchStatus = true;
      if (filterStatus === 'lulus') matchStatus = item.lulus === true;
      if (filterStatus === 'remidi') matchStatus = item.lulus === false;

      return matchSearch && matchStatus;
    });

    // Sorting
    filtered.sort((a, b) => {
      if (sortOrder === 'skor_desc') return b.skor - a.skor;
      if (sortOrder === 'skor_asc') return a.skor - b.skor;
      return b.id - a.id; // Terbaru
    });

    if (labelCount) {
      labelCount.textContent = `Menampilkan ${filtered.length} dari total ${globalNilai.length} hasil kuis`;
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding:32px; color:#94A3B8;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="margin-bottom:8px;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <div style="font-weight:700;">Tidak ada riwayat nilai yang cocok dengan filter.</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map((item, idx) => {
      const badgeClass = item.lulus ? 'badge-pass' : 'badge-fail';
      const badgeIcon = item.lulus
        ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`
        : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

      let formattedDate = '-';
      if (item.tanggal) {
        try {
          formattedDate = new Date(item.tanggal).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) + ' WIB';
        } catch(e) {}
      }

      return `
        <tr>
          <td style="font-weight:700; color:#64748B;">${idx + 1}</td>
          <td>
            <div style="display:flex; align-items:center; gap:10px;">
              <img src="${item.siswa_foto || 'uploads/default.png'}" alt="Foto" style="width:34px; height:34px; border-radius:50%; object-fit:cover; border:1.5px solid #E2E8F0;">
              <div>
                <strong style="display:block; color:#1E293B; font-size:13.5px;">${escapeHtml(item.siswa_nama)}</strong>
                <span style="color:#64748B; font-size:11.5px;">${escapeHtml(item.siswa_email)}</span>
              </div>
            </div>
          </td>
          <td style="color:#475569; font-size:12.5px;">${formattedDate}</td>
          <td>
            <span style="font-size:16px; font-weight:900; color:${item.lulus ? '#16A34A' : '#DC2626'};">${item.skor}</span>
            <span style="font-size:11px; color:#94A3B8;">/100</span>
          </td>
          <td>
            <span class="badge-status ${badgeClass}">
              ${badgeIcon}
              <span>${item.status}</span>
            </span>
          </td>
          <td>
            <span style="font-size:11.5px; font-weight:700; background:#F1F5F9; color:#475569; padding:4px 8px; border-radius:8px;">Kuis TKJ</span>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Filter & Search Event Listeners Nilai
  document.getElementById('search-nilai-input')?.addEventListener('input', renderNilaiTable);
  document.getElementById('filter-nilai-status')?.addEventListener('change', renderNilaiTable);
  document.getElementById('sort-nilai-order')?.addEventListener('change', renderNilaiTable);
  document.getElementById('btn-refresh-nilai')?.addEventListener('click', () => {
    loadNilai();
    loadStats();
    if (typeof toast === 'function') toast('Data nilai diperbarui!', 'info');
  });

  // Ekspor CSV Nilai
  document.getElementById('btn-export-nilai')?.addEventListener('click', () => {
    if (!globalNilai || globalNilai.length === 0) {
      if (typeof toast === 'function') toast('Belum ada data nilai untuk diekspor.', 'warning');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,No,Nama Siswa,Email,Waktu Pengerjaan,Skor,Status\n';
    globalNilai.forEach((row, idx) => {
      const cleanNama = `"${(row.siswa_nama || '').replace(/"/g, '""')}"`;
      const cleanEmail = `"${(row.siswa_email || '').replace(/"/g, '""')}"`;
      const cleanDate = `"${row.tanggal || ''}"`;
      csvContent += `${idx + 1},${cleanNama},${cleanEmail},${cleanDate},${row.skor},${row.status}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_nilai_siswa_netora_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  });

  // ==========================================================================
  // FITUR 3: MELIHAT PROGRESS SISWA SUDAH BERAPA PERSEN (%)
  // ==========================================================================
  async function loadProgress() {
    const tbody = document.getElementById('tbody-progress-guru');
    try {
      const res = await fetch('/api/guru/progress');
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.siswa)) {
        globalProgress = data.siswa;
        renderProgressTable();
      } else {
        if (tbody) {
          tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:#EF4444;">Gagal memuat data progress siswa.</td></tr>`;
        }
      }
    } catch (err) {
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:#EF4444;">Terjadi gangguan koneksi jaringan.</td></tr>`;
      }
    }
  }

  function renderProgressTable() {
    const tbody = document.getElementById('tbody-progress-guru');
    const labelCount = document.getElementById('label-count-progress');
    if (!tbody) return;

    const searchKeyword = (document.getElementById('search-progress-input')?.value || '').toLowerCase().trim();
    const filterLevel = document.getElementById('filter-progress-level')?.value || 'all';
    const sortOrder = document.getElementById('sort-progress-order')?.value || 'progress_desc';

    let filtered = globalProgress.filter(item => {
      const nama = (item.nama || '').toLowerCase();
      const email = (item.email || '').toLowerCase();
      const matchSearch = !searchKeyword || nama.includes(searchKeyword) || email.includes(searchKeyword);

      let matchLevel = true;
      const pct = Number(item.progress_persen) || 0;
      if (filterLevel === 'tuntas') matchLevel = pct >= 80;
      if (filterLevel === 'sedang') matchLevel = pct >= 40 && pct < 80;
      if (filterLevel === 'pemula') matchLevel = pct > 0 && pct < 40;
      if (filterLevel === 'belum') matchLevel = pct === 0;

      return matchSearch && matchLevel;
    });

    // Sorting
    filtered.sort((a, b) => {
      if (sortOrder === 'progress_asc') return a.progress_persen - b.progress_persen;
      if (sortOrder === 'progress_desc') return b.progress_persen - a.progress_persen;
      if (sortOrder === 'ujian_desc') return b.total_ujian - a.total_ujian;
      return (a.nama || '').localeCompare(b.nama || '');
    });

    if (labelCount) {
      labelCount.textContent = `Menampilkan ${filtered.length} dari total ${globalProgress.length} siswa`;
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding:32px; color:#94A3B8;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="margin-bottom:8px;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <div style="font-weight:700;">Tidak ada siswa yang sesuai kriteria filter.</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map((item, idx) => {
      const pct = item.progress_persen;
      let barGrad = 'linear-gradient(90deg, #F59E0B, #D97706)';
      let badgeClass = 'badge-amber';
      let pctColor = '#D97706';

      if (pct >= 80) {
        barGrad = 'linear-gradient(90deg, #10B981, #059669)';
        badgeClass = 'badge-pass';
        pctColor = '#10B981';
      } else if (pct >= 40) {
        barGrad = 'linear-gradient(90deg, #0D5BFF, #38BDF8)';
        badgeClass = 'badge-blue';
        pctColor = '#0D5BFF';
      } else if (pct === 0) {
        barGrad = '#CBD5E1';
        badgeClass = 'badge-gray';
        pctColor = '#94A3B8';
      }

      return `
        <tr>
          <td style="font-weight:700; color:#64748B;">${idx + 1}</td>
          <td>
            <div style="display:flex; align-items:center; gap:10px;">
              <img src="${item.foto || 'uploads/default.png'}" alt="Foto" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:1.5px solid #E2E8F0;">
              <div>
                <strong style="display:block; color:#1E293B; font-size:13.5px;">${escapeHtml(item.nama)}</strong>
                <span style="color:#64748B; font-size:11.5px;">${escapeHtml(item.email)}</span>
              </div>
            </div>
          </td>
          <td style="font-weight:700; color:#334155;">${item.total_ujian} Sesi</td>
          <td style="font-weight:800; color:#0F172A;">${item.skor_tertinggi}</td>
          <td style="font-weight:800; color:#0D5BFF;">${item.rata_skor}</td>
          <td>
            <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:3px;">
              <span style="font-size:14px; font-weight:900; color:${pctColor};">${pct}%</span>
              <span style="font-size:11px; font-weight:600; color:#64748B;">Target 100%</span>
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar-fill" style="width:${pct}%; background:${barGrad};"></div>
            </div>
          </td>
          <td>
            <span class="badge-status ${badgeClass}">
              <span>${item.status_progress}</span>
            </span>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Filter & Search Event Listeners Progress
  document.getElementById('search-progress-input')?.addEventListener('input', renderProgressTable);
  document.getElementById('filter-progress-level')?.addEventListener('change', renderProgressTable);
  document.getElementById('sort-progress-order')?.addEventListener('change', renderProgressTable);
  document.getElementById('btn-refresh-progress')?.addEventListener('click', () => {
    loadProgress();
    loadStats();
    if (typeof toast === 'function') toast('Data progress siswa diperbarui!', 'info');
  });

  // ==========================================================================
  // FITUR 4: MEMBUAT MATERI QUIZ & BANK SOAL (CRUD LENGKAP)
  // ==========================================================================
  async function loadQuiz() {
    const tbody = document.getElementById('tbody-quiz-guru');
    try {
      const res = await fetch('/api/guru/quiz');
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.quiz)) {
        globalQuiz = data.quiz;
        renderQuizTable();
      } else {
        if (tbody) {
          tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:24px; color:#EF4444;">Gagal memuat bank soal kuis.</td></tr>`;
        }
      }
    } catch (err) {
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:24px; color:#EF4444;">Terjadi gangguan jaringan saat memuat bank soal.</td></tr>`;
      }
    }
  }

  function renderQuizTable() {
    const tbody = document.getElementById('tbody-quiz-guru');
    const labelCount = document.getElementById('label-count-quiz');
    if (!tbody) return;

    const searchKeyword = (document.getElementById('search-quiz-input')?.value || '').toLowerCase().trim();
    const filterKategori = document.getElementById('filter-quiz-kategori')?.value || 'all';

    let filtered = globalQuiz.filter(item => {
      const pertanyaan = (item.pertanyaan || '').toLowerCase();
      const matchSearch = !searchKeyword || pertanyaan.includes(searchKeyword);
      const matchKategori = filterKategori === 'all' || item.kategori === filterKategori;
      return matchSearch && matchKategori;
    });

    if (labelCount) {
      labelCount.textContent = `Menampilkan ${filtered.length} dari total ${globalQuiz.length} butir soal kuis`;
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; padding:32px; color:#94A3B8;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="margin-bottom:8px;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <div style="font-weight:700;">Belum ada butir soal kuis yang cocok.</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map((item, idx) => {
      return `
        <tr>
          <td style="font-weight:700; color:#64748B;">${idx + 1}</td>
          <td>
            <span style="display:inline-block; font-size:11px; font-weight:700; background:#EFF6FF; color:#0D5BFF; border:1px solid #BFDBFE; padding:4px 8px; border-radius:8px;">
              ${escapeHtml(item.kategori || 'TKJ Umum')}
            </span>
          </td>
          <td>
            <strong style="color:#0F172A; font-size:13.5px; line-height:1.45; display:block;">${escapeHtml(item.pertanyaan)}</strong>
          </td>
          <td>
            <div style="font-size:11.5px; line-height:1.5; color:#475569;">
              <span style="${item.jawaban_benar === 'A' ? 'font-weight:800; color:#16A34A; background:#DCFCE7; padding:1px 5px; border-radius:4px;' : ''}">A: ${escapeHtml(item.pilihan_a)}</span><br>
              <span style="${item.jawaban_benar === 'B' ? 'font-weight:800; color:#16A34A; background:#DCFCE7; padding:1px 5px; border-radius:4px;' : ''}">B: ${escapeHtml(item.pilihan_b)}</span><br>
              <span style="${item.jawaban_benar === 'C' ? 'font-weight:800; color:#16A34A; background:#DCFCE7; padding:1px 5px; border-radius:4px;' : ''}">C: ${escapeHtml(item.pilihan_c)}</span><br>
              <span style="${item.jawaban_benar === 'D' ? 'font-weight:800; color:#16A34A; background:#DCFCE7; padding:1px 5px; border-radius:4px;' : ''}">D: ${escapeHtml(item.pilihan_d)}</span>
            </div>
            <div style="margin-top:4px; font-size:11px; font-weight:800; color:#16A34A;">Kunci: [${item.jawaban_benar}]</div>
          </td>
          <td style="text-align:center;">
            <div style="display:inline-flex; gap:6px;">
              <button type="button" class="btn-secondary" style="padding:6px 10px; font-size:11.5px;" onclick="window.bukaModalEditQuiz(${item.id})" title="Edit Soal">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                <span>Edit</span>
              </button>
              <button type="button" class="btn-secondary" style="padding:6px 10px; font-size:11.5px; color:#DC2626; border-color:#FECACA; background:#FEF2F2;" onclick="window.hapusSoalQuiz(${item.id})" title="Hapus Soal">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                <span>Hapus</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Event Listener Form Buat Soal Kuis Baru
  const formTambahQuiz = document.getElementById('form-tambah-quiz-guru');
  if (formTambahQuiz) {
    formTambahQuiz.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btnSubmit = document.getElementById('btn-submit-quiz');
      const kategori = document.getElementById('input-kategori-quiz').value;
      const pertanyaan = document.getElementById('input-pertanyaan-quiz').value.trim();
      const pilihan_a = document.getElementById('input-opsi-a').value.trim();
      const pilihan_b = document.getElementById('input-opsi-b').value.trim();
      const pilihan_c = document.getElementById('input-opsi-c').value.trim();
      const pilihan_d = document.getElementById('input-opsi-d').value.trim();
      const jawaban_benar = document.getElementById('input-kunci-quiz').value;

      if (!pertanyaan || !pilihan_a || !pilihan_b || !pilihan_c || !pilihan_d) {
        if (typeof toast === 'function') toast('Harap lengkapi semua kolom soal kuis.', 'warning');
        return;
      }

      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<span>Menyimpan...</span>';
      }

      try {
        const res = await fetch('/api/guru/quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kategori,
            pertanyaan,
            pilihan_a,
            pilihan_b,
            pilihan_c,
            pilihan_d,
            jawaban_benar
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          if (typeof toast === 'function') toast(data.message || 'Soal kuis baru berhasil ditambahkan!', 'success');
          formTambahQuiz.reset();
          loadQuiz();
          loadStats();
        } else {
          if (typeof toast === 'function') toast(data.error || 'Gagal menambahkan soal kuis.', 'error');
        }
      } catch (err) {
        if (typeof toast === 'function') toast('Terjadi kesalahan jaringan saat menyimpan soal.', 'error');
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Simpan Soal Kuis Baru</span>
          `;
        }
      }
    });
  }

  // Filter & Search Event Listeners Quiz
  document.getElementById('search-quiz-input')?.addEventListener('input', renderQuizTable);
  document.getElementById('filter-quiz-kategori')?.addEventListener('change', renderQuizTable);
  document.getElementById('btn-refresh-quiz')?.addEventListener('click', () => {
    loadQuiz();
    loadStats();
    if (typeof toast === 'function') toast('Bank soal diperbarui!', 'info');
  });

  // Modal Edit Soal Handler
  const modalEditQuiz = document.getElementById('modal-edit-quiz-guru');
  const btnCloseModalQuiz = document.getElementById('btn-close-modal-quiz');
  const btnCancelEditQuiz = document.getElementById('btn-cancel-edit-quiz');
  const formEditQuiz = document.getElementById('form-edit-quiz-guru');

  function tutupModalEdit() {
    if (modalEditQuiz) modalEditQuiz.classList.remove('active');
  }

  if (btnCloseModalQuiz) btnCloseModalQuiz.addEventListener('click', tutupModalEdit);
  if (btnCancelEditQuiz) btnCancelEditQuiz.addEventListener('click', tutupModalEdit);

  window.bukaModalEditQuiz = async function(id) {
    try {
      const res = await fetch(`/api/guru/quiz/${id}`);
      const data = await res.json();
      if (!res.ok || !data.success || !data.soal) {
        if (typeof toast === 'function') toast('Gagal mengambil data soal.', 'error');
        return;
      }

      const q = data.soal;
      document.getElementById('edit-quiz-id').value = q.id;
      document.getElementById('edit-quiz-kategori').value = q.kategori || 'Teknik Komputer & Jaringan Umum';
      document.getElementById('edit-quiz-pertanyaan').value = q.pertanyaan || '';
      document.getElementById('edit-quiz-a').value = q.pilihan_a || '';
      document.getElementById('edit-quiz-b').value = q.pilihan_b || '';
      document.getElementById('edit-quiz-c').value = q.pilihan_c || '';
      document.getElementById('edit-quiz-d').value = q.pilihan_d || '';
      document.getElementById('edit-quiz-kunci').value = q.jawaban_benar || 'A';

      if (modalEditQuiz) modalEditQuiz.classList.add('active');
    } catch (err) {
      if (typeof toast === 'function') toast('Gagal memuat detail soal kuis.', 'error');
    }
  };

  if (formEditQuiz) {
    formEditQuiz.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('edit-quiz-id').value;
      const kategori = document.getElementById('edit-quiz-kategori').value;
      const pertanyaan = document.getElementById('edit-quiz-pertanyaan').value.trim();
      const pilihan_a = document.getElementById('edit-quiz-a').value.trim();
      const pilihan_b = document.getElementById('edit-quiz-b').value.trim();
      const pilihan_c = document.getElementById('edit-quiz-c').value.trim();
      const pilihan_d = document.getElementById('edit-quiz-d').value.trim();
      const jawaban_benar = document.getElementById('edit-quiz-kunci').value;

      try {
        const res = await fetch(`/api/guru/quiz/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kategori,
            pertanyaan,
            pilihan_a,
            pilihan_b,
            pilihan_c,
            pilihan_d,
            jawaban_benar
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          if (typeof toast === 'function') toast(data.message || 'Soal berhasil diperbarui!', 'success');
          tutupModalEdit();
          loadQuiz();
        } else {
          if (typeof toast === 'function') toast(data.error || 'Gagal memperbarui soal.', 'error');
        }
      } catch (err) {
        if (typeof toast === 'function') toast('Terjadi kesalahan jaringan saat update.', 'error');
      }
    });
  }

  // Hapus Soal Handler
  window.hapusSoalQuiz = async function(id) {
    const confirmed = typeof confirmDialog === 'function' ? await confirmDialog('Apakah Bapak/Ibu Guru yakin ingin menghapus butir soal kuis ini dari bank soal?', {
      title: 'Hapus Butir Soal Kuis',
      confirmText: 'Ya, Hapus Soal',
      cancelText: 'Batal',
      type: 'danger'
    }) : window.confirm('Hapus butir soal kuis ini?');

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/guru/quiz/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (typeof toast === 'function') toast(data.message || 'Soal kuis berhasil dihapus.', 'success');
        loadQuiz();
        loadStats();
      } else {
        if (typeof toast === 'function') toast(data.error || 'Gagal menghapus soal.', 'error');
      }
    } catch (err) {
      if (typeof toast === 'function') toast('Terjadi kesalahan jaringan saat menghapus soal.', 'error');
    }
  };

  // ==========================================================================
  // FITUR 5: LOGOUT GURU
  // ==========================================================================
  const btnLogout = document.getElementById('btn-guru-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      if (typeof logout === 'function') {
        logout();
      } else {
        fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
          try { sessionStorage.clear(); } catch(e) {}
          window.location.href = '/login.html';
        });
      }
    });
  }

  // Inisialisasi awal seluruh data
  loadStats();
  loadNilai();
  loadProgress();
  loadQuiz();

  // Ekspor fungsi sinkronisasi real-time Socket.io
  window.loadGuruData = function() {
    loadStats();
    loadNilai();
    loadProgress();
  };

  // Auto-sync polling cadangan setiap 30 detik jika tab aktif
  setInterval(() => {
    if (document.hidden) return;
    loadStats();
  }, 30000);
});
