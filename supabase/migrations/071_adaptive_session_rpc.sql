-- ═══════════════════════════════════════════════════════
-- RPC: detect_user_weakness — finds user's biggest weakness
--
-- Uses actual column names from analyses table:
--   filler_word_count, wpm, energy_variance_score, pause_count
-- ═══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION detect_user_weakness(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_avg_fillers numeric;
  v_avg_wpm numeric;
  v_avg_energy numeric;
  v_avg_pauses numeric;
  v_session_count int;
  v_weakness text;
BEGIN
  SELECT
    COUNT(*),
    AVG(COALESCE(filler_word_count, 0)),
    AVG(COALESCE(wpm, 165)),
    AVG(COALESCE(energy_variance_score, 50)),
    AVG(COALESCE(pause_count, 5))
  INTO v_session_count, v_avg_fillers, v_avg_wpm,
       v_avg_energy, v_avg_pauses
  FROM (
    SELECT a.* FROM analyses a
    JOIN recordings r ON r.id = a.recording_id
    WHERE r.user_id = p_user_id
    ORDER BY a.created_at DESC
    LIMIT 5
  ) recent;

  IF v_session_count < 3 THEN
    RETURN 'general';
  END IF;

  -- Detect biggest weakness (priority order)
  -- energy_variance_score is 0-100 (low = monotone)
  IF v_avg_fillers > 3 THEN
    v_weakness := 'fillers';
  ELSIF v_avg_wpm < 130 OR v_avg_wpm > 200 THEN
    v_weakness := 'pace';
  ELSIF v_avg_energy < 30 THEN
    v_weakness := 'energy';
  ELSIF v_avg_pauses < 2 OR v_avg_pauses > 15 THEN
    v_weakness := 'pauses';
  ELSE
    v_weakness := 'general';
  END IF;

  RETURN v_weakness;
END;
$$;

-- ═══════════════════════════════════════════════════════
-- Weakness → drill category mapping
--
-- Drill categories in DB: tongue-twister, pitch, storytelling, pacing, vocabulary
-- Weakness types: fillers, pace, energy, pauses, clarity, general
--
--   fillers  → vocabulary (mindful word choice)
--   pace     → pacing
--   energy   → pitch (vocal variation)
--   pauses   → pacing (timing control)
--   clarity  → tongue-twister (articulation)
--   general  → any category
-- ═══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION weakness_to_drill_category(p_weakness text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_weakness
    WHEN 'fillers' THEN 'vocabulary'
    WHEN 'pace'    THEN 'pacing'
    WHEN 'energy'  THEN 'pitch'
    WHEN 'pauses'  THEN 'pacing'
    WHEN 'clarity' THEN 'tongue-twister'
    ELSE NULL -- general → any category
  END;
$$;

-- ═══════════════════════════════════════════════════════
-- RPC: build_adaptive_session — main entry point
-- ═══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION build_adaptive_session(p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := COALESCE(p_user_id, auth.uid());
  v_weakness text;
  v_target_category text;
  v_session_id uuid;
  v_drill_easy_id uuid;
  v_drill_hard_id uuid;
  v_sequence jsonb := '[]'::jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No user_id provided and no auth context';
  END IF;

  v_weakness := detect_user_weakness(v_user_id);
  v_target_category := weakness_to_drill_category(v_weakness);

  -- Find easy drill matching weakness category
  SELECT id INTO v_drill_easy_id
  FROM drills
  WHERE (
    (v_target_category IS NOT NULL AND category = v_target_category)
    OR (v_target_category IS NULL AND category IS NOT NULL)
  )
  AND difficulty <= 2
  ORDER BY difficulty ASC, random()
  LIMIT 1;

  -- Fallback: any easy drill
  IF v_drill_easy_id IS NULL THEN
    SELECT id INTO v_drill_easy_id FROM drills
    WHERE difficulty <= 2 ORDER BY random() LIMIT 1;
  END IF;

  -- Ultimate fallback: any drill at all
  IF v_drill_easy_id IS NULL THEN
    SELECT id INTO v_drill_easy_id FROM drills
    ORDER BY random() LIMIT 1;
  END IF;

  -- Find harder drill matching weakness category
  SELECT id INTO v_drill_hard_id
  FROM drills
  WHERE (
    (v_target_category IS NOT NULL AND category = v_target_category)
    OR (v_target_category IS NULL AND category IS NOT NULL)
  )
  AND difficulty >= 3
  AND id IS DISTINCT FROM v_drill_easy_id
  ORDER BY difficulty DESC, random()
  LIMIT 1;

  -- Fallback: any harder drill
  IF v_drill_hard_id IS NULL THEN
    SELECT id INTO v_drill_hard_id FROM drills
    WHERE id IS DISTINCT FROM v_drill_easy_id
    ORDER BY difficulty DESC, random() LIMIT 1;
  END IF;

  -- Build 3-step sequence
  v_sequence := v_sequence || jsonb_build_object(
    'order', 1,
    'type', 'drill',
    'drill_id', v_drill_easy_id,
    'reason', 'Rozgrzewka na Twojej słabości: ' || v_weakness
  );

  v_sequence := v_sequence || jsonb_build_object(
    'order', 2,
    'type', 'impromptu',
    'duration_seconds', 60,
    'reason', 'Zastosuj umiejętność w swobodnej improwizacji'
  );

  v_sequence := v_sequence || jsonb_build_object(
    'order', 3,
    'type', 'drill',
    'drill_id', v_drill_hard_id,
    'reason', 'Wyzwanie: trudniejsza wersja Twojej słabości'
  );

  INSERT INTO training_sessions (
    user_id,
    weakness_focus,
    exercise_sequence,
    exercise_count,
    status
  ) VALUES (
    v_user_id,
    v_weakness,
    v_sequence,
    3,
    'active'
  ) RETURNING id INTO v_session_id;

  RETURN jsonb_build_object(
    'session_id', v_session_id,
    'weakness_focus', v_weakness,
    'exercise_count', 3,
    'sequence', v_sequence
  );
END;
$$;

-- ═══════════════════════════════════════════════════════
-- RPC: complete_session_exercise — mark progress
-- ═══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION complete_session_exercise(
  p_session_id uuid,
  p_recording_id uuid,
  p_score int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_completed int;
  v_total int;
  v_next_index int;
  v_status text;
  v_avg_score numeric;
BEGIN
  SELECT user_id, completed_exercises, exercise_count
  INTO v_user_id, v_completed, v_total
  FROM training_sessions WHERE id = p_session_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  IF v_user_id != auth.uid() AND current_setting('role', true) != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_next_index := v_completed + 1;

  IF v_next_index >= v_total THEN
    v_status := 'completed';
  ELSE
    v_status := 'active';
  END IF;

  UPDATE training_sessions SET
    completed_exercises = v_next_index,
    current_exercise_index = v_next_index,
    recording_ids = recording_ids || ARRAY[p_recording_id],
    status = v_status,
    completed_at = CASE WHEN v_status = 'completed' THEN now() ELSE completed_at END,
    total_xp_earned = total_xp_earned + GREATEST(p_score / 2, 10)
  WHERE id = p_session_id;

  SELECT AVG(overall_score) INTO v_avg_score
  FROM analyses
  WHERE recording_id = ANY(
    SELECT unnest(recording_ids) FROM training_sessions WHERE id = p_session_id
  );

  IF v_avg_score IS NOT NULL THEN
    UPDATE training_sessions SET average_score = v_avg_score
    WHERE id = p_session_id;
  END IF;

  RETURN jsonb_build_object(
    'session_id', p_session_id,
    'completed_exercises', v_next_index,
    'total_exercises', v_total,
    'status', v_status,
    'is_complete', v_status = 'completed'
  );
END;
$$;

-- ═══════════════════════════════════════════════════════
-- NOTIFY
-- ═══════════════════════════════════════════════════════
NOTIFY pgrst, 'reload schema';
