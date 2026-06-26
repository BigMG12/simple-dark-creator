# 🔍 AUDYT SPÓJNOŚCI DB ↔ KOD — BIG SPEAKING

**Data audytu:** 2026-04-22  
**Audytor:** Claude Sonnet 4.6  
**Zakres:** Pełna weryfikacja spójności schema DB vs kod (frontend + edge functions)

---

## 🔴 KRYTYCZNE PROBLEMY

### 1. KONFLIKT DEFINICJI: channel_imports — DWA RÓŻNE CREATE TABLE

**Problem:** Tabela `channel_imports` jest definiowana w DWÓCH różnych migracjach z **różnymi nazwami kolumn**.

#### 005_speaker_imports.sql (linie 36-66)
```sql
CREATE TABLE IF NOT EXISTS public.channel_imports (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_type          TEXT NOT NULL CHECK (...),
  source_url           TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'queued' CHECK (...),
  progress_current     INT NOT NULL DEFAULT 0,
  progress_total       INT NOT NULL DEFAULT 0,
  source_metadata      JSONB,
  resulting_speaker_id UUID REFERENCES public.speakers(id) ON DELETE SET NULL,
  error_message        TEXT,
  custom_name          TEXT,           -- ← NAZWA 1
  custom_trait         TEXT,           -- ← NAZWA 1
  target_category_id   TEXT CHECK (...), -- ← TYP TEXT
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at         TIMESTAMPTZ
);
```

#### 005_v2_features.sql (linie 40-66)
```sql
CREATE TABLE IF NOT EXISTS public.channel_imports (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_type             TEXT NOT NULL CHECK (...),
  source_url              TEXT,        -- ← BRAK NOT NULL
  source_metadata         JSONB NOT NULL DEFAULT '{}',
  target_category_id      UUID REFERENCES public.speaker_categories(id) ON DELETE SET NULL, -- ← TYP UUID + FK
  custom_name_override    TEXT,        -- ← NAZWA 2
  custom_trait_override   TEXT,        -- ← NAZWA 2
  status                  TEXT NOT NULL DEFAULT 'queued' CHECK (...),
  progress_current        INT NOT NULL DEFAULT 0,
  progress_total          INT NOT NULL DEFAULT 0,
  error_message           TEXT,
  resulting_speaker_id    UUID REFERENCES public.speakers(id) ON DELETE SET NULL,
  estimated_completion_at TIMESTAMPTZ, -- ← DODATKOWA KOLUMNA
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at              TIMESTAMPTZ, -- ← DODATKOWA KOLUMNA
  completed_at            TIMESTAMPTZ
);
```

#### Kod używa (create-speaker-import-job/index.ts:214-216):
```typescript
custom_name: custom_name ?? null,
custom_trait: custom_trait ?? null,
target_category_id: target_category_id ?? null,
```

#### Kod używa (generate-speaker-persona/index.ts:143-145):
```typescript
nameOverride: importRow.custom_name,
traitOverride: importRow.custom_trait,
targetCategory: importRow.target_category_id,
```

**Konsekwencje:**
- Jeśli obie migracje zostały uruchomione, druga nadpisuje pierwszą
- Kod używa nazw z pierwszej migracji → **kolumny nie istnieją w DB**
- INSERT/SELECT będą failować z błędem "column does not exist"
- `target_category_id` ma różny typ (TEXT vs UUID) → type mismatch

**Status:** 🔴 BLOKUJĄCY — kod nie może działać z obecnym schema

**Rozwiązanie:** Musisz zdecydować która migracja jest właściwa:
- Jeśli 005_speaker_imports.sql → usuń 005_v2_features.sql lub zmień nazwy kolumn w kodzie
- Jeśli 005_v2_features.sql → zmień kod aby używał `custom_name_override`, `custom_trait_override` i UUID dla `target_category_id`

---

### 2. KONFLIKT DEFINICJI: speakers.source_type — RÓŻNE WARTOŚCI CHECK

