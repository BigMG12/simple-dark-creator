// ---------------------------------------------------------------------------
// Level thresholds
// Level 1 = 0 XP, L2 = 100, L3 = 250, L4 = 500, L5 = 1000
// L6+ = previous_threshold * 1.5 (floored)
// ---------------------------------------------------------------------------

const BASE_THRESHOLDS: readonly number[] = [0, 100, 250, 500, 1000];

export function getLevelThreshold(level: number): number {
  if (level <= 1) return 0;
  const idx = level - 1; // index 0 = level 1 threshold
  if (idx < BASE_THRESHOLDS.length) {
    return BASE_THRESHOLDS[idx];
  }
  // Levels beyond L5: compound 1.5× from L5 threshold (1000)
  const stepsAboveL5 = idx - (BASE_THRESHOLDS.length - 1);
  let threshold = BASE_THRESHOLDS[BASE_THRESHOLDS.length - 1]; // 1000
  for (let i = 0; i < stepsAboveL5; i++) {
    threshold = Math.floor(threshold * 1.5);
  }
  return threshold;
}

export function computeLevelFromXP(xp: number): number {
  let level = 1;
  // Safety cap: no infinite loop
  while (level < 200) {
    const nextThreshold = getLevelThreshold(level + 1);
    if (xp >= nextThreshold) {
      level++;
    } else {
      break;
    }
  }
  return level;
}

// ---------------------------------------------------------------------------
// Pause mastery score
// Scores 0–100 based on how closely pause frequency + duration match the
// target speaker's preferred pause style.
// ---------------------------------------------------------------------------

interface PauseTarget {
  freqMin: number;  // pauses per minute
  freqMax: number;
  durMin: number;   // ms
  durMax: number;
}

const PAUSE_TARGETS: Record<"low" | "medium" | "high", PauseTarget> = {
  high:   { freqMin: 3,   freqMax: 6,   durMin: 500, durMax: 1200 },
  medium: { freqMin: 1.5, freqMax: 3.5, durMin: 300, durMax: 700  },
  low:    { freqMin: 0.5, freqMax: 2,   durMin: 200, durMax: 500  },
};

/**
 * Returns a 0–100 score where 100 = perfect match to the target speaker's
 * pause style and 0 = maximally far from it.
 */
export function computePauseMasteryScore(
  pauseFrequency: "low" | "medium" | "high",
  pauseCount: number,
  durationSeconds: number,
  avgPauseDurationMs: number,
): number {
  if (durationSeconds <= 0) return 0;

  const target = PAUSE_TARGETS[pauseFrequency];
  const durationMinutes = durationSeconds / 60;
  const pausesPerMinute = pauseCount / durationMinutes;

  // Frequency sub-score (0–1):
  // Full score if in range; degrades as ± distance from midpoint grows.
  const freqMid = (target.freqMin + target.freqMax) / 2;
  const freqTolerance = (target.freqMax - target.freqMin) * 1.5;
  const freqScore = pausesPerMinute >= target.freqMin && pausesPerMinute <= target.freqMax
    ? 1.0
    : Math.max(0, 1 - Math.abs(pausesPerMinute - freqMid) / freqTolerance);

  // Duration sub-score (0–1):
  let durScore = 0;
  if (pauseCount > 0) {
    const durMid = (target.durMin + target.durMax) / 2;
    const durTolerance = (target.durMax - target.durMin) * 1.5;
    durScore = avgPauseDurationMs >= target.durMin && avgPauseDurationMs <= target.durMax
      ? 1.0
      : Math.max(0, 1 - Math.abs(avgPauseDurationMs - durMid) / durTolerance);
  }

  // Equal weight between frequency match and duration match
  return Math.round((freqScore * 0.5 + durScore * 0.5) * 100);
}

// ---------------------------------------------------------------------------
// Vocabulary depth score
// unique_words / total_words, scaled to 0–100.
// A ratio of 0.65+ maps to 100; typical spoken word sits around 0.4–0.55.
// ---------------------------------------------------------------------------

export interface VocabResult {
  score: number;
  uniqueWordRatio: number;
  uniqueWords: number;
  totalWords: number;
}

