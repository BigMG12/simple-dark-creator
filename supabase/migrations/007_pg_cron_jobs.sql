-- ============================================================
-- Migration 007: Scheduled Jobs via pg_cron
--
-- Prerequisites:
--   • pg_cron must be enabled in your Supabase project.
--     Dashboard → Database → Extensions → pg_cron
--     (Available on Pro plan and above.)
--   • Run after 006_import_reliability.sql (needs import_events).
--
-- Jobs created:
--   stuck_import_recovery  — every 10 min
--   monthly_quota_reset    — daily at 00:00 UTC
--   transcript_job_cleanup — weekly on Sunday at 02:00 UTC
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- pg_cron runs as the postgres role; grant it schema access.
GRANT USAGE ON SCHEMA cron TO postgres;


-- ============================================================
-- FUNCTION: recover_stuck_imports
--
-- Called every 10 minutes.
-- A job is "stuck" when its status is an in-progress state and
-- updated_at has not moved in the last 15 minutes — meaning the
-- orchestrator edge function crashed, timed out, or was OOM-killed.
--
-- Recovery logic:
--   retry_count <= 3  → reset to 'queued' (orchestrator picks it up)
--   retry_count >  3  → mark 'failed' with a permanent error
--
-- All transitions are written to import_events for observability.
-- ============================================================

CREATE OR REPLACE FUNCTION public.recover_stuck_imports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
BEGIN
  FOR v_row IN
    SELECT id, retry_count
    FROM public.channel_imports
    WHERE status IN (
            'fetching_metadata',
            'fetching_transcripts',
            'transcribing_audio',
            'analyzing_style',
            'generating_persona',
            'embedding'
          )
      AND updated_at < NOW() - INTERVAL '15 minutes'
  LOOP
    IF v_row.retry_count > 3 THEN
      -- Too many retries: give up and surface to the user.
      UPDATE public.channel_imports
      SET
        status        = 'failed',
        error_message = 'exceeded retry limit',
        updated_at    = NOW()
      WHERE id = v_row.id;

      INSERT INTO public.import_events (import_id, event_type, event_data)
      VALUES (
        v_row.id,
        'failed_permanently',
        jsonb_build_object(
          'reason',       'exceeded retry limit',
          'retry_count',  v_row.retry_count,
          'triggered_by', 'stuck_import_recovery_cron'
        )
      );

    ELSE
      -- Requeue so the orchestrator retries the import.
      UPDATE public.channel_imports
      SET
        status      = 'queued',
        retry_count = retry_count + 1,
        updated_at  = NOW()
      WHERE id = v_row.id;

      INSERT INTO public.import_events (import_id, event_type, event_data)
      VALUES (
        v_row.id,
        'retry_attempted',
        jsonb_build_object(
          'new_retry_count', v_row.retry_count + 1,
          'triggered_by',    'stuck_import_recovery_cron'
        )
      );
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recover_stuck_imports() TO postgres;


-- ============================================================
-- FUNCTION: reset_monthly_quotas
--
-- Called daily at 00:00 UTC.
-- Resets imports_this_month for every quota row whose rolling
-- 30-day window has expired (reset_at < now()).
-- Sets the next window to now() + 30 days so the windows slide
-- naturally rather than locking to calendar months.
-- ============================================================

CREATE OR REPLACE FUNCTION public.reset_monthly_quotas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_speaker_imports_quota
  SET
    imports_this_month = 0,
    reset_at           = NOW() + INTERVAL '30 days'
  WHERE reset_at < NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_monthly_quotas() TO postgres;


-- ============================================================
-- FUNCTION: cleanup_old_transcript_jobs
--
-- Called weekly on Sunday at 02:00 UTC.
-- Deletes completed transcript_jobs older than 90 days.
-- Rationale: keep recent rows for debugging failed imports;
-- free storage for jobs that are clearly no longer needed.
-- Failed rows are intentionally retained — they may be needed
-- for a retry path or post-mortem audit.
-- ============================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_transcript_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM public.transcript_jobs
  WHERE status = 'complete'
    AND updated_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  -- Surface the count to pg_cron's job-run log for monitoring.
  RAISE NOTICE 'transcript_job_cleanup: deleted % rows', v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_old_transcript_jobs() TO postgres;


-- ============================================================
-- SCHEDULE THE THREE CRON JOBS
--
-- Wrapped in DO blocks so the migration is idempotent:
-- unschedule the old job first (if it exists), then re-create.
-- ============================================================

-- stuck_import_recovery
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'stuck_import_recovery') THEN
    PERFORM cron.unschedule('stuck_import_recovery');
  END IF;
END;
$$;

SELECT cron.schedule(
  'stuck_import_recovery',   -- job name
  '*/10 * * * *',            -- every 10 minutes
  $$SELECT public.recover_stuck_imports()$$
);


-- monthly_quota_reset
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'monthly_quota_reset') THEN
    PERFORM cron.unschedule('monthly_quota_reset');
  END IF;
END;
$$;

SELECT cron.schedule(
  'monthly_quota_reset',
  '0 0 * * *',               -- daily at 00:00 UTC
  $$SELECT public.reset_monthly_quotas()$$
);


-- transcript_job_cleanup
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'transcript_job_cleanup') THEN
    PERFORM cron.unschedule('transcript_job_cleanup');
  END IF;
END;
$$;

SELECT cron.schedule(
  'transcript_job_cleanup',
  '0 2 * * 0',               -- every Sunday at 02:00 UTC
  $$SELECT public.cleanup_old_transcript_jobs()$$
);
