/**
 * _shared/deepgram.ts — Deepgram Nova-2 transcription + diarization helpers.
 *
 * Pricing (as of 2025): ~$0.0043/min for nova-2 with diarization.
 * A 30-min meeting costs ~$0.13.
 *
 * Setup:
 *   1. Sign up at https://deepgram.com (free $200 credit).
 *   2. Console → API Keys → Create Key (scope: read+write).
 *   3. Add as DEEPGRAM_API_KEY secret in Lovable Cloud.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DeepgramWord {
  word: string;
  start: number; // seconds
  end: number;
  confidence: number;
  speaker?: number;
  punctuated_word?: string;
}

export interface DeepgramUtterance {
  start: number;
  end: number;
  confidence: number;
  channel: number;
  transcript: string;
  speaker: number;
  id: string;
  words: DeepgramWord[];
}

export interface DeepgramResponse {
  metadata: {
    duration: number;
    channels: number;
    request_id: string;
  };
  results: {
    channels: Array<{
      alternatives: Array<{
        transcript: string;
        confidence: number;
        words: DeepgramWord[];
      }>;
    }>;
    utterances?: DeepgramUtterance[];
  };
}

export interface SpeakerSummary {
  /** "Speaker 0", "Speaker 1", ... — stable label used in UI. */
  label: string;
  /** Internal numeric id from Deepgram. */
  speaker_id: number;
  /** Total seconds this speaker held the floor. */
  duration_seconds: number;
  /** Number of utterances from this speaker. */
  utterance_count: number;
  /** Up to 3 representative utterances for the user to recognise themselves. */
  sample_utterances: { start: number; end: number; text: string }[];
}

export interface DiarizationResult {
  /** Total audio duration reported by Deepgram. */
  duration_seconds: number;
  /** All detected speakers, sorted by speaking time desc. */
  speakers: SpeakerSummary[];
  /** Flat list of utterances in chronological order. */
  utterances: Array<{
    start: number;
    end: number;
    speaker_id: number;
    speaker_label: string;
    text: string;
  }>;
  /** Single concatenated transcript with speaker prefixes for storage. */
  transcript_full: string;
  /** Raw Deepgram response (kept for forensic debugging — store as jsonb). */
  raw: DeepgramResponse;
}

export class DeepgramError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "DeepgramError";
  }
}

// ---------------------------------------------------------------------------
// transcribeAndDiarize
// ---------------------------------------------------------------------------

export interface TranscribeOptions {
  /** ISO language code or "multi" for auto-detect. Default: "en". */
  language?: string;
  /** Hard timeout in ms. Default 120s. */
  timeoutMs?: number;
  /** MIME type of the audio bytes. */
  mimeType?: string;
  /** Override Deepgram model. Default "nova-2". */
  model?: string;
}

/**
 * Sends raw audio bytes to Deepgram for transcription + diarization.
 *
 * Throws DeepgramError on HTTP failure, timeout, or empty results.
 */
