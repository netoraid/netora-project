window.initPengumumanPage = function() {
  const container = document.getElementById('pengumuman-container');
  if (!container) return;

  getUser().then(user => updateNavHeader(user));

  function renderPengumuman(list) {
    if (!list || list.length === 0) {
      container.innerHTML = `
        <div style="background:#FFFFFF; border-radius:20px; padding:36px 20px; text-align:center; margin:16px; border:1px solid #E2E8F0; box-shadow:0 4px 16px rgba(0,0,0,0.03);">
          <div style="width:56px; height:56px; border-radius:18px; background:#F1F5F9; display:inline-flex; align-items:center; justify-content:center; margin-bottom:12px; color:#94A3B8;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          </div>
          <h3 style="margin:0 0 6px; font-size:16px; font-weight:800; color:#1E293B;">Belum Ada Notifikasi</h3>
          <p style="margin:0 auto; font-size:12.5px; color:#64748B; max-width:280px; line-height:1.5;">Saat ini belum ada notifikasi baru. Pemberitahuan resmi dari admin akan muncul di sini.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '<div class="desktop-grid-2col">' + list.map(item => `
      <div style="background:#FFFFFF; border-radius:18px; padding:18px 16px; margin:0 16px 14px; box-shadow:0 3px 16px rgba(13,91,255,0.05); border:1px solid ${item.penting ? 'rgba(239,68,68,0.35)' : 'rgba(0,0,0,0.06)'}; position:relative; overflow:hidden;">
        ${item.penting ? `<div style="position:absolute; top:0; left:0; width:4px; height:100%; background:#EF4444;"></div>` : ''}
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <div style="display:flex; align-items:center; gap:6px;">
            ${item.penting ? `<span style="font-size:10.5px; font-weight:800; color:#EF4444; background:rgba(239,68,68,0.1); padding:2px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:4px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg><span>PENTING</span></span>` : ''}
            <span style="font-size:10.5px; font-weight:800; color:#0D5BFF; background:rgba(13,91,255,0.08); padding:2px 8px; border-radius:6px;">${escapeHtml(item.kategori || 'Notifikasi')}</span>
          </div>
          <span style="font-size:11px; color:#64748B; display:inline-flex; align-items:center; gap:4px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <span>${formatTanggal(item.created_at)}</span>
          </span>
        </div>

        <h3 style="margin:0 0 8px; font-size:15.5px; font-weight:800; color:#1E293B; line-height:1.35;">${escapeHtml(item.judul)}</h3>
        <p style="margin:0; font-size:13px; color:#475569; line-height:1.6; white-space:pre-line;">
          ${escapeHtml(item.isi)}
        </p>
      </div>
    `).join('') + '</div>';
  }

  // 1. Coba baca cache lokal (0ms render)
  try {
    const cached = sessionStorage.getItem('netora_pengumuman_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) renderPengumuman(parsed);
    }
  } catch(e) {}

  // 2. Fetch data mutakhir
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
      if (!sessionStorage.getItem('netora_pengumuman_cache')) {
        container.innerHTML = '<p style="color:#EF4444; text-align:center; padding:40px 0; font-size:13px;">Gagal memuat notifikasi.</p>';
      }
    }
  }

  loadPengumumanData();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.initPengumumanPage);
} else {
  window.initPengumumanPage();
}
