import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { useSession } from './useAuth'
import type {
  AchievementTimelineEntry,
  AchievementLog,
  BadgeEarnedPayload,
  LevelUpPayload,
  StreakPayload,
  ScorePayload,
} from '@/lib/database.types'

// ---------------------------------------------------------------------------
// payload type guard helpers
// ---------------------------------------------------------------------------

function toTypedPayload(
  entry: AchievementLog,
): AchievementTimelineEntry['payload_typed'] {
  const p = entry.event_payload as Record<string, unknown>
  switch (entry.event_type) {
    case 'badge_earned':
      return p as unknown as BadgeEarnedPayload
    case 'level_up':
      return p as unknown as LevelUpPayload
    case 'streak_milestone':
      return p as unknown as StreakPayload
    case 'score_milestone':
      return p as unknown as ScorePayload
  }
}

// ---------------------------------------------------------------------------
// useAchievementsTimeline
// ---------------------------------------------------------------------------

/**
 * Returns the most recent `limit` entries from achievements_log, each with a
 * `payload_typed` field that narrows the event_payload union to the correct
 * interface based on event_type.
 *
 * Invalidation:
 *   After any new achievement is logged:
 *   `queryClient.invalidateQueries({ queryKey: qk.achievementsTimeline(userId, limit) })`
 *
 *   Or more broadly (covers all limits):
 *   `queryClient.invalidateQueries({ queryKey: ['achievementsTimeline', userId] })`
 */
export function useAchievementsTimeline(limit = 10) {
  const { data: session } = useSession()
  const userId = session?.user.id

  return useQuery<AchievementTimelineEntry[]>({
    queryKey: qk.achievementsTimeline(userId!, limit),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('achievements_log')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return (data ?? []).map((entry) => ({
        ...entry,
        payload_typed: toTypedPayload(entry),
      })) as AchievementTimelineEntry[]
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  })
}
