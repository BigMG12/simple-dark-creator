# BACKEND FLOW TEST RESULTS — BIG SPEAKING
**Data:** 2026-04-24 18:15  
**Status:** FAZA 1 — Reality Testing

---

## 🎯 EXECUTIVE SUMMARY

**Główny problem:** Edge functions NIE są deployed + brakujące tabele w bazie danych.

**Krytyczne ustalenia:**
- ❌ **0/16 edge functions deployed** — cała funkcjonalność backendu nie działa
- ✅ **5/5 secrets ustawione** (OPENAI, YOUTUBE, SPOTIFY, RESEND)
- ❌ **Brak ANTHROPIC_API_KEY** — konwersacje z mentorami nie działają
- ❌ **Tabele user_goals i goal_progress NIE ISTNIEJĄ** — funkcja celów nie działa

---

## 📊 FLOW #9 — Goals Auto-Update

### ❌ STATUS: FAILED

**Problem:** Tabele `user_goals` i `goal_progress` nie istnieją w bazie danych.

**Dowód:**
```bash
grep -r "user_goals\|goal_progress" supabase/migrations/*.sql
# Output: (brak wyników)
```

**Frontend używa tych tabel:**
- `src/hooks/queries/useGoals.ts` — wykonuje query do `user_goals` i `goal_progress`
- `src/components/progress/GoalCreationModal.tsx` — tworzy nowe cele
- `src/components/progress/GoalDetailModal.tsx` — wyświetla szczegóły celów

**Konsekwencje:**
- ❌ Użytkownicy NIE mogą tworzyć celów
- ❌ Postęp celów NIE jest śledzony
- ❌ Dashboard NIE pokazuje celów
- ❌ Frontend będzie rzucał błędy 404/relation does not exist

**Rozwiązanie:**
Utworzyć migrację z tabelami:

```sql
-- user_goals table
CREATE TABLE IF NOT EXISTS public.user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('metric', 'streak', 'custom')),
  target_metric TEXT, -- np. 'overall_score', 'pace_wpm', 'sessions_count'
  target_value NUMERIC NOT NULL,
  target_comparator TEXT NOT NULL CHECK (target_comparator IN ('average', 'minimum', 'total')),
  starting_value NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  deadline DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT user_goals_user_title_unique UNIQUE(user_id, title)
);

-- goal_progress table
CREATE TABLE IF NOT EXISTS public.goal_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.user_goals(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_user_goals_user_id ON public.user_goals(user_id);
CREATE INDEX idx_user_goals_status ON public.user_goals(status);
CREATE INDEX idx_goal_progress_goal_id ON public.goal_progress(goal_id);
CREATE INDEX idx_goal_progress_recorded_at ON public.goal_progress(recorded_at DESC);

-- RLS Policies
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_progress ENABLE ROW LEVEL SECURITY;

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
```

---

## 📋 WSZYSTKIE WYKRYTE PROBLEMY

### Problem #1: Edge Functions NIE są deployed
**Priorytet:** KRYTYCZNY  
**Status:** ❌ FAILED

**Dowód:**
```bash
supabase functions list
# Output: pusta tabela (0 funkcji)
```

**Impact:** Wszystkie 16 funkcji nie działają:
- analyze-recording
- analyze-conversation
- cancel-import
- create-speaker-import-job
- detect-stagnation
- embed-speech-samples
- generate-daily-insight
- generate-speaker-persona
- generate-weekly-review
- notify-import-complete
- process-conversation
- process-transcripts
- retry-import
- retry-stuck-imports
- run-import-orchestrator
- select-user-speaker

---

### Problem #2: Brakujący ANTHROPIC_API_KEY
**Priorytet:** WYSOKI  
**Status:** ❌ FAILED

**Dowód:**
```bash
supabase secrets list
# ANTHROPIC_API_KEY — brak w liście
```

**Impact:** Konwersacje z mentorami nie działają (analyze-conversation używa Claude API).

---

### Problem #3: Tabele user_goals i goal_progress nie istnieją
**Priorytet:** WYSOKI  
**Status:** ❌ FAILED

**Dowód:** Brak w migracjach, frontend używa tych tabel.

**Impact:** Funkcja celów całkowicie nie działa.

---

### Problem #4: Brak dostępu do lokalnej bazy
**Priorytet:** ŚREDNI  
**Status:** ⚠️ WARNING

**Dowód:**
```bash
supabase status
# Error: Docker nie jest uruchomiony
```

**Impact:** Nie można testować SQL lokalnie, trzeba używać Supabase Dashboard.

---

## 🚀 PLAN NAPRAWY (PRIORYTETOWY)

### Krok 1: Utwórz brakujące tabele (15 min)
```bash
# Utwórz migrację
cat > supabase/migrations/022_user_goals.sql << 'EOF'
[SQL z powyższego rozwiązania]
EOF

# Zastosuj migrację
supabase db push
```

### Krok 2: Deploy edge functions (20 min)
```bash
# Link projekt
supabase link --project-ref <PROJECT_ID>

# Deploy wszystkie funkcje
for func in analyze-recording analyze-conversation cancel-import create-speaker-import-job detect-stagnation embed-speech-samples generate-daily-insight generate-speaker-persona generate-weekly-review notify-import-complete process-conversation process-transcripts retry-import retry-stuck-imports run-import-orchestrator select-user-speaker; do
  supabase functions deploy $func
done

# Weryfikuj
supabase functions list
```

### Krok 3: Ustaw ANTHROPIC_API_KEY (2 min)
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

### Krok 4: Test end-to-end (30 min)
- Uruchom frontend
- Zaloguj się
- Nagraj audio → sprawdź czy analyze-recording działa
- Utwórz cel → sprawdź czy zapisuje się do user_goals
- Sprawdź logi: `supabase functions logs analyze-recording`

---

## 🎯 OCZEKIWANE REZULTATY

Po naprawie:
- ✅ Tabele user_goals i goal_progress istnieją
- ✅ 16/16 edge functions deployed
- ✅ Wszystkie secrets ustawione (włącznie z ANTHROPIC_API_KEY)
- ✅ Funkcja celów działa
- ✅ Nagrania są analizowane
- ✅ Konwersacje z mentorami działają

**Całkowity czas naprawy:** ~60-70 minut
