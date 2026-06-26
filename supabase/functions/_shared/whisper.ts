/**
 * _shared/whisper.ts
 * OpenAI Whisper transcription for user-uploaded audio files.
 *
 * LEGAL NOTES:
 * ─────────────────────────────────────────────────────────────────────────────
 * ✅ UPLOADS: The user submits their own audio files to Supabase Storage.
 *    By uploading, they confirm they own the rights or have a license.
 *    We transcribe these with Whisper — fully permitted.
 *
 * ❌ YOUTUBE / STREAMING AUDIO: Downloading audio from YouTube or Spotify
 *    violates their Terms of Service. This file does NOT implement audio
 *    extraction from those platforms. YouTube videos must have captions;
 *    Spotify episodes must have API-provided transcripts.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const WHISPER_API_URL = "https://api.openai.com/v1/audio/transcriptions";

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface WhisperResult {
  text: string;
  durationSeconds: number;
}

interface WhisperVerboseJson {
  text: string;
  duration?: number;
}

// ---------------------------------------------------------------------------
// Download from Supabase Storage and transcribe with Whisper
// ---------------------------------------------------------------------------

/**
 * Downloads a file from the `speaker-imports` bucket and sends it to
 * OpenAI Whisper for transcription.
 *
 * @param storagePath  Path inside the `speaker-imports` bucket.
 * @param adminClient  Service-role Supabase client (bypasses RLS).
 * @param openaiKey    OPENAI_API_KEY secret.
 */
export async function transcribeUploadedFile(
  storagePath: string,
  adminClient: SupabaseClient,
  openaiKey: string,
): Promise<WhisperResult> {
  // 1. Download from Supabase Storage
  const { data: blob, error } = await adminClient.storage
    .from("speaker-imports")
    .download(storagePath);

  if (error || !blob) {
    throw new Error(
      `Storage download failed for "${storagePath}": ${error?.message ?? "No data"}`,
    );
  }

  const buffer = await blob.arrayBuffer();
  const audioBytes = new Uint8Array(buffer);

  // 2. Derive file extension for Whisper's format detection
  const ext = storagePath.split(".").pop()?.toLowerCase() ?? "mp4";
  const supportedExts = ["mp3", "mp4", "m4a", "wav", "webm", "ogg", "flac"];
  const safeExt = supportedExts.includes(ext) ? ext : "mp4";

  // 3. Build multipart form for Whisper
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([audioBytes], { type: mimeForExt(safeExt) }),
    `audio.${safeExt}`,
  );
  formData.append("model", "whisper-1");
  formData.append("response_format", "verbose_json");

  // 4. Call Whisper
  const res = await fetch(WHISPER_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${openaiKey}` },
    body: formData,
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Whisper API error ${res.status}: ${errBody}`);
  }

  const data = await res.json() as WhisperVerboseJson;

  if (!data.text) {
    throw new Error("Whisper returned empty transcript");
  }

  return {
    text: data.text.trim(),
    durationSeconds: data.duration ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Helper: MIME type from extension
// ---------------------------------------------------------------------------

function mimeForExt(ext: string): string {
  const map: Record<string, string> = {
    mp3: "audio/mpeg",
    mp4: "audio/mp4",
    m4a: "audio/mp4",
    wav: "audio/wav",
    webm: "audio/webm",
    ogg: "audio/ogg",
    flac: "audio/flac",
  };
  return map[ext] ?? "audio/mp4";
}
