-- ============================================================
-- POŁĄCZONE MIGRACJE NAPRAWCZE — BIG SPEAKING
-- Data: 2026-04-22
-- Zawiera: 012_audit_fixes.sql + 012_fix_profile_trigger.sql + 013_atomic_xp_increment.sql
--
-- INSTRUKCJA:
-- 1. Skopiuj całą zawartość tego pliku
-- 2. Otwórz https://supabase.com/dashboard/project/hthjuoswarvsfssxqxxj/sql
-- 3. Wklej i uruchom (RUN)
-- ============================================================

-- ============================================================
-- CZĘŚĆ 1: AUDIT FIXES (012_audit_fixes.sql)
-- Naprawia konflikty między migracjami 005_speaker_imports i 005_v2_features
-- ============================================================

-- 1. Usuń nieużywaną tabelę speaker_categories
DROP TABLE IF EXISTS public.speaker_categories CASCADE;

-- 2. Napraw nazwy kolumn w channel_imports (custom_name_override → custom_name)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'channel_imports'
      AND column_name = 'custom_name_override'
  ) THEN
    ALTER TABLE public.channel_imports
      RENAME COLUMN custom_name_override TO custom_name;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'channel_imports'
      AND column_name = 'custom_trait_override'
  ) THEN
    ALTER TABLE public.channel_imports
      RENAME COLUMN custom_trait_override TO custom_trait;
  END IF;
END $$;

-- 3. Konwertuj channel_imports.target_category_id z UUID na TEXT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'channel_imports'
      AND column_name = 'target_category_id'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.channel_imports
      DROP CONSTRAINT IF EXISTS channel_imports_target_category_id_fkey;

    ALTER TABLE public.channel_imports
      ALTER COLUMN target_category_id TYPE TEXT;

    ALTER TABLE public.channel_imports
      DROP CONSTRAINT IF EXISTS channel_imports_target_category_id_check;

    ALTER TABLE public.channel_imports
      ADD CONSTRAINT channel_imports_target_category_id_check
      CHECK (target_category_id IN (
        'motivation','sales','influence','leadership','storytelling','authority'
      ));
  END IF;
END $$;

-- 4. Konwertuj speakers.category_id z UUID na TEXT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'speakers'
      AND column_name = 'category_id'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.speakers
      DROP CONSTRAINT IF EXISTS speakers_category_id_fkey;

    ALTER TABLE public.speakers
      ALTER COLUMN category_id TYPE TEXT;

    ALTER TABLE public.speakers
      DROP CONSTRAINT IF EXISTS speakers_category_id_check;

    ALTER TABLE public.speakers
      ADD CONSTRAINT speakers_category_id_check
      CHECK (category_id IN (
        'motivation','sales','influence','leadership','storytelling','authority'
      ));
  END IF;
END $$;

-- 5. Napraw speakers.source_type (curated → built_in)
DO $$
BEGIN
  UPDATE public.speakers
  SET source_type = 'built_in'
  WHERE source_type = 'curated';

  ALTER TABLE public.speakers
    DROP CONSTRAINT IF EXISTS speakers_source_type_check;

  ALTER TABLE public.speakers
    ADD CONSTRAINT speakers_source_type_check
    CHECK (source_type IN ('built_in', 'imported'));
END $$;

-- 6. Zaktualizuj RLS policies
DROP POLICY IF EXISTS "speakers: select curated or own imported" ON public.speakers;
DROP POLICY IF EXISTS "speakers: select authenticated" ON public.speakers;

CREATE POLICY "speakers: select built_in or own imported"
  ON public.speakers FOR SELECT
  USING (
    source_type = 'built_in'
    OR source_user_id = auth.uid()
  );

-- 7. Ustaw source_url jako NOT NULL
ALTER TABLE public.channel_imports
  ALTER COLUMN source_url SET NOT NULL;

-- 8. Odtwórz widok user_import_feed z poprawnymi nazwami kolumn
DROP VIEW IF EXISTS public.user_import_feed;

CREATE OR REPLACE VIEW public.user_import_feed AS
SELECT
  ci.id,
  ci.user_id,
  ci.source_type,
  ci.source_url,
  ci.status,
  ci.progress_current,
  ci.progress_total,
  ci.resulting_speaker_id,
  ci.error_message,
  ci.custom_name,
  ci.custom_trait,
  ci.target_category_id,
  ci.created_at,
  ci.completed_at,
  s.name AS speaker_name,
  s.monogram AS speaker_monogram,
  s.category_id AS speaker_category
FROM public.channel_imports ci
LEFT JOIN public.speakers s ON s.id = ci.resulting_speaker_id;

-- 9. Oznacz przestarzałe funkcje
COMMENT ON FUNCTION public.get_user_import_count(UUID) IS
  'DEPRECATED: Use check_import_quota() instead (migration 008). This function does not respect tier limits.';

-- 10. Zaktualizuj RLS policy dla speech_embeddings
DROP POLICY IF EXISTS "speech_embeddings: select accessible" ON public.speech_embeddings;

CREATE POLICY "speech_embeddings: select accessible"
  ON public.speech_embeddings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.speakers s
      WHERE s.id = speaker_id
        AND (s.source_type = 'built_in' OR s.source_user_id = auth.uid())
    )
  );

-- ============================================================
-- CZĘŚĆ 2: FIX PROFILE TRIGGER (012_fix_profile_trigger.sql)
-- Naprawia automatyczne przypisywanie domyślnego speakera
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_speaker_id UUID;
BEGIN
  -- Pobierz domyślnego speakera (najniższy sort_order)
  SELECT id INTO default_speaker_id
  FROM public.speakers
  ORDER BY sort_order ASC
  LIMIT 1;

  INSERT INTO public.profiles (id, email, full_name, avatar_url, selected_speaker_id)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url',
    default_speaker_id
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ============================================================
-- CZĘŚĆ 3: ATOMIC XP INCREMENT (013_atomic_xp_increment.sql)
-- Zapobiega race conditions przy aktualizacji XP
-- ============================================================

CREATE OR REPLACE FUNCTION public.increment_profile_xp(
  p_user_id UUID,
  p_xp_delta INT,
  p_new_level INT,
  p_new_streak INT,
  p_longest_streak INT,
  p_session_date DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    current_xp = current_xp + p_xp_delta,
    current_level = p_new_level,
    current_streak = p_new_streak,
    longest_streak = p_longest_streak,
    last_session_date = p_session_date
  WHERE id = p_user_id;
END;
$$;

COMMENT ON FUNCTION public.increment_profile_xp IS
  'Atomically increments user XP and updates level/streak. Use this instead of read-modify-write to prevent race conditions.';

-- ============================================================
-- KONIEC MIGRACJI
-- ============================================================
