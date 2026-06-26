-- Lista tabel
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Liczba wierszy
SELECT relname as table_name, n_live_tup as row_count 
FROM pg_stat_user_tables 
WHERE schemaname = 'public' 
ORDER BY n_live_tup DESC;

-- Funkcje RPC
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION';

-- Triggery
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- RLS policies
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';

-- Storage buckets
SELECT id, name, public FROM storage.buckets;

-- Indeksy
SELECT tablename, indexname FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname NOT LIKE '%_pkey';
