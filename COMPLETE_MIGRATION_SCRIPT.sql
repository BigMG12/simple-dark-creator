-- ============================================================
-- KOMPLETNY SKRYPT MIGRACJI — BIG SPEAKING
-- Data: 2026-04-22
-- Zawiera: 005_speaker_imports.sql + migracje naprawcze (012, 013)
--
-- INSTRUKCJA:
-- 1. Skopiuj całą zawartość tego pliku
-- 2. Otwórz https://supabase.com/dashboard/project/hthjuoswarvsfssxqxxj/sql
-- 3. Wklej i uruchom (RUN)
-- ============================================================

-- ============================================================
-- CZĘŚĆ 1: SPEAKER IMPORT PIPELINE (005_speaker_imports.sql)
-- Tworzy tabele: channel_imports, transcript_jobs, speech_embeddings
-- ============================================================

-- pgvector — wymagane dla 1536-dim OpenAI embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Rozszerz tabelę speakers o kolumny związane z importem
ALTER TABLE public.speakers
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'built_in'
    CHECK (source_type IN ('built_in', 'imported')),
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS source_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS signature_phrases JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS common_themes JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS persuasion_techniques JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS style_traits JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS perfect_for TEXT,
  ADD COLUMN IF NOT EXISTS category_id TEXT
    CHECK (category_id IN ('motivation','sales','influence','leadership','storytelling','authority')),
  ADD COLUMN IF NOT EXISTS video_count_analyzed INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transcribed_minutes NUMERIC NOT NULL DEFAULT 0;

-- Tabela: channel_imports
CREATE TABLE IF NOT EXISTS public.channel_imports (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_type          TEXT        NOT NULL CHECK (source_type IN (
                         'youtube_channel','youtube_video','rumble','spotify','upload'
                       )),
  source_url           TEXT        NOT NULL,
  status               TEXT        NOT NULL DEFAULT 'queued' CHECK (status IN (
                         'queued','fetching_metadata','fetching_transcripts',
                         'analyzing_style','generating_persona','embedding',
                         'complete','failed'
                       )),
  progress_current     INT         NOT NULL DEFAULT 0,
  progress_total       INT         NOT NULL DEFAULT 0,
  source_metadata      JSONB,
  resulting_speaker_id UUID        REFERENCES public.speakers(id) ON DELETE SET NULL,
  error_message        TEXT,
  custom_name          TEXT,
  custom_trait         TEXT,
  target_category_id   TEXT        CHECK (target_category_id IN (
                         'motivation','sales','influence','leadership','storytelling','authority'
                       )),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at         TIMESTAMPTZ
);

-- Tabela: transcript_jobs
CREATE TABLE IF NOT EXISTS public.transcript_jobs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id         UUID        NOT NULL REFERENCES public.channel_imports(id) ON DELETE CASCADE,
  source_url        TEXT        NOT NULL,
  storage_path      TEXT,
  transcript_method TEXT        NOT NULL CHECK (transcript_method IN (
                      'youtube_captions','whisper_api','spotify_transcript'
                    )),
  status            TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN (
                      'pending','in_progress','complete','failed'
                    )),
  transcript_text   TEXT,
  duration_seconds  NUMERIC,
  error_message     TEXT,
  video_id          TEXT,
  title             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: speech_embeddings
CREATE TABLE IF NOT EXISTS public.speech_embeddings (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  speaker_id  UUID          NOT NULL REFERENCES public.speakers(id) ON DELETE CASCADE,
  import_id   UUID          REFERENCES public.channel_imports(id) ON DELETE SET NULL,
  chunk_index INT           NOT NULL,
  chunk_text  TEXT          NOT NULL,
  embedding   vector(1536)  NOT NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Indeksy
CREATE INDEX IF NOT EXISTS idx_channel_imports_user_created
  ON public.channel_imports (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_channel_imports_status
  ON public.channel_imports (status, created_at)
  WHERE status NOT IN ('complete', 'failed');

CREATE INDEX IF NOT EXISTS idx_transcript_jobs_import_status
  ON public.transcript_jobs (import_id, status);

CREATE INDEX IF NOT EXISTS idx_speech_embeddings_speaker
  ON public.speech_embeddings (speaker_id, chunk_index);

-- Row Level Security
ALTER TABLE public.channel_imports   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcript_jobs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speech_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "channel_imports: select own"
  ON public.channel_imports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "channel_imports: insert own"
  ON public.channel_imports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transcript_jobs: select own"
  ON public.transcript_jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.channel_imports ci
      WHERE ci.id = import_id AND ci.user_id = auth.uid()
    )
  );

CREATE POLICY "speech_embeddings: select accessible"
  ON public.speech_embeddings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.speakers s
      WHERE s.id = speaker_id
        AND (s.source_type = 'built_in' OR s.source_user_id = auth.uid())
    )
  );

-- Funkcja: get_user_import_count
CREATE OR REPLACE FUNCTION public.get_user_import_count(p_user_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INT
  FROM public.channel_imports
  WHERE user_id = p_user_id
    AND created_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP);
$$;

GRANT EXECUTE ON FUNCTION public.get_user_import_count(UUID) TO authenticated;

-- ============================================================
-- CZĘŚĆ 2: MIGRACJE NAPRAWCZE (012, 013)
-- Naprawia konflikty i dodaje nowe funkcje
-- ============================================================

-- Usuń nieużywaną tabelę speaker_categories (jeśli istnieje)
DROP TABLE IF EXISTS public.speaker_categories CASCADE;

-- Widok: user_import_feed
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

-- Oznacz przestarzałe funkcje
COMMENT ON FUNCTION public.get_user_import_count(UUID) IS
  'DEPRECATED: Use check_import_quota() instead (migration 008). This function does not respect tier limits.';

-- Funkcja: handle_new_user (naprawiona)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_speaker_id UUID;
BEGIN
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

-- Funkcja: increment_profile_xp (atomiczne inkrementacje XP)
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
