-- ============================================================
-- Conversation Results & Detailed Analysis
-- Rozszerza strukturę dla szczegółowych wyników rozmów
-- ============================================================

-- Tabela dla szczegółowych wyników rozmów
CREATE TABLE IF NOT EXISTS public.conversation_results (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id          UUID        NOT NULL UNIQUE REFERENCES public.recordings(id) ON DELETE CASCADE,
  user_id               UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Podstawowe informacje
  conversation_type     TEXT        NOT NULL CHECK (conversation_type IN (
                          'sales', 'meeting', 'interviewee', 'interviewer',
                          'negotiation', 'coaching'
                        )),
  overall_score         NUMERIC     CHECK (overall_score BETWEEN 0 AND 100),
  duration_seconds      INT         NOT NULL,

  -- Kontekst rozmowy
  context_stakes        TEXT,
  context_goal          TEXT,
  context_other_party   TEXT,

  -- Podsumowanie
  summary               TEXT,

  -- Metryki szczegółowe (JSONB dla elastyczności)
  -- Format: [{"key": "objection_handling", "label": "Obsługa obiekcji", "value": "8/12", "description": "...", "good": true, "benchmark": "..."}]
  metrics               JSONB       NOT NULL DEFAULT '[]',

  -- Radar chart data
  -- Format: [{"axis": "Empathy", "you": 75, "top": 90, "avg": 65, "pastYou": 60}]
  radar_data            JSONB       NOT NULL DEFAULT '[]',

  -- Kluczowe momenty/wydarzenia
  -- Format: [{"type": "objection", "timestamp": 45, "label": "Obiekcja cenowa", "description": "..."}]
  key_events            JSONB       NOT NULL DEFAULT '[]',

  -- Transkrypcja
  -- Format: [{"speaker": "you", "text": "...", "start": 0, "end": 5}]
  transcript            JSONB       NOT NULL DEFAULT '[]',

  -- Notatki coacha
  coach_notes           TEXT,

  -- Porównanie z poprzednimi sesjami
  improvement_areas     JSONB       DEFAULT '[]',

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indeksy dla wydajności
CREATE INDEX IF NOT EXISTS idx_conversation_results_user_id
  ON public.conversation_results(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_results_recording_id
  ON public.conversation_results(recording_id);
CREATE INDEX IF NOT EXISTS idx_conversation_results_type
  ON public.conversation_results(conversation_type);
CREATE INDEX IF NOT EXISTS idx_conversation_results_created_at
  ON public.conversation_results(created_at DESC);

-- RLS Policies
ALTER TABLE public.conversation_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversation results"
  ON public.conversation_results
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversation results"
  ON public.conversation_results
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversation results"
  ON public.conversation_results
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversation results"
  ON public.conversation_results
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger dla updated_at
CREATE OR REPLACE FUNCTION update_conversation_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversation_results_updated_at
  BEFORE UPDATE ON public.conversation_results
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_results_updated_at();
