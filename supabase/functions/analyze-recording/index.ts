import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.103.3";

// ═══════════════════════════════════════════════════════════════════════════
// DEPLOY MARKER — v2026-04-30-r13-V1-AI-ENRICHED-K7M2X9
// Bumped r12 → r13. v1 mentors are now enriched via Lovable AI Gateway so
// they speak in-character (no more generic "Mentor zwrócił uwagę..."), and
// energy_variance_score / clarity_score are persisted as dedicated columns
// so the metric tiles stop showing zeros.
// ═══════════════════════════════════════════════════════════════════════════
const ANALYZE_RECORDING_VERSION = "v2026-04-30-r13-V1-AI-ENRICHED-K7M2X9";
const ANALYZE_RECORDING_BUILT_AT = new Date().toISOString();
const DEPLOY_SENTINEL_7Q3K9X = "SENTINEL-K7M2X9-V1-AI-ENRICHED";
const RUNTIME_DIAGNOSTICS = {
  version: ANALYZE_RECORDING_VERSION,
  builtAt: ANALYZE_RECORDING_BUILT_AT,
  sentinel: DEPLOY_SENTINEL_7Q3K9X,
  handlerSource: "supabase/functions/analyze-recording/index.ts",
  modules: [
    "mentor-analysis.ts",
    "mentor-analysis-v2.ts",
    "mentor-prompt-builder.ts",
    "mentor-prompt-builder-v2.ts",
    "metrics-with-context.ts",
    "enhanced-analysis.ts",
  ],
};
console.log(
  `[analyze-recording] 🚀 BOOT ${ANALYZE_RECORDING_VERSION} sentinel=${DEPLOY_SENTINEL_7Q3K9X} at ${ANALYZE_RECORDING_BUILT_AT}`,
);

import {
  computeLevelFromXP,
  computePauseMasteryScore,
  computeVocabDepthScore,
} from "./scoring.ts";

import { computeFullStyleMatch } from "./style-matching.ts";
import { callMentorAnalysis } from "./mentor-analysis.ts";
import type { MentorAnalysisResponse } from "./mentor-prompt-builder.ts";
import { isV1PersonaProfile } from "./mentor-prompt-builder.ts";
import { callMentorAnalysisV2 } from "./mentor-analysis-v2.ts";
import type { MentorAnalysisResponseV2 } from "./mentor-prompt-builder-v2.ts";
import { isV2PersonaProfile } from "./mentor-prompt-builder-v2.ts";
import { computeMentorSpecificMetrics } from "./mentor-metrics.ts";
import { buildMetricsWithContext, saveSkillProgress } from "./metrics-with-context.ts";
import { enhanceAnalysisWithMetrics, calculateVerdictLabel } from "./enhanced-analysis.ts";
import { enrichV1WithAI } from "./v1-enrichment.ts";

import type {
  BadgeRow,
  DetectedPause,
  DrillRow,
  ProfileRow,
  RawMetrics,
  RecordingRow,
  StyleMatchResult,
  SpeakerWithCategory,
  WhisperVerboseResponse,
  WhisperWord,
} from "./types.ts";
import { AnalysisError } from "./types.ts";

import { downloadAudioForProcessing } from "../_shared/storage.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const JSON_HEADERS = {
  ...CORS_HEADERS,
  "Content-Type": "application/json",
};

const FILLER_WORDS = [
  "um",
  "uh",
  "like",
  "you know",
  "so",
  "basically",
  "actually",
  "literally",
  "right",
  "i mean",
] as const;

const PAUSE_THRESHOLD_MS = 400;
const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100] as const;

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function handleAnalyzeRequest(request: Request): Promise<Response> {
  console.log(
    `[analyze-recording] ▶ HANDLER ENTER ${request.method} sentinel=${DEPLOY_SENTINEL_7Q3K9X}`,
  );

  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  // GET /version — sanity check whether this build is actually deployed.
  // Returns even without auth so we can curl it from anywhere.
  const requestUrl = new URL(request.url);
  if (request.method === "GET" && requestUrl.pathname.endsWith("/version")) {
    return jsonResponse(
      {
        ...RUNTIME_DIAGNOSTICS,
      },
      200,
    );
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  console.log(
    `[analyze-recording] request received — version=${ANALYZE_RECORDING_VERSION}`,
  );
  const req = request;

  // ── Environment ──────────────────────────────────────────────────────────
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !serviceRoleKey || !openaiKey || !anonKey) {
    console.error("Missing required environment variables");
    return jsonResponse({ error: "Server misconfiguration" }, 500);
  }

  // ── Step 1: Verify auth ───────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Missing Authorization header" }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const userId = user.id;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  // ── Parse body ────────────────────────────────────────────────────────────
  let recordingId: string;
  try {
    const body = await req.json();
    if (!body?.recording_id || typeof body.recording_id !== "string") {
      throw new AnalysisError("recording_id is required", 400);
    }
    recordingId = body.recording_id;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid JSON body";
    const status = err instanceof AnalysisError ? err.statusCode : 400;
    return jsonResponse({ error: msg }, status);
  }

  // ── Step 2: Fetch & verify recording ─────────────────────────────────────
  const { data: recording, error: recErr } = await admin
    .from("recordings")
    .select("*")
    .eq("id", recordingId)
    .single<RecordingRow>();

  if (recErr || !recording) {
    return jsonResponse({ error: "Recording not found" }, 404);
  }

  if (recording.user_id !== userId) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  // Mark as analyzing before any async work
  await admin
    .from("recordings")
    .update({ status: "analyzing", error_message: null })
    .eq("id", recordingId);

  // ── Async pattern: kick off background processing, return 202 immediately.
  // Whisper + GPT + style matching can easily exceed edge-function timeouts
  // when run synchronously. The frontend polls `analyses` / `recordings.status`.
  const bgPromise = processInBackground({
    admin,
    recordingId,
    userId,
    openaiKey,
  });

  // @ts-expect-error EdgeRuntime is available in Supabase Edge runtime.
  if (typeof EdgeRuntime !== "undefined") {
    // @ts-expect-error EdgeRuntime.waitUntil is available in Supabase Edge runtime.
    EdgeRuntime.waitUntil(bgPromise);
  } else {
    // Local/dev fallback — don't await, just swallow errors so handler returns.
    bgPromise.catch((e) => console.error("[analyze-recording] bg error:", e));
  }

  return jsonResponse(
    {
      status: "analyzing",
      recording_id: recordingId,
      runtime_version: ANALYZE_RECORDING_VERSION,
      sentinel: DEPLOY_SENTINEL_7Q3K9X,
    },
    202,
  );
}

