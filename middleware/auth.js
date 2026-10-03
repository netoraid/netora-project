const { supabase } = require('../database/supabase');

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ error: 'Sesi telah berakhir atau Anda belum login.' });
}

async function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Akses ditolak. Silakan login terlebih dahulu.' });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', req.session.userId)
      .maybeSingle();

    if (error || !user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Akses terlarang. Anda bukan Administrator Netora.' });
    }
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Terjadi kesalahan otorisasi.' });
  }
}

async function requireGuru(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Akses ditolak. Silakan login terlebih dahulu.' });
  }

  try {
    if (req.session.role === 'guru' || req.session.role === 'admin') {
      return next();
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', req.session.userId)
      .maybeSingle();

    if (error || !user || (user.role !== 'guru' && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Akses terlarang. Anda bukan Guru / Pengajar Netora.' });
    }

    req.session.role = user.role;
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Terjadi kesalahan otorisasi.' });
  }
}

module.exports = { requireAuth, requireAdmin, requireGuru };
