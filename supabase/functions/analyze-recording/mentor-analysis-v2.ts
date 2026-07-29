/**
 * Wywoluje flagowy model GPT-5.6-sol przez Lovable AI Gateway (v2).
 * Zwraca pelna analize w glosie i stylu wybranego mentora uzywajac 12-warstwowego DNA.
 */

import type { MentorAnalysisResponseV2 } from "./mentor-prompt-builder-v2.ts";
import { buildMentorAnalysisPrompt, describeV2PersonaProfile, isV2PersonaProfile } from "./mentor-prompt-builder-v2.ts";
import type { RawMetrics, SpeakerWithCategory } from "./types.ts";
import { AnalysisError } from "./types.ts";
import { callGatewayJson } from "../_shared/gateway-chat.ts";


interface CallMentorAnalysisV2Params {
  transcript: string;
  topic: string;
  rawMetrics: RawMetrics;
  speaker: SpeakerWithCategory;
  openaiKey: string;
}

/**
 * Wywołuje analizę mentor-specific używając GPT-4o z temperature 0.8
 * (wyższa niż default, żeby wypowiedź mentora była stylistycznie "żywa" i brutalna)
 */
export async function callMentorAnalysisV2({
  transcript,
  topic,
  rawMetrics,
  speaker,
  openaiKey,
}: CallMentorAnalysisV2Params): Promise<MentorAnalysisResponseV2> {
  // Sprawdź czy speaker ma persona_profile v2
  if (!speaker.persona_profile) {
    throw new AnalysisError(
      `Speaker ${speaker.name} nie ma persona_profile - nie można wykonać mentor-specific analysis`
    );
  }

  // Sprawdź strukturę profilu. Część rekordów w DB ma pełny kształt v2,
  // ale brakuje im pola `version`; normalizujemy je tylko runtime-only.
  const profile = speaker.persona_profile as Record<string, unknown>;
  if (!isV2PersonaProfile(profile)) {
    throw new AnalysisError(
      `MENTOR_PROFILE_INCOMPATIBLE: speaker ${speaker.name} (${speaker.id}) nie ma kompletnego profilu v2 — ${describeV2PersonaProfile(profile)}`
    );
  }
  const normalizedProfile = { ...profile, version: 'v2_brutal_polish' } as never;

  // Buduj prompt w głosie mentora używając 12-warstwowego DNA
  const prompt = buildMentorAnalysisPrompt({
    mentor: {
      id: speaker.id,
      name: speaker.name,
      persona_profile: normalizedProfile,
      persona_version: 2,
    },
    transcript,
    topic,
    userMetrics: {
      pace_wpm: rawMetrics.wpm,
      fillers_count: rawMetrics.total_filler_count,
      filler_list: extractFillerList(transcript, rawMetrics.total_filler_count),
      energy_variance: calculateEnergyVariance(transcript),
      pause_count: rawMetrics.pause_count,
      clarity_score: rawMetrics.vocab_depth_score,
      vocabulary_unique_words: calculateUniqueWords(transcript),
      duration_seconds: rawMetrics.duration_seconds,
    },
    userCategory: speaker.speaker_categories?.name || 'general',
  });

  // Wywolaj GPT-5.6-sol (flagowy reasoning model) przez Lovable AI Gateway
  let parsed: MentorAnalysisResponseV2;
  try {
    parsed = await callGatewayJson<MentorAnalysisResponseV2>({
      model: "openai/gpt-5.6-sol",
      systemPrompt:
        "Jestes ekspertem w analizie mowy i coachingu publicznego. Zwracasz TYLKO czysty JSON bez zadnych komentarzy, markdown, ani innych oznaczen. Feedback jest BRUTALNY, KONKRETNY, bazowany na RZECZYWISTYCH METRYKACH.",
      userPrompt: prompt,
      timeoutMs: 180_000,
    });
  } catch (err) {
    throw new AnalysisError(
      `Mentor analysis V2 (GPT-5.6-sol) failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }


  // Walidacja struktury odpowiedzi V2
  if (
    typeof parsed.verdict_score_0_100 !== "number" ||
    typeof parsed.verdict_label !== "string" ||
    typeof parsed.mentor_quote_responsive_to_session !== "string" ||
    typeof parsed.what_was_concrete_problem !== "object" ||
    typeof parsed.concrete_prescription !== "object" ||
    typeof parsed.push_to_action !== "string" ||
    typeof parsed.next_drill_recommendation !== "object"
  ) {
    throw new AnalysisError(
      "Mentor analysis V2 response failed schema validation"
    );
  }

  // Normalizuj score do zakresu 0-100
  parsed.verdict_score_0_100 = Math.max(
    0,
    Math.min(100, Math.round(parsed.verdict_score_0_100))
  );

  return parsed;
}

/**
 * Ekstraktuje listę filler words z transkryptu
 */
function extractFillerList(transcript: string, count: number): string[] {
  const commonFillers = [
    'um', 'uh', 'like', 'you know', 'basically', 'literally',
    'sort of', 'kind of', 'actually', 'so', 'well',
    'eee', 'yyy', 'no', 'tak', 'wiesz', 'jakby', 'typu', 'kurde'
  ];

  const found: string[] = [];
  const lowerTranscript = transcript.toLowerCase();

  for (const filler of commonFillers) {
    if (lowerTranscript.includes(filler)) {
      found.push(filler);
    }
  }

  return found.slice(0, Math.min(10, count));
}

/**
 * Oblicza wariancję energii (uproszczona heurystyka)
 */
function calculateEnergyVariance(transcript: string): number {
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length < 2) return 0;

  const lengths = sentences.map(s => s.trim().length);
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avg, 2), 0) / lengths.length;

  return Math.min(100, Math.round(Math.sqrt(variance)));
}

/**
 * Oblicza liczbę unikalnych słów
 */
function calculateUniqueWords(transcript: string): number {
  const words = transcript
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2);

  return new Set(words).size;
}
