-- ============================================================
-- Migration 010: Poll Queued Imports via pg_net + pg_cron
--
-- WHY THIS IS NEEDED:
--   Migration 007 sets up recover_stuck_imports() to reset in-progress
--   stuck imports back to 'queued'. But resetting the DB row alone is
--   not enough — the run-import-orchestrator Edge Function must also be
--   invoked to resume processing.
--
--   This migration adds a pg_cron job that calls the retry-stuck-imports
--   Edge Function every 10 minutes via pg_net (HTTP). That function finds
--   all 'queued' imports older than 2 minutes and re-triggers the orchestrator.
--
-- PREREQUISITES:
--   • pg_net enabled: Dashboard → Database → Extensions → pg_net
--   • pg_cron enabled (already done in 007)
--   • SET app.supabase_url and app.service_role_key on the database
--     (same as done for 009_import_complete_trigger.sql):
--
--       ALTER DATABASE postgres
--         SET app.supabase_url = 'https://<project-ref>.supabase.co';
--       ALTER DATABASE postgres
--         SET app.service_role_key = '<your-service-role-key>';
--
-- ALTERNATIVE (no pg_net config needed):
--   Use a Supabase Dashboard Scheduled Function instead:
--   Functions → Schedule → POST /functions/v1/retry-stuck-imports every 10 min.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;


-- ============================================================
-- FUNCTION: invoke_retry_stuck_imports()
--
-- Called by pg_cron every 10 minutes.
-- Posts a fire-and-forget HTTP request to the retry-stuck-imports
-- Edge Function using the same pattern as trigger_notify_import_complete().
-- ============================================================

CREATE OR REPLACE FUNCTION public.invoke_retry_stuck_imports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url         TEXT;
  v_service_key TEXT;
BEGIN
  BEGIN
    v_url         := current_setting('app.supabase_url', true);
    v_service_key := current_setting('app.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'invoke_retry_stuck_imports: app settings not configured — skipping';
    RETURN;
  END;

  IF v_url IS NULL OR v_url = '' THEN
    RAISE WARNING 'invoke_retry_stuck_imports: app.supabase_url not set — skipping';
    RETURN;
  END IF;

  -- Fire-and-forget: pg_net does not block on the response.
  PERFORM extensions.http_post(
    url     := v_url || '/functions/v1/retry-stuck-imports',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body    := '{}'
  );
EXCEPTION WHEN OTHERS THEN
  -- Never let a notification failure surface to the caller.
  RAISE WARNING 'invoke_retry_stuck_imports: pg_net call failed: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.invoke_retry_stuck_imports() TO postgres;


-- ============================================================
-- CRON JOB: poll_queued_imports
--
-- Runs every 10 minutes, offset by 5 minutes from stuck_import_recovery
-- so the two jobs don't fire simultaneously. Sequence:
--   :00 — stuck_import_recovery resets stuck in-progress → queued
--   :05 — poll_queued_imports finds the newly-queued rows → triggers orchestrator
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'poll_queued_imports') THEN
    PERFORM cron.unschedule('poll_queued_imports');
  END IF;
END;
$$;

SELECT cron.schedule(
  'poll_queued_imports',
  '5,15,25,35,45,55 * * * *',        -- at :05, :15, :25, :35, :45, :55 (every 10 min)
  $$SELECT public.invoke_retry_stuck_imports()$$
);
