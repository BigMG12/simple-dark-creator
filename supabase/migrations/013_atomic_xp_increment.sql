-- ============================================================
-- FIX: Atomic XP increment to prevent race conditions
-- Problem: Profile XP updates are not atomic (read-modify-write)
-- Solution: Create function that does atomic increment in single query
-- ============================================================

CREATE OR REPLACE FUNCTION public.increment_profile_xp(
  p_user_id UUID,
  p_xp_delta INT,
  p_new_level INT,
  p_new_streak INT,
  p_longest_streak INT,
  p_session_date DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    current_xp = current_xp + p_xp_delta,
    current_level = p_new_level,
    current_streak = p_new_streak,
    longest_streak = p_longest_streak,
    last_session_date = p_session_date
  WHERE id = p_user_id;
END;
$$;

COMMENT ON FUNCTION public.increment_profile_xp IS
  'Atomically increments user XP and updates level/streak. Use this instead of read-modify-write to prevent race conditions.';
