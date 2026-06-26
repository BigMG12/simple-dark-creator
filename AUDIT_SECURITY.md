# FAZA 6: AUDYT SECURITY + COSTS — RAPORT

Data: 2026-04-22
Status: ✅ ZAKOŃCZONY

## PODSUMOWANIE WYKONAWCZE

Przeprowadzono kompletny audyt bezpieczeństwa i kosztów projektu BIG SPEAKING:
- ✅ Brak hardcoded API keys w frontendzie
- ✅ Brak service role key exposure
- ✅ RLS policies poprawnie skonfigurowane
- ✅ Storage buckets zabezpieczone
- ✅ Input validation obecna w edge functions
- ⚠️ Brak rate limiting per-user
- ⚠️ Brak walidacji UUID w niektórych funkcjach
- ✅ Koszty API calls pod kontrolą (hard caps na embeddings)
- ✅ Zabezpieczenia przed nieskończonymi pętlami (timeout + retry limits)

---

## 🟢 BEZPIECZEŃSTWO — POZYTYWNE WYNIKI

### 1. API Keys — ✅ BEZPIECZNE

**Frontend (src/):**
- ✅ Brak OPENAI_API_KEY
- ✅ Brak DEEPGRAM_API_KEY
- ✅ Brak YOUTUBE_API_KEY
- ✅ Brak SPOTIFY_CLIENT_ID/SECRET
- ✅ Brak SUPABASE_SERVICE_ROLE_KEY

**Edge Functions:**
- ✅ Wszystkie API keys pobierane przez `Deno.env.get()`
- ✅ Używane tylko w edge functions (server-side)
- ✅ Nigdy nie wysyłane do frontendu

**Sprawdzone funkcje:**
- `analyze-recording/index.ts:76-79` — używa `Deno.env.get("OPENAI_API_KEY")`
- `process-transcripts/index.ts:68` — używa `Deno.env.get("OPENAI_API_KEY")`
- `run-import-orchestrator/index.ts` — używa `Deno.env.get("YOUTUBE_API_KEY")`
- `embed-speech-samples/index.ts:72` — używa `Deno.env.get("OPENAI_API_KEY")`
- `generate-speaker-persona/index.ts:96` — używa `Deno.env.get("OPENAI_API_KEY")`

### 2. RLS (Row Level Security) — ✅ POPRAWNIE SKONFIGUROWANE

**Wszystkie wrażliwe tabele mają RLS włączone:**

```sql
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcript_jobs ENABLE ROW LEVEL SECURITY;
```

**Policies dla recordings:**
```sql
CREATE POLICY "recordings: select own"
  ON public.recordings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "recordings: insert own"
  ON public.recordings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "recordings: update own"
  ON public.recordings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "recordings: delete own"
  ON public.recordings FOR DELETE
  USING (auth.uid() = user_id);
```

**Policies dla analyses:**
```sql
CREATE POLICY "analyses: select own"
  ON public.analyses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.recordings r
      WHERE r.id = recording_id AND r.user_id = auth.uid()
    )
  );
```

**Test RLS:**
- ✅ User A nie może odczytać recordings User B (policy blokuje)
- ✅ User A nie może odczytać analyses User B (policy blokuje przez JOIN)
- ✅ User A nie może modyfikować channel_imports User B

### 3. Storage Buckets — ✅ BEZPIECZNE

**Bucket `recordings`:**
- ✅ `public: false` — bucket jest PRIVATE
- ✅ Policy: user może upload tylko do `/{user_id}/`
- ✅ Policy: user może read tylko z `/{user_id}/`
- ✅ Policy: user może delete tylko z `/{user_id}/`

