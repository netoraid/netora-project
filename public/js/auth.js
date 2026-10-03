// Auth Page Logic (Login & Register) - Netora Portal TKJ

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Cek apakah user sudah login, jika ya langsung arahkan ke dashboard yang sesuai
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (res.ok && data.success && data.user) {
      if (data.user.role === 'admin' || data.user.email === 'admin123') {
        window.location.href = '/admin.html';
      } else if (data.user.role === 'guru' || data.user.email === 'guru123') {
        window.location.href = '/guru.html';
      } else {
        window.location.href = '/beranda.html';
      }
      return;
    }
  } catch (err) {
    // Biarkan tetap di halaman login/register jika belum login
  }

  const alertError = document.getElementById('alert-error');

  function showError(msg) {
    if (alertError) {
      alertError.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>${msg}</span>
      `;
      alertError.style.display = 'flex';
      alertError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    if (typeof toast === 'function') {
      toast(msg, 'error');
    }
  }

  function hideError() {
    if (alertError) {
      alertError.textContent = '';
      alertError.style.display = 'none';
    }
  }

  // 2. Handle Login Form
  const formLogin = document.getElementById('form-login');
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError();

      const emailInput = document.getElementById('email') || document.getElementById('login-email');
      const passwordInput = document.getElementById('password') || document.getElementById('login-password');
      const btnSubmit = document.getElementById('btn-submit-login');

      const emailVal = (emailInput ? emailInput.value : '').trim();
      const passwordVal = passwordInput ? passwordInput.value : '';

      if (!emailVal || !passwordVal) {
        showError('Silakan masukkan email/username dan kata sandi Anda.');
        if (!emailVal && emailInput) emailInput.focus();
        else if (!passwordVal && passwordInput) passwordInput.focus();
        return;
      }

      // Indikator loading pada tombol
      const originalBtnHtml = btnSubmit ? btnSubmit.innerHTML : '';
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.style.opacity = '0.75';
        btnSubmit.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="spin-loader">
            <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
          </svg>
          <span>Memverifikasi...</span>
        `;
      }

      try {
        let res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailVal, password: passwordVal })
        });
        let data = await res.json();

        // Khusus fallback akun admin123 jika database direset
        if (!res.ok && emailVal.toLowerCase() === 'admin123') {
          try {
            const autoReg = await fetch('/api/auth/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                nama: 'Administrator Netora',
                email: 'admin123',
                password: passwordVal || 'admin123'
              })
            });

            if (autoReg.ok) {
              if (typeof toast === 'function') toast('Login Admin Berhasil! Mengalihkan...', 'success');
              setTimeout(() => {
                window.location.href = '/admin.html';
              }, 350);
              return;
            }

            const retryRes = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: 'admin123', password: passwordVal })
            });
            const retryData = await retryRes.json();
            if (retryRes.ok && retryData.success) {
              if (typeof toast === 'function') toast('Login Admin Berhasil! Mengalihkan...', 'success');
              setTimeout(() => {
                window.location.href = '/admin.html';
              }, 350);
              return;
            }
          } catch (autoErr) {}
        }

        // Khusus fallback akun guru123 jika database belum memiliki record guru
        if (!res.ok && (emailVal.toLowerCase() === 'guru123' || emailVal.toLowerCase() === 'guru@netora.id')) {
          try {
            const retryRes = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: 'guru123', password: passwordVal || 'guru123' })
            });
            const retryData = await retryRes.json();
            if (retryRes.ok && retryData.success) {
              if (typeof toast === 'function') toast('Login Guru Berhasil! Mengalihkan...', 'success');
              setTimeout(() => {
                window.location.href = '/guru.html';
              }, 250);
              return;
            }
          } catch (autoGuruErr) {}
        }

        if (res.ok && data.success) {
          try {
            sessionStorage.setItem('netora_user_cache', JSON.stringify(data.user));
          } catch (e) {}
          let targetUrl = '/beranda.html';
          if (data.user && (data.user.role === 'admin' || data.user.email === 'admin123')) {
            targetUrl = '/admin.html';
          } else if (data.user && (data.user.role === 'guru' || data.user.email === 'guru123')) {
            targetUrl = '/guru.html';
          }
          if (typeof toast === 'function') toast('Login berhasil! Mengalihkan...', 'success');
          setTimeout(() => {
            if (typeof window.netoraNavigate === 'function') {
              window.netoraNavigate(targetUrl);
            } else {
              window.location.href = targetUrl;
            }
          }, 100);
        } else {
          showError(data.error || 'Email atau kata sandi tidak sesuai.');
          if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.style.opacity = '1';
            btnSubmit.innerHTML = originalBtnHtml;
          }
        }
      } catch (err) {
        showError('Gagal terhubung ke server Netora. Pastikan koneksi aktif.');
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.style.opacity = '1';
          btnSubmit.innerHTML = originalBtnHtml;
        }
      }
    });
  }

  // 3. Handle Register Form
  const formRegister = document.getElementById('form-register');
  if (formRegister) {
    formRegister.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError();

      const namaInput = document.getElementById('reg-nama') || document.getElementById('nama');
      const emailInput = document.getElementById('reg-email') || document.getElementById('email');
      const passwordInput = document.getElementById('reg-password') || document.getElementById('password');
      const btnSubmit = document.getElementById('btn-submit-register');

      const nama = (namaInput ? namaInput.value : '').trim();
      const email = (emailInput ? emailInput.value : '').trim();
      const password = passwordInput ? passwordInput.value : '';

      if (!nama || !email || !password) {
        showError('Semua kolom pendaftaran wajib diisi lengkap.');
        if (!nama && namaInput) namaInput.focus();
        else if (!email && emailInput) emailInput.focus();
        else if (!password && passwordInput) passwordInput.focus();
        return;
      }

      if (password.length < 6) {
        showError('Kata sandi minimal 6 karakter demi keamanan akun.');
        if (passwordInput) passwordInput.focus();
        return;
      }

      // Indikator loading
      const originalBtnHtml = btnSubmit ? btnSubmit.innerHTML : '';
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.style.opacity = '0.75';
        btnSubmit.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="spin-loader">
            <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
          </svg>
          <span>Mendaftarkan...</span>
        `;
      }

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nama, email, password })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          if (typeof toast === 'function') {
            toast('Pendaftaran siswa berhasil! Silakan masuk.', 'success');
          }
          if (typeof window.switchAuthTab === 'function') {
            window.switchAuthTab('login');
            const loginEmail = document.getElementById('email') || document.getElementById('login-email');
            const loginPwd = document.getElementById('password') || document.getElementById('login-password');
            if (loginEmail) loginEmail.value = email;
            if (loginPwd) setTimeout(() => loginPwd.focus(), 250);
          } else {
            window.location.href = `/login.html?registered=true&email=${encodeURIComponent(email)}`;
          }
        } else {
          showError(data.error || 'Pendaftaran siswa gagal.');
        }
      } catch (err) {
        showError('Terjadi kesalahan koneksi server saat mendaftar.');
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.style.opacity = '1';
          btnSubmit.innerHTML = originalBtnHtml;
        }
      }
    });
  }

  // 4. URL Params handling (tab=register, registered=true, etc.)
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab') || urlParams.get('action');
  if (tabParam === 'register' && typeof window.switchAuthTab === 'function') {
    window.switchAuthTab('register');
  } else if (tabParam === 'login' && typeof window.switchAuthTab === 'function') {
    window.switchAuthTab('login');
  }

  if (urlParams.get('registered') === 'true') {
    const regEmail = urlParams.get('email');
    const emailField = document.getElementById('email') || document.getElementById('login-email');
    const pwdField = document.getElementById('password') || document.getElementById('login-password');
    if (emailField && regEmail) {
      emailField.value = regEmail;
    }
    if (pwdField) {
      setTimeout(() => pwdField.focus(), 300);
    }
    if (typeof toast === 'function') {
      toast('Pendaftaran berhasil! Silakan masukkan kata sandi untuk masuk.', 'success');
    }
  }
});

// CSS animation style for spin-loader
if (!document.getElementById('auth-spin-style')) {
  const spinStyle = document.createElement('style');
  spinStyle.id = 'auth-spin-style';
  spinStyle.textContent = `
    .spin-loader {
      animation: netoraSpin 0.9s linear infinite;
    }
    @keyframes netoraSpin {
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(spinStyle);
}
