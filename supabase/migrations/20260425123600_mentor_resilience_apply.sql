-- Re-apply mentor resilience steps idempotently.
-- Safe to run multiple times.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'recordings'
      AND column_name = 'mentor_speaker_id'
  ) THEN
    ALTER TABLE public.recordings
      ADD COLUMN mentor_speaker_id uuid
        REFERENCES public.speakers(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS recordings_mentor_speaker_id_idx
  ON public.recordings (mentor_speaker_id);

WITH ranked AS (
  SELECT id,
    first_value(id) OVER (
      PARTITION BY lower(trim(name))
      ORDER BY sort_order NULLS LAST, created_at NULLS LAST, id
    ) AS keep_id
  FROM public.speakers
),
remap AS (SELECT id AS old_id, keep_id AS new_id FROM ranked WHERE id <> keep_id)
UPDATE public.profiles p SET selected_speaker_id = r.new_id
FROM remap r WHERE p.selected_speaker_id = r.old_id;

WITH ranked AS (
  SELECT id,
    first_value(id) OVER (
      PARTITION BY lower(trim(name))
      ORDER BY sort_order NULLS LAST, created_at NULLS LAST, id
    ) AS keep_id
  FROM public.speakers
),
remap AS (SELECT id AS old_id, keep_id AS new_id FROM ranked WHERE id <> keep_id)
UPDATE public.recordings rec SET mentor_speaker_id = r.new_id
FROM remap r WHERE rec.mentor_speaker_id = r.old_id;

WITH ranked AS (
  SELECT id,
    first_value(id) OVER (
      PARTITION BY lower(trim(name))
      ORDER BY sort_order NULLS LAST, created_at NULLS LAST, id
    ) AS keep_id
  FROM public.speakers
),
remap AS (SELECT id AS old_id, keep_id AS new_id FROM ranked WHERE id <> keep_id)
UPDATE public.analyses a SET compared_to_speaker_id = r.new_id
FROM remap r WHERE a.compared_to_speaker_id = r.old_id;

WITH ranked AS (
  SELECT id,
    first_value(id) OVER (
      PARTITION BY lower(trim(name))
      ORDER BY sort_order NULLS LAST, created_at NULLS LAST, id
    ) AS keep_id
  FROM public.speakers
)
DELETE FROM public.speakers s USING ranked r
WHERE s.id = r.id AND r.id <> r.keep_id;

UPDATE public.profiles SET selected_speaker_id = NULL
WHERE selected_speaker_id IS NOT NULL
  AND selected_speaker_id NOT IN (SELECT id FROM public.speakers);

UPDATE public.recordings SET mentor_speaker_id = NULL
WHERE mentor_speaker_id IS NOT NULL
  AND mentor_speaker_id NOT IN (SELECT id FROM public.speakers);

CREATE UNIQUE INDEX IF NOT EXISTS speakers_norm_name_unique
  ON public.speakers ((lower(trim(name))));
