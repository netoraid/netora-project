// Service Riwayat Pengerjaan Kuis Siswa Netora
// Menyimpan rincian butir soal, jawaban siswa, kunci jawaban, dan status benar/salah
// Digunakan bersama oleh Siswa, Guru, dan Admin untuk meninjau hasil kuis

const fs = require('fs');
const path = require('path');
const { supabase } = require('../database/supabase');

const SUBMISSIONS_FILE = path.join(__dirname, '..', 'database', 'quiz_submissions.json');
const MAX_SAVED_SUBMISSIONS = 300;

// Helper membaca data submission dari file lokal
function readSubmissions() {
  try {
    if (fs.existsSync(SUBMISSIONS_FILE)) {
      const raw = fs.readFileSync(SUBMISSIONS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('⚠️ [QUIZ-HISTORY] Gagal membaca quiz_submissions.json:', err.message);
  }
  return [];
}

// Helper menyimpan submission ke file lokal
function saveSubmissions(list) {
  try {
    const dir = path.dirname(SUBMISSIONS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // Batasi maksimum data agar file tidak membengkak
    const trimmed = list.slice(0, MAX_SAVED_SUBMISSIONS);
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(trimmed, null, 2), 'utf-8');
  } catch (err) {
    console.error('❌ [QUIZ-HISTORY] Gagal menyimpan quiz_submissions.json:', err.message);
  }
}

// Simpan submission baru
function recordQuizSubmission(submissionData) {
  try {
    const list = readSubmissions();
    // Taruh di paling depan (terbaru)
    list.unshift({
      id: submissionData.id || Date.now(),
      nilai_id: submissionData.nilai_id || submissionData.id || null,
      user_id: submissionData.user_id || null,
      siswa_nama: submissionData.siswa_nama || 'Siswa',
      siswa_email: submissionData.siswa_email || '-',
      topic_title: submissionData.topic_title || 'Kuis TKJ',
      skor: Number(submissionData.skor) || 0,
      benar: Number(submissionData.benar) || 0,
      total: Number(submissionData.total) || 0,
      lulus: (Number(submissionData.skor) || 0) >= 70,
      tanggal: submissionData.tanggal || new Date().toISOString(),
      review: Array.isArray(submissionData.review) ? submissionData.review : []
    });
    saveSubmissions(list);
    return true;
  } catch (err) {
    console.error('❌ [QUIZ-HISTORY] recordQuizSubmission error:', err);
    return false;
  }
}

// Ambil detail submission berdasarkan ID (bisa ID submission atau nilai_id)
async function getQuizSubmissionById(id) {
  const numericId = parseInt(id, 10);
  const list = readSubmissions();

  // 1. Cari exact match dari list JSON
  const found = list.find(s => s.id === numericId || s.nilai_id === numericId);
  if (found) {
    return found;
  }

  // 2. Jika tidak ada di JSON (misal data lama di Supabase sebelum update), buatkan fallback representasi
  try {
    const { data: nilaiRow } = await supabase
      .from('nilai_quiz')
      .select('id, user_id, skor, tanggal, users(nama, email)')
      .eq('id', numericId)
      .maybeSingle();

    if (nilaiRow) {
      const user = nilaiRow.users || {};
      return {
        id: nilaiRow.id,
        nilai_id: nilaiRow.id,
        user_id: nilaiRow.user_id,
        siswa_nama: user.nama || 'Siswa',
        siswa_email: user.email || '-',
        topic_title: 'Kuis TKJ',
        skor: Number(nilaiRow.skor) || 0,
        benar: Math.round((Number(nilaiRow.skor) || 0) / 10),
        total: 10,
        lulus: (Number(nilaiRow.skor) || 0) >= 70,
        tanggal: nilaiRow.tanggal,
        review: [],
        catatan: 'Rincian butir soal per jawaban hanya tersedia untuk pengerjaan kuis terbaru.'
      };
    }
  } catch (e) {
    console.warn('⚠️ [QUIZ-HISTORY] Fallback lookup Supabase error:', e.message);
  }

  return null;
}

module.exports = {
  recordQuizSubmission,
  getQuizSubmissionById,
  readSubmissions
};

