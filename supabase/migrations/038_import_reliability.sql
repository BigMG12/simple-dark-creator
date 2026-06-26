-- ============================================================
-- Migration 006: Import Reliability — Columns, Quota & Audit
-- Builds on top of 005_speaker_imports.sql.
--
-- What this adds:
--   1. retry_count + updated_at columns on channel_imports
--   2. 'cancelled' + 'transcribing_audio' status values
--   3. updated_at + 'skipped' status on transcript_jobs
--   4. user_speaker_imports_quota table (with tier)
--   5. import_events audit-log table
-- ============================================================


-- ============================================================
-- 1. EXTEND channel_imports
-- ============================================================

-- Track how many times the cron job (or user) has requeued this import.
ALTER TABLE public.channel_imports
  ADD COLUMN IF NOT EXISTS retry_count INT NOT NULL DEFAULT 0;

-- Needed for the stuck-import recovery cron: it filters on updated_at.
ALTER TABLE public.channel_imports
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Widen the status check constraint to include 'cancelled' and
-- 'transcribing_audio' (used when the orchestrator calls Whisper).
ALTER TABLE public.channel_imports
  DROP CONSTRAINT IF EXISTS channel_imports_status_check;

ALTER TABLE public.channel_imports
  ADD CONSTRAINT channel_imports_status_check CHECK (status IN (
    'queued',
    'fetching_metadata',
    'fetching_transcripts',
    'transcribing_audio',    -- Whisper API pass is in progress
    'analyzing_style',
    'generating_persona',
    'embedding',
    'complete',
    'failed',
    'cancelled'              -- user explicitly stopped the import
  ));

-- Keep updated_at current on every write.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS channel_imports_set_updated_at ON public.channel_imports;
CREATE TRIGGER channel_imports_set_updated_at
  BEFORE UPDATE ON public.channel_imports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- The stuck-import recovery cron queries this column.
CREATE INDEX IF NOT EXISTS idx_channel_imports_updated_at
  ON public.channel_imports (updated_at)
  WHERE status NOT IN ('complete', 'failed', 'cancelled');


-- ============================================================
-- 2. EXTEND transcript_jobs
-- ============================================================

ALTER TABLE public.transcript_jobs
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 'skipped' is set by cancel-import to short-circuit pending work.
ALTER TABLE public.transcript_jobs
  DROP CONSTRAINT IF EXISTS transcript_jobs_status_check;

ALTER TABLE public.transcript_jobs
  ADD CONSTRAINT transcript_jobs_status_check CHECK (status IN (
    'pending',
    'in_progress',
    'complete',
    'failed',
    'skipped'   -- parent import was cancelled; job was never started
  ));

DROP TRIGGER IF EXISTS transcript_jobs_set_updated_at ON public.transcript_jobs;
CREATE TRIGGER transcript_jobs_set_updated_at
  BEFORE UPDATE ON public.transcript_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Supports weekly cleanup cron: status = 'complete' AND updated_at < now()-90d.
CREATE INDEX IF NOT EXISTS idx_transcript_jobs_cleanup
  ON public.transcript_jobs (status, updated_at)
  WHERE status = 'complete';


-- ============================================================
-- 3. TABLE: user_speaker_imports_quota
--
-- One row per user. Tracks rolling 30-day import usage.
-- tier drives per-user limits (see check_import_quota() in 008).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_speaker_imports_quota (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL UNIQUE
                         REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- 'free': 5 imports/month, 25 videos max
  -- 'pro' : 50 imports/month, 100 videos max (billing hook for future)
  tier                 TEXT        NOT NULL DEFAULT 'free'
                         CHECK (tier IN ('free', 'pro')),
  imports_this_month   INT         NOT NULL DEFAULT 0,
  -- Rolling window; reset daily by monthly_quota_reset cron job.
  reset_at             TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The daily reset cron job queries this column with reset_at < now().
CREATE INDEX IF NOT EXISTS idx_quota_reset_at
  ON public.user_speaker_imports_quota (reset_at);

ALTER TABLE public.user_speaker_imports_quota ENABLE ROW LEVEL SECURITY;

-- Users can see their own quota so the UI can display remaining imports.
CREATE POLICY "quota: select own"
  ON public.user_speaker_imports_quota FOR SELECT
  USING (auth.uid() = user_id);


-- ============================================================
-- 4. TABLE: import_events
--
-- Append-only audit log. Every state change in the pipeline
-- writes a row here so we can reconstruct exactly what happened
-- to a failed import without digging through edge-function logs.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.import_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id   UUID        NOT NULL REFERENCES public.channel_imports(id) ON DELETE CASCADE,
  -- Controlled vocabulary keeps dashboards queryable.
  event_type  TEXT        NOT NULL CHECK (event_type IN (
                'queued',
                'retry_attempted',
                'cancelled',
                'completed',
                'failed_permanently'
              )),
  -- Freeform payload: retry_count, error, triggering actor, etc.
  event_data  JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Most queries filter by import_id; secondary filter on event_type.
CREATE INDEX IF NOT EXISTS idx_import_events_import_id
  ON public.import_events (import_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_import_events_type
  ON public.import_events (event_type, created_at DESC);

ALTER TABLE public.import_events ENABLE ROW LEVEL SECURITY;

-- Users can audit their own imports' events; service_role bypasses RLS.
CREATE POLICY "import_events: select own"
  ON public.import_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.channel_imports ci
      WHERE ci.id = import_events.import_id
        AND ci.user_id = auth.uid()
    )
  );
