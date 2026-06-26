# BACKEND REALITY CHECK — BIG SPEAKING
Data: 2026-04-24 16:10

## 1. EDGE FUNCTIONS — STATUS

### Wdrożone funkcje (780+ linii kodu):
- **analyze-recording** — CORE FLOW, 780 linii
- **analyze-conversation** — 509 linii
- **process-conversation** — 391 linii  
- **generate-weekly-review** — 301 linii
- **create-speaker-import-job** — pełna implementacja
- **cancel-import** — pełna implementacja

### Pozostałe funkcje (do weryfikacji):
- detect-stagnation
- embed-speech-samples
- generate-daily-insight
- generate-speaker-persona
- notify-import-complete
- process-transcripts
- retry-import
- retry-stuck-imports
- run-import-orchestrator
- select-user-speaker

## 2. WYWOŁANIA Z FRONTENDU

### Edge Functions (.functions.invoke):
```typescript
// src/hooks/use-recorder.ts:375
supabase.functions.invoke("analyze-recording", {
  body: { recording_id: recordingId }
})

// src/hooks/mutations/useCreateImportJob.ts:27
supabase.functions.invoke('create-speaker-import-job', {
  body: { channel_url }
})

// src/hooks/mutations/useCancelImport.ts
supabase.functions.invoke('cancel-import', ...)
```

### RPC Functions (.rpc):
```typescript
// src/hooks/queries/useDashboard.ts:30
supabase.rpc('get_dashboard_stats', { p_user_id })

// src/hooks/queries/useDashboard.ts:66
supabase.rpc('get_progress_chart', { p_user_id, p_days })

// src/hooks/queries/useDrills.ts:108
supabase.rpc('get_daily_drill', { p_user_id })
```

### Tabele (.from):
- achievements_log
- activity_log
- analyses ✓ (używana w analyze-recording)
- badges
- channel_imports ✓ (speaker imports)
- conversation_results
- conversations
- drills ✓ (RPC + direct queries)
- goal_progress
- personal_records
- profiles ✓ (używana w analyze-recording)
- recordings ✓ (CORE — używana w analyze-recording)
- skill_metrics
- speaker_categories
- speakers ✓ (używana w analyze-recording)
- user_badges
- user_goals
- user_speaker_imports_quota
- weekly_reviews

### Storage Buckets:
- **recordings** — bucket dla audio (25MB limit, private)
  - Path: `{userId}/{timestamp}-{uuid}.webm`
  - MIME: audio/webm, audio/mp4, audio/mpeg, audio/wav
  - RLS: user może tylko swoje pliki

## 3. ANALYZE-RECORDING FLOW (NAJWAŻNIEJSZY)

### Endpoint:
POST /functions/v1/analyze-recording
Body: { recording_id: "uuid" }
Headers: Authorization: Bearer {JWT}

### Co robi:
1. Weryfikuje auth (user JWT)
2. Pobiera recording z DB (service role)
3. Sprawdza ownership (recording.user_id === user.id)
4. Ustawia status='analyzing'
5. **Uruchamia w tle** (EdgeRuntime.waitUntil):
   - Download audio z storage
   - Whisper transcription (OpenAI)
   - GPT analysis (mentor feedback)
   - Style matching (porównanie z wybranym speakerem)
   - Zapis do `analyses` table
   - Update `recordings.status='complete'`
   - XP award do `profiles.current_xp`

### Zwraca:
202 Accepted + { status: "analyzing", recording_id }

### Frontend polling:
- Realtime subscription na `analyses` table (INSERT event)
- Fallback: polling co 3s (useQuery refetchInterval)

## 4. POTENCJALNE PROBLEMY

### ❌ Brak weryfikacji:
- [ ] Czy edge functions są WDROŻONE? (`supabase functions list`)
- [ ] Czy secrets są ustawione? (`supabase secrets list`)
  - OPENAI_API_KEY
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY
  - SUPABASE_ANON_KEY
- [ ] Czy RLS policies działają poprawnie?
- [ ] Czy storage bucket 'recordings' istnieje?

