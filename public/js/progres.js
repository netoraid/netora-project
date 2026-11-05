window.initProgresPage = function() {
  const greetingEl = document.getElementById('progress-user-greeting');
  const userRoleBadge = document.getElementById('progress-role-badge');
  const statHighestEl = document.getElementById('stat-highest-score');
  const statAverageEl = document.getElementById('stat-average-score');
  const statCompletedEl = document.getElementById('stat-completed-quiz');
  const historyContainer = document.getElementById('quiz-history-container');
  if (!greetingEl && !historyContainer && !statHighestEl) return;

  if (typeof getUser === 'function') {
    getUser().then(user => {
      if (typeof updateNavHeader === 'function') updateNavHeader(user);
      if (greetingEl) {
        greetingEl.textContent = user ? `Halo, ${user.nama || 'Siswa'}` : 'Halo, Siswa TKJ';
      }
      if (userRoleBadge && user) {
        const namaAwal = (user.nama || 'Siswa').trim().split(' ')[0] || 'Siswa';
        userRoleBadge.textContent = user.role === 'admin' ? 'Administrator' : `Siswa: ${namaAwal}`;
      }
    }).catch(() => {});
  }

  function updateSkillBar(key, pct) {
    const safePct = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)));
    const textEl = document.getElementById(`skill-pct-${key}`);
    const barEl = document.getElementById(`skill-bar-${key}`);
    if (textEl) textEl.textContent = `${safePct}%`;
    if (barEl) barEl.style.width = `${safePct}%`;
  }

  function renderHistoryCard(item) {
    const score = Number(item.skor) || 0;
    const isPass = score >= 70;
    const badgeBg = isPass ? '#22C55E' : '#EF4444';
    const badgeText = isPass ? 'Lulus' : 'Remidi';
    let tanggal = 'Sesi Latihan';
    if (item.tanggal) {
      try {
        tanggal = new Date(item.tanggal).toLocaleDateString('id-ID', {
          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
      } catch(e) {}
    }

    const iconSvg = isPass
      ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>`
      : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;

    return `
      <div class="white-item-card" style="margin-bottom:10px;">
        <div class="item-left-flex">
          <div class="item-square-thumb" style="background:${isPass ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)'}; color:${badgeBg}; display:flex; align-items:center; justify-content:center;">
            ${iconSvg}
          </div>
          <div class="item-meta-col">
            <h4 class="item-title-text">Latihan Kuis TKJ</h4>
            <div class="item-sub-text">
              <span>${tanggal}</span>
              <span>•</span>
              <span style="color:${badgeBg}; font-weight:700;">${badgeText}</span>
            </div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:18px; font-weight:900; color:#0D5BFF;">${score}<span style="font-size:12px; color:#94A3B8;">/100</span></div>
        </div>
      </div>
    `;
  }

  function renderStatsAndHistory(riwayat) {
    if (Array.isArray(riwayat) && riwayat.length > 0) {
      const scores = riwayat.map(r => Number(r.skor) || 0);
      const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

      if (statHighestEl) statHighestEl.textContent = String(maxScore);
      if (statAverageEl) statAverageEl.textContent = `${avgScore}%`;
      if (statCompletedEl) statCompletedEl.textContent = `${riwayat.length} Sesi`;

      const sum = scores.reduce((a, b) => a + b, 0);
      const lulusCount = scores.filter(s => s >= 70).length;
      const lulusRate = Math.round((lulusCount / scores.length) * 100);
      // Indeks ketuntasan terpadu (50% frekuensi ujian + 50% kualitas rata-rata skor)
      const progressOverall = Math.min(100, Math.max(10, Math.round((Math.min(scores.length, 5) / 5) * 50 + (avgScore / 100) * 50)));

      // Update tingkat penguasaan kompetensi murni dari performa kuis di database
      updateSkillBar('mikrotik', avgScore);
      updateSkillBar('subnet', maxScore);
      updateSkillBar('firewall', lulusRate);
      updateSkillBar('linux', progressOverall);

      if (historyContainer) {
        if (riwayat.length === 1) {
          historyContainer.innerHTML = `
            <div class="netora-fade-in history-single-wrap" style="max-width:720px; margin:0 auto; width:100%; box-sizing:border-box;">
              ${renderHistoryCard(riwayat[0])}
            </div>
          `;
        } else {
          historyContainer.innerHTML = '<div class="desktop-grid-2col netora-fade-in">' + riwayat.map(renderHistoryCard).join('') + '</div>';
        }
      }
    } else {
      // Default / Siswa Baru Belum Mengerjakan Kuis (0% data murni)
      if (statHighestEl) statHighestEl.textContent = '0';
      if (statAverageEl) statAverageEl.textContent = '0%';
      if (statCompletedEl) statCompletedEl.textContent = '0 Sesi';

      updateSkillBar('mikrotik', 0);
      updateSkillBar('subnet', 0);
      updateSkillBar('firewall', 0);
      updateSkillBar('linux', 0);

      if (historyContainer) {
        historyContainer.innerHTML = `
          <div class="netora-fade-in history-empty-card" style="background:#FFFFFF; border-radius:20px; padding:32px 24px; text-align:center; box-shadow:0 4px 18px rgba(13,91,255,0.05); border:1.5px solid #E2E8F0; max-width:540px; margin:20px auto; box-sizing:border-box;">
            <div style="width:42px; height:42px; border-radius:12px; background:rgba(13,91,255,0.08); color:#0D5BFF; display:inline-flex; align-items:center; justify-content:center; margin:0 auto 12px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            </div>
            <h4 style="margin:0 0 6px; font-size:15.5px; font-weight:800; color:#1E293B;">Belum Ada Riwayat Kuis</h4>
            <p style="margin:0 0 16px; font-size:12.5px; color:#64748B;">Kerjakan kuis pertama Anda untuk mulai mencatat rekor nilai dan kemajuan belajar.</p>
            <a href="quiz.html" class="btn-hero-orange" style="display:inline-flex; align-items:center; gap:8px; width:auto; padding:10px 22px; font-size:13px; border-radius:20px; text-decoration:none;">
              <span>Mulai Kuis Sekarang</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </a>
          </div>
        `;
      }
    }
  }

  // 1. Render awal instan 0ms (Mencegah skeleton stuck)
  let initialRendered = false;
  try {
    const cachedRiwayat = sessionStorage.getItem('netora_riwayat_cache');
    if (cachedRiwayat) {
      const parsed = JSON.parse(cachedRiwayat);
      if (Array.isArray(parsed)) {
        renderStatsAndHistory(parsed);
        initialRendered = true;
      }
    }
  } catch(e) {}

  if (!initialRendered) {
    renderStatsAndHistory([]);
  }

  // Load progress and history from backend
  async function loadProgressData() {
    let riwayatList = [];

    try {
      const res = await fetch('/api/profil');
      const data = await res.json();
      if (res.ok && data && data.success && Array.isArray(data.riwayat)) {
        riwayatList = data.riwayat;
      }
    } catch (err) {
      console.warn('Gagal memuat profil/riwayat:', err);
    }

    if (riwayatList.length === 0) {
      try {
        const resQuiz = await fetch('/api/quiz/riwayat');
        const dataQuiz = await resQuiz.json();
        if (resQuiz.ok && dataQuiz && dataQuiz.success && Array.isArray(dataQuiz.riwayat)) {
          riwayatList = dataQuiz.riwayat;
        }
      } catch (e) {
        console.warn('Gagal memuat quiz/riwayat:', e);
      }
    }

    try {
      sessionStorage.setItem('netora_riwayat_cache', JSON.stringify(riwayatList));
    } catch(e) {}

    renderStatsAndHistory(riwayatList);
  }

  loadProgressData();

  // Muat ringkasan KPI Overview Pembelajaran TKJ
  if (document.getElementById('stat-total-siswa')) {
    fetch('/api/overview-stats?t=' + Date.now())
      .then(res => res.json())
      .then(data => {
        if (!data || !data.success || !data.stats) return;
        const s = data.stats;
        const setTxt = (id, val) => {
          const target = document.getElementById(id);
          if (target) target.textContent = val;
        };
        setTxt('stat-total-siswa', s.totalSiswa ?? 0);
        setTxt('stat-total-kuis', s.totalKuis ?? 0);
        setTxt('stat-avg-skor', s.avgSkor ?? 0);
        setTxt('stat-persen-lulus', (s.persenLulus ?? 0) + '%');
        setTxt('stat-lulus-count', s.lulusCount ?? 0);
        setTxt('stat-remidi-count', s.remidiCount ?? 0);
        setTxt('stat-total-materi', s.totalMateri ?? 0);
        setTxt('stat-total-video', s.totalVideo ?? 0);
      })
      .catch(err => console.warn('Gagal memuat overview-stats:', err));
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('stat-highest-score') || document.getElementById('quiz-history-container')) {
      window.initProgresPage();
    }
  });
} else {
  if (document.getElementById('stat-highest-score') || document.getElementById('quiz-history-container')) {
    window.initProgresPage();
  }
}
