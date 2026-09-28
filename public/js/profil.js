window.initProfilPage = async function() {
  const profileNama = document.getElementById('profile-nama');
  const editNama = document.getElementById('edit-nama');
  if (!profileNama && !editNama) return;

  if (window.location.hash === '#progress') {
    window.location.href = 'progres.html';
    return;
  }

  const user = await requireLogin();
  if (!user) return;

  const profileImg = document.getElementById('profile-img');
  const profileEmail = document.getElementById('profile-email');
  const profileJoined = document.getElementById('profile-joined');
  const inputFoto = document.getElementById('input-foto');

  const editEmail = document.getElementById('edit-email');
  const editBio = document.getElementById('edit-bio');

  const formUpdate = document.getElementById('form-update-profil');
  const formPass = document.getElementById('form-ganti-pass');
  const btnLogout = document.getElementById('btn-logout');

  // Prefill Instan dari data login aktif (0ms render)
  if (user) {
    if (profileNama) profileNama.textContent = user.nama || 'Siswa TKJ';
    if (profileEmail) profileEmail.textContent = user.email || '';
    if (profileImg && user.foto) profileImg.src = user.foto;
    if (editNama) editNama.value = user.nama || '';
    if (editEmail) editEmail.value = user.email || '';
    if (editBio && user.bio) editBio.value = user.bio;
  }

  // Load Data Profil Lengkap & Riwayat
  async function loadProfil() {
    try {
      const res = await fetch('/api/profil');
      const data = await res.json();

      if (res.ok && data.success && data.user) {
        const u = data.user;
        if (profileNama) profileNama.textContent = u.nama;
        if (profileEmail) profileEmail.textContent = u.email;
        if (profileJoined) profileJoined.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:4px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg><span>Bergabung sejak ${formatTanggal(u.created_at)}</span>`;
        if (profileImg) profileImg.src = u.foto || 'uploads/default.png';

        if (editNama) editNama.value = u.nama;
        if (editEmail) editEmail.value = u.email;
        if (editBio) editBio.value = u.bio || '';

        try {
          sessionStorage.setItem('netora_user_cache', JSON.stringify({ ...user, ...u }));
        } catch(e) {}
      }
    } catch (err) {
      toast('Gagal memuat profil', 'error');
    }
  }

  // 1. Controller Tab Switching
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.tab;

      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetContent = document.getElementById(targetId);
      if (targetContent) targetContent.classList.add('active');
    });
  });

  // 2. Submit Form Edit Profil
  if (formUpdate) {
    formUpdate.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nama = editNama.value.trim();
      const bio = editBio.value.trim();

      try {
        const res = await fetch('/api/profil/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nama, bio })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          toast(data.message, 'success');
          loadProfil();
        } else {
          toast(data.error || 'Gagal update profil', 'error');
        }
      } catch (err) {
        toast('Terjadi kesalahan jaringan', 'error');
      }
    });
  }

  // 3. Submit Form Ganti Password
  if (formPass) {
    formPass.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password_lama = document.getElementById('pass-lama').value;
      const password_baru = document.getElementById('pass-baru').value;
      const password_konfirm = document.getElementById('pass-konfirm').value;

      if (password_baru !== password_konfirm) {
        toast('Konfirmasi password baru tidak cocok!', 'error');
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
          toast(data.message, 'success');
          formPass.reset();
        } else {
          toast(data.error || 'Gagal mengubah password', 'error');
        }
      } catch (err) {
        toast('Terjadi kesalahan jaringan', 'error');
      }
    });
  }

  // 4. Upload Foto Profil Instant (Multipart)
  if (inputFoto) {
    inputFoto.addEventListener('change', async () => {
      if (!inputFoto.files || inputFoto.files.length === 0) return;

      const file = inputFoto.files[0];
      const formData = new FormData();
      formData.append('foto', file);

      toast('Mengunggah foto profil...', 'info');

      try {
        const res = await fetch('/api/profil/upload-foto', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();

        if (res.ok && data.success) {
          toast(data.message, 'success');
          if (profileImg) profileImg.src = data.foto + '?t=' + Date.now();
        } else {
          toast(data.error || 'Gagal mengunggah foto', 'error');
        }
      } catch (err) {
        toast('Gagal mengunggah foto profil', 'error');
      }
    });
  }

  // 5. Logout Button
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      logout();
    });
  }

  // 6. Hapus Foto Profil Siswa (Kembalikan ke Default)
  async function handleHapusFoto() {
    if (profileImg && profileImg.src.includes('default.png')) {
      toast('Foto profil kamu sudah menggunakan avatar standar.', 'info');
      return;
    }

    const confirmed = await confirmDialog('Apakah kamu yakin ingin menghapus foto profil dan kembali menggunakan foto avatar standar Netora?', {
      title: 'Hapus Foto Profil',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      type: 'danger'
    });
    if (!confirmed) return;

    try {
      const res = await fetch('/api/profil/hapus-foto', {
        method: 'DELETE'
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast('Foto profil berhasil dihapus!', 'success');
        if (profileImg) profileImg.src = 'uploads/default.png?t=' + Date.now();
      } else {
        toast(data.error || 'Gagal menghapus foto profil.', 'error');
      }
    } catch (err) {
      toast('Terjadi kesalahan jaringan saat menghapus foto.', 'error');
    }
  }

  const btnHapusFoto = document.getElementById('btn-hapus-foto');
  if (btnHapusFoto) {
    btnHapusFoto.addEventListener('click', handleHapusFoto);
  }

  const btnHapusAkun = document.getElementById('btn-hapus-akun');
  if (btnHapusAkun) {
    btnHapusAkun.addEventListener('click', async () => {
      const confirmed = await confirmDialog('Apakah Anda yakin ingin menghapus akun ini secara permanen? Semua riwayat nilai kuis dan progres belajar Anda akan dihapus dan tidak dapat dikembalikan.', {
        title: 'Hapus Akun Permanen',
        confirmText: 'Ya, Hapus Akun',
        cancelText: 'Batal',
        type: 'danger'
      });
      if (!confirmed) return;

      try {
        const res = await fetch('/api/profil/hapus-akun', { method: 'DELETE' });
        const data = await res.json();
        if (res.ok && data.success) {
          toast(data.message, 'success');
          try { sessionStorage.clear(); } catch (e) {}
          setTimeout(() => {
            window.location.href = '/login.html';
          }, 1200);
        } else {
          toast(data.error || 'Gagal menghapus akun', 'error');
        }
      } catch (err) {
        toast('Terjadi kesalahan jaringan saat menghapus akun', 'error');
      }
    });
  }

  // Bind Tab Switching Logic
  document.querySelectorAll('.profil-tab-btn').forEach(btn => {
    btn.onclick = () => {
      const target = btn.dataset.tab;
      document.querySelectorAll('.profil-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.profil-tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.getElementById(target);
      if (panel) panel.classList.add('active');
    };
  });

  loadProfil();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.initProfilPage);
} else {
  window.initProfilPage();
}
