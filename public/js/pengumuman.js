window.initPengumumanPage = function() {
  const container = document.getElementById('pengumuman-container');
  if (!container) return;

  getUser().then(user => updateNavHeader(user));

  function renderSkeleton() {
    container.innerHTML = `
      <div class="desktop-grid-2col" style="display:flex; flex-direction:column; gap:12px; width:100%; box-sizing:border-box;">
        <div class="skeleton-notif-card" style="background:#FFFFFF; border-radius:18px; padding:16px 18px; border:1.5px solid #E2E8F0; box-shadow:0 4px 16px rgba(13,91,255,0.05); box-sizing:border-box;">
          <div class="skeleton-notif-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div class="netora-skeleton" style="width:72px; height:18px; border-radius:6px;"></div>
            <div class="netora-skeleton" style="width:96px; height:13px; border-radius:4px;"></div>
          </div>
          <div class="netora-skeleton skeleton-line h-18 w-75" style="margin-top:4px;"></div>
          <div class="netora-skeleton skeleton-line w-100"></div>
          <div class="netora-skeleton skeleton-line w-60"></div>
        </div>
        <div class="skeleton-notif-card" style="background:#FFFFFF; border-radius:18px; padding:16px 18px; border:1.5px solid #E2E8F0; box-sizing:border-box;">
          <div class="skeleton-notif-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div class="netora-skeleton" style="width:84px; height:18px; border-radius:6px;"></div>
            <div class="netora-skeleton" style="width:90px; height:13px; border-radius:4px;"></div>
          </div>
          <div class="netora-skeleton skeleton-line h-18 w-90" style="margin-top:4px;"></div>
          <div class="netora-skeleton skeleton-line w-100"></div>
          <div class="netora-skeleton skeleton-line w-40"></div>
        </div>
      </div>
    `;
  }

  function renderNotifCard(item) {
    const isPenting = Boolean(item.penting);
    return `
      <article class="notif-card-item ${isPenting ? 'is-penting' : ''}" style="background:#FFFFFF; border-radius:18px; padding:16px 18px; margin-bottom:12px; border:1.5px solid ${isPenting ? 'rgba(239,68,68,0.38)' : '#E2E8F0'}; box-shadow:0 4px 16px rgba(13,91,255,0.05); position:relative; overflow:hidden; display:flex; flex-direction:column; gap:8px; width:100%; box-sizing:border-box;">
        ${isPenting ? `<div class="notif-accent-stripe" style="position:absolute; top:0; left:0; width:4px; height:100%; background:#EF4444;"></div>` : ''}
        <div class="notif-card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; width:100%;">
          <div class="notif-badges-group" style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
            ${isPenting ? `
              <span class="badge-notif-penting" style="font-size:10.5px; font-weight:800; color:#EF4444; background:rgba(239,68,68,0.1); padding:3px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:4px; letter-spacing:0.3px;">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                <span>PENTING</span>
              </span>
            ` : ''}
            <span class="badge-notif-kategori" style="font-size:10.5px; font-weight:800; color:#0D5BFF; background:rgba(13,91,255,0.08); padding:3px 8px; border-radius:6px; display:inline-flex; align-items:center;">${escapeHtml(item.kategori || 'Notifikasi')}</span>
          </div>
          <div class="notif-date-badge" style="font-size:11px; color:#64748B; font-weight:600; display:inline-flex; align-items:center; gap:4px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <span>${formatTanggal(item.created_at)}</span>
          </div>
        </div>

        <h3 class="notif-card-title" style="margin:2px 0 0; font-size:15.5px; font-weight:800; color:#1E293B; line-height:1.4; word-break:break-word;">${escapeHtml(item.judul)}</h3>
        <p class="notif-card-body" style="margin:0; font-size:13px; color:#475569; line-height:1.6; white-space:pre-line; word-break:break-word;">${escapeHtml(item.isi)}</p>
      </article>
    `;
  }

  function renderPengumuman(list) {
    if (!list || list.length === 0) {
      container.innerHTML = `
        <div class="netora-fade-in notif-empty-card" style="background:#FFFFFF; border-radius:22px; padding:38px 24px; text-align:center; max-width:520px; margin:32px auto; border:1.5px solid #E2E8F0; box-shadow:0 4px 18px rgba(13,91,255,0.05); box-sizing:border-box;">
          <div style="width:48px; height:48px; border-radius:14px; background:rgba(13,91,255,0.08); display:inline-flex; align-items:center; justify-content:center; margin:0 auto 12px; color:#0D5BFF;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          </div>
          <h3 style="margin:0 0 6px; font-size:16.5px; font-weight:800; color:#1E293B;">Belum Ada Notifikasi</h3>
          <p style="margin:0 auto; font-size:13px; color:#64748B; max-width:320px; line-height:1.55;">Saat ini belum ada notifikasi baru. Pemberitahuan resmi dari admin akan muncul di sini.</p>
        </div>
      `;
      return;
    }

    if (list.length === 1) {
      container.innerHTML = `
        <div class="netora-fade-in notif-single-wrap" style="max-width:680px; margin:0 auto; width:100%; box-sizing:border-box;">
          ${renderNotifCard(list[0])}
        </div>
      `;
      return;
    }

    container.innerHTML = '<div class="desktop-grid-2col netora-fade-in" style="display:flex; flex-direction:column; gap:12px; width:100%; box-sizing:border-box;">' + list.map(renderNotifCard).join('') + '</div>';
  }

  // Jika container belum memiliki konten skeleton, isi dengan skeleton shimmer
  if (!container.innerHTML.trim()) {
    renderSkeleton();
  }

  // Fetch data mutakhir
  async function loadPengumumanData() {
    try {
      const res = await fetch('/api/pengumuman');
      const data = await res.json();

      if (res.ok && data.success && Array.isArray(data.pengumuman)) {
        try { sessionStorage.setItem('netora_pengumuman_cache', JSON.stringify(data.pengumuman)); } catch(e) {}

        if (data.pengumuman.length > 0) {
          const maxId = Math.max(...data.pengumuman.map(item => Number(item.id) || 0));
          localStorage.setItem('netora_last_read_notif_id', String(maxId));
        }

        document.querySelectorAll('.nav-notif-dot, .desktop-notif-dot').forEach(d => {
          d.style.display = 'none';
        });

        renderPengumuman(data.pengumuman);
      }
    } catch (err) {
      try {
        const cached = sessionStorage.getItem('netora_pengumuman_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            renderPengumuman(parsed);
            return;
          }
        }
      } catch(e) {}
      container.innerHTML = '<p style="color:#EF4444; text-align:center; padding:40px 0; font-size:13px;">Gagal memuat notifikasi.</p>';
    }
  }

  loadPengumumanData();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.initPengumumanPage);
} else {
  window.initPengumumanPage();
}
