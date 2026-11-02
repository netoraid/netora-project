window.initMateriPage = async function() {
  const materiContainer = document.getElementById('materi-container');
  const detailContainer = document.getElementById('materi-detail-container');
  if (!materiContainer && !detailContainer) return;

  if (typeof getUser === 'function') {
    getUser().then(user => {
      if (typeof updateNavHeader === 'function') updateNavHeader(user);
    });
  }

  // Definisi Master 3 Kategori Pembelajaran NETORA
  const CATEGORIES = {
    'mikrotik': {
      id: 'mikrotik',
      name: 'MikroTik',
      badgeText: 'RouterOS & Network Admin',
      desc: 'Pelajari konfigurasi RouterOS, manajemen bandwidth Simple Queue & Queue Tree, Hotspot, NAT Firewall, serta Winbox.',
      iconColor: '#0D5BFF',
      iconBg: 'rgba(13, 91, 255, 0.1)',
      icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`
    },
    'cisco': {
      id: 'cisco',
      name: 'Cisco Packet Tracer',
      badgeText: 'Simulasi & Topologi Switch/Router',
      desc: 'Simulasi interaktif jaringan komputer, konfigurasi VLAN, VTP, Trunking Switch Layer 2/3, STP, dan protokol routing Cisco IOS.',
      iconColor: '#0284C7',
      iconBg: 'rgba(2, 132, 199, 0.1)',
      icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line><path d="M6 8h12"></path><path d="M6 12h8"></path></svg>`
    },
    'server-linux': {
      id: 'server-linux',
      name: 'Server dan Linux',
      badgeText: 'Sistem Operasi & Layanan Server',
      desc: 'Administrasi Linux Debian/Ubuntu Server, manajemen service Nginx/Apache Web Server, SSH Remote, konfigurasi DNS, dan hosting.',
      iconColor: '#10B981',
      iconBg: 'rgba(16, 185, 129, 0.1)',
      icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>`
    }
  };

  // Helper Pemetaan Kategori Dinamis & Kompatibel (Anti-salah eja di database)
  function getMateriCategoryKey(m) {
    const k = (m.kategori || '').toLowerCase().trim();
    const t = (m.judul || '').toLowerCase().trim();
    const combined = k + ' ' + t;

    if (k.includes('cisco') || combined.includes('cisco') || combined.includes('packet tracer') || combined.includes('vlan') || combined.includes('trunking')) {
      return 'cisco';
    }
    if (k.includes('mikro') || combined.includes('mikrotik') || combined.includes('routeros') || combined.includes('winbox') || combined.includes('queue')) {
      return 'mikrotik';
    }
    if (k.includes('server') || k.includes('linux') || combined.includes('linux') || combined.includes('debian') || combined.includes('ubuntu') || combined.includes('nginx') || combined.includes('ssh')) {
      return 'server-linux';
    }
    return 'mikrotik'; // fallback default
  }

  let allMateri = [];
  let allVideos = [];
  let playingVideoId = null;
  let currentActiveCategory = null;

  const btnSearch = document.getElementById('btn-search-materi');
  const searchBox = document.getElementById('search-materi-box');
  const inputSearch = document.getElementById('input-search-materi');
  const videoContainer = document.getElementById('video-container-materi');

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

  function renderMateriSkeleton() {
    if (materiContainer) {
      materiContainer.innerHTML = '<div class="desktop-grid-2col">' + [1, 2, 3, 4].map(() => `
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
    if (videoContainer) {
      videoContainer.innerHTML = '<div class="desktop-grid-2col">' + [1, 2].map(() => `
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
  }

  // 1. Logika Halaman Katalog Materi (materi.html)
  if (materiContainer) {

    function updateCategoryBadges() {
      const countMateriMikrotik = allMateri.filter(m => getMateriCategoryKey(m) === 'mikrotik').length;
      const countMateriCisco = allMateri.filter(m => getMateriCategoryKey(m) === 'cisco').length;
      const countMateriServer = allMateri.filter(m => getMateriCategoryKey(m) === 'server-linux').length;

      const countVideoMikrotik = allVideos.filter(v => getMateriCategoryKey(v) === 'mikrotik').length;
      const countVideoCisco = allVideos.filter(v => getMateriCategoryKey(v) === 'cisco').length;
      const countVideoServer = allVideos.filter(v => getMateriCategoryKey(v) === 'server-linux').length;

      const badgeMikrotik = document.getElementById('badge-count-mikrotik');
      const badgeCisco = document.getElementById('badge-count-cisco');
      const badgeServer = document.getElementById('badge-count-server-linux');

      if (badgeMikrotik) {
        badgeMikrotik.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg><span>${countMateriMikrotik} Modul • ${countVideoMikrotik} Vidio</span>`;
      }
      if (badgeCisco) {
        badgeCisco.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg><span>${countMateriCisco} Modul • ${countVideoCisco} Vidio</span>`;
      }
      if (badgeServer) {
        badgeServer.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg><span>${countMateriServer} Modul • ${countVideoServer} Vidio</span>`;
      }
    }

    window.pilihKategoriMateri = function(catKey, pushState = true) {
      let normalizedKey = String(catKey || '').toLowerCase().trim();
      if (!CATEGORIES[normalizedKey]) {
        if (/cisco/i.test(normalizedKey)) normalizedKey = 'cisco';
        else if (/server|linux/i.test(normalizedKey)) normalizedKey = 'server-linux';
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
      const kategoriSec = document.getElementById('materi-kategori-section');
      const listSec = document.getElementById('materi-list-section');
      const heroCard = document.getElementById('materi-hero-card');
      const topBackBtn = document.getElementById('materi-top-back-btn');
      const headerTitle = document.getElementById('materi-header-title');

      if (kategoriSec) kategoriSec.style.display = 'none';
      if (listSec) listSec.style.display = 'block';
      if (heroCard) heroCard.style.display = 'none';

      if (topBackBtn) {
        topBackBtn.onclick = (e) => {
          e.preventDefault();
          window.kembaliKeKategori();
        };
        topBackBtn.title = 'Kembali ke Pilihan Kategori';
      }

      if (headerTitle) {
        headerTitle.textContent = `Materi & Vidio ${cat.name}`;
      }

      // Update Banner Info Kategori Aktif
      const catIcon = document.getElementById('cat-active-icon');
      const catTitle = document.getElementById('cat-active-title');
      const catDesc = document.getElementById('cat-active-desc');

      if (catIcon) {
        catIcon.innerHTML = cat.icon;
        catIcon.style.color = cat.iconColor;
        catIcon.style.background = cat.iconBg;
      }
      if (catTitle) {
        catTitle.textContent = `Kategori: ${cat.name}`;
      }
      if (catDesc) {
        const totalMateri = allMateri.filter(m => getMateriCategoryKey(m) === normalizedKey).length;
        const totalVideo = allVideos.filter(v => getMateriCategoryKey(v) === normalizedKey).length;
        catDesc.textContent = `${cat.desc} (${totalMateri} Modul Pembelajaran • ${totalVideo} Vidio Praktik)`;
      }

      renderMateriCards();
      renderVideoCards();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.kembaliKeKategori = function(pushState = true) {
      currentActiveCategory = null;
      playingVideoId = null;

      if (pushState) {
        try {
          window.history.pushState({}, '', window.location.pathname);
        } catch(e) {}
      }

      const kategoriSec = document.getElementById('materi-kategori-section');
      const listSec = document.getElementById('materi-list-section');
      const heroCard = document.getElementById('materi-hero-card');
      const topBackBtn = document.getElementById('materi-top-back-btn');
      const headerTitle = document.getElementById('materi-header-title');

      if (kategoriSec) kategoriSec.style.display = 'block';
      if (listSec) listSec.style.display = 'none';
      if (heroCard) heroCard.style.display = 'flex';

      if (topBackBtn) {
        topBackBtn.onclick = null;
        topBackBtn.href = 'beranda.html';
        topBackBtn.title = 'Kembali ke Beranda';
      }

      if (headerTitle) {
        headerTitle.textContent = 'Materi';
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
        window.pilihKategoriMateri(cat, false);
      } else {
        window.kembaliKeKategori(false);
      }
    });

    async function loadMateri(isSilent = false) {
      if (!isSilent && (!allMateri || allMateri.length === 0)) {
        renderMateriSkeleton();
      }

      // 1. Cek cache lokal di sessionStorage untuk render kilat
      try {
        const cachedMateri = sessionStorage.getItem('netora_materi_cache');
        if (cachedMateri) {
          const parsed = JSON.parse(cachedMateri);
          if (Array.isArray(parsed) && parsed.length > 0) allMateri = parsed;
        }
        const cachedVideo = sessionStorage.getItem('netora_video_cache');
        if (cachedVideo) {
          const parsedV = JSON.parse(cachedVideo);
          if (Array.isArray(parsedV) && parsedV.length > 0) allVideos = parsedV;
        }
        if (allMateri.length > 0 || allVideos.length > 0) {
          updateCategoryBadges();
          if (currentActiveCategory) {
            renderMateriCards();
            renderVideoCards();
          }
        }
      } catch (e) {}

      // 2. Fetch data mutakhir materi & video dari API Supabase secara paralel
      try {
        const [resMateri, resVideo] = await Promise.all([
          fetch('/api/materi?t=' + Date.now()).catch(() => null),
          fetch('/api/video?t=' + Date.now()).catch(() => null)
        ]);

        if (resMateri && resMateri.ok) {
          const dataM = await resMateri.json();
          if (dataM.success && Array.isArray(dataM.materi)) {
            allMateri = dataM.materi;
            try { sessionStorage.setItem('netora_materi_cache', JSON.stringify(dataM.materi)); } catch (e) {}
          }
        }

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

        updateCategoryBadges();

        // Cek URL apakah langsung membuka kategori tertentu
        const urlParams = new URLSearchParams(window.location.search);
        const initialCat = urlParams.get('kategori') || urlParams.get('kat');
        if (initialCat) {
          window.pilihKategoriMateri(initialCat, false);
        } else if (currentActiveCategory) {
          renderMateriCards();
          renderVideoCards();
        }
      } catch (err) {
        console.warn('Gagal memuat materi/video dari API:', err);
      }
    }

    window.refreshMateriData = () => loadMateri(true);
    window.loadMateri = loadMateri;

    function renderMateriCards() {
      if (!currentActiveCategory || !materiContainer) return;

      const q = (inputSearch ? inputSearch.value : '').toLowerCase().trim();
      const cat = CATEGORIES[currentActiveCategory];

      // Filter materi berdasarkan kategori aktif
      let list = allMateri.filter(m => getMateriCategoryKey(m) === currentActiveCategory);

      if (q) {
        list = list.filter(m => m.judul.toLowerCase().includes(q) || (m.preview || '').toLowerCase().includes(q));
      }

      const countBadge = document.getElementById('cat-badge-materi-count');
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
              ${q ? `Tidak ada materi yang cocok dengan pencarian "${escapeHtml(q)}".` : `Modul pembelajaran khusus ${cat ? cat.name : 'kategori ini'} yang diunggah Guru / Admin akan otomatis tampil di sini.`}
            </p>
          </div>
        `;
        return;
      }

      materiContainer.innerHTML = '<div class="desktop-grid-2col netora-fade-in">' + list.map((item) => {
        const icon = cat ? cat.icon : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
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

    function renderVideoCards() {
      if (!currentActiveCategory || !videoContainer) return;

      const q = (inputSearch ? inputSearch.value : '').toLowerCase().trim();
      const cat = CATEGORIES[currentActiveCategory];

      // Filter video berdasarkan kategori aktif
      let list = allVideos.filter(v => getMateriCategoryKey(v) === currentActiveCategory);

      if (q) {
        list = list.filter(v => v.judul.toLowerCase().includes(q) || (v.deskripsi || '').toLowerCase().includes(q));
      }

      const countBadge = document.getElementById('cat-badge-video-count');
      if (countBadge) countBadge.textContent = `${list.length} Vidio`;

      if (list.length === 0) {
        videoContainer.innerHTML = `
          <div class="netora-fade-in" style="text-align:center; padding:32px 18px; background:#FFFFFF; border-radius:18px; margin:0 16px 12px; border:1.5px dashed #CBD5E1; box-shadow:0 2px 12px rgba(15,23,42,0.02);">
            <div style="width:48px; height:48px; border-radius:14px; background:rgba(239,68,68,0.08); color:#DC2626; display:inline-flex; align-items:center; justify-content:center; margin-bottom:10px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
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
            <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:14px 16px; cursor:pointer;" onclick="togglePlayMateriVideo(${v.id})">
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
                    <span style="color:#DC2626; font-weight:700;">${escapeHtml(cat ? cat.name : (v.kategori || 'Praktikum'))}</span>
                    <span>•</span>
                    <span>${escapeHtml(v.durasi || '15:00')}</span>
                  </div>
                </div>
              </div>
              <div class="item-chevron-icon" style="transform:${isPlaying ? 'rotate(90deg)' : 'none'}; transition:0.2s; display:flex; align-items:center;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </div>
            </div>

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

    window.togglePlayMateriVideo = function(id) {
      playingVideoId = playingVideoId === id ? null : id;
      renderVideoCards();
    };

    // Toggle Kotak Pencarian
    if (btnSearch && searchBox) {
      btnSearch.addEventListener('click', () => {
        if (!currentActiveCategory) {
          window.pilihKategoriMateri('mikrotik');
        }
        searchBox.style.display = searchBox.style.display === 'none' ? 'block' : 'none';
        if (searchBox.style.display === 'block' && inputSearch) inputSearch.focus();
      });
    }

    if (inputSearch) {
      inputSearch.addEventListener('input', () => {
        renderMateriCards();
        renderVideoCards();
      });
    }

    // Jalankan pemuatan awal
    loadMateri();
  }

  // Preset Icon Mapping (SVG)
  function getMateriIcon(kategori, judul) {
    const text = ((kategori || '') + ' ' + (judul || '')).toLowerCase();
    if (text.includes('cisco') || text.includes('packet tracer') || text.includes('switch') || text.includes('vlan')) {
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line><path d="M6 8h12"></path><path d="M6 12h8"></path></svg>`;
    }
    if (text.includes('mikrotik') || text.includes('router') || text.includes('queue') || text.includes('bandwidth')) {
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;
    }
    if (text.includes('linux') || text.includes('server') || text.includes('nginx') || text.includes('ssh') || text.includes('debian') || text.includes('ubuntu')) {
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>`;
    }
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
  }

  // 2. Halaman Detail Materi (materi-detail.html)
  if (detailContainer) {
    const urlParams = new URLSearchParams(window.location.search);
    const materiId = urlParams.get('id');
    const requestedPage = parseInt(urlParams.get('page')) || null;
    const fromKat = urlParams.get('kat') || urlParams.get('kategori') || '';

    // Selaraskan tombol kembali pada header atas jika siswa datang dari kategori tertentu
    const topBackBtn = document.querySelector('.subpage-back-btn');
    if (topBackBtn && fromKat) {
      topBackBtn.href = `materi.html?kategori=${encodeURIComponent(fromKat)}`;
      topBackBtn.title = 'Kembali ke Kategori Materi';
    }

    const actionCatalogBtn = document.querySelector('.subpage-action-btn');
    if (actionCatalogBtn && fromKat) {
      actionCatalogBtn.href = `materi.html?kategori=${encodeURIComponent(fromKat)}`;
      actionCatalogBtn.title = 'Kembali ke Katalog Kategori';
    }

    if (!materiId) {
      window.location.href = fromKat ? `materi.html?kategori=${encodeURIComponent(fromKat)}` : 'materi.html';
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

        // Helper render konten terstruktur / rich text aman & responsif
        function formatMateriContent(raw) {
          if (!raw) return '<p style="color:#94A3B8; font-style:italic;">Belum ada konten pada halaman ini.</p>';
          let str = String(raw).trim();
          
          // Hapus semua tag figcaption / keterangan nama file gambar di tampilan user
          str = str.replace(/<figcaption[^>]*>[\s\S]*?<\/figcaption>/gi, '');

          // Jika teks mengandung tag HTML terstruktur
          if (/<(p|img|h2|h3|h4|ul|ol|li|pre|code|figure|div|table|strong|em|b|i|u)/i.test(str)) {
            return str;
          }
          // Fallback jika berupa teks biasa (konversi baris baru menjadi paragraf rapi)
          return str.split('\n').filter(l => l.trim()).map(l => `<p>${escapeHtml(l)}</p>`).join('');
        }

        // Helper Lightbox Fullscreen Zoom Gambar untuk Siswa di HP & Desktop
        function openMateriLightbox(src, alt) {
          let modal = document.getElementById('materi-lightbox-modal');
          if (!modal) {
            modal = document.createElement('div');
            modal.id = 'materi-lightbox-modal';
            modal.className = 'materi-lightbox-modal';
            modal.innerHTML = `
              <button type="button" class="materi-lightbox-close" title="Tutup (Esc)">&times;</button>
              <img id="materi-lightbox-img" src="" alt="Zoom Materi">
              <div class="materi-lightbox-hint">Ketuk di mana saja untuk menutup</div>
            `;
            document.body.appendChild(modal);

            modal.addEventListener('click', () => {
              modal.style.display = 'none';
            });
            const closeBtn = modal.querySelector('.materi-lightbox-close');
            if (closeBtn) {
              closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                modal.style.display = 'none';
              });
            }
            document.addEventListener('keydown', (e) => {
              if (e.key === 'Escape' && modal.style.display !== 'none') {
                modal.style.display = 'none';
              }
            });
          }

          const imgEl = modal.querySelector('#materi-lightbox-img');
          if (imgEl) {
            imgEl.src = src;
            imgEl.alt = alt || 'Preview Pembesaran Gambar Materi';
          }
          modal.style.display = 'flex';
        }

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

                <!-- Konten Materi Kaya Format & Responsif Mobile -->
                <div class="materi-rich-content">
                  ${formatMateriContent(currentPageData.konten || '')}
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
                      <a href="${fromKat ? `materi.html?kategori=${encodeURIComponent(fromKat)}` : 'materi.html'}" class="btn-primary" style="flex:1; padding:12px 14px; font-size:13.5px; font-weight:800; border-radius:14px; display:inline-flex; align-items:center; justify-content:center; gap:8px; text-decoration:none; background:#0D5BFF; color:#FFFFFF; box-shadow:0 4px 14px rgba(13,91,255,0.25);">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        <span>Selesai Membaca Modul</span>
                      </a>
                    `}
                  </div>

                </div>

              </div>
            </div>
          `;

          // Event Listener: Lightbox Zoom saat siswa mengetuk/klik gambar di HP / Desktop
          detailContainer.querySelectorAll('.materi-rich-content img').forEach(img => {
            img.addEventListener('click', (e) => {
              e.stopPropagation();
              openMateriLightbox(img.src, img.alt);
            });
          });

          // Event Listener: Tambahkan tombol "📋 Salin Script" pada blok kode CLI TKJ
          detailContainer.querySelectorAll('.materi-rich-content pre').forEach(pre => {
            if (!pre.querySelector('.btn-copy-code')) {
              const copyBtn = document.createElement('button');
              copyBtn.type = 'button';
              copyBtn.className = 'btn-copy-code';
              copyBtn.innerHTML = '📋 Salin Script';
              copyBtn.style.cssText = 'position:absolute; top:8px; right:8px; background:rgba(255,255,255,0.18); border:1px solid rgba(255,255,255,0.28); color:#FFFFFF; font-size:11px; font-weight:700; padding:4px 9px; border-radius:6px; cursor:pointer; transition:all 0.2s;';
              copyBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const codeNode = pre.querySelector('code') || pre;
                const codeText = codeNode.innerText.replace('📋 Salin Script', '').replace('✓ Tersalin!', '').trim();
                try {
                  await navigator.clipboard.writeText(codeText);
                  copyBtn.innerHTML = '✓ Tersalin!';
                  copyBtn.style.background = '#16A34A';
                  setTimeout(() => {
                    copyBtn.innerHTML = '📋 Salin Script';
                    copyBtn.style.background = 'rgba(255,255,255,0.18)';
                  }, 2000);
                } catch (err) {}
              });
              pre.appendChild(copyBtn);
            }
          });

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

          // Dukungan Geser / Swipe Layar HP Tanpa Tombol (Gesture Buku)
          let touchStartX = 0;
          let touchStartY = 0;
          detailContainer.ontouchstart = (e) => {
            if (e.changedTouches && e.changedTouches[0]) {
              touchStartX = e.changedTouches[0].screenX;
              touchStartY = e.changedTouches[0].screenY;
            }
          };
          detailContainer.ontouchend = (e) => {
            if (e.changedTouches && e.changedTouches[0]) {
              const diffX = e.changedTouches[0].screenX - touchStartX;
              const diffY = e.changedTouches[0].screenY - touchStartY;
              // Swipe horizontal jelas (minimal 55px horizontal dan deviasi vertikal rendah)
              if (Math.abs(diffX) > 55 && Math.abs(diffY) < 60) {
                if (diffX < 0 && activePage < totalPages) {
                  // Geser ke kiri -> Halaman Berikutnya
                  renderReaderView(activePage + 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                } else if (diffX > 0 && activePage > 1) {
                  // Geser ke kanan -> Halaman Sebelumnya
                  renderReaderView(activePage - 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }
            }
          };
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
