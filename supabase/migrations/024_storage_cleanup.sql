-- ============================================================
-- BIG SPEAKING — Orphaned Storage Cleanup
-- Migration: 003_storage_cleanup.sql
--
-- Defines a Postgres function that purges recording files in
-- storage that have no matching row in public.recordings.
--
-- "Orphaned" = the DB row was deleted (or never created) but
-- the file was left behind.  This can happen if:
--   • A user deletes a recording from the app.
--   • An upload succeeded but the INSERT into recordings failed.
--   • A recording row was hard-deleted without cascading to storage.
--
-- Grace period: 7 days.  Files younger than 7 days are kept even
-- if they have no DB row — this allows a short window for the
-- Edge Function to create the row after a successful upload.
--
-- Scheduling:
--   Option A (recommended): pg_cron — see bottom of file.
--   Option B:                Supabase Edge Function on a CRON trigger.
-- ============================================================


-- ============================================================
-- FUNCTION: storage.cleanup_orphaned_recordings()
--
-- Returns: number of objects deleted.
-- Security: SECURITY DEFINER so it can access storage.objects
--           and public.recordings even when called from a low-
--           privilege role.  The search_path lock prevents
--           search_path injection attacks.
-- ============================================================

CREATE OR REPLACE FUNCTION storage.cleanup_orphaned_recordings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = storage, public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete storage objects that satisfy ALL of:
  --   1. Live in the `recordings` bucket.
  --   2. Are older than 7 days (grace period for in-flight uploads).
  --   3. Have no corresponding row in public.recordings that
  --      references their storage path via audio_url.
  DELETE FROM storage.objects
  WHERE bucket_id = 'recordings'
    AND created_at < NOW() - INTERVAL '7 days'
    AND NOT EXISTS (
      SELECT 1
      FROM public.recordings r
      WHERE r.audio_url = storage.objects.name
    );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Emit a notice so the result is visible in pg_cron job logs
  -- and in the Supabase Logs UI.
  RAISE NOTICE 'cleanup_orphaned_recordings: deleted % object(s)', deleted_count;

  RETURN deleted_count;
END;
$$;

-- Allow the postgres role (used by pg_cron) to execute this function.
GRANT EXECUTE ON FUNCTION storage.cleanup_orphaned_recordings() TO postgres;


-- ============================================================
-- FUNCTION: storage.cleanup_orphaned_recordings_dry_run()
--
-- Identical logic to the real cleaner but SELECTs instead of
-- DELETEs.  Run this manually before enabling the scheduled job
-- to verify it would only touch orphaned files.
--
-- Usage:
--   SELECT * FROM storage.cleanup_orphaned_recordings_dry_run();
-- ============================================================

CREATE OR REPLACE FUNCTION storage.cleanup_orphaned_recordings_dry_run()
RETURNS TABLE (
  object_name  TEXT,
  created_at   TIMESTAMPTZ,
  size_bytes   BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = storage, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.name::TEXT,
    o.created_at,
    (o.metadata->>'size')::BIGINT
  FROM storage.objects o
  WHERE o.bucket_id = 'recordings'
    AND o.created_at < NOW() - INTERVAL '7 days'
    AND NOT EXISTS (
      SELECT 1
      FROM public.recordings r
      WHERE r.audio_url = o.name
    )
  ORDER BY o.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION storage.cleanup_orphaned_recordings_dry_run() TO postgres;


-- ============================================================
-- SCHEDULING WITH pg_cron
--
-- pg_cron is available on all Supabase paid plans.
-- To check availability: SELECT * FROM pg_extension WHERE extname = 'pg_cron';
--
-- Run the block below MANUALLY in the SQL Editor after verifying
-- the dry-run output looks correct.  It is NOT included in the
-- automatic migration to avoid errors on projects without pg_cron.
-- ============================================================

/*  --- MANUAL STEP: run this once in the SQL Editor ---

-- Enable the extension if not already enabled:
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant pg_cron the ability to call our function:
GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule: daily at 03:00 UTC (low-traffic window).
-- The job name is unique; running this twice will error — use
-- cron.alter_job() or delete/recreate if you need to change it.
SELECT cron.schedule(
  'cleanup-orphaned-recordings',      -- unique job name
  '0 3 * * *',                        -- cron expression: 3:00 AM UTC daily
  $$SELECT storage.cleanup_orphaned_recordings()$$
);

-- To verify the job was created:
SELECT jobid, jobname, schedule, command, active
FROM cron.job
WHERE jobname = 'cleanup-orphaned-recordings';

-- To pause without deleting:
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-orphaned-recordings'),
  active := false
);

-- To remove entirely:
SELECT cron.unschedule('cleanup-orphaned-recordings');

*/


-- ============================================================
-- ALTERNATIVE: Edge Function CRON trigger (no pg_cron required)
--
-- If pg_cron is unavailable (free tier), create an Edge Function
-- at supabase/functions/cleanup-recordings/index.ts that calls:
--
--   const { data, error } = await adminClient
--     .rpc('cleanup_orphaned_recordings');
--
-- Then schedule it in the Supabase Dashboard:
--   Edge Functions → cleanup-recordings → Schedule → "0 3 * * *"
--
-- Or call it from a GitHub Actions workflow:
--
--   - name: Cleanup orphaned recordings
--     run: |
--       curl -X POST \
--         -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
--         "${{ secrets.SUPABASE_URL }}/functions/v1/cleanup-recordings"
--
-- ============================================================
