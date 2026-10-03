// Shared Helper Functions Netora v2

// 1. Efek Ripple + Glow
function pressGlow(el, e) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  const size = Math.max(rect.width, rect.height);
  const x = ((e && e.clientX) ? e.clientX : rect.left + rect.width / 2) - rect.left - size / 2;
  const y = ((e && e.clientY) ? e.clientY : rect.top + rect.height / 2) - rect.top - size / 2;
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  el.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());

  el.classList.remove('is-pressed');
  void el.offsetWidth;
  el.classList.add('is-pressed');
}

// 2. Ambil data user aktif dengan Smart Cache (0ms load saat berpindah halaman)
let _netoraUserCache = null;
let _netoraUserPromise = null;

async function getUser(forceRefresh = false) {
  if (!forceRefresh) {
    if (_netoraUserCache) return _netoraUserCache;
    try {
      const stored = sessionStorage.getItem('netora_user_cache');
      if (stored) {
        _netoraUserCache = JSON.parse(stored);
        refreshUserSilently();
        return _netoraUserCache;
      }
    } catch (e) {}
  }

  if (_netoraUserPromise) return _netoraUserPromise;

  _netoraUserPromise = (async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        _netoraUserCache = data.user;
        try {
          sessionStorage.setItem('netora_user_cache', JSON.stringify(data.user));
        } catch (e) {}
        return data.user;
      }
      _netoraUserCache = null;
      try {
        sessionStorage.removeItem('netora_user_cache');
      } catch (e) {}
      return null;
    } catch (err) {
      return null;
    } finally {
      _netoraUserPromise = null;
    }
  })();

  return _netoraUserPromise;
}

function refreshUserSilently() {
  fetch('/api/auth/me')
    .then(res => res.json())
    .then(data => {
      if (data && data.success && data.user) {
        _netoraUserCache = data.user;
        try {
          sessionStorage.setItem('netora_user_cache', JSON.stringify(data.user));
        } catch (e) {}
        updateNavHeader(data.user);
      }
    })
    .catch(() => {});
}

// 3. Update tombol Akun/Masuk di header & bottom navbar secara dinamis
function updateNavHeader(user) {
  const accountBtn = document.querySelector('.account-btn');
  if (accountBtn) {
    if (user) {
      accountBtn.href = 'profil.html';
      accountBtn.innerHTML = `
        <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-6.5 8-6.5S20 16 20 20"/></svg>
        <span>Akun</span>
      `;
      accountBtn.classList.remove('login-btn');
    } else {
      accountBtn.href = 'login.html';
      accountBtn.innerHTML = `
        <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
        <span>Masuk</span>
      `;
      accountBtn.classList.add('login-btn');
    }
  }

  // Sinkronisasi Tab Logout / Masuk di Bottom Navbar
  const logoutTab = document.querySelector('.nav-tab-logout');
  if (logoutTab) {
    if (user) {
      logoutTab.innerHTML = `
        <div class="nav-tab-icon icon-logout">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 3h6a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0V5H6v14h4v-1a1 1 0 0 1 2 0v2a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M14.293 8.293a1 1 0 0 1 1.414 0l4 4a1 1 0 0 1 0 1.414l-4 4a1 1 0 0 1-1.414-1.414L16.586 14H9a1 1 0 0 1 0-2h7.586l-2.293-2.293a1 1 0 0 1 0-1.414z"/></svg>
        </div>
        <span class="nav-tab-label">Logout</span>
      `;
      logoutTab.onclick = () => logout();
      logoutTab.title = 'Keluar Akun';
    } else {
      logoutTab.innerHTML = `
        <div class="nav-tab-icon" style="color: var(--cyan);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
        </div>
        <span class="nav-tab-label" style="color: var(--cyan);">Masuk</span>
      `;
      logoutTab.onclick = () => { window.location.href = 'login.html'; };
      logoutTab.title = 'Masuk Akun';
    }
  }

  // Sinkronisasi Tab Profil jika belum login
  const profilTab = document.querySelector('.app-bottom-nav a[href="profil.html"]');
  if (profilTab && !user) {
    profilTab.href = 'login.html';
    profilTab.title = 'Masuk untuk Akses Profil';
  }
}

