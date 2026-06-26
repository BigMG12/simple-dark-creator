import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface TrajectoryPoint {
  recording_id: string
  created_at: string
  overall_score: number
  wpm: number | null
  filler_word_count: number | null
  pause_mastery_score: number | null
  vocabulary_depth_score: number | null
}

/**
 * Pobiera ostatnie N analiz danego usera (do Sekcji 4 — Trajectory).
 */
export function useTrajectory(userId: string | undefined, limit = 10) {
  return useQuery<TrajectoryPoint[]>({
    queryKey: ['trajectory', userId, limit],
    queryFn: async () => {
      if (!userId) return []

      // Najpierw recordings usera, potem ich analizy.
      const { data: recordings, error: recErr } = await supabase
        .from('recordings')
        .select('id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (recErr) throw recErr
      if (!recordings || recordings.length === 0) return []

      const ids = recordings.map((r) => r.id)
      const { data: analyses, error: anErr } = await supabase
        .from('analyses')
        .select(
          'recording_id, overall_score, wpm, filler_word_count, pause_mastery_score, vocabulary_depth_score'
        )
        .in('recording_id', ids)

      if (anErr) throw anErr

      const byRec = new Map((analyses ?? []).map((a) => [a.recording_id, a]))

      const points: TrajectoryPoint[] = recordings
        .map((r) => {
          const a = byRec.get(r.id)
          if (!a) return null
          return {
            recording_id: r.id,
            created_at: r.created_at,
            overall_score: a.overall_score ?? 0,
            wpm: a.wpm ?? null,
            filler_word_count: a.filler_word_count ?? null,
            pause_mastery_score: a.pause_mastery_score ?? null,
            vocabulary_depth_score: a.vocabulary_depth_score ?? null,
          }
        })
        .filter((p): p is TrajectoryPoint => p !== null)
        // chronologicznie rosnąco do wykresu
        .reverse()

      return points
    },
    enabled: !!userId,
    staleTime: 60_000,
  })
}