```sql
CREATE POLICY "storage: upload own recordings"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'recordings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "storage: read own recordings"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'recordings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

**Weryfikacja:**
- ✅ User A nie może odczytać plików User B
- ✅ User A nie może uploadować do folderu User B
- ✅ Edge functions używają service_role key do odczytu (bypass RLS) — poprawne

### 4. Input Validation — ✅ OBECNA

**create-speaker-import-job:**
- ✅ Walidacja `source_type` (whitelist: youtube_channel, youtube_video, rumble, spotify, upload)
- ✅ Walidacja URL przez regex patterns (`URL_PATTERNS[source_type]`)
- ✅ Walidacja `target_category_id` (whitelist 6 kategorii)
- ✅ Quota check server-side (nie tylko UI)

```typescript
// Linia 118-130
const validSourceTypes: SourceType[] = [
  "youtube_channel", "youtube_video", "rumble", "spotify", "upload"
];
if (!validSourceTypes.includes(source_type)) {
  return jsonError(`Invalid source_type...`, 400);
}

// Linia 133-139
const pattern = URL_PATTERNS[source_type];
if (pattern && !pattern.test(source_url)) {
  return jsonError(`Invalid URL for source_type...`, 400);
}
```

**analyze-recording:**
- ✅ Weryfikacja JWT (linia 87-103)
- ✅ Sprawdzenie ownership recording (linia 134: `recording.user_id !== userId`)
- ✅ Walidacja `recording_id` (linia 112-115)

**process-transcripts:**
- ✅ Walidacja `import_id` (linia 65)
- ✅ Idempotency guard (linia 83-94)
- ✅ Cancellation check mid-flight (linia 133-142)

### 5. Koszty API Calls — ✅ POD KONTROLĄ

**analyze-recording (per invocation):**
- 1× Whisper API (~$0.006 per minute)
- 1× GPT-4o base analysis (~$0.01-0.03 depending on transcript length)
- 1× GPT-4o category analysis (~$0.01-0.02)
- 1× text-embedding-3-small (~$0.0001)
- **Total per recording:** ~$0.03-0.05

**embed-speech-samples:**
- ✅ **HARD CAP: MAX_CHUNKS = 100** (linia 35)
- Sampling strategy jeśli więcej chunków (linia 122-124)
- Cost per import: 100 chunks × $0.0001 = **$0.01 max**

```typescript
const MAX_CHUNKS = 100; // max chunks to embed per import (cost control)

const sampled: TaggedChunk[] = allChunks.length <= MAX_CHUNKS
  ? allChunks
  : sampleEvenly(allChunks, MAX_CHUNKS);
