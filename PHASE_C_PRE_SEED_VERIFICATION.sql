-- ═══════════════════════════════════════════════════════════════
-- FAZA C — WERYFIKACJA PRZED SEED DATA
-- ═══════════════════════════════════════════════════════════════

-- 1. Pełna struktura tabeli speaker_categories
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'speaker_categories'
ORDER BY ordinal_position;

-- 2. Czy speakers ma kolumnę category_id?
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'speakers'
AND column_name LIKE '%categor%';

-- 3. Czy obecne 20 mentorów ma już przypisane category_id?
SELECT category_id, COUNT(*) as mentor_count
FROM speakers
GROUP BY category_id
ORDER BY category_id;
