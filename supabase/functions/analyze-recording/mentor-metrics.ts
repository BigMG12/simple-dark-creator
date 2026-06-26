// ---------------------------------------------------------------------------
// Mentor-Specific Metrics Computation
// Każdy mentor/kategoria ma swoje unikalne metryki, które są liczone
// oprócz bazowych 6 metryk (WPM, Filler, Pause, Energy, Clarity, Vocab)
// ---------------------------------------------------------------------------

import type { WhisperWord, RawMetrics, SpeakerWithCategory } from "./types.ts";

export interface MentorMetricDefinition {
  metric_name: string;
  display_name: string;
  description: string;
  how_to_score: string;
  ideal_range: [number, number];
  weight: number;
}

export interface MentorMetricResult {
  [metricName: string]: number;
}

// ---------------------------------------------------------------------------
// Main computation function
// ---------------------------------------------------------------------------

export async function computeMentorSpecificMetrics(
  transcript: string,
  words: WhisperWord[],
  rawMetrics: RawMetrics,
  speaker: SpeakerWithCategory,
  openaiKey: string,
): Promise<MentorMetricResult | null> {
  const category = speaker.speaker_categories;
  if (!category?.primary_metrics_this_mentor_cares_about) {
    return null;
  }

  const metrics = category.primary_metrics_this_mentor_cares_about as MentorMetricDefinition[];
  if (!Array.isArray(metrics) || metrics.length === 0) {
    return null;
  }

  const result: MentorMetricResult = {};
  const durationMinutes = rawMetrics.duration_seconds / 60;

  for (const metricDef of metrics) {
    try {
      const value = await computeSingleMetric(
        metricDef,
        transcript,
        words,
        rawMetrics,
        durationMinutes,
        openaiKey,
      );
      result[metricDef.metric_name] = value;
    } catch (err) {
      console.warn(
        `Failed to compute metric ${metricDef.metric_name}:`,
        err instanceof Error ? err.message : String(err),
      );
      // Zapisz 0 jako fallback
      result[metricDef.metric_name] = 0;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Single metric computation dispatcher
// ---------------------------------------------------------------------------

async function computeSingleMetric(
  metricDef: MentorMetricDefinition,
  transcript: string,
  words: WhisperWord[],
  rawMetrics: RawMetrics,
  durationMinutes: number,
  openaiKey: string,
): Promise<number> {
  const metricName = metricDef.metric_name;

  // Metryki oparte na keyword matching (szybkie, bez AI)
  if (metricName === "urgency_density") {
    return computeUrgencyDensity(transcript, durationMinutes);
  }
  if (metricName === "close_attempts") {
    return computeCloseAttempts(transcript);
  }
  if (metricName === "personal_stakes_stated") {
    return computePersonalStakes(transcript);
  }
  if (metricName === "confrontation_language") {
    return computeConfrontationLanguage(transcript, durationMinutes);
  }
  if (metricName === "permission_statements") {
    return computePermissionStatements(transcript);
  }
  if (metricName === "authority_signals") {
    return computeAuthoritySignals(transcript, durationMinutes);
  }
  if (metricName === "social_proof_usage") {
    return computeSocialProof(transcript);
  }
  if (metricName === "framework_density") {
    return computeFrameworkDensity(transcript, durationMinutes);
  }
  if (metricName === "value_equation_framing") {
    return computeValueEquation(transcript);
  }
  if (metricName === "we_language_frequency") {
    return computeWeLanguageFrequency(transcript);
  }
  if (metricName === "vision_statement_density") {
    return computeVisionStatements(transcript);
  }
  if (metricName === "accountability_language") {
    return computeAccountabilityLanguage(transcript);
  }
  if (metricName === "sensory_language_density") {
    return computeSensoryLanguage(transcript, durationMinutes);
  }
  if (metricName === "dialogue_use") {
    return computeDialogueUse(transcript);
  }
  if (metricName === "credential_signals") {
    return computeCredentialSignals(transcript, durationMinutes);
  }
  if (metricName === "contrarian_claims") {
    return computeContrarianClaims(transcript);
  }
  if (metricName === "intellectual_depth_markers") {
    return computeIntellectualDepth(transcript, durationMinutes);
  }

  // Metryki wymagające analizy timestampów
  if (metricName === "gravitas_pauses_per_min") {
    return computeGravitasPauses(words, durationMinutes);
  }
  if (metricName === "productive_pauses") {
    return computeProductivePauses(words, durationMinutes);
  }

  // Metryki wymagające AI analysis (wolniejsze, ale dokładniejsze)
  if (metricName === "tonality_shifts") {
    return await computeTonalityShifts(transcript, rawMetrics, openaiKey);
  }
  if (metricName === "objection_preemption") {
    return computeObjectionPreemption(transcript);
  }
  if (metricName === "intensity_peaks") {
    return await computeIntensityPeaks(transcript, openaiKey);
  }
  if (metricName === "emotional_beats") {
    return await computeEmotionalBeats(transcript, openaiKey);
  }
  if (metricName === "narrative_arc_completeness") {
    return await computeNarrativeArc(transcript, openaiKey);
  }

  // Fallback: nieznana metryka
  console.warn(`Unknown metric: ${metricName}`);
  return 0;
}

// ---------------------------------------------------------------------------
// SALES METRICS
// ---------------------------------------------------------------------------

function computeUrgencyDensity(transcript: string, durationMinutes: number): number {
  const urgencyWords = [
    "now", "today", "limited", "only", "last chance", "before",
    "running out", "dont wait", "don't wait", "act fast", "hurry",
    "deadline", "expires", "ending soon", "while supplies last"
  ];

  let count = 0;
  const lower = transcript.toLowerCase();

  for (const word of urgencyWords) {
    const pattern = new RegExp(`\\b${escapeRegex(word)}\\b`, "gi");
    const matches = lower.match(pattern);
    if (matches) count += matches.length;
  }

  return Math.round((count / durationMinutes) * 10) / 10;
}

function computeCloseAttempts(transcript: string): number {
  const closePatterns = [
    "are you ready", "lets do it", "let's do it", "say yes", "sign today",
    "make the decision", "commit now", "are you in", "shall we proceed",
    "ready to move forward", "time to decide"
  ];

  let count = 0;
  const lower = transcript.toLowerCase();

  for (const pattern of closePatterns) {
    const regex = new RegExp(escapeRegex(pattern), "gi");
    const matches = lower.match(regex);
    if (matches) count += matches.length;
  }

  return count;
}

function computeObjectionPreemption(transcript: string): number {
  const preemptionPatterns = [
    "you might think", "some people say", "i know what you're thinking",
    "i know what youre thinking", "before you ask", "let me address",
    "you may be wondering", "common concern", "typical objection"
  ];

  let count = 0;
  const lower = transcript.toLowerCase();

  for (const pattern of preemptionPatterns) {
    const regex = new RegExp(escapeRegex(pattern), "gi");
    const matches = lower.match(regex);
    if (matches) count += matches.length;
  }

  return count;
}

// ---------------------------------------------------------------------------
// MOTIVATION METRICS
// ---------------------------------------------------------------------------

function computePersonalStakes(transcript: string): number {
  const stakesPatterns = [
    "i will", "i must", "my life depends", "everything is on the line",
    "this is my moment", "i have to", "i need to", "my future",
    "my dream", "my goal"
  ];

  let count = 0;
  const lower = transcript.toLowerCase();

  for (const pattern of stakesPatterns) {
    const regex = new RegExp(escapeRegex(pattern), "gi");
    const matches = lower.match(regex);
    if (matches) count += matches.length;
  }

  return count;
}

function computeConfrontationLanguage(transcript: string, durationMinutes: number): number {
  const confrontationPatterns = [
    "are you", "why don't you", "why dont you", "what are you waiting for",
    "stop", "quit", "enough", "wake up", "face it", "admit it"
  ];

  let count = 0;
  const lower = transcript.toLowerCase();

  for (const pattern of confrontationPatterns) {
    const regex = new RegExp(`\\b${escapeRegex(pattern)}\\b`, "gi");
    const matches = lower.match(regex);
    if (matches) count += matches.length;
  }

  return Math.round((count / durationMinutes) * 10) / 10;
}

function computePermissionStatements(transcript: string): number {
  const permissionPatterns = [
    "you can", "you deserve", "it's okay to", "its okay to",
    "you are allowed to", "give yourself permission", "you have the right",
    "you're capable", "youre capable"
  ];

  let count = 0;
  const lower = transcript.toLowerCase();

  for (const pattern of permissionPatterns) {
    const regex = new RegExp(escapeRegex(pattern), "gi");
    const matches = lower.match(regex);
    if (matches) count += matches.length;
  }

  return count;
}

// ---------------------------------------------------------------------------
// INFLUENCE METRICS
// ---------------------------------------------------------------------------

function computeAuthoritySignals(transcript: string, durationMinutes: number): number {
  const authorityPatterns = [
    "i have", "my experience", "when i", "the data shows",
    "research proves", "experts agree", "studies show", "proven",
    "documented", "evidence"
  ];

  let count = 0;
  const lower = transcript.toLowerCase();

  for (const pattern of authorityPatterns) {
    const regex = new RegExp(escapeRegex(pattern), "gi");
    const matches = lower.match(regex);
    if (matches) count += matches.length;
  }

  return Math.round((count / durationMinutes) * 10) / 10;
}

function computeSocialProof(transcript: string): number {
  const socialProofPatterns = [
    "others have", "most people", "everyone is", "thousands of",
    "clients report", "customers say", "users love", "proven by",
    "testimonials", "success stories"
  ];

  let count = 0;
  const lower = transcript.toLowerCase();

  for (const pattern of socialProofPatterns) {
    const regex = new RegExp(escapeRegex(pattern), "gi");
    const matches = lower.match(regex);
    if (matches) count += matches.length;
  }

  return count;
}

function computeFrameworkDensity(transcript: string, durationMinutes: number): number {
  const frameworkPatterns = [
    "three steps", "five principles", "the framework", "first", "second",
    "third", "number one", "step one", "phase", "stage"
  ];

  let count = 0;
  const lower = transcript.toLowerCase();

  for (const pattern of frameworkPatterns) {
    const regex = new RegExp(`\\b${escapeRegex(pattern)}\\b`, "gi");
    const matches = lower.match(regex);
    if (matches) count += matches.length;
  }

  return Math.round((count / durationMinutes) * 10) / 10;
}

function computeValueEquation(transcript: string): number {
  const valuePatterns = [
    "if", "then", "the math is simple", "calculate", "roi",
    "cost versus benefit", "compare", "worth", "value", "investment"
  ];

  let count = 0;
  const lower = transcript.toLowerCase();

  for (const pattern of valuePatterns) {
    const regex = new RegExp(`\\b${escapeRegex(pattern)}\\b`, "gi");
    const matches = lower.match(regex);
    if (matches) count += matches.length;
  }

  return Math.min(count, 10); // Cap at reasonable value
}

// ---------------------------------------------------------------------------
// LEADERSHIP METRICS
// ---------------------------------------------------------------------------

function computeGravitasPauses(words: WhisperWord[], durationMinutes: number): number {
  if (words.length < 2) return 0;

  let gravitasPauseCount = 0;

  for (let i = 1; i < words.length; i++) {
    const pauseDuration = (words[i].start - words[i - 1].end) * 1000; // ms
    if (pauseDuration >= 1500) { // >1.5s = gravitas pause
      gravitasPauseCount++;
    }
  }

  return Math.round((gravitasPauseCount / durationMinutes) * 10) / 10;
}

function computeWeLanguageFrequency(transcript: string): number {
  const weWords = ["we", "our", "us", "together", "collective", "shared"];
  const allPronouns = ["i", "me", "my", "you", "your", "he", "she", "they", "we", "our", "us"];

  let weCount = 0;
  let totalPronounCount = 0;

  const lower = transcript.toLowerCase();
  const words = lower.split(/\s+/);

  for (const word of words) {
    const cleaned = word.replace(/[^a-z]/g, "");
    if (weWords.includes(cleaned)) weCount++;
    if (allPronouns.includes(cleaned)) totalPronounCount++;
  }

  if (totalPronounCount === 0) return 0;
  return Math.round((weCount / totalPronounCount) * 100);
}

function computeVisionStatements(transcript: string): number {
  const visionPatterns = [
    "imagine", "picture", "future where", "we will", "one day",
    "when we", "envision", "see a world", "dream of"
  ];

  let count = 0;
  const lower = transcript.toLowerCase();

  for (const pattern of visionPatterns) {
    const regex = new RegExp(escapeRegex(pattern), "gi");
    const matches = lower.match(regex);
    if (matches) count += matches.length;
  }

  return count;
}

function computeAccountabilityLanguage(transcript: string): number {
  const accountabilityPatterns = [
    "i take responsibility", "my fault", "i own this", "on me",
    "i failed", "i should have", "my mistake", "i'm accountable",
    "im accountable"
  ];

  let count = 0;
  const lower = transcript.toLowerCase();

  for (const pattern of accountabilityPatterns) {
    const regex = new RegExp(escapeRegex(pattern), "gi");
    const matches = lower.match(regex);
    if (matches) count += matches.length;
  }

  return count;
}
// ---------------------------------------------------------------------------
// STORYTELLING METRICS
// ---------------------------------------------------------------------------

function computeSensoryLanguage(transcript: string, durationMinutes: number): number {
  // Kolory
  const colors = ["red", "blue", "green", "yellow", "black", "white", "gray", "purple", "orange", "brown"];
  // Dźwięki
  const sounds = ["sound", "noise", "whisper", "shout", "scream", "silence", "music", "voice"];
  // Zapachy
  const smells = ["smell", "scent", "odor", "fragrance", "aroma", "stink"];
  // Tekstury
  const textures = ["rough", "smooth", "soft", "hard", "cold", "hot", "warm", "cool", "wet", "dry"];
  // Temperatury
  const temperatures = ["freezing", "burning", "chilly", "sweltering"];

  const allSensory = [...colors, ...sounds, ...smells, ...textures, ...temperatures];

  let count = 0;
  const lower = transcript.toLowerCase();

  for (const word of allSensory) {
    const pattern = new RegExp(`\\b${escapeRegex(word)}\\b`, "gi");
    const matches = lower.match(pattern);
    if (matches) count += matches.length;
  }

  return Math.round((count / durationMinutes) * 10) / 10;
}

function computeDialogueUse(transcript: string): number {
  const dialoguePatterns = [
    "he said", "she said", "i said", "they said",
    "he told me", "she told me", "i asked", "they replied",
    "he asked", "she asked", "i told", "they answered"
  ];

  let count = 0;
  const lower = transcript.toLowerCase();

  for (const pattern of dialoguePatterns) {
    const regex = new RegExp(escapeRegex(pattern), "gi");
    const matches = lower.match(regex);
    if (matches) count += matches.length;
  }

  return count;
}

// ---------------------------------------------------------------------------
// AUTHORITY METRICS
// ---------------------------------------------------------------------------

function computeCredentialSignals(transcript: string, durationMinutes: number): number {
  const credentialPatterns = [
    "research shows", "studies indicate", "in my work", "documented",
    "peer-reviewed", "data proves", "evidence suggests", "analysis reveals",
    "findings show", "published"
  ];

  let count = 0;
  const lower = transcript.toLowerCase();

  for (const pattern of credentialPatterns) {
    const regex = new RegExp(escapeRegex(pattern), "gi");
    const matches = lower.match(regex);
    if (matches) count += matches.length;
  }

  return Math.round((count / durationMinutes) * 10) / 10;
}

function computeContrarianClaims(transcript: string): number {
  const contrarianPatterns = [
    "contrary to", "most people think", "actually", "the truth is",
    "unpopular opinion", "against conventional", "opposite of what",
    "everyone believes", "common misconception"
  ];

  let count = 0;
  const lower = transcript.toLowerCase();

  for (const pattern of contrarianPatterns) {
    const regex = new RegExp(escapeRegex(pattern), "gi");
    const matches = lower.match(regex);
    if (matches) count += matches.length;
  }

  return count;
}

function computeIntellectualDepth(transcript: string, durationMinutes: number): number {
  const depthMarkers = [
    "nuanced", "complex", "depends on", "multifaceted", "on the other hand",
    "however", "although", "whereas", "conversely", "paradoxically",
    "interestingly", "notably"
  ];

  let count = 0;
  const lower = transcript.toLowerCase();

  for (const marker of depthMarkers) {
    const pattern = new RegExp(`\\b${escapeRegex(marker)}\\b`, "gi");
    const matches = lower.match(pattern);
    if (matches) count += matches.length;
  }

  return Math.round((count / durationMinutes) * 10) / 10;
}

function computeProductivePauses(words: WhisperWord[], durationMinutes: number): number {
  if (words.length < 2) return 0;

  let productivePauseCount = 0;

  for (let i = 1; i < words.length; i++) {
    const pauseDuration = (words[i].start - words[i - 1].end) * 1000; // ms
    if (pauseDuration >= 1000 && pauseDuration < 3000) { // 1-3s = thinking pause
      productivePauseCount++;
    }
  }

  return Math.round((productivePauseCount / durationMinutes) * 10) / 10;
}

// ---------------------------------------------------------------------------
// AI-ASSISTED METRICS (require GPT analysis)
// ---------------------------------------------------------------------------

async function computeTonalityShifts(
  transcript: string,
  rawMetrics: RawMetrics,
  openaiKey: string,
): Promise<number> {
  const prompt = `Analyze this speech transcript and count the number of distinct tonality shifts - moments where the speaker changes their vocal energy, certainty level, or emotional intensity to emphasize a point.

Look for:
- Shifts from calm to urgent
- Changes in certainty/conviction
- Emotional intensity changes
- Tempo/pace variations

Transcript (${rawMetrics.duration_seconds}s):
${transcript}

Return ONLY a JSON object: {"tonality_shifts": <number>}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 100,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) return 0;

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return 0;

    const parsed = JSON.parse(content);
    return Math.round(parsed.tonality_shifts || 0);
  } catch {
    return 0;
  }
}

async function computeIntensityPeaks(
  transcript: string,
  openaiKey: string,
): Promise<number> {
  const prompt = `Count the number of intensity peaks in this speech - moments of maximum emotional intensity marked by exclamations, repetitions, or emphatic language.

Look for:
- Exclamation marks or emphatic statements
- Repeated words/phrases for emphasis
- Intensifiers (very, extremely, absolutely)
- All-caps equivalent energy

Transcript:
${transcript}

Return ONLY a JSON object: {"intensity_peaks": <number>}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 100,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) return 0;

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return 0;

    const parsed = JSON.parse(content);
    return Math.round(parsed.intensity_peaks || 0);
  } catch {
    return 0;
  }
}

async function computeEmotionalBeats(
  transcript: string,
  openaiKey: string,
): Promise<number> {
  const prompt = `Count the number of distinct emotional transitions in this speech - moments where the speaker intentionally shifts the audience's emotional state.

Look for transitions like:
- Joy → Sadness
- Fear → Relief
- Tension → Resolution
- Anger → Calm
- Excitement → Reflection

Transcript:
${transcript}

Return ONLY a JSON object: {"emotional_beats": <number>}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 100,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) return 0;

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return 0;

    const parsed = JSON.parse(content);
    return Math.round(parsed.emotional_beats || 0);
  } catch {
    return 0;
  }
}

async function computeNarrativeArc(
  transcript: string,
  openaiKey: string,
): Promise<number> {
  const prompt = `Evaluate whether this speech contains a complete narrative arc with setup, conflict, and resolution.

Score 0-100:
- 0: No narrative structure, just facts/statements
- 50: Partial structure (has 1-2 elements but incomplete)
- 100: Complete arc with clear setup, rising tension, and satisfying resolution

Transcript:
${transcript}

Return ONLY a JSON object: {"narrative_arc_score": <number 0-100>}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 100,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) return 0;

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return 0;

    const parsed = JSON.parse(content);
    return Math.max(0, Math.min(100, Math.round(parsed.narrative_arc_score || 0)));
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Utility function
// ---------------------------------------------------------------------------

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