// 4. Cek Autentikasi Khusus Halaman Terproteksi (Profil, dsb)
async function requireLogin() {
  let user = null;
  try {
    const stored = sessionStorage.getItem('netora_user_cache');
    if (stored) user = JSON.parse(stored);
  } catch (e) {}

  if (user) {
    fetch('/api/auth/me').then(res => {
      if (res.status === 401) {
        try { sessionStorage.removeItem('netora_user_cache'); } catch (e) {}
        window.location.href = '/login.html';
      }
    }).catch(() => {});
    return user;
  }

  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (!res.ok || !data.success || !data.user) {
      window.location.href = '/login.html';
      return null;
    }
    _netoraUserCache = data.user;
    try { sessionStorage.setItem('netora_user_cache', JSON.stringify(data.user)); } catch (e) {}
    return data.user;
  } catch (err) {
    window.location.href = '/login.html';
    return null;
  }
}

// 3. In-App Modern Confirmation Modal (Pengganti Native confirm() Browser)
function confirmDialog(message, options = {}) {
  return new Promise((resolve) => {
    const existing = document.getElementById('netora-confirm-overlay');
    if (existing) existing.remove();

    const title = options.title || 'Konfirmasi Tindakan';
    const confirmText = options.confirmText || 'Ya, Lanjutkan';
    const cancelText = options.cancelText || 'Batal';
    const type = options.type || 'danger'; // 'danger' | 'warning' | 'info' | 'primary'

    let iconSvg = '';
    let iconBg = '';
    let iconColor = '';
    let btnStyle = '';

    if (type === 'danger') {
      iconBg = 'rgba(239, 68, 68, 0.12)';
      iconColor = '#EF4444';
      btnStyle = 'background: linear-gradient(135deg, #EF4444, #DC2626); color: #FFFFFF; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.35);';
      iconSvg = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`;
    } else if (type === 'warning') {
      iconBg = 'rgba(245, 158, 11, 0.12)';
      iconColor = '#F59E0B';
      btnStyle = 'background: linear-gradient(135deg, #F59E0B, #D97706); color: #FFFFFF; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);';
      iconSvg = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    } else {
      iconBg = 'rgba(13, 91, 255, 0.12)';
      iconColor = '#0D5BFF';
      btnStyle = 'background: linear-gradient(135deg, #0D5BFF, #0040C1); color: #FFFFFF; box-shadow: 0 4px 14px rgba(13, 91, 255, 0.35);';
      iconSvg = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    const overlay = document.createElement('div');
    overlay.id = 'netora-confirm-overlay';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 1000000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: netoraFadeIn 0.2s ease forwards;
    `;

    overlay.innerHTML = `
      <div style="background:#FFFFFF; border-radius:24px; padding:28px 24px; max-width:390px; width:100%; box-shadow:0 25px 60px rgba(0,0,0,0.22); text-align:center; border:1px solid rgba(0,0,0,0.06); animation:netoraScaleIn 0.25s cubic-bezier(0.16,1,0.3,1) forwards;">
        <div style="width:58px; height:58px; border-radius:18px; background:${iconBg}; color:${iconColor}; display:inline-flex; align-items:center; justify-content:center; margin-bottom:14px;">
          ${iconSvg}
        </div>
        <h3 style="margin:0 0 8px; font-size:18px; font-weight:800; color:#0F172A; line-height:1.35;">${escapeHtml(title)}</h3>
        <p style="margin:0 0 24px; font-size:13.5px; color:#64748B; line-height:1.5;">${escapeHtml(message)}</p>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <button type="button" id="netora-confirm-cancel-btn" style="background:#F1F5F9; color:#475569; font-weight:700; border-radius:12px; padding:11px 16px; border:none; cursor:pointer; font-size:13.5px; transition:all 0.2s;">
            ${escapeHtml(cancelText)}
          </button>
          <button type="button" id="netora-confirm-ok-btn" style="${btnStyle} font-weight:700; border-radius:12px; padding:11px 16px; border:none; cursor:pointer; font-size:13.5px; transition:all 0.2s;">
            ${escapeHtml(confirmText)}
          </button>
        </div>
      </div>
    `;

    function close(result) {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.18s ease';
      setTimeout(() => {
        if (overlay.parentNode) overlay.remove();
        resolve(result);
      }, 180);
    }

    overlay.querySelector('#netora-confirm-cancel-btn').addEventListener('click', () => close(false));
    overlay.querySelector('#netora-confirm-ok-btn').addEventListener('click', () => close(true));

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(false);
    });

    document.body.appendChild(overlay);
  });
}

