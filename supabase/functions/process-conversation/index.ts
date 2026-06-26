/**
 * process-conversation
 *
 * HTTP POST { conversation_id: string }
 *
 * Pulls the uploaded audio from storage, sends it to Deepgram for
 * transcription + diarization, persists the result, and returns a
 * summary of detected speakers so the user can pick which one is them.
 *
 * Status transitions:
 *   pending → diarizing → awaiting_speaker_selection
 *                       │
 *                       └─ analyzing (auto, if only 1 speaker detected)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

import {
  transcribeAndDiarize,
  extractSpeakerTranscript,
  DeepgramError,
} from "../_shared/deepgram.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const JSON_HEADERS = { ...CORS_HEADERS, "Content-Type": "application/json" };

const MIN_DURATION_SECONDS = 30;
const STORAGE_BUCKET = "conversations";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConversationRow {
  id: string;
  user_id: string;
  audio_url: string;
  audio_mime_type?: string | null;
  conversation_type: string;
  status: string;
  duration_seconds?: number | null;
  context_stakes?: string | null;
  context_goal?: string | null;
  context_other_party?: string | null;
}

interface RequestBody {
  conversation_id?: string;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  // ── Env ────────────────────────────────────────────────────────────────
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const deepgramKey = Deno.env.get("DEEPGRAM_API_KEY");

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return jsonResponse({ error: "Server misconfigured: missing Supabase env" }, 500);
  }
  if (!deepgramKey) {
    return jsonResponse(
      { error: "Server misconfigured: DEEPGRAM_API_KEY not set" },
      500,
    );
  }

  // ── Auth ───────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "Missing Authorization header" }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return jsonResponse({ error: "Invalid or expired session" }, 401);
  }
  const userId = userData.user.id;

  // ── Body ───────────────────────────────────────────────────────────────
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonResponse({ error: "Body must be valid JSON" }, 400);
  }
  const conversationId = body.conversation_id;
  if (!conversationId || typeof conversationId !== "string") {
    return jsonResponse({ error: "conversation_id (string) is required" }, 400);
  }

  const admin: SupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Load + verify ownership ────────────────────────────────────────────
  const { data: convo, error: loadErr } = await admin
    .from("conversations")
    .select(
      "id, user_id, audio_url, audio_mime_type, conversation_type, status, duration_seconds, context_stakes, context_goal, context_other_party",
    )
    .eq("id", conversationId)
    .maybeSingle();

  if (loadErr) {
    console.error("[process-conversation] DB read failed:", loadErr);
    return jsonResponse({ error: "Failed to load conversation" }, 500);
  }
  if (!convo) return jsonResponse({ error: "Conversation not found" }, 404);
  if (convo.user_id !== userId) return jsonResponse({ error: "Forbidden" }, 403);
  if (!convo.audio_url) {
    return jsonResponse({ error: "Conversation has no audio" }, 400);
  }

  // Reject too-short uploads early when we already know the duration.
  if (
    typeof convo.duration_seconds === "number" &&
    convo.duration_seconds < MIN_DURATION_SECONDS
  ) {
    await admin
      .from("conversations")
      .update({
        status: "failed",
        error_message: `Conversation must be at least ${MIN_DURATION_SECONDS} seconds.`,
      })
      .eq("id", conversationId);
    return jsonResponse(
      { error: `Conversation must be at least ${MIN_DURATION_SECONDS} seconds.` },
      400,
    );
  }

  // ── Mark as diarizing ──────────────────────────────────────────────────
  await admin
    .from("conversations")
    .update({ status: "diarizing", error_message: null })
    .eq("id", conversationId);

  // ── Download audio ─────────────────────────────────────────────────────
  let audioBytes: Uint8Array;
  try {
    audioBytes = await downloadFromBucket(admin, STORAGE_BUCKET, convo.audio_url);
  } catch (err) {
    console.error("[process-conversation] Storage download failed:", err);
    await markFailed(admin, conversationId, "Could not read uploaded audio.");
    return jsonResponse({ error: "Could not read uploaded audio" }, 500);
  }

  // ── Run Deepgram ───────────────────────────────────────────────────────
  let diarization: Awaited<ReturnType<typeof transcribeAndDiarize>>;
  try {
    diarization = await transcribeAndDiarize(audioBytes, deepgramKey, {
      mimeType: convo.audio_mime_type ?? "audio/webm",
      timeoutMs: 180_000,
    });
  } catch (err) {
    console.error("[process-conversation] Deepgram failed:", err);
    const msg =
      err instanceof DeepgramError
        ? err.message
        : "Transcription service is temporarily unavailable.";

    // Best-effort fallback: hand off to the existing solo analyze-recording
    // pipeline so the user still gets *some* result.
    const fellBack = await tryWhisperFallback(admin, convo, supabaseUrl, serviceRoleKey);
    if (fellBack) {
      return jsonResponse(
        {
          status: "fell_back_to_solo",
          message:
            "Diarization unavailable — analyzed as a single speaker. Quality may be lower.",
        },
        200,
      );
    }
    await markFailed(admin, conversationId, msg);
    return jsonResponse({ error: msg }, 502);
  }

  // ── Validate duration ──────────────────────────────────────────────────
  if (diarization.duration_seconds < MIN_DURATION_SECONDS) {
    await markFailed(
      admin,
      conversationId,
      `Conversation must be at least ${MIN_DURATION_SECONDS} seconds.`,
    );
    return jsonResponse(
      { error: `Conversation must be at least ${MIN_DURATION_SECONDS} seconds.` },
      400,
    );
  }

  // ── Single-speaker shortcut ────────────────────────────────────────────
  if (diarization.speakers.length <= 1) {
    const onlySpeaker = diarization.speakers[0];
    const transcriptUserOnly = onlySpeaker
      ? extractSpeakerTranscript(diarization, onlySpeaker.speaker_id, true)
      : diarization.transcript_full;

    await admin
      .from("conversations")
      .update({
        status: "analyzing",
        duration_seconds: diarization.duration_seconds,
        diarization_data: {
          speakers: diarization.speakers,
          utterances: diarization.utterances,
          single_speaker_detected: true,
        },
        transcript_full: diarization.transcript_full,
        transcript_user_only: transcriptUserOnly,
        user_speaker_label: onlySpeaker?.label ?? "Speaker 0",
      })
      .eq("id", conversationId);

    // Fire-and-forget the analysis call.
    invokeAnalyze(supabaseUrl, serviceRoleKey, conversationId);

    return jsonResponse(
      {
        status: "single_speaker_detected",
        message:
          "Detected as a single speaker — analyzing without speaker selection.",
        duration_seconds: diarization.duration_seconds,
        speakers: diarization.speakers.map(toClientSpeaker),
      },
      200,
    );
  }

  // ── Persist diarization, await user choice ─────────────────────────────
  const { error: saveErr } = await admin
    .from("conversations")
    .update({
      status: "awaiting_speaker_selection",
      duration_seconds: diarization.duration_seconds,
      diarization_data: {
        speakers: diarization.speakers,
        utterances: diarization.utterances,
        single_speaker_detected: false,
      },
      transcript_full: diarization.transcript_full,
    })
    .eq("id", conversationId);

  if (saveErr) {
    console.error("[process-conversation] Save failed:", saveErr);
    await markFailed(admin, conversationId, "Failed to save diarization.");
    return jsonResponse({ error: "Failed to save diarization" }, 500);
  }

  return jsonResponse(
    {
      status: "awaiting_speaker_selection",
      duration_seconds: diarization.duration_seconds,
      speakers: diarization.speakers.map(toClientSpeaker),
    },
    200,
  );
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

async function markFailed(
  admin: SupabaseClient,
  id: string,
  message: string,
): Promise<void> {
  await admin
    .from("conversations")
    .update({ status: "failed", error_message: message })
    .eq("id", id);
}

async function downloadFromBucket(
  admin: SupabaseClient,
  bucket: string,
  path: string,
): Promise<Uint8Array> {
  const { data, error } = await admin.storage.from(bucket).download(path);
  if (error || !data) {
    throw new Error(`Storage download failed: ${error?.message ?? "no data"}`);
  }
  return new Uint8Array(await data.arrayBuffer());
}

function toClientSpeaker(s: {
  label: string;
  speaker_id: number;
  duration_seconds: number;
  utterance_count: number;
  sample_utterances: { start: number; end: number; text: string }[];
}) {
  return {
    label: s.label,
    speaker_id: s.speaker_id,
    duration_seconds: s.duration_seconds,
    utterance_count: s.utterance_count,
    sample_text: s.sample_utterances[0]?.text ?? "",
    sample_utterances: s.sample_utterances,
  };
}

function invokeAnalyze(
  supabaseUrl: string,
  serviceRoleKey: string,
  conversationId: string,
): void {
  // Fire-and-forget; analyze-conversation persists its own status.
  const url = `${supabaseUrl}/functions/v1/analyze-conversation`;
  const promise = fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ conversation_id: conversationId }),
  }).catch((err) => {
    console.error("[process-conversation] analyze-conversation invoke failed:", err);
  });

  // @ts-expect-error EdgeRuntime is available in Supabase Edge runtime.
  if (typeof EdgeRuntime !== "undefined") {
    // @ts-expect-error EdgeRuntime.waitUntil is available in Supabase Edge runtime.
    EdgeRuntime.waitUntil(promise);
  }
}

/**
 * Whisper fallback — invokes the existing analyze-recording pipeline.
 * Returns true on successful handoff, false otherwise.
 */
async function tryWhisperFallback(
  admin: SupabaseClient,
  convo: ConversationRow,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<boolean> {
  try {
    await admin
      .from("conversations")
      .update({
        status: "analyzing",
        error_message:
          "Diarization unavailable — analyzed as single speaker (Whisper fallback).",
      })
      .eq("id", convo.id);

    const res = await fetch(`${supabaseUrl}/functions/v1/analyze-recording`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recording_id: convo.id,
        source: "conversation_fallback",
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("[process-conversation] Whisper fallback failed:", err);
    return false;
  }
}
