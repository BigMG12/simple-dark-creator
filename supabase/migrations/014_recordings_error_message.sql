-- Add error_message column for surfacing background analysis failures.
ALTER TABLE public.recordings
  ADD COLUMN IF NOT EXISTS error_message TEXT;