```

**generate-speaker-persona:**
- 1× GPT-4o z dużym kontekstem (wszystkie transkrypty)
- ⚠️ Potencjalnie kosztowne dla długich kanałów (50+ videos)
- ✅ Ale wykonywane tylko raz per import

**process-transcripts:**
- YouTube captions: FREE (unofficial timedtext endpoint)
- Spotify transcripts: FREE (Spotify API)
- Whisper API: tylko dla user uploads (nie dla YouTube/Spotify audio)

**Szacowane koszty miesięczne:**
- Free tier: 5 imports × 20 videos = 100 recordings
- 100 recordings × $0.04 = **$4/month**
- 5 imports × $0.01 embeddings = **$0.05/month**
- 5 imports × $0.05 persona = **$0.25/month**
- **TOTAL FREE TIER: ~$4.30/month**

- Pro tier: 50 imports × 100 videos = 5000 recordings (unrealistic)
- Realistic: 50 imports × 10 videos = 500 recordings
- 500 recordings × $0.04 = **$20/month**
- 50 imports × $0.01 embeddings = **$0.50/month**
- 50 imports × $0.10 persona = **$5/month**
- **TOTAL PRO TIER: ~$25.50/month**

### 6. Zabezpieczenia przed nieskończonymi pętlami — ✅ OBECNE

**process-transcripts:**
- ✅ Timeout check: 5 min (linia 43: `TIMEOUT_MS = 5 * 60 * 1000`)
- ✅ Re-trigger self przed timeout (linia 124-129)
- ✅ Cancellation check w pętli (linia 133-142)
- ✅ Idempotency guard (linia 83-94)

```typescript
// Linia 124-129
if (Date.now() - startTime > TIMEOUT_MS) {
  console.warn(`Approaching timeout — re-triggering process-transcripts`);
  EdgeRuntime.waitUntil(
    invokeFunction("process-transcripts", { import_id }).catch(console.error)
  );
  return jsonOk({ requeued: true, processed_this_run: processedCount });
}
```

**channel_imports:**
- ✅ `retry_count` kolumna w DB (migration 006)
- ⚠️ Brak hard cap na retry_count w kodzie
- ✅ Cron job `recover_stuck_imports()` resetuje stuck imports (migration 007)

---

## ⚠️ PROBLEMY ZNALEZIONE

### 1. BRAK RATE LIMITING PER-USER

**Problem:**
Edge functions nie mają rate limiting per-user. Supabase daje minimalne globalne limity, ale user może spamować requesty.

**Ryzyko:**
- User może wywołać `analyze-recording` 100× w minutę → $4 w koszty
- User może wywołać `create-speaker-import-job` wielokrotnie → quota bypass attempt

**Rekomendacja:**
Dodać rate limiting w edge functions:
```typescript
// Przykład: max 10 analyze-recording per user per minute
const RATE_LIMIT_KEY = `rate_limit:analyze:${userId}`;
const count = await redis.incr(RATE_LIMIT_KEY);
if (count === 1) await redis.expire(RATE_LIMIT_KEY, 60);
if (count > 10) return jsonError("Rate limit exceeded", 429);
```

**Alternatywa:**
Użyć Supabase Edge Functions rate limiting (jeśli dostępne w planie)

### 2. BRAK WALIDACJI UUID

**Problem:**
Niektóre edge functions nie walidują czy `recording_id`, `import_id` itp. są prawidłowymi UUID.

**Lokalizacje:**
- `analyze-recording/index.ts:112` — brak walidacji UUID dla `recording_id`
- `process-transcripts/index.ts:65` — brak walidacji UUID dla `import_id`
- `embed-speech-samples/index.ts:56-58` — brak walidacji UUID

**Ryzyko:**
- SQL injection (niskie — Supabase używa prepared statements)
- Niepotrzebne DB queries z invalid IDs

**Rekomendacja:**
Dodać walidację UUID:
```typescript
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

if (!UUID_REGEX.test(recording_id)) {
  return jsonError("Invalid recording_id format", 400);
}
```

### 3. BRAK HARD CAP NA RETRY_COUNT

**Problem:**
`channel_imports.retry_count` jest inkrementowany przez cron job, ale nie ma hard cap.

**Lokalizacja:**
- `retry-stuck-imports/index.ts` — inkrementuje `retry_count` bez limitu
- `007_pg_cron_jobs.sql` — `recover_stuck_imports()` resetuje status bez sprawdzania retry_count

**Ryzyko:**
- Import może być retry'owany w nieskończoność
- Koszty API calls dla permanently failed imports

**Rekomendacja:**
Dodać hard cap w `retry-stuck-imports`:
```typescript
const MAX_RETRIES = 5;

if (importRow.retry_count >= MAX_RETRIES) {
  await admin
    .from("channel_imports")
    .update({ status: "failed", error_message: "Max retries exceeded" })
    .eq("id", import_id);
  return jsonOk({ failed: true, reason: "max_retries" });
}
```

### 4. BRAK FILE SIZE VALIDATION

**Problem:**
Storage bucket `recordings` ma limit 50 MB (migration 001), ale brak walidacji w frontendzie przed uploadem.

**Lokalizacja:**
- Frontend upload logic (nie sprawdzone w tym audycie)

**Ryzyko:**
- User próbuje upload 100 MB → error dopiero po uploadzeniu
- Marnowanie bandwidth

**Rekomendacja:**
Dodać walidację w frontendzie:
```typescript
if (file.size > 50 * 1024 * 1024) {
  toast.error("File too large. Max 50 MB.");
  return;
}
```

### 5. BRAK MIME TYPE VALIDATION W EDGE FUNCTIONS

**Problem:**
Storage bucket ma `allowed_mime_types`, ale edge functions nie sprawdzają MIME type przed przetwarzaniem.

**Lokalizacja:**
- `analyze-recording/index.ts` — pobiera plik bez sprawdzania MIME type

**Ryzyko:**
- User może uploadować non-audio files
- Whisper API error (kosztowne)

**Rekomendacja:**
Sprawdzać MIME type przed wywołaniem Whisper:
```typescript
const { data: fileMetadata } = await admin.storage
  .from("recordings")
  .list(userFolder, { search: fileName });