export function computeVocabDepthScore(transcript: string): VocabResult {
  const words = transcript.toLowerCase().match(/\b[a-z']+\b/g) ?? [];
  const totalWords = words.length;

  if (totalWords === 0) {
    return { score: 0, uniqueWordRatio: 0, uniqueWords: 0, totalWords: 0 };
  }

  const uniqueWords = new Set(words).size;
  const ratio = uniqueWords / totalWords;

  // Ceiling ratio for full score: 0.65
  const score = Math.min(100, Math.round((ratio / 0.65) * 100));

  return { score, uniqueWordRatio: ratio, uniqueWords, totalWords };
}

// ---------------------------------------------------------------------------
// Deterministic hard score (0-100)
//
// Zamiast pozwalac modelowi wystawiac wynik "z brzucha", liczymy twardy score
// z wazonej sumy 6 wymiarow. Mentor moze potem skorygowac go o +/-10 pkt.
// Wagi (sumuja sie do 100):
//   Plynnosc 25 · Struktura 20 · Slownictwo 15 · Pauzy 15 · Prozodia 15 · Match 10
// ---------------------------------------------------------------------------

export interface HardScoreInput {
  wpm: number;
  wpmMin: number;
  wpmMax: number;
  fillerCount: number;
  durationSeconds: number;
  transcript: string;
  pauseMasteryScore: number;      // 0-100
  vocabDepthScore: number;         // 0-100
  prosodyRadar?: Record<string, number> | null; // wartosci 0-100
  styleMatchScore?: number | null; // 0-100
}

export interface HardScoreBreakdown {
  fluency: number;       // 0-100
  structure: number;     // 0-100
  vocabulary: number;    // 0-100
  pauses: number;        // 0-100
  prosody: number;       // 0-100
  mentor_match: number;  // 0-100
  weighted: number;      // 0-100, wazona suma powyzej
}

/** Klamruje score do 0-100. */
function clamp100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Plynnosc: kara za fillery + odchylenie WPM od okna mentora. */
function computeFluencyScore(input: HardScoreInput): number {
  const minutes = Math.max(input.durationSeconds / 60, 0.1);
  const fillerRate = input.fillerCount / minutes; // fillery/min

  // 0 fillerow/min -> 100, 12+/min -> 0
  const fillerScore = clamp100(100 - (fillerRate / 12) * 100);

  // WPM w oknie mentora -> 100, poza oknem linearnie w dol
  const mid = (input.wpmMin + input.wpmMax) / 2;
  const tolerance = Math.max((input.wpmMax - input.wpmMin) * 1.5, 30);
  const wpmScore =
    input.wpm >= input.wpmMin && input.wpm <= input.wpmMax
      ? 100
      : clamp100(100 - (Math.abs(input.wpm - mid) / tolerance) * 100);

  return clamp100(fillerScore * 0.6 + wpmScore * 0.4);
}

/** Struktura: dlugosc/wariancja zdan + sygnaly dyskursu. */
function computeStructureScore(transcript: string): number {
  const sentences = transcript.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  if (sentences.length < 2) return 30;

  const lengths = sentences.map((s) => s.split(/\s+/).length);
  const avgLen = lengths.reduce((a, b) => a + b, 0) / lengths.length;

  // Idealna srednia dlugosc 8-16 slow
  const lenScore =
    avgLen >= 8 && avgLen <= 16
      ? 100
      : clamp100(100 - Math.abs(avgLen - 12) * 5);

  const variance =
    lengths.reduce((s, l) => s + Math.pow(l - avgLen, 2), 0) / lengths.length;
  // Sensowna wariancja 4-40; za monotonne = kara
  const varScore = clamp100(Math.min(variance, 40) / 40 * 100);

  const discourseMarkers = [
    "bo", "poniewaz", "dlatego", "wiec", "jednak", "ale", "natomiast",
    "po pierwsze", "po drugie", "po trzecie", "wreszcie", "podsumowujac",
    "dodatkowo", "co wiecej", "z drugiej strony",
  ];
  const lower = transcript.toLowerCase();
  const markerHits = discourseMarkers.filter((m) => lower.includes(m)).length;
  const markerScore = clamp100((markerHits / 5) * 100);

  return clamp100(lenScore * 0.4 + varScore * 0.3 + markerScore * 0.3);
}

/** Slownictwo: unique ratio + srednia dlugosc slowa + kara za puste frazy. */
function computeVocabScore(transcript: string, vocabDepthScore: number): number {
  const emptyPhrases = [
    "generalnie", "w sumie", "tak jakby", "no wiesz", "typu", "cos takiego",
    "wlasnie", "po prostu", "moze byc", "nie wiem", "chyba", "raczej",
  ];
  const lower = transcript.toLowerCase();
  const emptyHits = emptyPhrases.reduce(
    (n, p) => n + (lower.match(new RegExp(`\\b${p}\\b`, "g"))?.length ?? 0),
    0,
  );
  const words = transcript.split(/\s+/).filter(Boolean);
  const emptyPenalty = words.length > 0 ? (emptyHits / words.length) * 200 : 0;

  const avgLen = words.length > 0
    ? words.reduce((s, w) => s + w.length, 0) / words.length
    : 0;
  // Sensowna srednia 4.5-6 znakow (polski)
  const lenScore =
    avgLen >= 4.5 && avgLen <= 6.5
      ? 100
      : clamp100(100 - Math.abs(avgLen - 5.5) * 25);

  return clamp100(vocabDepthScore * 0.6 + lenScore * 0.4 - emptyPenalty);
}

/** Prozodia: srednia z wartosci Hume radar (kazda 0-100). */
function computeProsodyScore(radar?: Record<string, number> | null): number {
  if (!radar) return 60; // neutralny default gdy Hume nie zwrocil danych
  const values = Object.values(radar).filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v),
  );
  if (values.length === 0) return 60;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return clamp100(avg);
}

export function computeHardScore(input: HardScoreInput): HardScoreBreakdown {
  const fluency = computeFluencyScore(input);
  const structure = computeStructureScore(input.transcript);
  const vocabulary = computeVocabScore(input.transcript, input.vocabDepthScore);
  const pauses = clamp100(input.pauseMasteryScore);
  const prosody = computeProsodyScore(input.prosodyRadar);
  const mentor_match = clamp100(input.styleMatchScore ?? 65);

  const weighted = clamp100(
    fluency * 0.25 +
      structure * 0.20 +
      vocabulary * 0.15 +
      pauses * 0.15 +
      prosody * 0.15 +
      mentor_match * 0.10,
  );

  return { fluency, structure, vocabulary, pauses, prosody, mentor_match, weighted };
}

/** Laczy hard score z ocena mentora (mentor +/- 10 pkt). */
export function blendMentorScore(hardScore: number, mentorScore: number): {
  finalScore: number;
  mentorDelta: number;
} {
  const rawDelta = mentorScore - hardScore;
  const mentorDelta = Math.max(-10, Math.min(10, Math.round(rawDelta)));
  const finalScore = clamp100(hardScore + mentorDelta);
  return { finalScore, mentorDelta };
}

