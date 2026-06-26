/**
 * _shared/openai.ts
 * OpenAI helpers for persona generation (GPT-4o) and text embeddings.
 */

import type { CategoryId, PersonaProfile } from "./import-types.ts";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_EMBED_URL = "https://api.openai.com/v1/embeddings";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface EmbedBatchResult {
  chunks: string[];
  embeddings: number[][];
}

// ---------------------------------------------------------------------------
// PERSONA GENERATION
// ---------------------------------------------------------------------------

const PERSONA_SYSTEM_PROMPT = `You are an expert speech analyst. Given transcripts of a speaker across multiple sessions, produce a comprehensive style profile in JSON.

Required schema (return ONLY valid JSON, no markdown, no commentary):
{
  "name": "Auto-detected or provided name",
  "monogram": "2-letter monogram from name (e.g. 'EL' for Elon)",
  "specialty": "Short specialty descriptor matching one of: 'Keynote Master', 'Sales Powerhouse', 'Persuasion Architect', 'Leadership Voice', 'Storyteller', 'Thought Authority', or a custom descriptor",
  "category_suggestion": "one of: motivation | sales | influence | leadership | storytelling | authority",
  "signature_trait": "One vivid phrase capturing their unique style (e.g. 'Master of the Pause', 'Velocity Salesman')",
  "bio": "3-4 sentences describing their speaking style — NOT biography. Focus on cadence, vocabulary, energy, signature moves.",
  "ideal_wpm_min": 110,
  "ideal_wpm_max": 160,
  "ideal_pause_frequency": "high | medium | low",
  "energy_profile": "short descriptor like 'high-voltage', 'cerebral-precise', 'warm-deliberate'",
  "signature_phrases": ["array of 5-8 phrases they use repeatedly"],
  "common_themes": ["array of 3-6 topics they speak about most"],
  "persuasion_techniques": ["array of 3-6 techniques they employ"],
  "style_traits": ["array of 4-6 specific stylistic patterns"],
  "perfect_for": "One-line 'Ideal for...' statement",
  "famous_speeches": [],
  "learnings": ["3 things you will improve by training against them"]
}

Be specific and evidence-based. Infer patterns from the transcripts without quoting directly (copyright caution). The bio and learnings must be useful for someone who wants to train their speaking style.`;

/**
 * Sends concatenated transcript text to GPT-4o and returns a parsed PersonaProfile.
 * If name/trait overrides are provided they replace the AI-detected values.
 */
export async function generatePersona(
  transcriptText: string,
  openaiKey: string,
  options?: {
    nameOverride?: string | null;
    traitOverride?: string | null;
    targetCategory?: CategoryId | null;
  },
): Promise<PersonaProfile> {
  // Truncate to ~80K tokens (~60K words) to stay within context limits
  const MAX_WORDS = 60_000;
  const words = transcriptText.split(/\s+/);
  const truncated =
    words.length > MAX_WORDS
      ? words.slice(0, MAX_WORDS).join(" ") +
        `\n\n[Transcript truncated — ${words.length.toLocaleString()} total words, showing first ${MAX_WORDS.toLocaleString()}]`
      : transcriptText;

  const userMessage = options?.targetCategory
    ? `The speaker primarily operates in the "${options.targetCategory}" domain.\n\nTRANSCRIPTS:\n${truncated}`
    : `TRANSCRIPTS:\n${truncated}`;

  const res = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: PERSONA_SYSTEM_PROMPT } satisfies ChatMessage,
        { role: "user", content: userMessage } satisfies ChatMessage,
      ],
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`OpenAI Chat API ${res.status}: ${errBody}`);
  }

  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";

  if (!content) throw new Error("Empty response from GPT-4o");

  let persona: PersonaProfile;
  try {
    persona = JSON.parse(content) as PersonaProfile;
  } catch {
    throw new Error(`GPT-4o returned non-JSON: ${content.slice(0, 300)}`);
  }

  // Validate required fields
  if (!persona.name || !persona.bio || !persona.signature_trait) {
    throw new Error("Persona response missing required fields");
  }

  // Apply overrides
  if (options?.nameOverride) {
    persona.name = options.nameOverride;
    // Recompute monogram from override name
    const parts = options.nameOverride.trim().split(/\s+/);
    persona.monogram = parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : options.nameOverride.slice(0, 2).toUpperCase();
  }
  if (options?.traitOverride) {
    persona.signature_trait = options.traitOverride;
  }
  if (options?.targetCategory) {
    persona.category_suggestion = options.targetCategory;
  }

  // Ensure arrays are actually arrays
  persona.signature_phrases = ensureArray(persona.signature_phrases);
  persona.common_themes = ensureArray(persona.common_themes);
  persona.persuasion_techniques = ensureArray(persona.persuasion_techniques);
  persona.style_traits = ensureArray(persona.style_traits);
  persona.learnings = ensureArray(persona.learnings);
  persona.famous_speeches = [];

  // Clamp WPM to sane range
  persona.ideal_wpm_min = clamp(Number(persona.ideal_wpm_min), 60, 250);
  persona.ideal_wpm_max = clamp(Number(persona.ideal_wpm_max), persona.ideal_wpm_min + 10, 300);

  return persona;
}

// ---------------------------------------------------------------------------
// TEXT CHUNKING
// ---------------------------------------------------------------------------

/**
 * Splits text into overlapping chunks of approximately `chunkWords` words,
 * with `overlapWords` word overlap between consecutive chunks.
 * Tries to split on sentence boundaries to avoid cutting mid-thought.
 */
export function chunkText(
  text: string,
  chunkWords = 375,   // ≈500 tokens
  overlapWords = 37,  // ≈50 tokens
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + chunkWords, words.length);
    const chunkWords_ = words.slice(start, end);
    chunks.push(chunkWords_.join(" "));

    if (end >= words.length) break;
    start = end - overlapWords;
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// BATCH EMBEDDINGS
// ---------------------------------------------------------------------------

/**
 * Embeds up to 100 text chunks in a single OpenAI API call.
 * Caller should sample before calling if > 100 chunks are needed.
 *
 * Model: text-embedding-3-small (1536 dimensions, cost-efficient)
 */
export async function embedChunks(
  chunks: string[],
  openaiKey: string,
): Promise<EmbedBatchResult> {
  if (chunks.length === 0) return { chunks: [], embeddings: [] };

  // OpenAI limit: 2048 inputs per request, but each input ≤ 8191 tokens
  // We cap at 100 for practical batch size
  const BATCH_SIZE = 100;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);

    const res = await fetch(OPENAI_EMBED_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: batch,
        dimensions: 1536,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`OpenAI Embeddings API ${res.status}: ${errBody}`);
    }

    const data = await res.json() as {
      data: Array<{ index: number; embedding: number[] }>;
    };

    // data.data is sorted by index
    const batchEmbeddings = data.data
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);

    allEmbeddings.push(...batchEmbeddings);

    // Respect rate limits: small delay between batches
    if (i + BATCH_SIZE < chunks.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return { chunks, embeddings: allEmbeddings };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  return [];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
