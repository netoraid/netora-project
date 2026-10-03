require('dotenv').config();
const bcrypt = require('bcryptjs');
const { supabase } = require('./database/supabase');

async function seed() {
  console.log('Mengecek akun guru di Supabase...');
  const { data: existing, error: errCheck } = await supabase
    .from('users')
    .select('id, email, role')
    .or('email.eq.guru123,role.eq.guru')
    .maybeSingle();

  if (errCheck) {
    console.error('Error cek Supabase:', errCheck);
  }

  const hash = bcrypt.hashSync('guru123', 10);

  if (existing) {
    console.log('Akun guru sudah ada (ID: ' + existing.id + '), memperbarui password & role...');
    const { error: errUp } = await supabase
      .from('users')
      .update({
        role: 'guru',
        password: hash,
        password_plain: 'guru123'
      })
      .eq('id', existing.id);
    if (errUp) console.error('Update error:', errUp);
    else console.log('✅ Akun guru berhasil diperbarui menjadi role: guru, password: guru123');
  } else {
    console.log('Membuat akun guru123 baru di Supabase...');
    const { data: created, error: errIn } = await supabase
      .from('users')
      .insert([
        {
          nama: 'Bapak / Ibu Guru Pembimbing TKJ',
          email: 'guru123',
          password: hash,
          password_plain: 'guru123',
          role: 'guru',
          foto: 'uploads/default.png',
          bio: 'Guru Pengampu Kejuruan Teknik Komputer & Jaringan'
        }
      ])
      .select()
      .single();
    if (errIn) console.error('Insert error:', errIn);
    else console.log('✅ Akun guru123 berhasil dibuat di Supabase!');
  }
}

seed();
