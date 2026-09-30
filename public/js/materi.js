window.initMateriPage = async function() {
  const materiContainer = document.getElementById('materi-container');
  const detailContainer = document.getElementById('materi-detail-container');
  if (!materiContainer && !detailContainer) return;

  getUser().then(user => updateNavHeader(user));
  const filterRow = document.getElementById('materi-filter-row');
  const btnSearch = document.getElementById('btn-search-materi');
  const searchBox = document.getElementById('search-materi-box');
  const inputSearch = document.getElementById('input-search-materi');

  let allMateri = [];
  let currentFilter = 'all';

  // Preset Icon Mapping (SVG)
  function getMateriIcon(kategori, judul) {
    const text = (kategori + ' ' + judul).toLowerCase();
    if (text.includes('cisco') || text.includes('packet tracer') || text.includes('switch') || text.includes('vlan')) {
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`;
    }
    if (text.includes('mikrotik') || text.includes('router') || text.includes('queue') || text.includes('bandwidth')) {
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;
    }
    if (text.includes('linux') || text.includes('server') || text.includes('nginx') || text.includes('ssh')) {
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>`;
    }
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
  }

  function renderMateriSkeleton() {
    if (!materiContainer) return;
    materiContainer.innerHTML = '<div class="desktop-grid-2col">' + [1, 2, 3, 4, 5, 6].map(() => `
      <div class="skeleton-item-card">
        <div class="skeleton-item-left">
          <div class="netora-skeleton skeleton-square-thumb"></div>
          <div class="skeleton-meta-col">
            <div class="netora-skeleton skeleton-line h-18 w-75"></div>
            <div class="netora-skeleton skeleton-line w-40"></div>
          </div>
        </div>
      </div>
    `).join('') + '</div>';
  }

  // 1. Halaman List Materi
  if (materiContainer) {
    async function loadMateri() {
      // Tampilkan skeleton shimmer terlebih dahulu di halaman tujuan
      renderMateriSkeleton();

      // Cek apakah ada cache
      try {
        const cached = sessionStorage.getItem('netora_materi_cache');
        if (cached) {
          allMateri = JSON.parse(cached);
          if (allMateri.length > 0) renderMateriCards();
        }
      } catch (e) {}

      try {
        const res = await fetch('/api/materi');
        const data = await res.json();

        if (res.ok && data.success && data.materi && data.materi.length > 0) {
          allMateri = data.materi;
          try { sessionStorage.setItem('netora_materi_cache', JSON.stringify(data.materi)); } catch (e) {}
          renderMateriCards();
        }
      } catch (err) {
        console.warn('Gagal memuat materi dari API:', err);
      }
    }

    function renderMateriCards() {
      const q = (inputSearch ? inputSearch.value : '').toLowerCase().trim();

      let list = allMateri.filter(m => {
        if (currentFilter !== 'all') {
          const cf = currentFilter.toLowerCase();
          const mk = (m.kategori || '').toLowerCase();
          if (mk !== cf && !mk.includes(cf) && !cf.includes(mk)) {
            return false;
          }
        }
        if (q && !m.judul.toLowerCase().includes(q) && !(m.kategori || '').toLowerCase().includes(q)) {
          return false;
        }
        return true;
      });

      if (list.length === 0) {
        materiContainer.innerHTML = '<div class="netora-fade-in" style="text-align:center; padding:30px; color:#64748B; font-size:13px;">Tidak ada modul yang sesuai filter.</div>';
        return;
      }

      materiContainer.innerHTML = '<div class="desktop-grid-2col netora-fade-in">' + list.map((item, idx) => {
        const icon = getMateriIcon(item.kategori || '', item.judul || '');
        const pagesText = item.pages || `${Math.max(6, (item.isi ? Math.round(item.isi.length / 250) : 8))} halaman`;

        return `
          <a href="materi-detail.html?id=${item.id}" class="white-item-card">
            <div class="item-left-flex">
              <div class="item-square-thumb" style="background:#0D5BFF; color:#fff; display:flex; align-items:center; justify-content:center;">
                ${icon}
              </div>
              <div class="item-meta-col">
                <h4 class="item-title-text">${escapeHtml(item.judul)}</h4>
                <div class="item-sub-text">
                  <span style="color:#0D5BFF; font-weight:700;">${escapeHtml(item.kategori || 'TKJ')}</span>
                  <span>•</span>
                  <span>${pagesText}</span>
                </div>
              </div>
            </div>
            <div class="item-chevron-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
          </a>
        `;
      }).join('') + '</div>';
    }

    // Filter Buttons
    if (filterRow) {
      filterRow.querySelectorAll('.filter-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          filterRow.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentFilter = btn.dataset.cat || 'all';
          renderMateriCards();
        });
      });
    }

    // Search Toggle
    if (btnSearch && searchBox) {
      btnSearch.addEventListener('click', () => {
        searchBox.style.display = searchBox.style.display === 'none' ? 'block' : 'none';
        if (searchBox.style.display === 'block' && inputSearch) inputSearch.focus();
      });
    }

    if (inputSearch) {
      inputSearch.addEventListener('input', renderMateriCards);
    }

    loadMateri();
  }

  // 2. Halaman Detail Materi (materi-detail.html)
  if (detailContainer) {
    const urlParams = new URLSearchParams(window.location.search);
    const materiId = urlParams.get('id');

    if (!materiId) {
      window.location.href = 'materi.html';
      return;
    }

    try {
      const res = await fetch(`/api/materi/${materiId}`);
      const data = await res.json();

      if (res.ok && data.success && data.materi) {
        const item = data.materi;
        detailContainer.innerHTML = `
          <div style="background:#FFFFFF; border-radius:22px; padding:24px 20px; margin:16px; box-shadow:0 4px 20px rgba(13,91,255,0.06); border:1px solid rgba(0,0,0,0.04);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
              <span style="font-size:11.5px; font-weight:800; color:#0D5BFF; background:rgba(13,91,255,0.08); padding:4px 12px; border-radius:20px;">
                ${escapeHtml(item.kategori || 'TKJ')}
              </span>
              <span style="font-size:11.5px; color:#64748B; display:inline-flex; align-items:center; gap:5px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                <span>${formatTanggal(item.created_at)}</span>
              </span>
            </div>

            <h2 style="margin:0 0 16px; font-size:20px; font-weight:800; color:#1E293B; line-height:1.35;">
              ${escapeHtml(item.judul)}
            </h2>

            <div style="height:3px; width:45px; background:#FF7A00; border-radius:3px; margin-bottom:18px;"></div>

            <div style="font-size:14.5px; line-height:1.75; color:#334155; white-space:pre-line;">
              ${escapeHtml(item.isi)}
            </div>

            <div style="margin-top:28px; padding-top:16px; border-top:1px solid #E2E8F0; text-align:center;">
              <a href="quiz.html" class="btn-hero-orange" style="display:inline-flex; align-items:center; justify-content:center; gap:8px; width:100%; border-radius:14px; padding:12px; text-decoration:none; box-sizing:border-box;">
                <span>Evaluasi Pemahaman di Kuis</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
              </a>
            </div>
          </div>
        `;
      } else {
        detailContainer.innerHTML = '<p style="color:#EF4444; text-align:center; padding:30px;">Materi tidak ditemukan.</p>';
      }
    } catch (err) {
      console.warn('Gagal memuat detail materi:', err);
      detailContainer.innerHTML = '<p style="color:#EF4444; text-align:center; padding:30px;">Terjadi kesalahan saat memuat materi.</p>';
    }
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.initMateriPage);
} else {
  window.initMateriPage();
}
