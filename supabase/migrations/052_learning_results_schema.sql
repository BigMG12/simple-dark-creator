-- ============================================================
-- BIG SPEAKING — Learning Results Schema
-- Migration: 052_learning_results_schema.sql
-- Rozszerza analyses i dodaje tabele dla systemu uczącego
-- ============================================================

-- ============================================================
-- SECTION 1: Rozszerz analyses table
-- ============================================================

ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS verdict_label text
    CHECK (verdict_label IN ('Surowy', 'Solidny', 'Mocny', 'Mistrzowski')),
  ADD COLUMN IF NOT EXISTS mentor_quote_responsive text,
  ADD COLUMN IF NOT EXISTS what_was_wrong jsonb,
  ADD COLUMN IF NOT EXISTS how_to_fix jsonb,
  ADD COLUMN IF NOT EXISTS metrics_with_context jsonb,
  ADD COLUMN IF NOT EXISTS next_step jsonb,
  ADD COLUMN IF NOT EXISTS learning_resources jsonb;

COMMENT ON COLUMN public.analyses.verdict_label IS
'Label werbalny dla score: Surowy (0-40), Solidny (41-70), Mocny (71-89), Mistrzowski (90-100)';

COMMENT ON COLUMN public.analyses.mentor_quote_responsive IS
'Cytat mentora bazowany na RZECZYWISTYCH METRYKACH tej sesji (nie generic)';

COMMENT ON COLUMN public.analyses.what_was_wrong IS
'JSON: {moment: string, diagnosis: string, what_client_thought: string}';

COMMENT ON COLUMN public.analyses.how_to_fix IS
'JSON: {instead_of: string, say_this: string, why_this_works: string}';

COMMENT ON COLUMN public.analyses.metrics_with_context IS
'JSON: 6 metryk z benchmarkami, interpretacją, deltą vs poprzednia, status';

COMMENT ON COLUMN public.analyses.next_step IS
'JSON: {drill_id: uuid, drill_recommendation_reason: string, mentor_push_to_action: string}';

COMMENT ON COLUMN public.analyses.learning_resources IS
'JSON: array artykułów uczących powiązanych z weakest dimension';


-- ============================================================
-- SECTION 2: Tabela user_skill_progress
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_skill_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_name text NOT NULL,
  measurement_date date NOT NULL,
  value numeric NOT NULL,
  recording_id uuid REFERENCES public.recordings(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_progress_user_skill_date
  ON public.user_skill_progress(user_id, skill_name, measurement_date);

CREATE INDEX IF NOT EXISTS idx_skill_progress_user_date
  ON public.user_skill_progress(user_id, measurement_date DESC);

COMMENT ON TABLE public.user_skill_progress IS
'Śledzenie postępu w 6 wymiarach: pace_wpm, fillers, pause_mastery, energy_variance, clarity, vocabulary';

COMMENT ON COLUMN public.user_skill_progress.skill_name IS
'Nazwa metryki: pace_wpm | fillers | pause_mastery | energy_variance | clarity | vocabulary';


-- ============================================================
-- SECTION 3: Tabela personal_records
-- ============================================================

CREATE TABLE IF NOT EXISTS public.personal_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  best_value numeric NOT NULL,
  achieved_at timestamptz DEFAULT now(),
  recording_id uuid REFERENCES public.recordings(id) ON DELETE SET NULL,
  UNIQUE(user_id, metric_name)
);

CREATE INDEX IF NOT EXISTS idx_personal_records_user
  ON public.personal_records(user_id);

COMMENT ON TABLE public.personal_records IS
'Personal bests usera dla każdej metryki - automatycznie aktualizowane przez trigger';


-- ============================================================
-- SECTION 4: Tabela learning_articles
-- ============================================================

CREATE TABLE IF NOT EXISTS public.learning_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  title_pl text NOT NULL,
  content_md text NOT NULL,
  read_time_minutes int,
  difficulty_level text CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  related_drill_ids uuid[],
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_learning_articles_topic
  ON public.learning_articles(topic);

COMMENT ON TABLE public.learning_articles IS
'Artykuły uczące (5-7 min czytania) pokrywające 6 metryk × 2-3 artykuły każda';

COMMENT ON COLUMN public.learning_articles.topic IS
'Temat: pace | fillers | pauses | energy | clarity | vocabulary';


-- ============================================================
-- SECTION 5: RLS Policies
-- ============================================================

ALTER TABLE public.user_skill_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users see own skill progress" ON public.user_skill_progress;
CREATE POLICY "users see own skill progress"
  ON public.user_skill_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "service role manages skill progress" ON public.user_skill_progress;
CREATE POLICY "service role manages skill progress"
  ON public.user_skill_progress FOR ALL TO service_role
  USING (true);

ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users see own records" ON public.personal_records;
CREATE POLICY "users see own records"
  ON public.personal_records FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "service role manages records" ON public.personal_records;
CREATE POLICY "service role manages records"
  ON public.personal_records FOR ALL TO service_role
  USING (true);

ALTER TABLE public.learning_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone reads articles" ON public.learning_articles;
CREATE POLICY "anyone reads articles"
  ON public.learning_articles FOR SELECT TO authenticated
  USING (true);


