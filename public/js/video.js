window.initVideoPage = async function() {
  const videoContainer = document.getElementById('video-container');
  const materiContainer = document.getElementById('materi-container-video');
  if (!videoContainer) return;

  if (typeof getUser === 'function') {
    getUser().then(user => {
      if (typeof updateNavHeader === 'function') updateNavHeader(user);
    });
  }

  // Definisi Master 2 Kategori Vidio Praktik NETORA
  const CATEGORIES = {
    'mikrotik': {
      id: 'mikrotik',
      name: 'MikroTik',
      badgeText: 'RouterOS & Network Admin',
      desc: 'Pelajari konfigurasi RouterOS, manajemen bandwidth Simple Queue & Queue Tree, Hotspot, NAT Firewall, serta Winbox.',
      iconColor: '#0D5BFF',
      iconBg: 'rgba(13, 91, 255, 0.1)',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`
    },
    'cisco': {
      id: 'cisco',
      name: 'Cisco Packet Tracer',
      badgeText: 'Simulasi & Topologi Switch/Router',
      desc: 'Simulasi interaktif jaringan komputer, konfigurasi VLAN, VTP, Trunking Switch Layer 2/3, STP, dan protokol routing Cisco IOS.',
      iconColor: '#0284C7',
      iconBg: 'rgba(2, 132, 199, 0.1)',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line><path d="M6 8h12"></path><path d="M6 12h8"></path></svg>`
    }
  };

  // Helper Pemetaan Kategori Dinamis & Kompatibel (Anti-salah eja di database)
  function getCategoryKey(item) {
    if (!item) return 'mikrotik';
    const k = (item.kategori || '').toLowerCase().trim();

    // 1. Prioritaskan kategori eksplisit dari database (Authoritative)
    if (k.includes('cisco') || k.includes('packet tracer')) {
      return 'cisco';
    }
    if (k.includes('mikro') || k.includes('routeros')) {
      return 'mikrotik';
    }

    // 2. Fallback HANYA jika kategori di database kosong / tidak terdefinisi
    const t = (item.judul || '').toLowerCase().trim();
    if (t.includes('cisco') || t.includes('packet tracer')) {
      return 'cisco';
    }
    return 'mikrotik'; // fallback default
  }

  let allVideos = [];
  let allMateri = [];
  let playingVideoId = null;
  let currentActiveCategory = null;

  const btnSearch = document.getElementById('btn-search-video');
  const searchBox = document.getElementById('search-video-box');
  const inputSearch = document.getElementById('input-search-video');

  const escapeHtml = typeof window.escapeHtml === 'function' ? window.escapeHtml : (str => {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  });

  function formatVideoDescription(desc) {
    if (!desc || !desc.trim()) return '';
    const safeText = escapeHtml(desc.trim());
    const urlPattern = /(https?:\/\/[^\s<]+)/g;
    return safeText.replace(urlPattern, url => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#0D5BFF; text-decoration:underline; font-weight:600; word-break:break-all;">${url}</a>`;
    });
  }

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
        thumbnailUrl: '',
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
    if (videoContainer) {
      videoContainer.innerHTML = '<div class="desktop-grid-2col">' + [1, 2, 3, 4].map(() => `
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
    if (materiContainer) {
      materiContainer.innerHTML = '<div class="desktop-grid-2col">' + [1, 2].map(() => `
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
  }

  function updateCategoryBadges() {
    const countVideoMikrotik = allVideos.filter(v => getCategoryKey(v) === 'mikrotik').length;
    const countVideoCisco = allVideos.filter(v => getCategoryKey(v) === 'cisco').length;

    const badgeMikrotik = document.getElementById('badge-video-count-mikrotik');
    const badgeCisco = document.getElementById('badge-video-count-cisco');

    if (badgeMikrotik) {
      badgeMikrotik.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg><span>${countVideoMikrotik} Vidio</span>`;
    }
    if (badgeCisco) {
      badgeCisco.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg><span>${countVideoCisco} Vidio</span>`;
    }
  }

  window.pilihKategoriVideo = function(catKey, pushState = true) {
    let normalizedKey = String(catKey || '').toLowerCase().trim();
    if (!CATEGORIES[normalizedKey]) {
      if (/cisco/i.test(normalizedKey)) normalizedKey = 'cisco';
      else normalizedKey = 'mikrotik';
    }
    const cat = CATEGORIES[normalizedKey];
    if (!cat) return;

    currentActiveCategory = normalizedKey;

    if (pushState) {
      try {
        const newUrl = `${window.location.pathname}?kategori=${normalizedKey}`;
        window.history.pushState({ kategori: normalizedKey }, '', newUrl);
      } catch(e) {}
    }

    // Update Tampilan DOM
    const kategoriSec = document.getElementById('video-kategori-section');
    const listSec = document.getElementById('video-list-section');
    const heroCard = document.getElementById('video-hero-card');
    const topBackBtn = document.getElementById('video-top-back-btn');
    const headerTitle = document.getElementById('video-header-title');

    if (kategoriSec) kategoriSec.style.display = 'none';
    if (listSec) listSec.style.display = 'block';
    if (heroCard) heroCard.style.display = 'none';

    if (topBackBtn) {
      topBackBtn.onclick = (e) => {
        e.preventDefault();
        window.kembaliKeKategoriVideo();
      };
      topBackBtn.title = 'Kembali ke Pilihan Kategori';
    }

    if (headerTitle) {
      headerTitle.textContent = `Vidio ${cat.name}`;
    }

    // Update Banner Info Kategori Aktif
    const catIcon = document.getElementById('cat-video-active-icon');
    const catTitle = document.getElementById('cat-video-active-title');

    if (catIcon) {
      catIcon.innerHTML = cat.icon;
      catIcon.style.color = cat.iconColor;
      catIcon.style.background = cat.iconBg;
    }
    if (catTitle) {
      catTitle.textContent = `Vidio: ${cat.name}`;
    }

    renderVideoCards();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.kembaliKeKategoriVideo = function(pushState = true) {
    currentActiveCategory = null;
    playingVideoId = null;

    if (pushState) {
      try {
        window.history.pushState({}, '', window.location.pathname);
      } catch(e) {}
    }

    const kategoriSec = document.getElementById('video-kategori-section');
    const listSec = document.getElementById('video-list-section');
    const heroCard = document.getElementById('video-hero-card');
    const topBackBtn = document.getElementById('video-top-back-btn');
    const headerTitle = document.getElementById('video-header-title');

    if (kategoriSec) kategoriSec.style.display = 'block';
    if (listSec) listSec.style.display = 'none';
    if (heroCard) heroCard.style.display = 'flex';

    if (topBackBtn) {
      topBackBtn.onclick = null;
      topBackBtn.href = 'beranda.html';
      topBackBtn.title = 'Kembali ke Beranda';
    }

    if (headerTitle) {
      headerTitle.textContent = 'Vidio Praktik';
    }

    if (inputSearch) inputSearch.value = '';
    if (searchBox) searchBox.style.display = 'none';

    updateCategoryBadges();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Sinkronisasi navigasi tombol Back / Forward di browser
  window.addEventListener('popstate', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const cat = urlParams.get('kategori') || urlParams.get('kat');
    if (cat) {
      window.pilihKategoriVideo(cat, false);
    } else {
      window.kembaliKeKategoriVideo(false);
    }
  });

  async function loadVideosAndMateri() {
    renderVideoSkeleton();

    // 1. Cek cache lokal di sessionStorage untuk render instan
    try {
      const cachedVideo = sessionStorage.getItem('netora_video_cache');
      if (cachedVideo) {
        const parsed = JSON.parse(cachedVideo);
        if (Array.isArray(parsed) && parsed.length > 0) allVideos = parsed;
      }
      const cachedMateri = sessionStorage.getItem('netora_materi_cache');
      if (cachedMateri) {
        const parsedM = JSON.parse(cachedMateri);
        if (Array.isArray(parsedM) && parsedM.length > 0) allMateri = parsedM;
      }
      if (allVideos.length > 0) {
        updateCategoryBadges();
        if (currentActiveCategory) {
          renderVideoCards();
        }
      }
    } catch (e) {}

    // 2. Fetch data mutakhir video & materi dari API Supabase secara paralel
    try {
      const [resVideo, resMateri] = await Promise.all([
        fetch('/api/video?t=' + Date.now()).catch(() => null),
        fetch('/api/materi?t=' + Date.now()).catch(() => null)
      ]);

      if (resVideo && resVideo.ok) {
        const dataV = await resVideo.json();
        if (dataV.success && Array.isArray(dataV.video)) {
          allVideos = dataV.video.map(v => {
            const yt = extractYouTubeInfo(v.url_youtube);
            return {
              id: v.id,
              judul: v.judul || 'Vidio Praktik',
              deskripsi: v.deskripsi || '',
              kategori: v.kategori || 'MikroTik',
              durasi: v.durasi || '15:00',
              progress: 0,
              url_youtube: yt.embedUrl || v.url_youtube,
              direct_url: yt.directUrl || v.url_youtube,
              thumbnail_url: v.thumbnail_url || yt.thumbnailUrl || ''
            };
          });
          try { sessionStorage.setItem('netora_video_cache', JSON.stringify(allVideos)); } catch (e) {}
        }
      }

      if (resMateri && resMateri.ok) {
        const dataM = await resMateri.json();
        if (dataM.success && Array.isArray(dataM.materi)) {
          allMateri = dataM.materi;
          try { sessionStorage.setItem('netora_materi_cache', JSON.stringify(dataM.materi)); } catch (e) {}
        }
      }

      updateCategoryBadges();

      // Cek URL apakah langsung membuka kategori tertentu
      const urlParams = new URLSearchParams(window.location.search);
      const initialCat = urlParams.get('kategori') || urlParams.get('kat');
      if (initialCat) {
        window.pilihKategoriVideo(initialCat, false);
      } else if (currentActiveCategory) {
        renderVideoCards();
      }
    } catch (err) {
      console.warn('Gagal memuat video/materi:', err);
    }
  }

  function renderVideoCards() {
    if (!currentActiveCategory || !videoContainer) return;

    const q = (inputSearch ? inputSearch.value : '').toLowerCase().trim();
    const cat = CATEGORIES[currentActiveCategory];

    // Filter video berdasarkan kategori aktif
    let list = allVideos.filter(v => getCategoryKey(v) === currentActiveCategory);

    if (q) {
      list = list.filter(v => v.judul.toLowerCase().includes(q) || (v.deskripsi || '').toLowerCase().includes(q));
    }

    const countBadge = document.getElementById('cat-badge-v-video-count');
    if (countBadge) countBadge.textContent = `${list.length} Vidio`;

    if (list.length === 0) {
      videoContainer.innerHTML = `
        <div class="netora-fade-in" style="text-align:center; padding:32px 18px; background:#FFFFFF; border-radius:18px; margin:0 16px 12px; border:1.5px dashed #CBD5E1; box-shadow:0 2px 12px rgba(15,23,42,0.02);">
          <div style="width:36px; height:36px; border-radius:10px; background:rgba(239,68,68,0.08); color:#DC2626; display:inline-flex; align-items:center; justify-content:center; margin-bottom:8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          </div>
          <h4 style="margin:0 0 4px; font-size:15px; font-weight:800; color:#1E293B;">
            ${q ? 'Vidio Tidak Ditemukan' : `Belum Ada Vidio Praktik di Kategori ${cat ? cat.name : ''}`}
          </h4>
          <p style="margin:0 auto; font-size:12px; color:#64748B; max-width:340px; line-height:1.45;">
            ${q ? `Tidak ada vidio praktik yang cocok dengan pencarian "${escapeHtml(q)}".` : `Vidio praktikum dan tutorial khusus ${cat ? cat.name : 'kategori ini'} yang ditambahkan di panel Guru / Admin akan otomatis muncul di sini.`}
          </p>
        </div>
      `;
      return;
    }

    videoContainer.innerHTML = '<div class="desktop-grid-2col netora-fade-in">' + list.map(v => {
      const isPlaying = playingVideoId === v.id;
      const directUrl = v.direct_url || (extractYouTubeInfo(v.url_youtube).directUrl) || v.url_youtube;

      return `
        <div class="video-card-item">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:14px 16px; cursor:pointer;" onclick="togglePlayVideo(${v.id})">
            <div class="item-left-flex">
              <div class="item-square-thumb" style="position:relative; width:90px; height:60px; border-radius:10px; overflow:hidden; background:#0F172A; flex-shrink:0;">
                <img src="${escapeHtml(v.thumbnail_url)}" alt="${escapeHtml(v.judul)}" style="width:100%; height:100%; object-fit:cover; display:block;" onerror="this.style.opacity='0.2'">
                <div style="position:absolute; inset:0; background:rgba(0,0,0,0.22); display:flex; align-items:center; justify-content:center;">
                  <div style="width:24px; height:24px; border-radius:50%; background:rgba(13,91,255,0.95); display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,0.35);">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="#FFFFFF" style="margin-left:1.5px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  </div>
                </div>
              </div>
              <div class="item-meta-col">
                <h4 class="item-title-text">${escapeHtml(v.judul)}</h4>
                <div class="item-sub-text">
                  <span style="color:#DC2626; font-weight:700;">${escapeHtml(cat ? cat.name : (v.kategori || 'Praktikum'))}</span>
                </div>
              </div>
            </div>
            <div class="item-chevron-icon" style="transform:${isPlaying ? 'rotate(90deg)' : 'none'}; transition:0.2s; display:flex; align-items:center;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
          </div>

          ${isPlaying ? `
            <div style="padding:0 16px 18px;">
              <!-- Iframe Player Video YouTube -->
              <div style="position:relative; width:100%; padding-bottom:56.25%; border-radius:14px; overflow:hidden; background:#000; box-shadow:0 4px 16px rgba(0,0,0,0.2);">
                <iframe 
                  src="${escapeHtml(v.url_youtube)}" 
                  style="position:absolute; top:0; left:0; width:100%; height:100%; border:0;" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                  referrerpolicy="strict-origin-when-cross-origin"
                  allowfullscreen>
                </iframe>
              </div>

              <!-- Baris Meta & Link Buka YouTube -->
              <div style="margin-top:12px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                <div style="display:flex; align-items:center; gap:6px;">
                  <span style="font-size:11.5px; font-weight:700; color:#0D5BFF; background:rgba(13,91,255,0.08); padding:4px 10px; border-radius:8px;">
                    ${escapeHtml(cat ? cat.name : (v.kategori || 'Praktikum'))}
                  </span>
                </div>
                <a href="${escapeHtml(directUrl)}" target="_blank" rel="noopener noreferrer" style="font-size:12px; color:#0D5BFF; text-decoration:none; display:inline-flex; align-items:center; gap:6px; font-weight:700; background:#EFF6FF; padding:6px 12px; border-radius:10px; border:1px solid #BFDBFE; transition:background 0.15s;">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  <span>Buka di Aplikasi YouTube</span>
                </a>
              </div>

              <!-- Deskripsi Vidio Praktik di Bawah Video YouTube -->
              <div class="video-desc-wrap" style="margin-top:12px; padding:12px 14px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; text-align:left;">
                <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0D5BFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  <span style="font-size:12.5px; font-weight:700; color:#1E293B;">Deskripsi Vidio:</span>
                </div>
                ${v.deskripsi && v.deskripsi.trim() ? `
                  <div style="font-size:12.5px; color:#334155; line-height:1.65; white-space:pre-line; word-break:break-word;">
                    ${formatVideoDescription(v.deskripsi)}
                  </div>
                ` : `
                  <p style="margin:0; font-size:12px; color:#94A3B8; font-style:italic;">
                    Belum ada deskripsi untuk vidio praktik ini.
                  </p>
                `}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }).join('') + '</div>';
  }

  function renderMateriCards() {
    if (!currentActiveCategory || !materiContainer) return;

    const q = (inputSearch ? inputSearch.value : '').toLowerCase().trim();
    const cat = CATEGORIES[currentActiveCategory];

    // Filter materi berdasarkan kategori aktif
    let list = allMateri.filter(m => getCategoryKey(m) === currentActiveCategory);

    if (q) {
      list = list.filter(m => m.judul.toLowerCase().includes(q) || (m.preview || '').toLowerCase().includes(q));
    }

    const countBadge = document.getElementById('cat-badge-v-materi-count');
    if (countBadge) countBadge.textContent = `${list.length} Modul`;

    if (list.length === 0) {
      materiContainer.innerHTML = `
        <div class="netora-fade-in" style="text-align:center; padding:32px 18px; background:#FFFFFF; border-radius:18px; margin:0 16px 12px; border:1.5px dashed #CBD5E1; box-shadow:0 2px 12px rgba(15,23,42,0.02);">
          <div style="width:48px; height:48px; border-radius:14px; background:${cat ? cat.iconBg : 'rgba(13,91,255,0.08)'}; color:${cat ? cat.iconColor : '#0D5BFF'}; display:inline-flex; align-items:center; justify-content:center; margin-bottom:10px;">
            ${cat ? cat.icon : ''}
          </div>
          <h4 style="margin:0 0 4px; font-size:15px; font-weight:800; color:#1E293B;">
            ${q ? 'Modul Tidak Ditemukan' : `Belum Ada Modul di Kategori ${cat ? cat.name : ''}`}
          </h4>
          <p style="margin:0 auto; font-size:12px; color:#64748B; max-width:340px; line-height:1.45;">
            ${q ? `Tidak ada materi yang cocok dengan pencarian "${escapeHtml(q)}".` : `Modul pembelajaran khusus ${cat ? cat.name : 'kategori ini'} yang diunggah Guru / Admin akan otomatis masuk dan tampil di sini.`}
          </p>
        </div>
      `;
      return;
    }

    materiContainer.innerHTML = '<div class="desktop-grid-2col netora-fade-in">' + list.map((item) => {
      const icon = cat ? cat.icon : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
      const pagesCount = item.total_halaman || (item.pages && Array.isArray(item.pages) ? item.pages.length : (item.isi ? 1 : 1));
      const pagesText = item.pages_text || `${pagesCount} halaman`;

      return `
        <a href="materi-detail.html?id=${item.id}&kat=${currentActiveCategory}" class="white-item-card" style="margin: 0 16px 10px;">
          <div class="item-left-flex">
            <div class="item-square-thumb" style="background:${cat ? cat.iconColor : '#0D5BFF'}; color:#fff; display:flex; align-items:center; justify-content:center;">
              ${icon}
            </div>
            <div class="item-meta-col">
              <h4 class="item-title-text">${escapeHtml(item.judul)}</h4>
              <div class="item-sub-text">
                <span style="color:${cat ? cat.iconColor : '#0D5BFF'}; font-weight:700;">${escapeHtml(cat ? cat.name : (item.kategori || 'TKJ'))}</span>
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

  window.togglePlayVideo = function(id) {
    playingVideoId = playingVideoId === id ? null : id;
    renderVideoCards();
  };

  if (btnSearch && searchBox) {
    btnSearch.addEventListener('click', () => {
      if (!currentActiveCategory) {
        window.pilihKategoriVideo('mikrotik');
      }
      searchBox.style.display = searchBox.style.display === 'none' ? 'block' : 'none';
      if (searchBox.style.display === 'block' && inputSearch) inputSearch.focus();
    });
  }

  if (inputSearch) {
    inputSearch.addEventListener('input', () => {
      renderVideoCards();
    });
  }

  loadVideosAndMateri();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.initVideoPage);
} else {
  window.initVideoPage();
}
