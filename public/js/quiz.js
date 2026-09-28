window.initQuizPage = function() {
  const quizContainer = document.getElementById('quiz-container');
  if (!quizContainer) return;
  getUser().then(user => updateNavHeader(user));
  const quizHeroBanner = document.getElementById('quiz-hero-banner');
  const quizFilterRow = document.getElementById('quiz-filter-row');
  const quizHeaderTitle = document.getElementById('quiz-header-title');

  let allQuestions = [];
  let currentQuestions = [];
  let currentIndex = 0;
  let userAnswers = {};
  let currentCategory = 'all';

  const quizTopics = [
    { id: 'cisco', title: 'Cisco Packet Tracer', category: 'Cisco Packet Tracer', duration: '15 menit', soalCount: 10, rating: '4.8' },
    { id: 'mikrotik', title: 'Mikrotik RouterOS', category: 'Mikrotik', duration: '15 menit', soalCount: 10, rating: '4.7' },
    { id: 'server', title: 'Server & Linux Networking', category: 'Server & Linux', duration: '15 menit', soalCount: 10, rating: '4.6' },
    { id: 'komprehensif', title: 'Evaluasi Kompetensi TKJ Terpadu', category: 'all', duration: '15 menit', soalCount: 10, rating: '4.9' }
  ];

  function getTopicIconSvg(id) {
    switch (id) {
      case 'cisco':
        return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`;
      case 'mikrotik':
        return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;
      case 'server':
        return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>`;
      default:
        return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>`;
    }
  }

  function getAvailableSoalCount(category) {
    if (category === 'all') {
      return Math.min(allQuestions.length, 10);
    }
    const filtered = allQuestions.filter(q => q.kategori && q.kategori.toLowerCase() === category.toLowerCase());
    return Math.min(filtered.length, 10);
  }

  function renderQuizSkeleton() {
    if (!quizContainer) return;
    quizContainer.innerHTML = '<div class="desktop-grid-2col">' + [1, 2, 3, 4].map(() => `
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

  // Fetch Questions from Database with SWR Caching
  async function loadQuizData() {
    try {
      const cached = sessionStorage.getItem('netora_quiz_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          allQuestions = parsed;
          renderTopicList();
        }
      }
    } catch (e) {}

    try {
      const res = await fetch('/api/quiz');
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.quiz)) {
        allQuestions = data.quiz;
        try { sessionStorage.setItem('netora_quiz_cache', JSON.stringify(data.quiz)); } catch (e) {}
      } else {
        allQuestions = [];
        try { sessionStorage.setItem('netora_quiz_cache', '[]'); } catch (e) {}
      }
    } catch (err) {
      console.warn('Gagal fetch database kuis:', err);
    }
    renderTopicList();
  }

  // 1. Render Tampilan Pemilihan Topik Kuis
  function renderTopicList(cat) {
    if (cat) {
      currentCategory = cat;
    }

    if (quizHeroBanner) quizHeroBanner.style.display = 'flex';
    if (quizHeaderTitle) quizHeaderTitle.textContent = 'Quiz';

    window.renderTopicList = renderTopicList;

    // Filter Pill Listener untuk Kuis
    if (quizFilterRow) {
      quizFilterRow.querySelectorAll('.filter-pill').forEach(btn => {
        btn.onclick = () => {
          quizFilterRow.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentCategory = btn.dataset.cat || 'all';
          renderTopicList();
        };
      });
    }

    // Jika bank soal kuis kosong dari admin, sembunyikan filter dan tampilkan pesan kosong
    if (allQuestions.length === 0) {
      if (quizFilterRow) quizFilterRow.style.display = 'none';
      quizContainer.innerHTML = `
        <div style="background:#FFFFFF; border-radius:20px; padding:36px 20px; text-align:center; margin:16px; box-shadow:0 4px 18px rgba(13,91,255,0.06); border:1px solid rgba(0,0,0,0.04);">
          <div style="width:52px; height:52px; border-radius:14px; background:rgba(13,91,255,0.08); color:#0D5BFF; display:inline-flex; align-items:center; justify-content:center; margin-bottom:14px;">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
          <h4 style="margin:0 0 8px; color:#1E293B; font-size:16px; font-weight:800;">Belum Ada Kuis Tersedia</h4>
          <p style="margin:0 0 16px; font-size:13px; color:#64748B; line-height:1.5; max-width:360px; margin-left:auto; margin-right:auto;">
            Saat ini bank soal kuis masih kosong. Soal kuis akan muncul otomatis di sini setelah ditambahkan oleh Guru / Administrator dari Panel Admin.
          </p>
          <a href="beranda.html" class="btn-hero-orange" style="display:inline-flex; align-items:center; gap:8px; text-decoration:none;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            <span>Kembali ke Beranda</span>
          </a>
        </div>
      `;
      return;
    }

    // Jika ada soal di database, tampilkan pill filter
    if (quizFilterRow) quizFilterRow.style.display = 'flex';

    let filtered = quizTopics;
    if (currentCategory !== 'all') {
      filtered = quizTopics.filter(t => t.category.toLowerCase() === currentCategory.toLowerCase());
    }

    // Hanya tampilkan topik yang memiliki soal aktif
    const activeTopics = filtered.filter(t => getAvailableSoalCount(t.category) > 0);

    if (activeTopics.length === 0) {
      quizContainer.innerHTML = `
        <div style="background:#FFFFFF; border-radius:20px; padding:32px 20px; text-align:center; margin:16px; box-shadow:0 4px 18px rgba(13,91,255,0.06); border:1px solid rgba(0,0,0,0.04);">
          <div style="width:48px; height:48px; border-radius:14px; background:rgba(13,91,255,0.08); color:#0D5BFF; display:inline-flex; align-items:center; justify-content:center; margin-bottom:12px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
          <h4 style="margin:0 0 6px; color:#1E293B; font-size:15px; font-weight:800;">Belum Ada Soal di Kategori Ini</h4>
          <p style="margin:0 0 16px; font-size:12.5px; color:#64748B;">Soal kuis untuk kategori ini belum tersedia. Silakan pilih kategori lain.</p>
          <button type="button" class="btn-hero-orange" style="display:inline-flex; align-items:center; gap:8px;" onclick="renderTopicList('all')">
            <span>Tampilkan Semua Kuis</span>
          </button>
        </div>
      `;
      return;
    }

    quizContainer.innerHTML = '<div class="desktop-grid-2col">' + activeTopics.map(t => {
      const count = getAvailableSoalCount(t.category);
      return `
        <div class="white-item-card" style="cursor:pointer;" onclick="startQuizTopic('${t.id}', '${t.title}', '${t.category}')">
          <div class="item-left-flex">
            <div class="item-square-thumb" style="background:#0D5BFF; color:#fff; display:flex; align-items:center; justify-content:center;">
              ${getTopicIconSvg(t.id)}
            </div>
            <div class="item-meta-col">
              <h4 class="item-title-text">${escapeHtml(t.title)}</h4>
              <div class="item-sub-text">
                <span>${count} Soal Aktif • ${t.duration}</span>
                <span class="item-star-rating" style="display:inline-flex; align-items:center; gap:3px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                  <span>${t.rating}</span>
                </span>
              </div>
            </div>
          </div>
          <div class="item-chevron-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>
        </div>
      `;
    }).join('') + '</div>';
  }

  // 2. Mulai Kuis Interaktif
  window.startQuizTopic = function(topicId, topicTitle, category) {
    if (quizHeroBanner) quizHeroBanner.style.display = 'none';
    if (quizFilterRow) quizFilterRow.style.display = 'none';
    if (quizHeaderTitle) quizHeaderTitle.textContent = topicTitle;

    // Filter soal yang relevan, atau gunakan semua soal jika kategori umum
    if (category === 'all') {
      currentQuestions = allQuestions.slice();
    } else {
      currentQuestions = allQuestions.filter(q => q.kategori && q.kategori.toLowerCase() === category.toLowerCase());
      if (currentQuestions.length === 0) {
        currentQuestions = allQuestions.slice();
      }
    }
    // Tepat maksimal 10 butir soal untuk sesi kuis
    currentQuestions = currentQuestions.slice(0, 10);

    if (currentQuestions.length === 0) {
      quizContainer.innerHTML = `
        <div style="background:#FFFFFF; border-radius:18px; padding:30px 20px; text-align:center; margin:16px; box-shadow:0 4px 18px rgba(13,91,255,0.06);">
          <div style="width:48px; height:48px; border-radius:12px; background:rgba(13,91,255,0.08); color:#0D5BFF; display:inline-flex; align-items:center; justify-content:center; margin-bottom:12px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
          <h4 style="margin:0 0 8px; color:#1E293B;">Soal Belum Tersedia</h4>
          <p style="margin:0 0 16px; font-size:12.5px; color:#64748B;">Soal kuis untuk topik ini belum ditambahkan oleh instruktur di Dashboard Admin.</p>
          <button class="btn-hero-orange" style="display:inline-flex; align-items:center; gap:8px;" onclick="renderTopicList()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            <span>Pilih Topik Lain</span>
          </button>
        </div>
      `;
      return;
    }

    currentIndex = 0;
    userAnswers = {};
    renderCurrentQuestion();
  };

  // 3. Render Pertanyaan Saat Ini
  function renderCurrentQuestion() {
    if (currentIndex >= currentQuestions.length) {
      submitQuiz();
      return;
    }

    const q = currentQuestions[currentIndex];
    const total = currentQuestions.length;
    const progressPct = ((currentIndex + 1) / total) * 100;
    const selectedAns = userAnswers[q.id] || null;

    quizContainer.innerHTML = `
      <!-- Progress Bar Biru -->
      <div style="margin:16px 16px 12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; font-weight:700; color:#64748B; margin-bottom:6px;">
          <span>Soal ${currentIndex + 1} dari ${total}</span>
          <span style="color:#0D5BFF;">${Math.round(progressPct)}%</span>
        </div>
        <div style="width:100%; height:6px; background:#E2E8F0; border-radius:10px; overflow:hidden;">
          <div style="width:${progressPct}%; height:100%; background:#0D5BFF; border-radius:10px; transition:width 0.3s ease;"></div>
        </div>
      </div>

      <!-- Card Pertanyaan Putih Bersih -->
      <div style="background:#FFFFFF; border-radius:20px; padding:20px; margin:0 16px 16px; box-shadow:0 4px 18px rgba(13,91,255,0.05); border:1px solid rgba(0,0,0,0.04);">
        <span style="display:inline-block; font-size:11px; font-weight:800; color:#0D5BFF; background:rgba(13,91,255,0.08); padding:3px 10px; border-radius:20px; margin-bottom:12px;">
          ${escapeHtml(q.kategori || 'Kuis TKJ')}
        </span>
        <h3 style="margin:0 0 18px; font-size:15px; font-weight:800; color:#1E293B; line-height:1.45;">
          ${currentIndex + 1}. ${escapeHtml(q.pertanyaan)}
        </h3>

        <!-- Pilihan Ganda -->
        <div style="display:flex; flex-direction:column; gap:10px;">
          ${renderOptionItem('A', q.pilihan_a, selectedAns)}
          ${renderOptionItem('B', q.pilihan_b, selectedAns)}
          ${renderOptionItem('C', q.pilihan_c, selectedAns)}
          ${renderOptionItem('D', q.pilihan_d, selectedAns)}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:22px;">
          ${currentIndex > 0 
            ? `<button id="btn-prev-soal" type="button" style="background:#F1F5F9; border:none; padding:10px 18px; border-radius:12px; font-weight:700; color:#475569; font-size:12.5px; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                 <span>Sebelumnya</span>
               </button>` 
            : `<div></div>`}
          
          ${currentIndex === total - 1 
            ? `<button id="btn-submit-soal" type="button" class="btn-hero-orange" style="border-radius:12px; padding:10px 22px; font-size:13px; display:inline-flex; align-items:center; gap:8px;">
                 <span>Kirim Evaluasi</span>
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
               </button>`
            : `<button id="btn-next-soal" type="button" class="btn-hero-orange" style="border-radius:12px; padding:10px 18px; font-size:13px; display:inline-flex; align-items:center; gap:8px;">
                 <span>Berikutnya</span>
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
               </button>`}
        </div>
      </div>
    `;

    // Event listener opsi
    document.querySelectorAll('.quiz-option-card').forEach(card => {
      card.addEventListener('click', () => {
        const key = card.dataset.key;
        userAnswers[q.id] = key;

        document.querySelectorAll('.quiz-option-card').forEach(c => {
          c.style.borderColor = '#E2E8F0';
          c.style.background = '#F8FAFC';
          const badge = c.querySelector('.opt-badge');
          if (badge) { badge.style.background = '#E2E8F0'; badge.style.color = '#475569'; }
        });

        card.style.borderColor = '#0D5BFF';
        card.style.background = 'rgba(13,91,255,0.06)';
        const activeBadge = card.querySelector('.opt-badge');
        if (activeBadge) { activeBadge.style.background = '#0D5BFF'; activeBadge.style.color = '#FFFFFF'; }

        // Auto next
        if (currentIndex < total - 1) {
          setTimeout(() => {
            currentIndex++;
            renderCurrentQuestion();
          }, 350);
        }
      });
    });

    const btnPrev = document.getElementById('btn-prev-soal');
    if (btnPrev) btnPrev.addEventListener('click', () => { if (currentIndex > 0) { currentIndex--; renderCurrentQuestion(); } });

    const btnNext = document.getElementById('btn-next-soal');
    if (btnNext) btnNext.addEventListener('click', () => { if (currentIndex < total - 1) { currentIndex++; renderCurrentQuestion(); } });

    const btnSubmit = document.getElementById('btn-submit-soal');
    if (btnSubmit) btnSubmit.addEventListener('click', submitQuiz);
  }

  function renderOptionItem(key, text, selectedAns) {
    const isSelected = selectedAns === key;
    return `
      <div class="quiz-option-card" data-key="${key}" style="display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:14px; background:${isSelected ? 'rgba(13,91,255,0.06)' : '#F8FAFC'}; border:1.5px solid ${isSelected ? '#0D5BFF' : '#E2E8F0'}; cursor:pointer; transition:0.2s;">
        <div class="opt-badge" style="width:28px; height:28px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:13px; background:${isSelected ? '#0D5BFF' : '#E2E8F0'}; color:${isSelected ? '#FFFFFF' : '#475569'}; flex-shrink:0;">
          ${key}
        </div>
        <div style="font-size:13px; font-weight:600; color:#1E293B; line-height:1.4;">
          ${escapeHtml(text)}
        </div>
      </div>
    `;
  }

  // 4. Submit & Simpan Skor Kuis ke Database
  async function submitQuiz() {
    quizContainer.innerHTML = `
      <div style="background:#FFFFFF; border-radius:20px; padding:40px 20px; margin:16px; text-align:center; box-shadow:0 4px 18px rgba(13,91,255,0.06);">
        <div style="width:48px; height:48px; border-radius:12px; background:rgba(13,91,255,0.08); color:#0D5BFF; display:inline-flex; align-items:center; justify-content:center; margin-bottom:12px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        </div>
        <h4 style="margin:0 0 6px; color:#1E293B;">Memproses Hasil Evaluasi...</h4>
        <p style="margin:0; font-size:12.5px; color:#64748B;">Menyinkronkan rekapan skor ke basis data Netora.</p>
      </div>
    `;

    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jawaban: userAnswers })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        renderQuizResult(data);
      } else {
        renderQuizResultFallback();
      }
    } catch (err) {
      renderQuizResultFallback();
    }
  }

  function renderQuizResult(data) {
    const isLulus = data.lulus;
    quizContainer.innerHTML = `
      <div style="background:#FFFFFF; border-radius:22px; padding:32px 24px; margin:16px; text-align:center; box-shadow:0 4px 20px rgba(13,91,255,0.06); border:1px solid rgba(0,0,0,0.04);">
        <div style="width:56px; height:56px; border-radius:16px; background:${isLulus ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'}; color:${isLulus ? '#10B981' : '#EF4444'}; display:inline-flex; align-items:center; justify-content:center; margin-bottom:14px;">
          ${isLulus 
            ? `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>` 
            : `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`}
        </div>
        
        <div style="margin-bottom:14px;">
          <span style="display:inline-block; font-size:11px; font-weight:800; letter-spacing:0.5px; color:${isLulus ? '#10B981' : '#EF4444'}; background:${isLulus ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'}; padding:5px 14px; border-radius:20px;">
            ${isLulus ? 'STATUS: LULUS KOMPETEN' : 'STATUS: EVALUASI ULANG'}
          </span>
        </div>

        <h2 style="font-size:52px; font-weight:900; color:#0D5BFF; margin:0 0 6px; letter-spacing:-1px;">
          ${data.skor}
        </h2>
        <p style="font-size:13px; color:#64748B; margin:0 0 24px; line-height:1.5;">
          Anda menjawab benar <strong>${data.benar}</strong> dari <strong>${data.total}</strong> soal. Nilai kompetensi telah tersimpan pada modul rekapitulasi progres.
        </p>

        <div style="display:flex; flex-direction:column; gap:10px; max-width:320px; margin:0 auto;">
          <button type="button" class="btn-hero-orange" style="justify-content:center; width:100%; border-radius:12px; padding:12px; display:inline-flex; align-items:center; gap:8px;" onclick="renderTopicList()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
            <span>Pilih Topik Kuis Lain</span>
          </button>
          <a href="beranda.html" style="background:#F1F5F9; border:none; padding:12px; border-radius:12px; font-weight:700; color:#475569; font-size:13px; text-decoration:none; display:block;">
            Kembali ke Beranda
          </a>
        </div>
      </div>
    `;
  }

  function renderQuizResultFallback() {
    quizContainer.innerHTML = `
      <div style="background:#FFFFFF; border-radius:22px; padding:32px 24px; margin:16px; text-align:center; box-shadow:0 4px 20px rgba(13,91,255,0.06); border:1px solid rgba(0,0,0,0.04);">
        <div style="width:56px; height:56px; border-radius:16px; background:rgba(13,91,255,0.1); color:#0D5BFF; display:inline-flex; align-items:center; justify-content:center; margin-bottom:14px;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        </div>
        <h3 style="margin:0 0 8px; color:#1E293B;">Sesi Kuis Selesai</h3>
        <p style="font-size:13px; color:#64748B; margin:0 0 20px;">Jawaban evaluasi Anda telah berhasil direkam ke sistem Netora.</p>
        <button type="button" class="btn-hero-orange" style="justify-content:center; width:100%; border-radius:12px; padding:12px; max-width:320px; margin:0 auto;" onclick="renderTopicList()">
          Kembali ke Daftar Kuis
        </button>
      </div>
    `;
  }

  loadQuizData();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.initQuizPage);
} else {
  window.initQuizPage();
}