**Problem:** Kolumna `speakers.source_type` ma różne dozwolone wartości w dwóch migracjach.

#### 005_speaker_imports.sql (linia 16)
```sql
ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'built_in'
  CHECK (source_type IN ('built_in', 'imported')),
```

#### 005_v2_features.sql (linia 125)
```sql
ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'curated',
-- ...
ADD CONSTRAINT speakers_source_type_check
  CHECK (source_type IN ('curated','imported','community'));
```

#### Kod używa (generate-speaker-persona/index.ts:180):
```typescript
source_type: "imported",
```

#### RLS policies używają:
- 005_speaker_imports.sql: `s.source_type = 'built_in'`
- 005_v2_features.sql: `s.source_type = 'curated'`

**Konsekwencje:**
- Jeśli obie migracje zostały uruchomione, druga nadpisuje CHECK constraint
- Wartość `'built_in'` nie jest dozwolona w drugiej migracji
- RLS policy z pierwszej migracji przestaje działać
- Istniejące dane z wartością `'built_in'` stają się nieprawidłowe

**Status:** 🔴 BLOKUJĄCY

---

### 3. KONFLIKT DEFINICJI: speakers.category_id — TEXT vs UUID

**Problem:** Kolumna `speakers.category_id` ma różny typ w dwóch migracjach.

#### 005_speaker_imports.sql (linia 26)
```sql
ADD COLUMN IF NOT EXISTS category_id TEXT
  CHECK (category_id IN ('motivation','sales','influence','leadership','storytelling','authority')),
```

#### 005_v2_features.sql (linia 124)
```sql
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.speaker_categories(id) ON DELETE SET NULL,
```

**Konsekwencje:**
- TEXT z CHECK constraint vs UUID z FK — fundamentalnie różne typy
- Kod używa string literals: `category_id: resolvedCategory` gdzie `resolvedCategory` to `CategoryId` (string union type)
- Jeśli 005_v2_features nadpisała, kod wstawia stringi do kolumny UUID → type error

**Status:** 🔴 BLOKUJĄCY

---

## 🟡 PROBLEMY WYMAGAJĄCE DECYZJI

### 4. Nieużywane RPC functions

**Problem:** Funkcje zdefiniowane w migracjach ale nigdy nie wywołane w kodzie.

#### Zdefiniowane ale nieużywane:
- `get_user_import_count()` (005_speaker_imports.sql:191) — zastąpiona przez `check_import_quota()` w migracji 008
- `increment_import_progress()` (006_import_helpers.sql:14) — brak wywołań w kodzie
- `get_import_summary()` (006_import_helpers.sql:68) — brak wywołań w kodzie
- `match_speech_embeddings()` — brak w migracjach ale wymieniona w project memory

#### Używane w kodzie:
- `check_import_quota()` ✅ (create-speaker-import-job)
- `increment_import_quota()` ✅ (create-speaker-import-job)
- `get_dashboard_stats()` ✅ (frontend)
- `get_progress_chart()` ✅ (frontend)
- `get_daily_drill()` ✅ (frontend)

**Rekomendacja:** Usuń nieużywane funkcje lub dodaj komentarz "DEPRECATED" jeśli mogą być używane przez zewnętrzne narzędzia.

**Status:** 🟡 CLEANUP

---

### 5. Brakujące kolumny w database.types.ts

**Problem:** Frontend TypeScript types nie pasują do rzeczywistego schema DB.

#### database.types.ts definiuje ChannelImport jako:
```typescript
export interface ChannelImport {
  id: string
  user_id: string
  channel_url: string        // ← NIE ISTNIEJE w DB
  channel_name: string | null // ← NIE ISTNIEJE w DB
  status: ChannelImportStatus
  progress: number            // ← NIE ISTNIEJE w DB (jest progress_current)
  total_videos: number | null // ← NIE ISTNIEJE w DB (jest progress_total)
  processed_videos: number | null // ← NIE ISTNIEJE w DB
  error_message: string | null
  created_at: string
  updated_at: string
}
```

