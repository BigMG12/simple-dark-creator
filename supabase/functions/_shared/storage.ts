/**
 * _shared/storage.ts — Storage helpers for Supabase Edge Functions (Deno).
 *
 * Import in any edge function:
 *   import { downloadAudioForProcessing } from "../_shared/storage.ts";
 *
 * These helpers run under the service_role key, which bypasses RLS and
 * allows the Edge Function to read any user's recordings for processing.
 * They must NEVER be exposed to the browser.
 */

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.103.3";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** All metadata Supabase Storage returns for a stored object. */
export interface StorageObjectMeta {
  name: string;
  id: string;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
  metadata: {
    size: number;
    mimetype: string;
    cacheControl: string;
    [key: string]: unknown;
  };
}

export class EdgeStorageError extends Error {
  constructor(
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "EdgeStorageError";
  }
}

// ---------------------------------------------------------------------------
// downloadAudioForProcessing
// ---------------------------------------------------------------------------

/**
 * Downloads a recording from the `recordings` bucket and returns the raw
 * bytes as a Uint8Array.
 *
 * Why Uint8Array and not Blob?
 *   Deno's fetch() and FormData() work with ArrayBuffer/Uint8Array natively.
 *   A Uint8Array can be passed directly to the Whisper FormData payload
 *   without an extra conversion step.
 *
 * Usage in analyze-recording:
 *   const audioBytes = await downloadAudioForProcessing(path, adminClient);
 *   formData.append("file", new Blob([audioBytes]), "recording.webm");
 *
 * @param path         Storage path stored in recordings.audio_url.
 * @param adminClient  A SupabaseClient initialised with the service_role key.
 *                     Pass the one already created in the calling function
 *                     to avoid constructing a second client.
 * @returns            Raw audio bytes as Uint8Array.
 *
 * @throws EdgeStorageError on download failure or empty response.
 */
export async function downloadAudioForProcessing(
  path: string,
  adminClient: SupabaseClient,
): Promise<Uint8Array> {
  const { data: blob, error } = await adminClient.storage
    .from("recordings")
    .download(path);

  if (error) {
    throw new EdgeStorageError(
      `Storage download failed for "${path}": ${error.message}`,
      error,
    );
  }

  if (!blob) {
    throw new EdgeStorageError(
      `Storage returned no data for "${path}".`,
    );
  }

  // Convert Blob → ArrayBuffer → Uint8Array.
  // Blob.arrayBuffer() is available in both Deno and modern browsers.
  const buffer = await blob.arrayBuffer();
  return new Uint8Array(buffer);
}

// ---------------------------------------------------------------------------
// getStorageObjectMeta
// ---------------------------------------------------------------------------

/**
 * Returns metadata (size, MIME type, timestamps) for a stored recording
 * without downloading the file content.
 *
 * Useful for pre-flight checks before dispatching the transcription pipeline:
 *   • Validate the file is non-empty.
 *   • Confirm it has an audio MIME type.
 *   • Log storage usage per user.
 *
 * @param path         Storage path stored in recordings.audio_url.
 * @param adminClient  SupabaseClient with service_role key.
 * @returns            StorageObjectMeta.
 *
 * @throws EdgeStorageError if the file is not found or the API call fails.
 */
export async function getStorageObjectMeta(
  path: string,
  adminClient: SupabaseClient,
): Promise<StorageObjectMeta> {
  // Extract directory prefix and filename from the path.
  const lastSlash = path.lastIndexOf("/");
  const prefix = lastSlash === -1 ? "" : path.slice(0, lastSlash);
  const filename = lastSlash === -1 ? path : path.slice(lastSlash + 1);

  const { data, error } = await adminClient.storage
    .from("recordings")
    .list(prefix, { search: filename, limit: 1 });

  if (error) {
    throw new EdgeStorageError(
      `Metadata fetch failed for "${path}": ${error.message}`,
      error,
    );
  }

  const file = data?.find((f: { name: string }) => f.name === filename);
  if (!file) {
    throw new EdgeStorageError(`File not found in storage: "${path}"`);
  }

  return file as StorageObjectMeta;
}

// ---------------------------------------------------------------------------
// deleteStorageObject
// ---------------------------------------------------------------------------

/**
 * Permanently removes a single recording from storage.
 *
 * The Edge Function calls this when processing fails catastrophically and
 * the file should not be retained (e.g., corrupted upload).  For normal
 * user-initiated deletes, prefer the client-side deleteRecordingFile() in
 * src/lib/storage.ts, which runs under the user's own RLS context.
 *
 * @param path         Storage path to delete.
 * @param adminClient  SupabaseClient with service_role key.
 *
 * @throws EdgeStorageError on API failure.
 */
export async function deleteStorageObject(
  path: string,
  adminClient: SupabaseClient,
): Promise<void> {
  const { error } = await adminClient.storage
    .from("recordings")
    .remove([path]);

  if (error) {
    throw new EdgeStorageError(
      `Delete failed for "${path}": ${error.message}`,
      error,
    );
  }
}

// ---------------------------------------------------------------------------
// createAdminStorageClient (convenience factory)
// ---------------------------------------------------------------------------

/**
 * Builds a SupabaseClient configured for service_role storage access.
 *
 * Only use this when you need a standalone storage client outside of a
 * request handler that already creates one.  In analyze-recording, reuse
 * the admin client that's already constructed in the main handler.
 *
 * @param supabaseUrl      From Deno.env.get("SUPABASE_URL")
 * @param serviceRoleKey   From Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
 */
export function createAdminStorageClient(
  supabaseUrl: string,
  serviceRoleKey: string,
): SupabaseClient {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      // Edge Functions don't need session persistence.
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
