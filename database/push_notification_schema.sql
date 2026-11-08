-- ============================================================
-- NETORA PUSH NOTIFICATION SCHEMA (SUPABASE POSTGRESQL)
-- Salin dan jalankan script ini di SQL Editor dashboard Supabase
-- ============================================================

-- 1. Tabel untuk menyimpan push token dari perangkat smartphone siswa & guru
CREATE TABLE IF NOT EXISTS public.user_device_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT DEFAULT 'android',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Index untuk kecepatan pencarian token dan user
CREATE INDEX IF NOT EXISTS idx_device_tokens_token ON public.user_device_tokens(token);
CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON public.user_device_tokens(user_id);

-- 3. Tambahkan kolom push_token opsional langsung di tabel users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS push_token TEXT;

-- 4. Berikan hak akses membaca/menulis untuk service role & anon
GRANT ALL ON TABLE public.user_device_tokens TO postgres, service_role, anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.user_device_tokens_id_seq TO postgres, service_role, anon, authenticated;

