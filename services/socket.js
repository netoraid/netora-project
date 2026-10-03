// Socket.io Real-Time Manager Netora v2
// Mengelola koneksi real-time, status user online, notifikasi instan, dan live monitoring

const { Server } = require('socket.io');

let ioInstance = null;
const onlineUsers = new Map(); // socketId -> { userId, nama, role, foto, page, connectedAt }

function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 20000,
    pingInterval: 10000
  });

  ioInstance = io;

  io.on('connection', (socket) => {
    // 1. User Mengidentifikasi Diri (Login / Masuk Halaman)
    socket.on('join_user', (userData) => {
      if (!userData || !userData.userId) return;

      const userRecord = {
        socketId: socket.id,
        userId: userData.userId,
        nama: userData.nama || 'Pengguna',
        role: userData.role || 'siswa',
        foto: userData.foto || 'uploads/default.png',
        page: userData.page || 'Beranda',
        connectedAt: new Date()
      };

      onlineUsers.set(socket.id, userRecord);

      // Masukkan ke room sesuai role
      socket.join('global');
      if (userRecord.role === 'guru') socket.join('role:guru');
      else if (userRecord.role === 'admin') socket.join('role:admin');
      else socket.join('role:siswa');

      broadcastOnlineStats();
    });

    // 2. User Berpindah Halaman (Update Aktivitas Live)
    socket.on('change_page', (pageTitle) => {
      const u = onlineUsers.get(socket.id);
      if (u) {
        u.page = pageTitle || 'Aktivitas Netora';
        broadcastOnlineStats();
      }
    });

    // 3. User Terputus (Disconnect)
    socket.on('disconnect', () => {
      if (onlineUsers.has(socket.id)) {
        onlineUsers.delete(socket.id);
        broadcastOnlineStats();
      }
    });
  });

  return io;
}

// Kirim data statistik siswa & user online ke room Guru dan Admin
function broadcastOnlineStats() {
  if (!ioInstance) return;

  const usersArray = Array.from(onlineUsers.values());
  const uniqueUsers = [];
  const seenIds = new Set();

  usersArray.forEach(u => {
    if (!seenIds.has(u.userId)) {
      seenIds.add(u.userId);
      uniqueUsers.push(u);
    }
  });

  const siswaOnline = uniqueUsers.filter(u => u.role === 'siswa');
  const payload = {
    totalOnline: uniqueUsers.length,
    totalSiswaOnline: siswaOnline.length,
    users: uniqueUsers
  };

  // Broadcast ke guru & admin untuk monitoring live
  ioInstance.to('role:guru').to('role:admin').emit('online_users_updated', payload);
  // Broadcast jumlah user aktif ke seluruh client
  ioInstance.emit('online_count', payload.totalOnline);
}

// Helper: Broadcast Pengumuman Baru
function broadcastPengumuman(pengumuman) {
  if (ioInstance) {
    ioInstance.emit('pengumuman:baru', pengumuman);
  }
}

// Helper: Broadcast Pengumuman Dihapus
function broadcastHapusPengumuman(id) {
  if (ioInstance) {
    ioInstance.emit('pengumuman:hapus', { id });
  }
}

// Helper: Broadcast Kuis Selesai (Untuk Guru & Live Leaderboard)
function broadcastQuizSubmitted(data) {
  if (ioInstance) {
    ioInstance.to('role:guru').to('role:admin').emit('quiz:submitted', data);
    ioInstance.emit('leaderboard:update', { timestamp: new Date() });
  }
}

// Helper: Broadcast Materi Baru
function broadcastMateriBaru(materi) {
  if (ioInstance) {
    ioInstance.emit('materi:baru', materi);
  }
}

function getIO() {
  return ioInstance;
}

module.exports = {
  initSocket,
  getIO,
  broadcastPengumuman,
  broadcastHapusPengumuman,
  broadcastQuizSubmitted,
  broadcastMateriBaru,
  broadcastOnlineStats
};
