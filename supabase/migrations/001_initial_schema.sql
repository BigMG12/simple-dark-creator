-- ============================================================
-- BIG SPEAKING — Initial Schema Migration
-- Run this entire file in the Supabase SQL Editor (Settings →
-- SQL Editor) on a fresh project, or via: supabase db push
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================

-- gen_random_uuid() is built-in since Postgres 13 (Supabase ≥ v14)
-- uuid-ossp kept for any legacy uuid_generate_v4() calls
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- TABLE: speakers
-- Public, read-only AI coach personas.
-- Created before profiles because profiles has a FK into it.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.speakers (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT        NOT NULL,
  specialty             TEXT        NOT NULL,
  signature_trait       TEXT        NOT NULL,
  bio                   TEXT        NOT NULL,
  ideal_wpm_min         INT         NOT NULL,
  ideal_wpm_max         INT         NOT NULL,
  -- 'high' = deliberate long pauses, 'medium' = natural, 'low' = rapid fire
  ideal_pause_frequency TEXT        NOT NULL CHECK (ideal_pause_frequency IN ('high','medium','low')),
  energy_profile        TEXT        NOT NULL,
  -- [{title: "...", url: "..."}]
  famous_speeches       JSONB       NOT NULL DEFAULT '[]',
  -- ["learning one", "learning two", ...]
  learnings             JSONB       NOT NULL DEFAULT '[]',
  -- Two-character monogram displayed in the UI avatar
  monogram              CHAR(2)     NOT NULL,
  sort_order            INT         NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- TABLE: profiles
-- One row per auth.users row — auto-created via trigger below.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id                  UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT,
  full_name           TEXT,
  avatar_url          TEXT,
  -- The speaker the user is currently training with (nullable)
  selected_speaker_id UUID        REFERENCES public.speakers(id) ON DELETE SET NULL,
  current_xp          INT         NOT NULL DEFAULT 0,
  current_level       INT         NOT NULL DEFAULT 1,
  current_streak      INT         NOT NULL DEFAULT 0,
  longest_streak      INT         NOT NULL DEFAULT 0,
  last_session_date   DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- TABLE: drills
-- Public, read-only speaking exercises curated by the team.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.drills (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT        NOT NULL,
  category     TEXT        NOT NULL CHECK (category IN (
                 'tongue-twister','pitch','storytelling','pacing','vocabulary'
               )),
  difficulty   INT         NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  description  TEXT        NOT NULL,
  -- The actual text / script the user reads aloud
  content      TEXT        NOT NULL,
  instructions TEXT        NOT NULL,
  target_skill TEXT        NOT NULL,
  xp_reward    INT         NOT NULL DEFAULT 50,
  sort_order   INT         NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- TABLE: recordings
-- Every audio session submitted by a user.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.recordings (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Path in the Supabase Storage bucket, e.g. "{user_id}/{filename}"
  audio_url        TEXT        NOT NULL,
  duration_seconds INT,
  topic            TEXT        NOT NULL,
  topic_type       TEXT        NOT NULL CHECK (topic_type IN ('random','custom','speaker-challenge')),
  -- Populated when this recording is a drill submission
  drill_id         UUID        REFERENCES public.drills(id) ON DELETE SET NULL,
  transcript       TEXT,
  -- Edge Function updates this as analysis progresses
  status           TEXT        NOT NULL DEFAULT 'uploaded'
                   CHECK (status IN ('uploaded','analyzing','complete','failed')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- TABLE: analyses
-- AI analysis result — exactly one per recording (1:1).
-- Rows are written by the Edge Function using service_role key
-- (which bypasses RLS), but users can read their own via RLS.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.analyses (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Unique ensures the 1:1 relationship at the DB level
  recording_id              UUID        NOT NULL UNIQUE
                              REFERENCES public.recordings(id) ON DELETE CASCADE,
  wpm                       NUMERIC,
  filler_word_count         INT,
  -- {"um": 5, "like": 3, "basically": 2}
  filler_words_detected     JSONB,
  pause_count               INT,
  average_pause_duration_ms NUMERIC,
  energy_variance_score     NUMERIC     CHECK (energy_variance_score  BETWEEN 0 AND 100),
  clarity_score             NUMERIC     CHECK (clarity_score          BETWEEN 0 AND 100),
  vocabulary_depth_score    NUMERIC     CHECK (vocabulary_depth_score BETWEEN 0 AND 100),
  pause_mastery_score       NUMERIC     CHECK (pause_mastery_score    BETWEEN 0 AND 100),
  overall_score             NUMERIC     CHECK (overall_score          BETWEEN 0 AND 100),
  compared_to_speaker_id    UUID        REFERENCES public.speakers(id) ON DELETE SET NULL,
  feedback_summary          TEXT,
  -- ["tip one", "tip two", "tip three"]
  improvement_tips          JSONB,
  strongest_trait           TEXT,
  speaker_match_reasoning   TEXT,
  xp_awarded                INT         NOT NULL DEFAULT 0,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- TABLE: user_drill_completions
-- Records each time a user completes a drill (allows repeats).
-- The unique constraint on (user_id, drill_id, completed_at)
-- prevents exact duplicates while allowing multiple completions.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_drill_completions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  drill_id     UUID        NOT NULL REFERENCES public.drills(id)    ON DELETE CASCADE,
  -- Optional: the recording submitted as proof of completion
  recording_id UUID        REFERENCES public.recordings(id) ON DELETE SET NULL,
  score        NUMERIC,
  xp_earned    INT         NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, drill_id, completed_at)
);


-- ============================================================
-- TABLE: badges
-- Achievement definitions — public, read-only.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.badges (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT    NOT NULL,
  description       TEXT    NOT NULL,
  -- Lucide icon component name (e.g. "Flame", "Trophy", "Crown")
  icon_name         TEXT    NOT NULL,
  requirement_type  TEXT    NOT NULL CHECK (requirement_type IN (
                      'streak',
                      'total_recordings',
                      'score_threshold',
                      'drills_completed',
                      'speakers_compared',
                      'level_reached'
                    )),
  -- The numeric threshold that must be met/exceeded
  requirement_value INT     NOT NULL,
  sort_order        INT     NOT NULL DEFAULT 0
);


-- ============================================================
-- TABLE: user_badges
-- Which badges each user has unlocked.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_badges (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id  UUID        NOT NULL REFERENCES public.badges(id)   ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- A badge can only be earned once per user
  UNIQUE (user_id, badge_id)
);


-- ============================================================
-- TABLE: achievements_log
-- Immutable append-only event log for the profile timeline.
-- Never UPDATE or DELETE from this table.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.achievements_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type    TEXT        NOT NULL CHECK (event_type IN (
                  'badge_earned',
                  'level_up',
                  'streak_milestone',
                  'score_milestone'
                )),
  -- Arbitrary payload: {"badge_id": "...", "badge_name": "..."}
  --                 or {"old_level": 4, "new_level": 5}
  --                 or {"streak": 30}
  --                 or {"score": 94, "recording_id": "..."}
  event_payload JSONB       NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- INDEXES
-- Covering indexes for the most common query patterns.
-- ============================================================

-- Recording feed: user's recordings newest-first
CREATE INDEX IF NOT EXISTS idx_recordings_user_created
  ON public.recordings (user_id, created_at DESC);

-- Analysis lookup by recording (also covered by UNIQUE, but explicit)
CREATE INDEX IF NOT EXISTS idx_analyses_recording
  ON public.analyses (recording_id);

-- Drill history lookup (has this user done this drill?)
CREATE INDEX IF NOT EXISTS idx_drill_completions_user_drill
  ON public.user_drill_completions (user_id, drill_id);

-- Badge feed for a user
CREATE INDEX IF NOT EXISTS idx_user_badges_user
  ON public.user_badges (user_id);

-- Journey timeline newest-first
CREATE INDEX IF NOT EXISTS idx_achievements_log_user_created
  ON public.achievements_log (user_id, created_at DESC);

-- Speaker leaderboard / sort
CREATE INDEX IF NOT EXISTS idx_speakers_sort
  ON public.speakers (sort_order ASC);

-- Drill sort within category
CREATE INDEX IF NOT EXISTS idx_drills_category_sort
  ON public.drills (category, sort_order ASC);


-- ============================================================
-- TRIGGER: auto-create profile row on new user signup
-- The function runs as SECURITY DEFINER so it can INSERT into
-- public.profiles even before the user's own RLS policies exist.
-- SET search_path guards against search_path injection attacks.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;  -- idempotent: safe to replay
  RETURN NEW;
END;
$$;

-- Drop before recreate so this migration is re-runnable
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- ROW LEVEL SECURITY
-- Enable RLS on every table, then add policies.
-- ============================================================

ALTER TABLE public.profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speakers               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recordings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drills                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_drill_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements_log       ENABLE ROW LEVEL SECURITY;


-- ---- profiles -----------------------------------------------
-- Users can only see and modify their own profile row.

CREATE POLICY "profiles: select own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles: insert own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: update own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- ---- speakers (read-only for authenticated users) -----------

CREATE POLICY "speakers: select authenticated"
  ON public.speakers FOR SELECT
  USING (auth.role() = 'authenticated');


-- ---- drills (read-only for authenticated users) -------------

CREATE POLICY "drills: select authenticated"
  ON public.drills FOR SELECT
  USING (auth.role() = 'authenticated');


-- ---- badges (read-only for authenticated users) -------------

CREATE POLICY "badges: select authenticated"
  ON public.badges FOR SELECT
  USING (auth.role() = 'authenticated');


-- ---- recordings ---------------------------------------------
-- Full CRUD on own rows.

CREATE POLICY "recordings: select own"
  ON public.recordings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "recordings: insert own"
  ON public.recordings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "recordings: update own"
  ON public.recordings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "recordings: delete own"
  ON public.recordings FOR DELETE
  USING (auth.uid() = user_id);


-- ---- analyses -----------------------------------------------
-- A user can read analyses that belong to their own recordings.
-- Inserts / updates come from the Edge Function (service_role,
-- which bypasses RLS), but we still define policies so that a
-- direct client call cannot touch another user's data.

CREATE POLICY "analyses: select own"
  ON public.analyses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.recordings r
      WHERE r.id = recording_id
        AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "analyses: insert own"
  ON public.analyses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recordings r
      WHERE r.id = recording_id
        AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "analyses: update own"
  ON public.analyses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.recordings r
      WHERE r.id = recording_id
        AND r.user_id = auth.uid()
    )
  );


-- ---- user_drill_completions ---------------------------------

CREATE POLICY "drill_completions: select own"
  ON public.user_drill_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "drill_completions: insert own"
  ON public.user_drill_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ---- user_badges --------------------------------------------

CREATE POLICY "user_badges: select own"
  ON public.user_badges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_badges: insert own"
  ON public.user_badges FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ---- achievements_log (append-only) -------------------------

CREATE POLICY "achievements_log: select own"
  ON public.achievements_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "achievements_log: insert own"
  ON public.achievements_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- STORAGE: recordings bucket
-- Users may only access files inside their own folder:
--   recordings/{user_id}/any-filename.webm
-- The Edge Function uses service_role and bypasses these
-- policies, so it can read any file for transcription.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recordings',
  'recordings',
  false,                   -- private bucket, never publicly accessible
  52428800,                -- 50 MB per file
  ARRAY[
    'audio/webm',
    'audio/mp4',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/x-m4a'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage objects RLS — must explicitly enable it
-- (Supabase enables storage.objects RLS by default)

CREATE POLICY "storage: upload own recordings"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'recordings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "storage: read own recordings"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'recordings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "storage: delete own recordings"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'recordings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
