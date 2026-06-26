-- ═══════════════════════════════════════════════════════
-- TRAINING SESSIONS — adaptive learning paths
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  status text NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'completed', 'abandoned'
  )),

  exercise_count int NOT NULL DEFAULT 3,
  completed_exercises int DEFAULT 0,
  current_exercise_index int DEFAULT 0,

  weakness_focus text,
  -- 'fillers' | 'pace' | 'energy' | 'pauses' | 'clarity' | 'general'

  exercise_sequence jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Array: [{ order, type: 'drill'|'impromptu'|'custom',
  --   drill_id?, topic?, duration?, reason }]

  recording_ids uuid[] DEFAULT ARRAY[]::uuid[],

  total_xp_earned int DEFAULT 0,
  average_score numeric(5,2),
  weakness_improvement numeric(5,2),

  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  abandoned_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_training_sessions_user_status
  ON training_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_training_sessions_user_started
  ON training_sessions(user_id, started_at DESC);

-- ═══════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════

ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'training_sessions' AND policyname = 'training_sessions: own select'
  ) THEN
    CREATE POLICY "training_sessions: own select"
      ON training_sessions FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'training_sessions' AND policyname = 'training_sessions: own insert'
  ) THEN
    CREATE POLICY "training_sessions: own insert"
      ON training_sessions FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'training_sessions' AND policyname = 'training_sessions: own update'
  ) THEN
    CREATE POLICY "training_sessions: own update"
      ON training_sessions FOR UPDATE TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'training_sessions' AND policyname = 'training_sessions: service_role full'
  ) THEN
    CREATE POLICY "training_sessions: service_role full"
      ON training_sessions FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════
-- NOTIFY schema reload
-- ═══════════════════════════════════════════════════════
NOTIFY pgrst, 'reload schema';