// 3. Logout Handler
async function logout() {
  const confirmed = await confirmDialog('Apakah Anda yakin ingin keluar dari Netora?', {
    title: 'Konfirmasi Keluar',
    confirmText: 'Ya, Keluar',
    cancelText: 'Batal',
    type: 'danger'
  });
  if (!confirmed) return;

  _netoraUserCache = null;
  try {
    sessionStorage.clear();
  } catch (e) {}

  try {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      window.location.href = '/login.html';
    } else {
      toast(data.error || 'Gagal logout', 'error');
    }
  } catch (err) {
    toast('Terjadi kesalahan jaringan', 'error');
  }
}

// 4. Toast Notification Manager Universal & Non-Intrusif
function toast(msg, type = 'info', duration = 2200) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  // Batasi maksimal 3 toast bersamaan agar layar tetap rapi dan tidak mengganggu
  const activeToasts = container.querySelectorAll('.toast');
  if (activeToasts.length >= 3) {
    activeToasts[0].remove();
  }

  const item = document.createElement('div');
  item.className = `toast ${type}`;

  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  } else if (type === 'error') {
    iconSvg = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
  } else if (type === 'warning') {
    iconSvg = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
  } else {
    iconSvg = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
  }

  item.innerHTML = `
    <div class="toast-content-wrapper">
      <div class="toast-icon-box">
        ${iconSvg}
      </div>
      <div class="toast-msg-text">${escapeHtml(msg)}</div>
    </div>
    <button type="button" class="toast-btn-close" aria-label="Tutup" title="Tutup">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
  `;

  function dismiss() {
    if (item.classList.contains('toast-exit')) return;
    item.classList.add('toast-exit');
    setTimeout(() => {
      if (item.parentNode) item.remove();
    }, 220);
  }

  // Dismiss saat klik tombol silang atau area toast
  const closeBtn = item.querySelector('.toast-btn-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dismiss();
    });
  }
  item.addEventListener('click', dismiss);

  container.appendChild(item);

  // Auto dismiss dalam durasi cepat (~2.2 detik) agar tidak menghalangi aktivitas user
  setTimeout(dismiss, duration);
}

// Otomatis arahkan window.alert bawaan browser ke sistem toast modern Netora
if (typeof window !== 'undefined') {
  window.alert = function(msg) {
    const str = String(msg || '');
    const isError = /gagal|error|salah|peringatan|ditolak|tidak sesuai/i.test(str);
    const isSuccess = /berhasil|sukses|saved|selesai|disalin/i.test(str);
    toast(str, isSuccess ? 'success' : (isError ? 'error' : 'info'));
  };

  // Salin teks ke Clipboard universal (didukung HTTP, HTTPS, Webview, & fallback)
  window.copyText = function(text, successMsg) {
    if (!text || text === '-' || text === '••••••••') return;
    const cleanText = String(text).trim();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(cleanText)
        .then(() => {
          toast(successMsg || 'Teks berhasil disalin!', 'success');
        })
        .catch(() => {
          fallbackCopyText(cleanText, successMsg);
        });
    } else {
      fallbackCopyText(cleanText, successMsg);
    }
  };

  function fallbackCopyText(text, successMsg) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) {
        toast(successMsg || 'Teks berhasil disalin!', 'success');
      } else {
        toast('Gagal menyalin teks.', 'error');
      }
    } catch (e) {
      toast('Gagal menyalin teks.', 'error');
    }
  }
}

