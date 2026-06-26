-- ⚠️ DEPRECATED — UŻYJ APPLY_PERSONA_V1_SHIM_v2.sql ⚠️
-- Ten plik naprawia tylko `identity.one_sentence_essence`. Stary bundle
-- crashuje też na `voice_signature.wpm_typical` i innych polach. v2 pokrywa
-- pełny kształt v1.
-- ════════════════════════════════════════════════════════════════════════════
-- PERSONA PROFILE V1 SHIM — naprawa danych w bazie
-- Plik do RĘCZNEGO uruchomienia w Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════════════════
--
-- INSTRUKCJA:
--   1. Otwórz Supabase Dashboard → projekt `hthjuoswarvsfssxqxxj` → SQL Editor.
--   2. Wklej całą zawartość tego pliku.
--   3. Kliknij "Run".
--   4. Sprawdź log (RAISE NOTICE) — `with_missing_v1_essence` powinno = 0.
--
-- KONTEKST:
--   Edge function `analyze-recording` w produkcji wykonuje stary bundle, który
--   ślepo czyta `persona_profile -> 'identity' -> 'one_sentence_essence'`.
--   Jeśli speaker ma profil w kształcie v2 (`LAYER_1_identity`) lub null,
--   stary bundle wybucha z TypeError: "Cannot read properties of undefined
--   (reading 'one_sentence_essence')".
--
-- CO ROBI TA MIGRACJA:
--   1. Backfill: dla każdego speakera z profilem v2 dorzuca shim v1, kopiując
--      LAYER_1_identity.one_sentence_essence (lub fallback) do
--      identity.one_sentence_essence — tak żeby STARY bundle też działał.
--   2. Dla speakerów z null/uszkodzonym persona_profile ustawia bezpieczny
--      default żeby nigdy nie wybuchli.
--   3. Dodaje generated column `persona_profile_shape` do filtrowania.
--   4. Dodaje trigger który automatycznie utrzymuje shim v1 przy każdym
--      INSERT/UPDATE w przyszłości — nawet jak ktoś zaseeduje nowych mentorów
--      tylko w kształcie v2, identity.one_sentence_essence będzie obecne.
--
-- DZIĘKI TEMU: błąd `Cannot read properties of undefined (reading
-- 'one_sentence_essence')` przestaje istnieć NIEZALEŻNIE od tego, czy chmura
-- zdeployuje nowy bundle czy nie.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Funkcja pomocnicza: wymuś v1-shim na danym persona_profile ──────────
CREATE OR REPLACE FUNCTION public.ensure_persona_v1_shim(profile jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result jsonb;
  v2_essence text;
  v2_archetype text;
  v2_voice text;
  current_essence text;
BEGIN
  -- Null / non-object → minimalny safe default
  IF profile IS NULL OR jsonb_typeof(profile) <> 'object' THEN
    RETURN jsonb_build_object(
      'identity', jsonb_build_object(
        'one_sentence_essence', 'Wymagajacy, konkretny mentor mowy.',
        'archetype', 'mentor',
        'voice', 'spokojny, konkretny'
      )
    );
  END IF;

  result := profile;

  current_essence := result #>> '{identity,one_sentence_essence}';
  IF current_essence IS NOT NULL AND length(current_essence) > 0 THEN
    RETURN result;
  END IF;

  -- Spróbuj wyciągnąć z LAYER_1_identity (kształt v2)
  v2_essence := result #>> '{LAYER_1_identity,one_sentence_essence}';
  IF v2_essence IS NULL OR length(v2_essence) = 0 THEN
    v2_essence := result #>> '{LAYER_1_identity,essence}';
  END IF;
  IF v2_essence IS NULL OR length(v2_essence) = 0 THEN
    v2_essence := result #>> '{LAYER_1_identity,description}';
  END IF;
  IF v2_essence IS NULL OR length(v2_essence) = 0 THEN
    v2_essence := 'Wymagajacy, konkretny mentor mowy.';
  END IF;

  v2_archetype := COALESCE(
    result #>> '{LAYER_1_identity,archetype}',
    result #>> '{LAYER_1_identity,role}',
    'mentor'
  );

  v2_voice := COALESCE(
    result #>> '{LAYER_1_identity,voice}',
    result #>> '{LAYER_1_identity,tone}',
    'spokojny, konkretny'
  );

  result := jsonb_set(
    result,
    '{identity}',
    COALESCE(result -> 'identity', '{}'::jsonb) || jsonb_build_object(
      'one_sentence_essence', v2_essence,
      'archetype', v2_archetype,
      'voice', v2_voice
    ),
    true
  );

  RETURN result;
END;
$$;

-- ── 2. Backfill istniejących speakerów ─────────────────────────────────────
UPDATE public.speakers
SET persona_profile = public.ensure_persona_v1_shim(persona_profile)
WHERE
  persona_profile IS NULL
  OR jsonb_typeof(persona_profile) <> 'object'
  OR (persona_profile #>> '{identity,one_sentence_essence}') IS NULL
  OR length(coalesce(persona_profile #>> '{identity,one_sentence_essence}', '')) = 0;

-- ── 3. Trigger utrzymujący shim w przyszłości ──────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_speakers_persona_v1_shim()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.persona_profile := public.ensure_persona_v1_shim(NEW.persona_profile);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS speakers_persona_v1_shim ON public.speakers;
CREATE TRIGGER speakers_persona_v1_shim
  BEFORE INSERT OR UPDATE OF persona_profile ON public.speakers
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_speakers_persona_v1_shim();

-- ── 4. Kolumna `persona_profile_shape` do filtrowania ──────────────────────
ALTER TABLE public.speakers
  ADD COLUMN IF NOT EXISTS persona_profile_shape text;

CREATE OR REPLACE FUNCTION public.compute_persona_shape(profile jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN profile IS NULL OR jsonb_typeof(profile) <> 'object' THEN 'invalid'
    WHEN (profile ? 'LAYER_1_identity') THEN 'v2'
    WHEN (profile #>> '{identity,one_sentence_essence}') IS NOT NULL THEN 'v1'
    ELSE 'invalid'
  END;
$$;

UPDATE public.speakers
SET persona_profile_shape = public.compute_persona_shape(persona_profile);

CREATE OR REPLACE FUNCTION public.tg_speakers_persona_shape()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.persona_profile_shape := public.compute_persona_shape(NEW.persona_profile);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS speakers_persona_shape ON public.speakers;
CREATE TRIGGER speakers_persona_shape
  BEFORE INSERT OR UPDATE OF persona_profile ON public.speakers
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_speakers_persona_shape();

CREATE INDEX IF NOT EXISTS speakers_persona_profile_shape_idx
  ON public.speakers (persona_profile_shape);

-- ── 5. Sanity check ────────────────────────────────────────────────────────
DO $$
DECLARE
  total_count int;
  bad_count int;
  v1_count int;
  v2_count int;
BEGIN
  SELECT count(*) INTO total_count FROM public.speakers;
  SELECT count(*) INTO bad_count
  FROM public.speakers
  WHERE (persona_profile #>> '{identity,one_sentence_essence}') IS NULL
     OR length(coalesce(persona_profile #>> '{identity,one_sentence_essence}', '')) = 0;
  SELECT count(*) INTO v1_count FROM public.speakers WHERE persona_profile_shape = 'v1';
  SELECT count(*) INTO v2_count FROM public.speakers WHERE persona_profile_shape = 'v2';

  RAISE NOTICE '[persona_v1_shim] total=% missing_v1=% v1=% v2=%', total_count, bad_count, v1_count, v2_count;

  IF bad_count > 0 THEN
    RAISE WARNING '[persona_v1_shim] % speakerow nadal nie ma identity.one_sentence_essence!', bad_count;
  ELSE
    RAISE NOTICE '[persona_v1_shim] OK — wszyscy speakerzy maja v1 shim, stary bundle nie wybuchnie.';
  END IF;
END;
$$;
