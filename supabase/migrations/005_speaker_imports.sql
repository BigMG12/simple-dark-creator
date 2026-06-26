-- ============================================================
-- BIG SPEAKING — Speaker Import Pipeline Schema
-- Run after 004_enable_realtime.sql
-- supabase db push  OR  paste into SQL Editor
-- ============================================================

-- pgvector — required for 1536-dim OpenAI embeddings
CREATE EXTENSION IF NOT EXISTS vector;


-- ============================================================
-- Extend speakers table with import-specific columns
-- ============================================================

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


-- ============================================================
-- TABLE: channel_imports
-- One row per user-initiated import job. This is the top-level
-- record the frontend polls for progress updates.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.channel_imports (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_type          TEXT        NOT NULL CHECK (source_type IN (
                         'youtube_channel','youtube_video','rumble','spotify','upload'
                       )),
  -- The URL or storage path the user submitted
  source_url           TEXT        NOT NULL,
  status               TEXT        NOT NULL DEFAULT 'queued' CHECK (status IN (
                         'queued','fetching_metadata','fetching_transcripts',
                         'analyzing_style','generating_persona','embedding',
                         'complete','failed'
                       )),
  -- How many transcript_jobs have completed vs. total
  progress_current     INT         NOT NULL DEFAULT 0,
  progress_total       INT         NOT NULL DEFAULT 0,
  -- Raw metadata returned by the platform API (channel info, video list, etc.)
  source_metadata      JSONB,
  -- Populated when generate-speaker-persona succeeds
  resulting_speaker_id UUID        REFERENCES public.speakers(id) ON DELETE SET NULL,
  error_message        TEXT,
  -- Optional overrides the user can set before or after analysis
  custom_name          TEXT,
  custom_trait         TEXT,
  target_category_id   TEXT        CHECK (target_category_id IN (
                         'motivation','sales','influence','leadership','storytelling','authority'
                       )),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at         TIMESTAMPTZ
);


-- ============================================================
-- TABLE: transcript_jobs
-- One row per video/episode/file to be transcribed.
-- Child of channel_imports.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.transcript_jobs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id         UUID        NOT NULL REFERENCES public.channel_imports(id) ON DELETE CASCADE,
  -- Full URL of the video/episode, or storage path for uploads
  source_url        TEXT        NOT NULL,
  -- Supabase Storage path for upload source_type only
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
  -- Platform-specific identifier (YouTube video ID, Spotify episode ID, etc.)
  video_id          TEXT,
  title             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- TABLE: speech_embeddings
-- 1536-dim OpenAI embeddings for each ~500-token text chunk.
-- Used for similarity search (which speaker does user sound like?).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.speech_embeddings (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  speaker_id  UUID          NOT NULL REFERENCES public.speakers(id) ON DELETE CASCADE,
  -- Nullable: built-in speakers don't have an import_id
  import_id   UUID          REFERENCES public.channel_imports(id) ON DELETE SET NULL,
  chunk_index INT           NOT NULL,
  chunk_text  TEXT          NOT NULL,
  embedding   vector(1536)  NOT NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_channel_imports_user_created
  ON public.channel_imports (user_id, created_at DESC);

-- The cron retry job queries by status
CREATE INDEX IF NOT EXISTS idx_channel_imports_status
  ON public.channel_imports (status, created_at)
  WHERE status NOT IN ('complete', 'failed');

CREATE INDEX IF NOT EXISTS idx_transcript_jobs_import_status
  ON public.transcript_jobs (import_id, status);

CREATE INDEX IF NOT EXISTS idx_speech_embeddings_speaker
  ON public.speech_embeddings (speaker_id, chunk_index);

-- IVFFlat approximate nearest-neighbour index.
-- Build this AFTER you have >1 000 rows, with CONCURRENTLY to avoid lock.
-- Uncomment and run manually:
-- CREATE INDEX CONCURRENTLY idx_speech_embeddings_vector
--   ON public.speech_embeddings
--   USING ivfflat (embedding vector_cosine_ops)
--   WITH (lists = 100);


-- ============================================================
-- ROW LEVEL SECURITY
-- Edge Functions use the service_role key and bypass RLS.
-- Client-side queries are filtered by these policies.
-- ============================================================

ALTER TABLE public.channel_imports   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcript_jobs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speech_embeddings ENABLE ROW LEVEL SECURITY;

-- channel_imports: users see / create only their own rows
CREATE POLICY "channel_imports: select own"
  ON public.channel_imports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "channel_imports: insert own"
  ON public.channel_imports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- transcript_jobs: visible if the parent import belongs to the user
CREATE POLICY "transcript_jobs: select own"
  ON public.transcript_jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.channel_imports ci
      WHERE ci.id = import_id AND ci.user_id = auth.uid()
    )
  );

-- speech_embeddings: readable for built-in speakers (everyone) and
-- for a user's own imported speakers
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
-- FUNCTION: get_user_import_count
-- Returns how many imports the calling user has created this
-- calendar month. Used by create-speaker-import-job for quota.
-- ============================================================

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