Deno.serve(handleAnalyzeRequest);

// ---------------------------------------------------------------------------
// Background pipeline
// ---------------------------------------------------------------------------

interface BgArgs {
  admin: SupabaseClient;
  recordingId: string;
  userId: string;
  openaiKey: string;
}

async function processInBackground({
  admin,
  recordingId,
  userId,
  openaiKey,
}: BgArgs): Promise<void> {
  // Re-fetch the recording inside the bg task so we don't depend on the
  // outer handler's closures living past its response.
  const { data: recording, error: recErr } = await admin
    .from("recordings")
    .select("*")
    .eq("id", recordingId)
    .single<RecordingRow>();

  if (recErr || !recording) {
    console.error(`[analyze-recording bg ${recordingId}] recording vanished`);
    return;
  }

  try {
    // ── Step 3: Download audio ──────────────────────────────────────────────
    let audioBytes: Uint8Array;
    try {
      audioBytes = await downloadAudioForProcessing(recording.audio_url, admin);
    } catch (storageErr) {
      const msg = storageErr instanceof Error ? storageErr.message : String(storageErr);
      throw new AnalysisError(`Audio download failed: ${msg}`);
    }

    // ── Step 4: Transcribe with Whisper ─────────────────────────────────────
    const formData = new FormData();
    const ext = recording.audio_url.split(".").pop() ?? "webm";
    formData.append(
      "file",
      new Blob([audioBytes.buffer.slice(audioBytes.byteOffset, audioBytes.byteOffset + audioBytes.byteLength) as ArrayBuffer]),
      `recording.${ext}`,
    );
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");
    formData.append("timestamp_granularities[]", "segment");
    formData.append("timestamp_granularities[]", "word");

    const whisperRes = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiKey}` },
        body: formData,
      },
    );

    if (!whisperRes.ok) {
      const body = await whisperRes.text();
      throw new AnalysisError(`Whisper API error ${whisperRes.status}: ${body}`);
    }

    const whisperData: WhisperVerboseResponse = await whisperRes.json();
    const transcript = whisperData.text.trim();
    const wordTimestamps: WhisperWord[] = whisperData.words ?? [];
    const durationSeconds =
      whisperData.duration ?? recording.duration_seconds ?? 0;

    // Validate transcript is not empty or too short
    if (!transcript || transcript.length < 10) {
      throw new AnalysisError(
        "Recording too short or silent - please speak for at least 5 seconds",
        400
      );
    }

    // Persist transcript early so it survives any later failure
    await admin
      .from("recordings")
      .update({ transcript, duration_seconds: durationSeconds })
      .eq("id", recordingId);

    // ── Step 5: Compute raw metrics ─────────────────────────────────────────
    const rawMetrics = computeRawMetrics(transcript, wordTimestamps, durationSeconds);

    // ── Step 6: Fetch target speaker (with category join) ───────────────────
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single<ProfileRow>();

    if (profileErr) {
      console.warn(
        `[analyze-recording bg ${recordingId}] profile lookup error:`,
        profileErr.message,
      );
    }

    // Prefer the snapshot taken at recording time (column may not exist on
    // older databases — read it defensively from the recording row).
    const recRecord = recording as unknown as Record<string, unknown>;
    const recordingMentorId =
      typeof recRecord.mentor_speaker_id === "string"
        ? (recRecord.mentor_speaker_id as string)
        : null;

    const profileMentorId = profile?.selected_speaker_id ?? null;

    console.log(
      `[analyze-recording bg ${recordingId}] mentor lookup — recording=${recordingMentorId ?? "∅"} profile=${profileMentorId ?? "∅"}`,
    );

    // v2026-04-25-mentor-fallback — version marker visible in logs so we can
    // verify the live deployment matches the repo version.
    console.log(
      `[analyze-recording bg ${recordingId}] resolver=${ANALYZE_RECORDING_VERSION}`,
    );

    let speaker =
      (await fetchTargetSpeaker(admin, recordingMentorId)) ??
      (await fetchTargetSpeaker(admin, profileMentorId)) ??
      // Final unconditional fallback — pick ANY speaker. fetchTargetSpeaker
      // already does this internally when called with null, but we call it
      // explicitly here so a stale/dangling selection can never block analysis.
      (await fetchTargetSpeaker(admin, null));

    if (!speaker) {
      // Truly nothing usable — only happens when the speakers table is empty
      // or unreadable.
      const { count, error: countErr } = await admin
        .from("speakers")
        .select("id", { count: "exact", head: true });
      if (countErr) {
        throw new AnalysisError(
          `Speaker table unreadable (${countErr.code ?? "?"}): ${countErr.message}`,
        );
      }
      throw new AnalysisError(
        `Mentor unavailable (recording=${recordingMentorId ?? "∅"} profile=${profileMentorId ?? "∅"} speakers_in_db=${count ?? 0}). Seed the speakers table or pick a mentor.`,
      );
    }

    console.log(
      `[analyze-recording bg ${recordingId}] using speaker ${speaker.id} (${speaker.name})`,
    );

    // Finalise pause mastery score now that we have the speaker profile
    rawMetrics.pause_mastery_score = computePauseMasteryScore(
      speaker.pause_frequency,
      rawMetrics.pause_count,
      durationSeconds,
      rawMetrics.avg_pause_duration_ms,
    );

    // ── Step 6a: Compute mentor-specific metrics ─────────────────────────────
    let mentorSpecificMetrics: Record<string, number> | null = null;

    try {
      mentorSpecificMetrics = await computeMentorSpecificMetrics(
        transcript,
        wordTimestamps,
        rawMetrics,
        speaker,
        openaiKey,
      );

      if (mentorSpecificMetrics) {
        console.log(
          `[analyze-recording] Computed ${Object.keys(mentorSpecificMetrics).length} mentor-specific metrics`,
        );
      }
    } catch (err) {
      console.warn(
        "Mentor-specific metrics computation failed (non-fatal):",
        err instanceof Error ? err.message : String(err),
      );
      // Non-fatal: kontynuujemy bez tych metryk
    }

    // ── Step 7: Mentor-specific analysis (v1 lub v2) ───────────────────────
    // Detekcja STRUKTURALNA, nie tylko po polu `version`. Niektóre rekordy
    // mają kształt v2 (LAYER_1_identity) ale brakuje im pola version w DB.
    // Wcześniej taki przypadek leciał gałęzią v1 i wybuchał na
    // `persona.identity.one_sentence_essence` (undefined → TypeError).
    let personaProfile = speaker.persona_profile as Record<string, unknown> | null;
    const personaKeys = personaProfile ? Object.keys(personaProfile) : [];
    console.log(
      `[analyze-recording bg ${recordingId}] persona_profile keys for ${speaker.name}: [${personaKeys.join(", ")}]`,
    );

    let useV2 = isV2PersonaProfile(personaProfile);
    let isV1 = !useV2 && isV1PersonaProfile(personaProfile);
    console.log(
      `[analyze-recording bg ${recordingId}] persona_profile shape=${useV2 ? "v2" : isV1 ? "v1" : "invalid"}`,
    );

    // Jeśli wybrany mentor ma uszkodzony / niekompatybilny persona_profile,
    // spróbuj znaleźć innego, który ma poprawną strukturę. Bez tego
    // analiza zawsze padłaby z `Cannot read properties of undefined`.
    if (!useV2 && !isV1) {
      console.warn(
        `[analyze-recording bg ${recordingId}] speaker ${speaker.name} (${speaker.id}) ma niekompatybilny persona_profile. Szukam zastępcy.`,
      );
      const replacement = await pickCompatibleSpeaker(admin, speaker.id);
      if (replacement) {
        console.log(
          `[analyze-recording bg ${recordingId}] FALLBACK speaker → ${replacement.id} (${replacement.name})`,
        );
        speaker = replacement;
        personaProfile = speaker.persona_profile as Record<string, unknown> | null;
        useV2 = isV2PersonaProfile(personaProfile);
        isV1 = !useV2 && isV1PersonaProfile(personaProfile);
        console.log(
          `[analyze-recording bg ${recordingId}] fallback persona_profile shape=${useV2 ? "v2" : isV1 ? "v1" : "invalid"}`,
        );
      }
    }

    if (!useV2 && !isV1) {
      throw new AnalysisError(
        `MENTOR_PROFILE_INCOMPATIBLE: żaden dostępny mentor nie ma kompatybilnego persona_profile (potrzebne LAYER_1_identity dla v2 lub identity.one_sentence_essence dla v1). Klucze obecnego: [${personaKeys.join(", ")}]. Zrób re-seed mentorów (supabase/seeds/mentors_v2/*.json) lub uzupełnij persona_profile w tabeli speakers.`,
      );
    }

    let mentorAnalysisV1: MentorAnalysisResponse | null = null;
    let mentorAnalysisV2: MentorAnalysisResponseV2 | null = null;

    try {
      if (useV2) {
        console.log(`[analyze-recording] Using v2 analysis for ${speaker.name}`);
        mentorAnalysisV2 = await callMentorAnalysisV2({
          transcript,
          topic: recording.topic ?? "",
          rawMetrics,
          speaker,
          openaiKey,
        });
      } else {
        console.log(`[analyze-recording] Using v1 analysis for ${speaker.name}`);
        mentorAnalysisV1 = await callMentorAnalysis({
          transcript,
          topic: recording.topic ?? "",
          rawMetrics,
          speaker,
          openaiKey,
        });
      }
    } catch (err) {
      console.error(
        "Mentor analysis failed:",
        err instanceof Error ? err.message : String(err),
      );
      throw err; // Mentor analysis jest krytyczna - nie kontynuujemy bez niej
    }

    // ── Step 7.5: Enhance analysis with metrics context (v1 i v2) ──────────
    // r13: dla v1 najpierw wzbogacamy odpowiedź przez Lovable AI Gateway,
    // żeby pola brzmiały w głosie mentora, a nie generycznie. Dopiero potem
    // budujemy syntetyczny v2 i puszczamy przez ten sam pipeline co v2.
    let enhancedData: any = null;
    let enhanceSourceV2: MentorAnalysisResponseV2 | null = mentorAnalysisV2;

    if (!enhanceSourceV2 && mentorAnalysisV1) {
      const v1 = mentorAnalysisV1;
      const lovableKey = Deno.env.get("LOVABLE_API_KEY") ?? "";

      // Próba 1: AI enrichment do "in-character" pól (non-fatal).
      let aiEnriched: Awaited<ReturnType<typeof enrichV1WithAI>> = null;
      if (lovableKey) {
        aiEnriched = await enrichV1WithAI(
          { v1, speaker, transcript },
          lovableKey,
        );
        console.log(
          `[analyze-recording bg ${recordingId}] v1 AI enrichment: ${aiEnriched ? "OK" : "skipped/failed → using mapping fallback"}`,
        );
      }

      const firstDrill = Array.isArray(v1.three_drills_you_would_assign) && v1.three_drills_you_would_assign[0]
        ? v1.three_drills_you_would_assign[0]
        : { drill_name: "Daily reps", why_you_are_assigning_this: "", how_to_do_it: "" };

      const violations = (v1.what_violated_your_style ?? []).filter(
        (s) => typeof s === "string" && s.trim().length > 0,
      );
      const wins = (v1.what_worked_in_your_style ?? []).filter(
        (s) => typeof s === "string" && s.trim().length > 0,
      );

      // Mapping fallback — bez duplikowania tego samego zdania w moment + diagnosis.
      const fallbackProblem = {
        moment: violations[0] ?? v1.in_character_verdict,
        diagnosis:
          violations[1] ??
          (violations[0] && violations[0] !== v1.in_character_verdict
            ? v1.in_character_verdict
            : "Mentor zwrócił uwagę — zobacz pełny werdykt powyżej."),
        what_client_thought: "",
      };

      const fallbackPrescription = {
        instead_of: v1.mentor_alternative_phrasing?.user_said ?? "",
        say_this: v1.mentor_alternative_phrasing?.how_you_would_say_it ?? "",
        why_this_works: wins[0] ?? "",
      };

      const fallbackDrill = {
        drill_name: firstDrill.drill_name,
        why_this_drill: firstDrill.why_you_are_assigning_this,
        how_to_do_it: firstDrill.how_to_do_it,
      };

      enhanceSourceV2 = {
        verdict_score_0_100: v1.overall_score,
        verdict_label: calculateVerdictLabel(v1.overall_score) as MentorAnalysisResponseV2["verdict_label"],
        mentor_quote_responsive_to_session: v1.in_character_verdict,
        what_was_concrete_problem: aiEnriched?.what_was_concrete_problem ?? fallbackProblem,
        concrete_prescription: aiEnriched?.concrete_prescription ?? fallbackPrescription,
        push_to_action: aiEnriched?.push_to_action ?? v1.closing_line_in_your_voice,
        next_drill_recommendation: aiEnriched?.next_drill_recommendation ?? fallbackDrill,
      };
    }

    if (enhanceSourceV2) {
      try {
        enhancedData = await enhanceAnalysisWithMetrics(
          enhanceSourceV2,
          rawMetrics,
          speaker,
          admin,
          userId,
          recordingId,
          transcript
        );
      } catch (enhanceErr) {
        console.error(
          "Enhanced metrics failed (non-fatal):",
          enhanceErr instanceof Error ? enhanceErr.message : String(enhanceErr),
        );
        // Kontynuujemy bez enhanced data - nie jest krytyczne
      }
    }

    // ── Step 8 & 9: Insert analysis row z mentor-specific data ──────────────
    // Mapuj odpowiedź v1 lub v2 na wspólny format dla bazy
    let overallScore: number;
    let feedbackSummary: string;
    let styleMatchScore: number | null;
    let mentorAlternativePhrasing: any;
    let mentorDrills: any;
    let mentorClosingLine: string;
    let mentorViolations: any;
    let mentorWins: any;

    if (useV2 && mentorAnalysisV2) {
      // V2 format
      overallScore = mentorAnalysisV2.verdict_score_0_100;
      feedbackSummary = mentorAnalysisV2.mentor_quote_responsive_to_session;
      styleMatchScore = null; // V2 nie ma style_match_score
      mentorAlternativePhrasing = mentorAnalysisV2.concrete_prescription;
      mentorDrills = [mentorAnalysisV2.next_drill_recommendation];
      mentorClosingLine = mentorAnalysisV2.push_to_action;
      mentorViolations = [mentorAnalysisV2.what_was_concrete_problem];
      mentorWins = null; // V2 nie ma explicit wins
    } else if (mentorAnalysisV1) {
      // V1 format (backward compatibility)
      overallScore = mentorAnalysisV1.overall_score;
      feedbackSummary = mentorAnalysisV1.in_character_verdict;
      styleMatchScore = mentorAnalysisV1.style_match_score;
      mentorAlternativePhrasing = mentorAnalysisV1.mentor_alternative_phrasing;
      mentorDrills = mentorAnalysisV1.three_drills_you_would_assign;
      mentorClosingLine = mentorAnalysisV1.closing_line_in_your_voice;
      mentorViolations = mentorAnalysisV1.what_violated_your_style;
      mentorWins = mentorAnalysisV1.what_worked_in_your_style;
    } else {
      throw new AnalysisError("No mentor analysis result available");
    }

    const mentorAnalysisForLegacyFlows: MentorAnalysisResponse = mentorAnalysisV1 ?? {
      in_character_verdict: feedbackSummary,
      overall_score: overallScore,
      style_match_score: styleMatchScore ?? overallScore,
      what_worked_in_your_style: Array.isArray(mentorWins) ? mentorWins : [],
      what_violated_your_style: Array.isArray(mentorViolations) ? mentorViolations : [],
      mentor_alternative_phrasing: typeof mentorAlternativePhrasing === "object" && mentorAlternativePhrasing !== null
        ? mentorAlternativePhrasing
        : { user_said: "", how_you_would_say_it: String(mentorAlternativePhrasing ?? "") },
      three_drills_you_would_assign: Array.isArray(mentorDrills) ? mentorDrills : [],
      closing_line_in_your_voice: mentorClosingLine,
    };

    const xpAwarded = 10 + Math.floor(overallScore / 2);

  const { data: analysisRow, error: insertErr } = await admin
    .from("analyses")
    .insert({
        recording_id: recordingId,
        compared_to_speaker_id: speaker.id,
        overall_score: overallScore,
        feedback_summary: feedbackSummary,
        style_match_score: styleMatchScore,
        mentor_alternative_phrasing: mentorAlternativePhrasing,
        mentor_drills: mentorDrills,
        mentor_closing_line: mentorClosingLine,
        mentor_violations: mentorViolations,
        mentor_wins: mentorWins,
        mentor_persona_snapshot: speaker.persona_profile,
        mentor_specific_metrics: mentorSpecificMetrics,
        wpm: rawMetrics.wpm,
        filler_words_detected: rawMetrics.filler_counts,
        filler_word_count: rawMetrics.total_filler_count,
        pause_count: rawMetrics.pause_count,
        average_pause_duration_ms: rawMetrics.avg_pause_duration_ms,
        pause_mastery_score: rawMetrics.pause_mastery_score,
        vocabulary_depth_score: rawMetrics.vocab_depth_score,
        // r13: dosypujemy też energy_variance i clarity z metrics_with_context,
        // żeby fallbackowe MetricTile (na ekranie Liczby) nie pokazywały zer.
        energy_variance_score:
          enhancedData?.metrics_with_context?.energy_variance?.value ?? null,
        clarity_score:
          enhancedData?.metrics_with_context?.clarity?.value ?? null,
        xp_awarded: xpAwarded,
        // Nowe pola z Learning Results System
        verdict_label: enhancedData?.verdict_label || calculateVerdictLabel(overallScore),
        mentor_quote_responsive: enhancedData?.mentor_quote_responsive || null,
        what_was_wrong: enhancedData?.what_was_wrong || null,
        how_to_fix: enhancedData?.how_to_fix || null,
        metrics_with_context: enhancedData?.metrics_with_context || null,
        next_step: enhancedData?.next_step || null,
      })
      .select()
      .single();

    if (insertErr || !analysisRow) {
      throw new AnalysisError(`Failed to insert analysis: ${insertErr?.message}`);
    }

    // ── Step 9: Update user profile (XP, level, streak) ───────────────────
    await updateUserProfile(admin, userId, xpAwarded, profile ?? null);

    // ── Step 10: Badge checks ───────────────────────────────────────────────
    await checkAndAwardBadges(
      admin,
      userId,
      analysisRow.id,
      rawMetrics,
      mentorAnalysisForLegacyFlows,
      profile ?? null,
    );

    // ── Step 11: Drill completion ───────────────────────────────────────────
    if (recording.drill_id) {
      await handleDrillCompletion(
        admin,
        userId,
        recording.drill_id,
        overallScore,
      );
    }

    // ── Step 12: Mark recording complete ───────────────────────────────────
    await admin
      .from("recordings")
      .update({ status: "complete" })
      .eq("id", recordingId);

    console.log(
      `[analyze-recording bg ${recordingId}] complete — score=${overallScore}`,
    );
    return;
  } catch (err: unknown) {
    // ── Step 14: Failure handling ───────────────────────────────────────────
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[analyze-recording bg ${recordingId}] failed:`, message);

    await admin
      .from("recordings")
      .update({ status: "failed", error_message: message })
      .eq("id", recordingId);
  }
}

// ---------------------------------------------------------------------------
// Helper: JSON response
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

// ---------------------------------------------------------------------------
// Helper: fetch target speaker (with speaker_categories join)
// Falls back to the speaker with the lowest sort_order if user has no selection.
// ---------------------------------------------------------------------------

async function fetchTargetSpeaker(
  client: SupabaseClient,
  selectedId: string | null | undefined,
): Promise<SpeakerWithCategory | null> {
  const selectExpr = [
    "id",
    "name",
    "specialty",
    "signature_trait",
    "ideal_wpm_min",
    "ideal_wpm_max",
    "ideal_pause_frequency",
    "energy_profile",
    "sort_order",
    "category_id",
    "signature_phrases",
    "persuasion_techniques",
    "style_traits",
    "persona_profile",
  ].join(", ");

  const normalizeSpeaker = async (
    row: Record<string, unknown> | null,
  ): Promise<SpeakerWithCategory | null> => {
    if (!row) return null;

    const categoryId = typeof row.category_id === "string" ? row.category_id : null;
    let speakerCategory = null;

    if (categoryId) {
      const { data: category, error: categoryError } = await client
        .from("speaker_categories")
        .select("id, name, analysis_lens, primary_metrics_this_mentor_cares_about")
        .eq("id", categoryId)
        .maybeSingle();

      if (categoryError) {
        console.warn("[fetchTargetSpeaker] category lookup failed:", categoryError.message);
      } else {
        speakerCategory = category ?? null;
      }
    }

    const pauseFrequency =
      typeof row.pause_frequency === "string"
        ? row.pause_frequency
        : typeof row.ideal_pause_frequency === "string"
          ? row.ideal_pause_frequency
          : "medium";

    return {
      ...(row as unknown as SpeakerWithCategory),
      pause_frequency: (pauseFrequency === "low" || pauseFrequency === "medium" || pauseFrequency === "high")
        ? pauseFrequency
        : "medium",
      speaker_categories: speakerCategory,
    };
  };

  // Validate UUID — legacy values (slugs like "david-goggins") would 22P02
  // and propagate as a hard error. Treat them as "no selection".
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const validSelectedId =
    selectedId && UUID_RE.test(selectedId) ? selectedId : null;

  if (validSelectedId) {
    const { data, error } = await client
      .from("speakers")
      .select(selectExpr)
      .eq("id", validSelectedId)
      .maybeSingle();
    if (!error && data && typeof data === "object") return await normalizeSpeaker(data as Record<string, unknown>);
    console.warn(
      `[fetchTargetSpeaker] selected_speaker_id ${validSelectedId} not found, falling back`,
      error?.message,
    );
  }

  // Fallback #1: lowest sort_order speaker, category fetched separately.
  {
    const { data, error } = await client
      .from("speakers")
      .select(selectExpr)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!error && data && typeof data === "object") return await normalizeSpeaker(data as Record<string, unknown>);
    if (error) {
      console.warn(
        "[fetchTargetSpeaker] ordered fallback failed:",
        error.message,
      );
    }
  }

  // Fallback #2: any speaker without the category join
  const { data, error } = await client
    .from("speakers")
    .select(selectExpr)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[fetchTargetSpeaker] final fallback failed:", error.message);
    return null;
  }
  return data && typeof data === "object"
    ? await normalizeSpeaker(data as Record<string, unknown>)
    : null;
}

// ---------------------------------------------------------------------------
// Pick a speaker whose persona_profile matches v1 OR v2 schema.
// Used as a hard fallback when the user's selected mentor has a corrupted
// or schema-incompatible persona_profile, so the analysis can still run.
// ---------------------------------------------------------------------------

async function pickCompatibleSpeaker(
  client: SupabaseClient,
  excludeSpeakerId: string | null,
): Promise<SpeakerWithCategory | null> {
  const selectExpr = [
    "id",
    "name",
    "persona_profile",
    "sort_order",
  ].join(", ");

  const { data, error } = await client
    .from("speakers")
    .select(selectExpr)
    .order("sort_order", { ascending: true })
    .limit(50);

  if (error || !Array.isArray(data)) {
    console.warn(
      "[pickCompatibleSpeaker] query failed:",
      error?.message ?? "no data",
    );
    return null;
  }

  const isV2Shape = (pp: unknown): boolean => {
    return isV2PersonaProfile(pp);
  };
  const isV1Shape = (pp: unknown): boolean => {
    if (!pp || typeof pp !== "object") return false;
    const identity = (pp as Record<string, unknown>).identity as
      | Record<string, unknown>
      | undefined;
    return typeof identity?.one_sentence_essence === "string";
  };

  const candidates = (data as unknown as Array<Record<string, unknown>>).filter(
    (row) => row.id !== excludeSpeakerId,
  );
  const v2 = candidates.find((row) => isV2Shape(row.persona_profile));
  const v1 = candidates.find((row) => isV1Shape(row.persona_profile));
  const winner = v2 ?? v1 ?? null;
  if (!winner) return null;

  return await fetchTargetSpeaker(client, winner.id as string);
}

// ---------------------------------------------------------------------------
// Compute raw speech metrics from transcript + Whisper word timestamps
// ---------------------------------------------------------------------------


function countFillers(transcript: string): {
  counts: Record<string, number>;
  total: number;
} {
  const lower = transcript.toLowerCase();
  const counts: Record<string, number> = {};

  for (const filler of FILLER_WORDS) {
    let count = 0;
    if (filler.includes(" ")) {
      const pattern = new RegExp(`(?<![a-z])${escapeRegex(filler)}(?![a-z])`, "gi");
      count = (lower.match(pattern) ?? []).length;
    } else {
      const pattern = new RegExp(`\\b${escapeRegex(filler)}\\b`, "gi");
      count = (lower.match(pattern) ?? []).length;
    }
    if (count > 0) counts[filler] = count;
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { counts, total };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function detectPauses(
  words: WhisperWord[],
  thresholdMs: number,
): DetectedPause[] {
  const pauses: DetectedPause[] = [];
  for (let i = 1; i < words.length; i++) {
    const gapMs = (words[i].start - words[i - 1].end) * 1000;
    if (gapMs >= thresholdMs) {
      pauses.push({
        start: words[i - 1].end,
        end: words[i].start,
        duration: Math.round(gapMs),
      });
    }
  }
  return pauses;
}

function computeRawMetrics(
  transcript: string,
  words: WhisperWord[],
  durationSeconds: number,
): RawMetrics {
  const wordCount =
    words.length > 0
      ? words.length
      : transcript.split(/\s+/).filter(Boolean).length;

  const durationMinutes = durationSeconds > 0 ? durationSeconds / 60 : 1;
  const wpm = Math.round(wordCount / durationMinutes);

  const { counts: fillerCounts, total: totalFillerCount } =
    countFillers(transcript);
  const fillerDensity =
    Math.round((totalFillerCount / durationMinutes) * 10) / 10;

  const pauses = detectPauses(words, PAUSE_THRESHOLD_MS);
  const pauseCount = pauses.length;
  const avgPauseDurationMs =
    pauseCount > 0
      ? Math.round(
          pauses.reduce((sum, p) => sum + p.duration, 0) / pauseCount,
        )
      : 0;

  const { score: vocabDepthScore, uniqueWordRatio } =
    computeVocabDepthScore(transcript);

  return {
    wpm,
    duration_seconds: durationSeconds,
    word_count: wordCount,
    filler_counts: fillerCounts,
    total_filler_count: totalFillerCount,
    filler_density: fillerDensity,
    pauses,
    pause_count: pauseCount,
    avg_pause_duration_ms: avgPauseDurationMs,
    pause_mastery_score: 0, // backfilled after speaker fetch
    vocab_depth_score: vocabDepthScore,
    unique_word_ratio: uniqueWordRatio,
  };
}


// ---------------------------------------------------------------------------
// Step 10: Update user profile — XP, level, streak
// ---------------------------------------------------------------------------

async function updateUserProfile(
  client: SupabaseClient,
  userId: string,
  xpAwarded: number,
  profile: ProfileRow | null,
): Promise<void> {
  if (!profile) {
    console.warn(`updateUserProfile: no profile for user ${userId}`);
    return;
  }

  const oldXP = profile.current_xp ?? 0;
  const oldLevel = profile.current_level ?? 1;
  const newXP = oldXP + xpAwarded;
  const newLevel = computeLevelFromXP(newXP);
  const leveledUp = newLevel > oldLevel;

  const todayStr = new Date().toISOString().split("T")[0];
  const lastDateStr = profile.last_session_date ?? null;

  let newStreak = profile.current_streak ?? 0;
  let longestStreak = profile.longest_streak ?? 0;

  const alreadyPlayedToday = lastDateStr === todayStr;

  if (!alreadyPlayedToday) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (lastDateStr === yesterdayStr) {
      newStreak += 1;
    } else {
      newStreak = 1;
    }

    if (newStreak > longestStreak) longestStreak = newStreak;
  }

  // Use atomic increment function to prevent race conditions
  const { error } = await client.rpc('increment_profile_xp', {
    p_user_id: userId,
    p_xp_delta: xpAwarded,
    p_new_level: newLevel,
    p_new_streak: newStreak,
    p_longest_streak: longestStreak,
    p_session_date: todayStr,
  });

  if (error) {
    console.error('Failed to update profile:', error.message);
    throw new Error(`Profile update failed: ${error.message}`);
  }

  if (leveledUp) {
    await client.from("achievements_log").insert({
      user_id: userId,
      event_type: "level_up",
      metadata: { old_level: oldLevel, new_level: newLevel, total_xp: newXP },
    });
  }

  if (!alreadyPlayedToday && (STREAK_MILESTONES as readonly number[]).includes(newStreak)) {
    await client.from("achievements_log").insert({
      user_id: userId,
      event_type: "streak_milestone",
      metadata: { streak_days: newStreak },
    });
  }
}

// ---------------------------------------------------------------------------
// Step 11: Badge evaluation
// ---------------------------------------------------------------------------

async function checkAndAwardBadges(
  client: SupabaseClient,
  userId: string,
  analysisId: string,
  metrics: RawMetrics,
  mentorAnalysis: MentorAnalysisResponse,
  profile: ProfileRow | null,
): Promise<void> {
  const [badgesResult, earnedResult, sessionCountResult] = await Promise.all([
    client.from("badges").select("*"),
    client
      .from("user_badges")
      .select("badge_id")
      .eq("user_id", userId),
    client
      .from("analyses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  const allBadges: BadgeRow[] = badgesResult.data ?? [];
  if (allBadges.length === 0) return;

  const earnedIds = new Set(
    (earnedResult.data ?? []).map((r: { badge_id: string }) => r.badge_id),
  );

  const totalSessions = sessionCountResult.count ?? 0;
  const currentStreak = profile?.current_streak ?? 0;

  const toInsert: Array<{
    user_id: string;
    badge_id: string;
    analysis_id: string;
  }> = [];

  for (const badge of allBadges) {
    if (earnedIds.has(badge.id)) continue;

    const earned = evaluateBadgeCondition(
      badge,
      { totalSessions, currentStreak, metrics, mentorAnalysis },
    );

    if (earned) {
      toInsert.push({ user_id: userId, badge_id: badge.id, analysis_id: analysisId });
    }
  }

  if (toInsert.length === 0) return;

  const { error } = await client.from("user_badges").insert(toInsert);
  if (error) {
    console.error("Failed to insert user_badges:", error.message);
    return;
  }

  const logEntries = toInsert.map(({ badge_id }) => {
    const badge = allBadges.find((b) => b.id === badge_id);
    return {
      user_id: userId,
      event_type: "badge_earned",
      metadata: { badge_id, badge_name: badge?.name ?? badge_id },
    };
  });

  await client.from("achievements_log").insert(logEntries);
}

interface BadgeContext {
  totalSessions: number;
  currentStreak: number;
  metrics: RawMetrics;
  mentorAnalysis: MentorAnalysisResponse;
}

function evaluateBadgeCondition(
  badge: BadgeRow,
  ctx: BadgeContext,
): boolean {
  switch (badge.condition_type) {
    case "first_recording":
      return ctx.totalSessions >= 1;

    case "score_gte":
      return ctx.mentorAnalysis.overall_score >= badge.condition_value;

    case "sessions_gte":
      return ctx.totalSessions >= badge.condition_value;

    case "streak_gte":
      return ctx.currentStreak >= badge.condition_value;

    case "no_fillers":
      return ctx.metrics.total_filler_count === 0;

    case "filler_density_lte":
      return ctx.metrics.filler_density <= badge.condition_value;

    case "pause_mastery_gte":
      return ctx.metrics.pause_mastery_score >= badge.condition_value;

    case "vocab_depth_gte":
      return ctx.metrics.vocab_depth_score >= badge.condition_value;

    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Step 12: Drill completion
// ---------------------------------------------------------------------------

async function handleDrillCompletion(
  client: SupabaseClient,
  userId: string,
  drillId: string,
  score: number,
): Promise<void> {
  const { error: completionErr } = await client
    .from("user_drill_completions")
    .insert({
      user_id: userId,
      drill_id: drillId,
      score,
      completed_at: new Date().toISOString(),
    });

  if (completionErr) {
    console.error("user_drill_completions insert failed:", completionErr.message);
    return;
  }

  const { data: drill } = await client
    .from("drills")
    .select("id, xp")
    .eq("id", drillId)
    .single<DrillRow>();

  const bonusXP = drill?.xp ?? 0;
  if (bonusXP <= 0) return;

  const { data: freshProfile } = await client
    .from("profiles")
    .select("current_xp, current_level")
    .eq("user_id", userId)
    .single<Pick<ProfileRow, "current_xp" | "current_level">>();

  if (!freshProfile) return;

  const newXP = (freshProfile.current_xp ?? 0) + bonusXP;
  const newLevel = computeLevelFromXP(newXP);

  await client
    .from("profiles")
    .update({ current_xp: newXP, current_level: newLevel })
    .eq("user_id", userId);

  await client.from("achievements_log").insert({
    user_id: userId,
    event_type: "drill_completed",
    metadata: { drill_id: drillId, score, xp_awarded: bonusXP },
  });
}
