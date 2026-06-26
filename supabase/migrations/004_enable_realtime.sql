-- Enable Realtime on recordings and user_badges tables.
--
-- REPLICA IDENTITY FULL makes UPDATE payloads include the full old row so
-- useRecordingStatusRealtime can confirm the status was 'analyzing' before
-- declaring the analysis complete (avoids false invalidations on other field
-- updates like transcript being written).

ALTER TABLE recordings REPLICA IDENTITY FULL;
ALTER TABLE user_badges REPLICA IDENTITY FULL;

-- Add tables to the supabase_realtime publication.
-- Running ADD TABLE is idempotent when the table is already a member.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE recordings;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE user_badges;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
