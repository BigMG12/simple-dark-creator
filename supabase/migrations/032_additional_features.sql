-- ============================================================================
-- Migration 021: Additional Features Tables
-- ============================================================================
-- Adds tables for: weekly reviews, conversations, activity log, skill metrics
-- ============================================================================

-- ── Weekly Reviews ──────────────────────────────────────────────────────────
-- Stores AI-generated weekly performance reviews for users
CREATE TABLE IF NOT EXISTS public.weekly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_of DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Snapshot data
  sessions_count INTEGER NOT NULL DEFAULT 0,
  avg_score NUMERIC(5,2),
  minutes_spoken INTEGER NOT NULL DEFAULT 0,
  top_metric_label TEXT,
  top_metric_value TEXT,

  -- Review content
  body TEXT[] NOT NULL DEFAULT '{}',
  recommended_drill_id UUID REFERENCES public.drills(id) ON DELETE SET NULL,

  -- Metadata
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT weekly_reviews_user_week_unique UNIQUE(user_id, week_of)
);

CREATE INDEX idx_weekly_reviews_user_id ON public.weekly_reviews(user_id);
CREATE INDEX idx_weekly_reviews_week_of ON public.weekly_reviews(week_of DESC);

COMMENT ON TABLE public.weekly_reviews IS 'AI-generated weekly performance reviews';

-- ── Conversations Library ───────────────────────────────────────────────────
-- Stores practice conversations/scenarios for users
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  difficulty TEXT NOT NULL DEFAULT 'intermediate',

  -- Content
  scenario TEXT NOT NULL,
  context TEXT,
  goals TEXT[] NOT NULL DEFAULT '{}',

  -- Metadata
  duration_minutes INTEGER,
  times_practiced INTEGER NOT NULL DEFAULT 0,
  last_practiced_at TIMESTAMPTZ,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[] NOT NULL DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_conversations_category ON public.conversations(category);
CREATE INDEX idx_conversations_difficulty ON public.conversations(difficulty);
CREATE INDEX idx_conversations_is_favorite ON public.conversations(is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_conversations_tags ON public.conversations USING gin(tags);

COMMENT ON TABLE public.conversations IS 'Practice conversation scenarios';

-- ── Activity Log ────────────────────────────────────────────────────────────
-- Daily activity log for heatmap visualization
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,

  -- Activity metrics
  sessions_count INTEGER NOT NULL DEFAULT 0,
  total_minutes INTEGER NOT NULL DEFAULT 0,
  total_xp_earned INTEGER NOT NULL DEFAULT 0,
  drills_completed INTEGER NOT NULL DEFAULT 0,

  -- Intensity level (0-4: none, light, moderate, high, very_high)
  intensity_level INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT activity_log_user_date_unique UNIQUE(user_id, activity_date),
  CONSTRAINT activity_log_intensity_check CHECK (intensity_level >= 0 AND intensity_level <= 4)
);

CREATE INDEX idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX idx_activity_log_date ON public.activity_log(activity_date DESC);
CREATE INDEX idx_activity_log_user_date ON public.activity_log(user_id, activity_date DESC);

COMMENT ON TABLE public.activity_log IS 'Daily activity metrics for heatmap';

-- ── Skill Metrics ───────────────────────────────────────────────────────────
-- Tracks skill levels over time for radar chart visualization
CREATE TABLE IF NOT EXISTS public.skill_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Core speaking skills (0-100 scale)
  clarity NUMERIC(5,2) NOT NULL DEFAULT 0,
  confidence NUMERIC(5,2) NOT NULL DEFAULT 0,
  engagement NUMERIC(5,2) NOT NULL DEFAULT 0,
  pacing NUMERIC(5,2) NOT NULL DEFAULT 0,
  articulation NUMERIC(5,2) NOT NULL DEFAULT 0,
  vocabulary NUMERIC(5,2) NOT NULL DEFAULT 0,

  -- Metadata
  recording_id UUID REFERENCES public.recordings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT skill_metrics_values_check CHECK (
    clarity >= 0 AND clarity <= 100 AND
    confidence >= 0 AND confidence <= 100 AND
    engagement >= 0 AND engagement <= 100 AND
    pacing >= 0 AND pacing <= 100 AND
    articulation >= 0 AND articulation <= 100 AND
    vocabulary >= 0 AND vocabulary <= 100
  )
);

