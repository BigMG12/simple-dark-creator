-- Mentor resilience migration
-- 1. Ensure recordings.mentor_speaker_id exists (snapshot column).
-- 2. Safely dedupe speakers by normalized name without temp tables
--    (so it works in Supabase SQL Editor too).
-- 3. Repair any dangling references created by previous partial cleanups.

-- 1. Snapshot column on recordings
ALTER TABLE public.recordings
  ADD COLUMN IF NOT EXISTS mentor_speaker_id uuid
    REFERENCES public.speakers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS recordings_mentor_speaker_id_idx
  ON public.recordings (mentor_speaker_id);

-- 2. Dedupe speakers by lower(trim(name))
WITH ranked AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY lower(trim(name))
      ORDER BY sort_order NULLS LAST, created_at NULLS LAST, id
    ) AS keep_id
  FROM public.speakers
),
remap AS (
  SELECT id AS old_id, keep_id AS new_id
  FROM ranked
  WHERE id <> keep_id
)
UPDATE public.profiles p
SET selected_speaker_id = r.new_id
FROM remap r
WHERE p.selected_speaker_id = r.old_id;

WITH ranked AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY lower(trim(name))
      ORDER BY sort_order NULLS LAST, created_at NULLS LAST, id
    ) AS keep_id
  FROM public.speakers
),
remap AS (
  SELECT id AS old_id, keep_id AS new_id
  FROM ranked
  WHERE id <> keep_id
)
UPDATE public.recordings rec
SET mentor_speaker_id = r.new_id
FROM remap r
WHERE rec.mentor_speaker_id = r.old_id;

WITH ranked AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY lower(trim(name))
      ORDER BY sort_order NULLS LAST, created_at NULLS LAST, id
    ) AS keep_id
  FROM public.speakers
),
remap AS (
  SELECT id AS old_id, keep_id AS new_id
  FROM ranked
  WHERE id <> keep_id
)
UPDATE public.analyses a
SET compared_to_speaker_id = r.new_id
FROM remap r
WHERE a.compared_to_speaker_id = r.old_id;

WITH ranked AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY lower(trim(name))
      ORDER BY sort_order NULLS LAST, created_at NULLS LAST, id
    ) AS keep_id
  FROM public.speakers
)
DELETE FROM public.speakers s
USING ranked r
WHERE s.id = r.id AND r.id <> r.keep_id;

-- 3. Heal any remaining dangling references
UPDATE public.profiles
SET selected_speaker_id = NULL
WHERE selected_speaker_id IS NOT NULL
  AND selected_speaker_id NOT IN (SELECT id FROM public.speakers);

UPDATE public.recordings
SET mentor_speaker_id = NULL
WHERE mentor_speaker_id IS NOT NULL
  AND mentor_speaker_id NOT IN (SELECT id FROM public.speakers);

-- 4. Prevent regressions: unique on normalized name
CREATE UNIQUE INDEX IF NOT EXISTS speakers_norm_name_unique
  ON public.speakers ((lower(trim(name))));
