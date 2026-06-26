-- ============================================================
-- Migration 008: Quota Tier Helpers
--
-- What this adds:
--   1. check_import_quota() — replaces the simple get_user_import_count().
--      Returns a JSONB verdict (allowed/denied + reason) based on the
--      user's tier. Called by create-speaker-import-job before inserting.
--   2. increment_import_quota() — atomically bumps the counter when a
--      new import is created.
--   3. Realtime publication for channel_imports so the frontend can
--      subscribe to progress updates without polling.
-- ============================================================


-- ============================================================
-- FUNCTION: check_import_quota(p_user_id, p_video_count)
--
-- Returns JSONB with shape:
--   { "allowed": true,  "remaining_imports": 3, "video_limit": 25 }
--   { "allowed": false, "reason": "monthly_limit_exceeded", "limit": 5, "used": 5 }
--   { "allowed": false, "reason": "video_count_exceeded",   "limit": 25, "requested": 40 }
--
-- Tier limits:
--   free → 5 imports / month, 25 videos per import
--   pro  → 50 imports / month, 100 videos per import
--
-- Auto-creates a quota row for first-time users so callers never
-- have to INSERT before calling this function.
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_import_quota(
  p_user_id    UUID,
  p_video_count INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quota         RECORD;
  v_monthly_limit INT;
  v_video_limit   INT;
BEGIN
  -- Ensure a quota row exists for this user (idempotent).
  INSERT INTO public.user_speaker_imports_quota (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_quota
  FROM public.user_speaker_imports_quota
  WHERE user_id = p_user_id;

  -- Resolve limits for this tier.
  IF v_quota.tier = 'pro' THEN
    v_monthly_limit := 50;
    v_video_limit   := 100;
  ELSE
    -- Default: free tier
    v_monthly_limit := 5;
    v_video_limit   := 25;
  END IF;

  -- Monthly import cap.
  IF v_quota.imports_this_month >= v_monthly_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason',  'monthly_limit_exceeded',
      'limit',   v_monthly_limit,
      'used',    v_quota.imports_this_month,
      'reset_at', v_quota.reset_at
    );
  END IF;

  -- Per-import video cap (only checked when caller provides a count).
  IF p_video_count > 0 AND p_video_count > v_video_limit THEN
    RETURN jsonb_build_object(
      'allowed',    false,
      'reason',     'video_count_exceeded',
      'limit',      v_video_limit,
      'requested',  p_video_count
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed',           true,
    'remaining_imports', v_monthly_limit - v_quota.imports_this_month,
    'video_limit',       v_video_limit,
    'tier',              v_quota.tier
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_import_quota(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_import_quota(UUID, INT) TO service_role;


-- ============================================================
-- FUNCTION: increment_import_quota(p_user_id)
--
-- Called immediately after a new channel_imports row is created.
-- Uses UPDATE ... RETURNING to make the bump atomic.
-- Returns the updated imports_this_month count.
-- ============================================================

CREATE OR REPLACE FUNCTION public.increment_import_quota(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_count INT;
BEGIN
  -- Ensure row exists first (handles edge case where check_import_quota
  -- was bypassed, e.g. a direct service_role insert).
  INSERT INTO public.user_speaker_imports_quota (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.user_speaker_imports_quota
  SET imports_this_month = imports_this_month + 1
  WHERE user_id = p_user_id
  RETURNING imports_this_month INTO v_new_count;

  RETURN v_new_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_import_quota(UUID) TO service_role;


-- ============================================================
-- REALTIME: subscribe to channel_imports progress
--
-- The frontend uses supabase.channel(...).on('postgres_changes', ...)
-- to update the progress bar without polling. FULL identity means the
-- payload includes the new status and progress columns.
-- ============================================================

ALTER TABLE public.channel_imports REPLICA IDENTITY FULL;

DO $$
BEGIN
  -- Only add the publication if it isn't already there.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'channel_imports'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_imports;
  END IF;
END;
$$;
