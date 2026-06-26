-- =====================================================================
-- BIG SPEAKING — brakujące migracje do Twojego projektu Supabase
-- Skopiuj CAŁY ten plik i uruchom w SQL Editor w Supabase Dashboard:
-- https://supabase.com/dashboard/project/hthjuoswarvsfssxqxxj/sql/new
-- =====================================================================

-- 1. Kolumna error_message (główna przyczyna błędu INVOKE_NETWORK)
ALTER TABLE public.recordings
  ADD COLUMN IF NOT EXISTS error_message TEXT;

-- 2. Dodatkowe kolumny diagnostyczne (przyszłościowo)
ALTER TABLE public.recordings
  ADD COLUMN IF NOT EXISTS error_code TEXT,
  ADD COLUMN IF NOT EXISTS analysis_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS analysis_failed_at TIMESTAMPTZ;

-- 3. Mentor-specific analysis (migracja 016)
ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS style_match_score INT CHECK (style_match_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS mentor_alternative_phrasing JSONB,
  ADD COLUMN IF NOT EXISTS mentor_drills JSONB,
  ADD COLUMN IF NOT EXISTS mentor_closing_line TEXT,
  ADD COLUMN IF NOT EXISTS mentor_violations JSONB,
  ADD COLUMN IF NOT EXISTS mentor_wins JSONB,
  ADD COLUMN IF NOT EXISTS mentor_persona_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS mentor_specific_metrics JSONB;

-- 4. Speaker categories metric overrides (migracja 020)
ALTER TABLE public.speaker_categories
  ADD COLUMN IF NOT EXISTS primary_metrics_this_mentor_cares_about JSONB NOT NULL DEFAULT '[]';

-- =====================================================================
-- Weryfikacja: po uruchomieniu, te zapytania powinny działać:
-- SELECT id, status, error_message FROM public.recordings LIMIT 1;
-- SELECT id, style_match_score, mentor_drills FROM public.analyses LIMIT 1;
-- =====================================================================
