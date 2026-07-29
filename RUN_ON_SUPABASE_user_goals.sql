-- ============================================================
-- PROGRESS — user_goals (idempotent)
-- Wklej to w SQL Editor Supabase na projekcie hthjuoswarvsfssxqxxj
-- Można uruchamiać wielokrotnie bez błędu.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_goals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  metric_key   TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  start_value  NUMERIC NOT NULL DEFAULT 0,
  deadline     DATE NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','completed','abandoned')),
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_goals TO authenticated;
GRANT ALL ON public.user_goals TO service_role;

ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_goals_select_own" ON public.user_goals;
CREATE POLICY "user_goals_select_own" ON public.user_goals
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_goals_insert_own" ON public.user_goals;
CREATE POLICY "user_goals_insert_own" ON public.user_goals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_goals_update_own" ON public.user_goals;
CREATE POLICY "user_goals_update_own" ON public.user_goals
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_goals_delete_own" ON public.user_goals;
CREATE POLICY "user_goals_delete_own" ON public.user_goals
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_goals_user_status
  ON public.user_goals (user_id, status, created_at DESC);

DROP TRIGGER IF EXISTS trg_user_goals_updated_at ON public.user_goals;
CREATE TRIGGER trg_user_goals_updated_at
  BEFORE UPDATE ON public.user_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
