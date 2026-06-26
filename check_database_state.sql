-- SEKCJA 5: Zapytania do wykonania w Supabase SQL Editor

-- 1. Lista tabel
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;

-- 2. Lista RPC functions
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- 3. Storage buckets
SELECT id, name, public FROM storage.buckets;

-- 4. Liczba wierszy w kluczowych tabelach
SELECT
  (SELECT COUNT(*) FROM speakers) AS speakers_count,
  (SELECT COUNT(*) FROM drills) AS drills_count,
  (SELECT COUNT(*) FROM badges) AS badges_count,
  (SELECT COUNT(*) FROM speaker_categories) AS categories_count;
