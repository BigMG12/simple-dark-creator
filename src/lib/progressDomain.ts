/**
 * Pure computation layer for the Progress page.
 * Given a unified list of SessionPoint (from solo recordings + conversations),
 * it derives: streak, aggregates per range, deltas, sparklines, heatmap,
 * personal records, skill radar and goal progress.
 *
 * No React, no data-fetching — 100% testable.
 */

export type SessionSource = 'solo' | 'conversation';

export interface SessionPoint {
  id: string;
  source: SessionSource;
  created_at: string; // ISO
  duration_seconds: number;
  overall_score: number; // 0-100
  metrics: Partial<{
    wpm: number;
    clarity: number;
    energy: number;
    pause: number;
    vocab: number;
    filler: number; // lower is better
    talk_time_ratio: number;
  }>;
}

export type RangeId = '7d' | '30d' | '3m' | 'all';

const RANGE_DAYS: Record<RangeId, number | null> = {
  '7d': 7,
  '30d': 30,
  '3m': 90,
  all: null,
};

// ─── date helpers ────────────────────────────────────────────────────────────
const DAY_MS = 86_400_000;

function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function daysAgo(iso: string, today = new Date()): number {
  const a = new Date(dayKey(iso)).getTime();
  const b = new Date(dayKey(today.toISOString())).getTime();
  return Math.round((b - a) / DAY_MS);
}

export function pointsInRange(points: SessionPoint[], range: RangeId, now = new Date()): SessionPoint[] {
  const days = RANGE_DAYS[range];
  if (days == null) return points;
  const cutoff = now.getTime() - days * DAY_MS;
  return points.filter((p) => new Date(p.created_at).getTime() >= cutoff);
}

export function previousPointsInRange(points: SessionPoint[], range: RangeId, now = new Date()): SessionPoint[] {
  const days = RANGE_DAYS[range];
  if (days == null) {
    // For "all" use the first half of history.
    const sorted = [...points].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    return sorted.slice(0, Math.floor(sorted.length / 2));
  }
  const now_ms = now.getTime();
  const start = now_ms - days * 2 * DAY_MS;
  const end = now_ms - days * DAY_MS;
  return points.filter((p) => {
    const t = new Date(p.created_at).getTime();
    return t >= start && t < end;
  });
}

// ─── streak ──────────────────────────────────────────────────────────────────
export function computeStreak(points: SessionPoint[], today = new Date()): { current: number; longest: number } {
  if (points.length === 0) return { current: 0, longest: 0 };
  const days = new Set(points.map((p) => dayKey(p.created_at)));

  // longest
  const sorted = [...days].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]).getTime();
    const cur = new Date(sorted[i]).getTime();
    run = cur - prev === DAY_MS ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  // current: count back from today (or yesterday if today is empty)
  let current = 0;
  const todayKey = dayKey(today.toISOString());
  const yKey = dayKey(new Date(today.getTime() - DAY_MS).toISOString());
  let cursor: string;
  if (days.has(todayKey)) cursor = todayKey;
  else if (days.has(yKey)) cursor = yKey;
  else return { current: 0, longest };

  while (days.has(cursor)) {
    current++;
    cursor = dayKey(new Date(new Date(cursor).getTime() - DAY_MS).toISOString());
  }
  return { current, longest };
}

// ─── aggregates ──────────────────────────────────────────────────────────────
type MetricKey = 'wpm' | 'clarity' | 'energy' | 'pause' | 'vocab' | 'filler' | 'talk_time_ratio';

const METRIC_KEYS: MetricKey[] = ['wpm', 'clarity', 'energy', 'pause', 'vocab', 'filler', 'talk_time_ratio'];

export interface Aggregates {
  sessions: number;
  totalMinutes: number;
  avgScore: number;
  metrics: Partial<Record<MetricKey, number>>;
}

export function computeAggregates(points: SessionPoint[]): Aggregates {
  if (points.length === 0) {
    return { sessions: 0, totalMinutes: 0, avgScore: 0, metrics: {} };
  }
  const totalSec = points.reduce((s, p) => s + (p.duration_seconds || 0), 0);
  const avgScore = points.reduce((s, p) => s + (p.overall_score || 0), 0) / points.length;

  const metrics: Partial<Record<MetricKey, number>> = {};
  for (const key of METRIC_KEYS) {
    const vals = points.map((p) => p.metrics[key]).filter((v): v is number => typeof v === 'number' && !isNaN(v));
    if (vals.length > 0) {
      metrics[key] = vals.reduce((a, b) => a + b, 0) / vals.length;
    }
  }

  return {
    sessions: points.length,
    totalMinutes: Math.round(totalSec / 60),
    avgScore: Math.round(avgScore),
    metrics,
  };
}

