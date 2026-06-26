-- ============================================================================
-- Migration 022: User Goals and Personal Records
-- ============================================================================
-- Adds tables for: user goals, goal progress tracking, personal records
-- ============================================================================

-- ── User Goals ──────────────────────────────────────────────────────────────
-- Stores user-defined goals for tracking progress
CREATE TABLE IF NOT EXISTS public.user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,

  -- Goal type and target
  goal_type TEXT NOT NULL CHECK (goal_type IN ('metric', 'streak', 'custom')),
  target_metric TEXT, -- np. 'overall_score', 'pace_wpm', 'sessions_count'
  target_value NUMERIC NOT NULL,
  target_comparator TEXT NOT NULL CHECK (target_comparator IN ('average', 'minimum', 'total')),
  starting_value NUMERIC DEFAULT 0,

  -- Status and timeline
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  deadline DATE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,

  CONSTRAINT user_goals_user_title_unique UNIQUE(user_id, title)
);

CREATE INDEX idx_user_goals_user_id ON public.user_goals(user_id);
CREATE INDEX idx_user_goals_status ON public.user_goals(status);
CREATE INDEX idx_user_goals_deadline ON public.user_goals(deadline) WHERE deadline IS NOT NULL;

COMMENT ON TABLE public.user_goals IS 'User-defined goals for tracking progress';

-- ── Goal Progress ───────────────────────────────────────────────────────────
-- Tracks progress points for each goal over time
CREATE TABLE IF NOT EXISTS public.goal_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.user_goals(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_goal_progress_goal_id ON public.goal_progress(goal_id);
CREATE INDEX idx_goal_progress_recorded_at ON public.goal_progress(recorded_at DESC);
CREATE INDEX idx_goal_progress_goal_recorded ON public.goal_progress(goal_id, recorded_at DESC);

COMMENT ON TABLE public.goal_progress IS 'Progress tracking points for user goals';

-- ── Personal Records ────────────────────────────────────────────────────────
-- Stores user's personal best achievements
CREATE TABLE IF NOT EXISTS public.personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Record type and value
  record_type TEXT NOT NULL, -- 'highest_score', 'longest_session', 'fastest_pace', etc.
  record_value NUMERIC NOT NULL,
  record_label TEXT NOT NULL, -- Human-readable label

  -- Context
  recording_id UUID REFERENCES public.recordings(id) ON DELETE SET NULL,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Metadata
  previous_value NUMERIC,
  improvement_percent NUMERIC,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT personal_records_user_type_unique UNIQUE(user_id, record_type)
);

CREATE INDEX idx_personal_records_user_id ON public.personal_records(user_id);
CREATE INDEX idx_personal_records_type ON public.personal_records(record_type);
CREATE INDEX idx_personal_records_achieved_at ON public.personal_records(achieved_at DESC);

COMMENT ON TABLE public.personal_records IS 'User personal best achievements';

-- ── RLS Policies ────────────────────────────────────────────────────────────

-- User Goals
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals"
  ON public.user_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
  ON public.user_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON public.user_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON public.user_goals FOR DELETE
  USING (auth.uid() = user_id);

-- Goal Progress
ALTER TABLE public.goal_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goal progress"
  ON public.goal_progress FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_goals
    WHERE user_goals.id = goal_progress.goal_id
    AND user_goals.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own goal progress"
  ON public.goal_progress FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_goals
    WHERE user_goals.id = goal_progress.goal_id
    AND user_goals.user_id = auth.uid()
  ));

-- Personal Records
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own records"
  ON public.personal_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own records"
  ON public.personal_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own records"
  ON public.personal_records FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- End Migration 022
-- ============================================================================
