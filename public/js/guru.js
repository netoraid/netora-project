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
  if (user.role !== 'guru' && user.role !== 'admin' && user.email !== 'guru123' && user.email !== 'guru') {
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
  if (guruAvatar) {
    guruAvatar.src = typeof getUserAvatarUrl === 'function' ? getUserAvatarUrl(user) : (user.foto || 'uploads/default.svg');
    guruAvatar.onerror = function() {
      this.onerror = null;
      this.src = typeof getUserAvatarUrl === 'function' ? getUserAvatarUrl({ nama: user ? user.nama : 'Guru' }) : 'uploads/default.svg';
    };
  }

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
          <td colspan="7" style="text-align:center; padding:32px; color:#94A3B8;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="margin-bottom:8px;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
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
          <td style="text-align:center;">
            <button type="button" class="btn-review-nilai-guru" onclick="window.bukaModalDetailJawabanGuru(${item.id})" style="padding:5px 12px; border-radius:8px; border:1.5px solid #CBD5E1; background:#FFFFFF; color:#0D5BFF; font-weight:700; font-size:11.5px; cursor:pointer; display:inline-flex; align-items:center; gap:5px; transition:all 0.2s; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <span>Review</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Helper Modal Review Detail Jawaban Kuis Siswa Guru
  window.bukaModalDetailJawabanGuru = async function(id) {
    const modal = document.getElementById('modal-detail-jawaban-guru');
    const metaContainer = document.getElementById('modal-review-guru-meta');
    const bodyContainer = document.getElementById('modal-review-guru-body');
    if (!modal) return;

    modal.style.display = 'flex';
    if (metaContainer) metaContainer.innerHTML = '<div style="color:#64748B; font-size:13px;">Memuat data review...</div>';
    if (bodyContainer) bodyContainer.innerHTML = '<div style="text-align:center; padding:30px; color:#64748B;">Mengambil rincian butir soal dan jawaban siswa...</div>';

    try {
      const res = await fetch(`/api/guru/quiz-detail/${id}`);
      const data = await res.json();
      if (!res.ok || !data.success || !data.submission) {
        if (bodyContainer) {
          bodyContainer.innerHTML = `
            <div style="text-align:center; padding:30px; color:#EF4444; background:#FEF2F2; border-radius:12px; border:1px solid #FECACA;">
              <p style="margin:0; font-weight:700;">Data rincian butir jawaban kuis tidak ditemukan atau telah diarsipkan.</p>
            </div>
          `;
        }
        return;
      }

      const s = data.submission;
      const isLulus = s.lulus;

      let formattedDate = '-';
      if (s.tanggal) {
        try {
          formattedDate = new Date(s.tanggal).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) + ' WIB';
        } catch(e) {}
      }

      if (metaContainer) {
        metaContainer.innerHTML = `
          <div>
            <h4 style="margin:0 0 4px; font-size:16px; font-weight:800; color:#0F172A;">${escapeHtml(s.siswa_nama)}</h4>
            <div style="font-size:12.5px; color:#64748B; display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
              <span>Email: <strong>${escapeHtml(s.siswa_email || '-')}</strong></span>
              <span>•</span>
              <span>Topik: <strong style="color:#0D5BFF;">${escapeHtml(s.topic_title || 'Kuis TKJ')}</strong></span>
              <span>•</span>
              <span>Waktu: ${formattedDate}</span>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="text-align:right;">
              <span style="font-size:11px; color:#64748B; display:block; font-weight:700; text-transform:uppercase;">Skor Ujian</span>
              <strong style="font-size:26px; font-weight:900; color:${isLulus ? '#16A34A' : '#DC2626'};">${s.skor}</strong>
              <span style="font-size:11.5px; color:#64748B;">/100</span>
            </div>
            <span class="badge-status ${isLulus ? 'badge-pass' : 'badge-fail'}" style="font-size:12px; padding:6px 12px; border-radius:8px;">
              ${isLulus ? 'LULUS' : 'REMIDI'}
            </span>
          </div>
        `;
      }

      if (bodyContainer) {
        const reviewList = Array.isArray(s.review) ? s.review : [];
        if (reviewList.length === 0) {
          bodyContainer.innerHTML = `
            <div style="background:#FFFBEB; border:1px solid #FDE68A; border-radius:12px; padding:18px; text-align:center; color:#92400E; font-size:13px;">
              <p style="margin:0; font-weight:700;">Rincian butir soal per jawaban belum terekam pada sesi pengerjaan ini.</p>
              <p style="margin:4px 0 0; font-size:12px;">Pengerjaan kuis selanjutnya oleh siswa akan otomatis menampilkan seluruh rincian jawaban dan kunci jawaban.</p>
            </div>
          `;
          return;
        }

        bodyContainer.innerHTML = reviewList.map(item => `
          <div style="background:#FFFFFF; border:1.5px solid ${item.is_benar ? '#86EFAC' : '#FECACA'}; border-radius:16px; padding:16px; box-shadow:0 2px 8px rgba(0,0,0,0.02);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <span style="font-weight:800; font-size:13px; color:#334155;">Soal #${item.no}</span>
              <span style="font-size:11.5px; font-weight:800; padding:3px 10px; border-radius:20px; display:inline-flex; align-items:center; gap:4px; ${item.is_benar ? 'background:#DCFCE7; color:#15803D;' : 'background:#FEE2E2; color:#DC2626;'}">
                ${item.is_benar ? '✅ Jawaban Benar' : '❌ Jawaban Salah'}
              </span>
            </div>
            <p style="font-size:13.5px; font-weight:700; color:#0F172A; margin:0 0 12px; line-height:1.5;">${escapeHtml(item.pertanyaan)}</p>

            <div style="display:flex; flex-direction:column; gap:8px; font-size:12.5px; margin-bottom:10px;">
              <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:8px 12px; border-radius:10px; ${item.is_benar ? 'background:#F0FDF4; border:1px solid #BBF7D0; color:#166534;' : 'background:#FEF2F2; border:1px solid #FECACA; color:#991B1B;'}">
                <div>
                  <span style="font-weight:700;">Jawaban Siswa:</span>
                  <span style="font-weight:800; margin-left:4px;">[${escapeHtml(item.jawaban_user)}] ${escapeHtml(item.jawaban_user_text)}</span>
                </div>
                <span style="font-weight:800; font-size:12px;">${item.is_benar ? '✓ Benar' : '✗ Salah'}</span>
              </div>

              ${!item.is_benar ? `
                <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:8px 12px; border-radius:10px; background:#F0FDF4; border:1px solid #BBF7D0; color:#166534;">
                  <div>
                    <span style="font-weight:700;">Kunci Jawaban yang Benar:</span>
                    <span style="font-weight:800; margin-left:4px;">[${escapeHtml(item.jawaban_benar)}] ${escapeHtml(item.jawaban_benar_text)}</span>
                  </div>
                  <span style="font-weight:800; font-size:12px;">✓ Kunci</span>
                </div>
              ` : ''}
            </div>
          </div>
        `).join('');
      }
    } catch (err) {
      if (bodyContainer) {
        bodyContainer.innerHTML = '<div style="color:#EF4444; text-align:center; padding:20px;">Terjadi kesalahan saat memuat rincian kuis.</div>';
      }
    }
  };

  function tutupModalDetailJawabanGuru() {
    const modal = document.getElementById('modal-detail-jawaban-guru');
    if (modal) modal.style.display = 'none';
  }

  const btnCloseModalReviewGuru = document.getElementById('btn-close-modal-detail-jawaban-guru');
  if (btnCloseModalReviewGuru) btnCloseModalReviewGuru.addEventListener('click', tutupModalDetailJawabanGuru);

  const btnTutupModalReviewGuru = document.getElementById('btn-tutup-modal-detail-jawaban-guru');
  if (btnTutupModalReviewGuru) btnTutupModalReviewGuru.addEventListener('click', tutupModalDetailJawabanGuru);

  const modalReviewGuruOverlay = document.getElementById('modal-detail-jawaban-guru');
  if (modalReviewGuruOverlay) {
    modalReviewGuruOverlay.addEventListener('click', (e) => {
      if (e.target === modalReviewGuruOverlay) tutupModalDetailJawabanGuru();
    });
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="margin-bottom:8px;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
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
    const badgeTotal = document.getElementById('badge-total-quiz-guru');
    if (!tbody) return;

    if (badgeTotal) {
      badgeTotal.textContent = `${globalQuiz.length} Butir Soal Terdaftar`;
    }

    const searchKeyword = (document.getElementById('search-quiz-input')?.value || '').toLowerCase().trim();
    const filterKategori = document.getElementById('filter-quiz-kategori')?.value || 'all';

    let filtered = globalQuiz.filter(item => {
      const pertanyaan = (item.pertanyaan || '').toLowerCase();
      const judul = (item.judul_kuis || '').toLowerCase();
      const kat = (item.kategori_utama || item.kategori || '').toLowerCase();
      const matchSearch = !searchKeyword || pertanyaan.includes(searchKeyword) || judul.includes(searchKeyword);
      const matchKategori = filterKategori === 'all' || kat === filterKategori.toLowerCase() || kat.includes(filterKategori.toLowerCase());
      return matchSearch && matchKategori;
    });

    if (labelCount) {
      labelCount.textContent = `Menampilkan ${filtered.length} dari total ${globalQuiz.length} butir soal kuis`;
    }

    if (filtered.length === 0) {
      const msg = globalQuiz.length === 0
        ? 'Belum ada butir soal kuis di database. Klik "+ Tambah Soal Kuis" di atas untuk menambahkan paket kuis pertama.'
        : 'Tidak ada butir soal kuis yang cocok dengan filter pencarian.';
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:36px; color:#64748B; font-size:13px;">${msg}</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map((item, idx) => {
      const kunci = (item.jawaban_benar || 'A').toUpperCase();
      const judulKuis = item.judul_kuis || item.kategori_utama || item.kategori || 'Kuis Latihan';
      const katUtama = item.kategori_utama || item.kategori || 'Umum';

      return `
        <tr>
          <td style="color:#64748B; font-weight:700; vertical-align:top; padding-top:14px;">${idx + 1}</td>
          <td style="vertical-align:top; padding-top:14px; min-width:160px;">
            <strong style="color:#0F172A; font-size:13px; line-height:1.35; display:block; margin-bottom:4px;">
              ${escapeHtml(judulKuis)}
            </strong>
            <span class="badge badge-purple" style="font-size:10.5px; padding:2px 8px; background:#EFF6FF; color:#0D5BFF; border:1px solid #BFDBFE; border-radius:6px; font-weight:700;">${escapeHtml(katUtama)}</span>
          </td>
          <td>
            <div style="margin-bottom:8px;">
              <strong style="color:#0F172A; font-size:13.5px; line-height:1.45; display:block;">${escapeHtml(item.pertanyaan)}</strong>
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
          <td style="text-align:center; vertical-align:top; padding-top:14px;">
            <span class="badge badge-green" style="font-weight:900; font-size:12px; padding:4px 10px; background:#DCFCE7; color:#15803D; border:1px solid #86EFAC; border-radius:6px;">
              Opsi ${escapeHtml(kunci)}
            </span>
          </td>
          <td style="text-align:center; vertical-align:top; padding-top:14px;">
            <div style="display:flex; align-items:center; justify-content:center; gap:6px;">
              <button class="btn-secondary" style="width:auto; padding:6px 10px; font-size:11.5px; border-radius:8px; display:inline-flex; align-items:center; gap:4px;" onclick="window.bukaModalEditQuiz(${item.id})" title="Edit Soal">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                <span>Edit</span>
              </button>
              <button class="btn-action-delete" style="padding:6px 10px; font-size:11.5px; border-radius:8px; background:#FEF2F2; border:1px solid #FECACA; color:#DC2626; cursor:pointer;" onclick="window.hapusSoalQuiz(${item.id})" title="Hapus Soal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px; height:13px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Helper Pembuat Kartu Butir Soal Guru
  function createSoalCardHtmlGuru(num, data = {}) {
    return `
      <div class="guru-soal-card" data-num="${num}" style="background:#FFFFFF; border:1.5px solid #E2E8F0; border-radius:14px; padding:16px; position:relative; box-shadow:0 2px 8px rgba(0,0,0,0.02); transition:border-color 0.2s;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #F1F5F9; padding-bottom:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="soal-badge-num" style="background:#0D5BFF; color:#FFFFFF; font-size:12px; font-weight:800; padding:2px 10px; border-radius:6px;">Soal #${num}</span>
            <span style="font-size:11.5px; color:#64748B;">Pilihan Ganda A-D</span>
          </div>
          <button type="button" class="btn-hapus-soal-card" style="background:#FEE2E2; border:none; color:#DC2626; border-radius:6px; padding:4px 10px; font-size:11px; font-weight:700; cursor:pointer;" title="Hapus butir soal ini">
            Hapus Soal
          </button>
        </div>

        <div class="form-group" style="margin-bottom:12px;">
          <label style="font-size:12px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Pertanyaan Soal #${num} *</label>
          <textarea class="input-field soal-item-pertanyaan" rows="2" placeholder="Tuliskan butir pertanyaan di sini..." required style="resize:vertical;">${escapeHtml(data.pertanyaan || '')}</textarea>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
          <div>
            <label style="font-size:11px; font-weight:700; color:#0D5BFF; margin-bottom:4px; display:block;">Pilihan A *</label>
            <input type="text" class="input-field soal-item-a" placeholder="Pilihan A..." value="${escapeHtml(data.pilihan_a || '')}" required>
          </div>
          <div>
            <label style="font-size:11px; font-weight:700; color:#0D5BFF; margin-bottom:4px; display:block;">Pilihan B *</label>
            <input type="text" class="input-field soal-item-b" placeholder="Pilihan B..." value="${escapeHtml(data.pilihan_b || '')}" required>
          </div>
          <div>
            <label style="font-size:11px; font-weight:700; color:#0D5BFF; margin-bottom:4px; display:block;">Pilihan C *</label>
            <input type="text" class="input-field soal-item-c" placeholder="Pilihan C..." value="${escapeHtml(data.pilihan_c || '')}" required>
          </div>
          <div>
            <label style="font-size:11px; font-weight:700; color:#0D5BFF; margin-bottom:4px; display:block;">Pilihan D *</label>
            <input type="text" class="input-field soal-item-d" placeholder="Pilihan D..." value="${escapeHtml(data.pilihan_d || '')}" required>
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:10px;">
          <label style="font-size:12px; font-weight:700; color:#15803D;">Kunci Jawaban Benar * :</label>
          <select class="input-field soal-item-kunci" style="width:130px; font-weight:800; color:#15803D; padding:6px 10px;">
            <option value="A" ${data.jawaban_benar === 'A' ? 'selected' : ''}>Pilihan A</option>
            <option value="B" ${data.jawaban_benar === 'B' ? 'selected' : ''}>Pilihan B</option>
            <option value="C" ${data.jawaban_benar === 'C' ? 'selected' : ''}>Pilihan C</option>
            <option value="D" ${data.jawaban_benar === 'D' ? 'selected' : ''}>Pilihan D</option>
          </select>
        </div>
      </div>
    `;
  }

  function updateSoalCardsIndexGuru() {
    const container = document.getElementById('container-soal-guru');
    if (!container) return;
    const cards = container.querySelectorAll('.guru-soal-card');
    cards.forEach((card, idx) => {
      const num = idx + 1;
      card.setAttribute('data-num', num);
      const badge = card.querySelector('.soal-badge-num');
      if (badge) badge.textContent = `Soal #${num}`;
      const label = card.querySelector('label');
      if (label && label.textContent.startsWith('Pertanyaan')) {
        label.textContent = `Pertanyaan Soal #${num} *`;
      }
    });
    const inputJumlah = document.getElementById('input-jumlah-soal-guru');
    if (inputJumlah) inputJumlah.value = cards.length;
    const btnSubmitLabel = document.getElementById('btn-simpan-soal-label-guru');
    if (btnSubmitLabel) btnSubmitLabel.textContent = `Simpan Paket Kuis (${cards.length} Soal)`;
  }

  function setSoalCardsCountGuru(count) {
    const container = document.getElementById('container-soal-guru');
    if (!container) return;
    const currentCards = container.querySelectorAll('.guru-soal-card');
    const curLen = currentCards.length;
    const targetLen = Math.max(1, Math.min(50, count));

    if (targetLen > curLen) {
      for (let i = curLen + 1; i <= targetLen; i++) {
        container.insertAdjacentHTML('beforeend', createSoalCardHtmlGuru(i));
      }
    } else if (targetLen < curLen) {
      for (let i = curLen - 1; i >= targetLen; i--) {
        currentCards[i].remove();
      }
    }
    updateSoalCardsIndexGuru();
  }

  // Quick Soal Buttons
  document.querySelectorAll('.btn-quick-soal-guru').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetCount = parseInt(btn.dataset.soal, 10);
      setSoalCardsCountGuru(targetCount);
      document.querySelectorAll('.btn-quick-soal-guru').forEach(b => {
        b.style.borderColor = '#CBD5E1';
        b.style.background = '#FFFFFF';
        b.style.color = '#334155';
      });
      btn.style.borderColor = '#0D5BFF';
      btn.style.background = '#EFF6FF';
      btn.style.color = '#0D5BFF';
    });
  });

  // Input jumlah soal manual
  const inputJumlahSoalGuru = document.getElementById('input-jumlah-soal-guru');
  if (inputJumlahSoalGuru) {
    inputJumlahSoalGuru.addEventListener('change', () => {
      let val = parseInt(inputJumlahSoalGuru.value, 10);
      if (isNaN(val) || val < 1) val = 1;
      if (val > 50) val = 50;
      setSoalCardsCountGuru(val);
    });
  }

  // Tambah 1 Butir Soal
  const btnTambahButirGuru = document.getElementById('btn-tambah-butir-guru');
  if (btnTambahButirGuru) {
    btnTambahButirGuru.addEventListener('click', () => {
      const container = document.getElementById('container-soal-guru');
      if (!container) return;
      const curCount = container.querySelectorAll('.guru-soal-card').length;
      container.insertAdjacentHTML('beforeend', createSoalCardHtmlGuru(curCount + 1));
      updateSoalCardsIndexGuru();
    });
  }

  // Hapus butir soal tertentu dari container
  const containerSoalGuru = document.getElementById('container-soal-guru');
  if (containerSoalGuru) {
    containerSoalGuru.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-hapus-soal-card');
      if (!btn) return;
      const cards = containerSoalGuru.querySelectorAll('.guru-soal-card');
      if (cards.length <= 1) {
        if (typeof toast === 'function') toast('Minimal harus ada 1 butir soal dalam kuis.', 'warning');
        return;
      }
      const card = btn.closest('.guru-soal-card');
      if (card) {
        card.remove();
        updateSoalCardsIndexGuru();
      }
    });
  }

  // Modal Buka Tambah Soal Guru
  window.bukaModalTambahSoalGuru = function() {
    const modal = document.getElementById('modal-soal-quiz-guru');
    if (!modal) return;

    document.getElementById('modal-soal-title-guru').textContent = 'Buat Paket Kuis Baru (Multi-Soal)';
    document.getElementById('soal-id-guru').value = '';
    document.getElementById('input-soal-kategori-guru').value = 'Cisco Packet Tracer';
    document.getElementById('input-soal-judul-guru').value = '';

    document.getElementById('wrap-jumlah-soal-guru').style.display = 'flex';
    document.getElementById('wrap-multi-soal-guru').style.display = 'flex';
    document.getElementById('wrap-single-soal-guru').style.display = 'none';

    setSoalCardsCountGuru(5);
    modal.style.display = 'flex';
  };

  // Modal Buka Edit Soal Guru
  window.bukaModalEditQuiz = function(id) {
    const item = globalQuiz.find(q => q.id === id);
    if (!item) return;

    const modal = document.getElementById('modal-soal-quiz-guru');
    if (!modal) return;

    document.getElementById('modal-soal-title-guru').textContent = 'Edit Soal Kuis #' + item.id;
    document.getElementById('soal-id-guru').value = item.id;
    document.getElementById('input-soal-kategori-guru').value = item.kategori_utama || item.kategori || 'Cisco Packet Tracer';
    document.getElementById('input-soal-judul-guru').value = item.judul_kuis || item.kategori_utama || item.kategori || '';

    document.getElementById('wrap-jumlah-soal-guru').style.display = 'none';
    document.getElementById('wrap-multi-soal-guru').style.display = 'none';
    document.getElementById('wrap-single-soal-guru').style.display = 'block';

    document.getElementById('input-soal-pertanyaan-guru').value = item.pertanyaan || '';
    document.getElementById('input-soal-a-guru').value = item.pilihan_a || '';
    document.getElementById('input-soal-b-guru').value = item.pilihan_b || '';
    document.getElementById('input-soal-c-guru').value = item.pilihan_c || '';
    document.getElementById('input-soal-d-guru').value = item.pilihan_d || '';
    document.getElementById('input-soal-kunci-guru').value = (item.jawaban_benar || 'A').toUpperCase();

    const btnLabel = document.getElementById('btn-simpan-soal-label-guru');
    if (btnLabel) btnLabel.textContent = 'Simpan Perubahan Soal';

    modal.style.display = 'flex';
  };

  function tutupModalSoalGuru() {
    const modal = document.getElementById('modal-soal-quiz-guru');
    if (modal) modal.style.display = 'none';
  }

  document.getElementById('btn-tambah-soal-guru')?.addEventListener('click', window.bukaModalTambahSoalGuru);
  document.getElementById('btn-close-modal-soal-guru')?.addEventListener('click', tutupModalSoalGuru);
  document.getElementById('btn-batal-modal-soal-guru')?.addEventListener('click', tutupModalSoalGuru);
  const modalSoalOverlayGuru = document.getElementById('modal-soal-quiz-guru');
  if (modalSoalOverlayGuru) {
    modalSoalOverlayGuru.addEventListener('click', (e) => {
      if (e.target === modalSoalOverlayGuru) tutupModalSoalGuru();
    });
  }

  // Submit Form Soal Kuis Guru (Tambah Paket Kuis / Edit Soal)
  const formSoalQuizGuru = document.getElementById('form-soal-quiz-guru');
  if (formSoalQuizGuru) {
    formSoalQuizGuru.addEventListener('submit', async (e) => {
      e.preventDefault();

      const soalId = document.getElementById('soal-id-guru').value;
      const kategori = document.getElementById('input-soal-kategori-guru').value;
      const judul_kuis = document.getElementById('input-soal-judul-guru').value.trim();

      if (!judul_kuis) {
        if (typeof toast === 'function') toast('Judul / nama kuis wajib diisi.', 'warning');
        document.getElementById('input-soal-judul-guru').focus();
        return;
      }

      const btnSubmit = document.getElementById('btn-simpan-soal-guru');

      // 1. Mode Edit Single Soal
      if (soalId) {
        const pertanyaan = document.getElementById('input-soal-pertanyaan-guru').value.trim();
        const pilihan_a = document.getElementById('input-soal-a-guru').value.trim();
        const pilihan_b = document.getElementById('input-soal-b-guru').value.trim();
        const pilihan_c = document.getElementById('input-soal-c-guru').value.trim();
        const pilihan_d = document.getElementById('input-soal-d-guru').value.trim();
        const jawaban_benar = document.getElementById('input-soal-kunci-guru').value;

        if (!pertanyaan || !pilihan_a || !pilihan_b || !pilihan_c || !pilihan_d) {
          if (typeof toast === 'function') toast('Harap isi semua kolom pertanyaan dan pilihan A sampai D.', 'warning');
          return;
        }

        const bodyData = { pertanyaan, kategori, judul_kuis, pilihan_a, pilihan_b, pilihan_c, pilihan_d, jawaban_benar };

        if (btnSubmit) {
          btnSubmit.disabled = true;
          btnSubmit.textContent = 'Menyimpan...';
        }

        try {
          const res = await fetch(`/api/guru/quiz/${soalId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
          });
          const data = await res.json();

          if (res.ok && data.success) {
            try { sessionStorage.removeItem('netora_quiz_cache'); } catch(e) {}
            tutupModalSoalGuru();
            await loadQuiz();
            if (typeof toast === 'function') toast(data.message || 'Soal kuis berhasil diperbarui!', 'success');
          } else {
            if (typeof toast === 'function') toast(data.error || 'Gagal menyimpan soal kuis.', 'error');
          }
        } catch (err) {
          if (typeof toast === 'function') toast('Terjadi kesalahan koneksi.', 'error');
        } finally {
          if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg><span id="btn-simpan-soal-label-guru">Simpan Soal</span>';
          }
        }
        return;
      }

      // 2. Mode Buat Paket Kuis Baru (Multi-Soal Sekaligus)
      const container = document.getElementById('container-soal-guru');
      const cards = container ? container.querySelectorAll('.guru-soal-card') : [];
      if (cards.length === 0) {
        if (typeof toast === 'function') toast('Harap tambahkan minimal 1 butir soal kuis.', 'warning');
        return;
      }

      const soal_list = [];
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const num = i + 1;
        const pertanyaan = card.querySelector('.soal-item-pertanyaan')?.value.trim();
        const pilihan_a = card.querySelector('.soal-item-a')?.value.trim();
        const pilihan_b = card.querySelector('.soal-item-b')?.value.trim();
        const pilihan_c = card.querySelector('.soal-item-c')?.value.trim();
        const pilihan_d = card.querySelector('.soal-item-d')?.value.trim();
        const jawaban_benar = card.querySelector('.soal-item-kunci')?.value || 'A';

        if (!pertanyaan || !pilihan_a || !pilihan_b || !pilihan_c || !pilihan_d) {
          if (typeof toast === 'function') toast(`Butir soal #${num} belum lengkap. Pertanyaan dan opsi A-D wajib diisi!`, 'warning');
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.style.borderColor = '#EF4444';
          return;
        }
        card.style.borderColor = '#E2E8F0';

        soal_list.push({
          pertanyaan,
          pilihan_a,
          pilihan_b,
          pilihan_c,
          pilihan_d,
          jawaban_benar
        });
      }

      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Menyimpan Paket Kuis...';
      }

      try {
        const res = await fetch('/api/guru/quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kategori,
            judul_kuis,
            soal_list
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          try { sessionStorage.removeItem('netora_quiz_cache'); } catch(e) {}
          tutupModalSoalGuru();
          await loadQuiz();
          loadStats();
          if (typeof toast === 'function') toast(data.message || `Kuis "${judul_kuis}" berhasil dibuat dengan ${soal_list.length} butir soal!`, 'success');
        } else {
          if (typeof toast === 'function') toast(data.error || 'Gagal menambahkan soal kuis.', 'error');
        }
      } catch (err) {
        if (typeof toast === 'function') toast('Terjadi kesalahan jaringan saat menyimpan soal.', 'error');
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          updateSoalCardsIndexGuru();
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

  // Hapus Soal Handler
  window.hapusSoalQuiz = async function(id) {
    const confirmed = typeof confirmDialog === 'function' ? await confirmDialog(`Apakah Bapak/Ibu Guru yakin ingin menghapus butir soal #${id}?`, {
      title: 'Hapus Soal Kuis',
      confirmText: 'Hapus Soal',
      cancelText: 'Batal',
      type: 'danger'
    }) : window.confirm(`Hapus butir soal #${id}?`);

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/guru/quiz/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        try { sessionStorage.removeItem('netora_quiz_cache'); } catch(e) {}
        if (typeof toast === 'function') toast(data.message || 'Soal kuis berhasil dihapus.', 'success');
        await loadQuiz();
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
