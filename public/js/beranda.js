// Beranda Page Logic (SPA Compatible)

window.initBerandaCarousel = function() {
  const track = document.getElementById('bannerTrack');
  const dots  = document.querySelectorAll('.banner-dot');
  if (!track || !dots.length || !track.children.length) return;

  // Clear previous intervals if any
  if (window._netoraBannerTimer) {
    clearInterval(window._netoraBannerTimer);
    window._netoraBannerTimer = null;
  }

  let current = 0;
  const total = track.children.length;
  let startX = 0;
  let isDragging = false;

  function goTo(idx) {
    current = (idx + total) % total;
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  function next() { goTo(current + 1); }

  function startAuto() {
    if (window._netoraBannerTimer) clearInterval(window._netoraBannerTimer);
    window._netoraBannerTimer = setInterval(next, 4000);
  }

  dots.forEach(dot => {
    dot.onclick = () => {
      goTo(parseInt(dot.dataset.idx || '0'));
      startAuto();
    };
  });

  track.ontouchstart = e => {
    if (!e.touches || !e.touches[0]) return;
    startX = e.touches[0].clientX;
    isDragging = true;
    if (window._netoraBannerTimer) clearInterval(window._netoraBannerTimer);
  };

  track.ontouchend = e => {
    if (!isDragging || !e.changedTouches || !e.changedTouches[0]) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) dx < 0 ? next() : goTo(current - 1);
    isDragging = false;
    startAuto();
  };

  startAuto();
};

window.initBerandaPage = async function() {
  // Inisialisasi Carousel langsung tanpa delay jaringan
  try {
    window.initBerandaCarousel();
  } catch(err) {
    console.warn('Carousel init warning:', err);
  }

  function applyUserToDom(u) {
    if (!u) return;
    try {
      if (typeof updateNavHeader === 'function') updateNavHeader(u);

      const greetingEl  = document.getElementById('user-greeting');
      const greetingSub = document.querySelector('.header-greeting-sub');
      const userStatus  = document.getElementById('user-status-text');

      const namaAwal = (u.nama || 'Siswa').trim().split(' ')[0] || 'Siswa';

      if (greetingEl) {
        greetingEl.textContent = `Selamat Datang, ${u.nama || 'Siswa Netora'}`;
      }

      if (greetingSub) {
        greetingSub.textContent = u.role === 'admin'
          ? 'Portal Administrator Netora'
          : (u.role === 'guru' ? 'Portal Guru Pembimbing TKJ' : 'Portal Pembelajaran Teknik Komputer & Jaringan');
      }

      if (userStatus) {
        userStatus.textContent = u.role === 'admin'
          ? 'Administrator'
          : (u.role === 'guru' ? 'Guru Pembimbing' : `Siswa: ${namaAwal}`);
      }

      const headerRight = document.querySelector('.beranda-header-right');
      if (headerRight) {
        if (u.role === 'admin') {
          headerRight.innerHTML = `
            <a href="admin.html" class="btn-primary" style="display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border-radius:12px; font-size:12px; font-weight:800; text-decoration:none; background:linear-gradient(135deg,#7C3AED,#6D28D9); color:#FFFFFF; box-shadow:0 4px 12px rgba(124,58,237,0.35);">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              <span>Panel Admin</span>
            </a>
          `;
        } else if (u.role === 'guru') {
          headerRight.innerHTML = `
            <a href="guru.html" class="btn-primary" style="display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border-radius:12px; font-size:12px; font-weight:800; text-decoration:none; background:linear-gradient(135deg,#D97706,#B45309); color:#FFFFFF; box-shadow:0 4px 12px rgba(217,119,6,0.35);">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              <span>Panel Guru</span>
            </a>
          `;
        } else {
          const safeName = typeof escapeHtml === 'function' ? escapeHtml(namaAwal) : namaAwal;
          headerRight.innerHTML = `
            <a href="profil.html" style="display:inline-flex; align-items:center; gap:6px; padding:6px 12px; border-radius:12px; font-size:12px; font-weight:700; text-decoration:none; background:rgba(255,255,255,0.15); color:#FFFFFF; border:1px solid rgba(255,255,255,0.25);">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span>${safeName}</span>
            </a>
          `;
        }
      }
    } catch(e) {
      console.warn('applyUserToDom err:', e);
    }
  }

  try {
    const cached = sessionStorage.getItem('netora_user_cache');
    if (cached) {
      applyUserToDom(JSON.parse(cached));
    }
  } catch (e) {}

  try {
    const user = typeof getUser === 'function' ? await getUser() : null;
    if (user) {
      applyUserToDom(user);
    }
  } catch(e) {
    console.warn('getUser beranda err:', e);
  }

  // Muat modul materi terbaru secara dinamis di Beranda
  window.loadMateriBeranda();
};

