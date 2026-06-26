/**
 * select-user-speaker
 *
 * HTTP POST { conversation_id: string, speaker_label: string }
 *
 * Records which diarized speaker is "the user", builds the
 * transcript_user_only column, and kicks off analyze-conversation.
 *
 * Status: awaiting_speaker_selection → analyzing.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

import {
  extractSpeakerTranscript,
  type DiarizationResult,
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RequestBody {
  conversation_id?: string;
  speaker_label?: string;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return json({ error: "Server misconfigured" }, 500);
  }

  // ── Auth ───────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json({ error: "Invalid session" }, 401);
  const userId = userData.user.id;

  // ── Body ───────────────────────────────────────────────────────────────
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return json({ error: "Body must be valid JSON" }, 400);
  }
  const { conversation_id, speaker_label } = body;
  if (!conversation_id || typeof conversation_id !== "string") {
    return json({ error: "conversation_id (string) is required" }, 400);
  }
  if (!speaker_label || typeof speaker_label !== "string") {
    return json({ error: "speaker_label (string) is required" }, 400);
  }

  const admin: SupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Load conversation ──────────────────────────────────────────────────
  const { data: convo, error: loadErr } = await admin
    .from("conversations")
    .select("id, user_id, status, diarization_data")
    .eq("id", conversation_id)
    .maybeSingle();

  if (loadErr) {
    console.error("[select-user-speaker] DB read failed:", loadErr);
    return json({ error: "Failed to load conversation" }, 500);
  }
  if (!convo) return json({ error: "Conversation not found" }, 404);
  if (convo.user_id !== userId) return json({ error: "Forbidden" }, 403);

  if (
    convo.status !== "awaiting_speaker_selection" &&
    convo.status !== "diarizing"
  ) {
    return json(
      {
        error: `Cannot select speaker while conversation is ${convo.status}`,
      },
      409,
    );
  }

  // ── Resolve label → speaker_id ─────────────────────────────────────────
  const diarization = convo.diarization_data as
    | (Pick<DiarizationResult, "speakers" | "utterances"> & Record<string, unknown>)
    | null;
  if (!diarization?.speakers?.length || !diarization?.utterances?.length) {
    return json({ error: "Diarization data missing — re-run processing" }, 400);
  }

  const matched = diarization.speakers.find((s) => s.label === speaker_label);
  if (!matched) {
    return json(
      {
        error: `Unknown speaker label "${speaker_label}". Valid: ${diarization.speakers
          .map((s) => s.label)
          .join(", ")}`,
      },
      400,
    );
  }

  // ── Build user-only transcript ─────────────────────────────────────────
  // Re-use shared helper by constructing a minimal DiarizationResult.
  const transcriptUserOnly = extractSpeakerTranscript(
    {
      duration_seconds: 0,
      speakers: diarization.speakers,
      utterances: diarization.utterances,
      transcript_full: "",
      // raw is unused by extractSpeakerTranscript.
      raw: {} as DiarizationResult["raw"],
    },
    matched.speaker_id,
    true,
  );

  if (transcriptUserOnly.trim().length === 0) {
    return json(
      { error: "Selected speaker has no transcribed utterances" },
      400,
    );
  }

  // ── Persist + transition to analyzing ──────────────────────────────────
  const { error: updateErr } = await admin
    .from("conversations")
    .update({
      user_speaker_label: matched.label,
      transcript_user_only: transcriptUserOnly,
      status: "analyzing",
    })
    .eq("id", conversation_id);

  if (updateErr) {
    console.error("[select-user-speaker] Update failed:", updateErr);
    return json({ error: "Failed to save selection" }, 500);
  }

  // ── Fire-and-forget analyze-conversation ───────────────────────────────
  const promise = fetch(`${supabaseUrl}/functions/v1/analyze-conversation`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ conversation_id }),
  }).catch((err) => {
    console.error("[select-user-speaker] analyze-conversation invoke failed:", err);
  });

  // @ts-expect-error EdgeRuntime is available in Supabase Edge runtime.
  if (typeof EdgeRuntime !== "undefined") {
    // @ts-expect-error EdgeRuntime.waitUntil is available in Supabase Edge runtime.
    EdgeRuntime.waitUntil(promise);
  }

  return json(
    {
      status: "analyzing",
      user_speaker_label: matched.label,
      user_utterance_count: matched.utterance_count,
      user_duration_seconds: matched.duration_seconds,
    },
    200,
  );
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}
