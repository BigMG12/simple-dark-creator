# BACKEND REALITY CHECK — RAPORT KOŃCOWY
**Data:** 2026-04-24 16:16  
**Projekt:** BIG SPEAKING  
**Status:** ⚠️ CZĘŚCIOWO WDROŻONY - WYMAGA NAPRAWY

---

## EXECUTIVE SUMMARY

Backend został **częściowo** podpięty do Supabase:
- ✅ 11/16 tabel istnieje w bazie
- ❌ 5/16 tabel brakuje (migracje nie uruchomione)
- ❌ Storage bucket `recordings` nie istnieje (KRYTYCZNE)
- ❌ RPC functions nie istnieją (dashboard nie działa)
- ❌ Seed data brak (aplikacja pusta)
- ❓ Edge functions - status nieznany

**Główny problem:** Migracje SQL nie zostały uruchomione na produkcji.

---

## SZCZEGÓŁOWA DIAGNOZA

### ✅ CO DZIAŁA (11 tabel)

```
✓ profiles
✓ speakers (pusta)
✓ drills (pusta)
✓ recordings
✓ analyses
✓ badges
✓ achievements_log
✓ channel_imports
✓ weekly_reviews
✓ stagnation_alerts
✓ speech_embeddings
```

### ❌ CO NIE DZIAŁA (5 tabel + storage + RPC)

#### 1. Brakujące tabele:
```
✗ daily_insights - brak migracji
✗ conversation_results - migracja 012_conversation_results.sql nie uruchomiona
✗ import_transcripts - brak migracji (prawdopodobnie transcript_jobs)
✗ import_events - migracja 006_import_reliability.sql nie uruchomiona
✗ user_quotas - brak migracji (prawdopodobnie user_speaker_imports_quota)
```

#### 2. Storage bucket `recordings` - NIE ISTNIEJE (KRYTYCZNE)
```bash
curl "$SUPABASE_URL/storage/v1/bucket" → []
```

**Migracja:** `003_storage_layer.sql` nie uruchomiona

**Skutek:**
- Upload nagrań zwraca 404
- `src/lib/storage.ts` nie działa
- `useRecorder` hook nie może zapisać audio
- **Aplikacja nie może nagrywać audio**

#### 3. RPC Functions - NIE ISTNIEJĄ
```
get_dashboard_stats → PGRST202 (not found)
get_daily_drill → PGRST202 (not found)  
get_progress_chart → PGRST202 (not found)
```

**Migracja:** `002_rpc_functions.sql` nie uruchomiona

**Skutek:**
- Dashboard pusty (brak statystyk)
- Daily drill nie działa
- Progress chart nie działa

#### 4. Seed Data - BRAK
```
speakers → [] (0 wierszy)
drills → [] (0 wierszy)
```

**Migracja:** `002_seed_data.sql` lub `003_seed_complete.sql` nie uruchomiona

**Skutek:**
- Brak AI coachów (Steve Jobs, Obama, etc.)
- Brak ćwiczeń mówienia
- Nowi użytkownicy widzą pustą aplikację

#### 5. Edge Functions - STATUS NIEZNANY
Nie sprawdzono czy funkcje są wdrożone na Supabase:
- analyze-recording (780 linii)
- analyze-conversation (509 linii)
- process-conversation (391 linii)
- + 13 innych funkcji

#### 6. Cron Jobs - BRAK WERYFIKACJI
```
✓ weekly_reviews - tabela istnieje
✗ daily_insights - tabela NIE ISTNIEJE
✓ stagnation_alerts - tabela istnieje
✗ cron.job - brak dostępu (wymaga service_role)
```

Nie wiadomo czy pg_cron jest włączony i czy jobs są skonfigurowane.

---

## PLAN NAPRAWY - PRIORYTETYZACJA

### 🔴 PRIORYTET 1: STORAGE (KRYTYCZNY - 5 min)
**Bez tego aplikacja nie może nagrywać audio.**

```sql
-- Uruchom w Supabase SQL Editor:
-- Skopiuj całą zawartość: supabase/migrations/003_storage_layer.sql
```

LUB przez Dashboard:
1. Storage → Create bucket
2. Name: `recordings`
3. Public: OFF
4. File size limit: 26214400 (25MB)
5. Allowed MIME: audio/webm, audio/mp4, audio/mpeg, audio/wav

### 🟠 PRIORYTET 2: RPC FUNCTIONS (WYSOKI - 10 min)
**Bez tego dashboard i drills nie działają.**

```sql
-- Uruchom w Supabase SQL Editor:
-- Skopiuj całą zawartość: supabase/migrations/002_rpc_functions.sql
```

### 🟡 PRIORYTET 3: BRAKUJĄCE TABELE (ŚREDNI - 15 min)
**Bez tego niektóre funkcje nie działają.**