CREATE INDEX idx_skill_metrics_user_id ON public.skill_metrics(user_id);
CREATE INDEX idx_skill_metrics_recorded_at ON public.skill_metrics(recorded_at DESC);
CREATE INDEX idx_skill_metrics_user_recorded ON public.skill_metrics(user_id, recorded_at DESC);

COMMENT ON TABLE public.skill_metrics IS 'Skill level tracking for radar visualization';

-- ── RLS Policies ────────────────────────────────────────────────────────────

-- Weekly Reviews
ALTER TABLE public.weekly_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weekly reviews"
  ON public.weekly_reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weekly reviews"
  ON public.weekly_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly reviews"
  ON public.weekly_reviews FOR UPDATE
  USING (auth.uid() = user_id);

-- Conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON public.conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Activity Log
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity log"
  ON public.activity_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity log"
  ON public.activity_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activity log"
  ON public.activity_log FOR UPDATE
  USING (auth.uid() = user_id);

-- Skill Metrics
ALTER TABLE public.skill_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own skill metrics"
  ON public.skill_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own skill metrics"
  ON public.skill_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ── Helper Functions ────────────────────────────────────────────────────────

-- Function to update activity log when a recording is completed
CREATE OR REPLACE FUNCTION update_activity_log()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process completed recordings
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO public.activity_log (
      user_id,
      activity_date,
      sessions_count,
      total_minutes,
      total_xp_earned
    )
    VALUES (
      NEW.user_id,
      DATE(NEW.created_at),
      1,
      COALESCE(EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at)) / 60, 0)::INTEGER,
      COALESCE(NEW.xp_earned, 0)
    )
    ON CONFLICT (user_id, activity_date)
    DO UPDATE SET
      sessions_count = activity_log.sessions_count + 1,
      total_minutes = activity_log.total_minutes + COALESCE(EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at)) / 60, 0)::INTEGER,
      total_xp_earned = activity_log.total_xp_earned + COALESCE(NEW.xp_earned, 0),
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update activity log
DROP TRIGGER IF EXISTS trigger_update_activity_log ON public.recordings;
CREATE TRIGGER trigger_update_activity_log
  AFTER INSERT OR UPDATE ON public.recordings
  FOR EACH ROW
  EXECUTE FUNCTION update_activity_log();

-- Function to calculate intensity level based on activity
CREATE OR REPLACE FUNCTION calculate_intensity_level(
  p_sessions INTEGER,
  p_minutes INTEGER,
  p_xp INTEGER
)
RETURNS INTEGER AS $$
BEGIN
  -- Calculate intensity based on multiple factors
  -- 0: no activity
  -- 1: light (1 session or <15 min)
  -- 2: moderate (2-3 sessions or 15-30 min)
  -- 3: high (4-5 sessions or 30-60 min)
  -- 4: very high (6+ sessions or 60+ min)

  IF p_sessions = 0 THEN
    RETURN 0;
  ELSIF p_sessions = 1 OR p_minutes < 15 THEN
    RETURN 1;
  ELSIF p_sessions <= 3 OR p_minutes < 30 THEN
    RETURN 2;
  ELSIF p_sessions <= 5 OR p_minutes < 60 THEN
    RETURN 3;
  ELSE
    RETURN 4;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update intensity level automatically
CREATE OR REPLACE FUNCTION update_intensity_level()
RETURNS TRIGGER AS $$
BEGIN
  NEW.intensity_level := calculate_intensity_level(
    NEW.sessions_count,
    NEW.total_minutes,
    NEW.total_xp_earned
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate intensity
DROP TRIGGER IF EXISTS trigger_update_intensity ON public.activity_log;
CREATE TRIGGER trigger_update_intensity
  BEFORE INSERT OR UPDATE ON public.activity_log
  FOR EACH ROW
  EXECUTE FUNCTION update_intensity_level();

-- ============================================================================
-- End Migration 021
-- ============================================================================
