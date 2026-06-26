-- ============================================================
-- Migration 011: Notify-Complete Extras
--
-- What this adds:
--   1. profiles.email_notifications_enabled — opt-in flag for import
--      completion emails sent by notify-import-complete edge function.
--   2. Extend achievements_log.event_type constraint to include
--      'speaker_imported' so the notify function can write an entry
--      when an import finishes successfully.
--
-- Run after 010_poll_queued_imports_cron.sql
-- ============================================================


-- ============================================================
-- 1. profiles — email notification opt-in
--
-- Default TRUE: users who signed up before this migration land
-- in the "send me emails" state. They can opt out from Settings.
-- Set to FALSE if you prefer an explicit opt-in instead.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.profiles.email_notifications_enabled IS
  'When TRUE, notify-import-complete sends a Resend email on speaker import success.';


-- ============================================================
-- 2. achievements_log — extend event_type to 'speaker_imported'
--
-- The existing CHECK constraint only allows the four original
-- event types. We drop and recreate it to add the new value.
-- ============================================================

ALTER TABLE public.achievements_log
  DROP CONSTRAINT IF EXISTS achievements_log_event_type_check;

ALTER TABLE public.achievements_log
  ADD CONSTRAINT achievements_log_event_type_check
    CHECK (event_type IN (
      'badge_earned',
      'level_up',
      'streak_milestone',
      'score_milestone',
      'speaker_imported'    -- fired by notify-import-complete when status = 'complete'
    ));
