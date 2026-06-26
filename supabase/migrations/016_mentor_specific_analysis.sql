-- ============================================================
-- FAZA 3: Mentor-Specific Analysis Columns
-- Dodaje kolumny do przechowywania feedbacku specyficznego
-- dla każdego mentora w tabeli analyses
-- ============================================================

-- Dodaj nowe kolumny do tabeli analyses
ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS style_match_score INT CHECK (style_match_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS mentor_alternative_phrasing JSONB,
  ADD COLUMN IF NOT EXISTS mentor_drills JSONB,
  ADD COLUMN IF NOT EXISTS mentor_closing_line TEXT,
  ADD COLUMN IF NOT EXISTS mentor_violations JSONB,
  ADD COLUMN IF NOT EXISTS mentor_wins JSONB,
  ADD COLUMN IF NOT EXISTS mentor_persona_snapshot JSONB;

-- Dodaj komentarze do kolumn dla dokumentacji
COMMENT ON COLUMN public.analyses.style_match_score IS
  'Jak blisko użytkownik jest do stylu mentora (0-100)';

COMMENT ON COLUMN public.analyses.mentor_alternative_phrasing IS
  'JSON: {user_said: string, how_you_would_say_it: string} - przykład jak mentor by to powiedział';

COMMENT ON COLUMN public.analyses.mentor_drills IS
  'JSON array: [{drill_name, why_you_are_assigning_this, how_to_do_it}] - 3 ćwiczenia od mentora';

COMMENT ON COLUMN public.analyses.mentor_closing_line IS
  'Ostatnie zdanie mentora w jego głosie';

COMMENT ON COLUMN public.analyses.mentor_violations IS
  'JSON array: [string] - co użytkownik zrobił wbrew stylowi mentora';

COMMENT ON COLUMN public.analyses.mentor_wins IS
  'JSON array: [string] - co użytkownik zrobił zgodnie ze stylem mentora';

COMMENT ON COLUMN public.analyses.mentor_persona_snapshot IS
  'Pełny snapshot persona_profile użyty do analizy (archiwizacja)';
