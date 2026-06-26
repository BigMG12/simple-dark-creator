-- Dedupe speakers + enforce UNIQUE(name)
BEGIN;

CREATE TEMP TABLE _canonical_speakers ON COMMIT DROP AS
SELECT DISTINCT ON (name)
  id AS canonical_id, name
FROM public.speakers
ORDER BY name, sort_order NULLS LAST, created_at NULLS LAST, id;

CREATE TEMP TABLE _speaker_remap ON COMMIT DROP AS
SELECT s.id AS old_id, c.canonical_id AS new_id
FROM public.speakers s
JOIN _canonical_speakers c ON c.name = s.name
WHERE s.id <> c.canonical_id;

UPDATE public.profiles p
SET selected_speaker_id = r.new_id
FROM _speaker_remap r
WHERE p.selected_speaker_id = r.old_id;

UPDATE public.analyses a
SET compared_to_speaker_id = r.new_id
FROM _speaker_remap r
WHERE a.compared_to_speaker_id = r.old_id;

DELETE FROM public.speakers s
USING _speaker_remap r
WHERE s.id = r.old_id;

UPDATE public.profiles
SET selected_speaker_id = NULL
WHERE selected_speaker_id IS NOT NULL
  AND selected_speaker_id NOT IN (SELECT id FROM public.speakers);

ALTER TABLE public.speakers
  DROP CONSTRAINT IF EXISTS speakers_name_unique;
ALTER TABLE public.speakers
  ADD CONSTRAINT speakers_name_unique UNIQUE (name);

COMMIT;
