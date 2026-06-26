-- ============================================================================
-- BACKFILL_ENHANCED_FIELDS.sql
-- Cel: dosypać pola enhancedData (what_was_wrong, how_to_fix, next_step,
--      verdict_label, mentor_quote_responsive) do istniejących analiz, żeby
--      Results.tsx renderował SEKCJE 1/2/3/5 nawet dla rekordów sprzed r12.
--
-- Bezpieczeństwo:
--   - Aktualizujemy TYLKO rekordy gdzie pola są NULL.
--   - metrics_with_context wymaga obliczeń per-mentor — nie da się go
--     odtworzyć w czystym SQL bez wywołania edge function. Pomijamy go;
--     UI ma graceful fallback.
--
-- Uruchom: w Supabase SQL Editor lub przez `psql` na bazie projektu.
-- ============================================================================

BEGIN;

-- 1) verdict_label z overall_score (te same progi co calculateVerdictLabel)
UPDATE public.analyses
SET verdict_label = CASE
  WHEN overall_score >= 90 THEN 'Mistrzowski'
  WHEN overall_score >= 71 THEN 'Mocny'
  WHEN overall_score >= 41 THEN 'Solidny'
  ELSE 'Surowy'
END
WHERE verdict_label IS NULL
  AND overall_score IS NOT NULL;

-- 2) mentor_quote_responsive z feedback_summary
UPDATE public.analyses
SET mentor_quote_responsive = feedback_summary
WHERE mentor_quote_responsive IS NULL
  AND feedback_summary IS NOT NULL
  AND length(feedback_summary) > 0;

-- 3) what_was_wrong z mentor_violations[0] (v1) lub z mentor_violations (v2 array)
UPDATE public.analyses
SET what_was_wrong = jsonb_build_object(
  'moment',
    COALESCE(
      (mentor_violations -> 0 ->> 'moment'),
      (mentor_violations ->> 0),
      'Mentor zwrócił uwagę na elementy do poprawy.'
    ),
  'diagnosis',
    COALESCE(
      (mentor_violations -> 0 ->> 'diagnosis'),
      (mentor_violations ->> 0),
      'Sprawdź sekcję "Co mentor powiedział" poniżej.'
    ),
  'what_client_thought', ''
)
WHERE what_was_wrong IS NULL
  AND mentor_violations IS NOT NULL;

-- 4) how_to_fix z mentor_alternative_phrasing (v1) lub bezpośrednio (v2)
UPDATE public.analyses
SET how_to_fix = jsonb_build_object(
  'instead_of',
    COALESCE(mentor_alternative_phrasing ->> 'user_said',
             mentor_alternative_phrasing ->> 'instead_of', ''),
  'say_this',
    COALESCE(mentor_alternative_phrasing ->> 'how_you_would_say_it',
             mentor_alternative_phrasing ->> 'say_this', ''),
  'why_this_works',
    COALESCE(mentor_alternative_phrasing ->> 'why_this_works',
             (mentor_wins ->> 0), '')
)
WHERE how_to_fix IS NULL
  AND mentor_alternative_phrasing IS NOT NULL;

-- 5) next_step z mentor_drills[0] + mentor_closing_line
UPDATE public.analyses
SET next_step = jsonb_build_object(
  'drill_recommendation_reason',
    COALESCE(
      (mentor_drills -> 0 ->> 'why_you_are_assigning_this'),
      (mentor_drills -> 0 ->> 'why_this_drill'),
      ''
    ),
  'mentor_push_to_action', COALESCE(mentor_closing_line, '')
)
WHERE next_step IS NULL
  AND (mentor_drills IS NOT NULL OR mentor_closing_line IS NOT NULL);

-- 6) Diagnostyka — ile rekordów teraz ma komplet pól
SELECT
  count(*) FILTER (WHERE verdict_label IS NOT NULL)         AS has_verdict_label,
  count(*) FILTER (WHERE mentor_quote_responsive IS NOT NULL) AS has_quote,
  count(*) FILTER (WHERE what_was_wrong IS NOT NULL)        AS has_what_was_wrong,
  count(*) FILTER (WHERE how_to_fix IS NOT NULL)            AS has_how_to_fix,
  count(*) FILTER (WHERE next_step IS NOT NULL)             AS has_next_step,
  count(*) FILTER (WHERE metrics_with_context IS NOT NULL)  AS has_metrics_with_context,
  count(*)                                                  AS total
FROM public.analyses;

COMMIT;