-- ============================================================
-- SECTION 6: Trigger - auto update personal records
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_personal_records()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Dla metryk gdzie WYŻSZE = LEPSZE (pace_wpm, pause_mastery, clarity, vocabulary)
  IF NEW.skill_name IN ('pace_wpm', 'pause_mastery', 'clarity', 'vocabulary') THEN
    INSERT INTO public.personal_records (user_id, metric_name, best_value, recording_id, achieved_at)
    VALUES (NEW.user_id, NEW.skill_name, NEW.value, NEW.recording_id, now())
    ON CONFLICT (user_id, metric_name) DO UPDATE
      SET best_value = GREATEST(personal_records.best_value, EXCLUDED.best_value),
          achieved_at = CASE
            WHEN EXCLUDED.best_value > personal_records.best_value
            THEN now()
            ELSE personal_records.achieved_at
          END,
          recording_id = CASE
            WHEN EXCLUDED.best_value > personal_records.best_value
            THEN EXCLUDED.recording_id
            ELSE personal_records.recording_id
          END;

  -- Dla metryk gdzie NIŻSZE = LEPSZE (fillers, energy_variance)
  ELSIF NEW.skill_name IN ('fillers', 'energy_variance') THEN
    INSERT INTO public.personal_records (user_id, metric_name, best_value, recording_id, achieved_at)
    VALUES (NEW.user_id, NEW.skill_name, NEW.value, NEW.recording_id, now())
    ON CONFLICT (user_id, metric_name) DO UPDATE
      SET best_value = LEAST(personal_records.best_value, EXCLUDED.best_value),
          achieved_at = CASE
            WHEN EXCLUDED.best_value < personal_records.best_value
            THEN now()
            ELSE personal_records.achieved_at
          END,
          recording_id = CASE
            WHEN EXCLUDED.best_value < personal_records.best_value
            THEN EXCLUDED.recording_id
            ELSE personal_records.recording_id
          END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_personal_records ON public.user_skill_progress;
CREATE TRIGGER trigger_update_personal_records
  AFTER INSERT ON public.user_skill_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_personal_records();

COMMENT ON FUNCTION public.update_personal_records IS
'Automatycznie aktualizuje personal_records po insert do user_skill_progress. Obsługuje metryki gdzie wyższe=lepsze i niższe=lepsze.';


-- ============================================================
-- SECTION 7: RPC - get_user_trajectory
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_trajectory(p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := COALESCE(p_user_id, auth.uid());
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'recent_sessions', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'date', created_at,
        'score', overall_score,
        'verdict_label', verdict_label,
        'recording_id', recording_id
      ) ORDER BY created_at DESC), '[]'::jsonb)
      FROM public.analyses
      WHERE recording_id IN (
        SELECT id FROM public.recordings WHERE user_id = v_user_id
      )
      ORDER BY created_at DESC
      LIMIT 10
    ),
    'skill_radar', (
      SELECT COALESCE(jsonb_object_agg(skill_name, jsonb_build_object(
        'this_week', avg_this_week,
        'last_week', avg_last_week,
        'all_time_best', best_value
      )), '{}'::jsonb)
      FROM (
        SELECT
          skill_name,
          AVG(value) FILTER (WHERE measurement_date >= CURRENT_DATE - interval '7 days') AS avg_this_week,
          AVG(value) FILTER (WHERE measurement_date >= CURRENT_DATE - interval '14 days'
                             AND measurement_date < CURRENT_DATE - interval '7 days') AS avg_last_week,
          MAX(value) AS best_value
        FROM public.user_skill_progress
        WHERE user_id = v_user_id
        GROUP BY skill_name
      ) t
    ),
    'personal_bests', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'metric', metric_name,
        'value', best_value,
        'achieved', achieved_at
      )), '[]'::jsonb)
      FROM public.personal_records
      WHERE user_id = v_user_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_trajectory(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_trajectory(uuid) TO service_role;

COMMENT ON FUNCTION public.get_user_trajectory IS
'Zwraca trajektorię usera: ostatnie 10 sesji, skill radar (this/last/best week), personal bests';


-- ============================================================
-- SECTION 8: Verification
-- ============================================================

DO $$
DECLARE
  new_columns_count INT;
  new_tables_count INT;
BEGIN
  -- Sprawdź nowe kolumny w analyses
  SELECT COUNT(*) INTO new_columns_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'analyses'
    AND column_name IN ('verdict_label', 'mentor_quote_responsive', 'what_was_wrong',
                        'how_to_fix', 'metrics_with_context', 'next_step', 'learning_resources');

  -- Sprawdź nowe tabele
  SELECT COUNT(*) INTO new_tables_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('user_skill_progress', 'personal_records', 'learning_articles');

  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE 'LEARNING RESULTS SCHEMA - VERIFICATION';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE 'Nowe kolumny w analyses: % / 7', new_columns_count;
  RAISE NOTICE 'Nowe tabele: % / 3', new_tables_count;
  RAISE NOTICE '═══════════════════════════════════════════════════════';

  IF new_columns_count = 7 AND new_tables_count = 3 THEN
    RAISE NOTICE '✅ Migracja zakończona pomyślnie';
  ELSE
    RAISE WARNING '⚠️  Niektóre elementy mogą już istnieć lub migracja niepełna';
  END IF;
END $$;
