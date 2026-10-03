window.initProfilPage = async function() {
  const profileNama = document.getElementById('profile-nama');
  const editNama = document.getElementById('edit-nama');
  if (!profileNama && !editNama) return;

  // 1. Controller Tab Switching Sinkron & Instan (0ms delay)
  function setupProfilTabs() {
    const tabBtns = document.querySelectorAll('.profil-tab-btn');
    const tabPanels = document.querySelectorAll('.profil-tab-content');

    // Sembunyikan panel non-aktif secara default seketika
    tabPanels.forEach(p => {
      if (!p.classList.contains('active')) {
        p.style.display = 'none';
      } else {
        p.style.display = 'block';
      }
    });

    tabBtns.forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const targetId = btn.dataset.tab;
        tabBtns.forEach(b => {
          b.classList.remove('active');
          b.style.background = 'transparent';
          b.style.color = '#64748B';
          b.style.boxShadow = 'none';
        });
        tabPanels.forEach(p => {
          p.classList.remove('active');
          p.style.display = 'none';
        });

        btn.classList.add('active');
        btn.style.background = '#FFFFFF';
        btn.style.color = '#0D5BFF';
        btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';

        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          targetEl.classList.add('active');
          targetEl.style.display = 'block';
        }
      };
    });
  }
  setupProfilTabs();

  if (window.location.hash === '#progress') {
    if (typeof window.netoraNavigate === 'function') {
      window.netoraNavigate('progres.html');
    } else {
      window.location.href = 'progres.html';
    }
    return;
  }

  function applyUserFields(u) {
    if (!u) return;
    const profileImg = document.getElementById('profile-img');
    const profileEmail = document.getElementById('profile-email');
    const profileJoined = document.getElementById('profile-joined');
    const profilRoleBadge = document.getElementById('profile-role-badge');
    const profilHeaderTitle = document.getElementById('profil-header-title');
    const profileDeleteLabel = document.getElementById('profile-delete-label');
    const btnHapusAkun = document.getElementById('btn-hapus-akun');
    const editEmail = document.getElementById('edit-email');
    const editBio = document.getElementById('edit-bio');

    if (profileNama) profileNama.textContent = u.nama || 'Pengguna Netora';
    if (profileEmail) profileEmail.textContent = u.email || '';
    if (profileImg && u.foto) profileImg.src = u.foto;
    if (profileJoined && u.created_at) {
      const tgl = typeof formatTanggal === 'function' ? formatTanggal(u.created_at) : u.created_at;
      profileJoined.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:4px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg><span>Bergabung sejak ${tgl}</span>`;
    }

    // Role-adaptive text
    if (u.role === 'guru') {
      if (profilHeaderTitle) profilHeaderTitle.textContent = 'Profil Guru';
      if (profilRoleBadge) profilRoleBadge.textContent = 'Guru Pembimbing TKJ';
      if (profileDeleteLabel) profileDeleteLabel.textContent = 'Hapus Akun Guru';
    } else if (u.role === 'admin') {
      if (profilHeaderTitle) profilHeaderTitle.textContent = 'Profil Administrator';
      if (profilRoleBadge) profilRoleBadge.textContent = 'Administrator Netora';
      if (profileDeleteLabel) profileDeleteLabel.textContent = 'Hapus Akun Admin';
      if (btnHapusAkun) btnHapusAkun.style.display = 'none';
    } else {
      if (profilHeaderTitle) profilHeaderTitle.textContent = 'Profil Siswa';
      if (profilRoleBadge) profilRoleBadge.textContent = 'Akun Siswa Netora';
      if (profileDeleteLabel) profileDeleteLabel.textContent = 'Hapus Akun Siswa';
    }

    if (editNama) editNama.value = u.nama || '';
    if (editEmail) editEmail.value = u.email || '';
    if (editBio) editBio.value = u.bio || '';
  }

  // Prefill Instan dari cached session
  try {
    const stored = sessionStorage.getItem('netora_user_cache');
    if (stored) {
      const u = JSON.parse(stored);
      applyUserFields(u);
    }
  } catch(e) {}

  let user = null;
  try {
    user = typeof requireLogin === 'function' ? await requireLogin() : (typeof getUser === 'function' ? await getUser() : null);
  } catch(e) {
    console.warn('Auth check error in profil:', e);
  }
  if (!user) return;
  applyUserFields(user);

  const profileImg = document.getElementById('profile-img');
  const inputFoto = document.getElementById('input-foto');
  const formUpdate = document.getElementById('form-update-profil');
  const formPass = document.getElementById('form-ganti-pass');
  const btnLogout = document.getElementById('btn-logout');

  // Load Profil Lengkap dari server
  async function loadProfil() {
    try {
      const res = await fetch('/api/profil');
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        applyUserFields(data.user);
        try {
          sessionStorage.setItem('netora_user_cache', JSON.stringify({ ...user, ...data.user }));
        } catch(e) {}
      }
    } catch (err) {
      console.warn('Gagal memuat profil:', err);
    }
  }

  // Bind Form Update (Gunakan onsubmit untuk mencegah duplikasi listener)
  if (formUpdate) {
    formUpdate.onsubmit = async (e) => {
      e.preventDefault();
      const nama = editNama ? editNama.value.trim() : '';
      const editBioEl = document.getElementById('edit-bio');
      const bio = editBioEl ? editBioEl.value.trim() : '';

      try {
        const res = await fetch('/api/profil/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nama, bio })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          if (typeof toast === 'function') toast(data.message, 'success');
          loadProfil();
        } else {
          if (typeof toast === 'function') toast(data.error || 'Gagal update profil', 'error');
        }
      } catch (err) {
        if (typeof toast === 'function') toast('Terjadi kesalahan jaringan', 'error');
      }
    };
  }

  // Bind Form Ganti Sandi (Gunakan onsubmit untuk mencegah duplikasi listener)
  if (formPass) {
    formPass.onsubmit = async (e) => {
      e.preventDefault();
      const password_lama = document.getElementById('pass-lama').value;
      const password_baru = document.getElementById('pass-baru').value;
      const password_konfirm = document.getElementById('pass-konfirm').value;

      if (password_baru !== password_konfirm) {
        if (typeof toast === 'function') toast('Konfirmasi password baru tidak cocok!', 'error');
        return;
      }

      try {
        const res = await fetch('/api/profil/ganti-password', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password_lama, password_baru })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          if (typeof toast === 'function') toast(data.message, 'success');
          formPass.reset();
        } else {
          if (typeof toast === 'function') toast(data.error || 'Gagal mengubah password', 'error');
        }
      } catch (err) {
        if (typeof toast === 'function') toast('Terjadi kesalahan jaringan', 'error');
      }
    };
  }

  // Bind Upload Foto Profil
  if (inputFoto) {
    inputFoto.onchange = async () => {
      if (!inputFoto.files || inputFoto.files.length === 0) return;

      const file = inputFoto.files[0];
      const formData = new FormData();
      formData.append('foto', file);

      if (typeof toast === 'function') toast('Mengunggah foto profil...', 'info');

      try {
        const res = await fetch('/api/profil/upload-foto', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();

        if (res.ok && data.success) {
          if (typeof toast === 'function') toast(data.message, 'success');
          if (profileImg) profileImg.src = data.foto + '?t=' + Date.now();
        } else {
          if (typeof toast === 'function') toast(data.error || 'Gagal mengunggah foto', 'error');
        }
      } catch (err) {
        if (typeof toast === 'function') toast('Gagal mengunggah foto profil', 'error');
      }
    };
  }

  // Bind Logout
  if (btnLogout) {
    btnLogout.onclick = () => {
      if (typeof logout === 'function') logout();
    };
  }

  // Bind Hapus Foto
  const btnHapusFoto = document.getElementById('btn-hapus-foto');
  if (btnHapusFoto) {
    btnHapusFoto.onclick = async () => {
      if (profileImg && profileImg.src.includes('default.png')) {
        if (typeof toast === 'function') toast('Foto profil kamu sudah menggunakan avatar standar.', 'info');
        return;
      }

      const confirmed = typeof confirmDialog === 'function' ? await confirmDialog('Apakah kamu yakin ingin menghapus foto profil dan kembali menggunakan foto avatar standar Netora?', {
        title: 'Hapus Foto Profil',
        confirmText: 'Ya, Hapus',
        cancelText: 'Batal',
        type: 'danger'
      }) : window.confirm('Hapus foto profil?');
      if (!confirmed) return;

      try {
        const res = await fetch('/api/profil/hapus-foto', { method: 'DELETE' });
        const data = await res.json();
        if (res.ok && data.success) {
          if (typeof toast === 'function') toast('Foto profil berhasil dihapus!', 'success');
          if (profileImg) profileImg.src = 'uploads/default.png?t=' + Date.now();
        } else {
          if (typeof toast === 'function') toast(data.error || 'Gagal menghapus foto profil.', 'error');
        }
      } catch (err) {
        if (typeof toast === 'function') toast('Terjadi kesalahan jaringan saat menghapus foto.', 'error');
      }
    };
  }

  // Bind Hapus Akun
  const btnHapusAkun = document.getElementById('btn-hapus-akun');
  if (btnHapusAkun) {
    btnHapusAkun.onclick = async () => {
      const confirmed = typeof confirmDialog === 'function' ? await confirmDialog('Apakah Anda yakin ingin menghapus akun ini secara permanen? Semua riwayat nilai kuis dan progres belajar Anda akan dihapus dan tidak dapat dikembalikan.', {
        title: 'Hapus Akun Permanen',
        confirmText: 'Ya, Hapus Akun',
        cancelText: 'Batal',
        type: 'danger'
      }) : window.confirm('Hapus akun permanen?');
      if (!confirmed) return;

      try {
        const res = await fetch('/api/profil/hapus-akun', { method: 'DELETE' });
        const data = await res.json();
        if (res.ok && data.success) {
          if (typeof toast === 'function') toast(data.message, 'success');
          try { sessionStorage.clear(); } catch (e) {}
          setTimeout(() => {
            window.location.href = '/login.html';
          }, 1200);
        } else {
          if (typeof toast === 'function') toast(data.error || 'Gagal menghapus akun', 'error');
        }
      } catch (err) {
        if (typeof toast === 'function') toast('Terjadi kesalahan jaringan saat menghapus akun', 'error');
      }
    };
  }

  loadProfil();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('profile-nama') || document.getElementById('edit-nama')) {
      window.initProfilPage();
    }
  });
} else {
  if (document.getElementById('profile-nama') || document.getElementById('edit-nama')) {
    window.initProfilPage();
  }
}
