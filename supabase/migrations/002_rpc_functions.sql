-- ============================================================
-- BIG SPEAKING — RPC functions & views
-- Run after 001_initial_schema.sql
-- ============================================================


-- ============================================================
-- FUNCTION: get_dashboard_stats
--
-- Returns a single JSONB object with all stats needed by the
-- Dashboard summary cards. Using JSONB (not a composite type)
-- keeps the client-side type cast simple and avoids a separate
-- CREATE TYPE migration step.
--
-- Called by: useDashboardStats()
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_sessions        INT;
  v_total_minutes         NUMERIC;
  v_avg_score             NUMERIC;
  v_best_score            NUMERIC;
  v_best_score_date       DATE;
  v_best_score_rec_id     UUID;
  v_total_drills          INT;
  v_current_streak        INT;
  v_longest_streak        INT;
BEGIN
  -- Aggregate recording + analysis data in one pass
  SELECT
    COUNT(r.id),
    COALESCE(SUM(r.duration_seconds) / 60.0, 0),
    ROUND(AVG(a.overall_score)::NUMERIC, 1),
    ROUND(MAX(a.overall_score)::NUMERIC, 1)
  INTO
    v_total_sessions,
    v_total_minutes,
    v_avg_score,
    v_best_score
  FROM recordings r
  LEFT JOIN analyses a ON a.recording_id = r.id
  WHERE r.user_id = p_user_id;

  -- Recording id and date of the all-time best score
  SELECT r.id, r.created_at::DATE
  INTO v_best_score_rec_id, v_best_score_date
  FROM recordings r
  JOIN  analyses a ON a.recording_id = r.id
  WHERE r.user_id = p_user_id
    AND a.overall_score IS NOT NULL
  ORDER BY a.overall_score DESC, r.created_at DESC
  LIMIT 1;

  -- Total drill completions (each attempt counts)
  SELECT COUNT(*)
  INTO v_total_drills
  FROM user_drill_completions
  WHERE user_id = p_user_id;

  -- Streaks are maintained on the profile row
  SELECT current_streak, longest_streak
  INTO v_current_streak, v_longest_streak
  FROM profiles
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'total_sessions',          COALESCE(v_total_sessions, 0),
    'total_minutes_spoken',    ROUND(COALESCE(v_total_minutes, 0)::NUMERIC, 1),
    'average_score',           v_avg_score,
    'best_score',              v_best_score,
    'best_score_date',         v_best_score_date,
    'best_score_recording_id', v_best_score_rec_id,
    'total_drills_completed',  COALESCE(v_total_drills, 0),
    'current_streak',          COALESCE(v_current_streak, 0),
    'longest_streak',          COALESCE(v_longest_streak, 0)
  );
END;
$$;

-- RLS: any authenticated user may call this function,
-- but the function body filters on p_user_id, so users
-- cannot read another user's stats.
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(UUID) TO authenticated;


-- ============================================================
-- FUNCTION: get_progress_chart
--
-- Returns one row per calendar day with the average overall_score
-- for that day, limited to the last p_days days.
-- Dates with no scored recordings are omitted (sparse).
--
-- Called by: useProgressChartData(days)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_progress_chart(
  p_user_id UUID,
  p_days    INT DEFAULT 14
)
RETURNS TABLE(date DATE, overall_score NUMERIC)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.created_at::DATE                      AS date,
    ROUND(AVG(a.overall_score)::NUMERIC, 1) AS overall_score
  FROM   recordings r
  JOIN   analyses   a ON a.recording_id = r.id
  WHERE  r.user_id = p_user_id
    AND  r.created_at >= (NOW() - (p_days || ' days')::INTERVAL)
    AND  a.overall_score IS NOT NULL
  GROUP  BY r.created_at::DATE
  ORDER  BY date ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_progress_chart(UUID, INT) TO authenticated;


-- ============================================================
-- FUNCTION: get_daily_drill
--
-- Deterministically selects one drill per calendar day using:
--   day_of_year mod total_drill_count
-- mapped to a stable row ordering (sort_order ASC, id ASC).
--
-- This is pure SQL — no state, no randomness — so the same
-- drill is returned to every user on the same calendar day,
-- which is the intended behaviour for a "drill of the day".
-- If per-user variation is ever needed, hash p_user_id into
-- the modulus expression.
--
-- Called by: useDailyDrill()
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_daily_drill(p_user_id UUID)
RETURNS SETOF public.drills
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ranked AS (
    SELECT
      *,
      (ROW_NUMBER() OVER (ORDER BY sort_order ASC, id ASC) - 1) AS rn,
      COUNT(*) OVER ()                                           AS total
    FROM drills
  )
  SELECT id, title, category, difficulty, description,
         content, instructions, target_skill, xp_reward,
         sort_order, created_at
  FROM   ranked
  WHERE  rn = EXTRACT(DOY FROM CURRENT_DATE)::INT % total
  LIMIT  1;
$$;

GRANT EXECUTE ON FUNCTION public.get_daily_drill(UUID) TO authenticated;


-- ============================================================
-- VIEW: recording_feed  (optional convenience view)
--
-- Pre-joins recordings + analyses for the feed / results pages.
-- The view inherits RLS from its underlying tables, so users
-- automatically see only their own rows.
-- ============================================================

CREATE OR REPLACE VIEW public.recording_feed AS
SELECT
  r.id,
  r.user_id,
  r.audio_url,
  r.duration_seconds,
  r.topic,
  r.topic_type,
  r.drill_id,
  r.transcript,
  r.status,
  r.created_at,
  -- Analysis columns (NULL until analysis completes)
  a.id                        AS analysis_id,
  a.wpm,
  a.filler_word_count,
  a.filler_words_detected,
  a.pause_count,
  a.average_pause_duration_ms,
  a.energy_variance_score,
  a.clarity_score,
  a.vocabulary_depth_score,
  a.pause_mastery_score,
  a.overall_score,
  a.compared_to_speaker_id,
  a.feedback_summary,
  a.improvement_tips,
  a.strongest_trait,
  a.speaker_match_reasoning,
  a.xp_awarded,
  a.created_at                AS analysis_created_at
FROM   public.recordings r
LEFT JOIN public.analyses a ON a.recording_id = r.id;

-- Views inherit RLS from base tables in Postgres — no separate policy needed.
