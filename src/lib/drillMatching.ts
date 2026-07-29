import { DRILLS, type Drill, type DrillCategory } from "@/data/drills";

export type WeakMetricKey = "clarity" | "pause" | "energy" | "vocab" | "filler" | "wpm";

export interface WeakMetric {
  key: WeakMetricKey;
  label: string;
  score: number; // 0..100, higher is better (filler flipped)
  hint: string;
  category: DrillCategory;
}

const METRIC_TO_CATEGORY: Record<WeakMetricKey, DrillCategory> = {
  clarity: "Klarowność",
  pause: "Tempo",
  wpm: "Tempo",
  energy: "Energia",
  vocab: "Słownictwo",
  filler: "Słownictwo",
};

const METRIC_LABELS: Record<WeakMetricKey, string> = {
  clarity: "Wyrazistość",
  pause: "Pauzy",
  wpm: "Tempo mowy",
  energy: "Energia",
  vocab: "Słownictwo",
  filler: "Wypełniacze",
};

const METRIC_HINTS: Record<WeakMetricKey, string> = {
  clarity: "Twoje spółgłoski się zlewają — popracuj nad artykulacją.",
  pause: "Za mało oddechu między myślami. Trenuj pauzy.",
  wpm: "Tempo skacze albo jest zbyt jednostajne.",
  energy: "Głos zbyt monotonny. Rozszerz zakres dynamiczny.",
  vocab: "Powtarzasz te same słowa. Rozbuduj repertuar.",
  filler: 'Za dużo "eee", "yyy", "no". Wytnij je.',
};

/**
 * Reads a partial radar (0..100 per metric, filler as 0..100 with higher=better)
 * and returns the 2–3 weakest, each linked to a matching drill category.
 */
export function pickWeakMetrics(
  radar: Partial<Record<WeakMetricKey, number>>,
  count = 3,
): WeakMetric[] {
  const entries = (Object.keys(METRIC_LABELS) as WeakMetricKey[])
    .map((key) => {
      const raw = radar[key];
      if (typeof raw !== "number" || !isFinite(raw)) return null;
      return { key, score: Math.max(0, Math.min(100, raw)) };
    })
    .filter((v): v is { key: WeakMetricKey; score: number } => v !== null);

  if (entries.length === 0) return [];

  entries.sort((a, b) => a.score - b.score);
  return entries.slice(0, count).map(({ key, score }) => ({
    key,
    score,
    label: METRIC_LABELS[key],
    hint: METRIC_HINTS[key],
    category: METRIC_TO_CATEGORY[key],
  }));
}

/** Returns up to `n` drills matching a metric's category, easiest first. */
export function drillsForMetric(metric: WeakMetric, n = 2): Drill[] {
  return DRILLS.filter((d) => d.category === metric.category)
    .sort((a, b) => a.difficulty - b.difficulty)
    .slice(0, n);
}