#### Rzeczywiste kolumny w DB (z migracji 005_speaker_imports.sql):
```sql
id, user_id, source_type, source_url, status, 
progress_current, progress_total, source_metadata,
resulting_speaker_id, error_message, custom_name, 
custom_trait, target_category_id, created_at, completed_at
```

#### Brakujące kolumny w TypeScript types:
- `source_type` ✅ (używane w kodzie)
- `source_url` ✅ (używane w kodzie)
- `source_metadata` ✅ (używane w kodzie)
- `resulting_speaker_id` ✅ (używane w kodzie)
- `custom_name` ✅ (używane w kodzie)
- `custom_trait` ✅ (używane w kodzie)
- `target_category_id` ✅ (używane w kodzie)
- `retry_count` (dodane w 006_import_reliability.sql)
- `completed_at`

**Konsekwencje:**
- Frontend queries mogą failować bo próbują czytać nieistniejące kolumny
- TypeScript nie wykryje błędów w czasie kompilacji
- Kod edge functions używa poprawnych nazw (z import-types.ts), ale frontend używa błędnych

**Rekomendacja:** Wygeneruj ponownie types: `supabase gen types typescript --local > src/lib/database.types.ts`

**Status:** 🟡 TYPE MISMATCH

---

## 🟢 POZYTYWNE ZNALEZISKA

### 6. Prawidłowo zaimplementowane funkcje

✅ **RPC Functions używane w kodzie:**
- `check_import_quota()` — tier-aware quota checking
- `increment_import_quota()` — atomic counter increment
- `get_dashboard_stats()` — dashboard metrics
- `get_progress_chart()` — progress chart data
- `get_daily_drill()` — daily drill selection

✅ **Edge Functions pipeline:**
- `create-speaker-import-job` → `run-import-orchestrator` → `process-transcripts` → `generate-speaker-persona` → `embed-speech-samples`
- Wszystkie funkcje używają spójnych typów z `_shared/import-types.ts`
- Proper error handling i idempotency guards

✅ **Cron Jobs (pg_cron):**
- `stuck_import_recovery` — co 10 min
- `monthly_quota_reset` — codziennie o 00:00 UTC
- `transcript_job_cleanup` — co tydzień w niedzielę o 02:00 UTC

---

## 📊 STATYSTYKI AUDYTU

**Migracje:** 17 plików
**Tabele zdefiniowane:** ~15 tabel
**RPC Functions:** 15 funkcji
**RLS Policies:** ~40+ policies
**Indeksy:** ~25+ indeksów

**Krytyczne problemy:** 3 (channel_imports konflikt, speakers.source_type konflikt, speakers.category_id konflikt)
**Problemy wymagające decyzji:** 2 (nieużywane RPC, type mismatches)
**Pozytywne:** Edge functions pipeline dobrze zaprojektowany

---

## 🔧 PLAN NAPRAWY

### FAZA 1: Rozwiązanie konfliktów definicji (KRYTYCZNE)

**Decyzja wymagana:** Która migracja jest właściwa — 005_speaker_imports.sql czy 005_v2_features.sql?

#### Opcja A: Zachowaj 005_speaker_imports.sql
1. Usuń lub zmień nazwę `005_v2_features.sql` na `005_v2_features.sql.BACKUP`
2. Kod już używa poprawnych nazw kolumn — nie wymaga zmian
3. Usuń tabelę `speaker_categories` jeśli nie jest używana

#### Opcja B: Zachowaj 005_v2_features.sql
1. Usuń lub zmień nazwę `005_speaker_imports.sql` na `005_speaker_imports.sql.BACKUP`
2. Zmień kod aby używał:
   - `custom_name_override` zamiast `custom_name`
   - `custom_trait_override` zamiast `custom_trait`
   - UUID zamiast string dla `target_category_id`
3. Zmień `source_type` values: `'built_in'` → `'curated'`
4. Zmień `speakers.category_id` z TEXT na UUID

