-- ============================================================
-- Migration 009: DB Trigger — Notify on Import Complete
--
-- When channel_imports.status transitions to 'complete', a
-- PostgreSQL trigger fires an async HTTP POST to the
-- notify-import-complete edge function via pg_net.
--
-- SETUP REQUIRED before deploying:
--   Run in SQL Editor (once per environment):
--
--     ALTER DATABASE postgres
--       SET app.supabase_url = 'https://<project-ref>.supabase.co';
--
--     ALTER DATABASE postgres
--       SET app.service_role_key = '<your-service-role-key>';
--
--   Or set them per session in the edge function by writing a
--   Supabase Database Webhook instead (Dashboard → Database → Webhooks).
--   The webhook approach requires no pg_net configuration at all.
--
-- pg_net note:
--   http_post is fire-and-forget; it does NOT block the UPDATE.
--   The edge function runs asynchronously.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;


-- ============================================================
-- FUNCTION: trigger_notify_import_complete()
--
-- Fires only when status changes TO 'complete'.
-- Posts { import_id, user_id } to the edge function.
-- Errors in http_post are swallowed intentionally — a delivery
-- failure must never roll back the status update itself.
-- ============================================================

CREATE OR REPLACE FUNCTION public.trigger_notify_import_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url             TEXT;
  v_service_key     TEXT;
BEGIN
  -- Only act on the 'complete' transition (not other updates).
  IF NEW.status <> 'complete' OR OLD.status = 'complete' THEN
    RETURN NEW;
  END IF;

  -- Read environment settings (set via ALTER DATABASE ... SET app.*).
  -- current_setting() returns '' if not set — the HTTP call will then
  -- fail silently, which is acceptable for an optional notification.
  BEGIN
    v_url         := current_setting('app.supabase_url', true);
    v_service_key := current_setting('app.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    -- Settings not configured; skip notification silently.
    RETURN NEW;
  END;

  IF v_url IS NULL OR v_url = '' THEN
    RETURN NEW;
  END IF;

  -- Fire-and-forget POST — result is ignored.
  PERFORM extensions.http_post(
    url     := v_url || '/functions/v1/notify-import-complete',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body    := jsonb_build_object(
      'import_id', NEW.id,
      'user_id',   NEW.user_id
    )::TEXT
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Notification failure must never block the status update.
  RAISE WARNING 'notify-import-complete trigger failed: %', SQLERRM;
  RETURN NEW;
END;
$$;


-- ============================================================
-- TRIGGER: on channel_imports UPDATE
-- ============================================================

DROP TRIGGER IF EXISTS on_import_complete ON public.channel_imports;

CREATE TRIGGER on_import_complete
  AFTER UPDATE OF status ON public.channel_imports
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notify_import_complete();


-- ============================================================
-- ALTERNATIVE (no pg_net / no ALTER DATABASE config needed):
--
-- Go to Supabase Dashboard → Database → Webhooks → Create webhook:
--   Table:  channel_imports
--   Events: UPDATE
--   URL:    https://<project-ref>.supabase.co/functions/v1/notify-import-complete
--   Headers: Authorization: Bearer <service_role_key>
--
-- The webhook fires on every UPDATE; filter inside the edge function.
-- This approach is simpler and does not require this migration at all.
-- ============================================================