```sql
-- Uruchom kolejno:
1. supabase/migrations/006_import_reliability.sql (import_events)
2. supabase/migrations/012_conversation_results.sql (conversation_results)
3. Znajdź migrację dla daily_insights, import_transcripts, user_quotas
```

### 🟢 PRIORYTET 4: SEED DATA (ŚREDNI - 5 min)
**Bez tego aplikacja jest pusta, ale funkcjonalnie działa.**

```sql
-- Uruchom w Supabase SQL Editor:
-- Skopiuj całą zawartość: supabase/migrations/002_seed_data.sql
```

### ⚪ PRIORYTET 5: EDGE FUNCTIONS (NISKI - 30+ min)
**Sprawdź czy są wdrożone.**

```bash
# Lokalnie (wymaga Supabase CLI):
supabase functions list

# Jeśli nie są wdrożone:
supabase functions deploy analyze-recording
supabase functions deploy analyze-conversation
# ... itd dla wszystkich 16 funkcji
```

### ⚪ PRIORYTET 6: CRON JOBS (NISKI)
**Sprawdź czy pg_cron jest włączony.**

```sql
-- W Supabase SQL Editor (wymaga uprawnień):
SELECT * FROM cron.job;
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- Jeśli brak, uruchom:
-- supabase/migrations/007_pg_cron_jobs.sql
```

---

## TESTY WERYFIKACYJNE

Po naprawie uruchom te testy:

### Test 1: Storage Upload
```bash
curl -X POST "$SUPABASE_URL/storage/v1/object/recordings/test-user/test.webm" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: audio/webm" \
  --data-binary "@test.webm"
# Oczekiwane: HTTP 200
```

### Test 2: RPC Functions
```bash
curl -X POST "$SUPABASE_URL/rest/v1/rpc/get_dashboard_stats" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"p_user_id": "user-uuid"}'
# Oczekiwane: JSON z danymi
```

### Test 3: Seed Data
```bash
curl "$SUPABASE_URL/rest/v1/speakers?select=name&limit=3" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY"
# Oczekiwane: [{"name":"Steve Jobs"},{"name":"Barack Obama"}...]
```

### Test 4: Tabele
```bash
# Uruchom: ./test_all_tables.sh
# Wszystkie powinny zwrócić ✓
```

---

## DLACZEGO TO SIĘ STAŁO?

1. **Migracje nie są automatyczne**
   - Supabase nie uruchamia plików z `supabase/migrations/` automatycznie
   - Trzeba je uruchomić ręcznie przez SQL Editor lub CLI

2. **Brak `supabase db push`**
   - Jeśli używasz Supabase CLI lokalnie, trzeba wykonać:
     ```bash
     supabase db push
     ```

3. **Projekt tworzony ręcznie w Dashboard**
   - Jeśli projekt powstał przez Dashboard (nie CLI), migracje nie są zsynchronizowane

---

## CHECKLIST WDROŻENIA

- [ ] Storage bucket `recordings` utworzony
- [ ] RLS policies na storage ustawione
- [ ] RPC functions wdrożone (get_dashboard_stats, get_daily_drill, get_progress_chart)
- [ ] Tabela conversation_results utworzona
- [ ] Tabela import_events utworzona
- [ ] Tabela daily_insights utworzona (jeśli istnieje migracja)
- [ ] Seed data załadowane (speakers, drills)
- [ ] Edge functions wdrożone (analyze-recording minimum)
- [ ] Env vars ustawione dla edge functions (OPENAI_API_KEY, DEEPGRAM_API_KEY)
- [ ] pg_cron włączony i jobs skonfigurowane
- [ ] Test upload nagrania ✓
- [ ] Test RPC functions ✓
- [ ] Test seed data ✓

---

## NASTĘPNE KROKI

1. **TERAZ:** Utwórz storage bucket `recordings` (5 min)
2. **DZISIAJ:** Uruchom RPC functions (10 min)
3. **DZISIAJ:** Uruchom brakujące migracje tabel (15 min)
4. **WKRÓTCE:** Załaduj seed data (5 min)
5. **PÓŹNIEJ:** Sprawdź edge functions (30+ min)
6. **PÓŹNIEJ:** Sprawdź cron jobs

---

## PLIKI POMOCNICZE

- `BACKEND_MAP.md` - Pełna mapa infrastruktury backendu
- `BACKEND_DIAGNOSIS.md` - Szczegółowa diagnoza problemów
- `test_backend.sh` - Skrypt testowy podstawowych funkcji
- `test_all_tables.sh` - Skrypt testowy wszystkich tabel
- `test_rpc.sh` - Skrypt testowy RPC functions

---

## KONTAKT Z SUPABASE

**URL projektu:** https://hthjuoswarvsfssxqxxj.supabase.co  
**Dashboard:** https://supabase.com/dashboard/project/hthjuoswarvsfssxqxxj  
**SQL Editor:** Dashboard → SQL Editor  
**Storage:** Dashboard → Storage  
**Functions:** Dashboard → Edge Functions
