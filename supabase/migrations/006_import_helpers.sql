-- ============================================================
-- BIG SPEAKING — Import pipeline helper functions
-- Run after 005_speaker_imports.sql
-- ============================================================


-- ============================================================
-- FUNCTION: increment_import_progress
-- Atomically increments progress_current on a channel_imports row.
-- Called by process-transcripts after each job completes or fails.
-- Using an RPC instead of an UPDATE avoids read-modify-write races.
-- ============================================================

CREATE OR REPLACE FUNCTION public.increment_import_progress(p_import_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.channel_imports
  SET progress_current = progress_current + 1
  WHERE id = p_import_id;
$$;

-- Only edge functions (service_role) need to call this, but granting to
-- service_role is implicit. Grant to authenticated as a no-op safety valve.
GRANT EXECUTE ON FUNCTION public.increment_import_progress(UUID) TO service_role;


-- ============================================================
-- CRON: retry stuck imports
-- Uses pg_cron (available on Supabase Pro plans) to periodically
-- reset imports that have been stuck in an active status for >30 min
-- back to 'queued' so the cron-triggered orchestrator picks them up.
--
-- To enable: run these statements in the SQL editor after enabling
-- the pg_cron extension in the Supabase dashboard (Extensions page).
-- ============================================================

-- Uncomment after enabling pg_cron:
-- SELECT cron.schedule(
--   'retry-stuck-imports',          -- job name (must be unique)
--   '*/15 * * * *',                 -- every 15 minutes
--   $$
--     UPDATE public.channel_imports
--     SET
--       status       = 'queued',
--       error_message = 'Auto-reset: was stuck in ' || status || ' for >30 min'
--     WHERE status IN (
--       'fetching_metadata',
--       'fetching_transcripts',
--       'analyzing_style',
--       'generating_persona',
--       'embedding'
--     )
--     AND created_at < NOW() - INTERVAL '30 minutes'
--     AND completed_at IS NULL;
--   $$
-- );


-- ============================================================
-- FUNCTION: get_import_summary
-- Convenience function for the frontend to get a rich import status
-- summary including job counts without doing multiple round-trips.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_import_summary(p_import_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_import      public.channel_imports%ROWTYPE;
  v_total       INT;
  v_complete    INT;
  v_failed      INT;
  v_pending     INT;
BEGIN
  SELECT * INTO v_import
  FROM public.channel_imports
  WHERE id = p_import_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- RLS: ensure the calling user owns this import
  IF auth.uid() != v_import.user_id THEN
    RETURN NULL;
  END IF;

  SELECT
    COUNT(*)                                                       AS total,
    COUNT(*) FILTER (WHERE status = 'complete')                   AS complete,
    COUNT(*) FILTER (WHERE status = 'failed')                     AS failed,
    COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress'))  AS pending
  INTO v_total, v_complete, v_failed, v_pending
  FROM public.transcript_jobs
  WHERE import_id = p_import_id;

  RETURN jsonb_build_object(
    'id',                    v_import.id,
    'status',                v_import.status,
    'source_type',           v_import.source_type,
    'source_url',            v_import.source_url,
    'progress_current',      v_import.progress_current,
    'progress_total',        v_import.progress_total,
    'resulting_speaker_id',  v_import.resulting_speaker_id,
    'error_message',         v_import.error_message,
    'created_at',            v_import.created_at,
    'completed_at',          v_import.completed_at,
    'jobs_total',            COALESCE(v_total, 0),
    'jobs_complete',         COALESCE(v_complete, 0),
    'jobs_failed',           COALESCE(v_failed, 0),
    'jobs_pending',          COALESCE(v_pending, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_import_summary(UUID) TO authenticated;


-- ============================================================
-- VIEW: user_import_feed
-- Pre-joined view for the imports list page. Includes speaker name
-- when the import has completed successfully.
-- ============================================================

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
  ci.target_category_id,
  ci.created_at,
  ci.completed_at,
  -- Join speaker name for the completed state
  s.name  AS speaker_name,
  s.monogram AS speaker_monogram,
  s.category_id AS speaker_category
FROM public.channel_imports ci
LEFT JOIN public.speakers s ON s.id = ci.resulting_speaker_id;

-- Views inherit RLS from base tables — no extra policy needed.