window.loadMateriBeranda = async function() {
  const container = document.getElementById('beranda-materi-list');
  if (!container) return;

  function getIcon(kat, jud) {
    const text = (kat + ' ' + jud).toLowerCase();
    if (text.includes('cisco') || text.includes('packet tracer') || text.includes('switch') || text.includes('vlan')) {
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`;
    }
    if (text.includes('mikrotik') || text.includes('router') || text.includes('queue') || text.includes('bandwidth')) {
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;
    }
    if (text.includes('linux') || text.includes('server') || text.includes('nginx') || text.includes('ssh')) {
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>`;
    }
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
  }

  try {
    const res = await fetch('/api/materi?t=' + Date.now());
    const data = await res.json();
    if (res.ok && data.success && Array.isArray(data.materi) && data.materi.length > 0) {
      const topList = data.materi.slice(0, 4);
      container.innerHTML = topList.map(item => {
        const icon = getIcon(item.kategori || '', item.judul || '');
        const pagesCount = item.total_halaman || (item.pages && Array.isArray(item.pages) ? item.pages.length : 1);
        const pagesText = item.pages_text || `${pagesCount} halaman`;
        return `
          <a href="materi-detail.html?id=${item.id}" class="white-item-card" style="margin-bottom:0; text-decoration:none;">
            <div class="item-left-flex">
              <div class="item-square-thumb" style="background:#0D5BFF; color:#fff; display:flex; align-items:center; justify-content:center; width:44px; height:44px; border-radius:12px;">
                ${icon}
              </div>
              <div class="item-meta-col">
                <h4 class="item-title-text" style="font-size:13.5px; font-weight:700; color:#0F172A; margin:0 0 3px;">${typeof escapeHtml === 'function' ? escapeHtml(item.judul) : item.judul}</h4>
                <div class="item-sub-text" style="font-size:11.5px;">
                  <span style="color:#0D5BFF; font-weight:700;">${typeof escapeHtml === 'function' ? escapeHtml(item.kategori || 'TKJ') : (item.kategori || 'TKJ')}</span>
                  <span>•</span>
                  <span>${pagesText}</span>
                </div>
              </div>
            </div>
            <div class="item-chevron-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
          </a>
        `;
      }).join('');
    } else {
      container.innerHTML = `
        <div style="text-align:center; padding:24px 16px; background:#FFFFFF; border-radius:16px; border:1px dashed #CBD5E1; color:#64748B;">
          <div style="font-size:24px; margin-bottom:4px;">📚</div>
          <div style="font-size:12.5px; font-weight:700; color:#334155;">Belum ada modul materi</div>
          <div style="font-size:11.5px; color:#94A3B8; margin-top:2px;">Modul yang dibuat Admin/Guru akan otomatis muncul di sini.</div>
        </div>
      `;
    }
  } catch (err) {
    console.warn('Gagal memuat materi beranda:', err);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('user-greeting') || document.getElementById('bannerTrack')) {
      window.initBerandaPage();
    }
  });
} else {
  if (document.getElementById('user-greeting') || document.getElementById('bannerTrack')) {
    window.initBerandaPage();
  }
}
