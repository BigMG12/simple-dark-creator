-- ═══════════════════════════════════════════════════════
-- SPARRING BACKEND — production tables
-- ═══════════════════════════════════════════════════════

-- 1. Opponent personas (10 polskich, B2C retail)
CREATE TABLE IF NOT EXISTS opponent_personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  display_name text NOT NULL,         -- "Marek, 47, CFO firmy"
  short_label text NOT NULL,          -- "Sceptyczny Marek"
  category text NOT NULL,             -- 'sales_objection' | etc.
  persona_dna jsonb NOT NULL,         -- pełny profil
  typical_b2c_contexts jsonb NOT NULL,-- lista sytuacji
  difficulty_range int[] NOT NULL,    -- [1, 3]
  avatar_monogram text NOT NULL,      -- 2 litery (UI only)
  accent_color_hsl text NOT NULL,     -- "hsl(0 72% 51%)"
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 2. Sparring sessions
CREATE TABLE IF NOT EXISTS sparring_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Setup
  mentor_id uuid REFERENCES speakers(id),
  opponent_persona_id uuid REFERENCES opponent_personas(id),
  category text NOT NULL CHECK (category IN (
    'price_objection', 'indecision', 'competition',
    'anger', 'no_urgency'
  )),
  difficulty int NOT NULL CHECK (difficulty IN (1, 2, 3)),
  formality_level text NOT NULL DEFAULT 'mixed_panpani' CHECK (
    formality_level IN ('casual_ty', 'mixed_panpani',
    'formal_panpani')
  ),

  -- Scenario (AI generated)
  scenario_context text NOT NULL,
  scenario_backstory text,
  opponent_opening_line text NOT NULL,
  opponent_emotional_state text NOT NULL,
  expected_winning_moves jsonb,
  expected_losing_moves jsonb,

  -- User response
  recording_audio_url text,
  recording_duration_seconds int,
  user_transcript text,
  user_submitted_at timestamptz,

  -- Mentor analysis (after submit)
  sparring_verdict text,
  what_worked jsonb,
  what_failed jsonb,
  mentor_alternative_response text,
  mentor_close_line text,

  -- Scoring
  score_tactical int CHECK (score_tactical BETWEEN 0 AND 100),
  score_emotional int CHECK (score_emotional BETWEEN 0 AND 100),
  score_linguistic int CHECK (score_linguistic BETWEEN 0 AND 100),
  score_mentor_style int CHECK (score_mentor_style BETWEEN 0 AND 100),
  overall_score int CHECK (overall_score BETWEEN 0 AND 100),

  -- Follow-up
  assigned_drill_id uuid REFERENCES drills(id),
  xp_awarded int DEFAULT 0,

  -- Status
  status text NOT NULL DEFAULT 'setup_generated' CHECK (status IN (
    'setup_generated', 'awaiting_response', 'analyzing',
    'complete', 'failed'
  )),
  error_message text,

  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX idx_sparring_user_status
  ON sparring_sessions(user_id, status);
CREATE INDEX idx_sparring_user_category
  ON sparring_sessions(user_id, category);
CREATE INDEX idx_sparring_created
  ON sparring_sessions(created_at DESC);

-- 3. User sparring statistics (per category)
CREATE TABLE IF NOT EXISTS user_sparring_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category text NOT NULL,
  total_sparrings int DEFAULT 0,
  average_score numeric(5,2),
  best_score int,
  worst_score int,
  sparrings_won int DEFAULT 0,        -- score >= 75
  sparrings_survived int DEFAULT 0,   -- 50-74
  sparrings_lost int DEFAULT 0,       -- < 50
  weakest_dimension text,
  strongest_dimension text,
  last_sparring_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, category)
);

-- 4. User category unlocks (gating after 5 solo sessions)
CREATE TABLE IF NOT EXISTS user_category_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category text NOT NULL,
  solo_sessions_count int DEFAULT 0,
  sparring_unlocked boolean DEFAULT false,
  sparring_unlocked_at timestamptz,
  UNIQUE(user_id, category)
);

-- ═══════════════════════════════════════════════════════
-- RLS POLICIES — KRYTYCZNE: oba authenticated I service_role
-- ═══════════════════════════════════════════════════════

-- opponent_personas
ALTER TABLE opponent_personas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "opponent_personas: read authenticated"
  ON opponent_personas FOR SELECT TO authenticated USING (true);
CREATE POLICY "opponent_personas: read service_role"
  ON opponent_personas FOR SELECT TO service_role USING (true);

-- sparring_sessions
ALTER TABLE sparring_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sparring_sessions: own select"
  ON sparring_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "sparring_sessions: own insert"
  ON sparring_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sparring_sessions: own update"
  ON sparring_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "sparring_sessions: service_role full"
  ON sparring_sessions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- user_sparring_stats
ALTER TABLE user_sparring_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_sparring_stats: own select"
  ON user_sparring_stats FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "user_sparring_stats: service_role full"
  ON user_sparring_stats FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- user_category_unlocks
ALTER TABLE user_category_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_category_unlocks: own select"
  ON user_category_unlocks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "user_category_unlocks: service_role full"
  ON user_category_unlocks FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════

-- Trigger: po INSERT do analyses, zwiększ solo_sessions_count
CREATE OR REPLACE FUNCTION update_category_unlocks_after_analysis()
RETURNS trigger AS $$
DECLARE
  v_category text;
BEGIN
  -- Try to get category from speaker (mentor user trained with)
  SELECT category INTO v_category
  FROM speakers s
  JOIN recordings r ON r.target_speaker_id = s.id
  WHERE r.id = NEW.recording_id
  LIMIT 1;

  IF v_category IS NULL THEN
    RETURN NEW; -- can't categorize, skip
  END IF;

  -- Upsert solo count
  INSERT INTO user_category_unlocks (user_id, category, solo_sessions_count)
  VALUES (
    (SELECT user_id FROM recordings WHERE id = NEW.recording_id),
    v_category,
    1
  )
  ON CONFLICT (user_id, category) DO UPDATE
    SET solo_sessions_count = user_category_unlocks.solo_sessions_count + 1,
        sparring_unlocked = (user_category_unlocks.solo_sessions_count + 1 >= 5),
        sparring_unlocked_at = CASE
          WHEN user_category_unlocks.sparring_unlocked = false
            AND user_category_unlocks.solo_sessions_count + 1 >= 5
          THEN now()
          ELSE user_category_unlocks.sparring_unlocked_at
        END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- WARUNKOWO twórz trigger TYLKO jeśli analyses jest gotowa
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analyses' AND column_name = 'recording_id'
  ) THEN
    DROP TRIGGER IF EXISTS trg_update_category_unlocks
      ON analyses;
    CREATE TRIGGER trg_update_category_unlocks
      AFTER INSERT ON analyses
      FOR EACH ROW EXECUTE FUNCTION update_category_unlocks_after_analysis();
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════
-- STORAGE: nowy bucket dla sparring audio
-- ═══════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit,
  allowed_mime_types)
VALUES (
  'sparring-audio',
  'sparring-audio',
  false,
  10485760, -- 10MB (krócej niż recordings, bo max 30s)
  ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "sparring-audio: upload own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'sparring-audio'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "sparring-audio: read own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'sparring-audio'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "sparring-audio: service_role full"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'sparring-audio')
  WITH CHECK (bucket_id = 'sparring-audio');
