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
    function renderFilterPills() {
      if (!filterRow) return;
      const categories = ['all'];
      allMateri.forEach(m => {
        const k = (m.kategori || '').trim();
        if (k && !categories.some(c => c.toLowerCase() === k.toLowerCase())) {
          categories.push(k);
        }
      });

      filterRow.innerHTML = categories.map(cat => {
        const label = cat === 'all' ? 'Semua' : escapeHtml(cat);
        const isActive = (currentFilter.toLowerCase() === cat.toLowerCase()) ? 'active' : '';
        return `<button type="button" class="filter-pill ${isActive}" data-cat="${escapeHtml(cat)}">${label}</button>`;
      }).join('');

      filterRow.querySelectorAll('.filter-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          filterRow.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentFilter = btn.dataset.cat || 'all';
          renderMateriCards();
        });
      });
    }

    async function loadMateri(isSilent = false) {
      if (!isSilent && (!allMateri || allMateri.length === 0)) {
        renderMateriSkeleton();
      }

      // 1. Cek apakah ada cache di sessionStorage untuk render instan
      try {
        const cached = sessionStorage.getItem('netora_materi_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            allMateri = parsed;
            renderFilterPills();
            renderMateriCards();
          }
        }
      } catch (e) {}

      // 2. Selalu fetch data terkini dari server (Stale-While-Revalidate)
      try {
        const res = await fetch('/api/materi?t=' + Date.now());
        const data = await res.json();

        if (res.ok && data.success && Array.isArray(data.materi)) {
          allMateri = data.materi;
          try { sessionStorage.setItem('netora_materi_cache', JSON.stringify(data.materi)); } catch (e) {}
          renderFilterPills();
          renderMateriCards();
        }
      } catch (err) {
        console.warn('Gagal memuat materi dari API:', err);
      }
    }

    // Expose fungsi refresh untuk dipanggil saat ada update Socket.IO
    window.refreshMateriData = () => loadMateri(true);
    window.loadMateri = loadMateri;

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
        materiContainer.innerHTML = `
          <div class="netora-fade-in" style="text-align:center; padding:36px 20px; color:#64748B; font-size:13.5px;">
            <div style="font-size:32px; margin-bottom:8px;">📚</div>
            <strong style="color:#1E293B;">Belum ada modul materi</strong><br>
            <span style="font-size:12px; color:#94A3B8; margin-top:4px; display:inline-block;">Modul pembelajaran yang dibuat Guru / Admin akan otomatis muncul di sini.</span>
          </div>
        `;
        return;
      }

      materiContainer.innerHTML = '<div class="desktop-grid-2col netora-fade-in">' + list.map((item, idx) => {
        const icon = getMateriIcon(item.kategori || '', item.judul || '');
        const pagesCount = item.total_halaman || (item.pages && Array.isArray(item.pages) ? item.pages.length : (item.isi ? 1 : 1));
        const pagesText = item.pages_text || `${pagesCount} halaman`;

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
    const requestedPage = parseInt(urlParams.get('page')) || null;

    if (!materiId) {
      window.location.href = 'materi.html';
      return;
    }

    try {
      const res = await fetch(`/api/materi/${materiId}`);
      const data = await res.json();

      if (res.ok && data.success && data.materi) {
        const item = data.materi;
        const pages = (item.pages && Array.isArray(item.pages) && item.pages.length > 0)
          ? item.pages
          : [{ halaman: 1, judul: '', konten: item.isi || '' }];
        const totalPages = item.total_halaman || pages.length;
        const icon = getMateriIcon(item.kategori || '', item.judul || '');

        function renderDetailView(pageNumber) {
          if (pageNumber === null && totalPages > 1) {
            renderChapterListView();
          } else {
            const curPage = Math.max(1, Math.min(totalPages, pageNumber || 1));
            renderReaderView(curPage);
          }
        }

        function renderChapterListView() {
          detailContainer.innerHTML = `
            <div class="netora-fade-in" style="padding-bottom: 24px;">
              <!-- Header Overview Card -->
              <div style="background:#FFFFFF; border-radius:22px; padding:20px; margin:16px; box-shadow:0 4px 20px rgba(13,91,255,0.06); border:1px solid rgba(0,0,0,0.04);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                  <span style="font-size:11.5px; font-weight:800; color:#0D5BFF; background:rgba(13,91,255,0.08); padding:4px 12px; border-radius:20px;">
                    ${escapeHtml(item.kategori || 'TKJ')}
                  </span>
                  <span class="badge badge-blue" style="font-size:11.5px; padding:4px 12px; background:#EFF6FF; color:#0D5BFF; border:1px solid #BFDBFE; font-weight:800; border-radius:12px;">
                    ${totalPages} Halaman
                  </span>
                </div>

                <h2 style="margin:0 0 8px; font-size:22px; font-weight:800; color:#1E293B; line-height:1.3;">
                  ${escapeHtml(item.judul)}
                </h2>
                <p style="margin:0 0 16px; font-size:13px; color:#64748B; line-height:1.5;">
                  Pilih salah satu bab atau halaman di bawah ini untuk memulai belajar, atau tekan tombol Mulai Membaca.
                </p>

                <div style="display:flex; gap:10px;">
                  <button type="button" id="btn-mulai-baca" class="btn-primary" style="flex:1; padding:12px; font-size:13.5px; font-weight:700; border-radius:14px; display:inline-flex; align-items:center; justify-content:center; gap:8px; text-decoration:none; cursor:pointer;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    <span>Mulai Membaca (Halaman 1)</span>
                  </button>
                </div>
              </div>

              <!-- Daftar Halaman (Model Kartu Persis Sesuai Gambar User) -->
              <div style="margin: 0 16px 12px; display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0; font-size:15px; font-weight:800; color:#0F172A;">Daftar Bab & Halaman (${totalPages} Halaman)</h3>
                <span style="font-size:11.5px; color:#64748B; font-weight:600;">Klik untuk baca</span>
              </div>

              <div class="chapter-list-container" style="display:flex; flex-direction:column; gap:2px;">
                ${pages.map((p, idx) => {
                  const halNum = p.halaman || (idx + 1);
                  const displayTitle = p.judul && p.judul.trim() ? p.judul.trim() : `Halaman ${halNum}`;
                  return `
                    <div class="white-item-card btn-buka-halaman" data-hal="${halNum}" style="cursor:pointer; margin-bottom:10px;">
                      <div class="item-left-flex">
                        <div class="item-square-thumb" style="background:#0D5BFF; color:#fff; display:flex; align-items:center; justify-content:center;">
                          ${icon}
                        </div>
                        <div class="item-meta-col">
                          <h4 class="item-title-text" style="font-size:14.5px; font-weight:800; color:#0F172A; margin:0 0 3px;">
                            ${escapeHtml(displayTitle)}
                          </h4>
                          <div class="item-sub-text">
                            <span style="color:#0D5BFF; font-weight:700;">${escapeHtml(item.kategori || 'TKJ')}</span>
                            <span>•</span>
                            <span>Halaman ${halNum} dari ${totalPages}</span>
                          </div>
                        </div>
                      </div>
                      <div class="item-chevron-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;

          const btnMulaiBaca = document.getElementById('btn-mulai-baca');
          if (btnMulaiBaca) {
            btnMulaiBaca.addEventListener('click', () => {
              renderReaderView(1);
            });
          }

          detailContainer.querySelectorAll('.btn-buka-halaman').forEach(card => {
            card.addEventListener('click', () => {
              const hal = parseInt(card.dataset.hal) || 1;
              renderReaderView(hal);
            });
          });
        }

        function renderReaderView(activePage) {
          const newUrl = `${window.location.pathname}?id=${materiId}&page=${activePage}`;
          window.history.replaceState({ page: activePage }, '', newUrl);

          const currentPageData = pages[activePage - 1] || pages[0];
          const pageTitle = currentPageData.judul && currentPageData.judul.trim()
            ? currentPageData.judul.trim()
            : `Halaman ${activePage}`;

          detailContainer.innerHTML = `
            <div class="netora-fade-in" style="padding-bottom:28px;">
              
              <!-- Navigasi Atas Modul & Stepper -->
              <div style="margin:14px 16px 10px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                ${totalPages > 1 ? `
                  <button type="button" id="btn-back-to-chapters" style="background:#FFFFFF; border:1px solid #CBD5E1; color:#0D5BFF; font-size:12px; font-weight:700; padding:6px 14px; border-radius:12px; display:inline-flex; align-items:center; gap:6px; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.03);">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    <span>Daftar Halaman</span>
                  </button>
                ` : `<div></div>`}

                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="background:#EFF6FF; border:1px solid #BFDBFE; color:#0D5BFF; font-size:11.5px; font-weight:800; padding:4px 12px; border-radius:20px;">
                    Halaman ${activePage} dari ${totalPages}
                  </span>
                </div>
              </div>

              <!-- Main Reading Card -->
              <div style="background:#FFFFFF; border-radius:22px; padding:24px 20px; margin:0 16px 16px; box-shadow:0 4px 20px rgba(13,91,255,0.06); border:1px solid rgba(0,0,0,0.04);">
                
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:6px;">
                  <span style="font-size:11.5px; font-weight:800; color:#0D5BFF; background:rgba(13,91,255,0.08); padding:4px 12px; border-radius:20px;">
                    ${escapeHtml(item.kategori || 'TKJ')}
                  </span>
                  <span style="font-size:12px; color:#64748B; font-weight:600;">
                    ${escapeHtml(item.judul)}
                  </span>
                </div>

                <h2 style="margin:0 0 14px; font-size:20px; font-weight:800; color:#1E293B; line-height:1.35;">
                  ${escapeHtml(pageTitle)}
                </h2>

                <div style="height:3px; width:45px; background:#FF7A00; border-radius:3px; margin-bottom:18px;"></div>

                <div style="font-size:14.5px; line-height:1.8; color:#334155; white-space:pre-line;">
                  ${escapeHtml(currentPageData.konten || '')}
                </div>

                <!-- Navigasi Bawah Antar Halaman -->
                <div style="margin-top:30px; padding-top:18px; border-top:1.5px solid #F1F5F9;">
                  
                  <!-- Quick Page Indicator Pills (1, 2, 3.. 8) -->
                  ${totalPages > 1 ? `
                    <div style="margin-bottom:16px;">
                      <span style="display:block; font-size:11.5px; font-weight:700; color:#64748B; margin-bottom:8px; text-align:center;">Pilih Halaman Cepat:</span>
                      <div style="display:flex; justify-content:center; align-items:center; gap:6px; flex-wrap:wrap;">
                        ${pages.map((_, pIdx) => {
                          const num = pIdx + 1;
                          const isCur = num === activePage;
                          return `
                            <button type="button" class="btn-jump-page" data-page="${num}" style="width:34px; height:34px; border-radius:10px; font-size:12px; font-weight:800; border:1px solid ${isCur ? '#0D5BFF' : '#CBD5E1'}; background:${isCur ? '#0D5BFF' : '#FFFFFF'}; color:${isCur ? '#FFFFFF' : '#334155'}; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.15s; box-shadow:${isCur ? '0 3px 10px rgba(13,91,255,0.25)' : 'none'};">
                              ${num}
                            </button>
                          `;
                        }).join('')}
                      </div>
                    </div>
                  ` : ''}

                  <!-- Tombol Sebelumnya & Selanjutnya -->
                  <div style="display:flex; gap:10px; align-items:center;">
                    ${activePage > 1 ? `
                      <button type="button" id="btn-prev-page" class="btn-secondary" style="flex:1; padding:12px 14px; font-size:13px; font-weight:700; border-radius:14px; display:inline-flex; align-items:center; justify-content:center; gap:6px; cursor:pointer;">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        <span>Halaman Sebelumnya</span>
                      </button>
                    ` : ''}

                    ${activePage < totalPages ? `
                      <button type="button" id="btn-next-page" class="btn-primary" style="flex:1; padding:12px 14px; font-size:13px; font-weight:700; border-radius:14px; display:inline-flex; align-items:center; justify-content:center; gap:6px; cursor:pointer;">
                        <span>Halaman Berikutnya</span>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                      </button>
                    ` : `
                      <a href="quiz.html" class="btn-hero-orange" style="flex:1; padding:12px 14px; font-size:13px; font-weight:800; border-radius:14px; display:inline-flex; align-items:center; justify-content:center; gap:8px; text-decoration:none;">
                        <span>🎉 Selesai! Evaluasi di Kuis</span>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
                      </a>
                    `}
                  </div>

                </div>

              </div>
            </div>
          `;

          const btnBackChapters = document.getElementById('btn-back-to-chapters');
          if (btnBackChapters) {
            btnBackChapters.addEventListener('click', () => {
              const newUrl = `${window.location.pathname}?id=${materiId}`;
              window.history.replaceState({}, '', newUrl);
              renderChapterListView();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            });
          }

          const btnPrev = document.getElementById('btn-prev-page');
          if (btnPrev) {
            btnPrev.addEventListener('click', () => {
              renderReaderView(activePage - 1);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            });
          }

          const btnNext = document.getElementById('btn-next-page');
          if (btnNext) {
            btnNext.addEventListener('click', () => {
              renderReaderView(activePage + 1);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            });
          }

          detailContainer.querySelectorAll('.btn-jump-page').forEach(btn => {
            btn.addEventListener('click', () => {
              const targetPage = parseInt(btn.dataset.page);
              renderReaderView(targetPage);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            });
          });
        }

        renderDetailView(requestedPage);
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
