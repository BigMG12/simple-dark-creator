/**
 * Wywoluje flagowy model GPT-5.6-sol przez Lovable AI Gateway
 * z promptem specyficznym dla mentora (v1).
 * Zwraca pelna analize w glosie i stylu wybranego mentora.
 */

import type { MentorAnalysisResponse } from "./mentor-prompt-builder.ts";
import { buildMentorAnalysisPrompt } from "./mentor-prompt-builder.ts";
import type { RawMetrics, SpeakerWithCategory } from "./types.ts";
import { AnalysisError } from "./types.ts";
import { callGatewayJson } from "../_shared/gateway-chat.ts";


interface CallMentorAnalysisParams {
  transcript: string;
  topic: string;
  rawMetrics: RawMetrics;
  speaker: SpeakerWithCategory;
  openaiKey: string;
}

/**
 * Wywołuje analizę mentor-specific używając GPT-4o z temperature 0.7
 * (wyższa niż default, żeby wypowiedź mentora była stylistycznie "żywa")
 */
export async function callMentorAnalysis({
  transcript,
  topic,
  rawMetrics,
  speaker,
  openaiKey,
}: CallMentorAnalysisParams): Promise<MentorAnalysisResponse> {
  // Sprawdź czy speaker ma persona_profile
  if (!speaker.persona_profile) {
    throw new AnalysisError(
      `Speaker ${speaker.name} nie ma persona_profile - nie można wykonać mentor-specific analysis`
    );
  }

  // Schema-check kształtu v1: builder wymaga `identity.one_sentence_essence`.
  // Bez tego pola template string rzucał `Cannot read properties of undefined`.
  // Lepiej zgłosić zrozumiały błąd z listą brakujących ścieżek.
  const persona = speaker.persona_profile as Record<string, unknown>;
  const requiredPaths: Array<[string, (p: Record<string, unknown>) => unknown]> = [
    ["identity", (p) => p.identity],
    ["identity.one_sentence_essence", (p) => (p.identity as Record<string, unknown> | undefined)?.one_sentence_essence],
  ];
  const missing = requiredPaths
    .filter(([, get]) => {
      const v = get(persona);
      return v === undefined || v === null || (typeof v === "string" && v.length === 0);
    })
    .map(([path]) => path);

  if (missing.length > 0) {
    const presentKeys = Object.keys(persona);
    throw new AnalysisError(
      `MENTOR_PROFILE_INCOMPATIBLE: speaker ${speaker.name} (${speaker.id}) persona_profile nie pasuje do formatu v1 — brakuje: ${missing.join(", ")}. Obecne klucze najwyższego poziomu: [${presentKeys.join(", ")}]. Jeśli to mentor v2, dodaj pole "version": "v2_brutal_polish" lub upewnij się, że ma "LAYER_1_identity" — wtedy router przełączy się na v2.`
    );
  }

  // Buduj prompt w głosie mentora
  const prompt = buildMentorAnalysisPrompt({
    mentor: {
      id: speaker.id,
      name: speaker.name,
      persona_profile: speaker.persona_profile as never,
    },
    transcript,
    topic,
    userMetrics: {
      wpm: rawMetrics.wpm,
      total_filler_count: rawMetrics.total_filler_count,
      filler_density: rawMetrics.filler_density,
      pause_count: rawMetrics.pause_count,
      avg_pause_duration_ms: rawMetrics.avg_pause_duration_ms,
      vocab_depth_score: rawMetrics.vocab_depth_score,
      duration_seconds: rawMetrics.duration_seconds,
    },
  });

  // Wywolaj GPT-5.6-sol (flagowy) przez Lovable AI Gateway
  let parsed: MentorAnalysisResponse;
  try {
    parsed = await callGatewayJson<MentorAnalysisResponse>({
      model: "openai/gpt-5.6-sol",
      systemPrompt:
        "Jestes ekspertem w analizie mowy i coachingu publicznego. Zwracasz TYLKO czysty JSON bez zadnych komentarzy, markdown, ani innych oznaczen.",
      userPrompt: prompt,
      timeoutMs: 150_000,
    });
  } catch (err) {
    throw new AnalysisError(
      `Mentor analysis (GPT-5.6-sol) failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }


  // Walidacja struktury odpowiedzi
  if (
    typeof parsed.in_character_verdict !== "string" ||
    typeof parsed.overall_score !== "number" ||
    typeof parsed.style_match_score !== "number" ||
    !Array.isArray(parsed.what_worked_in_your_style) ||
    !Array.isArray(parsed.what_violated_your_style) ||
    !Array.isArray(parsed.three_drills_you_would_assign) ||
    typeof parsed.closing_line_in_your_voice !== "string"
  ) {
    throw new AnalysisError(
      "Mentor analysis response failed schema validation"
    );
  }

  // Normalizuj score'y do zakresu 0-100
  parsed.overall_score = Math.max(
    0,
    Math.min(100, Math.round(parsed.overall_score))
  );
  parsed.style_match_score = Math.max(
    0,
    Math.min(100, Math.round(parsed.style_match_score))
  );

  return parsed;
}