### ⚠️ Typowe błędy analyze-recording:
1. **OPENAI_API_KEY nie ustawiony** → 500 error
2. **Edge function timeout** (>60s) → Whisper/GPT wolno
3. **Schema mismatch** → funkcja próbuje zapisać do nieistniejącej kolumny
4. **RLS blokuje service role** → nie może zapisać do analyses
5. **JSON parse fail** → GPT zwraca malformed JSON

### 🔍 Jak testować:
```bash
# 1. Sprawdź wdrożenie
supabase functions list | grep analyze-recording

# 2. Sprawdź logi
supabase functions logs analyze-recording --tail 50

# 3. Sprawdź secrets
supabase secrets list | grep -E "OPENAI|SUPABASE"

# 4. Test na żywo (wymaga test recording w DB)
curl -X POST "$SUPABASE_URL/functions/v1/analyze-recording" \
  -H "Authorization: Bearer $TEST_USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"recording_id":"TEST_UUID"}'
```

## 5. NASTĘPNE KROKI

1. **Uruchom SQL queries** (check_backend.sql) na Supabase Dashboard
2. **Sprawdź deployment status** edge functions
3. **Zweryfikuj secrets** w Supabase
4. **Test analyze-recording** z prawdziwym recording
5. **Sprawdź logi** dla błędów

---
**Status**: MAPA WYGENEROWANA, WYMAGA WERYFIKACJI NA ŻYWO

### RLS Policies

**Total: 64 policies** zabezpieczających dostęp do tabel i storage.

**Kluczowe policies dla storage bucket `recordings`:**
- `storage: upload own recordings` — użytkownik może uploadować tylko do swojego folderu
- `storage: read own recordings` — użytkownik może czytać tylko swoje pliki
- `storage: update own recordings` — użytkownik może edytować tylko swoje pliki
- `storage: delete own recordings` — użytkownik może usuwać tylko swoje pliki

**Path convention:** `recordings/{user_id}/{filename}`

---

## 🔧 FAZA 0.2 — EDGE FUNCTIONS

### Status wdrożenia

```
✅ analyze-conversation       — 509 lines (EXISTS, NOT DEPLOYED)
✅ analyze-recording          — 780 lines (EXISTS, NOT DEPLOYED)
✅ cancel-import              — 124 lines (EXISTS, NOT DEPLOYED)
✅ create-speaker-import-job  — 281 lines (EXISTS, NOT DEPLOYED)
✅ detect-stagnation          — 148 lines (EXISTS, NOT DEPLOYED)
✅ embed-speech-samples       — 221 lines (EXISTS, NOT DEPLOYED)
✅ generate-daily-insight     — 137 lines (EXISTS, NOT DEPLOYED)
✅ generate-speaker-persona   — 234 lines (EXISTS, NOT DEPLOYED)
✅ generate-weekly-review     — 301 lines (EXISTS, NOT DEPLOYED)
✅ notify-import-complete     — 293 lines (EXISTS, NOT DEPLOYED)
✅ process-conversation       — 391 lines (EXISTS, NOT DEPLOYED)
✅ process-transcripts        — 324 lines (EXISTS, NOT DEPLOYED)
✅ retry-import               — 154 lines (EXISTS, NOT DEPLOYED)
✅ retry-stuck-imports        — 139 lines (EXISTS, NOT DEPLOYED)
✅ run-import-orchestrator    — 351 lines (EXISTS, NOT DEPLOYED)
✅ select-user-speaker        — 202 lines (EXISTS, NOT DEPLOYED)
📁 _shared                    — Shared utilities (NO index.ts)
```

**KRYTYCZNY PROBLEM:** Wszystkie funkcje istnieją w kodzie, ale **NIE SĄ WDROŻONE** na Supabase.

---

## 🎨 FAZA 0.3 — WYWOŁANIA Z FRONTENDU

### Edge Functions Invocations (2 wywołania)

```typescript
// src/hooks/use-recorder.ts:375
supabase.functions.invoke("analyze-recording", {
  body: { recording_id: recordingId }
})

// src/hooks/mutations/useCancelImport.ts:25
supabase.functions.invoke('cancel-import', {
  body: { import_id: importId }
})
```

### Database Table Queries (26 plików używa .from())

