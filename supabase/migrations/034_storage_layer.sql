-- ============================================================
-- BIG SPEAKING — Storage Layer
-- Migration: 002_storage_layer.sql
--
-- Applies on top of 001_initial_schema.sql.
-- Safe to re-run: all DDL is idempotent via IF EXISTS / ON CONFLICT.
--
-- What this migration does:
--   1. Upserts the `recordings` bucket with production settings.
--   2. Drops and recreates all storage RLS policies with explicit
--      names so they can be replaced cleanly on re-runs.
-- ============================================================


-- ============================================================
-- 1. BUCKET CONFIGURATION
--
-- Settings deliberately tighter than the defaults:
--   • Private bucket  — signed URLs only, no public CDN access
--   • 25 MB cap       — sufficient for a 5-min session at 128 kbps
--   • Four MIME types — webm (Chrome/Firefox), mp4 (Safari), mpeg
--                       and wav as import/fallback formats
-- ============================================================

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'recordings',
  'recordings',
  false,        -- never publicly accessible; all URLs are signed
  26214400,     -- 25 MiB = 25 × 1024 × 1024
  ARRAY[
    'audio/webm',
    'audio/mp4',
    'audio/mpeg',
    'audio/wav'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;


-- ============================================================
-- 2. STORAGE RLS POLICIES
--
-- Path convention enforced by every policy:
--   recordings/{user_id}/{filename}
--
-- (storage.foldername(name))[1] extracts the first path segment,
-- which must equal the authenticated user's UUID.
--
-- The Edge Function uses the service_role key and is therefore
-- exempt from RLS — it can read any file for transcription.
-- ============================================================

-- Drop before recreate so this migration is safely re-runnable.
-- We drop by name rather than CASCADE to avoid touching unrelated policies.

DROP POLICY IF EXISTS "storage: upload own recordings"  ON storage.objects;
DROP POLICY IF EXISTS "storage: read own recordings"    ON storage.objects;
DROP POLICY IF EXISTS "storage: delete own recordings"  ON storage.objects;
DROP POLICY IF EXISTS "storage: update own recordings"  ON storage.objects;

-- INSERT: a user may only create objects inside their own folder.
-- This is the only policy that uses WITH CHECK (write guard).
CREATE POLICY "storage: upload own recordings"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'recordings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- SELECT: a user may only read objects inside their own folder.
CREATE POLICY "storage: read own recordings"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'recordings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE: allows metadata edits (e.g., renaming) within own folder.
-- The Edge Function does not update storage objects, but the policy
-- prevents a user from moving a file into another user's folder.
CREATE POLICY "storage: update own recordings"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'recordings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'recordings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE: a user may remove only their own files.
CREATE POLICY "storage: delete own recordings"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'recordings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
