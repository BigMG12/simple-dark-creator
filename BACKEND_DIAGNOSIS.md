# DIAGNOZA BACKENDU — BIG SPEAKING
**Data:** 2026-04-24 16:12  
**Status:** ⚠️ CZĘŚCIOWO WDROŻONY

---

## ✅ CO DZIAŁA

### 1. Tabele w bazie (wszystkie istnieją)
```
✓ profiles
✓ speakers  
✓ drills
✓ recordings
✓ analyses
✓ badges
✓ achievements_log
✓ channel_imports
```

### 2. Połączenie z Supabase
```
URL: https://hthjuoswarvsfssxqxxj.supabase.co
Anon Key: ✓ Poprawny
REST API: ✓ Działa
```

### 3. Kod frontendu
```
✓ src/lib/storage.ts - implementacja storage
✓ src/hooks/use-recorder.ts - nagrywanie + upload
✓ src/hooks/mutations/* - mutacje
✓ src/hooks/queries/* - queries
```

---

## ❌ CO NIE DZIAŁA

### 1. Storage Bucket `recordings` - NIE ISTNIEJE
```bash
curl "$SUPABASE_URL/storage/v1/bucket" → []
```

**Problem:** Migracja `003_storage_layer.sql` nie została uruchomiona na produkcji.

**Skutek:** 
- Upload nagrań zwróci 404
- `src/lib/storage.ts` nie zadziała
- `useRecorder` hook nie może zapisać audio

**Fix:**
```sql
-- Uruchom ręcznie w Supabase SQL Editor:
-- supabase/migrations/003_storage_layer.sql
```

### 2. RPC Functions - NIE ISTNIEJĄ
```bash
get_dashboard_stats → PGRST202 (not found)
get_daily_drill → PGRST202 (not found)
get_progress_chart → PGRST202 (not found)
```

**Problem:** Migracja `002_rpc_functions.sql` nie została uruchomiona.

**Skutek:**
- `useDashboard.ts` zwróci błąd
- `useDrills.ts` nie pobierze daily drill
- Dashboard będzie pusty

**Fix:**
```sql
-- Uruchom ręcznie:
-- supabase/migrations/002_rpc_functions.sql
```

### 3. Seed Data - BRAK
```bash
speakers → []
drills → []
```

**Problem:** Migracje seed (`002_seed_data.sql`, `003_seed_complete.sql`) nie zostały uruchomione.

**Skutek:**
- Brak AI coachów (speakers)
- Brak ćwiczeń (drills)
- Aplikacja będzie pusta dla nowych userów

**Fix:**
```sql
-- Uruchom ręcznie:
-- supabase/migrations/002_seed_data.sql
-- LUB
-- supabase/migrations/003_seed_complete.sql
```

### 4. Edge Functions - STATUS NIEZNANY
```
Nie sprawdzono czy są wdrożone na Supabase.
```

**Wymagane testy:**
```bash
# Lokalnie (jeśli Supabase CLI zainstalowane):
supabase functions list

# Lub przez API:
curl "$SUPABASE_URL/functions/v1/analyze-recording" \
  -H "Authorization: Bearer $ANON_KEY"
```

---

## 🔧 PLAN NAPRAWY

### Priorytet 1: Storage (KRYTYCZNY)
Bez tego upload nagrań nie działa.

```bash
# Opcja A: Przez Supabase Dashboard
1. Otwórz https://supabase.com/dashboard/project/hthjuoswarvsfssxqxxj
2. Storage → Create bucket
3. Name: recordings
4. Public: OFF
5. File size limit: 26214400 (25MB)
6. Allowed MIME types: audio/webm, audio/mp4, audio/mpeg, audio/wav

# Opcja B: Przez SQL Editor
Skopiuj całą zawartość supabase/migrations/003_storage_layer.sql
```

### Priorytet 2: RPC Functions (WYSOKI)
Bez tego dashboard i drills nie działają.

```bash
# Przez SQL Editor:
Skopiuj całą zawartość supabase/migrations/002_rpc_functions.sql
```

### Priorytet 3: Seed Data (ŚREDNI)
Bez tego aplikacja jest pusta, ale funkcjonalnie działa.

```bash
# Przez SQL Editor:
Skopiuj całą zawartość supabase/migrations/002_seed_data.sql
```