// ─── deltas ──────────────────────────────────────────────────────────────────
const INVERT_KEYS = new Set<MetricKey>(['filler']);

export interface Delta {
  key: MetricKey | 'overall_score';
  current: number;
  previous: number | null;
  deltaPct: number; // signed
  isPositive: boolean; // improvement direction respecting invert
}

export function computeDeltas(current: Aggregates, previous: Aggregates | null): Delta[] {
  const out: Delta[] = [];

  const overallCur = current.avgScore;
  const overallPrev = previous?.sessions ? previous.avgScore : null;
  out.push(makeDelta('overall_score', overallCur, overallPrev, false));

  for (const key of METRIC_KEYS) {
    const cur = current.metrics[key];
    if (typeof cur !== 'number') continue;
    const prev = previous?.metrics[key] ?? null;
    out.push(makeDelta(key, cur, prev, INVERT_KEYS.has(key)));
  }
  return out;
}

function makeDelta(
  key: Delta['key'],
  current: number,
  previous: number | null,
  invert: boolean,
): Delta {
  if (previous == null || previous === 0) {
    return { key, current: round(current), previous, deltaPct: 0, isPositive: false };
  }
  const raw = ((current - previous) / Math.abs(previous)) * 100;
  const deltaPct = Math.round(raw);
  const isPositive = invert ? raw < 0 : raw > 0;
  return { key, current: round(current), previous: round(previous), deltaPct, isPositive };
}

function round(v: number): number {
  return Math.round(v * 10) / 10;
}

// ─── sparklines ──────────────────────────────────────────────────────────────
export function computeSparkline(points: SessionPoint[], key: MetricKey | 'overall_score', maxPoints = 20): number[] {
  const sorted = [...points].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
  const values = sorted
    .map((p) => (key === 'overall_score' ? p.overall_score : p.metrics[key]))
    .filter((v): v is number => typeof v === 'number' && !isNaN(v));
  if (values.length <= maxPoints) return values;
  // downsample by bucketing
  const bucketSize = Math.ceil(values.length / maxPoints);
  const buckets: number[] = [];
  for (let i = 0; i < values.length; i += bucketSize) {
    const chunk = values.slice(i, i + bucketSize);
    buckets.push(chunk.reduce((a, b) => a + b, 0) / chunk.length);
  }
  return buckets;
}

// ─── heatmap ─────────────────────────────────────────────────────────────────
export interface HeatmapCell {
  date: string; // YYYY-MM-DD
  sessions: number;
  avgScore?: number;
}

export function computeHeatmap(points: SessionPoint[], days = 90, today = new Date()): HeatmapCell[] {
  const byDay = new Map<string, SessionPoint[]>();
  for (const p of points) {
    const k = dayKey(p.created_at);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(p);
  }
  const out: HeatmapCell[] = [];
  const start = new Date(today.getTime() - (days - 1) * DAY_MS);
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * DAY_MS);
    const k = dayKey(d.toISOString());
    const ps = byDay.get(k) ?? [];
    out.push({
      date: k,
      sessions: ps.length,
      avgScore: ps.length ? Math.round(ps.reduce((s, p) => s + p.overall_score, 0) / ps.length) : undefined,
    });
  }
  return out;
}

// ─── personal records ────────────────────────────────────────────────────────
export interface PersonalRecord {
  id: string;
  label: string;
  value: string; // formatted for display
  numeric: number;
  achieved_at: string;
  sessionId: string | null;
  source: SessionSource | null;
}