const mimeType = fileMetadata[0]?.metadata?.mimetype;
const allowedTypes = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav"];

if (!allowedTypes.includes(mimeType)) {
  throw new AnalysisError("Invalid audio format");
}
```

---

## 🟡 REKOMENDACJE DO ROZWAŻENIA

### 1. Dodać monitoring kosztów API

Zaimplementować tracking kosztów per-user:
```sql
CREATE TABLE api_costs (
  user_id UUID,
  month DATE,
  whisper_calls INT DEFAULT 0,
  gpt4_calls INT DEFAULT 0,
  embedding_calls INT DEFAULT 0,
  estimated_cost_usd NUMERIC DEFAULT 0
);
```

### 2. Dodać webhook dla high-cost users

Alert gdy user przekroczy $10/month:
```typescript
if (userMonthlyCost > 10) {
  await sendSlackAlert(`User ${userId} exceeded $10 cost threshold`);
}
```

### 3. Rozważyć caching dla embeddings

Jeśli ten sam speaker jest importowany wielokrotnie, cache embeddings:
```sql
CREATE TABLE embedding_cache (
  content_hash TEXT PRIMARY KEY,
  embedding vector(1536),
  created_at TIMESTAMPTZ
);
```

### 4. Dodać CAPTCHA dla public endpoints

Jeśli `create-speaker-import-job` jest dostępne publicznie, dodać CAPTCHA:
```typescript
const captchaToken = req.headers.get("X-Captcha-Token");
const isValid = await verifyCaptcha(captchaToken);
if (!isValid) return jsonError("Captcha verification failed", 403);
```

---

## STATYSTYKI

- **Sprawdzonych edge functions:** 11
- **Sprawdzonych tabel z RLS:** 9
- **Sprawdzonych storage buckets:** 1
- **Sprawdzonych API calls:** 5 typów
- **Znalezionych krytycznych problemów:** 0
- **Znalezionych średnich problemów:** 5
- **Szacowane koszty miesięczne (free tier):** $4.30
- **Szacowane koszty miesięczne (pro tier):** $25.50

---

## WNIOSKI

Projekt BIG SPEAKING ma **solidne fundamenty bezpieczeństwa**:
- ✅ Brak hardcoded secrets
- ✅ RLS poprawnie skonfigurowane
- ✅ Storage buckets zabezpieczone
- ✅ Koszty API pod kontrolą (hard caps)

**Główne obszary do poprawy:**
1. Dodać rate limiting per-user
2. Dodać walidację UUID
3. Dodać hard cap na retry_count
4. Dodać walidację file size i MIME type

**Priorytet fixów:**
- 🔴 HIGH: Rate limiting (zapobiega abuse)
- 🟡 MEDIUM: UUID validation (security hygiene)
- 🟡 MEDIUM: Retry count cap (cost control)
- 🟢 LOW: File validation (UX improvement)

---

## DEPLOY COMMANDS

Brak migracji do zastosowania — wszystkie fixy są w kodzie edge functions.

Aby zastosować rekomendacje, należy:
1. Dodać rate limiting logic do edge functions
2. Dodać UUID validation do wszystkich funkcji przyjmujących IDs
3. Dodać retry count cap do `retry-stuck-imports`
4. Dodać file validation do frontendu i edge functions
