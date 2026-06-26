/**
 * storage.ts — client-side helpers for the `recordings` Storage bucket.
 *
 * All functions operate through the anon Supabase client, which means
 * RLS policies apply: a user can only touch files inside their own
 * `{userId}/` folder.
 *
 * Path convention:   recordings/{userId}/{timestamp}-{uuid}.{ext}
 * Bucket visibility: private — every URL is a short-lived signed URL.
 */

import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BUCKET = "recordings" as const;

/** Hard limit enforced by the bucket — reject client-side to save bandwidth. */
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MiB

/** Default signed URL validity. 1 hour is generous for a playback session. */
const DEFAULT_SIGNED_URL_EXPIRY_SECONDS = 3600;

const ALLOWED_MIME_TYPES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
]);

/**
 * Strips codec/charset parameters from a MIME type string.
 * e.g. "audio/webm;codecs=opus" → "audio/webm"
 */
function normalizeMimeType(type: string): string {
  return (type || "").split(";")[0].trim().toLowerCase();
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UploadResult {
  /** Storage path, e.g. "550e8400-e29b/1714000000000-abc123.webm".
   *  Store this in recordings.audio_url — it is the canonical reference. */
  path: string;
  /** Signed URL valid for DEFAULT_SIGNED_URL_EXPIRY_SECONDS.
   *  Use for immediate playback after upload; call getSignedUrl() later. */
  signedUrl: string;
}

export class StorageError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "StorageError";
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Maps a MIME type to the canonical file extension used in the path. */
function extensionFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    "audio/webm": "webm",
    "audio/mp4": "mp4",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
  };
  return map[mimeType] ?? "bin";
}

/**
 * Splits a storage path into `{ prefix, filename }` so we can use
 * `.list(prefix, { search: filename })` to retrieve metadata.
 *
 * e.g. "550e8400/1714-abc.webm" → { prefix: "550e8400", filename: "1714-abc.webm" }
 */
function splitPath(path: string): { prefix: string; filename: string } {
  const lastSlash = path.lastIndexOf("/");
  if (lastSlash === -1) return { prefix: "", filename: path };
  return {
    prefix: path.slice(0, lastSlash),
    filename: path.slice(lastSlash + 1),
  };
}

// ---------------------------------------------------------------------------
// uploadAudio
// ---------------------------------------------------------------------------

/**
 * Uploads a recorded audio Blob to the `recordings` bucket.
 *
 * @param blob    The audio Blob produced by MediaRecorder.
 * @param userId  The authenticated user's UUID (must match auth.uid()).
 * @returns       Storage path + signed URL for immediate playback.
 *
 * @throws StorageError on validation failure, network error, or API error.
 */
export async function uploadAudio(
  blob: Blob,
  userId: string,
): Promise<UploadResult> {
  // ── Client-side validation ────────────────────────────────────────────────
  if (blob.size === 0) {
    throw new StorageError("Cannot upload an empty file.");
  }
  if (blob.size > MAX_FILE_SIZE_BYTES) {
    throw new StorageError(
      `File is ${(blob.size / 1024 / 1024).toFixed(1)} MiB — exceeds the 25 MiB limit.`,
    );
  }
  const contentType = normalizeMimeType(blob.type);
  if (!ALLOWED_MIME_TYPES.has(contentType)) {
    throw new StorageError(
      `MIME type "${blob.type}" (normalized "${contentType}") is not allowed. Accepted: ${[...ALLOWED_MIME_TYPES].join(", ")}.`,
    );
  }

  // ── Build path ────────────────────────────────────────────────────────────
  // Millisecond timestamp + random UUID suffix guarantees uniqueness even if
  // the same user uploads two recordings in the same millisecond.
  const ext = extensionFromMime(contentType);
  const filename = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const path = `${userId}/${filename}`;

  // ── Upload ────────────────────────────────────────────────────────────────
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, {
      contentType,
      // Never overwrite: if a collision somehow occurs, surface it.
      upsert: false,
    });

  if (uploadError) {
    throw new StorageError(`Upload failed: ${uploadError.message}`, uploadError);
  }

  // ── Signed URL ───────────────────────────────────────────────────────────
  const signedUrl = await getSignedUrl(path, DEFAULT_SIGNED_URL_EXPIRY_SECONDS);

  return { path, signedUrl };
}

// ---------------------------------------------------------------------------
// getSignedUrl
// ---------------------------------------------------------------------------

/**
 * Generates a short-lived signed URL for private audio playback.
 *
 * @param path              Storage path returned by uploadAudio().
 * @param expiresInSeconds  How long the URL stays valid. Default: 1 hour.
 * @returns                 A signed URL string.
 *
 * @throws StorageError if Supabase cannot sign the URL.
 */
export async function getSignedUrl(
  path: string,
  expiresInSeconds = DEFAULT_SIGNED_URL_EXPIRY_SECONDS,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new StorageError(
      `Could not create signed URL for "${path}": ${error?.message ?? "empty response"}`,
      error,
    );
  }

  return data.signedUrl;
}

// ---------------------------------------------------------------------------
// deleteRecordingFile
// ---------------------------------------------------------------------------

/**
 * Permanently removes a recording file from storage.
 *
 * Call this when a user deletes a recording from the app *after* the
 * corresponding `recordings` DB row has been deleted, so the cleanup
 * job never needs to touch it.
 *
 * @param path  Storage path, e.g. "{userId}/1714000000000-abc.webm"
 *
 * @throws StorageError on API error.
 */
export async function deleteRecordingFile(path: string): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([path]);

  if (error) {
    throw new StorageError(
      `Delete failed for "${path}": ${error.message}`,
      error,
    );
  }
}

// ---------------------------------------------------------------------------
// getFileSize
// ---------------------------------------------------------------------------

/**
 * Returns the size of a stored recording in bytes without downloading it.
 *
 * Uses `.list()` on the parent folder, which returns object metadata.
 * This is the lightest approach available in the Supabase JS client
 * (no separate HEAD request endpoint exists on the storage API).
 *
 * @param path  Storage path, e.g. "{userId}/1714000000000-abc.webm"
 * @returns     File size in bytes.
 *
 * @throws StorageError if the file is not found or the API call fails.
 */
export async function getFileSize(path: string): Promise<number> {
  const { prefix, filename } = splitPath(path);

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(prefix, {
      search: filename,
      limit: 1,
    });

  if (error) {
    throw new StorageError(
      `Could not list metadata for "${path}": ${error.message}`,
      error,
    );
  }

  const file = data?.find((f) => f.name === filename);
  if (!file) {
    throw new StorageError(`File not found: "${path}"`);
  }

  // The `metadata` field is typed as `Record<string, unknown>` by the SDK.
  // Storage populates it with `{ size, mimetype, cacheControl, ... }`.
  const size = (file.metadata as Record<string, unknown>)?.size;
  if (typeof size !== "number") {
    throw new StorageError(
      `Size metadata missing for "${path}". The file may still be processing.`,
    );
  }

  return size;
}
