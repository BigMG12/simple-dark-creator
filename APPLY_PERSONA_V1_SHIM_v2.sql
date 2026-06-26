-- ════════════════════════════════════════════════════════════════════════════
-- PERSONA PROFILE V1 SHIM v2 — pełny kształt v1 dla starego bundla
-- Plik do RĘCZNEGO uruchomienia w Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════════════════
--
-- INSTRUKCJA:
--   1. Otwórz Supabase Dashboard → SQL Editor.
--   2. Wklej CAŁĄ zawartość tego pliku.
--   3. Kliknij "Run".
--   4. W logu zobaczysz NOTICE z liczbą naprawionych speakerów.
--
-- KONTEKST:
--   Stary bundle `analyze-recording` w produkcji odczytuje BEZ ochrony m.in.:
--     persona_profile.identity.one_sentence_essence
--     persona_profile.voice_signature.wpm_typical
--     persona_profile.voice_signature.wpm_range
--     persona_profile.language_signature.*
--     persona_profile.rhetorical_patterns.*
--     persona_profile.energy_profile.energy_arc_pattern
--     persona_profile.teaching_signatures.*
--     persona_profile.what_they_hate / what_they_celebrate
--   Każdy brakujący klucz = "Cannot read properties of undefined".
--
-- CO ROBI TEN SKRYPT:
--   1. Rozszerza funkcję `ensure_persona_v1_shim(jsonb)` o WSZYSTKIE pola v1.
--   2. Mapuje istniejące dane v2 (LAYER_1/2/3) do struktury v1.
--   3. Dla brakujących pól wstawia bezpieczne defaulty (puste tablice / "—").
--   4. Backfilluje wszystkie istniejące wiersze speakers.
--   5. Trigger BEFORE INSERT/UPDATE utrzymuje kształt v1 w przyszłości.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Funkcja: pełny shim v1 ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ensure_persona_v1_shim(profile jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result jsonb;
  pace_arr jsonb;
  pace_min numeric;
  pace_max numeric;
  pace_typical numeric;
BEGIN
  -- Null / non-object → pełny safe default
  IF profile IS NULL OR jsonb_typeof(profile) <> 'object' THEN
    profile := '{}'::jsonb;
  END IF;

  result := profile;

  -- ─── identity ──────────────────────────────────────────────────────────
  result := jsonb_set(
    result,
    '{identity}',
    COALESCE(result -> 'identity', '{}'::jsonb) || jsonb_build_object(
      'one_sentence_essence', COALESCE(
        NULLIF(result #>> '{identity,one_sentence_essence}', ''),
        NULLIF(result #>> '{LAYER_1_identity,one_sentence_essence}', ''),
        NULLIF(result #>> '{LAYER_1_identity,essence}', ''),
        NULLIF(result #>> '{LAYER_1_identity,description}', ''),
        'Wymagajacy, konkretny mentor mowy.'
      ),
      'archetype', COALESCE(
        NULLIF(result #>> '{identity,archetype}', ''),
        NULLIF(result #>> '{LAYER_1_identity,archetype}', ''),
        NULLIF(result #>> '{LAYER_1_identity,role}', ''),
        'mentor'
      ),
      'era_context', COALESCE(
        NULLIF(result #>> '{identity,era_context}', ''),
        NULLIF(result #>> '{LAYER_1_identity,era_context}', ''),
        '—'
      ),
      'public_persona_tone', COALESCE(
        NULLIF(result #>> '{identity,public_persona_tone}', ''),
        NULLIF(result #>> '{LAYER_1_identity,public_persona_tone}', ''),
        NULLIF(result #>> '{LAYER_1_identity,tone}', ''),
        'spokojny, konkretny'
      ),
      'voice', COALESCE(
        NULLIF(result #>> '{identity,voice}', ''),
        NULLIF(result #>> '{LAYER_1_identity,voice}', ''),
        'spokojny, konkretny'
      )
    ),
    true
  );

  -- ─── voice_signature ───────────────────────────────────────────────────
  pace_arr := result #> '{LAYER_2_somatic_signature,speaking_pace_wpm}';
  IF pace_arr IS NOT NULL AND jsonb_typeof(pace_arr) = 'array' AND jsonb_array_length(pace_arr) >= 2 THEN
    BEGIN
      pace_min := (pace_arr ->> 0)::numeric;
      pace_max := (pace_arr ->> 1)::numeric;
      pace_typical := round((pace_min + pace_max) / 2);
    EXCEPTION WHEN others THEN
      pace_min := 120; pace_max := 160; pace_typical := 140;
    END;
  ELSE
    pace_min := 120; pace_max := 160; pace_typical := 140;
  END IF;

  result := jsonb_set(
    result,
    '{voice_signature}',
    COALESCE(result -> 'voice_signature', '{}'::jsonb) || jsonb_build_object(
      'wpm_typical', COALESCE(
        (NULLIF(result #>> '{voice_signature,wpm_typical}', ''))::numeric,
        pace_typical
      ),
      'wpm_range', COALESCE(
        result #> '{voice_signature,wpm_range}',
        jsonb_build_array(pace_min, pace_max)
      ),
      'pause_philosophy', COALESCE(
        NULLIF(result #>> '{voice_signature,pause_philosophy}', ''),
        NULLIF(result #>> '{LAYER_2_somatic_signature,pause_philosophy}', ''),
        '—'
      ),
      'signature_vocal_moves', COALESCE(
        result #> '{voice_signature,signature_vocal_moves}',
        result #> '{LAYER_2_somatic_signature,signature_vocal_moves}',
        '[]'::jsonb
      )
    ),
    true
  );

  -- ─── language_signature ────────────────────────────────────────────────
  result := jsonb_set(
    result,
    '{language_signature}',
    COALESCE(result -> 'language_signature', '{}'::jsonb) || jsonb_build_object(
      'favorite_words', COALESCE(
        result #> '{language_signature,favorite_words}',
        result #> '{LAYER_3_language_dna,favorite_words}',
        '[]'::jsonb
      ),
      'verbal_tics', COALESCE(
        result #> '{language_signature,verbal_tics}',
        result #> '{LAYER_3_language_dna,verbal_tics}',
        '[]'::jsonb
      ),
      'sentence_starters_typical', COALESCE(
        result #> '{language_signature,sentence_starters_typical}',
        result #> '{LAYER_3_language_dna,sentence_starters_typical}',
        '[]'::jsonb
      ),
      'metaphor_style', COALESCE(
        NULLIF(result #>> '{language_signature,metaphor_style}', ''),
        NULLIF(result #>> '{LAYER_3_language_dna,metaphor_style}', ''),
        '—'
      ),
      'vocabulary_level', COALESCE(
        NULLIF(result #>> '{language_signature,vocabulary_level}', ''),
        NULLIF(result #>> '{LAYER_3_language_dna,vocabulary_level}', ''),
        '—'
      )
    ),
    true
  );

  -- ─── rhetorical_patterns ───────────────────────────────────────────────
  result := jsonb_set(
    result,
    '{rhetorical_patterns}',
    COALESCE(result -> 'rhetorical_patterns', '{}'::jsonb) || jsonb_build_object(
      'primary_devices', COALESCE(
        result #> '{rhetorical_patterns,primary_devices}',
        result #> '{LAYER_4_rhetoric,primary_devices}',
        '[]'::jsonb
      ),
      'opening_patterns', COALESCE(
        result #> '{rhetorical_patterns,opening_patterns}',
        result #> '{LAYER_4_rhetoric,opening_patterns}',
        '[]'::jsonb
      ),
      'closing_patterns', COALESCE(
        result #> '{rhetorical_patterns,closing_patterns}',
        result #> '{LAYER_4_rhetoric,closing_patterns}',
        '[]'::jsonb
      ),
      'never_does', COALESCE(
        result #> '{rhetorical_patterns,never_does}',
        result #> '{LAYER_4_rhetoric,never_does}',
        '[]'::jsonb
      )
    ),
    true
  );

  -- ─── energy_profile ────────────────────────────────────────────────────
  result := jsonb_set(
    result,
    '{energy_profile}',
    COALESCE(result -> 'energy_profile', '{}'::jsonb) || jsonb_build_object(
      'energy_arc_pattern', COALESCE(
        NULLIF(result #>> '{energy_profile,energy_arc_pattern}', ''),
        NULLIF(result #>> '{LAYER_5_energy,energy_arc_pattern}', ''),
        '—'
      )
    ),
    true
  );

  -- ─── teaching_signatures ───────────────────────────────────────────────
  result := jsonb_set(
    result,
    '{teaching_signatures}',
    COALESCE(result -> 'teaching_signatures', '{}'::jsonb) || jsonb_build_object(
      'when_giving_feedback_style', COALESCE(
        NULLIF(result #>> '{teaching_signatures,when_giving_feedback_style}', ''),
        NULLIF(result #>> '{LAYER_6_teaching,when_giving_feedback_style}', ''),
        'Bezpośredni, konkretny, oparty na faktach.'
      ),
      'correction_language', COALESCE(
        NULLIF(result #>> '{teaching_signatures,correction_language}', ''),
        NULLIF(result #>> '{LAYER_6_teaching,correction_language}', ''),
        'Tu trzeba poprawić.'
      ),
      'praise_language', COALESCE(
        NULLIF(result #>> '{teaching_signatures,praise_language}', ''),
        NULLIF(result #>> '{LAYER_6_teaching,praise_language}', ''),
        'Dobra robota.'
      )
    ),
    true
  );

  -- ─── what_they_hate / what_they_celebrate ──────────────────────────────
  IF result -> 'what_they_hate' IS NULL OR jsonb_typeof(result -> 'what_they_hate') <> 'array' THEN
    result := jsonb_set(result, '{what_they_hate}',
      COALESCE(result #> '{LAYER_7_values,what_they_hate}', '[]'::jsonb), true);
  END IF;
  IF result -> 'what_they_celebrate' IS NULL OR jsonb_typeof(result -> 'what_they_celebrate') <> 'array' THEN
    result := jsonb_set(result, '{what_they_celebrate}',
      COALESCE(result #> '{LAYER_7_values,what_they_celebrate}', '[]'::jsonb), true);
  END IF;

  RETURN result;
END;
$$;

-- ── 2. Backfill wszystkich speakerów ────────────────────────────────────────
DO $$
DECLARE
  repaired_count int;
BEGIN
  UPDATE public.speakers
  SET persona_profile = public.ensure_persona_v1_shim(persona_profile);
  GET DIAGNOSTICS repaired_count = ROW_COUNT;
  RAISE NOTICE '✅ persona_profile shim v2 applied to % speakers', repaired_count;
END $$;

-- ── 3. Trigger utrzymujący shim w przyszłości ───────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_speakers_persona_v1_shim()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.persona_profile := public.ensure_persona_v1_shim(NEW.persona_profile);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_speakers_persona_v1_shim ON public.speakers;
CREATE TRIGGER trg_speakers_persona_v1_shim
  BEFORE INSERT OR UPDATE OF persona_profile ON public.speakers
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_speakers_persona_v1_shim();

-- ── 4. Weryfikacja ──────────────────────────────────────────────────────────
DO $$
DECLARE
  bad_count int;
BEGIN
  SELECT COUNT(*) INTO bad_count
  FROM public.speakers
  WHERE
    (persona_profile #>> '{identity,one_sentence_essence}') IS NULL
    OR (persona_profile #>> '{voice_signature,wpm_typical}') IS NULL;
  IF bad_count > 0 THEN
    RAISE WARNING '⚠️ % speakers still missing required fields', bad_count;
  ELSE
    RAISE NOTICE '✅ all speakers have full v1 shape (identity + voice_signature)';
  END IF;
END $$;
