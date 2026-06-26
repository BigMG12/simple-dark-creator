-- ============================================================
-- Migration 012: Audit Fixes — Resolves conflicts from dual definitions
-- Run after all existing migrations
--
-- PROBLEM: Migrations 005_speaker_imports.sql and 005_v2_features.sql
-- both define channel_imports table with different column names.
-- Code uses names from 005_speaker_imports.sql.
--
-- SOLUTION: Standardize on 005_speaker_imports.sql schema.
-- ============================================================

-- 1. Drop speaker_categories table if exists (not used in current code)
DROP TABLE IF EXISTS public.speaker_categories CASCADE;

-- 2. Ensure channel_imports has correct columns (from 005_speaker_imports.sql)
-- If 005_v2_features overwrote it, we need to fix column names

DO $$
BEGIN
  -- Check if custom_name_override exists (from 005_v2_features)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'channel_imports'
      AND column_name = 'custom_name_override'
  ) THEN
    -- Rename to custom_name
    ALTER TABLE public.channel_imports
      RENAME COLUMN custom_name_override TO custom_name;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'channel_imports'
      AND column_name = 'custom_trait_override'
  ) THEN
    -- Rename to custom_trait
    ALTER TABLE public.channel_imports
      RENAME COLUMN custom_trait_override TO custom_trait;
  END IF;
END $$;

-- 3. Ensure target_category_id is TEXT not UUID
DO $$
BEGIN
  -- Check current type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'channel_imports'
      AND column_name = 'target_category_id'
      AND data_type = 'uuid'
  ) THEN
    -- Drop FK constraint if exists
    ALTER TABLE public.channel_imports
      DROP CONSTRAINT IF EXISTS channel_imports_target_category_id_fkey;

    -- Change to TEXT with CHECK
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

-- 4. Ensure speakers.category_id is TEXT not UUID
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'speakers'
      AND column_name = 'category_id'
      AND data_type = 'uuid'
  ) THEN
    -- Drop FK constraint if exists
    ALTER TABLE public.speakers
      DROP CONSTRAINT IF EXISTS speakers_category_id_fkey;

    -- Change to TEXT with CHECK
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

-- 5. Ensure speakers.source_type uses correct values
DO $$
BEGIN
  -- Update 'curated' to 'built_in' if exists
  UPDATE public.speakers
  SET source_type = 'built_in'
  WHERE source_type = 'curated';

  -- Drop old constraint
  ALTER TABLE public.speakers
    DROP CONSTRAINT IF EXISTS speakers_source_type_check;

  -- Add correct constraint
  ALTER TABLE public.speakers
    ADD CONSTRAINT speakers_source_type_check
    CHECK (source_type IN ('built_in', 'imported'));
END $$;

-- 6. Update RLS policies to use correct source_type value
DROP POLICY IF EXISTS "speakers: select curated or own imported" ON public.speakers;
DROP POLICY IF EXISTS "speakers: select authenticated" ON public.speakers;

CREATE POLICY "speakers: select built_in or own imported"
  ON public.speakers FOR SELECT
  USING (
    source_type = 'built_in'
    OR source_user_id = auth.uid()
  );

-- 7. Ensure source_url is NOT NULL on channel_imports
ALTER TABLE public.channel_imports
  ALTER COLUMN source_url SET NOT NULL;

-- 8. Drop and recreate user_import_feed view with correct column names
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

-- 9. Mark deprecated functions with comments
COMMENT ON FUNCTION public.get_user_import_count(UUID) IS
  'DEPRECATED: Use check_import_quota() instead (migration 008). This function does not respect tier limits.';

-- 10. Ensure speech_embeddings RLS policy uses correct source_type
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
-- END OF MIGRATION 012
-- ============================================================
