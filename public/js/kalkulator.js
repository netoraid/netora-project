window.initKalkulatorPage = async function() {
  const inputIp = document.getElementById('ip-address');
  if (!inputIp) return;

  const user = await getUser();
  updateNavHeader(user);

  const selectCidr = document.getElementById('cidr-prefix');
  const btnHitung = document.getElementById('btn-hitungs');
  const historyList = document.getElementById('history-list');

  let currentResult = null;

  // Populate CIDR dropdown (1 to 32)
  if (selectCidr) {
    let optionsHtml = '';
    for (let i = 32; i >= 1; i--) {
      optionsHtml += `<option value="${i}" ${i === 24 ? 'selected' : ''}>/${i} — Netmask ${cidrToMask(i)}</option>`;
    }
    selectCidr.innerHTML = optionsHtml;
  }

  // Load history dari LocalStorage
  let history = JSON.parse(localStorage.getItem('netora_ip_calc_history') || '[]');
  renderHistory();

  // Tombol Hitung
  if (btnHitung) {
    btnHitung.addEventListener('click', () => {
      calculateSubnet(true);
    });
  }

  // Input IP: Submit saat menekan tombol Enter
  if (inputIp) {
    inputIp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        calculateSubnet(true);
      }
    });
  }

  // ===== Algoritma Matematika Subnetting Otentik =====
  function isValidIPv4(ip) {
    const parts = ip.trim().split('.');
    if (parts.length !== 4) return false;
    return parts.every(part => {
      if (part.length === 0) return false;
      const num = Number(part);
      return !isNaN(num) && num >= 0 && num <= 255 && String(num) === part.trim();
    });
  }

  function ipToInt(ip) {
    return ip.split('.').reduce((acc, octet) => {
      return ((acc * 256) + Number(octet)) >>> 0;
    }, 0);
  }

  function intToIp(int) {
    return [
      (int >>> 24) & 255,
      (int >>> 16) & 255,
      (int >>> 8) & 255,
      int & 255
    ].join('.');
  }

  function cidrToMask(cidr) {
    if (cidr === 0) return '0.0.0.0';
    if (cidr === 32) return '255.255.255.255';
    const maskInt = (0xFFFFFFFF << (32 - cidr)) >>> 0;
    return intToIp(maskInt);
  }

  function intToBinaryStr(int) {
    const b1 = ((int >>> 24) & 255).toString(2).padStart(8, '0');
    const b2 = ((int >>> 16) & 255).toString(2).padStart(8, '0');
    const b3 = ((int >>> 8) & 255).toString(2).padStart(8, '0');
    const b4 = (int & 255).toString(2).padStart(8, '0');
    return `${b1}.${b2}.${b3}.${b4}`;
  }

  function getIpClass(firstOctet) {
    if (firstOctet >= 1 && firstOctet <= 126) return 'Kelas A';
    if (firstOctet === 127) return 'Loopback (127.x)';
    if (firstOctet >= 128 && firstOctet <= 191) return 'Kelas B';
    if (firstOctet >= 192 && firstOctet <= 223) return 'Kelas C';
    if (firstOctet >= 224 && firstOctet <= 239) return 'Kelas D (Multicast)';
    return 'Kelas E (Experimental)';
  }

  function getIpType(ipStr) {
    const ipInt = ipToInt(ipStr);
    const p10Start = ipToInt('10.0.0.0'), p10End = ipToInt('10.255.255.255');
    const p172Start = ipToInt('172.16.0.0'), p172End = ipToInt('172.31.255.255');
    const p192Start = ipToInt('192.168.0.0'), p192End = ipToInt('192.168.255.255');
    const p127Start = ipToInt('127.0.0.0'), p127End = ipToInt('127.255.255.255');
    const p169Start = ipToInt('169.254.0.0'), p169End = ipToInt('169.254.255.255');

    if (ipInt >= p127Start && ipInt <= p127End) return 'Loopback Address';
    if (ipInt >= p169Start && ipInt <= p169End) return 'APIPA / Link-Local';
    if ((ipInt >= p10Start && ipInt <= p10End) ||
        (ipInt >= p172Start && ipInt <= p172End) ||
        (ipInt >= p192Start && ipInt <= p192End)) {
      return 'Private LAN (RFC 1918)';
    }
    return 'Public Internet Routable';
  }

  function calculateSubnet(showToast = true) {
    const ipStr = inputIp.value.trim();
    const cidr = parseInt(selectCidr.value, 10);

    if (!isValidIPv4(ipStr)) {
      if (showToast) toast('Format Alamat IPv4 tidak valid! Masukkan 4 oktet angka 0-255 (Contoh: 192.168.1.50)', 'error');
      return;
    }

    const ipInt = ipToInt(ipStr);
    const maskInt = (cidr === 0) ? 0 : (cidr === 32 ? 0xFFFFFFFF : (0xFFFFFFFF << (32 - cidr)) >>> 0);
    const netInt = (ipInt & maskInt) >>> 0;
    const wildcardInt = (~maskInt) >>> 0;
    const bcastInt = (netInt | wildcardInt) >>> 0;

    const maskStr = intToIp(maskInt);
    const netStr = intToIp(netInt);
    const bcastStr = intToIp(bcastInt);
    const wildcardStr = intToIp(wildcardInt);

    let totalHosts = 0;
    let rangeStr = '-';

    if (cidr === 32) {
      totalHosts = 1;
      rangeStr = intToIp(netInt);
    } else if (cidr === 31) {
      totalHosts = 2;
      rangeStr = `${intToIp(netInt)} — ${intToIp(bcastInt)}`;
    } else if (cidr <= 30) {
      totalHosts = Math.pow(2, 32 - cidr) - 2;
      const firstHost = intToIp(netInt + 1);
      const lastHost = intToIp(bcastInt - 1);
      rangeStr = `${firstHost} — ${lastHost}`;
    }

    const firstOctet = parseInt(ipStr.split('.')[0], 10);
    const ipClass = getIpClass(firstOctet);
    const ipType = getIpType(ipStr);
    const maskBinary = intToBinaryStr(maskInt);

    currentResult = {
      ipStr,
      cidr,
      netStr,
      maskStr,
      bcastStr,
      wildcardStr,
      rangeStr,
      totalHosts,
      ipClass,
      ipType,
      maskBinary
    };

    // Update baris rincian output dengan data perhitungan nyata
    document.getElementById('res-mask').textContent = maskStr;
    document.getElementById('res-net').textContent = `${netStr} /${cidr}`;
    document.getElementById('res-bcast').textContent = bcastStr;
    document.getElementById('res-hosts').textContent = `${totalHosts.toLocaleString('id-ID')} Host`;
    document.getElementById('res-range').textContent = rangeStr;
    document.getElementById('res-class').textContent = ipClass;
    document.getElementById('res-type').textContent = ipType;
    document.getElementById('res-wildcard').textContent = wildcardStr;
    document.getElementById('res-binary-mask').textContent = maskBinary;

    // Efek visual halus agar pengguna tahu hasil sudah diperbarui
    const resCard = document.getElementById('output-calc');
    if (resCard && showToast) {
      resCard.classList.remove('netora-fade-in');
      void resCard.offsetWidth;
      resCard.classList.add('netora-fade-in');
    }

    // Simpan ke History & Munculkan Notifikasi Selesai (saat tombol submit ditekan)
    if (showToast) {
      const newRecord = {
        ip: `${ipStr}/${cidr}`,
        net: netStr,
        mask: maskStr,
        hosts: totalHosts,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      };

      history = [newRecord, ...history.filter(item => item.ip !== newRecord.ip)].slice(0, 5);
      localStorage.setItem('netora_ip_calc_history', JSON.stringify(history));
      renderHistory();
      toast('Selesai! Parameter subnet berhasil dihitung.', 'success');
    }
  }

  function renderHistory() {
    if (!historyList) return;
    if (history.length === 0) {
      historyList.innerHTML = `
        <div style="background:#FFFFFF; border:1.5px dashed #CBD5E1; border-radius:14px; padding:14px; text-align:center; color:#94A3B8; font-size:12px; font-weight:600;">
          Belum ada riwayat perhitungan. Tekan "Hitung Parameter Subnet" untuk menyimpan.
        </div>
      `;
      return;
    }

    historyList.innerHTML = history.map(item => `
      <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:14px; padding:11px 14px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 2px 8px rgba(0,0,0,0.02); transition:all 0.2s ease;">
        <div>
          <strong style="color:#0D5BFF; font-size:13.5px; font-weight:800;">${item.ip}</strong>
          <div style="font-size:11.5px; color:#64748B; margin-top:2px;">
            Net: <span style="font-weight:700; color:#334155;">${item.net}</span> &bull; Mask: <span style="font-weight:700; color:#334155;">${item.mask}</span>
          </div>
        </div>
        <span style="font-size:11px; font-weight:800; color:#166534; background:#DCFCE7; border:1px solid #BBF7D0; padding:3px 9px; border-radius:7px; white-space:nowrap;">
          ${item.hosts} Host
        </span>
      </div>
    `).join('');
  }

  // Jalankan perhitungan awal secara otomatis saat halaman dibuka
  calculateSubnet(false);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.initKalkulatorPage);
} else {
  window.initKalkulatorPage();
}
