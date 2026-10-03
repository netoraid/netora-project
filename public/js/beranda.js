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
          : 'Portal Pembelajaran Teknik Komputer & Jaringan';
      }

      if (userStatus) {
        userStatus.textContent = u.role === 'admin'
          ? 'Administrator'
          : `Siswa: ${namaAwal}`;
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
    if (!user) {
      return;
    }
    applyUserToDom(user);
  } catch(e) {
    console.warn('getUser beranda err:', e);
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