export function computePersonalRecords(points: SessionPoint[]): PersonalRecord[] {
  if (points.length === 0) return [];

  const records: PersonalRecord[] = [];

  const best = points.reduce((b, p) => (p.overall_score > b.overall_score ? p : b));
  records.push({
    id: 'best_score',
    label: 'Najwyższy wynik',
    value: `${Math.round(best.overall_score)}`,
    numeric: best.overall_score,
    achieved_at: best.created_at,
    sessionId: best.id,
    source: best.source,
  });

  const longest = points.reduce((b, p) => (p.duration_seconds > b.duration_seconds ? p : b));
  if (longest.duration_seconds > 0) {
    records.push({
      id: 'longest_session',
      label: 'Najdłuższa sesja',
      value: `${Math.round(longest.duration_seconds / 60)} min`,
      numeric: longest.duration_seconds,
      achieved_at: longest.created_at,
      sessionId: longest.id,
      source: longest.source,
    });
  }

  // best week
  const byWeek = new Map<string, number>();
  for (const p of points) {
    const d = new Date(p.created_at);
    const year = d.getUTCFullYear();
    const week = Math.floor((+d - +new Date(Date.UTC(year, 0, 1))) / (7 * DAY_MS));
    const k = `${year}-W${week}`;
    byWeek.set(k, (byWeek.get(k) ?? 0) + 1);
  }
  const bestWeek = [...byWeek.entries()].sort((a, b) => b[1] - a[1])[0];
  if (bestWeek) {
    records.push({
      id: 'best_week',
      label: 'Najlepszy tydzień',
      value: `${bestWeek[1]} sesji`,
      numeric: bestWeek[1],
      achieved_at: new Date().toISOString(),
      sessionId: null,
      source: null,
    });
  }

  // best WPM
  const withWpm = points.filter((p) => typeof p.metrics.wpm === 'number');
  if (withWpm.length > 0) {
    const bestWpm = withWpm.reduce((b, p) => ((p.metrics.wpm ?? 0) > (b.metrics.wpm ?? 0) ? p : b));
    records.push({
      id: 'best_wpm',
      label: 'Najlepsze WPM',
      value: `${Math.round(bestWpm.metrics.wpm ?? 0)}`,
      numeric: bestWpm.metrics.wpm ?? 0,
      achieved_at: bestWpm.created_at,
      sessionId: bestWpm.id,
      source: bestWpm.source,
    });
  }

  return records;
}

// ─── skill radar ─────────────────────────────────────────────────────────────
export interface RadarMetrics {
  wpm: number;
  clarity: number;
  energy: number;
  pause: number;
  vocab: number;
  filler: number;
}

function metricToRadarValue(key: keyof RadarMetrics, raw: number | undefined): number {
  if (raw == null || isNaN(raw)) return 0;
  if (key === 'wpm') {
    // 130–160 wpm optimal → 100; drop off past 100 or above 200
    const dist = Math.abs(raw - 145);
    return clamp(100 - dist * 2, 0, 100);
  }
  if (key === 'filler') {
    // filler is 0–1 ratio or per-min count; assume <=0.02 = 100, >=0.15 = 0
    if (raw <= 0.02) return 100;
    if (raw >= 0.15) return 0;
    return clamp(100 - ((raw - 0.02) / 0.13) * 100, 0, 100);
  }
  return clamp(raw, 0, 100);
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function computeSkillRadar(agg: Aggregates): RadarMetrics {
  return {
    wpm: Math.round(metricToRadarValue('wpm', agg.metrics.wpm)),
    clarity: Math.round(metricToRadarValue('clarity', agg.metrics.clarity)),
    energy: Math.round(metricToRadarValue('energy', agg.metrics.energy)),
    pause: Math.round(metricToRadarValue('pause', agg.metrics.pause)),
    vocab: Math.round(metricToRadarValue('vocab', agg.metrics.vocab)),
    filler: Math.round(metricToRadarValue('filler', agg.metrics.filler)),
  };
}

// ─── goals ───────────────────────────────────────────────────────────────────
export interface GoalMetricSnapshot {
  currentValue: number;
  progressPercent: number;
  daysLeft: number;
  isAchieved: boolean;
}

export function computeGoalProgress(
  metricKey: string,
  targetValue: number,
  startValue: number,
  deadline: string,
  points: SessionPoint[],
  now = new Date(),
): GoalMetricSnapshot {
  const current = readMetric(metricKey, points);
  const range = targetValue - startValue;
  const achieved = current - startValue;
  const invert = metricKey === 'filler';
  const rawPct = range === 0 ? 100 : (achieved / range) * 100;
  const progressPercent = Math.max(0, Math.min(100, Math.round(invert ? -rawPct : rawPct)));
  const daysLeft = Math.max(0, Math.ceil((+new Date(deadline) - +now) / DAY_MS));
  const isAchieved = invert ? current <= targetValue : current >= targetValue;
  return { currentValue: Math.round(current * 10) / 10, progressPercent, daysLeft, isAchieved };
}

function readMetric(key: string, points: SessionPoint[]): number {
  if (points.length === 0) return 0;
  if (key === 'overall_score') {
    return points.reduce((s, p) => s + p.overall_score, 0) / points.length;
  }
  if (key === 'sessions') return points.length;
  if (key === 'total_minutes') return points.reduce((s, p) => s + p.duration_seconds, 0) / 60;
  if (key === 'streak') return computeStreak(points).current;
  const vals = points
    .map((p) => (p.metrics as any)[key])
    .filter((v): v is number => typeof v === 'number' && !isNaN(v));
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
