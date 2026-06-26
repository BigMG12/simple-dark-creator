import type { SupabaseClient } from "npm:@supabase/supabase-js@2.103.3";
import type {
  RawMetrics,
  SpeakerWithCategory,
  StyleMatchBreakdown,
  StyleMatchResult,
} from "./types.ts";
import { AnalysisError } from "./types.ts";

// ---------------------------------------------------------------------------
// OpenAI embedding generation
// Uses text-embedding-3-small (1536 dimensions, fast, cost-effective).
// ---------------------------------------------------------------------------

export async function computeEmbedding(
  text: string,
  openaiKey: string,
): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      // Guard against exceeding token limit (~8k tokens); 8192 chars ≈ safe
      input: text.slice(0, 8192),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new AnalysisError(`Embedding API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const embedding = data?.data?.[0]?.embedding;
  if (!Array.isArray(embedding)) {
    throw new AnalysisError("Unexpected embedding response shape");
  }
  return embedding as number[];
}

// ---------------------------------------------------------------------------
// Vector style match via match_speech_embeddings RPC
//
// Queries a random sample of 20 mentor chunks, computes cosine similarity
// for each via pgvector, then averages the top-10 highest-similarity chunks.
// Returns null when the mentor has no embeddings (newly added speaker, etc.).
// ---------------------------------------------------------------------------

interface EmbeddingChunk {
  id: string;
  chunk_text: string;
  similarity: number;
}

export async function computeVectorStyleMatch(
  supabase: SupabaseClient,
  speakerId: string,
  userEmbedding: number[],
): Promise<number | null> {
  const { data, error } = await supabase.rpc("match_speech_embeddings", {
    p_speaker_id: speakerId,
    p_embedding: userEmbedding,
    p_match_count: 20,
  });

  if (error) {
    console.warn("match_speech_embeddings RPC error:", error.message);
    return null;
  }

  const chunks = (data ?? []) as EmbeddingChunk[];
  if (chunks.length === 0) return null;

  // Sort by similarity descending, take top 10, average
  const top10 = [...chunks]
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 10);

  const avgSim = top10.reduce((sum, c) => sum + c.similarity, 0) / top10.length;

  // Cosine similarity for text embeddings is typically 0–1.
  // Scale to 0–100, clamped.
  return Math.max(0, Math.min(100, Math.round(avgSim * 100)));
}

// ---------------------------------------------------------------------------
// Vocabulary match
//
// Measures what fraction of the mentor's signature_phrases appear in the
// user's transcript. Exact substring match scores 1; a partial match (all
// key words present) scores 0.5. Result: 0–100.
// ---------------------------------------------------------------------------

export function computeVocabularyMatch(
  transcript: string,
  signaturePhrases: string[],
): number {
  if (signaturePhrases.length === 0) return 0;

  const lower = transcript.toLowerCase();
  let matchScore = 0;

  for (const phrase of signaturePhrases) {
    const phraseLower = phrase.toLowerCase();
    if (lower.includes(phraseLower)) {
      matchScore += 1;
      continue;
    }
    // Partial: all content words (>3 chars) from the phrase appear in transcript
    const keyWords = phraseLower.split(/\s+/).filter((w) => w.length > 3);
    if (keyWords.length > 0 && keyWords.every((w) => lower.includes(w))) {
      matchScore += 0.5;
    }
  }

  return Math.min(100, Math.round((matchScore / signaturePhrases.length) * 100));
}

// ---------------------------------------------------------------------------
// Energy match
//
// Compares user WPM to mentor's ideal WPM range and user pause frequency to
// mentor's preferred pause style. Weighted 60/40 WPM/pause.
// ---------------------------------------------------------------------------

const PAUSE_FREQ_TARGETS: Record<string, { min: number; max: number }> = {
  high:   { min: 3,   max: 6   },
  medium: { min: 1.5, max: 3.5 },
  low:    { min: 0.5, max: 2   },
};

export function computeEnergyMatch(
  wpm: number,
  pauseCount: number,
  durationSeconds: number,
  speaker: SpeakerWithCategory,
): number {
  // WPM sub-score
  const wpmMid = (speaker.ideal_wpm_min + speaker.ideal_wpm_max) / 2;
  const wpmTolerance = (speaker.ideal_wpm_max - speaker.ideal_wpm_min) * 1.5;
  const wpmInRange = wpm >= speaker.ideal_wpm_min && wpm <= speaker.ideal_wpm_max;
  const wpmScore = wpmInRange
    ? 1.0
    : Math.max(0, 1 - Math.abs(wpm - wpmMid) / Math.max(wpmTolerance, 1));

  // Pause frequency sub-score
  const pauseTarget = PAUSE_FREQ_TARGETS[speaker.pause_frequency] ?? PAUSE_FREQ_TARGETS.medium;
  const durationMinutes = Math.max(durationSeconds / 60, 0.1);
  const pausesPerMin = pauseCount / durationMinutes;
  const pauseMid = (pauseTarget.min + pauseTarget.max) / 2;
  const pauseTolerance = (pauseTarget.max - pauseTarget.min) * 1.5;
  const pauseInRange = pausesPerMin >= pauseTarget.min && pausesPerMin <= pauseTarget.max;
  const pauseScore = pauseInRange
    ? 1.0
    : Math.max(0, 1 - Math.abs(pausesPerMin - pauseMid) / Math.max(pauseTolerance, 0.1));

  return Math.round((wpmScore * 0.6 + pauseScore * 0.4) * 100);
}

// ---------------------------------------------------------------------------
// Structure match (GPT-4o-mini evaluation)
//
// Lightweight GPT call that evaluates three structural dimensions:
// sentence-length variance, opening impact, closing strength.
// Falls back to a neutral score of 50 on any failure (non-fatal).
// ---------------------------------------------------------------------------

export async function computeStructureMatch(
  transcript: string,
  speaker: SpeakerWithCategory,
  openaiKey: string,
): Promise<number> {
  const styleContext = speaker.style_traits?.length
    ? `Style traits: ${JSON.stringify(speaker.style_traits)}`
    : `Specialty: ${speaker.specialty}. Signature: ${speaker.signature_trait}`;

  const prompt = `You are a speech structure analyst. Score the structural similarity between the user's transcript and the target speaker's style.

Target speaker: ${speaker.name}
${styleContext}

User transcript (first 1200 chars):
"""
${transcript.slice(0, 1200)}
"""

Evaluate these three dimensions and return their average as structure_match_score:
1. Sentence-length variance: Does the user vary sentence lengths the way ${speaker.name} does?
2. Opening impact: Does the opening grab attention like ${speaker.name}'s style?
3. Closing strength: Does the transcript end with a clear, memorable statement?

Return ONLY valid JSON: {"structure_match_score": <integer 0-100>}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 60,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      console.warn("Structure match GPT error:", res.status);
      return 50;
    }

    const data = await res.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    if (!content) return 50;

    const parsed = JSON.parse(content);
    const score = parsed?.structure_match_score;
    if (typeof score !== "number") return 50;
    return Math.max(0, Math.min(100, Math.round(score)));
  } catch {
    return 50; // neutral fallback — never fatal
  }
}

