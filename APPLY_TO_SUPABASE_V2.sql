-- =====================================================================
-- BIG SPEAKING — APPLY_TO_SUPABASE_V2.sql
-- Pełna, idempotentna migracja brakujących kolumn dla projektu
-- hthjuoswarvsfssxqxxj. Skopiuj CAŁY plik i uruchom w SQL Editor:
-- https://supabase.com/dashboard/project/hthjuoswarvsfssxqxxj/sql/new
-- =====================================================================

-- 1) RECORDINGS — diagnostyka błędów analizy
ALTER TABLE public.recordings
  ADD COLUMN IF NOT EXISTS error_message       TEXT,
  ADD COLUMN IF NOT EXISTS error_code          TEXT,
  ADD COLUMN IF NOT EXISTS analysis_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS analysis_failed_at  TIMESTAMPTZ;

-- 2) ANALYSES — mentor-specific output (migracja 016)
ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS style_match_score           INT CHECK (style_match_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS mentor_alternative_phrasing JSONB,
  ADD COLUMN IF NOT EXISTS mentor_drills               JSONB,
  ADD COLUMN IF NOT EXISTS mentor_closing_line         TEXT,
  ADD COLUMN IF NOT EXISTS mentor_violations           JSONB,
  ADD COLUMN IF NOT EXISTS mentor_wins                 JSONB,
  ADD COLUMN IF NOT EXISTS mentor_persona_snapshot     JSONB,
  ADD COLUMN IF NOT EXISTS mentor_specific_metrics     JSONB;

-- 3) SPEAKER_CATEGORIES — mentor metric overrides (migracja 020)
ALTER TABLE public.speaker_categories
  ADD COLUMN IF NOT EXISTS primary_metrics_this_mentor_cares_about
    JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 4) SPEAKERS — kolumny v2 (curated/imported źródła)  ← TO POWODOWAŁO PĘTLĘ 400
ALTER TABLE public.speakers
  ADD COLUMN IF NOT EXISTS source                    TEXT NOT NULL DEFAULT 'curated',
  ADD COLUMN IF NOT EXISTS source_user_id            UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_public                 BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS source_youtube_channel_id TEXT,
  ADD COLUMN IF NOT EXISTS persona_profile           JSONB;

-- (opcjonalny) constraint na dozwolone wartości source
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'speakers_source_check'
  ) THEN
    ALTER TABLE public.speakers
      ADD CONSTRAINT speakers_source_check
      CHECK (source IN ('curated','imported','community'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS speakers_source_user_idx
  ON public.speakers (source_user_id) WHERE source = 'imported';

CREATE INDEX IF NOT EXISTS speakers_source_idx
  ON public.speakers (source);

-- =====================================================================
-- Weryfikacja — po wykonaniu te zapytania nie powinny rzucać błędów:
-- SELECT id, source, source_user_id, is_public FROM public.speakers LIMIT 1;
-- SELECT id, error_message FROM public.recordings LIMIT 1;
-- SELECT id, style_match_score FROM public.analyses LIMIT 1;
-- =====================================================================