**Najczęściej używane tabele:**
```typescript
profiles                  — useProfile.ts
recordings                — useRecordings.ts, useResults.ts, RecordLive.tsx
analyses                  — useResults.ts
drills                    — useDrills.ts
badges                    — useBadges.ts
user_badges               — useBadges.ts
speakers                  — useSpeakers.ts, useSpeakersByCategory.ts
channel_imports           — useChannelImports.ts, useChannelImport.ts
conversation_results      — useConversationResults.ts
conversations             — useConversations.ts
skill_metrics             — useSkillMetrics.ts
activity_log              — useActivityHeatmap.ts
weekly_reviews            — useWeeklyReviews.ts
achievements_log          — useAchievements.ts
user_speaker_imports_quota — useImportQuota.ts
```

### RPC Calls (3 wywołania)

```typescript
// src/hooks/queries/useDashboard.ts:30
supabase.rpc('get_dashboard_stats', { p_user_id: userId })

// src/hooks/queries/useDashboard.ts:66
supabase.rpc('get_progress_chart', { p_user_id: userId, p_days: days })

// src/hooks/queries/useDrills.ts:108
supabase.rpc('get_daily_drill', { p_user_id: userId })
```

### Storage Calls (1 wywołanie)

```typescript
// src/hooks/use-recorder.ts:295
await supabase.storage
  .from("recordings")
  .upload(path, blob, {
    contentType: "audio/webm",
    upsert: false,
  });
```

---

## 🔍 FAZA 0.4 — SEKRETY I ENV VARS

**Wymagane do sprawdzenia:**
```bash
supabase secrets list
```

**Potencjalnie wymagane przez edge functions:**
- `OPENAI_API_KEY` — dla Whisper transcription (analyze-recording)
- `ANTHROPIC_API_KEY` — dla Claude analysis (analyze-conversation, mentor analysis)
- `SUPABASE_SERVICE_ROLE_KEY` — dla operacji admin
- `SUPABASE_URL` — URL projektu

---

## ⚠️ KRYTYCZNE USTALENIA

### ❌ PROBLEM #1: Edge Functions NIE SĄ WDROŻONE
**Status:** Wszystkie 16 funkcji istnieje w kodzie, ale **ŻADNA nie jest deployed**.

**Konsekwencje:**
- ❌ `analyze-recording` — nagrania NIE są analizowane
- ❌ `cancel-import` — importy NIE mogą być anulowane
- ❌ Wszystkie inne funkcje — NIE działają

**Rozwiązanie:**
```bash
# Deploy wszystkich funkcji
supabase functions deploy analyze-recording
supabase functions deploy cancel-import
# ... etc dla wszystkich 16 funkcji
```

### ✅ PROBLEM #2: Storage Bucket ISTNIEJE
**Status:** Bucket `recordings` jest poprawnie skonfigurowany z RLS.

### ✅ PROBLEM #3: RPC Functions ISTNIEJĄ
**Status:** RPC functions są zdefiniowane w migracjach.

### ❌ PROBLEM #4: Brak testów rzeczywistych
**Status:** Nie wykonano jeszcze żadnych testów na żywej bazie.

---

## 📋 NASTĘPNE KROKI — FAZA 1

### FLOW #2 — Record → Storage Upload
**Test:** Czy upload do bucket `recordings` działa z RLS?

```bash
# Sprawdź czy bucket 'recordings' istnieje i ma RLS
curl -X POST "$SUPABASE_URL/storage/v1/object/recordings/test-user-id/test.webm" \
  -H "Authorization: Bearer $TEST_USER_JWT" \
  -H "Content-Type: audio/webm" \
  --data-binary "@test-audio.webm"

# Jeśli 403: RLS blokuje
# Jeśli 404: bucket nie istnieje
# Jeśli 200: OK
```

**Sprawdź policies:**
```sql
SELECT * FROM storage.policies 
WHERE bucket_id = 'recordings';
```

---

## 🎯 PODSUMOWANIE FAZY 0

**CO DZIAŁA:**
✅ Struktura bazy danych (21 tabel)
✅ Storage bucket `recordings` z RLS
✅ RPC functions zdefiniowane
✅ Kod edge functions istnieje (16 funkcji)
✅ Frontend ma poprawne wywołania