// ---------------------------------------------------------------------------
// Signature phrase extraction
//
// Returns the mentor phrases that appear verbatim (case-insensitive) in the
// user's transcript.
// ---------------------------------------------------------------------------

export function extractSignaturePhrases(
  transcript: string,
  signaturePhrases: string[],
): string[] {
  const lower = transcript.toLowerCase();
  return signaturePhrases.filter((phrase) =>
    lower.includes(phrase.toLowerCase())
  );
}

// ---------------------------------------------------------------------------
// Weighted overall style match score
//
// Weights: vector similarity 40%, vocabulary 25%, energy 25%, structure 10%.
// Returns null when vector_similarity is null (no mentor embeddings) — the
// vector component is the anchor score; without it the overall is undefined.
// ---------------------------------------------------------------------------

export function computeWeightedStyleMatch(
  breakdown: StyleMatchBreakdown,
): number | null {
  if (breakdown.vector_similarity === null) return null;

  return Math.round(
    breakdown.vector_similarity * 0.40 +
    breakdown.vocabulary_match    * 0.25 +
    breakdown.energy_match        * 0.25 +
    breakdown.structure_match     * 0.10,
  );
}

// ---------------------------------------------------------------------------
// computeFullStyleMatch — orchestrates all sub-scores
//
// Non-fatal: if vector matching fails (no embeddings), returns null overall
// score and empty breakdown as specified. All errors are caught and logged.
// ---------------------------------------------------------------------------

export async function computeFullStyleMatch(
  supabase: SupabaseClient,
  speaker: SpeakerWithCategory,
  transcript: string,
  metrics: RawMetrics,
  openaiKey: string,
): Promise<StyleMatchResult> {
  const emptyResult: StyleMatchResult = {
    overall_score: null,
    breakdown: {
      vector_similarity: null,
      vocabulary_match: 0,
      energy_match: 0,
      structure_match: 0,
      signature_adoption: 0,
    },
    signature_phrases_used: [],
  };

  // Generate embedding for user transcript
  let userEmbedding: number[];
  try {
    userEmbedding = await computeEmbedding(transcript, openaiKey);
  } catch (err) {
    console.warn("Embedding generation failed:", err instanceof Error ? err.message : String(err));
    return emptyResult;
  }

  // Vector similarity against mentor corpus
  const vectorScore = await computeVectorStyleMatch(supabase, speaker.id, userEmbedding);

  if (vectorScore === null) {
    // Mentor has no embeddings — spec says return null overall, empty breakdown
    return emptyResult;
  }

  const signaturePhrases: string[] = speaker.signature_phrases ?? [];

  // Run remaining sub-scores (all are synchronous or lightweight)
  const [vocabularyMatch, energyMatch, structureMatch, signaturePhrasesUsed] =
    await Promise.all([
      Promise.resolve(computeVocabularyMatch(transcript, signaturePhrases)),
      Promise.resolve(
        computeEnergyMatch(metrics.wpm, metrics.pause_count, metrics.duration_seconds, speaker),
      ),
      computeStructureMatch(transcript, speaker, openaiKey),
      Promise.resolve(extractSignaturePhrases(transcript, signaturePhrases)),
    ]);

  const breakdown: StyleMatchBreakdown = {
    vector_similarity: vectorScore,
    vocabulary_match: vocabularyMatch,
    energy_match: energyMatch,
    structure_match: structureMatch,
    signature_adoption: signaturePhrasesUsed.length,
  };

  const overallScore = computeWeightedStyleMatch(breakdown);

  return {
    overall_score: overallScore,
    breakdown,
    signature_phrases_used: signaturePhrasesUsed,
  };
}
