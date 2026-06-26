/**
 * analyze-conversation
 *
 * HTTP POST { conversation_id: string }
 *
 * Internal — invoked by process-conversation (single-speaker shortcut)
 * and by select-user-speaker. Authenticated with service_role.
 *
 * Runs the type-specific GPT-4o analysis on transcript_user_only with
 * the full transcript as context. Persists conversation_analyses row,
 * awards XP, updates personal_records and goal progress.
 *
 * Status: analyzing → complete (or failed).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

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

const OPENAI_MODEL = "gpt-4o";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_TIMEOUT_MS = 120_000;

type ConversationType =
  | "sales_call"
  | "meeting"
  | "interviewee"
  | "interviewer"
  | "negotiation"
  | "coaching";

// ---------------------------------------------------------------------------
// Per-type metric schemas — also used to build the JSON example shown to GPT
// ---------------------------------------------------------------------------

const TYPE_METRICS: Record<ConversationType, string[]> = {
  sales_call: [
    "urgency_triggers",
    "value_frames",
    "objections_faced",
    "objection_recovery_score",
    "close_attempts",
    "value_anchors",
    "questions_asked",
    "discovery_depth_score",
  ],
  meeting: [
    "contribution_clarity_score",
    "interruption_count",
    "interrupted_by_others",
    "action_items_proposed",
    "listening_signals_score",
    "contribution_count",
  ],
  interviewee: [
    "answer_length_avg_seconds",
    "filler_density_per_minute",
    "star_method_score",
    "confidence_markers",
    "dodge_count",
    "specific_examples_given",
  ],
  interviewer: [
    "question_quality_score",
    "follow_up_depth",
    "listening_signals_score",
    "silence_tolerance_score",
    "open_ended_ratio",
  ],
  negotiation: [
    "anchoring_strength",
    "framing_score",
    "concession_ratio",
    "patience_markers",
    "tactical_empathy_score",
    "mirroring_count",
  ],
  coaching: [
    "question_to_statement_ratio",
    "guidance_clarity_score",
    "socratic_depth_score",
    "affirmation_count",
  ],
};

const TYPE_LABEL: Record<ConversationType, string> = {
  sales_call: "sales call",
  meeting: "team meeting",
  interviewee: "job interview (you are the candidate being interviewed)",
  interviewer: "job interview (you are the interviewer)",
  negotiation: "negotiation",
  coaching: "coaching session",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConversationRow {
  id: string;
  user_id: string;
  conversation_type: ConversationType;
  status: string;
  user_speaker_label: string | null;
  transcript_full: string | null;
  transcript_user_only: string | null;
  duration_seconds: number | null;
  context_stakes: string | null;
  context_goal: string | null;
  context_other_party: string | null;
}

interface TimelineEvent {
  timestamp_seconds: number;
  type:
    | "objection_raised"
    | "close_attempt"
    | "interruption"
    | "key_question"
    | "value_anchor"
    | "weak_moment"
    | "strong_moment";
  snippet: string;
}

interface MomentOfTruth {
  timestamp_seconds: number;
  quote: string;
  ai_coaching_note: string;
  pro_alternative: string;
}

interface AnalysisResult {
  overall_score: number;
  talk_time_ratio: number;
  type_specific_metrics: Record<string, number>;
  timeline_events: TimelineEvent[];
  moments_of_truth: MomentOfTruth[];
  improvement_tips: string[];
  feedback_summary: string;
  scorecard: {
    user: Record<string, number>;
    top_performers_benchmark: Record<string, number>;
    average_benchmark: Record<string, number>;
  };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!supabaseUrl || !serviceRoleKey || !openaiKey) {
    return json({ error: "Server misconfigured" }, 500);
  }

  // This function is called internally with the service_role key as bearer.
  // We don't need to validate a user JWT, but we DO require the bearer to
  // match service_role to prevent direct invocation by anonymous clients.
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.includes(serviceRoleKey)) {
    return json({ error: "Forbidden" }, 403);
  }

  let body: { conversation_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body must be valid JSON" }, 400);
  }
  const conversationId = body.conversation_id;
  if (!conversationId || typeof conversationId !== "string") {
    return json({ error: "conversation_id (string) is required" }, 400);
  }

  const admin: SupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Load conversation ──────────────────────────────────────────────────
  const { data: convo, error: loadErr } = await admin
    .from("conversations")
    .select(
      "id, user_id, conversation_type, status, user_speaker_label, transcript_full, transcript_user_only, duration_seconds, context_stakes, context_goal, context_other_party",
    )
    .eq("id", conversationId)
    .maybeSingle<ConversationRow>();

  if (loadErr) {
    console.error("[analyze-conversation] DB read failed:", loadErr);
    return json({ error: "Failed to load conversation" }, 500);
  }
  if (!convo) return json({ error: "Conversation not found" }, 404);

  if (!convo.transcript_user_only || convo.transcript_user_only.trim().length === 0) {
    await markFailed(admin, conversationId, "No user transcript to analyze.");
    return json({ error: "transcript_user_only is empty" }, 400);
  }
  if (!isValidType(convo.conversation_type)) {
    await markFailed(
      admin,
      conversationId,
      `Unknown conversation_type "${convo.conversation_type}".`,
    );
    return json({ error: "Invalid conversation_type" }, 400);
  }

  // ── Run GPT-4o ─────────────────────────────────────────────────────────
  let analysis: AnalysisResult;
  try {
    analysis = await runAnalysis(convo, openaiKey);
  } catch (err) {
    console.error("[analyze-conversation] Analysis failed:", err);
    const msg = err instanceof Error ? err.message : "Analysis failed";
    await markFailed(admin, conversationId, msg);
    return json({ error: msg }, 502);
  }

  // ── Validate output ────────────────────────────────────────────────────
  if (!Number.isFinite(analysis.overall_score)) {
    await markFailed(admin, conversationId, "Analysis returned no overall_score.");
    return json({ error: "Invalid analysis result" }, 502);
  }
  analysis.overall_score = clamp(Math.round(analysis.overall_score), 0, 100);

  // ── Persist conversation_analyses ──────────────────────────────────────
  const xpAwarded = 20 + Math.floor(analysis.overall_score / 2);

  const { error: insertErr } = await admin.from("conversation_analyses").insert({
    conversation_id: conversationId,
    user_id: convo.user_id,
    conversation_type: convo.conversation_type,
    overall_score: analysis.overall_score,
    talk_time_ratio: analysis.talk_time_ratio,
    type_specific_metrics: analysis.type_specific_metrics,
    timeline_events: analysis.timeline_events,
    moments_of_truth: analysis.moments_of_truth,
    improvement_tips: analysis.improvement_tips,
    feedback_summary: analysis.feedback_summary,
    scorecard: analysis.scorecard,
    xp_awarded: xpAwarded,
  });

  if (insertErr) {
    console.error("[analyze-conversation] Insert failed:", insertErr);
    await markFailed(admin, conversationId, "Failed to save analysis.");
    return json({ error: "Failed to save analysis" }, 500);
  }

  // ── Award XP + update gamification (best-effort) ───────────────────────
  await applyGamification(admin, convo, analysis.overall_score, xpAwarded).catch(
    (err) => console.error("[analyze-conversation] Gamification failed:", err),
  );

  // ── Mark complete ──────────────────────────────────────────────────────
  await admin
    .from("conversations")
    .update({ status: "complete", error_message: null })
    .eq("id", conversationId);

  return json(
    {
      status: "complete",
      overall_score: analysis.overall_score,
      xp_awarded: xpAwarded,
    },
    200,
  );
});

// ---------------------------------------------------------------------------
// GPT call
// ---------------------------------------------------------------------------

async function runAnalysis(
  convo: ConversationRow,
  openaiKey: string,
): Promise<AnalysisResult> {
  const type = convo.conversation_type;
  const metrics = TYPE_METRICS[type];

  const exampleMetrics = metrics.reduce<Record<string, number>>((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});

  const systemPrompt = `You are an elite conversation performance coach. You are analyzing a ${TYPE_LABEL[type]}. The user (identified as ${convo.user_speaker_label ?? "the primary speaker"}) was: ${convo.context_stakes ?? "engaged in this conversation"}. Their goal: ${convo.context_goal ?? "perform well"}.${convo.context_other_party ? ` The other party: ${convo.context_other_party}.` : ""}

Analyze ONLY the user's contributions. The other party's speech is provided only for context.

Produce JSON with the following EXACT structure:

${JSON.stringify(
  {
    overall_score: 0,
    talk_time_ratio: 0,
    type_specific_metrics: exampleMetrics,
    timeline_events: [
      {
        timestamp_seconds: 0,
        type: "objection_raised|close_attempt|interruption|key_question|value_anchor|weak_moment|strong_moment",
        snippet: "...",
      },
    ],
    moments_of_truth: [
      {
        timestamp_seconds: 0,
        quote: "user's exact line",
        ai_coaching_note: "why this moment matters and what happened",
        pro_alternative: "how a top performer would have handled this",
      },
    ],
    improvement_tips: ["tip 1", "tip 2", "tip 3"],
    feedback_summary: "2-3 sentence coach verdict",
    scorecard: {
      user: exampleMetrics,
      top_performers_benchmark: exampleMetrics,
      average_benchmark: exampleMetrics,
    },
  },
  null,
  2,
)}

Rules:
- overall_score: integer 0-100.
- talk_time_ratio: float 0-1 (user's share of total speaking time).
- type_specific_metrics: include every key shown above. Use integers for counts, 0-100 for scores, floats for ratios/durations.
- timeline_events: 3-10 events, ordered by timestamp_seconds ascending. Use only the listed type values.
- moments_of_truth: EXACTLY 2 or 3 entries, the most pivotal moments.
- improvement_tips: EXACTLY 3 specific actionable tips.
- scorecard: same keys for user, top_performers_benchmark, average_benchmark.
- Reference real moments. Cite real quotes. No platitudes.
- Return ONLY valid JSON. No markdown fences. No commentary.`;

  const userPrompt = `## USER TRANSCRIPT (analyze this)

${convo.transcript_user_only}

## FULL CONVERSATION (context only, do not score the other party)

${convo.transcript_full ?? "(not available)"}

## DURATION

${convo.duration_seconds ?? "unknown"} seconds`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`OpenAI request timed out after ${OPENAI_TIMEOUT_MS}ms`);
    }
    throw err;
  }
  clearTimeout(timer);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI returned ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("OpenAI returned no content");
  }

  let parsed: AnalysisResult;
  try {
    parsed = JSON.parse(content) as AnalysisResult;
  } catch (err) {
    throw new Error(
      `Failed to parse OpenAI JSON: ${err instanceof Error ? err.message : err}`,
    );
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// Gamification side effects
// ---------------------------------------------------------------------------

async function applyGamification(
  admin: SupabaseClient,
  convo: ConversationRow,
  overallScore: number,
  xpAwarded: number,
): Promise<void> {
  // 1. Add XP to profile.
  const { data: profile } = await admin
    .from("profiles")
    .select("xp")
    .eq("id", convo.user_id)
    .maybeSingle<{ xp: number }>();

  if (profile) {
    await admin
      .from("profiles")
      .update({ xp: (profile.xp ?? 0) + xpAwarded })
      .eq("id", convo.user_id);
  }

  // 2. Update best-conversation-score personal record if beaten.
  const { data: existingRecord } = await admin
    .from("personal_records")
    .select("id, value")
    .eq("user_id", convo.user_id)
    .eq("type", "convo_score")
    .maybeSingle<{ id: string; value: number }>();

  if (!existingRecord || overallScore > (existingRecord.value ?? 0)) {
    if (existingRecord) {
      await admin
        .from("personal_records")
        .update({
          value: overallScore,
          recording_id: convo.id,
          achieved_at: new Date().toISOString(),
        })
        .eq("id", existingRecord.id);
    } else {
      await admin.from("personal_records").insert({
        user_id: convo.user_id,
        type: "convo_score",
        label: "Best Conversation Score",
        value: overallScore,
        recording_id: convo.id,
        context: convo.conversation_type,
        achieved_at: new Date().toISOString(),
      });
    }
  }

  // 3. Nudge any active goals tied to conversation scores.
  await admin
    .from("goals")
    .update({ current_value: overallScore })
    .eq("user_id", convo.user_id)
    .eq("target_metric", `convo_score_${convo.conversation_type}`)
    .lt("current_value", overallScore);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isValidType(t: string): t is ConversationType {
  return t in TYPE_METRICS;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}