### Priorytet 4: Edge Functions (NISKI)
Sprawdź czy są wdrożone. Jeśli nie:

```bash
# Lokalnie (wymaga Supabase CLI):
supabase functions deploy analyze-recording
supabase functions deploy analyze-conversation
supabase functions deploy process-conversation
# ... itd dla wszystkich funkcji
```

---

## 📋 CHECKLIST WDROŻENIA

- [ ] Storage bucket `recordings` utworzony
- [ ] RLS policies na storage ustawione
- [ ] RPC functions wdrożone (get_dashboard_stats, get_daily_drill, get_progress_chart)
- [ ] Seed data załadowane (speakers, drills)
- [ ] Edge functions wdrożone (analyze-recording minimum)
- [ ] Env vars ustawione dla edge functions (OPENAI_API_KEY, DEEPGRAM_API_KEY)
- [ ] Test upload nagrania
- [ ] Test wywołania analyze-recording
- [ ] Test dashboard (RPC functions)

---

## 🧪 TESTY WERYFIKACYJNE

Po naprawie uruchom:

```bash
# Test 1: Storage
curl -X POST "$SUPABASE_URL/storage/v1/object/recordings/test-user/test.webm" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: audio/webm" \
  --data-binary "@test.webm"
# Oczekiwane: HTTP 200

# Test 2: RPC
curl -X POST "$SUPABASE_URL/rest/v1/rpc/get_dashboard_stats" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"p_user_id": "user-uuid"}'
# Oczekiwane: JSON z danymi

# Test 3: Seed data
curl "$SUPABASE_URL/rest/v1/speakers?select=name&limit=3" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY"
# Oczekiwane: Lista speakerów (Steve Jobs, Obama, etc.)
```

---

## 💡 DLACZEGO TO SIĘ STAŁO?

Prawdopodobne przyczyny:

1. **Migracje nie zostały uruchomione automatycznie**
   - Supabase nie uruchamia migracji z folderu `supabase/migrations/` automatycznie
   - Trzeba je uruchomić ręcznie przez CLI lub SQL Editor

2. **Brak `supabase db push`**
   - Jeśli używasz Supabase CLI lokalnie, trzeba wykonać:
     ```bash
     supabase db push
     ```

3. **Projekt był tworzony ręcznie w Dashboard**
   - Jeśli projekt powstał przez Dashboard (nie CLI), migracje nie są zsynchronizowane

---

## 🎯 NASTĘPNE KROKI

1. **Natychmiast:** Utwórz storage bucket `recordings` (bez tego app nie działa)
2. **Dzisiaj:** Uruchom RPC functions (dashboard będzie pusty bez tego)
3. **Wkrótce:** Załaduj seed data (UX będzie lepszy)
4. **Później:** Sprawdź edge functions (potrzebne do analizy nagrań)

---

## FLOW #8 — CRON JOBS (Weekly Review, Daily Insight, Stagnation)

### Status testów:
```
✓ weekly_reviews - tabela istnieje
✗ daily_insights - tabela NIE ISTNIEJE (HTTP 404)
✓ stagnation_alerts - tabela istnieje
✗ cron.job - brak dostępu (wymaga service_role)
```

### Problem:
- Tabela `daily_insights` nie została utworzona
- Brak możliwości sprawdzenia czy pg_cron jest włączony (wymaga service_role key)
- Nie wiadomo czy cron jobs są skonfigurowane

### Skutek:
- Edge function `generate-daily-insight` nie może zapisać wyników
- Automatyczne daily insights nie działają
- Brak historii wykonań cron jobs

### Wymagane działania:

**1. Sprawdź czy pg_cron jest włączony:**
```sql
-- W Supabase SQL Editor (wymaga uprawnień):
SELECT * FROM cron.job;
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC LIMIT 20;
```

**2. Znajdź i uruchom migrację z daily_insights:**
```bash
# Sprawdź która migracja tworzy daily_insights:
grep -r "CREATE TABLE.*daily_insights" supabase/migrations/
```

**3. Sprawdź migrację 007_pg_cron_jobs.sql:**
- Czy tworzy cron jobs?
- Czy wymaga pg_cron extension?
- Czy została uruchomiona na produkcji?

### Dodatkowe tabele do sprawdzenia:
```
- conversation_results (dla analyze-conversation)
- speech_embeddings (dla embed-speech-samples)
- import_transcripts (dla process-transcripts)
```
