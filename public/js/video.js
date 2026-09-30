window.initVideoPage = function() {
  const videoContainer = document.getElementById('video-container');
  if (!videoContainer) return;
  getUser().then(user => updateNavHeader(user));
  const btnSearch = document.getElementById('btn-search-video');
  const searchBox = document.getElementById('search-video-box');
  const inputSearch = document.getElementById('input-search-video');

  let allVideos = [];
  let playingVideoId = null;

  const defaultVideos = [
    { id: 1, judul: 'Simulasi Jaringan Cisco Packet Tracer', kategori: 'Cisco Packet Tracer', durasi: '15:20', progress: 0, url_youtube: 'https://www.youtube-nocookie.com/embed/qiQR5rTSshw' },
    { id: 2, judul: 'Pengenalan Mikrotik dan Jaringan Komputer', kategori: 'Dasar Mikrotik', durasi: '18:32', progress: 0, url_youtube: 'https://www.youtube-nocookie.com/embed/IPvYjXCsTg8' },
    { id: 3, judul: 'Tutorial Video Interaktif & Lab Jaringan', kategori: 'Dasar Jaringan', durasi: '14:20', progress: 0, url_youtube: 'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE' },
    { id: 4, judul: 'Konfigurasi IP Address & Subnetting', kategori: 'Layanan Jaringan', durasi: '12:45', progress: 0, url_youtube: 'https://www.youtube-nocookie.com/embed/qiQR5rTSshw' },
    { id: 5, judul: 'Manajemen Bandwidth & Firewall', kategori: 'Mikrotik Queue', durasi: '16:50', progress: 0, url_youtube: 'https://www.youtube-nocookie.com/embed/IPvYjXCsTg8' },
    { id: 6, judul: 'Konfigurasi Hotspot & User Login', kategori: 'Manajemen User', durasi: '17:40', progress: 0, url_youtube: 'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE' }
  ];

  function extractYouTubeInfo(url) {
    if (!url) return { videoId: null, embedUrl: '', thumbnailUrl: '', directUrl: '' };
    const str = String(url).trim();
    let videoId = null;

    if (/^[\w-]{11}$/.test(str)) {
      videoId = str;
    } else {
      const regExp = /(?:(?:www\.|m\.)?youtube\.com\/(?:(?:watch\?(?:.*&)?v=)|(?:embed|v|shorts|live)\/)|youtu\.be\/|youtube-nocookie\.com\/embed\/)([\w-]{11})/i;
      const match = str.match(regExp);
      videoId = match ? match[1] : null;
    }

    if (!videoId) {
      return {
        videoId: null,
        embedUrl: str,
        thumbnailUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=360&auto=format&fit=crop&q=80',
        directUrl: str
      };
    }

    return {
      videoId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      directUrl: `https://www.youtube.com/watch?v=${videoId}`
    };
  }

  function renderVideoSkeleton() {
    if (!videoContainer) return;
    videoContainer.innerHTML = '<div class="desktop-grid-2col">' + [1, 2, 3, 4, 5, 6].map(() => `
      <div class="skeleton-item-card">
        <div class="skeleton-item-left">
          <div class="netora-skeleton skeleton-square-thumb" style="width:68px; height:46px; border-radius:10px;"></div>
          <div class="skeleton-meta-col">
            <div class="netora-skeleton skeleton-line h-18 w-80"></div>
            <div class="netora-skeleton skeleton-line w-40"></div>
          </div>
        </div>
      </div>
    `).join('') + '</div>';
  }

  async function loadVideos() {
    renderVideoSkeleton();

    // Baca cache video jika ada
    try {
      const cached = sessionStorage.getItem('netora_video_cache');
      if (cached) {
        allVideos = JSON.parse(cached);
        if (allVideos.length > 0) renderVideoCards();
      }
    } catch (e) {}

    try {
      const res = await fetch('/api/video');
      const data = await res.json();

      if (res.ok && data.success && data.video && data.video.length > 0) {
        allVideos = data.video.map(v => {
          const yt = extractYouTubeInfo(v.url_youtube);
          return {
            id: v.id,
            judul: v.judul,
            deskripsi: v.deskripsi || '',
            kategori: v.kategori || 'Mikrotik',
            durasi: v.durasi || '15:00',
            progress: 0,
            url_youtube: yt.embedUrl || v.url_youtube,
            direct_url: yt.directUrl || v.url_youtube,
            thumbnail_url: v.thumbnail_url || yt.thumbnailUrl || 'https://img.youtube.com/vi/wKkLSmLp37g/hqdefault.jpg'
          };
        });
        try { sessionStorage.setItem('netora_video_cache', JSON.stringify(allVideos)); } catch (e) {}
      } else if (allVideos.length === 0) {
        allVideos = defaultVideos.map(v => {
          const yt = extractYouTubeInfo(v.url_youtube);
          return {
            ...v,
            direct_url: yt.directUrl,
            thumbnail_url: yt.thumbnailUrl
          };
        });
      }
      renderVideoCards();
    } catch (err) {
      if (allVideos.length === 0) {
        allVideos = defaultVideos.map(v => {
          const yt = extractYouTubeInfo(v.url_youtube);
          return {
            ...v,
            direct_url: yt.directUrl,
            thumbnail_url: yt.thumbnailUrl
          };
        });
        renderVideoCards();
      }
    }
  }

  function renderVideoCards() {
    const q = (inputSearch ? inputSearch.value : '').toLowerCase().trim();

    let list = allVideos.filter(v => {
      if (q && !v.judul.toLowerCase().includes(q) && !(v.kategori || '').toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });

    if (list.length === 0) {
      videoContainer.innerHTML = '<div style="text-align:center; padding:30px; color:#64748B; font-size:13px;">Tidak ada video yang sesuai pencarian.</div>';
      return;
    }

    videoContainer.innerHTML = '<div class="desktop-grid-2col netora-fade-in">' + list.map(v => {
      const isPlaying = playingVideoId === v.id;
      const directUrl = v.direct_url || (extractYouTubeInfo(v.url_youtube).directUrl) || v.url_youtube;
      return `
        <div class="video-card-item" style="background:#FFFFFF; border-radius:18px; margin:0 16px 12px; box-shadow:0 2px 14px rgba(13,91,255,0.04); border:1px solid rgba(0,0,0,0.04); overflow:hidden;">
          <!-- Card Row Header -->
          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:14px 16px; cursor:pointer;" onclick="togglePlayVideo(${v.id})">
            <div class="item-left-flex">
              <div class="item-square-thumb" style="position:relative; width:90px; height:60px; border-radius:10px; overflow:hidden; background:#0F172A; flex-shrink:0;">
                <img src="${escapeHtml(v.thumbnail_url)}" alt="${escapeHtml(v.judul)}" style="width:100%; height:100%; object-fit:cover; display:block;" onerror="this.style.opacity='0.2'">
                <div style="position:absolute; inset:0; background:rgba(0,0,0,0.22); display:flex; align-items:center; justify-content:center;">
                  <div style="width:24px; height:24px; border-radius:50%; background:rgba(13,91,255,0.95); display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,0.35);">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="#FFFFFF" style="margin-left:1.5px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  </div>
                </div>
                <span class="item-thumb-duration" style="position:absolute; bottom:3px; right:4px; font-size:9.5px; font-weight:700; padding:1.5px 5px; background:rgba(15,23,42,0.85); color:#FFFFFF; border-radius:4px; line-height:1;">${escapeHtml(v.durasi || '15:00')}</span>
              </div>
              <div class="item-meta-col">
                <h4 class="item-title-text">${escapeHtml(v.judul)}</h4>
                <div class="item-sub-text">
                  <span>${escapeHtml(v.kategori || 'Mikrotik')}</span>
                </div>
              </div>
            </div>
            <div class="item-chevron-icon" style="transform:${isPlaying ? 'rotate(90deg)' : 'none'}; transition:0.2s; display:flex; align-items:center;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
          </div>

          <!-- Progress Bar jika ada -->
          ${v.progress > 0 ? `
            <div style="width:100%; height:3px; background:#E2E8F0;">
              <div style="width:${v.progress}%; height:100%; background:#0D5BFF;"></div>
            </div>
          ` : ''}

          <!-- Video Player Dropdown -->
          ${isPlaying ? `
            <div style="padding:0 14px 16px;">
              <div style="position:relative; width:100%; padding-bottom:56.25%; border-radius:14px; overflow:hidden; background:#000; box-shadow:0 4px 16px rgba(0,0,0,0.2);">
                <iframe 
                  src="${escapeHtml(v.url_youtube)}" 
                  style="position:absolute; top:0; left:0; width:100%; height:100%; border:0;" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                  referrerpolicy="strict-origin-when-cross-origin"
                  allowfullscreen>
                </iframe>
              </div>
              <div style="margin-top:10px; display:flex; justify-content:flex-end;">
                <a href="${escapeHtml(directUrl)}" target="_blank" rel="noopener noreferrer" style="font-size:12px; color:#0D5BFF; text-decoration:none; display:inline-flex; align-items:center; gap:5px; font-weight:700; background:#EFF6FF; padding:6px 12px; border-radius:10px; border:1px solid #BFDBFE;">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  <span>Buka di Aplikasi YouTube</span>
                </a>
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }).join('') + '</div>';
  }

  window.togglePlayVideo = function(id) {
    playingVideoId = playingVideoId === id ? null : id;
    renderVideoCards();
  };

  if (btnSearch && searchBox) {
    btnSearch.addEventListener('click', () => {
      searchBox.style.display = searchBox.style.display === 'none' ? 'block' : 'none';
      if (searchBox.style.display === 'block' && inputSearch) inputSearch.focus();
    });
  }

  if (inputSearch) {
    inputSearch.addEventListener('input', renderVideoCards);
  }

  loadVideos();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.initVideoPage);
} else {
  window.initVideoPage();
}
