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
