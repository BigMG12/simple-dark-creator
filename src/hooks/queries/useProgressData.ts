import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useSession } from './useAuth';
import {
  computeAggregates,
  computeDeltas,
  computeHeatmap,
  computePersonalRecords,
  computeSkillRadar,
  computeSparkline,
  computeStreak,
  pointsInRange,
  previousPointsInRange,
  type Aggregates,
  type Delta,
  type HeatmapCell,
  type PersonalRecord,
  type RadarMetrics,
  type RangeId,
  type SessionPoint,
} from '@/lib/progressDomain';

export interface ProgressData {
  points: SessionPoint[]; // all-time
  rangePoints: SessionPoint[]; // filtered by range
  aggregates: Aggregates;
  previousAggregates: Aggregates | null;
  deltas: Delta[];
  radar: { current: RadarMetrics; previous: RadarMetrics };
  heatmap: HeatmapCell[];
  records: PersonalRecord[];
  streak: { current: number; longest: number };
  sparklines: Record<string, number[]>;
}

/**
 * Reads real user sessions from two sources:
 *   - conversations + conversation_analyses (always present)
 *   - recordings + analyses (best-effort; empty if table missing)
 * and derives every stat rendered on the Progress page.
 */
export function useProgressData(range: RangeId) {
  const { data: session } = useSession();
  const userId = session?.user.id;

  return useQuery<ProgressData>({
    queryKey: ['progressData', userId, range],
    queryFn: async () => {
      if (!userId) throw new Error('Not authenticated');

      const [conversationPoints, recordingPoints] = await Promise.all([
        fetchConversationPoints(userId),
        fetchRecordingPoints(userId),
      ]);

      const points: SessionPoint[] = [...conversationPoints, ...recordingPoints].sort(
        (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
      );

      const rangePoints = pointsInRange(points, range);
      const prevPoints = previousPointsInRange(points, range);
      const aggregates = computeAggregates(rangePoints);
      const previousAggregates = prevPoints.length > 0 ? computeAggregates(prevPoints) : null;
      const deltas = computeDeltas(aggregates, previousAggregates);
      const radar = {
        current: computeSkillRadar(aggregates),
        previous: previousAggregates ? computeSkillRadar(previousAggregates) : {
          wpm: 0, clarity: 0, energy: 0, pause: 0, vocab: 0, filler: 0,
        },
      };
      const heatmap = computeHeatmap(points, 91);
      const records = computePersonalRecords(points);
      const streak = computeStreak(points);
      const sparklines: Record<string, number[]> = {
        overall_score: computeSparkline(rangePoints, 'overall_score'),
        wpm: computeSparkline(rangePoints, 'wpm'),
        clarity: computeSparkline(rangePoints, 'clarity'),
        energy: computeSparkline(rangePoints, 'energy'),
        pause: computeSparkline(rangePoints, 'pause'),
        vocab: computeSparkline(rangePoints, 'vocab'),
        filler: computeSparkline(rangePoints, 'filler'),
      };

      return {
        points,
        rangePoints,
        aggregates,
        previousAggregates,
        deltas,
        radar,
        heatmap,
        records,
        streak,
        sparklines,
      };
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}

// ─── fetchers ────────────────────────────────────────────────────────────────

async function fetchConversationPoints(userId: string): Promise<SessionPoint[]> {
  try {
    const { data: convs, error } = await supabase
      .from('conversations')
      .select('id, created_at, duration_seconds, status')
      .eq('user_id', userId)
      .eq('status', 'complete');
    if (error || !convs || convs.length === 0) return [];

    const ids = convs.map((c) => c.id);
    const { data: analyses } = await supabase
      .from('conversation_analyses')
      .select('conversation_id, overall_score, talk_time_ratio, type_specific_metrics, scorecard')
      .in('conversation_id', ids);

    const byId = new Map((analyses ?? []).map((a: any) => [a.conversation_id, a]));

    return convs.map((c: any): SessionPoint => {
      const a: any = byId.get(c.id) ?? {};
      const tsm = (a.type_specific_metrics ?? {}) as Record<string, any>;
      const sc = (a.scorecard ?? {}) as Record<string, any>;
      return {
        id: c.id,
        source: 'conversation',
        created_at: c.created_at,
        duration_seconds: Number(c.duration_seconds ?? 0),
        overall_score: Number(a.overall_score ?? 0),
        metrics: {
          talk_time_ratio: typeof a.talk_time_ratio === 'number' ? a.talk_time_ratio : undefined,
          wpm: pickNum(tsm.wpm, sc.wpm),
          clarity: pickNum(tsm.clarity, sc.clarity),
          energy: pickNum(tsm.energy, sc.energy),
          pause: pickNum(tsm.pause_mastery, sc.pause, tsm.pause),
          vocab: pickNum(tsm.vocabulary, sc.vocab, tsm.vocab),
          filler: pickNum(tsm.filler_ratio, tsm.filler, sc.filler),
        },
      };
    });
  } catch (err) {
    console.warn('[progress] conversation fetch failed', err);
    return [];
  }
}

async function fetchRecordingPoints(userId: string): Promise<SessionPoint[]> {
  try {
    const { data, error } = await supabase
      .from('recordings')
      .select('id, created_at, duration_seconds, analyses(overall_score, wpm, clarity_score, energy_variance_score, pause_mastery_score, vocabulary_depth_score, filler_density_per_min)')
      .eq('user_id', userId);
    if (error || !data) return [];

    return data.map((r: any): SessionPoint => {
      const a = Array.isArray(r.analyses) ? r.analyses[0] : r.analyses;
      return {
        id: r.id,
        source: 'solo',
        created_at: r.created_at,
        duration_seconds: Number(r.duration_seconds ?? 0),
        overall_score: Number(a?.overall_score ?? 0),
        metrics: {
          wpm: typeof a?.wpm === 'number' ? a.wpm : undefined,
          clarity: typeof a?.clarity_score === 'number' ? a.clarity_score : undefined,
          energy: typeof a?.energy_variance_score === 'number' ? a.energy_variance_score : undefined,
          pause: typeof a?.pause_mastery_score === 'number' ? a.pause_mastery_score : undefined,
          vocab: typeof a?.vocabulary_depth_score === 'number' ? a.vocabulary_depth_score : undefined,
          filler: typeof a?.filler_density_per_min === 'number' ? a.filler_density_per_min / 100 : undefined,
        },
      };
    });
  } catch (err) {
    // Table may not exist on this backend — silently ignore.
    return [];
  }
}

function pickNum(...vals: unknown[]): number | undefined {
  for (const v of vals) {
    if (typeof v === 'number' && !isNaN(v)) return v;
  }
  return undefined;
}