// 5. Format Tanggal Bahasa Indonesia
function formatTanggal(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

// 6. Escape HTML (Mencegah XSS)
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 7. Sinkronisasi Badge Dot Merah Notifikasi (Muncul jika ada notifikasi baru, hilang jika sudah dibaca)
let _lastNotifSyncTime = 0;
async function syncNotificationBadge() {
  const now = Date.now();
  const isCurrentPengumumanPage = window.location.pathname.endsWith('pengumuman.html') || window.location.href.includes('pengumuman.html');

  if (!isCurrentPengumumanPage && (now - _lastNotifSyncTime < 25000)) {
    const cachedHasUnread = sessionStorage.getItem('netora_notif_has_unread');
    if (cachedHasUnread === '1') showAllNotifDots();
    else if (cachedHasUnread === '0') hideAllNotifDots();
    return;
  }
  _lastNotifSyncTime = now;

  try {
    const res = await fetch('/api/pengumuman');
    const data = await res.json();

    if (res.ok && data.success && data.pengumuman && data.pengumuman.length > 0) {
      const latestId = Math.max(...data.pengumuman.map(item => Number(item.id) || 0));
      const lastReadId = Number(localStorage.getItem('netora_last_read_notif_id') || 0);

      if (isCurrentPengumumanPage) {
        localStorage.setItem('netora_last_read_notif_id', String(latestId));
        sessionStorage.setItem('netora_notif_has_unread', '0');
        hideAllNotifDots();
      } else if (latestId > lastReadId) {
        sessionStorage.setItem('netora_notif_has_unread', '1');
        showAllNotifDots();
      } else {
        sessionStorage.setItem('netora_notif_has_unread', '0');
        hideAllNotifDots();
      }
    } else {
      sessionStorage.setItem('netora_notif_has_unread', '0');
      hideAllNotifDots();
    }
  } catch (err) {}
}

function showAllNotifDots() {
  // Mobile bottom bar dots
  document.querySelectorAll('.nav-notif-dot').forEach(d => { d.style.display = 'inline-block'; });

  // Desktop top nav links
  document.querySelectorAll('.desktop-top-nav-links a[href="pengumuman.html"]').forEach(link => {
    let dot = link.querySelector('.desktop-notif-dot');
    if (!dot) {
      dot = document.createElement('span');
      dot.className = 'desktop-notif-dot';
      link.appendChild(dot);
    }
    dot.style.display = 'inline-block';
  });
}

function hideAllNotifDots() {
  document.querySelectorAll('.nav-notif-dot, .desktop-notif-dot').forEach(d => {
    d.style.display = 'none';
  });
}

// Auto-attach pressGlow & syncNotificationBadge pada saat halaman siap
document.addEventListener('DOMContentLoaded', () => {
  document.body.addEventListener('click', (e) => {
    const target = e.target.closest('.menu-card, .account-btn, .nav-item, .btn-primary, .btn-secondary, .btn-back, .option-card');
    if (target) {
      pressGlow(target, e);
    }
  });

  // Jalankan sinkronisasi badge notifikasi di seluruh halaman
  syncNotificationBadge();
});

// ==========================================================================
// NETORA ULTRA-SMOOTH DIRECTIONAL TRANSITIONS ENGINE (STABIL & KONSISTEN 100%)
// ==========================================================================
(function initNetoraSeamlessNavigation() {
  const PAGE_ORDER = [
    'beranda.html',     // 0
    'materi.html',      // 1
    'video.html',       // 2
    'quiz.html',        // 3
    'kalkulator.html',  // 4
    'progres.html',     // 5
    'pengumuman.html',  // 6
    'profil.html',      // 7
    'tentang.html'      // 8
  ];

  function getCleanPath(urlStr) {
    try {
      const u = new URL(urlStr, window.location.origin);
      const filename = u.pathname.split('/').pop() || 'beranda.html';
      return filename === '' ? 'beranda.html' : filename;
    } catch {
      return 'beranda.html';
    }
  }

  // 1. Script Loader Dinamis jika script halaman belum termuat
  function loadScriptOnce(src, cb) {
    const cleanSrc = src.split('?')[0];
    const existing = Array.from(document.querySelectorAll('script')).find(s => s.src && s.src.includes(cleanSrc));
    if (existing) {
      if (cb) {
        try { cb(); } catch(e) { console.warn('Script cb error:', e); }
      }
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => {
      if (cb) {
        try { cb(); } catch(e) { console.warn('Script onload cb error:', e); }
      }
    };
    s.onerror = (e) => {
      console.warn('Gagal memuat script:', src, e);
      if (cb) {
        try { cb(); } catch(err) {}
      }
    };
    document.body.appendChild(s);
  }

  // 2. Dispatcher Inisialisasi Halaman Baru
  function triggerPageLifecycle(cleanPath) {
    try {
      getUser().then(u => updateNavHeader(u)).catch(() => {});
    } catch(e) {}

    const path = cleanPath.toLowerCase();

    try {
      if (path === 'beranda.html' || path === '') {
        if (window.initBerandaPage) {
          try { window.initBerandaPage(); } catch(e) { console.warn('initBerandaPage err:', e); }
        } else {
          loadScriptOnce('js/beranda.js', () => {
            try { window.initBerandaPage && window.initBerandaPage(); } catch(e) { console.warn('initBerandaPage err:', e); }
          });
        }
      } else if (path === 'pengumuman.html') {
        if (window.initPengumumanPage) {
          try { window.initPengumumanPage(); } catch(e) { console.warn('initPengumumanPage err:', e); }
        } else {
          loadScriptOnce('js/pengumuman.js', () => {
            try { window.initPengumumanPage && window.initPengumumanPage(); } catch(e) { console.warn('initPengumumanPage err:', e); }
          });
        }
      } else if (path === 'materi.html') {
        if (window.initMateriPage) {
          try { window.initMateriPage(); } catch(e) { console.warn('initMateriPage err:', e); }
        } else {
          loadScriptOnce('js/materi.js', () => {
            try { window.initMateriPage && window.initMateriPage(); } catch(e) { console.warn('initMateriPage err:', e); }
          });
        }
      } else if (path === 'materi-detail.html') {
        if (window.initMateriPage) {
          try { window.initMateriPage(); } catch(e) { console.warn('initMateriPage err:', e); }
        } else {
          loadScriptOnce('js/materi.js', () => {
            try { window.initMateriPage && window.initMateriPage(); } catch(e) { console.warn('initMateriPage err:', e); }
          });
        }
      } else if (path === 'video.html') {
        if (window.initVideoPage) {
          try { window.initVideoPage(); } catch(e) { console.warn('initVideoPage err:', e); }
        } else {
          loadScriptOnce('js/video.js', () => {
            try { window.initVideoPage && window.initVideoPage(); } catch(e) { console.warn('initVideoPage err:', e); }
          });
        }
      } else if (path === 'quiz.html') {
        if (window.initQuizPage) {
          try { window.initQuizPage(); } catch(e) { console.warn('initQuizPage err:', e); }
        } else {
          loadScriptOnce('js/quiz.js', () => {
            try { window.initQuizPage && window.initQuizPage(); } catch(e) { console.warn('initQuizPage err:', e); }
          });
        }
      } else if (path === 'progres.html') {
        if (window.initProgresPage) {
          try { window.initProgresPage(); } catch(e) { console.warn('initProgresPage err:', e); }
        } else {
          loadScriptOnce('js/progres.js', () => {
            try { window.initProgresPage && window.initProgresPage(); } catch(e) { console.warn('initProgresPage err:', e); }
          });
        }
      } else if (path === 'profil.html') {
        if (window.initProfilPage) {
          try { window.initProfilPage(); } catch(e) { console.warn('initProfilPage err:', e); }
        } else {
          loadScriptOnce('js/profil.js', () => {
            try { window.initProfilPage && window.initProfilPage(); } catch(e) { console.warn('initProfilPage err:', e); }
          });
        }
      } else if (path === 'kalkulator.html') {
        if (window.initKalkulatorPage) {
          try { window.initKalkulatorPage(); } catch(e) { console.warn('initKalkulatorPage err:', e); }
        } else {
          loadScriptOnce('js/kalkulator.js', () => {
            try { window.initKalkulatorPage && window.initKalkulatorPage(); } catch(e) { console.warn('initKalkulatorPage err:', e); }
          });
        }
      }
    } catch (lifecycleErr) {
      console.error('Lifecycle dispatch error:', lifecycleErr);
    }
  }

  // 3. Smart HTML Cache & Prefetching untuk Perpindahan 0ms Instan Tanpa Patah-Patah
  const _htmlPageCache = new Map();

  async function fetchPageHtml(url) {
    const clean = getCleanPath(url);
    if (_htmlPageCache.has(clean)) {
      return _htmlPageCache.get(clean);
    }
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Fetch status ' + res.status);
      const htmlText = await res.text();
      _htmlPageCache.set(clean, htmlText);
      return htmlText;
    } catch (e) {
      return null;
    }
  }

  // Prefetch halaman siswa langsung tanpa jeda (0ms network delay)
  ['beranda.html', 'pengumuman.html', 'materi.html', 'video.html', 'quiz.html', 'progres.html', 'profil.html', 'kalkulator.html'].forEach(p => {
    fetchPageHtml(p);
  });

  // 4. Update Tab Aktif Secara Visual
  function updateActiveTabs(cleanPath) {
    document.querySelectorAll('.app-bottom-nav-white, .app-bottom-nav, .desktop-top-nav-links, .desktop-nav-tabs').forEach(nav => {
      nav.querySelectorAll('.nav-tab-item, .desktop-nav-link, .nav-tab').forEach(item => {
        const href = item.getAttribute('href');
        if (href && getCleanPath(href) === cleanPath) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
    });
  }

  // 5. Seamless Native-Grade Navigation (Bebas Patah-Patah, Native 60fps Transition)
  let _isNavigating = false;

  async function seamlessNavigateTo(targetUrl, isPopState = false) {
    const curPath = getCleanPath(window.location.href);
    const targetPath = getCleanPath(targetUrl);

    // Halaman panel admin, guru, atau autentikasi menggunakan navigasi browser penuh
    if (targetPath.includes('admin') || targetPath.includes('guru') || targetPath.includes('login') || targetPath.includes('register')) {
      window.location.href = targetUrl;
      return;
    }

    if (curPath === targetPath && !isPopState) {
      window.scrollTo(0, 0);
      return;
    }

    if (_isNavigating) return;
    _isNavigating = true;

    try {
      // Optimistic UI pada tab navigasi (Respons instan)
      updateActiveTabs(targetPath);

      // Ambil HTML halaman tujuan (0ms dari cache atau instan fetch)
      const html = await fetchPageHtml(targetUrl);
      if (!html) {
        window.location.href = targetUrl;
        return;
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const newApp = doc.querySelector('.netora-mobile-app') || doc.querySelector('.device');
      const curApp = document.querySelector('.netora-mobile-app') || document.querySelector('.device');

      if (!newApp || !curApp) {
        window.location.href = targetUrl;
        return;
      }

      const performDomSwap = () => {
        try {
          // Ubah URL dan Title tanpa reload browser
          if (!isPopState) {
            window.history.pushState({ path: targetUrl }, '', targetUrl);
          }
          if (doc.title) {
            document.title = doc.title;
          }

          // Sinkronisasi tag <style> halaman baru agar styling (profil, progres, beranda) tidak hilang
          const newStyles = doc.querySelectorAll('head style, body style');
          document.querySelectorAll('style[data-netora-page-style]').forEach(s => s.remove());
          newStyles.forEach(s => {
            const styleEl = document.createElement('style');
            styleEl.setAttribute('data-netora-page-style', 'true');
            styleEl.textContent = s.textContent;
            document.head.appendChild(styleEl);
          });

          // Ganti konten DOM halaman tujuan (berisi Shimmer Skeleton)
          curApp.innerHTML = newApp.innerHTML;
          window.scrollTo(0, 0);
          updateActiveTabs(targetPath);

          // Jalankan siklus hidup halaman tujuan (Skeleton aktif memuat data di halaman tujuan)
          triggerPageLifecycle(targetPath);
        } catch (err) {
          console.error('DOM Swap error:', err);
        }
      };

      // Gunakan W3C Native View Transition API untuk kehalusan maksimal seperti aplikasi native
      if (document.startViewTransition) {
        try {
          const transition = document.startViewTransition(() => {
            performDomSwap();
          });
          await transition.finished;
        } catch (e) {
          performDomSwap();
        }
      } else {
        // Fallback: Silky-smooth CSS entrance crossfade
        curApp.classList.remove('netora-page-fade-enter');
        performDomSwap();
        void curApp.offsetWidth;
        curApp.classList.add('netora-page-fade-enter');
      }
    } catch (globalNavErr) {
      console.error('Seamless navigation error:', globalNavErr);
      window.location.href = targetUrl;
    } finally {
      _isNavigating = false;
    }
  }

  // 6. Handle Tombol Back / Forward Browser
  window.addEventListener('popstate', () => {
    seamlessNavigateTo(window.location.href, true);
  });

  // 7. Expose Global Functions
  window.netoraNavigate = function(targetUrl) {
    seamlessNavigateTo(targetUrl);
  };

  window.netoraBack = function(fallbackUrl = 'beranda.html') {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      seamlessNavigateTo(fallbackUrl);
    }
  };

  // 8. Global Click Interceptor (Mulus Tanpa Delay)
  document.addEventListener('click', (e) => {
    // Tombol Back
    const backBtn = e.target.closest('.subpage-back-btn, .btn-back, .back-btn, [data-netora-back]');
    if (backBtn && !backBtn.hasAttribute('href')) {
      e.preventDefault();
      window.netoraBack();
      return;
    }

    const link = e.target.closest('a');
    if (!link) return;

    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    if (e.defaultPrevented) return;

    const href = link.getAttribute('href');
    if (!href) return;

    if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('tel:') || href.startsWith('mailto:')) {
      return;
    }

    if (link.hasAttribute('download') || link.getAttribute('target') === '_blank') {
      return;
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(link.href, window.location.origin);
    } catch {
      return;
    }

    if (parsedUrl.origin !== window.location.origin) {
      return;
    }

    const curPath = getCleanPath(window.location.href);
    const targetPath = getCleanPath(parsedUrl.href);

    if (parsedUrl.pathname === window.location.pathname && parsedUrl.search === window.location.search) {
      if (parsedUrl.hash) return;
      e.preventDefault();
      return;
    }

    // Berikan respons visual instan pada Tab Navbar saat diklik (Optimistic UI)
    updateActiveTabs(targetPath);

    // Navigasi mulus internal untuk seluruh halaman siswa .html
    if (targetPath.endsWith('.html') || parsedUrl.pathname.endsWith('.html') || parsedUrl.pathname === '/') {
      e.preventDefault();
      seamlessNavigateTo(link.href);
    }
  }, true);
})();

// ==========================================================================
// NETORA ULTRA-SMOOTH PULL-TO-REFRESH ENGINE (KHUSUS DASHBOARD SISWA)
// ==========================================================================
(function initNetoraPullToRefresh() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const currentPath = window.location.pathname.split('/').pop() || 'beranda.html';

  // Eksklusif Dashboard Siswa (Beranda sampai Profil)
  const studentPages = [
    '',
    'beranda.html',
    'materi.html',
    'materi-detail.html',
    'video.html',
    'quiz.html',
    'kalkulator.html',
    'progres.html',
    'pengumuman.html',
    'profil.html',
    'tentang.html'
  ];

  // Jangan aktifkan di panel admin, guru, atau halaman autentikasi
  if (currentPath.includes('admin') || currentPath.includes('guru') || currentPath.includes('login') || currentPath.includes('register')) {
    return;
  }

  if (!studentPages.includes(currentPath)) {
    return;
  }

  function setupPTR() {
    let ptrWrapper = document.getElementById('netora-pull-to-refresh');
    if (!ptrWrapper) {
      ptrWrapper = document.createElement('div');
      ptrWrapper.id = 'netora-pull-to-refresh';
      ptrWrapper.className = 'netora-ptr-wrapper';
      ptrWrapper.innerHTML = `
        <div class="netora-ptr-formal-circle" id="netora-ptr-circle">
          <svg class="netora-ptr-svg" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="11" fill="none" stroke="#E2E8F0" stroke-width="2.5"></circle>
            <circle id="netora-ptr-arc" cx="16" cy="16" r="11" fill="none" stroke="#0D5BFF" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="69.1" stroke-dashoffset="69.1"></circle>
          </svg>
        </div>
      `;
      document.body.appendChild(ptrWrapper);
    }

    const circleEl = ptrWrapper.querySelector('#netora-ptr-circle');
    const arcEl = ptrWrapper.querySelector('#netora-ptr-arc');

    let startY = 0;
    let startX = 0;
    let isPulling = false;
    let isRefreshing = false;
    let hasTriggeredHaptic = false;
    let currentDiffY = 0;

    // Batas tarikan keras: minimal 115px dari atas untuk trigger efek loading berputar
    const HARD_PULL_THRESHOLD = 115;
    const DEADZONE = 45; // Tarikan di bawah 45px tidak memunculkan apa pun agar tidak mengganggu scroll normal

    function isAtTop() {
      return (window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0) <= 1;
    }

    // --- Touch Handlers (Khusus Layar Sentuh HP) ---
    window.addEventListener('touchstart', (e) => {
      if (isRefreshing) return;
      if (!isAtTop()) return;

      const touch = e.touches[0];
      startY = touch.pageY;
      startX = touch.pageX;
      isPulling = false;
      hasTriggeredHaptic = false;
      currentDiffY = 0;
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (isRefreshing) return;
      if (!startY) return;

      const touch = e.touches[0];
      const diffY = touch.pageY - startY;
      const diffX = touch.pageX - startX;
      currentDiffY = diffY;

      // Hanya proses jika ditarik ke bawah saat layar benar-benar di paling atas
      if (diffY > DEADZONE && Math.abs(diffY) > Math.abs(diffX) * 1.5 && isAtTop()) {
        isPulling = true;
        ptrWrapper.classList.add('pulling');

        // Resistensi pegas formal (damping)
        const pullDistance = Math.min(85, Math.pow(diffY - DEADZONE, 0.82) * 1.45);
        ptrWrapper.style.transform = `translate3d(0, ${pullDistance - 55}px, 0)`;
        ptrWrapper.style.opacity = String(Math.min(1, (diffY - DEADZONE) / 35));

        // Animasi isi busur lingkaran mengikuti kedalaman tarikan
        const progress = Math.min(1, (diffY - DEADZONE) / (HARD_PULL_THRESHOLD - DEADZONE));
        if (arcEl) {
          arcEl.style.strokeDashoffset = String(69.1 * (1 - progress * 0.85));
        }
        if (circleEl) {
          circleEl.style.transform = `rotate(${progress * 260}deg)`;
        }

        if (diffY >= HARD_PULL_THRESHOLD) {
          if (!hasTriggeredHaptic) {
            hasTriggeredHaptic = true;
            if (navigator.vibrate) {
              try { navigator.vibrate(18); } catch(ev) {}
            }
          }
        } else {
          hasTriggeredHaptic = false;
        }

        if (e.cancelable && diffY > 60) {
          e.preventDefault();
        }
      }
    }, { passive: false });

    function handlePullEnd() {
      if (!isPulling || isRefreshing) {
        startY = 0;
        currentDiffY = 0;
        return;
      }

      ptrWrapper.classList.remove('pulling');

      // HANYA jika ditarik keras (melebihi HARD_PULL_THRESHOLD): jalankan animasi formal & refresh
      if (currentDiffY >= HARD_PULL_THRESHOLD) {
        isRefreshing = true;
        ptrWrapper.classList.add('refreshing');
        ptrWrapper.style.transform = '';
        ptrWrapper.style.opacity = '1';

        if (arcEl) {
          arcEl.style.strokeDashoffset = '20';
        }

        // Bersihkan cache sessionStorage agar data ditarik fresh dari database
        try {
          sessionStorage.removeItem('netora_user_cache');
          sessionStorage.removeItem('netora_materi_cache');
          sessionStorage.removeItem('netora_video_cache');
          sessionStorage.removeItem('netora_quiz_cache');
          sessionStorage.removeItem('netora_pengumuman_cache');
          sessionStorage.removeItem('netora_notif_has_unread');
        } catch(e) {}

        // Putaran formal selama 500ms lalu reload halaman
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        // Jika tidak ditarik keras, tutup kembali ke atas secara mulus
        ptrWrapper.style.transform = 'translate3d(0, -60px, 0)';
        ptrWrapper.style.opacity = '0';
        if (circleEl) circleEl.style.transform = 'rotate(0deg)';
        if (arcEl) arcEl.style.strokeDashoffset = '69.1';
        setTimeout(() => {
          ptrWrapper.classList.remove('refreshing');
        }, 250);
      }

      startY = 0;
      currentDiffY = 0;
      isPulling = false;
    }

    window.addEventListener('touchend', handlePullEnd, { passive: true });
    window.addEventListener('touchcancel', handlePullEnd, { passive: true });


  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupPTR);
  } else {
    setupPTR();
  }
})();

// ==========================================================================
// PWA & NATIVE MOBILE APP INSTALLATION SUPPORT (netora.web.id)
// ==========================================================================
(function initNetoraPWA() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Pastikan tag manifest terpasang di head
  if (!document.querySelector('link[rel="manifest"]')) {
    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = '/manifest.json';
    document.head.appendChild(manifestLink);
  }

  // Set Theme Color untuk header browser mobile
  if (!document.querySelector('meta[name="theme-color"]')) {
    const metaTheme = document.createElement('meta');
    metaTheme.name = 'theme-color';
    metaTheme.content = '#0D5BFF';
    document.head.appendChild(metaTheme);
  }

  // Daftarkan Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
})();