**CO NIE DZIAŁA:**
❌ Edge functions NIE są deployed
❌ Brak testów na żywej bazie
❌ Nieznany stan danych seed (czy tabele mają dane?)
❌ Nieznany stan sekretów (API keys)

**NASTĘPNY KROK:**
Wykonać FAZĘ 1 — Reality Testing 9 krytycznych flow z rzeczywistymi testami SQL/curl.

---

## RZECZYWISTY STAN BAZY (2026-04-24 16:12)

### ❌ KRYTYCZNE PROBLEMY:

**1. BRAK WDROŻONYCH EDGE FUNCTIONS**
```
supabase functions list → 0 funkcji wdrożonych
```
- Wszystkie 16 funkcji istnieje lokalnie w `supabase/functions/`
- **ŻADNA nie jest wdrożona na Supabase**
- `analyze-recording` → nagrania się "zawieszają" na status='analyzing'
- `process-conversation` → rozmowy się "zawieszają" na status='diarizing'
- Import system, insights, reviews → **CAŁKOWICIE NIE DZIAŁAJĄ**

**2. BRAKUJĄCE SECRETS**
```
✅ OPENAI_API_KEY
✅ RESEND_API_KEY
✅ SPOTIFY_CLIENT_ID
✅ SPOTIFY_CLIENT_SECRET
✅ YOUTUBE_API_KEY
❌ DEEPGRAM_API_KEY - BRAK!
❌ SUPABASE_SERVICE_ROLE_KEY - prawdopodobnie brak
❌ SUPABASE_ANON_KEY - prawdopodobnie brak
```

**3. WYMAGANE ENV VARS (z kodu):**
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY
OPENAI_API_KEY
DEEPGRAM_API_KEY (dla process-conversation)
RESEND_API_KEY
SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET
YOUTUBE_API_KEY
```

---

## DIAGNOZA FLOW #6 — Conversation Upload + Diarization

### ❌ FLOW CAŁKOWICIE ZEPSUTY

**Problem 1:** `process-conversation` nie jest wdrożona
```bash
supabase functions list | grep conversation
→ BRAK WYNIKU
```

**Problem 2:** Brak DEEPGRAM_API_KEY
```bash
supabase secrets list | grep DEEPGRAM
→ BRAK WYNIKU
```

**Konsekwencje:**
- User uploaduje conversation audio
- Frontend wywołuje `supabase.functions.invoke('process-conversation')`
- **404 Not Found** - funkcja nie istnieje
- Recording zostaje w status='diarizing' NA ZAWSZE
- Brak error message dla usera
- UI pokazuje "Processing..." bez końca

---

## AKCJE NAPRAWCZE (PRIORYTET)

### 🔴 CRITICAL - Natychmiastowe:

1. **Wdrożyć edge functions:**
```bash
# Najpierw najważniejsze:
supabase functions deploy analyze-recording
supabase functions deploy process-conversation
supabase functions deploy analyze-conversation

# Potem reszta:
supabase functions deploy create-speaker-import-job
supabase functions deploy run-import-orchestrator
# ... itd dla wszystkich 16 funkcji
```

2. **Dodać brakujące secrets:**
```bash
supabase secrets set DEEPGRAM_API_KEY=<klucz>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<klucz>
supabase secrets set SUPABASE_ANON_KEY=<klucz>
```

3. **Zweryfikować trigger handle_new_user:**
```sql
-- Sprawdź czy trigger istnieje i jest enabled
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgrelid = 'auth.users'::regclass;
```

### 🟡 MEDIUM - Po naprawie critical:

4. Przetestować FLOW #1 (Signup → auto-profile)
5. Przetestować FLOW #2 (Recording upload → storage)
6. Przetestować FLOW #3 (Recording → analysis)
7. Sprawdzić RLS policies
8. Sprawdzić storage policies
9. Sprawdzić cron jobs

---

## NASTĘPNE KROKI

**Czy mam:**
1. Wdrożyć wszystkie edge functions? (wymaga potwierdzenia)
2. Dodać brakujące secrets? (wymaga kluczy API)
3. Przetestować trigger handle_new_user?
