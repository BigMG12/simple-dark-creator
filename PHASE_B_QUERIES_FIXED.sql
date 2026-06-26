-- ═══════════════════════════════════════════════════════════════
-- FAZA B — WERYFIKACJA STANU BAZY DANYCH (POPRAWIONA)
-- ═══════════════════════════════════════════════════════════════
-- Wykonaj te queries w Supabase SQL Editor i prześlij wyniki

-- 1. Czy speaker_categories teraz istnieje?
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'speaker_categories'
) AS speaker_categories_exists;

-- 2. Liczby wierszy w kluczowych tabelach
SELECT
  (SELECT COUNT(*) FROM speakers) AS speakers,
  (SELECT COUNT(*) FROM drills) AS drills,
  (SELECT COUNT(*) FROM badges) AS badges,
  (SELECT COUNT(*) FROM speaker_categories) AS categories,
  (SELECT COUNT(*) FROM profiles) AS profiles,
  (SELECT COUNT(*) FROM recordings) AS recordings,
  (SELECT COUNT(*) FROM random_topics) AS topics;

-- 3. Co to są tabele recording_feed i user_import_feed?
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('recording_feed', 'user_import_feed');

-- 4. Czy mają RLS (jeśli to tabele)?
SELECT
  tablename,
  rowsecurity AS has_rls
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('recording_feed', 'user_import_feed');

-- 5. Definicja tych views/tabel (żeby zobaczyć co eksponują)
SELECT
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN ('recording_feed', 'user_import_feed');

-- 6. Sprawdź strukturę speaker_categories
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'speaker_categories'
ORDER BY ordinal_position;

-- 7. Sprawdź zawartość speaker_categories (bez sort_order)
SELECT * FROM speaker_categories LIMIT 20;
