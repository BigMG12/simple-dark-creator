/**
 * Wywołuje GPT-4o z promptem specyficznym dla mentora (v2).
 * Zwraca pełną analizę w głosie i stylu wybranego mentora używając 12-warstwowego DNA.
 */

import type { MentorAnalysisResponseV2 } from "./mentor-prompt-builder-v2.ts";
import { buildMentorAnalysisPrompt, describeV2PersonaProfile, isV2PersonaProfile } from "./mentor-prompt-builder-v2.ts";
import type { RawMetrics, SpeakerWithCategory } from "./types.ts";
import { AnalysisError } from "./types.ts";

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

  // Wywołaj GPT-4o (nie mini - potrzebujemy jakości dla 12-warstwowego DNA)
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "Jesteś ekspertem w analizie mowy i coachingu publicznego. Zwracasz TYLKO czysty JSON bez żadnych komentarzy, markdown, ani innych oznaczeń. Feedback jest BRUTALNY, KONKRETNY, bazowany na RZECZYWISTYCH METRYKACH.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8, // Wyższa temperatura dla "brutalnego" stylu mentora
      max_tokens: 2000,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new AnalysisError(
      `Mentor analysis V2 API error ${response.status}: ${errorBody}`
    );
  }

  const data = await response.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new AnalysisError("Empty response from mentor analysis V2 GPT");
  }

  let parsed: MentorAnalysisResponseV2;
  try {
    parsed = JSON.parse(content) as MentorAnalysisResponseV2;
  } catch {
    throw new AnalysisError(
      `Mentor analysis V2 returned non-JSON: ${content.slice(0, 200)}`
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