**Rekomendacja:** Opcja A jest prostsza — kod już działa z tymi nazwami.

### FAZA 2: Migracja naprawcza

Stwórz `supabase/migrations/012_audit_fixes.sql`:

```sql
-- ============================================================
-- Migration 012: Audit Fixes — Resolves conflicts from dual definitions
-- ============================================================

-- DECISION: Keeping 005_speaker_imports.sql schema (kod już używa tych nazw)
-- Dropping conflicting definitions from 005_v2_features.sql

-- 1. Drop speaker_categories table if exists (not used in current code)
DROP TABLE IF EXISTS public.speaker_categories CASCADE;

-- 2. Ensure channel_imports has correct columns (from 005_speaker_imports.sql)
-- If 005_v2_features overwrote it, we need to fix column names

DO $$
BEGIN
  -- Check if custom_name_override exists (from 005_v2_features)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'channel_imports' 
    AND column_name = 'custom_name_override'
  ) THEN
    -- Rename to custom_name
    ALTER TABLE public.channel_imports 
      RENAME COLUMN custom_name_override TO custom_name;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'channel_imports' 
    AND column_name = 'custom_trait_override'
  ) THEN
    -- Rename to custom_trait
    ALTER TABLE public.channel_imports 
      RENAME COLUMN custom_trait_override TO custom_trait;
  END IF;
END $$;

-- 3. Ensure target_category_id is TEXT not UUID
DO $$
BEGIN
  -- Check current type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'channel_imports' 
    AND column_name = 'target_category_id'
    AND data_type = 'uuid'
  ) THEN
    -- Drop FK constraint if exists
    ALTER TABLE public.channel_imports 
      DROP CONSTRAINT IF EXISTS channel_imports_target_category_id_fkey;
    
    -- Change to TEXT with CHECK
    ALTER TABLE public.channel_imports 
      ALTER COLUMN target_category_id TYPE TEXT;
    
    ALTER TABLE public.channel_imports
      DROP CONSTRAINT IF EXISTS channel_imports_target_category_id_check;
    
    ALTER TABLE public.channel_imports
      ADD CONSTRAINT channel_imports_target_category_id_check
      CHECK (target_category_id IN (
        'motivation','sales','influence','leadership','storytelling','authority'
      ));
  END IF;
END $$;

-- 4. Ensure speakers.category_id is TEXT not UUID
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'speakers' 
    AND column_name = 'category_id'
    AND data_type = 'uuid'
  ) THEN
    -- Drop FK constraint if exists
    ALTER TABLE public.speakers 
      DROP CONSTRAINT IF EXISTS speakers_category_id_fkey;
    
    -- Change to TEXT with CHECK
    ALTER TABLE public.speakers 
      ALTER COLUMN category_id TYPE TEXT;
    
    ALTER TABLE public.speakers
      DROP CONSTRAINT IF EXISTS speakers_category_id_check;
    
    ALTER TABLE public.speakers
      ADD CONSTRAINT speakers_category_id_check
      CHECK (category_id IN (
        'motivation','sales','influence','leadership','storytelling','authority'
      ));
  END IF;
END $$;

-- 5. Ensure speakers.source_type uses correct values
DO $$
BEGIN
  -- Update 'curated' to 'built_in' if exists
  UPDATE public.speakers 
  SET source_type = 'built_in' 
  WHERE source_type = 'curated';
  
  -- Drop old constraint
  ALTER TABLE public.speakers
    DROP CONSTRAINT IF EXISTS speakers_source_type_check;
  
  -- Add correct constraint
  ALTER TABLE public.speakers
    ADD CONSTRAINT speakers_source_type_check
    CHECK (source_type IN ('built_in', 'imported'));
END $$;

-- 6. Update RLS policies to use correct source_type value
DROP POLICY IF EXISTS "speakers: select curated or own imported" ON public.speakers;

CREATE POLICY "speakers: select built_in or own imported"
  ON public.speakers FOR SELECT
  USING (
    source_type = 'built_in'
    OR source_user_id = auth.uid()
  );

-- 7. Ensure source_url is NOT NULL on channel_imports
ALTER TABLE public.channel_imports
  ALTER COLUMN source_url SET NOT NULL;

-- 8. Drop unused view if exists
DROP VIEW IF EXISTS public.user_import_feed;

-- Recreate with correct column names
CREATE OR REPLACE VIEW public.user_import_feed AS
SELECT
  ci.id,
  ci.user_id,
  ci.source_type,
  ci.source_url,
  ci.status,
  ci.progress_current,
  ci.progress_total,
  ci.resulting_speaker_id,
  ci.error_message,
  ci.custom_name,
  ci.custom_trait,
  ci.target_category_id,
  ci.created_at,
  ci.completed_at,
  s.name AS speaker_name,
  s.monogram AS speaker_monogram,
  s.category_id AS speaker_category
FROM public.channel_imports ci
LEFT JOIN public.speakers s ON s.id = ci.resulting_speaker_id;
```