export async function transcribeAndDiarize(
  audioBytes: Uint8Array,
  apiKey: string,
  options: TranscribeOptions = {},
): Promise<DiarizationResult> {
  const {
    language = "en",
    timeoutMs = 120_000,
    mimeType = "audio/webm",
    model = "nova-2",
  } = options;

  const params = new URLSearchParams({
    model,
    diarize: "true",
    punctuate: "true",
    utterances: "true",
    smart_format: "true",
    language,
  });

  const url = `https://api.deepgram.com/v1/listen?${params.toString()}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": mimeType,
      },
      // Deno's fetch accepts Uint8Array directly as body.
      body: audioBytes,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const aborted = err instanceof Error && err.name === "AbortError";
    throw new DeepgramError(
      aborted
        ? `Deepgram request timed out after ${timeoutMs}ms`
        : `Deepgram request failed: ${err instanceof Error ? err.message : String(err)}`,
      undefined,
      err,
    );
  }
  clearTimeout(timer);

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new DeepgramError(
      `Deepgram returned ${response.status}: ${body.slice(0, 500)}`,
      response.status,
    );
  }

  const data = (await response.json()) as DeepgramResponse;
  return summariseDiarization(data);
}

// ---------------------------------------------------------------------------
// summariseDiarization
// ---------------------------------------------------------------------------

/**
 * Reduces a raw Deepgram response into the shape the rest of the pipeline
 * cares about: per-speaker totals + a flat utterance timeline.
 */
export function summariseDiarization(raw: DeepgramResponse): DiarizationResult {
  const utterances = raw.results.utterances ?? [];
  const duration = raw.metadata?.duration ?? 0;

  if (utterances.length === 0) {
    // Fallback: rebuild from word-level data if utterances missing.
    const words = raw.results.channels?.[0]?.alternatives?.[0]?.words ?? [];
    if (words.length === 0) {
      throw new DeepgramError("Deepgram returned no transcribable audio");
    }
    return wordsToDiarizationResult(words, duration, raw);
  }

  // Aggregate per-speaker totals.
  const bySpeaker = new Map<number, SpeakerSummary>();
  for (const u of utterances) {
    const id = u.speaker;
    const dur = u.end - u.start;
    const existing = bySpeaker.get(id);
    if (existing) {
      existing.duration_seconds += dur;
      existing.utterance_count += 1;
      if (existing.sample_utterances.length < 3 && u.transcript.length > 20) {
        existing.sample_utterances.push({
          start: u.start,
          end: u.end,
          text: u.transcript,
        });
      }
    } else {
      bySpeaker.set(id, {
        label: `Speaker ${id}`,
        speaker_id: id,
        duration_seconds: dur,
        utterance_count: 1,
        sample_utterances:
          u.transcript.length > 20
            ? [{ start: u.start, end: u.end, text: u.transcript }]
            : [],
      });
    }
  }

  const speakers = [...bySpeaker.values()]
    .map((s) => ({
      ...s,
      duration_seconds: Math.round(s.duration_seconds * 100) / 100,
    }))
    .sort((a, b) => b.duration_seconds - a.duration_seconds);

  // Build flat timeline + a readable concatenated transcript.
  const flatUtterances = utterances.map((u) => ({
    start: u.start,
    end: u.end,
    speaker_id: u.speaker,
    speaker_label: `Speaker ${u.speaker}`,
    text: u.transcript.trim(),
  }));

  const transcript_full = flatUtterances
    .map((u) => `[${formatTimestamp(u.start)}] ${u.speaker_label}: ${u.text}`)
    .join("\n");

  return {
    duration_seconds: duration,
    speakers,
    utterances: flatUtterances,
    transcript_full,
    raw,
  };
}

// ---------------------------------------------------------------------------
// extractSpeakerTranscript
// ---------------------------------------------------------------------------

/**
 * Returns the text spoken by a single speaker, optionally with timestamps.
 * Used by select-user-speaker to build transcript_user_only.
 */
export function extractSpeakerTranscript(
  result: DiarizationResult,
  speakerId: number,
  includeTimestamps = true,
): string {
  return result.utterances
    .filter((u) => u.speaker_id === speakerId)
    .map((u) =>
      includeTimestamps
        ? `[${formatTimestamp(u.start)}] ${u.text}`
        : u.text,
    )
    .join("\n");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/** Last-resort fallback: build utterances from word-level diarization. */
function wordsToDiarizationResult(
  words: DeepgramWord[],
  duration: number,
  raw: DeepgramResponse,
): DiarizationResult {
  const utterances: DiarizationResult["utterances"] = [];
  let current: { speaker: number; start: number; end: number; tokens: string[] } | null = null;

  for (const w of words) {
    const sp = w.speaker ?? 0;
    const tok = w.punctuated_word ?? w.word;
    if (current && current.speaker === sp && w.start - current.end < 1.5) {
      current.tokens.push(tok);
      current.end = w.end;
    } else {
      if (current) {
        utterances.push({
          start: current.start,
          end: current.end,
          speaker_id: current.speaker,
          speaker_label: `Speaker ${current.speaker}`,
          text: current.tokens.join(" "),
        });
      }
      current = { speaker: sp, start: w.start, end: w.end, tokens: [tok] };
    }
  }
  if (current) {
    utterances.push({
      start: current.start,
      end: current.end,
      speaker_id: current.speaker,
      speaker_label: `Speaker ${current.speaker}`,
      text: current.tokens.join(" "),
    });
  }

  // Reuse the utterance summariser by injecting a synthetic raw shape.
  const synthetic: DeepgramResponse = {
    ...raw,
    results: {
      ...raw.results,
      utterances: utterances.map((u, i) => ({
        start: u.start,
        end: u.end,
        confidence: 1,
        channel: 0,
        transcript: u.text,
        speaker: u.speaker_id,
        id: `synthetic-${i}`,
        words: [],
      })),
    },
  };
  return summariseDiarization(synthetic);
}