### FAZA 3: Regeneracja TypeScript types

```bash
cd C:\Users\Michał\Desktop\domena\remix-of-remix-of-elite-speaker-ai-main
supabase gen types typescript --local > src/lib/database.types.ts
```

### FAZA 4: Cleanup nieużywanych funkcji

Dodaj do `012_audit_fixes.sql`:

```sql
-- Mark deprecated functions
COMMENT ON FUNCTION public.get_user_import_count(UUID) IS 
  'DEPRECATED: Use check_import_quota() instead (migration 008)';

COMMENT ON FUNCTION public.increment_import_progress(UUID) IS 
  'DEPRECATED: Not used in current codebase';

COMMENT ON FUNCTION public.get_import_summary(UUID) IS 
  'DEPRECATED: Frontend uses direct queries instead';
```

---

## 🎯 DEPLOY COMMANDS

Po zatwierdzeniu fixów, uruchom:

```bash
# 1. Zastosuj migrację naprawczą
supabase db push

# 2. Regeneruj TypeScript types
supabase gen types typescript --local > src/lib/database.types.ts

# 3. Zrestartuj edge functions (jeśli są deployed)
supabase functions deploy --no-verify-jwt

# 4. Sprawdź czy wszystko działa
npm run type-check
```

---

## 📋 CHECKLIST WERYFIKACJI

Po zastosowaniu fixów, sprawdź:

- [ ] `channel_imports` ma kolumny: `custom_name`, `custom_trait` (nie `_override`)
- [ ] `target_category_id` jest TEXT z CHECK constraint
- [ ] `speakers.source_type` akceptuje tylko `'built_in'` i `'imported'`
- [ ] `speakers.category_id` jest TEXT z CHECK constraint
- [ ] RLS policy używa `source_type = 'built_in'`
- [ ] TypeScript types pasują do schema DB
- [ ] Edge functions działają bez błędów
- [ ] Frontend może tworzyć nowe importy

---

## 🔍 PODSUMOWANIE AUDYTU

**Znalezione problemy:**
- 🔴 3 krytyczne konflikty definicji tabel (channel_imports, speakers.source_type, speakers.category_id)
- 🟡 2 problemy wymagające cleanup (nieużywane RPC, type mismatches)

**Główna przyczyna:**
Dwie migracje (005_speaker_imports.sql i 005_v2_features.sql) definiują te same tabele z różnymi nazwami kolumn i typami. Kod używa nazw z pierwszej migracji, ale jeśli druga została uruchomiona później, nadpisała definicje.

**Rozwiązanie:**
Migracja 012 przywraca schema zgodne z kodem (nazwy z 005_speaker_imports.sql), usuwa konflikty i oznacza nieużywane funkcje jako deprecated.

**Następne kroki:**
1. Przejrzyj migrację 012 i zatwierdź
2. Uruchom `supabase db push`
3. Regeneruj types
4. Przetestuj import pipeline

---

**Koniec audytu FAZA 3/7**

